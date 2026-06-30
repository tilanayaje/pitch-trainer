<h1 align="center">PitchTrainer</h1>
<p align="center">
  <img width="471" height="889" alt="image" src="https://github.com/user-attachments/assets/b9710cf6-31ac-45a7-8c80-8943ec7ef4b4" />
  <p align="center" >Try it out at https://tilanayaje.github.io/pitch-trainer/ ! </p>
</p>

---

This app is a totally free alternative to apps that show monophonic pitch in real time, such as Singing Carrots. It also has Solfège-centered drills for hitting the right pitch and sustaining it. I personally use it for practice and like it.

## Tips for best results
- Eliminate any background noise
- Don't be too quiet
- Headphones + Microphone provide the best results
- Standing closer helps with cheaper tech
- Avoid echoey environments

## How to use
1. **Enable mic** — Hum or sing a steady note and confirm the cents reading is stable before drilling.
2. Pick a **drill** and a **tonic**, and adjust **tolerance** and **tempo** with the knobs.
3. **Start drill.** It plays the target melody first, and then you sing it back, and the result is shown after.
4. **playhead** shows a moving cursor over the target so you know where you are in the phrase, and **live line while singing** shows your actual pitch as you go. Both are off by default. Sing blind to test yourself, turn them on for help.
5. Your results are displayed with a generated table. **Hold mean dev** is your flat/sharp on the sustain; **hold drift** is how steady the hold was; **landed** is how long it took to arrive.

The glyph column (♭ / ♯ / ✓) uses a tight ±15-cent musical threshold, independent of the looser in-band tolerance. A note that's flat but technically "in band" still reads ♭.

Every completed attempt is saved to a local **History** log on your device, so you can track your accuracy over time. it stays on your device, and you can clear it anytime. 

## Project structure

```
index.html             The page itself
manifest.webmanifest   App metadata
css/
  styles.css           Styling
src/
  main.js              Startup: wires up the buttons and runs the main loop.
  state.js             One shared object holding the app's current state.
  theory.js            Music math (notes, frequencies, cents, solfège)
  pitch.js             Listens to your voice and figures out the pitch.
  audio.js             Handles the mic and plays the target tones.
  drills.js            The list of drills and their timing.
  engine.js            Runs a drill: plays the note, records you, scores it.
  scoring.js           Grades each note (how flat/sharp, how steady, how fast)
  render.js            Draws the pitch graph (your line vs. the target).
  tuner.js             The live tuner readout up top.
  ui.js                Updates the on-screen text, controls, and results table.
  history.js           Saves and displays your past attempts locally.
  knob.js              The rotary knob controls.
```
