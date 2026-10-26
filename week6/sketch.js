// Each instance stores the position and diameter of one circle.
class DiscoPixel {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
  }

  // All instances reuse this method with their own values.
  display() {
    fill(180, 100, 255);
    circle(this.x, this.y, this.size);
  }
}

// An array keeps all of our DiscoPixel objects together.
let pixelsGrid = [];
let spacing = 80;
let circleSize = 60;

function setup() {
  let canvas = createCanvas(400, 560);
  canvas.parent("canvas-container");
  noStroke();

  // The outer loop selects a row; the inner loop fills its columns.
  // Half-spacing keeps the centers away from the canvas edges.
  for (let y = spacing / 2; y < height; y += spacing) {
    for (let x = spacing / 2; x < width; x += spacing) {
      let pixel = new DiscoPixel(x, y, circleSize);
      pixelsGrid.push(pixel);
    }
  }

  // This step is a still image, so draw() only needs to run once.
  noLoop();
}

function draw() {
  background(0);

  // Visit every stored object and ask it to draw itself.
  for (let pixel of pixelsGrid) {
    pixel.display();
  }
}
