# Pitch Driller

A real-time vocal pitch trainer. It plays a target phrase in movable-do solfège,
you sing it back, and it shows you — to the cent — where your voice actually landed
versus where the note is. Built to train pitch *production*, not just ear.

No dependencies, no build step. Plain HTML + CSS + ES modules. Runs anywhere static
files can be served.

## Why it works this way

Singing on pitch is two separate skills: hearing the note (ear) and getting your
voice to land it (motor control). Most people who sing flat can already hear they're
flat — the gap is production. So the core mechanism here is a real-time pitch
feedback loop on scale and interval drills, with one design choice most apps skip:

**The concurrent live line is faded, not always on.** Showing your pitch on screen
the entire time you sing builds dependency — you learn to sing in tune only while
watching a meter. So by default you sing *blind* and the result is revealed after.
The live line is an opt-in rescue toggle, not a permanent crutch. (This follows the
guidance/dependency findings from motor-learning research on feedback.)

## Running it locally

The microphone needs a secure context, so opening `index.html` directly as a
`file://` URL will silently block the mic. Serve it over `localhost` instead:

```bash
# any one of these, from the project folder:
py -m http.server 8000          # Windows (real Python via the py launcher)
python3 -m http.server 8000     # macOS / Linux
npx http-server -p 8000         # Node, no Python needed
```

Then open `http://localhost:8000/` and allow the mic prompt. In VS Code, the
"Live Server" extension does the same thing with auto-reload on save.

## Deploying

It's static, so GitHub Pages serves it directly over HTTPS (which the mic needs):

1. Push to a GitHub repo.
2. Settings → Pages → Source: deploy from `main`, root.
3. Open the published URL; the mic works because Pages is HTTPS.

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

Pure modules (theory, pitch, scoring, drills) hold no state and no DOM, so they're
trivial to test in isolation. Stateful modules share the one `S` object instead of
scattering globals.

## Roadmap

- **Session logging** — persist each attempt so flatness can be tracked over weeks
  (the actual point of measuring it).
- **AudioWorklet detection** — the autocorrelation loop is O(n²) on the main thread;
  fine on desktop, the thing to move off-thread for smooth mobile.
- **Onset detection** — grade from when you actually start singing, not a fixed clock.
- **PWA icons + service worker** — make it installable and offline-capable. The
  manifest is in place; it needs an icon set and a service worker to finish.

## License

MIT — see [LICENSE](LICENSE).
