// Live strobe tuner: the big note name, the cents readout, the needle, and the
// flat/sharp lamps. Driven once per frame from S.currentFreq.

import { S } from "./state.js";
import { freqToMidi, freqToName, midiToFreq, cents } from "./theory.js";

const IN_TUNE = 10; // ± cents shown green / centered

let lastUIState = null;

export function updateLiveTuner() {
  const nEl = document.getElementById("liveNote");
  const cEl = document.getElementById("liveCents");
  const fEl = document.getElementById("liveFill");
  const fl = document.getElementById("flatSym");
  const sh = document.getElementById("sharpSym");

  // FREEZE FRAME MODE
  if (!S.micOn && lastUIState) {
    const s = lastUIState;

    nEl.textContent = s.note;
    nEl.style.color = s.color;
    nEl.style.textShadow = `0 0 14px ${s.color}, 0 0 32px ${s.color}88`;

    cEl.textContent = `${s.freq.toFixed(1)} Hz · ${s.cents > 0 ? "+" : ""}${s.cents.toFixed(0)} ¢`;

    fEl.style.left = `${s.fill}%`;
    fEl.style.background = s.color;
    fEl.style.boxShadow = `0 0 5px ${s.color}, 0 0 16px ${s.color}BB, 0 0 30px ${s.color}55`;

    fl.classList.toggle("lit-flat", s.flat);
    sh.classList.toggle("lit-sharp", s.sharp);

    return;
  }

  if (S.currentFreq <= 0) {
    nEl.textContent = "—";
    nEl.style.color = "";
    nEl.style.textShadow = "";
    cEl.textContent = "(no signal)";
    fEl.style.left = "50%";
    fEl.style.background = "#5a4630";
    fEl.style.boxShadow = "none";
    fl.classList.remove("lit-flat");
    sh.classList.remove("lit-sharp");
    return;
  }

  const m = Math.round(freqToMidi(S.currentFreq));
  const dev = cents(S.currentFreq, midiToFreq(m));
  const col = Math.abs(dev) <= IN_TUNE ? "#9CC04A" : dev < 0 ? "#F0962E" : "#E0653A";

  nEl.textContent = freqToName(S.currentFreq);
  nEl.style.color = col;
  nEl.style.textShadow = `0 0 14px ${col}, 0 0 32px ${col}88`;
  cEl.textContent = `${S.currentFreq.toFixed(1)} Hz · ${dev > 0 ? "+" : ""}${dev.toFixed(0)} ¢`;
  fEl.style.left = `${50 + Math.max(-50, Math.min(50, dev))}%`;
  fEl.style.background = col;
  fEl.style.boxShadow = `0 0 5px ${col}, 0 0 16px ${col}BB, 0 0 30px ${col}55`;
  fl.classList.toggle("lit-flat",  dev < -IN_TUNE);
  sh.classList.toggle("lit-sharp", dev > IN_TUNE);

  // snapshot for freeze frame
  lastUIState = {
    note: freqToName(S.currentFreq),
    cents: dev,
    freq: S.currentFreq,
    color: col,
    fill: 50 + Math.max(-50, Math.min(50, dev)),
    flat: dev < -IN_TUNE,
    sharp: dev > IN_TUNE
  };
}