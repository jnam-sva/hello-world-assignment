// noprotect
// Plant Emotion — p5.js sketch where the plant makes small sounds in time with the Arduino's beat (4 states)
// The background is a ShaderGradient (plant-gradient.js) that changes with the state and swells on every beat.
// Works in Chrome only (uses Web Serial directly, no library)
// Do not delete the "// noprotect" line at the top. It stops the p5 editor from killing the serial read loop.
//
// Lines sent by the Arduino
//   B,state,moisture   beat signal → the plant makes a sound
//   C,state,moisture   the state just changed
//   S,state,moisture   status update (for the screen)
// States  0 = Dry   1 = Good   2 = Just watered   3 = Soggy (Too Much)   4 = Reading (sensor is reading)
//
// Sounds (all made with Web Audio, no sound files)
//   Dry            two sounds, 10 s each  'early' soft rustle when it first gets dry,
//                  'late' urgent crackling + sigh after it has stayed dry for 1 minute
//   Good           silent (calm = no action needed)
//   Just watered   bright notes climbing up, played ONCE when the state begins
//   Reading        silent, the background keeps the previous state
//   Too Much       dark and muffled, as if under water  low glug, heavy drops, slow pressure swell
// While the state is changing (TRANSITION_MS) the plant stays silent, then the new sound begins.

let actx = null;      // audio
let snd = null;       // the sound engine (see SOUND ENGINE below)
let audioOn = false;

let state = 1;
let moisture = 50;
let lastBeat = 0;     // time of the last beat (for the on-screen pulse)
let beatCount = 0;    // number of beats received (for checking)
let lastLine = '(none yet)';  // last line received from the Arduino (for checking)
let dryStart = 0;     // time the Dry state started
let quietUntil = 0;   // no sound until this time (while the state is changing)
let __pe = { reading: false, volumeNode: null, volumeSlider: null };   // new in this version

// The beat values must match the BEAT_ values in the Arduino code.
const TONE = 'A4';      // ★ base pitch for the Good notes (e.g. C4, E4, G4)
const DRY_ESCALATE_MS = 120000;  // Dry gets more urgent over 2 minutes (same as Arduino)
const PE_BEAT_DRY_START = 3000;  // Dry beat starts slow...
const PE_BEAT_DRY_END = 1000;    // ...and gets faster (same as Arduino)
const PE_START_VOLUME = 60;      // ★ starting volume (0~100)
const TRANSITION_MS = 2500;      // ★ silence while the state changes (about as long as the gradient takes to glide)
const DRY_LATE_AT_MS = 60000;    // ★ how long it must stay dry before the urgent 'late' sound (1 minute)
const DRY_SOUND_MS = 10000;      // ★ each Dry sound plays for this long, then the plant goes quiet (10 seconds)

const MOODS = [
  { name: 'Thirsty…',    beat: 3000, color: [120, 75, 40] },   // dry leaves rustle, long silences
  { name: 'Comfortable', beat: 3000, color: [170, 210, 60] },  // silent
  { name: 'Thank you!',  beat: 600,  color: [60, 230, 190] },  // bright rising notes, once
  { name: 'Drowning…',   beat: 3500, color: [80, 105, 125] },  // low muffled glug, heavy water drops
];

