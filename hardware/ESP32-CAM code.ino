#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// ---------- Wi-Fi ----------
const char* ssid = "Airtel_Gagan";
const char* password = "Gagan#123";

// ---------- Backend ----------
const char* verifyURL =
  "https://hospital.gagangowda.tech/api/robot/verify-qr";

const char* nextJobURL =
  "https://hospital.gagangowda.tech/api/robot/next-job";  

const char* robotKey = "hospital-robot-2026-key";

// Request information received dynamically from the backend
int requestID = 0;
String ward = "";
String patientID = "";

// ---------- AI Thinker ESP32-CAM pins ----------
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM       5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22


bool getNextJob() {

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;

  Serial.println("Getting next job...");

  if (!http.begin(client, nextJobURL)) {
    Serial.println("Could not connect to next-job URL");
    return false;
  }

  http.addHeader("X-Robot-Key", robotKey);

  int code = http.GET();

  Serial.print("Next-job HTTP code: ");
  Serial.println(code);

  if (code != 200) {
    Serial.println(http.getString());
    http.end();
    return false;
  }

  String response = http.getString();

  Serial.println("Next-job response:");
  Serial.println(response);

  // Extract request ID
  int p = response.indexOf("\"req_id\":");

  if (p < 0) {
    Serial.println("Request ID not found");
    http.end();
    return false;
  }

  p += 9;
  int end = response.indexOf(",", p);

  requestID = response.substring(p, end).toInt();

  // Extract ward
  p = response.indexOf("\"ward\":\"");

  if (p >= 0) {
    p += 8;
    end = response.indexOf("\"", p);
    ward = response.substring(p, end);
  }

  // Extract patient ID
  p = response.indexOf("\"patient_id\":\"");

  if (p >= 0) {
    p += 14;
    end = response.indexOf("\"", p);
    patientID = response.substring(p, end);
  }
  
  Serial.println("----- JOB RECEIVED -----");
  Serial.print("Request ID: ");
  Serial.println(requestID);
  Serial.print("Ward: ");
  Serial.println(ward);
  Serial.print("Patient: ");
  Serial.println(patientID);
  Serial.println("-----------------------");

  http.end();

  return requestID > 0;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // ---------- Camera configuration ----------
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;

  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;

  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;

  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  Serial.print("PSRAM: ");
  Serial.println(psramFound() ? "FOUND" : "NOT FOUND");



  if (psramFound()) {
    config.frame_size = FRAMESIZE_XGA;
    config.jpeg_quality = 5;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;

  esp_err_t result = esp_camera_init(&config);

  if (result != ESP_OK) {
    Serial.printf("Camera initialization failed: 0x%x\n", result);
    return;
  }

  // ---------- Wi-Fi ----------
  WiFi.begin(ssid, password);
  WiFi.setSleep(false);

  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi connected");
  Serial.print("ESP32-CAM IP: ");
  Serial.println(WiFi.localIP());

  delay(2000);

  
}

void loop() {

  static unsigned long lastCheck = 0;
  static unsigned long lastQRCheck = 0;

  // ==========================================================
  // NO CURRENT JOB
  // Check for a new job every 5 seconds
  // ==========================================================

  if (requestID == 0) {

    if (millis() - lastCheck >= 5000) {

      lastCheck = millis();

      Serial.println();
      Serial.println("================================");
      Serial.println("Checking for a job...");
      Serial.println("================================");

      if (getNextJob()) {

        Serial.println("JOB FOUND!");
        Serial.println("Request ID: " + String(requestID));
        Serial.println("Ward: " + ward);
        Serial.println("Patient: " + patientID);

        Serial.println("Job assigned.");
        Serial.println("Waiting for QR code...");

      } else {

        Serial.println("No Requested job found.");
        Serial.println("Will check again in 5 seconds...");
      }
    }

    return;
  }


  // ==========================================================
  // CURRENT JOB EXISTS
  // Keep trying the SAME QR
  // ==========================================================

  if (millis() - lastQRCheck >= 3000) {

    lastQRCheck = millis();

    Serial.println();
    Serial.println("================================");
    Serial.println("Trying QR verification...");
    Serial.print("Request ID: ");
    Serial.println(requestID);
    Serial.println("================================");

    bool verified = uploadQRCode();

    if (verified) {

      Serial.println();
      Serial.println("QR VERIFIED!");
      Serial.println("Job completed successfully.");

      // Clear ONLY after successful verification
      requestID = 0;
      ward = "";
      patientID = "";

      Serial.println("Returning to job search...");

    } else {

      Serial.println();
      Serial.println("QR not verified.");
      Serial.println("Keeping the current job.");
      Serial.println("Will try again in 3 seconds...");
    }
  }
}

bool uploadQRCode() {
  Serial.println("Capturing image...");

  camera_fb_t* frame = esp_camera_fb_get();

  Serial.print("Width: ");
  Serial.println(frame->width);
  Serial.print("Height: ");
  Serial.println(frame->height);

  if (!frame) {
    Serial.println("Camera capture failed");
    return false;;
  }

  Serial.print("Image size: ");
  Serial.println(frame->len);

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;

  if (!http.begin(client, verifyURL)) {
    Serial.println("Could not connect to verification URL");
    esp_camera_fb_return(frame);
    return false;;
  }

  String boundary = "----ESP32CAMBoundary";

  String header =
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"req_id\"\r\n\r\n" +
    String(requestID) + "\r\n"
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"image\"; filename=\"qr.jpg\"\r\n"
    "Content-Type: image/jpeg\r\n\r\n";

  String footer = "\r\n--" + boundary + "--\r\n";

  int totalLength = header.length() + frame->len + footer.length();

  uint8_t* body = (uint8_t*)malloc(totalLength);

  if (!body) {
    Serial.println("Memory allocation failed");
    http.end();
    esp_camera_fb_return(frame);
    return false;;
  }

  int position = 0;

  memcpy(body + position, header.c_str(), header.length());
  position += header.length();

  memcpy(body + position, frame->buf, frame->len);
  position += frame->len;

  memcpy(body + position, footer.c_str(), footer.length());

  http.addHeader(
    "Content-Type",
    "multipart/form-data; boundary=" + boundary
  );

  http.addHeader("X-Robot-Key", robotKey);

  Serial.println("Uploading image...");

  int responseCode = http.POST(body, totalLength);

Serial.print("HTTP response code: ");
Serial.println(responseCode);

bool verified = false;

if (responseCode > 0) {

    String response = http.getString();

    Serial.println("Verification response:");
    Serial.println(response);

    if (response.indexOf("\"verified\":true") >= 0) {
      verified = true;
      Serial.println("QR VERIFIED!");
    } else {
      Serial.println("QR NOT VERIFIED.");
    }

  } else {

    Serial.print("Upload failed: ");
    Serial.println(http.errorToString(responseCode));
  }

  free(body);
  http.end();
  esp_camera_fb_return(frame);

  return verified;
}
