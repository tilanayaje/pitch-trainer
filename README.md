# Pitch Driller

A real-time vocal pitch trainer. It plays a target phrase in movable-do solfège,
you sing it back, and it shows you — to the cent — where your voice actually landed
versus where the note is. Built to train pitch *production*, not just ear.

## How to use

1. **Enable mic** — the strobe tuner goes live immediately. Hum a steady note and
   confirm the cents reading is stable before drilling.
2. Pick a **drill** and a **tonic** that sits comfortably in your range.
3. **Start drill.** Round 1 shows the target on the grid, you sing blind, the result
   is revealed after. Round 2 plays the target by ear only.
4. Read the table. **Hold mean dev** is your flat/sharp on the sustain; **hold drift**
   is how steady the hold was; **landed** is how long it took to arrive.

The glyph column (♭ / ♯ / ✓) uses a tight ±15-cent musical threshold, independent of
the looser in-band tolerance — so a note that's flat but technically "in band" still
reads ♭. Trust the glyph.

## Project structure

```
index.html               markup + module entry
css/styles.css           all styling
manifest.webmanifest     PWA metadata
src/
  theory.js    pure: notes, frequencies, cents, solfège degrees
  pitch.js     pure: autocorrelation detector + median smoother
  drills.js    drill library + timing constants
  scoring.js   pure: per-note hold metrics (split at first-land)
  state.js     single shared mutable state object (S)
  audio.js     mic capture, pitch read, tone playback
  render.js    the scope (pitch-vs-time canvas)
  tuner.js     live strobe readout
  ui.js        DOM helpers: status, controls, results table
  engine.js    call-and-response state machine + fade schedule
  main.js      render loop + DOM wiring
```
