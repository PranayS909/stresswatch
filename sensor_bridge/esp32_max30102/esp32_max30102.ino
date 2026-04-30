/*
  StressWatch — ESP32 + MAX30102 firmware
  ==========================================
  Reads BPM, SpO2, and HRV (RMSSD) from the MAX30102.
  Outputs one line every ~30 seconds over Serial in the format:
      BPM:82.4,SPO2:97.8,HRV:31.2

  Libraries required (install via Arduino Library Manager):
    - SparkFun MAX3010x Sensor Library (by SparkFun)

  Wiring (MAX30102 breakout → ESP32):
    VCC → 3.3V
    GND → GND
    SDA → GPIO 21
    SCL → GPIO 22
    INT → not connected (optional)

  Upload at 115200 baud.
*/

#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"

MAX30105 particleSensor;

// ── Config ────────────────────────────────────────────────────────────────────
#define SAMPLE_WINDOW_SEC  30     // collect readings for this long, then report
#define BUFFER_SIZE        100    // SpO2 algorithm needs ~100 samples

// ── Globals ───────────────────────────────────────────────────────────────────
uint32_t irBuffer[BUFFER_SIZE];
uint32_t redBuffer[BUFFER_SIZE];

float  bpmHistory[20];
int    bpmCount = 0;
float  rmssdHistory[20];
int    rmssdCount = 0;

const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute;
int   beatAvg;

// For RMSSD
long  rrIntervals[50];
int   rrCount = 0;

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("[StressWatch] Booting...");

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("[StressWatch] MAX30102 not found. Check wiring.");
    while (1);
  }

  // Standard configuration for finger-based reading
  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x0A);   // low power for ambient test
  particleSensor.setPulseAmplitudeGreen(0);     // green off
  particleSensor.setPulseAmplitudeIR(0x1F);

  Serial.println("[StressWatch] Sensor ready. Place finger on sensor.");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

float computeRMSSD(long* rr, int n) {
  if (n < 2) return 0;
  float sumSq = 0;
  for (int i = 1; i < n; i++) {
    float diff = rr[i] - rr[i - 1];
    sumSq += diff * diff;
  }
  return sqrt(sumSq / (n - 1));
}

// ── Main loop ─────────────────────────────────────────────────────────────────
void loop() {
  // ── Collect SpO2 buffer ──────────────────────────────────────────────────
  for (int i = 0; i < BUFFER_SIZE; i++) {
    while (!particleSensor.available()) particleSensor.check();
    redBuffer[i] = particleSensor.getRed();
    irBuffer[i]  = particleSensor.getIR();
    particleSensor.nextSample();
  }

  int32_t spo2Raw;
  int8_t  spo2Valid;
  int32_t heartRate;
  int8_t  hrValid;

  maxim_heart_rate_and_oxygen_saturation(
    irBuffer, BUFFER_SIZE, redBuffer,
    &spo2Raw, &spo2Valid, &heartRate, &hrValid
  );

  float spo2 = spo2Valid ? (float)spo2Raw : 0;

  // ── Collect BPM + RR intervals (beat detection) ──────────────────────────
  rrCount = 0;
  unsigned long windowStart = millis();

  while ((millis() - windowStart) < (SAMPLE_WINDOW_SEC * 1000UL)) {
    while (!particleSensor.available()) particleSensor.check();
    long irValue = particleSensor.getIR();
    particleSensor.nextSample();

    if (checkForBeat(irValue)) {
      long now = millis();
      float delta = now - lastBeat;
      lastBeat = now;

      beatsPerMinute = 60.0f / (delta / 1000.0f);

      if (beatsPerMinute > 30 && beatsPerMinute < 200) {
        rates[rateSpot++] = (byte)beatsPerMinute;
        rateSpot %= RATE_SIZE;

        beatAvg = 0;
        for (byte x = 0; x < RATE_SIZE; x++) beatAvg += rates[x];
        beatAvg /= RATE_SIZE;

        if (rrCount < 50) {
          rrIntervals[rrCount++] = (long)delta;
        }
      }
    }
  }

  // ── Compute RMSSD ────────────────────────────────────────────────────────
  float hrv = computeRMSSD(rrIntervals, rrCount);

  // ── Sanity-check and emit ────────────────────────────────────────────────
  float finalBpm = (beatAvg > 30 && beatAvg < 200) ? beatAvg : 0;
  float finalSpo2 = (spo2 >= 80 && spo2 <= 100) ? spo2 : 0;
  float finalHrv  = (hrv >= 1 && hrv <= 200) ? hrv : 0;

  if (finalBpm > 0 && finalSpo2 > 0) {
    // This exact format is parsed by sensor_bridge.py
    Serial.print("BPM:");
    Serial.print(finalBpm, 1);
    Serial.print(",SPO2:");
    Serial.print(finalSpo2, 1);
    Serial.print(",HRV:");
    Serial.println(finalHrv, 1);
  } else {
    Serial.println("[StressWatch] No valid reading — check finger placement.");
  }
}
