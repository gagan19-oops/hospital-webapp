
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

bool gripperIsOpen = false;


// =====================================================
// 1. CONFIGURATION — CHANGE THESE VALUES
// =====================================================

const char* WIFI_SSID = "Airtel_Gagan";
const char* WIFI_PASSWORD = "Gagan#123";

const char* BASE_URL = "https://hospital.gagangowda.tech";

const char* ROBOT_KEY = "hospital-robot-2026-key";

const char* JOB_URL =
  "https://hospital.gagangowda.tech/api/robot/navigation-job";
const char* STATUS_URL =
  "https://hospital.gagangowda.tech/api/robot/status";


const char* BATTERY_URL =
  "https://hospital.gagangowda.tech/api/robot/battery";


// =====================================================
// BATTERY MONITORING
// =====================================================

const int BATTERY_ADC_PIN = 34;

// Voltage divider: 10kΩ top, 2kΩ bottom
const float DIVIDER_RATIO = 6.0;

// Adjust after comparing with a multimeter
const float BATTERY_CALIBRATION = 1.0;

const uint32_t BATTERY_CHECK_INTERVAL_MS = 5000;

float batteryVoltage = 0.0;
uint32_t lastBatteryCheck = 0;

const float BATTERY_LOW_WARNING_V = 10.5;
const float BATTERY_CRITICAL_V = 9.6;

const uint32_t BATTERY_UPLOAD_INTERVAL_MS = 15000;

uint32_t lastBatteryUpload = 0;

float latestBatteryVoltage = 0.0;
int batteryPercentage = 0;
bool batteryLow = false;







// =====================================================
// 2. MOTOR DRIVER 1 — WHEELS
// =====================================================

const int ENA = 33;
const int ENB = 32;
const int IN1 = 25;
const int IN2 = 26;
const int IN3 = 27;
const int IN4 = 14;

// =====================================================
// 3. MOTOR DRIVER 2 — ARM AND GRIPPER
// =====================================================

const int ARM_IN1 = 18;
const int ARM_IN2 = 19;
const int GRIP_IN1 = 21;
const int GRIP_IN2 = 22;

const int UPPER_LIMIT = 12;
const int LOWER_LIMIT = 5;

// =====================================================
// 4. ULTRASONIC SENSORS
// =====================================================

const int LEFT_TRIG = 4;
const int LEFT_ECHO = 13;
const int RIGHT_TRIG = 15;
const int RIGHT_ECHO = 23;

const float OBSTACLE_CM = 20.0;
const float CLEAR_CM = 25.0;

// =====================================================
// 5. CALIBRATION — YOUR CURRENT VALUES
// =====================================================

const uint32_t WAIT_AFTER_JOB_MS = 12000;
const uint32_t GRIPPER_OPEN_MS = 2000;
const uint32_t GRIPPER_CLOSE_MS = 2000;

const uint32_t FORWARD_HALF_M_MS = 1850;
const uint32_t TURN_RIGHT_90_MS = 3200;
const uint32_t TURN_LEFT_90_MS = 2600;

// Safety timeouts for arm travel.
// Adjust only after testing actual arm travel time.
const uint32_t ARM_UP_TIMEOUT_MS = 10000;
const uint32_t ARM_DOWN_TIMEOUT_MS = 10000;

const uint32_t SENSOR_INTERVAL_MS = 100;
const uint32_t CLEAR_STABLE_MS = 1000;

// =====================================================
// 6. JOB STATE
// =====================================================

bool jobRunning = false;
int currentRequestId = -1;

String currentWard = "";
String currentPatient = "";

enum Motion {
  MOTION_STOP,
  MOTION_FORWARD,
  MOTION_BACKWARD,
  MOTION_LEFT,
  MOTION_RIGHT
};

// =====================================================
// 7. WHEEL CONTROL — TESTED DIRECTION MAPPING
// =====================================================

void stopMotors() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
}

void forward() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void backward() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void turnLeft() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void turnRight() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void applyMotion(Motion m) {
  switch (m) {
    case MOTION_FORWARD:  forward(); break;
    case MOTION_BACKWARD: backward(); break;
    case MOTION_LEFT:     turnLeft(); break;
    case MOTION_RIGHT:    turnRight(); break;
    default:              stopMotors(); break;
  }
}

// =====================================================
// 8. ARM AND GRIPPER CONTROL
// =====================================================

void stopArm() {
  digitalWrite(ARM_IN1, LOW);
  digitalWrite(ARM_IN2, LOW);
}

