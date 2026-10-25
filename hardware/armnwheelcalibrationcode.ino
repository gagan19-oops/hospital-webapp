
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

