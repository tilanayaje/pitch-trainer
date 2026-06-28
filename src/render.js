// Scope rendering: pitch on Y, time on X. The vertical gap between your trace and
// the target line is the flat/sharp error that's why pitch is the Y axis.

import { S } from "./state.js";
import { freqToMidi, freqToName, midiToFreq, DEGREE, freqForDegree } from "./theory.js";
import { stepMs } from "./drills.js";

const cv = document.getElementById("plot");
const ctx = cv.getContext("2d");

const pitchRange = () => ({ lo: S.tonicMidi - 2, hi: S.tonicMidi + 15 });

function yFor(f) {
  const { lo, hi } = pitchRange();
  const m = freqToMidi(f);
  return 16 + ((hi - m) / (hi - lo)) * (cv.height - 32);
}

const recPhrase = () => S.currentDrill.notes.length * stepMs(S.currentDrill) * S.tempo;
const xFor = (t) => 70 + (t / recPhrase()) * (cv.width - 84);

export function drawPlot(opts = {}) {
  ctx.clearRect(0, 0, cv.width, cv.height);
  const { lo, hi } = pitchRange();

  // scale-degree gridlines + labels
  ctx.font = '11px "JetBrains Mono",ui-monospace,monospace';
  ctx.textBaseline = "middle";
  for (const [lab, off] of Object.entries(DEGREE)) {
    const m = S.tonicMidi + off;
    if (m < lo || m > hi) continue;
    const y = 16 + ((hi - m) / (hi - lo)) * (cv.height - 32);
    ctx.strokeStyle = "#3a2914";
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(cv.width - 8, y);
    ctx.stroke();
    ctx.fillStyle = "#9a7b4f";
    ctx.fillText(lab.padEnd(3) + " " + freqToName(midiToFreq(m)), 6, y);
  }

  // target contour (stepped) — shown in preplay, review, and during response when playhead is on
  const showTarget = opts.preplay || opts.review || (S.phase === "RESPONSE" && S.playheadEnabled);
  if (showTarget) {
    const dur = S.currentDrill.noteDur * S.tempo;
    const step = stepMs(S.currentDrill) * S.tempo;
    S.currentDrill.notes.forEach((lab, i) => {
      const tf = freqForDegree(lab, S.tonicMidi);
      const y = yFor(tf);
      const x0 = xFor(i * step);
      const x1 = xFor(i * step + dur);
      ctx.strokeStyle = i === S.activeNote ? "#F2C14E" : "#9d8048";
      ctx.lineWidth = i === S.activeNote ? 4 : 3;
      ctx.beginPath();
      ctx.moveTo(x0 + 2, y);
      ctx.lineTo(x1 - 2, y);
      ctx.stroke();
      // tolerance band
      ctx.fillStyle = "rgba(242,193,78,.07)";
      const yb = yFor(tf * Math.pow(2, S.tolerance / 1200));
      const yt = yFor(tf * Math.pow(2, -S.tolerance / 1200));
      ctx.fillRect(x0 + 2, yb, x1 - x0 - 4, yt - yb);
    });
  }

  // playhead: vertical sweep during response, only when the timing-guide toggle is on
  if (S.phase === "RESPONSE" && S.playheadEnabled) {
    const px = xFor(Math.min(S.recElapsed, recPhrase()));
    ctx.save();
    ctx.strokeStyle = "#00d4ff";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(px, 8);
    ctx.lineTo(px, cv.height - 8);
    ctx.stroke();
    ctx.restore();
  }

  // your trace (live during response if toggled, always in review)
  if ((S.phase === "RESPONSE" && S.drawLiveDuringResponse) || opts.review) {
    ctx.save();
    ctx.strokeStyle = "#F0962E";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#F0962E";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    let pen = false;
    for (const s of S.trace) {
      if (s.f <= 0) { pen = false; continue; }
      const x = xFor(s.t);
      const y = yFor(s.f);
      if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
}