void armUp() {
  digitalWrite(ARM_IN1, HIGH);
  digitalWrite(ARM_IN2, LOW);
}

void armDown() {
  digitalWrite(ARM_IN1, LOW);
  digitalWrite(ARM_IN2, HIGH);
}

void stopGripper() {
  digitalWrite(GRIP_IN1, LOW);
  digitalWrite(GRIP_IN2, LOW);
}

void gripperOpen() {
  if (gripperIsOpen) {
    Serial.println("Gripper already open. Skipping.");
    return;
  }

  digitalWrite(GRIP_IN1, HIGH);
  digitalWrite(GRIP_IN2, LOW);

  delay(GRIPPER_OPEN_MS);

  stopGripper();
  gripperIsOpen = true;

  Serial.println("Gripper opened.");
}




void gripperClose() {
  if (!gripperIsOpen) {
    Serial.println("Gripper already closed. Skipping.");
    return;
  }

  digitalWrite(GRIP_IN1, LOW);
  digitalWrite(GRIP_IN2, HIGH);

  delay(GRIPPER_CLOSE_MS);

  stopGripper();
  gripperIsOpen = false;

  Serial.println("Gripper closed.");
}


// Limit switches are wired to GND and use INPUT_PULLUP.
// LOW = switch pressed.

bool raiseArmToLimit() {
  Serial.println("Raising arm...");

  if (digitalRead(UPPER_LIMIT) == LOW) {
    stopArm();
    Serial.println("Upper limit already pressed.");
    return true;
  }

  uint32_t start = millis();
  armUp();

  while (digitalRead(UPPER_LIMIT) != LOW) {
    if (millis() - start >= ARM_UP_TIMEOUT_MS) {
      stopArm();
      Serial.println("ERROR: Upper limit timeout!");
      return false;
    }
    delay(5);
  }

  stopArm();
  Serial.println("Upper limit reached.");
  return true;
}

bool lowerArmToLimit() {
  Serial.println("Lowering arm...");

  if (digitalRead(LOWER_LIMIT) == LOW) {
    stopArm();
    Serial.println("Lower limit already pressed.");
    return true;
  }

  uint32_t start = millis();
  armDown();

  while (digitalRead(LOWER_LIMIT) != LOW) {
    if (millis() - start >= ARM_DOWN_TIMEOUT_MS) {
      stopArm();
      Serial.println("ERROR: Lower limit timeout!");
      return false;
    }
    delay(5);
  }

  stopArm();
  Serial.println("Lower limit reached.");
  return true;
}

// =====================================================
// 9. ULTRASONIC DISTANCE
// =====================================================

float readDistanceCm(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(3);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  unsigned long duration = pulseIn(echoPin, HIGH, 30000);

  if (duration == 0) {
    return -1; // No echo detected
  }

  return duration * 0.0343 / 2.0;
}

bool obstacleDetected() {
  float leftDistance = readDistanceCm(LEFT_TRIG, LEFT_ECHO);
  delay(5);
  float rightDistance = readDistanceCm(RIGHT_TRIG, RIGHT_ECHO);

  Serial.print("Left: ");
  Serial.print(leftDistance);
  Serial.print(" cm | Right: ");
  Serial.print(rightDistance);
  Serial.println(" cm");

  // A valid reading below the threshold means obstacle.
  bool leftBlocked =
    leftDistance > 0 && leftDistance < OBSTACLE_CM;

  bool rightBlocked =
    rightDistance > 0 && rightDistance < OBSTACLE_CM;

  return leftBlocked || rightBlocked;
}

bool pathClear() {
  float leftDistance = readDistanceCm(LEFT_TRIG, LEFT_ECHO);
  delay(5);
  float rightDistance = readDistanceCm(RIGHT_TRIG, RIGHT_ECHO);

  // Unknown readings do not establish that the path is clear.
  return leftDistance > CLEAR_CM &&
         rightDistance > CLEAR_CM;
}

// =====================================================
// 10. BACKEND STATUS UPDATE
// =====================================================

