// Motor A (Left Wheels)
#define ENA 33
#define IN1 25
#define IN2 26

// Motor B (Right Wheels)
#define ENB 32
#define IN3 27
#define IN4 14

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);

  digitalWrite(ENA, HIGH);
  digitalWrite(ENB, HIGH);
}

// ---------- Movement Functions ----------

void forward() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void backward() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void left() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void right() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void stopRobot() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
}

void loop() {

  forward();
  delay(3000);

  stopRobot();
  delay(1000);

  backward();
  delay(3000);

  stopRobot();
  delay(1000);

  left();
  delay(2000);

  stopRobot();
  delay(1000);

  right();
  delay(2000);

  stopRobot();
  delay(2000);
}