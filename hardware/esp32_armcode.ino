// ===============================
// ESP32 ROBOTIC ARM AUTO TEST
// ===============================

// Motor Driver 2
// OUT1/OUT2 = ARM LIFT
// OUT3/OUT4 = GRIPPER

#define ARM_UP_IN1     18
#define ARM_UP_IN2     19

#define GRIPPER_IN1    21
#define GRIPPER_IN2    22

// Limit switches
#define UPPER_LIMIT    12
#define LOWER_LIMIT    5

void setup() {

  Serial.begin(115200);

  pinMode(ARM_UP_IN1, OUTPUT);
  pinMode(ARM_UP_IN2, OUTPUT);

  pinMode(GRIPPER_IN1, OUTPUT);
  pinMode(GRIPPER_IN2, OUTPUT);

  pinMode(UPPER_LIMIT, INPUT_PULLUP);
  pinMode(LOWER_LIMIT, INPUT_PULLUP);

  stopArm();
  stopGripper();

  Serial.println("================================");
  Serial.println(" ROBOTIC ARM AUTOMATIC TEST");
  Serial.println("================================");

  delay(2000);

  // -----------------------------
  // STEP 1: ARM GOES UP
  // -----------------------------

  Serial.println("ARM MOVING UP...");

  while (digitalRead(UPPER_LIMIT) == HIGH) {

    armUp();

    delay(10);
  }

  stopArm();

  Serial.println("UPPER LIMIT PRESSED");
  Serial.println("ARM STOPPED");

  delay(2000);


  // -----------------------------
  // STEP 2: ARM GOES DOWN
  // -----------------------------

  Serial.println("ARM MOVING DOWN...");

  while (digitalRead(LOWER_LIMIT) == HIGH) {

    armDown();

    delay(10);
  }

  stopArm();

  Serial.println("LOWER LIMIT PRESSED");
  Serial.println("ARM STOPPED");

  delay(2000);


  // -----------------------------
  // STEP 3: GRIPPER OPEN
  // -----------------------------

  Serial.println("GRIPPER OPENING...");

  gripperOpen();

  delay(1500);

  stopGripper();

  Serial.println("GRIPPER OPENED");

  delay(2000);


  // -----------------------------
  // STEP 4: GRIPPER CLOSE
  // -----------------------------

  Serial.println("GRIPPER CLOSING...");

  gripperClose();

  delay(1500);

  stopGripper();

  Serial.println("GRIPPER CLOSED");

  Serial.println();
  Serial.println("===== TEST COMPLETE =====");
}


// =================================
// LOOP
// =================================

void loop() {

  // Do nothing after completing
  // the automatic test.

}


// =================================
// ARM UP
// =================================

void armUp() {

  digitalWrite(ARM_UP_IN1, HIGH);
  digitalWrite(ARM_UP_IN2, LOW);
}


// =================================
// ARM DOWN
// =================================

void armDown() {

  digitalWrite(ARM_UP_IN1, LOW);
  digitalWrite(ARM_UP_IN2, HIGH);
}


// =================================
// STOP ARM
// =================================

void stopArm() {

  digitalWrite(ARM_UP_IN1, LOW);
  digitalWrite(ARM_UP_IN2, LOW);
}


// =================================
// GRIPPER OPEN
// =================================

void gripperOpen() {

  digitalWrite(GRIPPER_IN1, HIGH);
  digitalWrite(GRIPPER_IN2, LOW);
}


// =================================
// GRIPPER CLOSE
// =================================

void gripperClose() {

  digitalWrite(GRIPPER_IN1, LOW);
  digitalWrite(GRIPPER_IN2, HIGH);
}


// =================================
// STOP GRIPPER
// =================================

void stopGripper() {

  digitalWrite(GRIPPER_IN1, LOW);
  digitalWrite(GRIPPER_IN2, LOW);
}