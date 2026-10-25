// ==========================================
// ESP32 4-WHEEL AUTOMATIC TEST
// Motor Driver 1 - L298N
// ==========================================

#define ENA 33
#define ENB 32

#define IN1 25
#define IN2 26

#define IN3 27
#define IN4 14

void stopMotors() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
}

void forward() {
  // Current physical "backward" direction was here
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);

  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void backward() {
  // Current physical "forward" direction was here
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

void setup() {

  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  // Enable both motor channels
  digitalWrite(ENA, HIGH);
  digitalWrite(ENB, HIGH);

  stopMotors();

  delay(2000);
}

void loop() {

  // 1. FORWARD
  forward();
  delay(3000);

  // STOP
  stopMotors();
  delay(2000);

  // 2. BACKWARD
  backward();
  delay(3000);

  // STOP
  stopMotors();
  delay(2000);

  // 3. TURN LEFT
  turnLeft();
  delay(2000);

  // STOP
  stopMotors();
  delay(2000);

  // 4. TURN RIGHT
  turnRight();
  delay(2000);

  // STOP
  stopMotors();
  delay(3000);
}