// Note name like 'A4' → frequency (Hz)
function noteToFreq(name) {
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semi = base[name[0]];
  let rest = name.slice(1);
  if (rest[0] === '#') { semi += 1; rest = rest.slice(1); }
  if (rest[0] === 'b') { semi -= 1; rest = rest.slice(1); }
  let midi = (parseInt(rest) + 1) * 12 + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ===== SOUND ENGINE START =====
// Every sound is made with Web Audio (no sound files).
// makeSounds(ctx, out) returns one function per state. Each takes the start time t.
function makeSounds(ctx, out, baseFreq) {
  const R = Math.random;
  const rnd = (a, b) => a + R() * (b - a);

  // one last volume knob for everything, used to fade out while the state changes
  const fader = ctx.createGain();
  fader.gain.value = 1;
  fader.connect(out);
  out = fader;

  // master volume + a soft room (reverb) so everything sits in one space
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(out);
  const room = ctx.createConvolver();
  room.buffer = makeRoom(2.4, 2.5);
  const roomLevel = ctx.createGain();
  roomLevel.gain.value = 0.3;
  master.connect(room);
  room.connect(roomLevel);
  roomLevel.connect(out);

  function makeRoom(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (R() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // "underwater" bus for Too Much  everything here is cut to the lows (muffled)
  // and sent into a longer, darker room, as if heard from under water
  const deep = ctx.createGain();
  deep.gain.value = 0.65;
  const deepLP1 = ctx.createBiquadFilter();
  deepLP1.type = 'lowpass'; deepLP1.frequency.value = 280; deepLP1.Q.value = 0.5;
  const deepLP2 = ctx.createBiquadFilter();
  deepLP2.type = 'lowpass'; deepLP2.frequency.value = 380; deepLP2.Q.value = 0.5;
  deep.connect(deepLP1); deepLP1.connect(deepLP2);
  deepLP2.connect(out);
  const deepRoom = ctx.createConvolver();
  deepRoom.buffer = makeRoom(3.5, 1.8);
  const deepRoomTone = ctx.createBiquadFilter();
  deepRoomTone.type = 'lowpass'; deepRoomTone.frequency.value = 300;
  const deepRoomLevel = ctx.createGain();
  deepRoomLevel.gain.value = 0.45;
  deepLP2.connect(deepRoom); deepRoom.connect(deepRoomTone); deepRoomTone.connect(deepRoomLevel); deepRoomLevel.connect(out);

  // 2 seconds of white noise, reused by every rustle
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = R() * 2 - 1;

  function noiseSource(t, dur) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.start(t, rnd(0, 1.5), dur + 0.05);
    return s;
  }

  // ---------- building blocks ----------

  // a tiny click of filtered noise (one fragment of a leaf)
  function grain(t, dur, freq, q, gain) {
    const s = noiseSource(t, dur);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
  }

  // many grains scattered in time → a rustle
  function rustle(t, { grains, spread, freq, q, gain, minDur, maxDur }) {
    for (let i = 0; i < grains; i++) {
      const tt = t + Math.pow(R(), 1.6) * spread;   // denser at the start, thinning out
      grain(tt, rnd(minDur, maxDur), rnd(freq * 0.6, freq * 1.6), q, gain * rnd(0.25, 1));
    }
  }

  // a clear, soft bell-like note (sine + a quiet overtone)
  function note(t, freq, dur, gain) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 3200;
    [[1, 1], [2, 0.18], [3, 0.05]].forEach(([mult, amt]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * mult;
      const og = ctx.createGain();
      og.gain.value = amt;
      o.connect(og); og.connect(f);
      o.start(t); o.stop(t + dur + 0.05);
    });
    f.connect(g); g.connect(master);
  }

  // a low round blob whose pitch bends → one part of a glug
  function blob(t, f0, f1, dur, gain, dest = master) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // "꿀렁"  a deep gulp that rises then a heavier one that sinks, with a dull thump under it
  function glug(t, gain) {
    blob(t, 58, 100, 0.2, gain, deep);
    blob(t + 0.16, 100, 40, 0.42, gain * 1.15, deep);
    const s = noiseSource(t, 0.35);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 120;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain * 0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    s.connect(lp); lp.connect(g); g.connect(deep);
  }

  // a slow, low pressure swell, like the weight of water around the roots
  function murk(t, gain) {
    const dur = 2.2;
    const s = noiseSource(t, dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 90; lp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(lp); lp.connect(g); g.connect(deep);
  }

  // a water drop: a short sine whose pitch jumps up ("plop"), heavy = lower and more muffled
  function drop(t, gain, heavy) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    const lo = heavy ? rnd(95, 130) : rnd(700, 950);
    const hi = heavy ? lo * 2.0 : lo * 2.2;
    o.frequency.setValueAtTime(lo, t);
    o.frequency.exponentialRampToValueAtTime(hi, t + (heavy ? 0.11 : 0.05));
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = heavy ? 450 : 4000;
    const g = ctx.createGain();
    const dur = heavy ? 0.4 : 0.12;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + (heavy ? 0.012 : 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(heavy ? deep : master);
    o.start(t); o.stop(t + dur + 0.05);
    if (heavy) blob(t, 55, 35, 0.25, gain * 0.6, deep);   // weight underneath
  }

  // A major pentatonic from the base pitch, so any notes sound good together
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
  const pitch = (step, octave = 0) => baseFreq * Math.pow(2, (SCALE[step] + 12 * octave) / 12);

  // ---------- one function per state ----------
  let goodQuietUntil = 0;
  let wateredStep = 0;

  return {
    // Fade everything out now (sounds still ringing included) and come back at time `back`
    hush(now, back) {
      const g = fader.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0.0001, now + 0.4);
      g.setValueAtTime(0.0001, back);
      g.linearRampToValueAtTime(1, back + 0.05);
    },

    // Dry has two stages
    //   'early'  a soft, sparse rustle of dry leaves
    //   'late'   dense crackling, snapping leaves and a weak falling sigh (urgent)
    dry(t, stage = 'early') {
      const late = stage === 'late';
      if (!late && R() < 0.2) return;                  // early sometimes skips a beat

      // rustle of dry leaves
      rustle(t + rnd(0, 0.3), {
        grains: Math.floor(late ? rnd(54, 66) : rnd(18, 30)),
        spread: late ? rnd(0.65, 0.85) : rnd(0.25, 0.45),
        freq: late ? 2500 : 3400, q: 2.2, gain: late ? 1.5 : 0.6,
        minDur: 0.005, maxDur: late ? 0.048 : 0.025 });

      if (!late) return;

      // sharp snaps of brittle leaves
      const cracks = Math.floor(rnd(3, 5));
      for (let i = 0; i < cracks; i++) {
        grain(t + rnd(0.05, 0.8), rnd(0.008, 0.02), rnd(1200, 2200), 6, 1.15);
      }

      // a weak falling sigh  the plant is running out of strength
      if (R() < 0.85) {
        const st = t + rnd(0.3, 0.6);
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(baseFreq * 1.5, st);
        o.frequency.exponentialRampToValueAtTime(baseFreq * 0.75, st + 1.2);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.21, st + 0.15);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 1.3);
        o.connect(g); g.connect(master);
        o.start(st); o.stop(st + 1.4);
      }
    },

    // Good  a short phrase of two or three clear soft notes, light leaves now and then
    good(t) {
      if (t >= goodQuietUntil && R() < 0.35) {
        const count = R() < 0.5 ? 2 : 3;
        let step = Math.floor(rnd(0, 4));
        let tt = t;
        for (let i = 0; i < count; i++) {
          note(tt, pitch(step), rnd(1.4, 2.0), 0.16);
          step = Math.min(SCALE.length - 1, Math.max(0, step + (R() < 0.6 ? 1 : -1) * (R() < 0.5 ? 1 : 2)));
          tt += rnd(0.22, 0.38);
        }
        goodQuietUntil = tt + rnd(1.8, 3.2);   // breathing room before the next phrase
      }
      if (R() < 0.18) {
        rustle(t + rnd(0, 0.4), { grains: Math.floor(rnd(6, 11)), spread: rnd(0.4, 0.7),
          freq: 2000, q: 0.8, gain: 0.07, minDur: 0.015, maxDur: 0.05 });
      }
    },

    // Just watered  quick bright notes climbing up, with small sparkling drops
    watered(t) {
      note(t, pitch(wateredStep % SCALE.length, 1), 0.5, 0.14);
      wateredStep++;
      if (R() < 0.25) drop(t + rnd(0.02, 0.15), 0.08, false);
    },

    // Just watered (new)  the climbing notes played once, with small sparkling drops
    chime(t) {
      [0, 2, 4, 5, 7].forEach((step, i) => {
        note(t + i * 0.13, pitch(step, 1), 1.6 - i * 0.1, 0.13);
      });
      for (let i = 0; i < 3; i++) drop(t + rnd(0.15, 0.9), 0.06, false);
    },

    // Too Much  dark and muffled, as if under water  a low glug, heavy drops, a slow pressure swell
    soggy(t) {
      murk(t, 0.35);
      if (R() < 0.85) glug(t + 0.1, 0.4);
      const drops = R() < 0.3 ? 2 : R() < 0.75 ? 1 : 0;
      for (let i = 0; i < drops; i++) drop(t + rnd(0.7, 1.9), 0.3, true);
    },
  };
}
// ===== SOUND ENGINE END =====

