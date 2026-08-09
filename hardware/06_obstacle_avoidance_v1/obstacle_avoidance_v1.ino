// =========================
// WHEEL DRIVER (L298N #1)
// =========================
#define W_IN1 25
#define W_IN2 26
#define W_IN3 27
#define W_IN4 14
#define W_ENA 33
#define W_ENB 32

// =========================
// ULTRASONIC SENSORS
// =========================
#define TRIG_LEFT 4
#define ECHO_LEFT 13

#define TRIG_RIGHT 15
#define ECHO_RIGHT 23

const int obstacleDistance = 25;

// -------------------------
// Read Distance
// -------------------------
long readDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);

  if (duration == 0) return 300;

  return duration * 0.034 / 2;
}

// -------------------------
// Movement Functions
// -------------------------
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

void turnLeft() {
  digitalWrite(W_IN1, LOW);
  digitalWrite(W_IN2, HIGH);
  digitalWrite(W_IN3, HIGH);
  digitalWrite(W_IN4, LOW);
}

void turnRight() {
  digitalWrite(W_IN1, HIGH);
  digitalWrite(W_IN2, LOW);
  digitalWrite(W_IN3, LOW);
  digitalWrite(W_IN4, HIGH);
}

void stopWheels() {
  digitalWrite(W_IN1, LOW);
  digitalWrite(W_IN2, LOW);
  digitalWrite(W_IN3, LOW);
  digitalWrite(W_IN4, LOW);
}

void setup() {
  Serial.begin(115200);

  pinMode(W_IN1, OUTPUT);
  pinMode(W_IN2, OUTPUT);
  pinMode(W_IN3, OUTPUT);
  pinMode(W_IN4, OUTPUT);

  pinMode(TRIG_LEFT, OUTPUT);
  pinMode(ECHO_LEFT, INPUT);

  pinMode(TRIG_RIGHT, OUTPUT);
  pinMode(ECHO_RIGHT, INPUT);

  ledcAttach(W_ENA, 1000, 8);
  ledcAttach(W_ENB, 1000, 8);
  ledcWrite(W_ENA, 255);
  ledcWrite(W_ENB, 255);

  Serial.println("Autonomous navigation started");
}

void loop() {
  long leftDistance = readDistance(TRIG_LEFT, ECHO_LEFT);
  long rightDistance = readDistance(TRIG_RIGHT, ECHO_RIGHT);

  Serial.print("Left: ");
  Serial.print(leftDistance);
  Serial.print(" cm   Right: ");
  Serial.print(rightDistance);
  Serial.print(" cm   Action: ");

  bool leftBlocked = leftDistance < obstacleDistance;
  bool rightBlocked = rightDistance < obstacleDistance;

  if (!leftBlocked && !rightBlocked) {
    forward();
    Serial.println("FORWARD");
  }
  else if (leftBlocked && !rightBlocked) {
    turnRight();
    Serial.println("TURN RIGHT");
    delay(300);
  }
  else if (!leftBlocked && rightBlocked) {
    turnLeft();
    Serial.println("TURN LEFT");
    delay(300);
  }
  else {
    stopWheels();
    delay(100);

    backward();
    Serial.println("REVERSE");
    delay(500);

    turnRight();
    Serial.println("TURN RIGHT (BOTH BLOCKED)");
    delay(500);
  }

  delay(50);
}