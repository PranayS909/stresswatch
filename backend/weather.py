import httpx
from config import WEATHER_API_KEY, WEATHER_LOCATION

BASE = "https://api.weatherapi.com/v1/current.json"

async def fetch_env(location: str = None) -> dict | None:
    """Fetch current weather + air quality from WeatherAPI."""
    loc = location or WEATHER_LOCATION
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(BASE, params={
                "key": WEATHER_API_KEY,
                "q": loc,
                "aqi": "yes",
            })
            resp.raise_for_status()
            data = resp.json()

        current = data["current"]
        aq = current.get("air_quality", {})

        return {
            "temperature":  current.get("temp_c"),
            "aqi_us_epa":   int(aq.get("us-epa-index", 1)),
            "co":           aq.get("co"),
            "no2":          aq.get("no2"),
            "o3":           aq.get("o3"),
            "so2":          aq.get("so2"),
            "pm2_5":        aq.get("pm2_5"),
            "pm10":         aq.get("pm10"),
        }
    except Exception as e:
        print(f"[weather] Fetch failed: {e}")
        return None
