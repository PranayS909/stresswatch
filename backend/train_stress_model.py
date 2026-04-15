"""
train_stress_model.py
======================
Phase 1: trains on synthetic data using clinical thresholds.
Phase 2 (later): swap fetch_synthetic_data() for fetch_real_data() below.

Run from the backend/ directory:
    python train_stress_model.py
Outputs: stress_model.pkl, feature_names.pkl, global_baselines.json
"""

import json
import numpy as np
import pandas as pd
import joblib
from xgboost import XGBRegressor
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import mean_absolute_error

RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

FEATURES = [
    "bpm_norm", "spo2_norm", "hrv_rmssd_norm",
    "bpm", "spo2", "hrv_rmssd",
    "temperature", "aqi_us_epa",
    "mood_score", "trigger_count", "hours_since_report",
]


# ── Rule-based label generator ─────────────────────────────────────────────────

def rule_based_score(row: dict) -> float:
    s = 0.0
    hrv = row.get("hrv_rmssd", 35)
    if hrv < 20:    s += 35
    elif hrv < 30:  s += 22
    elif hrv < 40:  s += 12
    elif hrv < 50:  s += 5

    bpm = row.get("bpm", 75)
    if bpm > 100:   s += 25
    elif bpm > 90:  s += 15
    elif bpm > 80:  s += 8
    elif bpm > 70:  s += 3

    spo2 = row.get("spo2", 98)
    if spo2 < 94:   s += 15
    elif spo2 < 96: s += 8
    elif spo2 < 98: s += 3

    aqi = row.get("aqi_us_epa", 1)
    if aqi >= 4:    s += 12
    elif aqi >= 3:  s += 6
    elif aqi >= 2:  s += 2

    temp = row.get("temperature", 25)
    if temp > 38:   s += 8
    elif temp > 35: s += 5
    elif temp > 32: s += 2

    mood = row.get("mood_score", 3)
    s += (5 - mood) * 5

    s += min(row.get("trigger_count", 0) * 3, 12)
    return min(s, 100.0)


# ── Synthetic dataset ──────────────────────────────────────────────────────────

def fetch_synthetic_data(n_users=40, readings_per_user=120) -> pd.DataFrame:
    """
    Generates realistic sensor + context readings per synthetic user.
    Each user has their own physiological baseline to simulate real variance.
    """
    rows = []
    for u in range(n_users):
        # Per-user baselines drawn from population distributions
        base_bpm  = np.random.normal(72, 8)
        base_hrv  = np.random.normal(38, 12)
        base_spo2 = np.random.normal(97.8, 0.8)

        for _ in range(readings_per_user):
            # Stress state coin-flip: low(50%), moderate(30%), high(15%), critical(5%)
            state = np.random.choice(["low","moderate","high","critical"],
                                     p=[0.50, 0.30, 0.15, 0.05])

            stress_mult = {"low": 0, "moderate": 0.5, "high": 1.0, "critical": 1.6}[state]

            bpm  = base_bpm  + stress_mult * np.random.normal(12, 4)
            hrv  = base_hrv  - stress_mult * np.random.normal(10, 4)
            spo2 = base_spo2 - stress_mult * np.random.normal(0.6, 0.3)

            bpm  = float(np.clip(bpm,  45, 140))
            hrv  = float(np.clip(hrv,   5,  90))
            spo2 = float(np.clip(spo2, 88, 100))

            mood        = max(1, min(5, 3 - stress_mult * np.random.uniform(0, 2)))
            triggers    = np.random.poisson(stress_mult * 2)
            aqi         = np.random.choice([1,2,3,4,5,6], p=[0.4,0.3,0.15,0.08,0.05,0.02])
            temperature = np.random.normal(30, 5)
            hrs_since   = np.random.exponential(4)

            # Per-user z-score normalisation
            bpm_norm  = (bpm  - base_bpm)  / 8
            hrv_norm  = (hrv  - base_hrv)  / 12
            spo2_norm = (spo2 - base_spo2) / 0.8

            row = {
                "user_id":            u,
                "bpm":                round(bpm, 1),
                "spo2":               round(spo2, 1),
                "hrv_rmssd":          round(hrv, 1),
                "temperature":        round(float(np.clip(temperature, 15, 48)), 1),
                "aqi_us_epa":         int(aqi),
                "mood_score":         round(float(mood), 1),
                "trigger_count":      int(triggers),
                "hours_since_report": round(float(hrs_since), 1),
                "bpm_norm":           round(bpm_norm, 3),
                "spo2_norm":          round(spo2_norm, 3),
                "hrv_rmssd_norm":     round(hrv_norm, 3),
            }
            row["label"] = rule_based_score(row) + np.random.normal(0, 2)
            row["label"] = float(np.clip(row["label"], 0, 100))
            rows.append(row)

    return pd.DataFrame(rows)


