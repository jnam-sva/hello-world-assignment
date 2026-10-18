# Week 5 — Virtual Creature: PlantCat

A black cat with plants growing on its head and tail, and shiny eyes.

## Progress

- [x] Lesson 1 — Sprite + `Creature` class (`constructor`, `show()`)
- [ ] Lesson 2 — Movement
  - [x] 2-1 `move()` with speed, wrap around the screen
  - [x] 2-2 Walking animation (two leg frames `LEGS_A` / `LEGS_B`, switched by distance walked)
  - [x] 2-3 Turning around (flip the sprite with `dir` and `screenX()`)
- [ ] Lesson 3 — States
  - [x] 3-1 `energy` + `state`, `update()`, `sleep()` / `wakeUp()`, closed-eye sprite, energy bar
  - [x] 3-1b Default state is `idle` (standing and breathing); idle ↔ walk on a random timer
  - [x] 3-2 Solo activities when left alone: `groom` (sit and groom), `knead` (make biscuits), `curl` (curl up and nap), picked at random by `chooseNext()`
  - [x] 3-2b Plants stay fresh at first and wilt after 1 minute without petting (`aloneTime`, `WILT_TIME`); petting resets it
  - [ ] 3-3 `hunger` + `eat()`
- [ ] Lesson 4 — Interaction with mouse/keyboard
  - [x] 4-1 Notice the mouse → pause → slowly approach
  - [x] 4-2 Stroke the cat (move the mouse back and forth over it) → happy eyes, purring, hearts
  - [x] 4-3 Long petting grows the head sprout (up to 3 stages)
  - [x] 4-4 Pupils follow the mouse (left/right, up/down)
  - [x] 4-5 Mouse approaching fast → step back; approaching slowly → wait
- [x] Environment — `World` class: meadow (reference-style grass on a pale sage base), day/night shown by sky color only (about 2 minutes per day, press T to skip ahead)
- [ ] Lesson 5 — Serial communication with Arduino

## Prompts used

