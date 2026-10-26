# Week 6 — Disco Pixels

Disco Pixels is an interactive p5.js artwork made of 35 colorful circles. Without a camera, the circles pulse in a wave and gradually change color. With a webcam, they respond to light and movement: brighter areas create larger circles, and moving areas produce a burst of size and color.

## Idea and visual reference

The starting point was a reference video showing rows of gradient spheres moving against a black background. The goal was to explore that visual style while practicing nested loops and classes, then turn it into a webcam-based pixel display.

Each circle represents one sampled point in the camera image. Together, the circles create an abstract interpretation of the scene rather than a detailed video image.

## How to run it

1. Download or clone this repository and keep its folder structure intact.
2. Open `week6/index.html` with VS Code Live Server.
3. The artwork starts immediately in demo mode.
4. Click **Start webcam**, allow camera access, and move a hand in front of the camera.

Alternatively, run this command from the repository root:

```sh
python3 -m http.server 8000
```

Then open [http://localhost:8000/week6/](http://localhost:8000/week6/).

The project uses the existing p5.js library in `week5/libraries/p5.min.js`. Webcam access requires localhost or HTTPS. Video is processed locally in the browser and is not uploaded. If camera access is unavailable or denied, the demo keeps running.

| Control | What it does |
| --- | --- |
| Start webcam | Connects the camera so brightness and movement affect the circles. |
| Stop webcam | Releases the camera and returns to the animated demo. |
| Pause / Resume | Freezes or resumes drawing. Pausing does not turn off the camera. |

## Development process

### 1. Start with one circle

The first step was understanding how a class works. A `DiscoPixel` object stores the position and diameter of one circle. Its `display()` method draws that circle.

Two circles can use the same drawing method while keeping different positions and sizes. This became the basic structure for the whole artwork.

### 2. Build a grid with nested loops

Next, one circle became a grid of 5 columns and 7 rows on a 400 × 560 canvas. The outer loop chooses a row, and the inner loop places a circle in each column.

```javascript
for (let y = spacing / 2; y < height; y += spacing) {
  for (let x = spacing / 2; x < width; x += spacing) {
    pixelsGrid.push(new DiscoPixel(x, y, circleSize));
  }
}
```

The objects are created once in `setup()` and stored in the `pixelsGrid` array. In `draw()`, another loop visits each object to update and display it. The first working version was a still grid of purple circles.

### 3. Replace flat color with a gradient

To give the circles depth, `display()` draws a large circle and layers progressively smaller circles over its center. `lerpColor()` gradually blends the outer color into the inner color.

Only the drawing method changed; the grid and object positions stayed the same. This demonstrated how a shared class method can change the appearance of every circle.

### 4. Add breathing motion and a traveling wave

A sine wave makes the diameter grow and shrink smoothly. Each circle also stores a `phase` value based on its position. This offsets the timing so neighboring circles do not all expand at once.

The result is a wave moving across the grid. `baseSize` keeps the original diameter, while `size` stores the current animated diameter.

### 5. Connect webcam brightness to size

Each circle finds the corresponding position in the camera image and reads that pixel's red, green, and blue values. Their average provides a simple brightness estimate.

Dark samples produce smaller circles; bright samples produce larger circles. The samples are mirrored horizontally so interactions feel like looking in a mirror. The time-based wave is added to this camera-controlled size.

### 6. Smooth the changes and animate the colors

Instead of jumping immediately to a new diameter, `lerp()` moves the current size partway toward its target on each frame. This makes the response softer.

Colors use HSB mode: hue chooses the color, saturation controls its intensity, and brightness controls how light it is. Hue changes with time and position, so the gradient colors flow across the grid. The camera data itself remains RGBA.

### 7. Make movement feel more expressive

After the first combined version, the requested refinement was a stronger response to movement. Brightness alone could change the size, but did not create a pronounced burst when someone moved.

Each object now stores its previous RGB sample in `previousColor`. Comparing it with the current sample produces a `motion` value. Small differences are ignored to reduce camera noise.

When motion is detected, the circle expands quickly, shifts hue, and gains a less saturated center. The effect fades gradually after movement stops. Strong bursts intentionally allow neighboring circles to overlap.

This is a simple image-change detector: a lighting change can also trigger it. It does not recognize hands or track a body.

## How the pieces work together

On every animation frame:

1. Read the camera pixels if a video frame is available.
2. Ask each `DiscoPixel` to update its size using brightness, motion, and its wave timing.
3. Smooth the size change.
4. Draw its layered gradient circles with the current colors.

Without a camera, the same objects use their original sizes and the animated wave instead.

| File | Purpose |
| --- | --- |
| `index.html` | Loads the artwork and provides the camera and pause buttons. |
| `style.css` | Styles the page, controls, and canvas layout. |
| `sketch.js` | Contains the class, grid creation, animation, and webcam interaction. |

## Assignment requirements

- **Nested loops:** create the rows and columns of the grid in `setup()`.
- **At least one class:** `DiscoPixel` stores each circle's data and provides `update()` and `display()` methods.
- **English comments:** explain the main calculations and the purpose of each major section.
- **Custom pixel display:** camera samples become animated gradient circles with an individual visual style.

## Checks and limitations

JavaScript syntax and simulated cases for grid positions, brightness response, motion bursts, decay, and reset behavior were checked. These checks do not replace testing camera permission and visual performance in a real browser.

The 5 × 7 grid is intentionally coarse. The full camera image is mapped into a portrait canvas, so proportions can appear stretched. The gradient is an approximation of the reference, and HSB hue wrapping can produce noticeable color transitions.

## AI-assisted learning

The project was developed with Codex through explanations followed by implementation. The learning discussion covered classes and instances, `fill()`, nested loops, gradients, sine waves, camera pixels, interpolation, and HSB colors. The student requested step-by-step explanations before combining the features.

Key prompts, translated from Korean:

- “Help me create a pixel display similar to my reference video, using nested loops, at least one class, English code comments, and an English progress README.”
- “Explain it to me while making it; do not just make it.”
- “Combine the explained Steps 3–8 into actual code so we can see the movement and colors.”
- “Make the circles react more dramatically to movement when the webcam is on.”
- “Write the README so readers can easily understand the process, and remove the step label from the artwork.”
