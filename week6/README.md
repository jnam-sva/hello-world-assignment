# Week 6 — Disco Pixels

An in-progress custom pixel display inspired by a reference video of colorful, animated gradient spheres arranged on a black background.

## Current progress: Step 2 — A grid of circles

This version draws 35 purple circles in 5 columns and 7 rows. Gradients, animation, and webcam input are planned but are not implemented yet.

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

Objects are created once in `setup()`. The drawing loop uses the existing objects rather than creating them again. This stage uses `noLoop()` because the image is static; animation will require continuous drawing later.

## Assignment requirements

- [x] Nested loops to create a grid.
- [x] At least one class: `DiscoPixel`.
- [x] English comments explaining the main code.
- [ ] Gradient colors inspired by the reference video.
- [ ] Animated changes in color and size.
- [ ] Webcam sampling for the custom pixel display.

## Run

Open the repository in VS Code and open `week6/index.html` with Live Server. Alternatively, run `python3 -m http.server 8000` from the repository root and visit `http://localhost:8000/week6/`.

This stage reuses the repository's existing p5.js library at `../week5/libraries/p5.min.js`. Keep the repository's folder structure intact. No camera permission is needed for this stage.

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

The current code is an assisted learning checkpoint, not a finished submission. The next step is to add a gradient inside each circle while keeping the same grid and class structure.