bool postStatus(const String& status) {
  if (currentRequestId < 0) {
    Serial.println("Cannot post status: no request ID.");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Prototype testing only

  HTTPClient http;
  http.setTimeout(4000);

  if (!http.begin(client, STATUS_URL)) {
    Serial.println("Could not start status HTTP request.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Robot-Key", ROBOT_KEY);

  String body = "{\"req_id\":";
  body += String(currentRequestId);
  body += ",\"status\":\"";
  body += status;
  body += "\"}";

  Serial.print("Posting status: ");
  Serial.println(body);

  int code = http.POST(body);
  String response = http.getString();

  Serial.print("Status HTTP code: ");
  Serial.println(code);
  Serial.print("Status response: ");
  Serial.println(response);

  http.end();

  return code >= 200 && code < 300;
}

// =====================================================
// 11. SIMPLE JSON FIELD EXTRACTION
// This is intended for the known, simple job response.
// =====================================================

String getJsonString(const String& json, const String& key) {
  String search = "\"" + key + "\"";
  int keyPos = json.indexOf(search);

  if (keyPos < 0) return "";

  int colon = json.indexOf(':', keyPos + search.length());
  if (colon < 0) return "";

  int firstQuote = json.indexOf('"', colon + 1);
  if (firstQuote < 0) return "";

  int secondQuote = json.indexOf('"', firstQuote + 1);
  if (secondQuote < 0) return "";

  return json.substring(firstQuote + 1, secondQuote);
}

int getJsonInt(const String& json, const String& key) {
  String search = "\"" + key + "\"";
  int keyPos = json.indexOf(search);

  if (keyPos < 0) return -1;

  int colon = json.indexOf(':', keyPos + search.length());
  if (colon < 0) return -1;

  int start = colon + 1;

  while (start < (int)json.length() &&
         (json[start] == ' ' || json[start] == '\n')) {
    start++;
  }

  if (json.substring(start, start + 4) == "null") {
    return -1;
  }

  int end = start;
  while (end < (int)json.length() &&
         isDigit(json[end])) {
    end++;
  }

  if (end == start) return -1;

  return json.substring(start, end).toInt();
}

// =====================================================
// 12. FETCH AND CLAIM A JOB
// =====================================================

bool fetchJob() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi disconnected.");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Prototype testing only

  HTTPClient http;
  http.setTimeout(5000);

  if (!http.begin(client, JOB_URL)) {
    Serial.println("Could not start job request.");
    return false;
  }

  http.addHeader("X-Robot-Key", ROBOT_KEY);

  Serial.println("Checking backend for a job...");

  int code = http.GET();
  String response = http.getString();

  Serial.print("Job HTTP code: ");
  Serial.println(code);
  Serial.print("Job response: ");
  Serial.println(response);

  http.end();

  if (code != 200) {
    Serial.println("Job request failed.");
    return false;
  }

  // Expected response:
  // {"job":{"req_id":1,"ward":"ICU","patient_id":"P0001"}}
  // Or: {"job":{}}

  if (response.indexOf("\"job\":{}") >= 0 ||
      response.indexOf("\"job\": null") >= 0 ||
      response.indexOf("\"job\":null") >= 0) {
    Serial.println("No job assigned.");
    return false;
  }

  int id = getJsonInt(response, "req_id");

  if (id < 0) {
    Serial.println("No valid request ID in response.");
    return false;
  }

  currentRequestId = id;
  currentWard = getJsonString(response, "ward");
  currentPatient = getJsonString(response, "patient_id");

  Serial.println("JOB RECEIVED");
  Serial.print("Request ID: ");
  Serial.println(currentRequestId);
  Serial.print("Ward: ");
  Serial.println(currentWard);
  Serial.print("Patient: ");
  Serial.println(currentPatient);

  return true;
}

// =====================================================
// 13. TIMED MOVEMENT WITH OBSTACLE PAUSE / RESUME
// The movement timer counts only while the robot is moving.
// =====================================================

bool moveSegment(Motion motion, uint32_t durationMs) {
  uint32_t activeTime = 0;
  uint32_t lastTick = millis();
  uint32_t lastSensorCheck = 0;
  uint32_t clearStart = 0;

  bool blocked = false;
  bool clearTimerRunning = false;

  applyMotion(motion);

  while (activeTime < durationMs) {
    uint32_t now = millis();
    uint32_t delta = now - lastTick;
    lastTick = now;

    if (now - lastSensorCheck >= SENSOR_INTERVAL_MS) {
      lastSensorCheck = now;

      if (!blocked && obstacleDetected()) {
        blocked = true;
        clearTimerRunning = false;
        stopMotors();
        postStatus("Obstacle Detected");
        Serial.println("Obstacle detected. Robot stopped.");
      } else if (blocked) {
        if (pathClear()) {
          if (!clearTimerRunning) {
            clearStart = millis();
            clearTimerRunning = true;
          }

          if (millis() - clearStart >= CLEAR_STABLE_MS) {
            blocked = false;
            clearTimerRunning = false;
            postStatus("Moving");
            applyMotion(motion);
            Serial.println("Path clear. Resuming movement.");
          }
        } else {
          clearTimerRunning = false;
        }
      }
    }

    if (!blocked) {
      activeTime += delta;
    } else {
      stopMotors();
    }

    delay(5);
  }

  stopMotors();
  return true;
}

// =====================================================
// 14. ROUTE — SAME ROUTE FOR ALL WARDS FOR NOW
// =====================================================

bool followRoute() {
  Serial.println("Starting delivery route...");

  postStatus("Moving");

  // 1. Forward 1 metre
  if (!moveSegment(MOTION_FORWARD, FORWARD_HALF_M_MS))
    return false;

  // 2. Turn right
  if (!moveSegment(MOTION_RIGHT, TURN_RIGHT_90_MS))
    return false;

  // 3. Forward 1 metre
  if (!moveSegment(MOTION_FORWARD, FORWARD_HALF_M_MS))
    return false;

  // 4. Turn left
  if (!moveSegment(MOTION_LEFT, TURN_LEFT_90_MS))
    return false;

  // 5. Forward 1 metre
  if (!moveSegment(MOTION_FORWARD, FORWARD_HALF_M_MS))
    return false;

  // 6. Turn left
  if (!moveSegment(MOTION_LEFT, TURN_LEFT_90_MS))
    return false;

  // 7. Forward 1 metre
  if (!moveSegment(MOTION_FORWARD, FORWARD_HALF_M_MS))
    return false;

  // 8. Turn right
  if (!moveSegment(MOTION_RIGHT, TURN_RIGHT_90_MS))
    return false;

  // 9. Forward 1 metre to destination
  if (!moveSegment(MOTION_FORWARD, FORWARD_HALF_M_MS))
    return false;

  stopMotors();
  Serial.println("Destination route completed.");
  return true;
}

// =====================================================
// 15. PICK UP MEDICINE
// =====================================================

bool pickupMedicine() {
  Serial.println("Waiting 12 seconds before pickup...");
  delay(WAIT_AFTER_JOB_MS);

  if (gripperIsOpen) {
    // Already open: do not open it again.
    Serial.println("Gripper already open. Skipping opening.");
  } else {
    // Closed: open before the arm reaches the bottom.
    Serial.println("Gripper is closed. Opening before descent...");
    gripperOpen();
  }

  // Lower the arm while the gripper is open.
  if (!lowerArmToLimit()) return false;

  // Close the gripper to grip the medicine.
  gripperClose();

  // Lift the medicine.
  if (!raiseArmToLimit()) return false;

  postStatus("Picked Up");
  Serial.println("Medicine picked up.");
  return true;
}

// =====================================================
// 16. RELEASE MEDICINE AT DESTINATION
// =====================================================

bool deliverMedicine() {
  stopMotors();
  postStatus("Delivering");

  // Keep gripper CLOSED during descent.
  if (!lowerArmToLimit()) return false;

  // Open only after lower limit switch is pressed.
  Serial.println("Opening gripper to release medicine...");
  gripperOpen();

  // Raise empty arm.
  if (!raiseArmToLimit()) return false;

  Serial.println("Delivery sequence completed.");
  return true;
}

// =====================================================
// 17. HANDLE FAILURE
// =====================================================

void stopEverything() {
  stopMotors();
  stopArm();
  stopGripper();
}

void failCurrentJob(const String& reason) {
  stopEverything();

  Serial.print("JOB FAILED: ");
  Serial.println(reason);

  postStatus("Failed");

  jobRunning = false;
  currentRequestId = -1;
}



// =====================================================
// BATTERY VOLTAGE READING
// =====================================================

float readBatteryVoltage() {
  uint32_t totalMilliVolts = 0;

  for (int i = 0; i < 10; i++) {
    totalMilliVolts += analogReadMilliVolts(BATTERY_ADC_PIN);
    delay(5);
  }

  float adcVoltage = (totalMilliVolts / 10.0) / 1000.0;

  return adcVoltage *
         DIVIDER_RATIO *
         BATTERY_CALIBRATION;
}

int calculateBatteryPercentage(float voltage) {
  // Rough voltage-based estimate for a 3S lithium-ion pack.
  // This is not a precise state-of-charge measurement.
  float percentage = ((voltage - 9.6) / (12.6 - 9.6)) * 100.0;

  if (percentage < 0) percentage = 0;
  if (percentage > 100) percentage = 100;

  return (int)(percentage + 0.5);
}

void updateBatteryMonitoring() {
  if (millis() - lastBatteryCheck <
      BATTERY_CHECK_INTERVAL_MS) {
    return;
  }

  lastBatteryCheck = millis();

  batteryVoltage = readBatteryVoltage();
  batteryPercentage =
      calculateBatteryPercentage(batteryVoltage);

  batteryLow = batteryVoltage <= BATTERY_LOW_WARNING_V;

  Serial.print("Battery: ");
  Serial.print(batteryVoltage, 2);
  Serial.print(" V | Estimated charge: ");
  Serial.print(batteryPercentage);
  Serial.print("% | ");

  if (batteryVoltage <= BATTERY_CRITICAL_V) {
    Serial.println("CRITICAL BATTERY WARNING");
  } else if (batteryLow) {
    Serial.println("LOW BATTERY WARNING");
  } else {
    Serial.println("Battery voltage OK");
  }
}

// =====================================================
// UPLOAD BATTERY DATA TO WEBSITE
// =====================================================

void uploadBatteryData() {
  if (millis() - lastBatteryUpload <
      BATTERY_UPLOAD_INTERVAL_MS) {
    return;
  }

  lastBatteryUpload = millis();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Battery upload skipped: WiFi disconnected");
    return;
  }

  latestBatteryVoltage = readBatteryVoltage();

  // Rough estimate only; not a safety measurement.
  int percentage = (int)(
    ((latestBatteryVoltage - 9.6) / (12.6 - 9.6)) * 100.0
  );

  percentage = constrain(percentage, 0, 100);

  WiFiClientSecure client;
  client.setInsecure(); // Testing only; use certificate validation for production

  HTTPClient http;

  if (!http.begin(client, BATTERY_URL)) {
    Serial.println("Battery API connection failed");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Robot-Key", ROBOT_KEY);

  String payload = "{\"voltage\":";
  payload += String(latestBatteryVoltage, 2);
  payload += ",\"percentage\":";
  payload += String(percentage);
  payload += "}";

  int httpCode = http.POST(payload);

  Serial.print("Battery upload HTTP code: ");
  Serial.println(httpCode);

  if (httpCode > 0) {
    Serial.println(http.getString());
  } else {
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

// =====================================================
// 18. SETUP
// =====================================================

void setup() {
  Serial.begin(115200);

  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  pinMode(ARM_IN1, OUTPUT);
  pinMode(ARM_IN2, OUTPUT);
  pinMode(GRIP_IN1, OUTPUT);
  pinMode(GRIP_IN2, OUTPUT);

  pinMode(UPPER_LIMIT, INPUT_PULLUP);
  pinMode(LOWER_LIMIT, INPUT_PULLUP);

  pinMode(LEFT_TRIG, OUTPUT);
  pinMode(LEFT_ECHO, INPUT);
  pinMode(RIGHT_TRIG, OUTPUT);
  pinMode(RIGHT_ECHO, INPUT);

  analogReadResolution(12);

  digitalWrite(LEFT_TRIG, LOW);
  digitalWrite(RIGHT_TRIG, LOW);

  digitalWrite(ENA, HIGH);
  digitalWrite(ENB, HIGH);

  stopEverything();

  Serial.println();
  Serial.println("Hospital delivery robot starting...");
  Serial.println("Connecting to Wi-Fi...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint32_t start = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Wi-Fi connected.");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi connection failed.");
  }

  Serial.println("Robot ready.");
}

// =====================================================
// 19. MAIN LOOP
// =====================================================

void loop() {

  updateBatteryMonitoring();

  uploadBatteryData();

  if (WiFi.status() != WL_CONNECTED) {
    stopEverything();
    Serial.println("Wi-Fi unavailable. Reconnecting...");
    WiFi.reconnect();
    delay(3000);
    return;
  }

  if (jobRunning) {
    delay(100);
    return;
  }

  if (!fetchJob()) {
    delay(5000);
    return;
  }

  jobRunning = true;

  // The backend has already claimed this job.
  // Run the complete pickup, route and delivery flow.

  if (!pickupMedicine()) {
    failCurrentJob("Arm limit switch timeout during pickup");
    return;
  }

  if (!followRoute()) {
    failCurrentJob("Navigation failed");
    return;
  }

  if (!deliverMedicine()) {
    failCurrentJob("Arm limit switch timeout during delivery");
    return;
  }

  stopEverything();

  // Only report Delivered after all delivery steps succeed.
  postStatus("Delivered");

  Serial.println("JOB COMPLETED SUCCESSFULLY.");

  currentRequestId = -1;
  currentWard = "";
  currentPatient = "";
  jobRunning = false;

  delay(2000);
}
