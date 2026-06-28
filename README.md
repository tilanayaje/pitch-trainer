# PitchTrainer

This app is a free alternative to websites that show pitch in real time. It also has Solfège-centered drills for hitting the right pitch and sustaining it. I personally use it for practice and like it.

Try it out at https://tilanayaje.github.io/pitch-trainer/ ! 

## Tips for best results
- Eliminate any background noise
- Don't be too quiet
- Headphones + Microphone provide the best results
- Standing closer helps with cheaper tech

## How to use
1. **Enable mic** — Hum or sing a steady note and confirm the cents reading is stable before drilling.
2. Pick a **drill** and a **tonic**
3. **Start drill.** Round 1 shows the target on the grid, you sing blind, the result is revealed after. Round 2 plays the target by ear only.
4. Read the table. **Hold mean dev** is your flat/sharp on the sustain; **hold drift** is how steady the hold was; **landed** is how long it took to arrive.

The glyph column (♭ / ♯ / ✓) uses a tight ±15-cent musical threshold, independent of the looser in-band tolerance — so a note that's flat but technically "in band" still reads ♭. Trust the glyph.

## Project structure

```
index.html             The page itself — what loads in the browser.
manifest.webmanifest   App metadata (name, colors) for installing it like an app.
css/
  styles.css           All the styling — the look, layout, and colors.
src/
  main.js              Startup: wires up the buttons and runs the main loop.
  state.js             One shared object holding the app's current state.
  theory.js            Music math — notes, frequencies, cents, solfège.
  pitch.js             Listens to your voice and figures out the pitch.
  audio.js             Handles the mic and plays the target tones.
  drills.js            The list of drills and their timing.
  engine.js            Runs a drill: plays the note, records you, scores it.
  scoring.js           Grades each note — how flat/sharp, how steady, how fast.
  render.js            Draws the pitch graph (your line vs. the target).
  tuner.js             The live tuner readout up top.
  ui.js                Updates the on-screen text, controls, and results table.
```
