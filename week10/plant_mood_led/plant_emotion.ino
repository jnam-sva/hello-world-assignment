// Plant Emotion — Arduino code that changes light and sound based on soil moisture
// Required library  FastLED (install via Tools > Manage Libraries)
//
// Wiring
//   Strip 5V  → breadboard + rail (connected to Arduino 5V)
//   Strip GND → GND
//   Strip DI  → pin 11
//   Sensor VCC → breadboard + rail,  Sensor GND → GND,  Sensor AOUT → A0
//   ★ LED 0 (closest to DI) is treated as the BOTTOM of the strip
//
// Signal language
//   Steady light = no action needed.   Pulsing light = the plant needs you.
//   Rising sound = positive.           Falling sound = negative.
//
// States
//   0 Dry (thirsty)            Amber pulse. Bright for 10 s, then slowly dims.
//                              The longer it stays dry, the faster it pulses and the redder it gets.
//                              Sound  low falling sigh
//   1 Good (comfortable)       Dim, steady green. No movement. Silent
//   2 Just watered (thankful)  Green rises from bottom to top, glows, then fades out after 10 s
//                              Sound  bright rising chime, ONCE (when this state starts)
//   3 Soggy (overwatered)      Deep blue, slow heavy pulse dripping downward. Bright for 10 s, then slowly dims
//                              Sound  muffled falling water-drop sound
//   4 Processing (reading)     Slow white sweep while the sensor is reading. Silent
//                              8 s at startup, and 3 s after watering before Just watered
//
// Messages sent to the laptop (p5.js)
//   "B,state,moisture"  on every beat        → use for repeating sounds (Dry, Soggy only)
//   "C,state,moisture"  when the state changes → use for one-shot sounds (the Just watered chime)
//   "S,state,moisture"  every 0.25 s          → use for the number on screen
// Quit the Arduino IDE completely before connecting from p5.js.

#include <FastLED.h>

#define NUM_LEDS    11     // ★ Change to the actual number of LEDs
#define DATA_PIN    11
#define BRIGHTNESS  150    // overall brightness cap (each state sets its own level under this)

const int SENSOR_PIN = A0;

// ★ Calibration  set DEBUG to true, check the raw values in the Serial Monitor, and enter them here
const int DRY_VALUE = 600;   // raw sensor value at the dry end
const int WET_VALUE = 350;   // raw sensor value at the wet end

// ★ Thresholds between states (%)
const int DRY_MAX = 52;      // Dry starts below 55 (58 - MARGIN), returns to Good at 61 (58 + MARGIN)
const int WET_MIN = 80;      // at or above this = Soggy   (adjust after measuring wet rice)
const int MARGIN  = 3;       // buffer so the state doesn't flicker near a threshold

// ★ Soggy only when the soil STAYS wet (fresh water always reads high at first)
// Timeline after watering  white sweep 3 s → Just watered 10 s → Good 30 s → Soggy (if still wet)
const unsigned long WATER_SETTLE_MS = 30000;  // ★ after Just watered ENDS, wait 30 s before Soggy can appear
const unsigned long SOGGY_HOLD_MS   = 10000;  // ★ must stay above the Soggy line for 10 s

// ★ Detecting the moment of watering
const int WATER_JUMP = 8;                   // rise of this much (%) within 3 s = "just watered"

// ★ Timing
const unsigned long PROCESSING_MS   = 8000;    // ★ white sweep at startup (8 s)
const unsigned long WATER_READ_MS   = 3000;    // ★ white sweep after watering, before Just watered (3 s)
const unsigned long CELEBRATE_MS    = 10000;   // Just watered lasts 10 s, then turns off
const unsigned long WATER_RISE_MS   = 2000;    // green takes 2 s to rise to the top
const unsigned long WATER_FADE_MS   = 4000;    // fades out during the last 4 s
const unsigned long DRY_BRIGHT_MS   = 10000;   // Dry stays bright for 10 s
const unsigned long DRY_FADE_MS     = 60000;   // then dims over 1 minute
const unsigned long DRY_ESCALATE_MS = 120000;  // pulse gets faster and redder over 2 minutes

