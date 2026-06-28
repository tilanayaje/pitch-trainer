// Scoring is pure: given a recorded trace plus the drill/tonic/tolerance, return
// per-note results. Every metric describes the HOLD (from first land onward),
// never the approach scoop — see the split at landIdx below.

import { cents, freqForDegree } from "./theory.js";
import { TAIL_TRIM, stepMs } from "./drills.js";

export function scoreAttempt(trace, drill, tonicMidi, tolerance) {
  const notes = drill.notes;
  const dur = drill.noteDur;
  const step = stepMs(drill);
  const out = [];

  for (let i = 0; i < notes.length; i++) {
    const tf = freqForDegree(notes[i], tonicMidi);
    const w0 = i * step;
    const w1 = i * step + dur;
    const seg = trace.filter((s) => s.t >= w0 && s.t < w1 && s.f > 0);
    if (!seg.length) {
      out.push({ label: notes[i], target: tf, landed: null, inBand: null, mean: null, drift: null });
      continue;
    }
    const devs = seg.map((s) => cents(s.f, tf));

    // first moment inside the band = the boundary between hunt and hold
    let landIdx = -1;
    for (let k = 0; k < devs.length; k++) {
      if (Math.abs(devs[k]) <= tolerance) { landIdx = k; break; }
    }
    if (landIdx < 0) {
      out.push({ label: notes[i], target: tf, landed: null, inBand: 0, mean: null, drift: null });
      continue;
    }

    const landed = seg[landIdx].t - w0;

    // SUSTAIN = first land onward, minus the final TAIL_TRIM ms (except the last note),
    // because that tail is the scoop toward the next note, not this hold.
    const isLast = i === notes.length - 1;
    const susEnd = isLast ? w1 : w1 - TAIL_TRIM;
    const sus = [];
    for (let k = landIdx; k < seg.length; k++) {
      if (seg[k].t < susEnd) sus.push(devs[k]);
    }
    if (sus.length === 0) {
      out.push({ label: notes[i], target: tf, landed, inBand: null, mean: null, drift: null });
      continue;
    }

    const inBand = sus.filter((d) => Math.abs(d) <= tolerance).length / sus.length;
    const mean = sus.reduce((a, b) => a + b, 0) / sus.length;
    // drift = standard deviation of the hold (steadiness), not max-min range,
    // so one bad onset frame can't blow it up.
    const drift = sus.length > 1
      ? Math.sqrt(sus.reduce((a, b) => a + (b - mean) * (b - mean), 0) / sus.length)
      : null;

    out.push({ label: notes[i], target: tf, landed, inBand, mean, drift });
  }
  return out;
}
