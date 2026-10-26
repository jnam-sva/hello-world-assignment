// One object owns its position, size, and animation timing.
class DiscoPixel {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.baseSize = size;
    this.size = size;
    this.phase = x * 0.01 + y * 0.01;
  }

  update(cameraReady) {
    let cameraSize = this.baseSize;
    if (cameraReady) {
      // Mirror the sample horizontally, like looking in a mirror.
      let videoX = capture.width - 1 - floor((this.x / width) * capture.width);
      let videoY = floor((this.y / height) * capture.height);
      let offset = (videoY * capture.width + videoX) * 4;
      let r = capture.pixels[offset];
      let g = capture.pixels[offset + 1];
      let b = capture.pixels[offset + 2];
      // Camera pixels remain RGBA even when drawing in HSB mode.
      let brightness = (r + g + b) / 3;
      cameraSize = map(brightness, 0, 255, 20, 60);
    }

    // Different phases create a wave across the grid.
    let wave = sin(frameCount * 0.03 + this.phase) * 5;
    let targetSize = cameraSize + wave;
    // Move 10% of the remaining distance to avoid sudden jumps.
    this.size = lerp(this.size, targetSize, 0.1);
  }

  display() {
    let hue = (frameCount * 0.5 + this.phase * 40) % 360;
    let outerColor = color(hue, 85, 90);
    let innerColor = color((hue + 90) % 360, 75, 100);

    // Smaller circles cover the centers of larger circles.
    // This local diameter changes without overwriting this.size.
    for (let size = this.size; size > 0; size -= 1) {
      let amount = 1 - size / this.size;
      fill(lerpColor(outerColor, innerColor, amount));
      circle(this.x, this.y, size);
    }
  }
}

let pixelsGrid = [];
let spacing = 80;
let circleSize = 60;
let capture;
let cameraStream;
let paused = false;

function setup() {
  let canvas = createCanvas(400, 560);
  canvas.parent("canvas-container");
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100);
  noStroke();

  // The outer loop selects a row; the inner loop fills its columns.
  for (let y = spacing / 2; y < height; y += spacing) {
    for (let x = spacing / 2; x < width; x += spacing) {
      pixelsGrid.push(new DiscoPixel(x, y, circleSize));
    }
  }
  document.querySelector("#camera").addEventListener("click", toggleCamera);
  document.querySelector("#pause").addEventListener("click", () => {
    paused = !paused;
    document.querySelector("#pause").textContent = paused ? "Resume" : "Pause";
    if (paused) noLoop();
    else loop();
  });
}

function draw() {
  background(0);
  let cameraReady = false;
  if (capture && capture.elt.readyState >= 2) {
    capture.loadPixels();
    cameraReady = capture.pixels.length >= capture.width * capture.height * 4;
  }
  for (let pixel of pixelsGrid) {
    pixel.update(cameraReady);
    pixel.display();
  }
}

// Camera access starts only after a button click. Handle denial explicitly.
async function toggleCamera() {
  let button = document.querySelector("#camera");
  let status = document.querySelector("#status");
  if (cameraStream) {
    stopCamera();
    status.textContent = "Demo mode — color and size follow a wave.";
    return;
  }
  button.disabled = true;
  status.textContent = "Waiting for camera permission…";
  try {
    if (!navigator.mediaDevices) throw new Error("Camera unavailable");
    cameraStream = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
    // Wrap the stream in a p5 video element so loadPixels() works as taught.
    capture = createVideo([]);
    capture.size(160, 120);
    capture.hide();
    capture.elt.muted = true;
    capture.elt.setAttribute("playsinline", "");
    capture.elt.srcObject = cameraStream;
    await capture.elt.play();
    button.textContent = "Stop webcam";
    status.textContent = "Webcam mode — brighter areas make larger circles. Video stays in this browser.";
  } catch (error) {
    stopCamera();
    status.textContent = "Camera unavailable or permission denied. Demo continues; allow camera access and try again.";
  } finally {
    button.disabled = false;
  }
}

function stopCamera() {
  if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
  if (capture) capture.remove();
  capture = null;
  cameraStream = null;
  document.querySelector("#camera").textContent = "Start webcam";
}

window.addEventListener("pagehide", stopCamera);