// ★ Brightness levels (0~255, scaled again by BRIGHTNESS)
const uint8_t GOOD_LEVEL     = 45;    // Good is kept low and calm
const uint8_t DRY_BASE       = 70;    // Dry's resting brightness (Good fades into this)

// ★ Gradual Good → Dry
const int GOOD_FADE_START = 60;              // below this %, green starts turning amber
const unsigned long DRY_EASE_MS = 3000;      // once Dry starts, the pulse grows in over 3 s
const float   DRY_MIN_LEVEL  = 0.25;  // how dim Dry gets after fading (never fully off)

// ★ Soggy dims the same way as Dry
const unsigned long SOGGY_BRIGHT_MS = 10000;  // Soggy stays bright for 10 s
const unsigned long SOGGY_FADE_MS   = 60000;  // then dims over 1 minute
const float   SOGGY_MIN_LEVEL = 0.15;         // how dim Soggy gets (never fully off)

const bool DEBUG = false;    // true = print human-readable raw values (must be false when connecting to p5)

// Beat length for each state (ms)
const int BEAT_DRY_START  = 3000;   // Dry starts slow...
const int BEAT_DRY_END    = 1000;   // ...and ends faster
const int BEAT_GOOD       = 3000;   // no sound, kept only for timing
const int BEAT_WATERED    = 600;
const int BEAT_SOGGY      = 3500;   // slow and heavy
const int BEAT_PROCESSING = 2000;   // one slow sweep every 2 s

enum { DRY = 0, GOOD = 1, WATERED = 2, SOGGY = 3, PROCESSING = 4 };

CRGB leds[NUM_LEDS];
int baseState = GOOD;        // soil state (Dry / Good / Soggy)
int state = PROCESSING;      // state actually shown
int moisture = 50;
float smoothRaw = -1;
unsigned long bootTime = 0;
unsigned long processingEnd = 0;   // when the current Processing state ends
bool wateredNext = false;          // true = show Just watered after Processing
unsigned long settleUntil = 0;     // no Soggy before this time (set when watered)
unsigned long highSince = 0;       // when moisture went above the Soggy line (0 = not above)
unsigned long beatStart = 0;
unsigned long lastRead = 0;
unsigned long lastStatus = 0;
unsigned long celebrateStart = 0;
unsigned long dryStart = 0;
unsigned long soggyStart = 0;

// Moisture history for the last 3 seconds (one sample every 0.5 s, 6 slots)
int history[6];
int histIndex = 0;
unsigned long lastHist = 0;

float clamp01(float x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }

// How far into the Dry state we are (0 → 1)
float dryEscalation() {
  return clamp01((millis() - dryStart) / (float)DRY_ESCALATE_MS);
}

int beatLength() {
  if (state == DRY) return BEAT_DRY_START + (BEAT_DRY_END - BEAT_DRY_START) * dryEscalation();
  if (state == GOOD) return BEAT_GOOD;
  if (state == WATERED) return BEAT_WATERED;
  if (state == SOGGY) return BEAT_SOGGY;
  return BEAT_PROCESSING;
}

const char* stateName() {
  if (state == DRY) return "DRY";
  if (state == GOOD) return "GOOD";
  if (state == WATERED) return "WATERED";
  if (state == SOGGY) return "SOGGY";
  return "PROCESSING";
}

// Read the sensor and average slowly (so the value doesn't jump around)
void readSensor() {
  int raw = analogRead(SENSOR_PIN);
  if (smoothRaw < 0) smoothRaw = raw;
  smoothRaw += (raw - smoothRaw) * 0.05;
  moisture = constrain(map((int)smoothRaw, DRY_VALUE, WET_VALUE, 0, 100), 0, 100);
}

// Soggy is confirmed only if the soil has stayed wet for a while,
// and not right after watering
bool soggyConfirmed() {
  unsigned long now = millis();
  if (moisture >= WET_MIN + MARGIN) {
    if (highSince == 0) highSince = now;
  } else {
    highSince = 0;
  }
  bool settled = (long)(now - settleUntil) >= 0;
  bool heldLongEnough = highSince != 0 && now - highSince >= SOGGY_HOLD_MS;
  return settled && heldLongEnough;
}