// Set up audio (once, when the button is pressed)
function startAudio() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    __pe.volumeNode = actx.createGain();
    __pe.volumeNode.connect(actx.destination);
    peApplyVolume();
    snd = makeSounds(actx, __pe.volumeNode, noteToFreq(TONE));
  }
  actx.resume();
  audioOn = true;
}

// Slider 0~100 → volume (squared so the low end feels natural)
function peApplyVolume() {
  if (!__pe.volumeNode || !__pe.volumeSlider) return;
  let v = __pe.volumeSlider.value() / 100;
  __pe.volumeNode.gain.setTargetAtTime(v * v, actx.currentTime, 0.05);
}

// ---------- Serial port (using Chrome's built-in Web Serial directly) ----------
let serialPort = null;
let serialReader = null;
let serialStatus = 'Not connected';
let lineBuffer = '';
let incoming = [];        // received lines pile up here
let bytesIn = 0;          // number of characters received (for checking)
let decoder = new TextDecoder();

// Pick and open a port  must be called from inside a button click (browser rule)
async function openSerial() {
  if (!('serial' in navigator)) {
    serialStatus = 'This browser does not support serial ports (use Chrome)';
    return;
  }
  try {
    let picked = await navigator.serial.requestPort();
    await closeSerial();
    serialPort = picked;
    await serialPort.open({ baudRate: 9600 });
    try { await serialPort.setSignals({ dataTerminalReady: true, requestToSend: true }); } catch (e) {}
    let info = serialPort.getInfo();
    let id = info.usbVendorId ? 'USB ' + info.usbVendorId.toString(16) : 'not a USB device';
    serialStatus = 'Connected (' + id + ')';
    lastLine = '(waiting for Arduino to restart…)';
    readLoop();
  } catch (e) {
    serialStatus = 'Connection failed  ' + e.message;
  }
}

