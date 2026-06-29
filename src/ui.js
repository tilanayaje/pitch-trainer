// Small DOM-facing helpers shared by the engine and the wiring layer.

import { S } from "./state.js";
import { freqToName } from "./theory.js";

export function status(s) {
  document.getElementById("status").textContent = s;
}

export function setControls(running) {
  document.getElementById("startBtn").disabled = running || !S.micOn;
  document.getElementById("stopBtn").disabled = !running;
  document.getElementById("micBtn").disabled = running;
  ["drillSel", "tonicSel"].forEach(
    (id) => (document.getElementById(id).disabled = running)
  );
  const tolKnob = document.getElementById("tolKnob");
  if (tolKnob) tolKnob.dataset.disabled = running ? "true" : "";
}

const TUNE = 15; // ± cents counted as musically in-tune for the glyph + colour

export function renderScores(scores) {
  const tb = document.querySelector("#scoreTable tbody");
  tb.innerHTML = "";
  for (const s of scores) {
    const tr = document.createElement("tr");
    let glyph = "·"; // ·
    let cls = "";
    if (s.mean != null) {
      if (Math.abs(s.mean) <= TUNE) { glyph = "✓"; cls = "good"; }   // ✓
      else if (s.mean < 0) { glyph = "♭"; cls = "flat"; }            // ♭
      else { glyph = "♯"; cls = "sharp"; }                           // ♯
    }
    const fmt = (v, suf = "") => (v == null ? "—" : v.toFixed(0) + suf);
    tr.innerHTML = `<td class="glyph ${cls}">${glyph}</td>
      <td>${s.label}</td>
      <td>${freqToName(s.target)}</td>
      <td>${s.landed == null ? '<span class="sharp">missed</span>' : fmt(s.landed, " ms")}</td>
      <td>${s.inBand == null ? "—" : fmt(s.inBand * 100, " %")}</td>
      <td class="${cls}">${s.mean == null ? "—" : (s.mean > 0 ? "+" : "") + s.mean.toFixed(0) + " c"}</td>
      <td>${fmt(s.drift, " c")}</td>`;
    tb.appendChild(tr);
  }
  document.getElementById("scorePanel").style.display = "block";
}