1. "Explain everything step by step from the beginning, so I can understand every line. My goal is to make a virtual creature. Run the project as if you're teaching a student who is learning the concept of a class for the first time. Appearance: a black cat with plant on its head and tail. Its eyes are shiny."
2. "Make the head and body shape similar to this cat." (with a reference image) — then many small follow-ups: slimmer cheeks, thicker/longer tail, whiskers, white socks, rounder rump, smoother legs.
3. "Make the whiskers thinner." — led to drawing whiskers with `line()` in a separate `drawWhiskers()` method, because a sprite cell can't be thinner than `PX`.
4. "Let's move on to movement." — split into small steps: 2-1 move, 2-2 walk cycle, 2-3 turn around.
5. "Make the cat walk more slowly and naturally, using its legs." — 4-frame cycle (A → B → A → C), lifted paws, slower decimal speeds drawn with `floor()`.
6. "Let's make states." — started with one state pair (walk ↔ sleep) driven by an `energy` number, before adding hunger and `eat()`.
7. "The default state is standing still and breathing." — added an `idle` state, a `timer` for idle ↔ walk, and a 1px breathing offset applied only to the body rows.
8. "When idle, keep the tail up with a question-mark curl at the tip; the root stays still and only the tip sways slowly." — redrew the tail as a `?` hook, limited sway to rows above `TAIL_BEND_ROW`, then rounded the hook by cutting corner pixels.
9. "Move the sprout to the tail tip. When idle, make the tip flick slowly, and have the sprout follow one beat later." — sprout now hangs from the hook end; `flickAt(f)` gives a flick-then-rest rhythm, and the leaves read `flickAt(frameCount - SPROUT_LAG)` for a delayed follow-through.
10. "Make the tail change naturally between stopping and walking." — added an in-between `LEAN_TAIL`, a `tailCurl` value eased with `lerp()`, and `tailStage()` to pick straight / lean / question-mark; sprites are now assembled from body + eyes + legs each frame.
11. "The idle tail looks a bit short." — raised the question-mark arc by one row and let the hook hang two rows lower.
12. "Add a new state: if left alone, it curls up to sleep or its sprout droops." — added `loneliness`, a `lonely` state (wilted, drooping sprout) and a `curl` state (new curled-up sprite), plus `pet()` on mouse click.
13. "The tail droops too much." — kept the taller tail but shortened the hook back to 3 rows so the tip curls up instead of hanging.
14. "Make the raised tail longer." — added 3 empty rows on top of every sprite, lengthened the straight and leaning tails, and shifted every hard-coded row number by 3.
15. "When left alone: 1. curl up and sleep, 2. sit and groom, 3. make biscuits." — new `GROOM_SPRITE`, `KNEAD_A/B` legs, and `chooseNext()` using `random([...])`.
16. "After 1 minute alone the plant droops, but keep it fresh at first." — replaced the `lonely` state with an `aloneTime` counter; `isWilted()` drives the drooping sprout and wilted leaf color.
17. "When the mouse comes close, pause for a moment and then slowly walk toward it; react happily when petted; let the sprout grow little by little with long petting." — added `notice` / `approach` / `happy` states, `mouseIsPressed` petting, floating hearts, `SPROUT_STAGES` + `growSprout()`, and left/right flipping with `screenX()`.
18. "Show the tongue while grooming." — added a tongue color `t` and a `GROOM_LICK_SPRITE` that is shown only while the head is lowered (`lickOffset() > 0`).
19. "Make the eyes follow the mouse; if the mouse approaches too fast, step back; if it approaches slowly, wait patiently." — `lookEyes()` moves a 1-cell pupil inside each 2×2 eye; `measureMouseSpeed()` uses `pmouseX/pmouseY` so only the mouse’s own movement counts; new `retreat` and `wait` states.
20. "Make the pupils white instead of black." — the pupil cell is now `w`; it doubles as the eye shine, so the separate shine cell was removed.
21. "Remove the status bars under the cats." — deleted `drawEnergyBar()`; energy and aloneTime still work, they are just not drawn.
22. "Let's set up the environment." (chose: meadow + day/night) — new `World` class: sky color keyframes with `lerpColor`, stars, pixel sun/moon, grass generated once in the constructor, night shading; cats get `update(world)` / `show(world)` and are sleepier at night. Press T to skip time.
23. "Lower the grass." / "Lower the ground." — grass blades 1–2 cells, ground line moved from y 190 to 212 (cats follow `GROUND_Y`).
24. "Make the grass a bit longer than the first version and more natural." — 2–7 cell blades shaped with `noise()` clumps, gaps, darker bases, leaning tips, and a 1px wind sway.
25. "Put the cats behind the grass." — all grass now draws in `showFront()`, after the cats.
26. "Make the grass height random so empty spaces show." — each blade gets `random(1, 8)` cells, and 18% of the time 1–4 columns are skipped to leave gaps.
27. (grass reference image) — rebuilt the meadow: a 1-cell grass baseline, mostly 1–3 cell single-color blades with diagonal tips, a few tall olive blades, and olive seedlings with two uneven leaves in small groups.
28. "Make the ground thin and make the area under the grass a white background." — removed the dark ground band; below `GROUND_Y` is now `#fafafa`, and name labels are dark.
29. "Remove the sun; show the passage of time only with the background color." — removed sun, moon and stars; time is shown by the sky color (and darker grass at night).
30. "Other options for the color under the grass?" — chose pale sage `#e6ecd9` (same color family as the grass).
31. "Change petting to: hover over the cat and move the mouse back and forth." — `checkStroke()` counts left/right direction changes over the cat (via `pmouseX`); strokes over the cat no longer count as the mouse approaching fast.
32. "Make the grass greener." — shifted all three grass colors away from yellow toward green (hue ~80° → ~110–145°) and raised saturation.
33. "Make the cat move more lively." — added blinking, occasional ear twitches, a 1px walking bob, ease-in/ease-out walking speed (`moveSpeed` with `lerp`), and a tail-tip wiggle while walking.
34. "The face looks too thin when the cat sleeps." — widened the curled-up head from 7 to 9 inner cells with fuller cheeks and a rounder chin.
35. "Make the tail and body move together while walking." — `walkRock(col)` makes the front (head/chest) and back (rump/tail) bob in turn with the leg frames; the straight tail swings once per full step cycle (`sin(step * PI / STRIDE)`).
36. "Still only the legs move while walking." — the motion existed but was too small; made the body seesaw smooth and 0–2px (`sin(step * PI / STRIDE)`), and the tail swing up to 6px.
37. "Make the walking tail feel slightly curved instead of perfectly vertical." — replaced the straight walking tail with `WALK_TAIL`, a gentle arc whose steps shorten toward the tip (7 → 4 → 3 → 1 rows).
38. "Make the eyes thinner when sleeping." — closed eyes are now 1px curved lines (‿) drawn by `drawSleepyEyes()` instead of 3px cells; used for sleep, curl, knead and blinking.
39. "The tail is still too stiff when walking." — `WALK_TAIL` is now a soft S curve, and the walking sway is a wave that travels from root to tip (`sin(step * PI / STRIDE - delay)`), so it bends like a whip instead of tilting like a stick.
40. "Moss is less cautious than Fern — it should not get startled when the mouse approaches." — added a `timid` personality property (default true); Moss sets `cat1.timid = false`, so it never steps back and only pauses briefly when it notices the mouse.
41. "It does not seem applied." — the code was there, but Moss still paused with "!" and stopped to "wait" at normal mouse speeds, which looked cautious. Bold cats now skip all speed reactions and walk straight over without the "!" pause.
42. "Moss still backs away." — simulated 300 random approaches: Moss never moves backward (only Fern retreats), so the browser was likely running a cached file. Added a D-key debug label (state / personality) and a console message to confirm the latest sketch is loaded.
43. "Make the walking tail shape curved." — the S curve read as a staircase; replaced `WALK_TAIL` with a clear ")" bow that bulges toward the body (col 2 → 6 → 4).
44. "Make the background color move slowly." — the sky is now a banded gradient (darker top, lighter bottom) whose band edges ripple slowly with `sin(frameCount * SKY_WAVE_SPEED ...)`, on top of the day/night color.
45. "The walking tail is still too stiff." (chose: held low and back, relaxed) — the sprite area only allowed an upright tail, so the walking tail is now drawn in code as a chain of 12 segments (`walkTailCells()`, `drawWalkTail()`): it extends back almost horizontally beyond the sprite and only the tip curls up, with a traveling wave while walking.
46. "Apply it." — found that VS Code had saved an old copy of sketch.js over ~15 changes; restored the latest version from Claude Code's file history and re-applied the low walking tail.
47. "Make the closed eyes a straight line." — `drawSleepyEyes()` now draws one flat 1px line per eye instead of a curved ‿.
