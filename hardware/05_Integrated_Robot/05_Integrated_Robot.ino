// =========================
// L298N #1 - Wheels
// =========================
#define W_IN1 25
#define W_IN2 26
#define W_IN3 27
#define W_IN4 14
#define W_ENA 33
#define W_ENB 32

// =========================
// L298N #2 - Robotic Arm
// =========================
#define A_IN1 18
#define A_IN2 19
#define A_IN3 21
#define A_IN4 22

void setup() {
  // Wheel pins
  pinMode(W_IN1, OUTPUT);
  pinMode(W_IN2, OUTPUT);
  pinMode(W_IN3, OUTPUT);
  pinMode(W_IN4, OUTPUT);

  // Arm pins
  pinMode(A_IN1, OUTPUT);
  pinMode(A_IN2, OUTPUT);
  pinMode(A_IN3, OUTPUT);
  pinMode(A_IN4, OUTPUT);

  // PWM for wheel ENA and ENB
  ledcAttach(W_ENA, 1000, 8);
  ledcAttach(W_ENB, 1000, 8);

  ledcWrite(W_ENA, 255);
  ledcWrite(W_ENB, 255);
}

// ---------------- Wheels ----------------
void forward() {
  digitalWrite(W_IN1, HIGH);
  digitalWrite(W_IN2, LOW);
  digitalWrite(W_IN3, HIGH);
  digitalWrite(W_IN4, LOW);
}

void backward() {
  digitalWrite(W_IN1, LOW);
  digitalWrite(W_IN2, HIGH);
  digitalWrite(W_IN3, LOW);
  digitalWrite(W_IN4, HIGH);
}

void stopWheels() {
  digitalWrite(W_IN1, LOW);
  digitalWrite(W_IN2, LOW);
  digitalWrite(W_IN3, LOW);
  digitalWrite(W_IN4, LOW);
}

// ---------------- Arm ----------------
void liftUp() {
  digitalWrite(A_IN1, HIGH);
  digitalWrite(A_IN2, LOW);
}

void liftDown() {
  digitalWrite(A_IN1, LOW);
  digitalWrite(A_IN2, HIGH);
}

void stopLift() {
  digitalWrite(A_IN1, LOW);
  digitalWrite(A_IN2, LOW);
}

void gripperOpen() {
  digitalWrite(A_IN3, HIGH);
  digitalWrite(A_IN4, LOW);
}

void gripperClose() {
  digitalWrite(A_IN3, LOW);
  digitalWrite(A_IN4, HIGH);
}

void stopGripper() {
  digitalWrite(A_IN3, LOW);
  digitalWrite(A_IN4, LOW);
}

void loop() {
  // Move forward
  forward();
  delay(3000);

  stopWheels();
  delay(1000);

  // Lift up
  liftUp();
  delay(2000);

  stopLift();
  delay(500);

  // Open gripper
  gripperOpen();
  delay(2000);

  stopGripper();
  delay(500);

  // Close gripper
  gripperClose();
  delay(2000);

  stopGripper();
  delay(500);

  // Lift down
  liftDown();
  delay(2000);

  stopLift();
  delay(1000);

  // Move backward
  backward();
  delay(3000);

  stopWheels();
  delay(2000);
}