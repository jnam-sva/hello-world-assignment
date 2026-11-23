// Plant Emotion — Arduino code that changes light and sound based on soil moisture (4 states)
// Required library  FastLED (install via Tools > Manage Libraries)
//
// Wiring
//   Strip 5V  → breadboard + rail (connected to Arduino 5V)
//   Strip GND → GND
//   Strip DI  → pin 11
//   Sensor VCC → breadboard + rail,  Sensor GND → GND,  Sensor AOUT → A0
//
// States
//   0 Dry (thirsty)            Brown, very slow and subtle breathing. Becomes more noticeable the longer it stays dry
//   1 Good (comfortable)       Soft yellow-green, steady with no movement (the ideal state)
//   2 Just watered (thankful)  Sparkles and bounces for a few seconds, then returns to the soil state
//   3 Soggy (overwatered)      Cold, murky blue-gray with a dark wave slowly sinking downward
//
// On every beat, the Arduino sends "B,state,moisture" to the laptop so the p5.js sound and the LEDs share the same rhythm.
// Quit the Arduino IDE completely before connecting from p5.js.

#include <FastLED.h>

#define NUM_LEDS    11     // ★ Change to the actual number of LEDs
#define DATA_PIN    11
#define BRIGHTNESS  90

const int SENSOR_PIN = A0;

// ★ Calibration  set DEBUG to true, check the raw values in the Serial Monitor, and enter them here
const int DRY_VALUE = 600;   // raw sensor value at the dry end
const int WET_VALUE = 350;   // raw sensor value at the wet end

// ★ Thresholds between states (%)
const int DRY_MAX = 55;      // below this = Dry           (dry rice reads 45~55)
const int WET_MIN = 80;      // at or above this = Soggy   (adjust after measuring wet rice)
const int MARGIN  = 3;       // buffer so the state doesn't flicker back and forth near a threshold

// ★ Detecting the moment of watering
const int WATER_JUMP = 8;                  // if moisture rises by this much (%) within 3 seconds, treat it as "just watered"
const unsigned long CELEBRATE_MS = 6000;   // how long the plant celebrates (6 seconds)

// How long it takes for the dry signal to become fully noticeable
const unsigned long DRY_ESCALATE_MS = 60000;   // grows more noticeable over 1 minute

const bool DEBUG = false;    // true = print human-readable raw values (must be false when connecting to p5)

// Beat length for each state (ms)  must match the values in the p5.js code
const int BEAT_DRY     = 4000;
const int BEAT_GOOD    = 750;
const int BEAT_WATERED = 250;
const int BEAT_SOGGY   = 2500;

enum { DRY = 0, GOOD = 1, WATERED = 2, SOGGY = 3 };

CRGB leds[NUM_LEDS];
int baseState = GOOD;        // soil state (Dry / Good / Soggy)
int state = GOOD;            // state actually shown (includes Just watered)
int moisture = 50;
float smoothRaw = -1;
unsigned long beatStart = 0;
unsigned long lastRead = 0;
unsigned long lastStatus = 0;
unsigned long celebrateStart = 0;
unsigned long dryStart = 0;

// Moisture history for the last 3 seconds (one sample every 0.5 s, 6 slots)
int history[6];
int histIndex = 0;
unsigned long lastHist = 0;

int beatLength() {
  if (state == DRY) return BEAT_DRY;
  if (state == GOOD) return BEAT_GOOD;
  if (state == WATERED) return BEAT_WATERED;
  return BEAT_SOGGY;
}

const char* stateName() {
  if (state == DRY) return "DRY";
  if (state == GOOD) return "GOOD";
  if (state == WATERED) return "WATERED";
  return "SOGGY";
}

// Read the sensor every 0.1 s and average slowly (so the value doesn't jump around)
void readSensor() {
  int raw = analogRead(SENSOR_PIN);
  if (smoothRaw < 0) smoothRaw = raw;
  smoothRaw += (raw - smoothRaw) * 0.05;
  moisture = constrain(map((int)smoothRaw, DRY_VALUE, WET_VALUE, 0, 100), 0, 100);
}

// Decide the soil state (with a buffer so it doesn't flicker near thresholds)
void updateBaseState() {
  if (baseState == DRY) {
    if (moisture >= DRY_MAX + MARGIN) baseState = GOOD;
  } else if (baseState == SOGGY) {
    if (moisture < WET_MIN - MARGIN) baseState = GOOD;
  } else {
    if (moisture < DRY_MAX - MARGIN) baseState = DRY;
    else if (moisture >= WET_MIN + MARGIN) baseState = SOGGY;
  }
}

// If moisture jumped up compared to 3 seconds ago, it was just watered
bool justWatered() {
  int oldest = history[histIndex];   // oldest sample
  return moisture - oldest >= WATER_JUMP;
}

