import json
import numpy as np
import joblib
from config import MODEL_PATH, FEATURE_NAMES_PATH, GLOBAL_BASELINES_PATH
from db import db

# Load model artefacts once at startup
try:
    _model = joblib.load(MODEL_PATH)
    _feature_names = joblib.load(FEATURE_NAMES_PATH)
    with open(GLOBAL_BASELINES_PATH) as f:
        _global = json.load(f)
    print(f"[scorer] Model loaded. Features: {_feature_names}")
except Exception as e:
    print(f"[scorer] WARNING: Could not load model: {e}")
    _model = None
    _feature_names = []
    _global = {"bpm_mean":75,"bpm_std":12,"hrv_mean":35,"hrv_std":15,"spo2_mean":97.5,"spo2_std":1.5}


FACTOR_LABELS = {
    "bpm_norm": "Elevated BPM", "bpm": "Elevated BPM",
    "hrv_rmssd_norm": "Low HRV", "hrv_rmssd": "Low HRV",
    "spo2_norm": "Low SpO₂",    "spo2": "Low SpO₂",
    "mood_score": "Low mood",
    "trigger_count": "Multiple stressors",
    "aqi_us_epa": "Poor air quality",
    "temperature": "Heat stress",
    "hours_since_report": "No recent check-in",
}


def _rule_based_score(row: dict) -> float:
    """Deterministic fallback scorer using published clinical thresholds."""
    s = 0.0
    hrv = row.get("hrv_rmssd", 35)
    if hrv < 20:   s += 35
    elif hrv < 30: s += 22
    elif hrv < 40: s += 12
    elif hrv < 50: s += 5

    bpm = row.get("bpm", 75)
    if bpm > 100:  s += 25
    elif bpm > 90: s += 15
    elif bpm > 80: s += 8
    elif bpm > 70: s += 3

    spo2 = row.get("spo2", 98)
    if spo2 < 94:  s += 15
    elif spo2 < 96: s += 8
    elif spo2 < 98: s += 3

    aqi = row.get("aqi_us_epa", 1)
    if aqi >= 4:   s += 12
    elif aqi >= 3: s += 6
    elif aqi >= 2: s += 2

    temp = row.get("temperature", 25)
    if temp > 38:  s += 8
    elif temp > 35: s += 5
    elif temp > 32: s += 2

    mood = row.get("mood_score", 3)
    s += (5 - mood) * 5

    triggers = row.get("trigger_count", 0)
    s += min(triggers * 3, 12)

    return min(s, 100.0)


def _get_user_baselines(user_id: str) -> dict:
    """Fetch rolling 30-day mean/std from Supabase. Falls back to global norms."""
    try:
        res = db.rpc("user_sensor_stats", {"uid": user_id}).execute()
        if res.data and res.data[0] and res.data[0].get("bpm_mean"):
            return res.data[0]
    except Exception:
        pass
    return _global


def compute_score(
    user_id: str,
    bpm: float,
    spo2: float,
    hrv_rmssd: float,
    temperature: float,
    aqi_us_epa: int,
    mood_score: float = 3.0,
    trigger_count: int = 0,
    hours_since_report: float = 99.0,
) -> dict:
    row = dict(
        bpm=bpm, spo2=spo2, hrv_rmssd=hrv_rmssd,
        temperature=temperature, aqi_us_epa=aqi_us_epa,
        mood_score=mood_score, trigger_count=trigger_count,
        hours_since_report=hours_since_report,
    )

    # Try ML model first
    if _model is not None:
        try:
            b = _get_user_baselines(user_id)
            bpm_norm  = (bpm       - b.get("bpm_mean", 75))  / (b.get("bpm_std", 12)   + 1e-6)
            hrv_norm  = (hrv_rmssd - b.get("hrv_mean", 35))  / (b.get("hrv_std", 15)   + 1e-6)
            spo2_norm = (spo2      - b.get("spo2_mean", 97.5)) / (b.get("spo2_std", 1.5) + 1e-6)

            feat_map = {
                "bpm_norm": bpm_norm, "spo2_norm": spo2_norm, "hrv_rmssd_norm": hrv_norm,
                "bpm": bpm, "spo2": spo2, "hrv_rmssd": hrv_rmssd,
                "temperature": temperature, "aqi_us_epa": float(aqi_us_epa),
                "mood_score": mood_score, "trigger_count": float(trigger_count),
                "hours_since_report": hours_since_report,
            }
            X = np.array([[feat_map.get(f, 0.0) for f in _feature_names]])
            raw = float(_model.predict(X)[0])
            score = round(float(np.clip(raw, 0, 100)), 1)

            importances = dict(zip(_feature_names, _model.feature_importances_))
            top = max(importances, key=importances.get)
            dominant = FACTOR_LABELS.get(top, top)
        except Exception as e:
            print(f"[scorer] ML inference failed, falling back: {e}")
            score = round(_rule_based_score(row), 1)
            dominant = "Rule-based"
    else:
        score = round(_rule_based_score(row), 1)
        dominant = "Rule-based (no model)"

    if score < 35:   level = "low"
    elif score < 60: level = "moderate"
    elif score < 80: level = "high"
    else:            level = "critical"

    return {"score": score, "level": level, "dominant_factor": dominant}
