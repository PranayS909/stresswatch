# StressWatch 🧠⌚

**Real-Time Stress Monitoring System using Wearable Sensors, ML, and Cloud Infrastructure**

---

## 📌 Project Description

**StressWatch** is an end-to-end stress monitoring platform that combines **biometric sensing**, **machine learning**, and **cloud-based visualization** to provide real-time insights into a user’s stress levels.

The system collects physiological signals such as:

* Heart Rate (BPM)
* Blood Oxygen (SpO2)
* Heart Rate Variability (HRV)

These signals are streamed from an **ESP32 + MAX30102 sensor** to a backend server, where a trained ML model predicts a **stress score**. The results are stored in a cloud database and visualized through a responsive frontend dashboard.

This project is designed for:

* Personal health tracking
* Remote patient monitoring
* Research in stress analytics

---

## 🎥 Demo Video

👉 https://drive.google.com/file/d/1IC78T_gub7J6KObklYS04SQYvKmvFnyO/view?usp=sharing

```
https://your-demo-video-link.com
```

---

## 🏗️ Project Structure

```
stresswatch/
├── frontend/          # React + Vite dashboard
├── backend/           # FastAPI server + ML model
├── sensor_bridge/     # Serial bridge + ESP32 firmware
└── supabase_schema.sql
```

---

## ⚙️ Technologies Used

### 🖥️ Frontend

* React (Vite)
* Supabase JS Client
* Realtime subscriptions

### 🔧 Backend

* FastAPI (Python)
* Scikit-learn (ML model)
* Uvicorn

### 📡 Hardware

* ESP32
* MAX30102 Pulse Oximeter Sensor

### ☁️ Cloud & APIs

* Supabase (PostgreSQL + Realtime)
* WeatherAPI (AQI + environmental data)

### 🔗 Communication

* PySerial (ESP32 → Backend bridge)
* REST APIs

---

## 🚀 Setup Instructions

---

## 1️⃣ Supabase Setup

1. Create a project at: https://supabase.com
2. Open **SQL Editor → New Query**
3. Paste contents of `supabase_schema.sql`
4. Run the query

### Get API Keys:

* `SUPABASE_URL`
* `VITE_SUPABASE_ANON_KEY`
* `SUPABASE_SERVICE_KEY`

### Enable Realtime:

```sql
alter publication supabase_realtime add table public.stress_scores;
```

---

## 2️⃣ Weather API Setup

1. Sign up at: https://www.weatherapi.com
2. Copy API key
3. Add to backend `.env`:

```
WEATHER_API_KEY=your_key
WEATHER_LOCATION=Mumbai
```

---

## 3️⃣ Frontend Setup

```bash
cd stresswatch/frontend

cp .env.example .env
# Add Supabase keys

npm install
npm run dev
```

Open:

```
http://localhost:5173
```

---

## 4️⃣ Backend Setup

```bash
cd stresswatch/backend

python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Add Supabase + Weather API keys

python train_stress_model.py

uvicorn main:app --reload --port 8000
```

API Docs:

```
http://localhost:8000/docs
```

---

## 5️⃣ ESP32 + MAX30102 Setup

### 🔌 Wiring

```
MAX30102 → ESP32
VCC  → 3.3V
GND  → GND
SDA  → GPIO 21
SCL  → GPIO 22
```

⚠️ Do NOT use 5V

---

### 💾 Flash Firmware

1. Install Arduino IDE
2. Install **ESP32 Board Package**
3. Install **SparkFun MAX3010x Library**
4. Upload `esp32_max30102.ino`

### 📟 Serial Output Example

```
BPM:78.2,SPO2:98.1,HRV:34.6
```

---

## 6️⃣ Run Sensor Bridge

```bash
cd stresswatch/sensor_bridge

pip install pyserial requests

python sensor_bridge.py \
  --user-id YOUR-UUID \
  --port COM3
```

Output:

```
[bridge] Connected
[bridge] RAW: BPM:78.2,SPO2:98.1,HRV:34.6
[bridge] Sent → 200 | score: 42.3
```

---

## 7️⃣ Run Full System

### Terminal 1 — Frontend

```bash
cd frontend && npm run dev
```

### Terminal 2 — Backend

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

### Terminal 3 — Sensor Bridge

```bash
cd sensor_bridge
python sensor_bridge.py --user-id YOUR-UUID --port COM3
```

---

## ✅ Verification

* Open dashboard → create account
* Start sensor bridge
* Place finger on sensor
* Stress score updates in real-time

---

## 📊 Features

* Real-time stress prediction
* HRV-based analytics
* Cloud data storage
* Realtime dashboard updates
* Environmental data integration (AQI)
* Scalable backend architecture

---

## ⚠️ Common Issues

| Issue               | Solution                   |
| ------------------- | -------------------------- |
| No sensor data      | Check serial port & wiring |
| BPM = 0             | Adjust finger placement    |
| Supabase errors     | Verify API keys            |
| Weather API error   | Check API key              |
| No realtime updates | Enable replication         |

---

## 🔮 Future Improvements

* Mobile app integration
* Wearable form factor
* Advanced ML models (deep learning)
* Sleep & activity tracking
* Alert system for high stress

---

## 👨‍💻 Contributors

*(Add your team members here)*

---

## 📄 License

MIT License

---

## ⭐ If you like this project

Give it a star and share it 🚀
