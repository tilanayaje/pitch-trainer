// Live strobe tuner: the big note name, the cents readout, the needle, and the
// flat/sharp lamps. Driven once per frame from S.currentFreq.

import { S } from "./state.js";
import { freqToMidi, freqToName, midiToFreq, cents } from "./theory.js";

const IN_TUNE = 10; // ± cents shown green / centered

export function updateLiveTuner() {
  const nEl = document.getElementById("liveNote");
  const cEl = document.getElementById("liveCents");
  const fEl = document.getElementById("liveFill");
  const fl = document.getElementById("flatSym");
  const sh = document.getElementById("sharpSym");

  if (S.currentFreq <= 0) {
    nEl.textContent = "\u2014";
    nEl.style.color = "";
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
  nEl.style.textShadow = `0 0 20px ${col}55`;
  cEl.textContent = `${S.currentFreq.toFixed(1)} Hz \u00b7 ${dev > 0 ? "+" : ""}${dev.toFixed(0)} \u00a2`;
  fEl.style.left = `${50 + Math.max(-50, Math.min(50, dev))}%`;
  fEl.style.background = col;
  fEl.style.boxShadow = `0 0 12px ${col}`;
  fl.classList.toggle("lit-flat", dev < -IN_TUNE);
  sh.classList.toggle("lit-sharp", dev > IN_TUNE);
}
