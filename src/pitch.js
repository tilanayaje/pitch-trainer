// Monophonic pitch detection: autocorrelation + parabolic interpolation.
// This is a solved problem — the value of the app is elsewhere, so this stays simple.
// Swap target for a future AudioWorklet / pYIN / SwiftF0 by keeping this interface:
// a function returning fundamental frequency in Hz (or -1 when unvoiced).

export function autoCorrelate(buf, sampleRate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) { const v = buf[i]; rms += v * v; }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // voicing gate: too quiet to call

  // trim leading/trailing low-amplitude regions
  let r1 = 0, r2 = SIZE - 1; const thr = 0.2;
  for (let i = 0; i < SIZE / 2; i++) { if (Math.abs(buf[i]) < thr) { r1 = i; break; } }
  for (let i = 1; i < SIZE / 2; i++) { if (Math.abs(buf[SIZE - i]) < thr) { r2 = SIZE - i; break; } }
  const b = buf.slice(r1, r2);
  const n = b.length;

  // only search lags for plausible vocal range (~70-1000 Hz) to keep it cheap
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
  if (T0 <= 0) return -1;

  // parabolic interpolation for sub-sample precision
  const x1 = c[T0 - 1] || 0, x2 = c[T0], x3 = c[T0 + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2, bb = (x3 - x1) / 2;
  if (a) T0 = T0 - bb / (2 * a);
  return sampleRate / T0;
}

// Median smoother over the last few frames: rejects isolated octave-jump / outlier frames.
export const smoother = {
  hist: [],
  reset() { this.hist = []; },
  push(raw) {
    this.hist.push(raw);
    if (this.hist.length > 5) this.hist.shift();
    const v = this.hist.filter((x) => x > 0);
    if (v.length < 3) return raw > 0 ? raw : -1;
    const s = [...v].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  },
};