// Decide the soil state (with a buffer so it doesn't flicker near thresholds)
void updateBaseState() {
  bool soggy = soggyConfirmed();
  // Never become Soggy while the sensor is reading or the plant is celebrating
  if (state == PROCESSING || state == WATERED) soggy = false;
  if (baseState == DRY) {
    if (moisture >= DRY_MAX + MARGIN) baseState = GOOD;
  } else if (baseState == SOGGY) {
    if (moisture < WET_MIN - MARGIN) baseState = GOOD;
  } else {
    if (moisture < DRY_MAX - MARGIN) baseState = DRY;
    else if (soggy) baseState = SOGGY;
  }
}

void resetHistory() {
  for (int i = 0; i < 6; i++) history[i] = moisture;
}

// If moisture jumped up compared to 3 seconds ago, it was just watered
bool justWatered() {
  int oldest = history[histIndex];
  return moisture - oldest >= WATER_JUMP;
}

void sendLine(char type) {
  if (DEBUG) {
    Serial.print(type);
    Serial.print("  raw ");
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

void updateState() {
  int before = state;
  unsigned long now = millis();

  updateBaseState();

  if (state == PROCESSING) {
    // The sensor is reading. When it's done, show the result
    if ((long)(now - processingEnd) >= 0) {
      if (wateredNext) {
        state = WATERED;
        celebrateStart = now;
        wateredNext = false;
      } else {
        state = baseState;
      }
      resetHistory();   // don't mistake the settling for another watering
    }
  } else if (state == WATERED) {
    // After 10 s of celebrating, return to the soil state
    if (now - celebrateStart >= CELEBRATE_MS) {
      // Start the drain timer from HERE, so Good always shows for a while first
      settleUntil = now + WATER_SETTLE_MS;
      highSince = 0;
      if (baseState == SOGGY) baseState = GOOD;
      state = baseState;
    }
  } else if (justWatered()) {
    // Water detected → read for a few seconds first, then celebrate
    state = PROCESSING;
    processingEnd = now + WATER_READ_MS;
    wateredNext = true;
    // Block Soggy for the whole celebration (it is pushed further back when Just watered ends)
    settleUntil = now + WATER_READ_MS + CELEBRATE_MS + WATER_SETTLE_MS;
    highSince = 0;
    if (baseState == SOGGY) baseState = GOOD;
    resetHistory();     // don't react twice to the same watering
  } else {
    state = baseState;
  }

  if (state == DRY && before != DRY) dryStart = now;
  if (state == SOGGY && before != SOGGY) soggyStart = now;
  if (state != before) {
    beatStart = now;    // a new state starts on a fresh beat
    sendLine('C');      // tell p5 the state changed (for one-shot sounds)
  }
}

// 4 Processing  a soft white light sweeping along the strip
void drawProcessing(float phase) {
  fadeToBlackBy(leds, NUM_LEDS, 40);                 // leaves a short tail
  int pos = (int)(phase * NUM_LEDS) % NUM_LEDS;
  leds[pos] = CRGB(140, 140, 140);
}

// 0 Dry  amber pulse. Bright for 10 s, then dims. Gets faster and redder over time
void drawDry(float phase) {
  unsigned long dryFor = millis() - dryStart;
  float esc = dryEscalation();

  // Overall level  full for 10 s, then fades down to DRY_MIN_LEVEL
  float level = 1.0;
  if (dryFor > DRY_BRIGHT_MS) {
    float t = clamp01((dryFor - DRY_BRIGHT_MS) / (float)DRY_FADE_MS);
    level = 1.0 - t * (1.0 - DRY_MIN_LEVEL);
  }

  float pulse = 0.5 - 0.5 * cos(phase * 2 * PI);    // 0 → 1 → 0 each beat
  float ease = clamp01(dryFor / (float)DRY_EASE_MS); // pulse starts flat and grows in
  uint8_t v = (DRY_BASE + (255 - DRY_BASE) * pulse * ease) * level;
  uint8_t g = 120 - 95 * esc;                        // ★ amber (120) → red (25) as it stays dry

  for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = CRGB(255, g, 10);
    leds[i].nscale8_video(v);                        // keeps the color from collapsing to red when dim
  }
}

// 1 Good  dim, steady green with no movement.
// As moisture drops toward Dry, it slowly turns into Dry's resting amber (still steady)
void drawGood(float phase) {
  int dryEdge = DRY_MAX - MARGIN;                    // where Dry begins (55%)
  float t = clamp01((GOOD_FADE_START - moisture) / (float)(GOOD_FADE_START - dryEdge));

  CRGB green = CHSV(96, 200, GOOD_LEVEL);
  CRGB amber = CRGB(255, 120, 10);
  amber.nscale8_video(DRY_BASE);                     // same color Dry starts from

  fill_solid(leds, NUM_LEDS, blend(green, amber, (uint8_t)(t * 255)));
}

// 2 Just watered  green rises from bottom to top, glows, then fades out at 10 s
void drawWatered(float phase) {
  unsigned long t = millis() - celebrateStart;

  // How many LEDs are lit (rises from the bottom over WATER_RISE_MS)
  float rise = clamp01(t / (float)WATER_RISE_MS) * NUM_LEDS;

  // Fade out during the last few seconds
  float level = 1.0;
  if (t > CELEBRATE_MS - WATER_FADE_MS) {
    level = 1.0 - clamp01((t - (CELEBRATE_MS - WATER_FADE_MS)) / (float)WATER_FADE_MS);
  }

  float glow = 0.85 + 0.15 * cos(phase * 2 * PI);   // gentle shimmer, not a pulse
  for (int i = 0; i < NUM_LEDS; i++) {
    float lit = clamp01(rise - i);                   // soft leading edge
    uint8_t v = 150 * glow * lit * level;
    leds[i] = CHSV(96 + i * 2, 210, v);              // green, slightly brighter toward the top
  }

  // A few sparkles only while it is rising
  if (t < WATER_RISE_MS + 1000 && random8() < 80 && rise >= 1) {
    leds[random16((int)rise)] = CRGB(200, 255, 200);
  }
}

// 3 Soggy  deep blue drops sinking slowly from top to bottom. Bright for 10 s, then dims
void drawSoggy(float phase) {
  unsigned long soggyFor = millis() - soggyStart;
  float level = 1.0;
  if (soggyFor > SOGGY_BRIGHT_MS) {
    float t = clamp01((soggyFor - SOGGY_BRIGHT_MS) / (float)SOGGY_FADE_MS);
    level = 1.0 - t * (1.0 - SOGGY_MIN_LEVEL);
  }

  for (int i = 0; i < NUM_LEDS; i++) {
    float p = phase + (float)i / NUM_LEDS;          // peak moves from the top toward LED 0
    float wave = 0.5 + 0.5 * cos(p * 2 * PI);
    wave = wave * wave * wave;                       // sharper, heavier "drop"
    uint8_t v = (25 + 150 * wave) * level;
    leds[i] = CHSV(160, 255, v);                     // deep, saturated blue
  }
}

void setup() {
  FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(BRIGHTNESS);
  FastLED.setMaxPowerInVoltsAndMilliamps(5, 500);   // protect USB power
  Serial.begin(9600);

  readSensor();
  resetHistory();
  updateBaseState();
  bootTime = millis();
  processingEnd = bootTime + PROCESSING_MS;
  beatStart = bootTime;
  dryStart = bootTime;
  state = PROCESSING;
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

  // Beat → notify the laptop
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
  if (phase > 1) phase = 1;

  if (state == DRY) drawDry(phase);
  else if (state == GOOD) drawGood(phase);
  else if (state == WATERED) drawWatered(phase);
  else if (state == SOGGY) drawSoggy(phase);
  else drawProcessing(phase);

  FastLED.show();
  delay(10);
}