async function closeSerial() {
  try { if (serialReader) await serialReader.cancel(); } catch (e) {}
  try { if (serialPort) await serialPort.close(); } catch (e) {}
  serialReader = null;
  serialPort = null;
}

// Read once, then call itself again (avoids the p5 editor's infinite-loop check)
function readLoop() {
  if (!serialPort || !serialPort.readable) return;
  serialReader = serialPort.readable.getReader();
  readOnce();
}

function readOnce() {
  if (!serialReader) return;
  serialReader.read().then(({ value, done }) => {
    if (done) {
      serialReader.releaseLock();
      return;
    }
    bytesIn += value.length;
    lineBuffer += decoder.decode(value, { stream: true });
    let lines = lineBuffer.split('\n');
    lineBuffer = lines.pop();            // keep the unfinished line for later
    for (let l of lines) incoming.push(l);
    readOnce();
  }).catch((e) => {
    serialStatus = 'Read error  ' + e.message;
  });
}

// ---------- p5 ----------
let notesPlayed = 0;      // number of beats the sound responded to (for checking)

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  // the p5 canvas sits on top of the gradient with a transparent background
  cnv.position(0, 0);
  cnv.style('position', 'fixed');
  cnv.style('z-index', '1');
  cnv.style('pointer-events', 'none');

  // start the ShaderGradient background
  if (window.PlantGradient) {
    PlantGradient.mount();
    PlantGradient.setState(state);
  }

  let btn = createButton('Connect Arduino + turn on sound');
  btn.position(20, 20);
  btn.style('z-index', '2');
  btn.mousePressed(connect);

  // volume slider (Aria's feedback)
  try {
    let label = createSpan('Volume');
    label.position(20, 58);
    label.style('z-index', '2');
    label.style('color', '#eee');
    label.style('font-family', 'sans-serif');
    label.style('font-size', '13px');
    __pe.volumeSlider = createSlider(0, 100, PE_START_VOLUME);
    __pe.volumeSlider.position(80, 56);
    __pe.volumeSlider.style('z-index', '2');
    __pe.volumeSlider.input(peApplyVolume);
  } catch (e) {
    console.log('volume slider failed', e);
  }

  // test without the Arduino  press 0 1 2 3 to change state, 4 for Reading, space for a beat
}

function connect() {
  startAudio();
  openSerial();          // the port picker appears
}

// One Arduino beat → the plant makes a sound for its state
function playBeat() {
  if (!audioOn || !actx) return;
  if (__pe.reading) return;              // the sensor is reading  stay silent
  if (millis() < quietUntil) return;     // the state is still changing  stay silent
  if (actx.state !== 'running') actx.resume();
  let t = actx.currentTime + 0.02;
  if (state === 0) {
    let stage = peDryStage();
    if (stage) { snd.dry(t, stage); notesPlayed++; }   // null = quiet between the two sounds
  }
  else if (state === 3) { snd.soggy(t); notesPlayed++; }
  // Good (1) is silent, Just watered (2) plays its chime once in changeState
}

// Which Dry sound to play right now
//   first 10 s of Dry → 'early'
//   10 s starting at DRY_LATE_AT_MS → 'late'
//   any other time → null (quiet)
function peDryStage() {
  let elapsed = millis() - dryStart;
  if (elapsed < DRY_SOUND_MS) return 'early';
  if (elapsed >= DRY_LATE_AT_MS && elapsed < DRY_LATE_AT_MS + DRY_SOUND_MS) return 'late';
  return null;
}

// How far into the Dry state we are (0 → 1)
function peDryEscalation() {
  return constrain((millis() - dryStart) / DRY_ESCALATE_MS, 0, 1);
}

