"""
main.py  —  StressWatch FastAPI backend
========================================
Endpoints:
  POST /ingest       — ESP32 sensor reading → score → Supabase
  POST /rescore      — re-score after mood check-in
  GET  /env          — manual WeatherAPI refresh
  POST /validate     — user feedback on a score
  GET  /health       — uptime check
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional
import asyncio

from config import WEATHER_LOCATION
from db import db
from scorer import compute_score
from weather import fetch_env

app = FastAPI(title="StressWatch API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory env cache (refreshed hourly) ─────────────────────────────────────
_env_cache: dict = {}
_env_cache_ts: datetime = datetime.min.replace(tzinfo=timezone.utc)
ENV_TTL_SECONDS = 3600


async def get_env_cached(user_id: str) -> tuple[dict | None, str | None]:
    """Return (env_data, env_reading_id). Fetches fresh if cache stale."""
    global _env_cache, _env_cache_ts
    now = datetime.now(timezone.utc)
    if (now - _env_cache_ts).total_seconds() > ENV_TTL_SECONDS or not _env_cache:
        fresh = await fetch_env()
        if fresh:
            _env_cache = fresh
            _env_cache_ts = now
    if not _env_cache:
        return None, None

    row = {**_env_cache, "user_id": user_id}
    res = db.table("env_readings").insert(row).execute()
    env_id = res.data[0]["id"] if res.data else None
    return _env_cache, env_id


def get_recent_self_report(user_id: str) -> dict:
    """Return most recent self-report within last 30 minutes, or defaults."""
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
    res = (
        db.table("self_reports")
        .select("id, mood_score, triggers")
        .eq("user_id", user_id)
        .gte("reported_at", cutoff)
        .order("reported_at", desc=True)
        .limit(1)
        .execute()
    )
    if res.data:
        d = res.data[0]
        return {
            "report_id": d["id"],
            "mood_score": d.get("mood_score", 3),
            "trigger_count": len(d.get("triggers") or []),
        }
    return {"report_id": None, "mood_score": 3, "trigger_count": 0}


# ── Models ─────────────────────────────────────────────────────────────────────

class SensorPayload(BaseModel):
    user_id: str
    bpm: float
    spo2: float
    hrv_rmssd: float

class RescoreRequest(BaseModel):
    user_id: str

class ValidateRequest(BaseModel):
    score_id: str
    validated_score: float


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "ts": datetime.now(timezone.utc).isoformat()}


@app.post("/ingest")
async def ingest(payload: SensorPayload, bg: BackgroundTasks):
    """
    Receives a sensor reading from the ESP32 bridge.
    1. Writes sensor_readings row.
    2. Fetches/caches env reading.
    3. Fetches latest self-report.
    4. Computes stress score.
    5. Writes stress_scores row (triggers Supabase Realtime → frontend update).
    """
    uid = payload.user_id

    # 1. Persist sensor reading
    sensor_res = db.table("sensor_readings").insert({
        "user_id": uid,
        "bpm":       payload.bpm,
        "spo2":      payload.spo2,
        "hrv_rmssd": payload.hrv_rmssd,
    }).execute()
    if not sensor_res.data:
        raise HTTPException(500, "Failed to write sensor reading")
    sensor_id = sensor_res.data[0]["id"]

    # 2. Env (cached)
    env_data, env_id = await get_env_cached(uid)

    # 3. Recent self-report
    report = get_recent_self_report(uid)

    # 4. Score
    result = compute_score(
        user_id=uid,
        bpm=payload.bpm,
        spo2=payload.spo2,
        hrv_rmssd=payload.hrv_rmssd,
        temperature=env_data.get("temperature", 25) if env_data else 25,
        aqi_us_epa=env_data.get("aqi_us_epa", 1) if env_data else 1,
        mood_score=report["mood_score"],
        trigger_count=report["trigger_count"],
    )

    # 5. Write score row (Realtime subscription picks this up on the frontend)
    score_row = {
        "user_id":          uid,
        "score":            result["score"],
        "level":            result["level"],
        "dominant_factor":  result["dominant_factor"],
        "sensor_reading_id": sensor_id,
        "env_reading_id":    env_id,
        "self_report_id":    report.get("report_id"),
    }
    db.table("stress_scores").insert(score_row).execute()

    return result


@app.post("/rescore")
async def rescore(req: RescoreRequest):
    """
    Re-runs scoring using the latest sensor reading + new mood data.
    Called after a user submits a mood check-in from the frontend.
    """
    uid = req.user_id

    # Get latest sensor reading
    sensor_res = (
        db.table("sensor_readings")
        .select("*")
        .eq("user_id", uid)
        .order("recorded_at", desc=True)
        .limit(1)
        .execute()
    )
    if not sensor_res.data:
        return {"detail": "No sensor readings found — nothing to rescore"}

    sensor = sensor_res.data[0]
    env_data, env_id = await get_env_cached(uid)
    report = get_recent_self_report(uid)

    result = compute_score(
        user_id=uid,
        bpm=sensor["bpm"],
        spo2=sensor["spo2"],
        hrv_rmssd=sensor["hrv_rmssd"],
        temperature=env_data.get("temperature", 25) if env_data else 25,
        aqi_us_epa=env_data.get("aqi_us_epa", 1) if env_data else 1,
        mood_score=report["mood_score"],
        trigger_count=report["trigger_count"],
    )

    db.table("stress_scores").insert({
        "user_id":          uid,
        "score":            result["score"],
        "level":            result["level"],
        "dominant_factor":  result["dominant_factor"],
        "sensor_reading_id": sensor["id"],
        "env_reading_id":    env_id,
        "self_report_id":    report.get("report_id"),
    }).execute()

    return result


@app.get("/env")
async def env_refresh():
    """Manually trigger a WeatherAPI fetch (bypasses cache)."""
    global _env_cache, _env_cache_ts
    _env_cache_ts = datetime.min.replace(tzinfo=timezone.utc)
    data = await fetch_env()
    if not data:
        raise HTTPException(503, "WeatherAPI unavailable")
    _env_cache = data
    _env_cache_ts = datetime.now(timezone.utc)
    return data


@app.post("/validate")
async def validate(req: ValidateRequest):
    """Store user-corrected stress score for retraining."""
    if not (0 <= req.validated_score <= 100):
        raise HTTPException(400, "validated_score must be 0–100")
    db.table("stress_scores").update({
        "validated_score": req.validated_score
    }).eq("id", req.score_id).execute()
    return {"status": "saved"}
