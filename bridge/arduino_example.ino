/**
 * Arduino OSC Controller for Kaldao Fractal Visualizer
 * 
 * This sketch reads analog potentiometers and sends OSC-formatted data
 * over Bluetooth to control fractal visualization parameters.
 * 
 * Hardware Setup:
 * - 8 potentiometers connected to A0-A7
 * - HC-05 or HC-06 Bluetooth module connected to pins 2,3
 * - Arduino Uno/Nano/Mega compatible
 * 
 * Parameter Mapping:
 * A0 → /pot1 → fly_speed (tunnel movement speed)
 * A1 → /pot2 → rotation_speed (pattern rotation) 
 * A2 → /pot3 → kaleidoscope_segments (radial symmetry)
 * A3 → /pot4 → truchet_radius (pattern size)
 * A4 → /pot5 → zoom_level (camera zoom)
 * A5 → /pot6 → color_intensity (color saturation)
 * A6 → /pot7 → contrast (visual contrast)
 * A7 → /pot8 → center_fill_radius (center circle size)
 * 
 * Usage:
 * 1. Upload this sketch to Arduino
 * 2. Pair Bluetooth module with computer
 * 3. Run Python bridge: python bridge/osc_bridge.py
 * 4. Open fractal visualizer and press 'O' to connect
 * 5. Turn potentiometers to control parameters!
 */

#include <SoftwareSerial.h>

// Bluetooth module pins (HC-05/HC-06)
#define BT_RX_PIN 2
#define BT_TX_PIN 3

// Create Bluetooth serial connection
SoftwareSerial bluetooth(BT_RX_PIN, BT_TX_PIN);

// Configuration
const int NUM_POTS = 8;              // Number of potentiometers
const int ANALOG_PINS[NUM_POTS] = {A0, A1, A2, A3, A4, A5, A6, A7};
const int SEND_INTERVAL = 50;        // Send data every 50ms (20Hz)
const int SMOOTHING_SAMPLES = 5;     // Number of samples for smoothing
const int CHANGE_THRESHOLD = 8;      // Minimum change to trigger send (reduce noise)

// Data storage
int currentValues[NUM_POTS];
int previousValues[NUM_POTS];
int smoothingBuffer[NUM_POTS][SMOOTHING_SAMPLES];
int bufferIndex = 0;
unsigned long lastSendTime = 0;
bool bluetoothConnected = false;

void setup() {
  // Initialize serial communications
  Serial.begin(9600);
  bluetooth.begin(9600);
  
  // Initialize arrays
  for (int i = 0; i < NUM_POTS; i++) {
    currentValues[i] = 0;
    previousValues[i] = 0;
    for (int j = 0; j < SMOOTHING_SAMPLES; j++) {
      smoothingBuffer[i][j] = 0;
    }
  }
  
  // Initial read to populate arrays
  readPotentiometers();
  
  Serial.println("🎛️ Kaldao OSC Controller Ready");
  Serial.println("Analog pins A0-A7 mapped to /pot1-/pot8");
  Serial.println("Waiting for Bluetooth connection...");
  
  // Send startup message over Bluetooth
  bluetooth.println("KALDAO_OSC_CONTROLLER_READY");
  
  delay(1000);
}

void loop() {
  // Check for incoming Bluetooth data (for connection status)
  checkBluetoothConnection();
  
  // Read potentiometer values with smoothing
  readPotentiometers();
  
  // Send data at regular intervals or when significant changes occur
  unsigned long currentTime = millis();
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    sendOSCData();
    lastSendTime = currentTime;
  }
  
  // Small delay to prevent overwhelming the system
  delay(10);
}

void checkBluetoothConnection() {
  if (bluetooth.available()) {
    String received = bluetooth.readString();
    received.trim();
    
    if (received == "BRIDGE_CONNECTED") {
      bluetoothConnected = true;
      Serial.println("✅ Connected to OSC bridge");
    } else if (received == "BRIDGE_DISCONNECTED") {
      bluetoothConnected = false;
      Serial.println("❌ Disconnected from OSC bridge");
    }
  }
}

void readPotentiometers() {
  for (int i = 0; i < NUM_POTS; i++) {
    // Read raw analog value
    int rawValue = analogRead(ANALOG_PINS[i]);
    
    // Add to smoothing buffer
    smoothingBuffer[i][bufferIndex] = rawValue;
    
    // Calculate smoothed value
    int sum = 0;
    for (int j = 0; j < SMOOTHING_SAMPLES; j++) {
      sum += smoothingBuffer[i][j];
    }
    currentValues[i] = sum / SMOOTHING_SAMPLES;
  }
  
  // Advance buffer index
  bufferIndex = (bufferIndex + 1) % SMOOTHING_SAMPLES;
}

void sendOSCData() {
  bool dataChanged = false;
  
  for (int i = 0; i < NUM_POTS; i++) {
    // Check if value has changed significantly
    int change = abs(currentValues[i] - previousValues[i]);
    
    if (change >= CHANGE_THRESHOLD) {
      // Send both serial monitor and Bluetooth
      String message = String(i) + ":" + String(currentValues[i]);
      
      // Debug output to serial monitor
      Serial.print("A");
      Serial.print(i);
      Serial.print(" = ");
      Serial.print(currentValues[i]);
      Serial.print(" (");
      Serial.print(map(currentValues[i], 0, 1023, 0, 100));
      Serial.print("%) → /pot");
      Serial.println(i + 1);
      
      // Send to Bluetooth
      bluetooth.println(message);
      
      // Update previous value
      previousValues[i] = currentValues[i];
      dataChanged = true;
    }
  }
  
  // Status indicator
  if (dataChanged) {
    if (bluetoothConnected) {
      Serial.println("📡 Data sent to fractal visualizer");
    } else {
      Serial.println("⚠️ Data ready but no bridge connection");
    }
  }
}

// Alternative JSON format sending (comment/uncomment to switch formats)
void sendOSCDataJSON() {
  bool dataChanged = false;
  
  for (int i = 0; i < NUM_POTS; i++) {
    int change = abs(currentValues[i] - previousValues[i]);
    
    if (change >= CHANGE_THRESHOLD) {
      // Send JSON format: {"pin": 0, "value": 512}
      String jsonMessage = "{\"pin\":" + String(i) + ",\"value\":" + String(currentValues[i]) + "}";
      
      Serial.println("JSON: " + jsonMessage);
      bluetooth.println(jsonMessage);
      
      previousValues[i] = currentValues[i];
      dataChanged = true;
    }
  }
  
  if (dataChanged && bluetoothConnected) {
    Serial.println("📡 JSON data sent to fractal visualizer");
  }
}

// Calibration function - call this to see raw values
void calibratePotentiometers() {
  Serial.println("🔧 Calibration Mode - Raw Values:");
  for (int i = 0; i < NUM_POTS; i++) {
    int raw = analogRead(ANALOG_PINS[i]);
    Serial.print("A");
    Serial.print(i);
    Serial.print(": ");
    Serial.print(raw);
    Serial.print(" ");
  }
  Serial.println();
  delay(500);
}

// Diagnostic function
void printConnectionStatus() {
  Serial.println("--- Connection Status ---");
  Serial.print("Bluetooth: ");
  Serial.println(bluetoothConnected ? "Connected" : "Disconnected");
  Serial.print("Active parameters: ");
  
  int activeCount = 0;
  for (int i = 0; i < NUM_POTS; i++) {
    if (currentValues[i] > 10) { // Consider >10 as "active"
      activeCount++;
    }
  }
  Serial.println(activeCount);
  Serial.println("------------------------");
}