# ── Real data (Phase 2 — uncomment when you have Supabase data) ───────────────

# def fetch_real_data() -> pd.DataFrame:
#     from db import db
#     import pandas as pd
#     scores = pd.DataFrame(db.table("stress_scores").select("*").execute().data)
#     sensors = pd.DataFrame(db.table("sensor_readings").select("*").execute().data)
#     envs = pd.DataFrame(db.table("env_readings").select("*").execute().data)
#     reports = pd.DataFrame(db.table("self_reports").select("*").execute().data)
#     # ... join on IDs and engineer features as in the synthetic path
#     pass


# ── Training ───────────────────────────────────────────────────────────────────

def train(df: pd.DataFrame):
    X = df[FEATURES].fillna(0)
    y = df["label"]
    groups = df["user_id"]

    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=RANDOM_STATE)
    train_idx, test_idx = next(gss.split(X, y, groups=groups))
    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

    model = XGBRegressor(
        n_estimators=350,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        random_state=RANDOM_STATE,
        eval_metric="mae",
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=50,
    )

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    print(f"\n✓ MAE on held-out users: {mae:.2f} points")

    importances = dict(zip(FEATURES, model.feature_importances_))
    print("\nFeature importances:")
    for feat, imp in sorted(importances.items(), key=lambda x: -x[1]):
        bar = "█" * int(imp * 40)
        print(f"  {feat:<22} {bar} {imp:.3f}")

    return model, mae


def save_global_baselines(df: pd.DataFrame):
    baselines = {
        "bpm_mean":  float(df["bpm"].mean()),
        "bpm_std":   float(df["bpm"].std()),
        "hrv_mean":  float(df["hrv_rmssd"].mean()),
        "hrv_std":   float(df["hrv_rmssd"].std()),
        "spo2_mean": float(df["spo2"].mean()),
        "spo2_std":  float(df["spo2"].std()),
    }
    with open("global_baselines.json", "w") as f:
        json.dump(baselines, f, indent=2)
    print(f"\n✓ global_baselines.json saved: {baselines}")
    return baselines


if __name__ == "__main__":
    print("Generating synthetic training data …")
    df = fetch_synthetic_data(n_users=40, readings_per_user=120)
    print(f"Dataset: {len(df)} rows, {df['user_id'].nunique()} users\n")

    model, mae = train(df)

    print("\nSaving artefacts …")
    joblib.dump(model, "stress_model.pkl")
    joblib.dump(FEATURES, "feature_names.pkl")
    save_global_baselines(df)

    print("\n✓ Done. Artefacts: stress_model.pkl, feature_names.pkl, global_baselines.json")

    # Sanity check
    print("\nSanity checks:")
    test_cases = [
        {"label":"Relaxed",  "bpm":62, "hrv_rmssd":55, "spo2":99, "aqi_us_epa":1, "temperature":24, "mood_score":5, "trigger_count":0},
        {"label":"Moderate", "bpm":85, "hrv_rmssd":28, "spo2":97, "aqi_us_epa":2, "temperature":30, "mood_score":3, "trigger_count":1},
        {"label":"High",     "bpm":95, "hrv_rmssd":18, "spo2":96, "aqi_us_epa":3, "temperature":35, "mood_score":2, "trigger_count":3},
        {"label":"Critical", "bpm":112,"hrv_rmssd":12, "spo2":94, "aqi_us_epa":4, "temperature":40, "mood_score":1, "trigger_count":4},
    ]
    import numpy as np
    for tc in test_cases:
        row = {k: tc.get(k, 0) for k in FEATURES}
        row.update({"bpm_norm":0, "spo2_norm":0, "hrv_rmssd_norm":0, "hours_since_report":2})
        X = np.array([[row[f] for f in FEATURES]])
        pred = float(np.clip(model.predict(X)[0], 0, 100))
        print(f"  {tc['label']:<12} → {pred:.1f}")