// Reading (4) is kept apart from the plant states, so the background stays as it was
function peSetReading(on) {
  if (on === __pe.reading) return;
  __pe.reading = on;
  if (on && snd) snd.hush(actx.currentTime, actx.currentTime + 0.5);   // fade out what is ringing
}

function changeState(s) {
  if (s === state) return;
  state = s;

  if (s === 2) {
    // Just watered  play the chime once, right away (it comes after Reading, which is already silent)
    quietUntil = 0;
    if (audioOn && snd) {
      if (actx.state !== 'running') actx.resume();
      snd.chime(actx.currentTime + 0.02);
      notesPlayed++;
    }
  } else {
    // silence while changing  fade out what is still ringing, skip beats until the transition ends
    quietUntil = millis() + TRANSITION_MS;
    if (snd) snd.hush(actx.currentTime, actx.currentTime + TRANSITION_MS / 1000);
  }
  if (s === 0) dryStart = millis();      // same clock as the Arduino

  if (window.PlantGradient) PlantGradient.setState(state);   // the gradient glides to the new state
}

function readSerial() {
  let batch = incoming.splice(0, incoming.length);   // take all queued lines at once
  for (let raw of batch) {
    let line = raw.trim();
    if (line.length === 0) continue;
    lastLine = line;
    let parts = line.split(',');
    if (parts.length === 3) {
      let s = int(parts[1]);
      let mo = int(parts[2]);
      if (s === 4) peSetReading(true);
      else if (!isNaN(s) && s >= 0 && s <= 3) { peSetReading(false); changeState(s); }
      if (!isNaN(mo)) moisture = mo;
      if (parts[0] === 'B') {
        lastBeat = millis();
        beatCount++;
        playBeat();
      }
    }
  }
}

// keyboard test without the Arduino
function keyPressed() {
  if (key >= '0' && key <= '3') { if (!audioOn) startAudio(); peSetReading(false); changeState(int(key)); }
  if (key === '4') { if (!audioOn) startAudio(); peSetReading(true); }
  if (key === ' ') {
    if (!audioOn) startAudio();
    lastBeat = millis(); beatCount++; playBeat();
  }
}

function draw() {
  readSerial();

  let m = MOODS[state];
  clear();   // transparent, so the gradient shows through

  // The gradient breathes on each beat (same rhythm as the LEDs)
  // Dry's beat speeds up like the Arduino's, so the breathing stays in sync with the LEDs
  let beatLen = state === 0 ? lerp(PE_BEAT_DRY_START, PE_BEAT_DRY_END, peDryEscalation()) : m.beat;
  let t = constrain((millis() - lastBeat) / beatLen, 0, 1);
  let pulse;
  if (__pe.reading) pulse = 0;                                          // Reading = no movement
  else if (state === 2) pulse = pow(1 - t, 2);                          // bouncy pops
  else if (state === 0) pulse = 0.35 * (0.5 - 0.5 * cos(t * TWO_PI));   // very subtle
  else if (state === 3) pulse = 0.4 * (0.5 - 0.5 * cos(t * TWO_PI));    // sluggish
  else pulse = 0;                                                       // Comfortable = no movement
  if (window.PlantGradient) PlantGradient.setPulse(pulse);

  // When soggy, the text sinks slightly downward
  let y = height / 2 + (state === 3 ? 25 * pulse : 0);

  // soft shadow so the text stays readable on bright gradients
  drawingContext.shadowColor = 'rgba(0,0,0,0.45)';
  drawingContext.shadowBlur = 16;

  noStroke();
  fill(245);
  textAlign(CENTER, CENTER);
  // only the moisture reading in the middle (the gradient and sound show the state)
  textSize(64);
  text(__pe.reading ? '…' : moisture + '%', width / 2, y);
  textSize(12);
  fill(235);
  text('SOIL MOISTURE', width / 2, y + 48);
  if (__pe.reading) text('READING…', width / 2, y - 52);             // the sensor is reading
  else if (millis() < quietUntil) text('CHANGING…', width / 2, y - 52);   // while the state is changing

  // Status display (for checking)
  textSize(14);
  fill(225);
  let audioText = !actx ? 'Sound off (press the button)' : 'Audio ' + actx.state + ' · beats played ' + notesPlayed;
  text(serialStatus + '   ·   ' + audioText + '   ·   beats received ' + beatCount, width / 2, height - 50);
  text('characters received ' + bytesIn + '   ·   last line received  ' + lastLine, width / 2, height - 25);
  drawingContext.shadowBlur = 0;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}