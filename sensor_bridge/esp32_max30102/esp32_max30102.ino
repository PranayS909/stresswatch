#include <Wire.h>

#define MPU_ADDR 0x68

int16_t AccX, AccY, AccZ, Temp, GyroX, GyroY, GyroZ;

void setup() {
  Serial.begin(115200);
  Wire.begin(); // ESP32: uses SDA=21, SCL=22 by default

  // Wake up MPU6050
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // Power Management register
  Wire.write(0);    // Set to zero (wakes up the MPU6050)
  Wire.endTransmission(true);

  Serial.println("MPU6050 Initialized!");
}

void loop() {
  // Request data from MPU6050
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B); // Starting register for Accel data
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);

  // Read Accelerometer
  AccX = Wire.read() << 8 | Wire.read();
  AccY = Wire.read() << 8 | Wire.read();
  AccZ = Wire.read() << 8 | Wire.read();

  // Read Temperature
  Temp = Wire.read() << 8 | Wire.read();

  // Read Gyroscope
  GyroX = Wire.read() << 8 | Wire.read();
  GyroY = Wire.read() << 8 | Wire.read();
  GyroZ = Wire.read() << 8 | Wire.read();

  // Print values
  Serial.print("AccX: "); Serial.print(AccX);
  Serial.print(" | AccY: "); Serial.print(AccY);
  Serial.print(" | AccZ: "); Serial.print(AccZ);

  Serial.print(" || GyroX: "); Serial.print(GyroX);
  Serial.print(" | GyroY: "); Serial.print(GyroY);
  Serial.print(" | GyroZ: "); Serial.println(GyroZ);

  delay(500);
}