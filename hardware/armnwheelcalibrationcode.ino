
#define GRIPPER_IN1 21
#define GRIPPER_IN2 22

void stopGripper() {
  digitalWrite(GRIPPER_IN1, LOW);
  digitalWrite(GRIPPER_IN2, LOW);
}

void gripperOpen() {
  digitalWrite(GRIPPER_IN1, HIGH);
  digitalWrite(GRIPPER_IN2, LOW);
}

void gripperClose() {
  digitalWrite(GRIPPER_IN1, LOW);
  digitalWrite(GRIPPER_IN2, HIGH);
}

void setup() {
  Serial.begin(115200);

  pinMode(GRIPPER_IN1, OUTPUT);
  pinMode(GRIPPER_IN2, OUTPUT);

  stopGripper();

  Serial.println("Gripper timing test ready");
  Serial.println("o-500 = open for 500 ms");
  Serial.println("c-500 = close for 500 ms");
  Serial.println("s = stop");
}

void loop() {
  if (!Serial.available()) return;

  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  cmd.toLowerCase();

  if (cmd == "s") {
    stopGripper();
    Serial.println("Gripper stopped");
    return;
  }

  int dash = cmd.indexOf('-');

  if (dash != 1) {
    Serial.println("Use o-500, c-500, or s");
    return;
  }

  char action = cmd.charAt(0);
  long duration = cmd.substring(dash + 1).toInt();

  if ((action != 'o' && action != 'c') ||
      duration < 1 || duration > 3000) {
    Serial.println("Use o/c and 1-3000 ms");
    return;
  }

  if (action == 'o') gripperOpen();
  else gripperClose();

  delay(duration);
  stopGripper();

  Serial.println("Movement complete");
}









//wheels



#define ENA 33
#define ENB 32

#define IN1 25
#define IN2 26
#define IN3 27
#define IN4 14

String command = "";

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

void executeCommand(String cmd) {
  cmd.trim();
  cmd.toLowerCase();

  if (cmd == "s") {
    stopMotors();
    Serial.println("STOPPED");
    return;
  }

  int separator = cmd.indexOf('-');

  if (separator < 1) {
    Serial.println("Invalid command. Example: f-1000");
    return;
  }

  char action = cmd.charAt(0);
  long duration = cmd.substring(separator + 1).toInt();

  if (duration <= 0 || duration > 10000) {
    Serial.println("Use a duration from 1 to 10000 ms.");
    return;
  }

  switch (action) {
    case 'f': forward();   break;
    case 'b': backward();  break;
    case 'l': turnLeft();  break;
    case 'r': turnRight(); break;
    default:
      Serial.println("Use f, b, l, r, or s.");
      return;
  }

  Serial.printf("Running %c for %ld ms\n", action, duration);

  unsigned long start = millis();

  while (millis() - start < (unsigned long)duration) {
    if (Serial.available()) {
      String input = Serial.readStringUntil('\n');
      input.trim();
      input.toLowerCase();

      if (input == "s") {
        stopMotors();
        Serial.println("Emergency stop command received.");
        return;
      }
    }
    delay(1);
  }

  stopMotors();
  Serial.println("Movement complete.");
}

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(30);

  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  digitalWrite(ENA, HIGH);
  digitalWrite(ENB, HIGH);
  stopMotors();

  Serial.println("=== MOTOR CALIBRATION ===");
  Serial.println("f-1000 = forward 1 second");
  Serial.println("b-1000 = backward 1 second");
  Serial.println("r-500  = right turn 0.5 second");
  Serial.println("l-500  = left turn 0.5 second");
  Serial.println("s      = stop");
}

void loop() {
  if (Serial.available()) {
    command = Serial.readStringUntil('\n');
    executeCommand(command);
  }
}

// wheels with predefined path


#include <Arduino.h>

// Wheel motor driver pins — your existing mapping
const int ENA = 33;
const int ENB = 32;
const int IN1 = 25;
const int IN2 = 26;
const int IN3 = 27;
const int IN4 = 14;

