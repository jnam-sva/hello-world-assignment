# Week 6 — Disco Pixels

An in-progress custom pixel display inspired by a reference video of colorful, animated gradient spheres arranged on a black background.

## Current progress: Steps 3–8 — Animated gradient pixels

This version draws 35 animated gradient circles in 5 columns and 7 rows. It starts in demo mode. Click **Start webcam** to make each circle respond to the brightness of a corresponding video pixel. Click **Stop webcam** to release the camera and return to the demo. **Pause / Resume** controls drawing; pausing does not stop the camera.

### Step 1 — Understanding one object

We discussed a `DiscoPixel` class for one circle. Its constructor stores `x`, `y`, and `size`. Its `display()` method draws a circle using those properties. Each instance keeps its own values while sharing the drawing method.

### Step 2 — Creating many objects with nested loops

- Added `index.html`, `style.css`, and `sketch.js`.
- Created a 400 × 560 canvas with a black background.
- Used an outer loop for rows (`y`) and an inner loop for columns (`x`).
- Started each loop at 40, half of the 80-pixel spacing, to leave room around the circles.
- Created one `DiscoPixel` per grid position and stored it in the `pixelsGrid` array using `push()`.
- Used a separate loop in `draw()` to call each object's `display()` method.
- Added English comments explaining the class, array, nested loops, and drawing loop.

The first row has centers at `(40, 40)`, `(120, 40)`, `(200, 40)`, `(280, 40)`, and `(360, 40)`. The next row starts at `(40, 120)`. Each circle has a diameter of 60, leaving 20 pixels between neighboring circles.

Objects are created once in `setup()`. The drawing loop uses the existing objects rather than creating them again. The original Step 2 used `noLoop()` for a still image. Steps 3–8 enable continuous drawing.

## Assignment requirements

- [x] Nested loops to create a grid.
- [x] At least one class: `DiscoPixel`.
- [x] English comments explaining the main code.
- [x] Gradient colors inspired by the reference video.
- [x] Animated changes in color and size.
- [x] Webcam sampling for the custom pixel display.

## Run

Open the repository in VS Code and open `week6/index.html` with Live Server. Alternatively, run `python3 -m http.server 8000` from the repository root and visit `http://localhost:8000/week6/`.

This stage reuses the repository's existing p5.js library at `../week5/libraries/p5.min.js`. Keep the repository's folder structure intact. Demo mode requires no camera permission. Webcam mode requires permission and localhost or HTTPS. Camera frames are processed in the browser and are not uploaded. A denied or unavailable camera leaves the demo running.

## Learning experiments

- Change `circleSize` from 60 to 30: the circles shrink, but their centers stay in place.
- Change `spacing` from 80 to 100: fewer circles fit on the canvas.
- After the nested loops in `setup()`, add `pixelsGrid[0].size = 30;`: only the first circle becomes smaller.

## AI assistance and process

This assignment is being developed step by step with Codex. The student requested explanations before moving forward rather than receiving a completed project all at once.

Key requests (translated from Korean):

1. “Help me create a pixel display similar to my reference video, using nested loops, at least one class, English code comments, and an English progress README.”
2. “Create the week6 folder in my jnam-sva GitHub repository.”
3. “Explain it to me while making it; do not just make it.”
4. After the explanation of one `DiscoPixel`: “I understand. Let's move on.”

The current code is an assisted learning checkpoint, not a finished submission. The student subsequently requested explanations of Steps 3–8, followed by: “Combine the explained Steps 3–8 into actual code so we can see the movement and colors.”


## Steps 3–8 — Implementation progress

3. **Gradient:** `display()` draws large-to-small concentric circles. `lerpColor()` blends an edge color into a center color.
4. **Animation:** `baseSize` remembers the original diameter. `sin(frameCount * 0.03)` produces repeating movement.
5. **Wave:** `phase = x * 0.01 + y * 0.01` offsets the timing by position, so neighboring circles move at different points in the wave.
6. **Webcam:** each object converts its canvas coordinates to video coordinates, reads RGBA values with `(videoY * capture.width + videoX) * 4`, and averages RGB to estimate brightness. Horizontal sampling is mirrored. The full camera frame is mapped to the portrait grid, so proportions may appear stretched.
7. **Smoothing:** brightness maps to a diameter of 20–60, a wave adds −5 to +5, and `lerp(current, target, 0.1)` moves toward the target gradually. Demo mode uses the original diameter instead of camera brightness.
8. **Color:** HSB mode separates hue, saturation, and brightness. Hue changes with time and phase, wrapping with `% 360`. Video pixels still use RGBA. Direct HSB interpolation may show a color transition at the hue wrap; this is a simple learning implementation, not a precise recreation of the reference.

### Supporting controls

Camera permission is requested on a button click using `getUserMedia`, then its stream is attached to a p5 video element for `loadPixels()`. This extra setup allows permission failures to be handled explicitly. `Stop webcam` stops all tracks. The sketch checks that a video frame is ready before reading its pixels.

### Validation and remaining review

- JavaScript syntax checked with `node --check`.
- Grid, finite animation sizes, and dark/bright sample behavior checked with a simulated p5 environment.
- Live webcam permission and appearance still need review in the student's browser; automated checks do not verify real camera hardware.
- The 5 × 7 grid is intentionally coarse to keep the object and loop structure easy to understand.
