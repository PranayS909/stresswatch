"""
sensor_bridge.py
================
Runs as a standalone process alongside the FastAPI server.
Reads BPM / SpO2 / HRV_RMSSD lines from the ESP32 over USB serial,
then POSTs each reading to the FastAPI /ingest endpoint.

Expected ESP32 serial output format (one line per reading, ~every 30s):
    BPM:82.4,SPO2:97.8,HRV:31.2

Run with:
    python sensor_bridge.py --user-id <UUID> --port /dev/ttyUSB0
"""

import argparse
import re
import time
import serial
import requests

PATTERN = re.compile(
    r"BPM:([\d.]+),SPO2:([\d.]+),HRV:([\d.]+)",
    re.IGNORECASE,
)

INGEST_URL = "http://localhost:8000/ingest"


def parse_line(line: str) -> dict | None:
    m = PATTERN.search(line.strip())
    if not m:
        return None
    return {
        "bpm":       float(m.group(1)),
        "spo2":      float(m.group(2)),
        "hrv_rmssd": float(m.group(3)),
    }


def run(user_id: str, port: str, baud: int, api_url: str):
    print(f"[bridge] Connecting to {port} @ {baud} baud …")
    while True:
        try:
            with serial.Serial(port, baud, timeout=2) as ser:
                print(f"[bridge] Connected. Listening for sensor data …")
                while True:
                    raw = ser.readline().decode("utf-8", errors="ignore")
                    if not raw.strip():
                        continue
                    print(f"[bridge] RAW: {raw.strip()}")
                    parsed = parse_line(raw)
                    if parsed:
                        payload = {"user_id": user_id, **parsed}
                        try:
                            r = requests.post(api_url, json=payload, timeout=5)
                            print(f"[bridge] Sent → {r.status_code} | score: {r.json().get('score')}")
                        except Exception as e:
                            print(f"[bridge] POST failed: {e}")
        except serial.SerialException as e:
            print(f"[bridge] Serial error: {e}. Retrying in 5s …")
            time.sleep(5)
        except KeyboardInterrupt:
            print("[bridge] Stopped.")
            break


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MAX30102 → StressWatch bridge")
    parser.add_argument("--user-id",  required=True, help="Supabase user UUID")
    parser.add_argument("--port",     default="/dev/ttyUSB0", help="Serial port")
    parser.add_argument("--baud",     type=int, default=115200, help="Baud rate")
    parser.add_argument("--api-url",  default=INGEST_URL, help="FastAPI ingest endpoint")
    args = parser.parse_args()
    run(args.user_id, args.port, args.baud, args.api_url)
