# StressWatch — Complete Setup & Connection Guide

## Project structure
```
stresswatch/
├── frontend/          ← React + Vite app
├── backend/           ← FastAPI server + ML model
├── sensor_bridge/     ← PySerial bridge + ESP32 sketch
└── supabase_schema.sql
```

---

## Step 1 — Supabase setup

### 1.1 Create a project
1. Go to https://supabase.com → New project
2. Choose a region close to you, set a strong DB password
3. Wait ~2 minutes for provisioning

### 1.2 Run the schema
1. Open your project → **SQL Editor** → New query
2. Paste the entire contents of `supabase_schema.sql`
3. Click **Run** — you should see "Success. No rows returned"
4. Verify: go to **Table Editor** and confirm these tables exist:
   - users, sensor_readings, env_readings, self_reports,
     journal_entries, stress_scores, interventions

### 1.3 Get your API keys
Go to **Project Settings → API**:
- **Project URL** → copy as `SUPABASE_URL` (both frontend and backend)
- **anon / public key** → copy as `VITE_SUPABASE_ANON_KEY` (frontend only)
- **service_role key** → copy as `SUPABASE_SERVICE_KEY` (backend only — keep secret)

### 1.4 Enable Realtime
Go to **Database → Replication** and confirm `stress_scores` is listed.
If not, run in SQL Editor:
```sql
alter publication supabase_realtime add table public.stress_scores;
```

---

## Step 2 — WeatherAPI key

1. Sign up free at https://www.weatherapi.com
2. Go to **My Account → API Keys** → copy your key
3. Free tier includes AQI data — no upgrade needed
4. Set `WEATHER_API_KEY` in `backend/.env`
5. Set `WEATHER_LOCATION` to your city (e.g. `Mumbai` or `19.0760,72.8777`)

---

## Step 3 — Frontend setup

```bash
cd stresswatch/frontend

# 1. Copy and fill in your keys
cp .env.example .env
# Edit .env:
#   VITE_SUPABASE_URL=https://xxxx.supabase.co
#   VITE_SUPABASE_ANON_KEY=eyJ...

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
# → opens at http://localhost:5173
```

---

## Step 4 — Backend setup

```bash
cd stresswatch/backend

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy and fill in your keys
cp .env.example .env
# Edit .env with your Supabase service key, WeatherAPI key, serial port

# 4. Train the ML model (generates stress_model.pkl etc.)
python train_stress_model.py
# Expected output:
#   ✓ MAE on held-out users: ~5 points
#   Sanity checks:
#     Relaxed      →  8–18
#     Moderate     → 38–52
#     High         → 60–75
#     Critical     → 78–95

# 5. Start the API server
uvicorn main:app --reload --port 8000
# → API docs at http://localhost:8000/docs
```

---

## Step 5 — ESP32 + MAX30102 sensor

### 5.1 Wiring
```
MAX30102 breakout → ESP32 DevKit
VCC  → 3.3V  (NOT 5V — will damage sensor)
GND  → GND
SDA  → GPIO 21
SCL  → GPIO 22
INT  → not connected
```

### 5.2 Flash the firmware
1. Install Arduino IDE 2.x
2. Add ESP32 board: **File → Preferences → Additional boards URL**
   → paste: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. **Tools → Board → ESP32 Arduino → ESP32 Dev Module**
4. Install library: **Sketch → Include Library → Manage Libraries**
   → search **"SparkFun MAX3010x"** → Install
5. Open `sensor_bridge/esp32_max30102.ino`
6. Select your COM port → **Upload**
7. Open Serial Monitor at **115200 baud** — after 30 s with finger on sensor you should see:
   ```
   BPM:78.2,SPO2:98.1,HRV:34.6
   ```

### 5.3 Find your serial port
- **Linux/macOS**: `ls /dev/tty*` (look for `/dev/ttyUSB0` or `/dev/cu.usbserial-*`)
- **Windows**: Device Manager → Ports → look for COM3 or similar

---

## Step 6 — Run the sensor bridge

```bash
cd stresswatch/sensor_bridge

# Install bridge dependencies (if running separately from backend)
pip install pyserial requests

# Get your user UUID from Supabase:
#   Authentication → Users → click your user → copy UUID

python sensor_bridge.py \
  --user-id YOUR-USER-UUID-HERE \
  --port /dev/ttyUSB0 \
  --baud 115200

# Windows example:
# python sensor_bridge.py --user-id abc123... --port COM3
```

When running, you'll see:
```
[bridge] Connected. Listening for sensor data …
[bridge] RAW: BPM:78.2,SPO2:98.1,HRV:34.6
[bridge] Sent → 200 | score: 42.3
```

---

## Step 7 — Verify end-to-end

1. Open http://localhost:5173 → create an account
2. Start the sensor bridge with your user UUID
3. Within 30 seconds the Monitor page gauge should update live
4. The green dot in the top-right of Monitor = Realtime connected

---

## Running all services together

Open 3 terminal tabs:

**Tab 1 — Frontend**
```bash
cd stresswatch/frontend && npm run dev
```

**Tab 2 — Backend**
```bash
cd stresswatch/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Tab 3 — Sensor bridge**
```bash
cd stresswatch/sensor_bridge
python sensor_bridge.py --user-id YOUR-UUID --port /dev/ttyUSB0
```

---

## Assigning a patient to a professional

In Supabase SQL Editor:
```sql
update public.users
set assigned_professional_id = 'PROFESSIONAL-USER-UUID'
where id = 'PATIENT-USER-UUID';
```

The professional can then see the patient's History and Insights pages.

---

## Retraining the model on real data

After ~2 weeks of real usage:
1. Open `backend/train_stress_model.py`
2. Uncomment the `fetch_real_data()` function and fill in the joins
3. Run `python train_stress_model.py` — the pkl files are overwritten
4. Restart the FastAPI server — it loads the new model on startup

---

## Common issues

| Symptom | Fix |
|---|---|
| Gauge shows 0 / no data | Check sensor bridge is running and UUID is correct |
| "Serial port not found" | Check port name with `ls /dev/tty*`; try unplugging/replugging USB |
| WeatherAPI 401 error | Check `WEATHER_API_KEY` in backend `.env` |
| Supabase 403 on frontend | Check `VITE_SUPABASE_ANON_KEY` matches your project |
| Model file not found | Run `python train_stress_model.py` from the `backend/` directory |
| Realtime not updating | Check Supabase → Database → Replication → stress_scores is listed |
| BPM:0 from sensor | Finger placement: press firmly, cover the sensor completely |
