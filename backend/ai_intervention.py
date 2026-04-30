import json
from typing import Any

import httpx

from config import GROQ_API_KEY, GROQ_MODEL, GROQ_TIMEOUT_SECONDS


SYSTEM_PROMPT = """
You are the intervention analyst inside a stress monitoring app.

Your job:
- Explain the user's current stress reading in plain, everyday language.
- Focus on high and critical stress events only.
- Use the provided vitals, environment, and self-report context to explain what is most likely driving the alert.
- Be calm, supportive, and specific.

Hard rules:
- Do not diagnose medical or mental health conditions.
- Do not claim certainty when the data is limited or noisy.
- Avoid jargon. If you mention HRV or SpO2, explain it simply.
- Do not shame, exaggerate, or sound alarmist.
- Give short actions the person can do in the next 5 to 10 minutes.
- If the reading includes red flags, explain when the user should contact a clinician or emergency services.
- Speak so that a non-technical person can understand it immediately.
""".strip()


ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "summary": {"type": "string"},
        "likely_drivers": {
            "type": "array",
            "items": {"type": "string"},
        },
        "what_to_do_now": {
            "type": "array",
            "items": {"type": "string"},
        },
        "why_this_matters": {"type": "string"},
        "when_to_get_help": {"type": "string"},
        "confidence_note": {"type": "string"},
        "disclaimer": {"type": "string"},
    },
    "required": [
        "headline",
        "summary",
        "likely_drivers",
        "what_to_do_now",
        "why_this_matters",
        "when_to_get_help",
        "confidence_note",
        "disclaimer",
    ],
    "additionalProperties": False,
}


def _clean_text(value: Any, fallback: str) -> str:
    if isinstance(value, str):
        cleaned = value.strip()
        if cleaned:
            return cleaned
    return fallback


def _clean_list(values: Any, fallback: list[str]) -> list[str]:
    if isinstance(values, list):
        cleaned = [str(v).strip() for v in values if str(v).strip()]
        if cleaned:
            return cleaned[:4]
    return fallback


def _build_user_prompt(context: dict[str, Any]) -> str:
    prompt_payload = {
        "task": "Explain this stress event in plain language and suggest immediate next steps.",
        "score_guide": {
            "low": "0-34",
            "moderate": "35-59",
            "high": "60-79",
            "critical": "80-100",
        },
        "interpretation_hints": [
            "Higher BPM can reflect physical or emotional activation.",
            "Lower HRV can suggest the body is under strain or not recovering well.",
            "SpO2 readings can be noisy, so avoid overreacting to a mild dip unless combined with symptoms.",
            "Heat and poor air quality can add physical stress.",
            "Recent mood reports and listed triggers should be treated as important context.",
        ],
        "event_context": context,
    }
    return json.dumps(prompt_payload, indent=2)


