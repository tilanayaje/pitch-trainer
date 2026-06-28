// Monophonic pitch detection: autocorrelation + parabolic interpolation.
// This is a solved problem — the value of the app is elsewhere, so this stays simple.
// Swap target for a future AudioWorklet / pYIN / SwiftF0 by keeping this interface:
// a function returning fundamental frequency in Hz (or -1 when unvoiced).

// --- Tunable constants ---
export const RMS_FLOOR         = 0.003;  // hard floor: absolute silence / clipping guard
export const CLARITY_THRESHOLD = 0.50;  // primary voicing gate: best-peak / zero-lag energy
export const SMOOTHER_WINDOW   = 7;     // median history length (frames)
export const HOLD_FRAMES       = 6;     // frames to hold last good pitch through a dropout

// Last measured clarity (0–1). Set on every call; read by callers for a confidence indicator.
// Note: proper breathiness handling needs pYIN/CREPE — this is a heuristic improvement only.
export let lastClarity = 0;

export function autoCorrelate(buf, sampleRate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) { const v = buf[i]; rms += v * v; }
  rms = Math.sqrt(rms / SIZE);
  if (rms < RMS_FLOOR) { lastClarity = 0; return -1; }

  // trim leading/trailing low-amplitude regions
  let r1 = 0, r2 = SIZE - 1; const thr = 0.2;
  for (let i = 0; i < SIZE / 2; i++) { if (Math.abs(buf[i]) < thr) { r1 = i; break; } }
  for (let i = 1; i < SIZE / 2; i++) { if (Math.abs(buf[SIZE - i]) < thr) { r2 = SIZE - i; break; } }
  const b = buf.slice(r1, r2);
  const n = b.length;

  // zero-lag energy — denominator for clarity normalization
  let e0 = 0;
  for (let i = 0; i < n; i++) e0 += b[i] * b[i];

  // only search lags for plausible vocal range (~70–1000 Hz) to keep it cheap
  const minLag = Math.floor(sampleRate / 1000);
  const maxLag = Math.floor(sampleRate / 70);
  const c = new Float32Array(n);
  for (let lag = minLag; lag < Math.min(maxLag, n); lag++) {
    let s = 0;
    for (let i = 0; i < n - lag; i++) s += b[i] * b[i + lag];
    c[lag] = s;
  }

  // walk down off the zero-lag slope, then find the highest peak
  let d = minLag;
  while (d < maxLag - 1 && c[d] > c[d + 1]) d++;
  let maxv = -1, T0 = -1;
  for (let i = d; i < Math.min(maxLag, n); i++) { if (c[i] > maxv) { maxv = c[i]; T0 = i; } }
  if (T0 <= 0) { lastClarity = 0; return -1; }

  // clarity gate: reject breath/noise even when RMS is above the floor.
  // A clearly pitched note has a strong dominant lag; noise has a flat profile.
  const clarity = e0 > 0 ? maxv / e0 : 0;
  lastClarity = clarity;
  if (clarity < CLARITY_THRESHOLD) return -1;

  // parabolic interpolation for sub-sample precision
  const x1 = c[T0 - 1] || 0, x2 = c[T0], x3 = c[T0 + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2, bb = (x3 - x1) / 2;
  if (a) T0 = T0 - bb / (2 * a);
  return sampleRate / T0;
}

// Median smoother over recent frames: rejects isolated octave-jump / outlier frames.
// Also holds the last good pitch through short breathy dropouts (heuristic only —
// for reliable dropout bridging on genuinely breathy voices, replace autoCorrelate
// with pYIN or a neural detector like CREPE).
export const smoother = {
  hist: [],
  holdCount: 0,
  lastGoodFreq: -1,

  reset() { this.hist = []; this.holdCount = 0; this.lastGoodFreq = -1; },

  push(raw) {
    this.hist.push(raw);
    if (this.hist.length > SMOOTHER_WINDOW) this.hist.shift();

    const v = this.hist.filter((x) => x > 0);
    let median;
    if (v.length < 3) {
      median = raw > 0 ? raw : -1;
    } else {
      const s = [...v].sort((a, b) => a - b);
      median = s[Math.floor(s.length / 2)];
    }

    if (median > 0) {
      this.lastGoodFreq = median;
      this.holdCount = 0;
      return median;
    }

    // bridge short dropout: hold the last good pitch rather than breaking the trace
    if (this.holdCount < HOLD_FRAMES && this.lastGoodFreq > 0) {
      this.holdCount++;
      return this.lastGoodFreq;
    }

    this.lastGoodFreq = -1;
    return -1;
  },
};