// Timings are entered in seconds
float forwardSeconds = 1.85;
float rightSeconds = 2.90;
float leftSeconds = 2.90;

bool running = false;

// ---------------- MOTOR CONTROL ----------------

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

void turnRight() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void turnLeft() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

// ---------------- MOVEMENT ----------------

bool runMovement(void (*movement)(), float seconds) {
  movement();

  uint32_t durationMs = (uint32_t)(seconds * 1000.0f);
  uint32_t startTime = millis();

  while (millis() - startTime < durationMs) {
    if (Serial.available()) {
      String command = Serial.readStringUntil('\n');
      command.trim();
      command.toUpperCase();

      if (command == "S") {
        stopMotors();
        running = false;
        Serial.println("EMERGENCY STOP");
        return false;
      }
    }

    delay(2);
  }

  stopMotors();
  delay(400);
  return true;
}

// ---------------- YOUR PREDEFINED PATH ----------------

void testPredefinedPath() {
  if (running) return;

  running = true;

  Serial.println("\nStarting predefined path calibration...");
  Serial.printf("Forward: %.2f seconds\n", forwardSeconds);
  Serial.printf("Right: %.2f seconds\n", rightSeconds);
  Serial.printf("Left: %.2f seconds\n", leftSeconds);

  // 1. Forward 0.5 metre
  if (!runMovement(forward, forwardSeconds)) return;

  // 2. Turn right
  if (!runMovement(turnRight, rightSeconds)) return;

  // 3. Forward 0.5 metre
  if (!runMovement(forward, forwardSeconds)) return;

  // 4. Turn left
  if (!runMovement(turnLeft, leftSeconds)) return;

  // 5. Forward 0.5 metre
  if (!runMovement(forward, forwardSeconds)) return;

  // 6. Turn left
  if (!runMovement(turnLeft, leftSeconds)) return;

  // 7. Forward 0.5 metre
  if (!runMovement(forward, forwardSeconds)) return;

  // 8. Turn right
  if (!runMovement(turnRight, rightSeconds)) return;

  // 9. Forward 0.5 metre to destination
  if (!runMovement(forward, forwardSeconds)) return;

  stopMotors();
  running = false;

  Serial.println("\nPredefined path completed.");
  Serial.println("Change timings and enter T to test again.");
}

// ---------------- SERIAL INPUT ----------------

void processCommand(String command) {
  command.trim();
  command.toUpperCase();

  if (command == "S") {
    stopMotors();
    running = false;
    Serial.println("Motors stopped.");
    return;
  }

  if (command == "T") {
    testPredefinedPath();
    return;
  }

  float f, r, l;

  if (sscanf(command.c_str(), "F%f,R%f,L%f",
             &f, &r, &l) == 3) {

    if (f < 0.1f || f > 10.0f ||
        r < 0.1f || r > 10.0f ||
        l < 0.1f || l > 10.0f) {
      Serial.println("Each timing must be between 0.1 and 10 seconds.");
      return;
    }

    forwardSeconds = f;
    rightSeconds = r;
    leftSeconds = l;

    Serial.println("\nTimings updated:");
    Serial.printf("Forward = %.2f seconds\n", forwardSeconds);
    Serial.printf("Right   = %.2f seconds\n", rightSeconds);
    Serial.printf("Left    = %.2f seconds\n", leftSeconds);
    Serial.println("Enter T to run the complete predefined path.");
    return;
  }

  Serial.println("Commands:");
  Serial.println("F1.85,R2.9,L2.9  - Set timings in seconds");
  Serial.println("T                - Run complete predefined path");
  Serial.println("S                - Stop motors");
}

// ---------------- SETUP ----------------

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(100);

  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  digitalWrite(ENA, HIGH);
  digitalWrite(ENB, HIGH);

  stopMotors();

  Serial.println("\nPredefined Path Calibration");
  Serial.println("Enter F1.85,R2.9,L2.9");
  Serial.println("Then enter T to run the entire route.");
}

void loop() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    processCommand(command);
  }
}