def _fallback_analysis(context: dict[str, Any], reason: str) -> dict[str, Any]:
    score = float(context.get("score") or 0)
    level = context.get("level") or "high"
    dominant = context.get("dominant_factor") or "stress load"
    sensor = context.get("sensor") or {}
    env = context.get("environment") or {}
    report = context.get("self_report") or {}

    drivers: list[str] = []
    bpm = sensor.get("bpm")
    hrv = sensor.get("hrv_rmssd")
    spo2 = sensor.get("spo2")
    temp = env.get("temperature")
    aqi = env.get("aqi_us_epa")
    triggers = report.get("triggers") or []

    if isinstance(bpm, (int, float)) and bpm >= 95:
        drivers.append(f"Your heart rate is elevated at about {round(bpm)} BPM.")
    if isinstance(hrv, (int, float)) and hrv <= 25:
        drivers.append("Your heart rhythm variation is low, which can happen when your body is under strain.")
    if isinstance(temp, (int, float)) and temp >= 35:
        drivers.append(f"The temperature is warm at about {round(temp, 1)}°C, which can add physical stress.")
    if isinstance(aqi, (int, float)) and aqi >= 3:
        drivers.append("Air quality may be adding extra strain.")
    if isinstance(spo2, (int, float)) and spo2 < 95:
        drivers.append("Your oxygen reading looks a little low, although fingertip readings can sometimes be inaccurate.")
    if triggers:
        drivers.append(f"You recently reported stressors around {', '.join(triggers[:3])}.")
    if not drivers:
        drivers.append(f"The strongest signal right now appears to be {dominant.lower()}.")

    actions = [
        "Pause for a minute and slow your breathing with four seconds in, four hold, four out, four hold.",
        "Sit down, loosen your shoulders and jaw, and drink some water if you can.",
        "Step away from the current stressor for 5 to 10 minutes if it is safe to do so.",
    ]
    if level == "critical":
        actions[2] = "Reduce stimulation right away and ask someone nearby for support if you feel overwhelmed."

    return {
        "headline": "Immediate stress intervention recommended",
        "summary": (
            f"Your stress score is {score:.1f}, which falls in the {level} range. "
            "This suggests your body may be under notable strain right now."
        ),
        "likely_drivers": drivers[:4],
        "what_to_do_now": actions,
        "why_this_matters": (
            "Short bursts of stress happen to everyone, but staying in a high-stress state can make it harder to think clearly, "
            "recover, and feel physically steady."
        ),
        "when_to_get_help": (
            "If this feeling is getting worse, does not settle after a short break, or you also have chest pain, severe shortness of breath, "
            "fainting, or a medical concern, contact a clinician or emergency services right away."
        ),
        "confidence_note": (
            f"This explanation uses the current score, sensor signals, and any recent self-report context. "
            f"It is a fallback summary because the live Groq analysis was unavailable: {reason}."
        ),
        "disclaimer": "This is supportive wellness guidance, not a medical diagnosis.",
    }


def _normalize_analysis(data: dict[str, Any], fallback_reason: str | None = None) -> dict[str, Any]:
    fallback = _fallback_analysis({}, fallback_reason or "missing fields")
    return {
        "headline": _clean_text(data.get("headline"), fallback["headline"]),
        "summary": _clean_text(data.get("summary"), fallback["summary"]),
        "likely_drivers": _clean_list(data.get("likely_drivers"), fallback["likely_drivers"]),
        "what_to_do_now": _clean_list(data.get("what_to_do_now"), fallback["what_to_do_now"]),
        "why_this_matters": _clean_text(data.get("why_this_matters"), fallback["why_this_matters"]),
        "when_to_get_help": _clean_text(data.get("when_to_get_help"), fallback["when_to_get_help"]),
        "confidence_note": _clean_text(data.get("confidence_note"), fallback["confidence_note"]),
        "disclaimer": _clean_text(data.get("disclaimer"), fallback["disclaimer"]),
    }


def _extract_chat_content(payload: dict[str, Any]) -> str:
    choices = payload.get("choices") or []
    if choices:
        message = choices[0].get("message") or {}
        content = message.get("content")
        if isinstance(content, str):
            return content
    raise ValueError("Groq response did not include chat completion content")


async def _call_groq(context: dict[str, Any], use_strict_schema: bool) -> dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    response_format: dict[str, Any]
    if use_strict_schema:
        response_format = {
            "type": "json_schema",
            "json_schema": {
                "name": "stress_intervention_analysis",
                "strict": True,
                "schema": ANALYSIS_SCHEMA,
            },
        }
    else:
        response_format = {"type": "json_object"}

    payload = {
        "model": GROQ_MODEL,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_prompt(context)},
        ],
        "response_format": response_format,
    }

    async with httpx.AsyncClient(timeout=GROQ_TIMEOUT_SECONDS) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        content = _extract_chat_content(response.json())
        return _normalize_analysis(json.loads(content), "Groq returned incomplete JSON")


async def generate_intervention_analysis(context: dict[str, Any]) -> dict[str, Any]:
    if not GROQ_API_KEY:
        return {
            "source": "fallback",
            "analysis": _fallback_analysis(context, "GROQ_API_KEY is not configured"),
        }

    try:
        analysis = await _call_groq(context, use_strict_schema=True)
        return {"source": "groq", "analysis": analysis}
    except Exception as exc:
        print(f"[groq] Strict structured output failed: {exc}")

    try:
        analysis = await _call_groq(context, use_strict_schema=False)
        return {"source": "groq", "analysis": analysis}
    except Exception as exc:
        print(f"[groq] JSON object fallback failed: {exc}")
        return {
            "source": "fallback",
            "analysis": _fallback_analysis(context, str(exc)),
        }