void updateState() {
  int before = state;
  unsigned long now = millis();

  updateBaseState();

  if (state == WATERED) {
    // After celebrating, return to the soil state
    if (now - celebrateStart >= CELEBRATE_MS) state = baseState;
  } else if (justWatered()) {
    state = WATERED;
    celebrateStart = now;
    for (int i = 0; i < 6; i++) history[i] = moisture;   // don't react twice to the same watering
  } else {
    state = baseState;
  }

  if (state == DRY && before != DRY) dryStart = now;
  if (state != before) beatStart = now;   // a new state starts on a fresh beat
}

void sendLine(char type) {
  if (DEBUG) {
    Serial.print("raw ");
    Serial.print((int)smoothRaw);
    Serial.print("  moisture ");
    Serial.print(moisture);
    Serial.print("  state ");
    Serial.println(stateName());
    return;
  }
  Serial.print(type);
  Serial.print(',');
  Serial.print(state);
  Serial.print(',');
  Serial.println(moisture);
}

// 0 Dry  brown, very slow and subtle breathing. The longer it stays dry, the deeper and brighter the breath
void drawDry(float phase) {
  float escalate = min(1.0, (millis() - dryStart) / (float)DRY_ESCALATE_MS);   // 0 → 1
  float breath = 0.5 - 0.5 * cos(phase * 2 * PI);
  float depth = 40 + 80 * escalate;                 // subtle at first, clearer over time
  for (int i = 0; i < NUM_LEDS; i++) {
    float fade = 1.0 - 0.3 * i / (float)NUM_LEDS;   // far end slightly dimmer (wilting feel)
    uint8_t v = (90 + depth * breath) * fade;
    // LEDs can't show true brown, so we use a dim amber with plenty of green mixed in.
    // At low brightness the green channel drops out first and everything turns red,
    // so nscale8_video keeps every channel above zero while dimming.
    leds[i] = CRGB(255, 120, 25);                   // ★ dried-leaf amber (raise the 120 for more yellow, lower it for more red)
    leds[i].nscale8_video(v);
  }
}

// 1 Good  soft yellow-green with no movement (the most comfortable state)
void drawGood(float phase) {
  fill_solid(leds, NUM_LEDS, CHSV(70, 170, 70));
}

// 2 Just watered  light fills up like water soaking in, then pops and sparkles on each beat
void drawWatered(float phase) {
  float t = (millis() - celebrateStart) / (float)CELEBRATE_MS;   // 0 → 1 (celebration time)
  int filled = min(NUM_LEDS, (int)(t * 4 * NUM_LEDS));           // light fills up during the first 1.5 s
  float pulse = (1.0 - phase) * (1.0 - phase);
  float calm = 1.0 - t;                                          // calms down toward the end
  for (int i = 0; i < NUM_LEDS; i++) {
    if (i >= filled) { leds[i] = CRGB::Black; continue; }
    uint8_t v = 70 + (110 * pulse + 40) * calm;
    leds[i] = CHSV(100 + i * 3, 190, v);                         // clear green to teal
  }
  if (random8() < 120 * calm && filled > 0) {
    leds[random16(filled)] = CRGB::White;                        // sparkle
  }
}

// 3 Soggy  cold, murky blue-gray with a dark wave sinking heavily downward
void drawSoggy(float phase) {
  for (int i = 0; i < NUM_LEDS; i++) {
    float p = phase + (float)i / NUM_LEDS;          // flows from the far end toward the start
    float wave = 0.5 + 0.5 * cos(p * 2 * PI);
    uint8_t v = 22 + 30 * wave;
    leds[i] = CHSV(150, 110, v);                    // cold, desaturated blue-gray
  }
}

void setup() {
  FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(BRIGHTNESS);
  FastLED.setMaxPowerInVoltsAndMilliamps(5, 500);   // protect USB power
  Serial.begin(9600);

  readSensor();
  for (int i = 0; i < 6; i++) history[i] = moisture;
  updateBaseState();
  state = baseState;
  beatStart = millis();
  dryStart = millis();
}

void loop() {
  unsigned long now = millis();

  if (now - lastRead >= 100) {
    lastRead = now;
    readSensor();
    updateState();
  }

  // Record moisture every 0.5 s (for detecting watering)
  if (now - lastHist >= 500) {
    lastHist = now;
    history[histIndex] = moisture;
    histIndex = (histIndex + 1) % 6;
  }

  // Beat check → notify the laptop right away when a beat arrives
  if (now - beatStart >= (unsigned long)beatLength()) {
    beatStart = now;
    sendLine('B');
  }

  // Send the state between beats too (to update the number on the p5 screen)
  if (now - lastStatus >= 250) {
    lastStatus = now;
    sendLine('S');
  }

  float phase = (now - beatStart) / (float)beatLength();   // 0 ~ 1
  if (state == DRY) drawDry(phase);
  else if (state == GOOD) drawGood(phase);
  else if (state == WATERED) drawWatered(phase);
  else drawSoggy(phase);

  FastLED.show();
  delay(10);
}