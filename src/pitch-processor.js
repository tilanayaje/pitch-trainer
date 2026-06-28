// AudioWorkletProcessor — pitch detection on the audio thread.
// Inlines the algorithm from pitch.js verbatim; can't import ES modules portably
// across all browsers from a worklet context. If you change the algorithm in
// pitch.js you must mirror the change here.

const RMS_FLOOR         = 0.003;
const CLARITY_THRESHOLD = 0.50;
const SMOOTHER_WINDOW   = 7;
const HOLD_FRAMES       = 6;

function autoCorrelate(buf, sr) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) { const v = buf[i]; rms += v * v; }
  rms = Math.sqrt(rms / SIZE);
  if (rms < RMS_FLOOR) return -1;

  let r1 = 0, r2 = SIZE - 1;
  const thr = 0.2;
  for (let i = 0; i < SIZE / 2; i++) { if (Math.abs(buf[i]) < thr) { r1 = i; break; } }
  for (let i = 1; i < SIZE / 2; i++) { if (Math.abs(buf[SIZE - i]) < thr) { r2 = SIZE - i; break; } }
  const b = buf.slice(r1, r2);
  const n = b.length;

  let e0 = 0;
  for (let i = 0; i < n; i++) e0 += b[i] * b[i];

  const minLag = Math.floor(sr / 1000);
  const maxLag = Math.floor(sr / 70);
  const c = new Float32Array(n);
  for (let lag = minLag; lag < Math.min(maxLag, n); lag++) {
    let s = 0;
    for (let i = 0; i < n - lag; i++) s += b[i] * b[i + lag];
    c[lag] = s;
  }

  let d = minLag;
  while (d < maxLag - 1 && c[d] > c[d + 1]) d++;
  let maxv = -1, T0 = -1;
  for (let i = d; i < Math.min(maxLag, n); i++) { if (c[i] > maxv) { maxv = c[i]; T0 = i; } }
  if (T0 <= 0) return -1;

  const clarity = e0 > 0 ? maxv / e0 : 0;
  if (clarity < CLARITY_THRESHOLD) return -1;

  const x1 = c[T0 - 1] || 0, x2 = c[T0], x3 = c[T0 + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2, bb = (x3 - x1) / 2;
  if (a) T0 = T0 - bb / (2 * a);
  return sr / T0;
}

// --- Smoother (per-processor-instance state, not shared with main thread) ---
let _hist = [], _holdCount = 0, _lastGoodFreq = -1;

function smootherPush(raw) {
  _hist.push(raw);
  if (_hist.length > SMOOTHER_WINDOW) _hist.shift();

  const v = _hist.filter((x) => x > 0);
  let median;
  if (v.length < 3) {
    median = raw > 0 ? raw : -1;
  } else {
    const s = [...v].sort((a, b) => a - b);
    median = s[Math.floor(s.length / 2)];
  }

  if (median > 0) { _lastGoodFreq = median; _holdCount = 0; return median; }
  if (_holdCount < HOLD_FRAMES && _lastGoodFreq > 0) { _holdCount++; return _lastGoodFreq; }
  _lastGoodFreq = -1;
  return -1;
}

// --- Processor ---
// Maintains a 2048-sample ring buffer (same window as the previous AnalyserNode
// fftSize) and posts a smoothed Hz value (or -1) every POST_EVERY quanta.
// At 48 kHz: 128 samples/quantum × 4 = 512 samples = ~10.7 ms between posts,
// keeping S.currentFreq fresher than the ~16 ms rAF cadence on the main thread.
const RING_SIZE  = 2048;
const POST_EVERY = 4;

class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._ring     = new Float32Array(RING_SIZE);
    this._head     = 0;
    this._filled   = 0;
    this._quantum  = 0;
    this._snapshot = new Float32Array(RING_SIZE); // reused — avoids per-post allocation
  }

  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;

    // Write incoming samples into the ring buffer
    for (let i = 0; i < ch.length; i++) {
      this._ring[this._head] = ch[i];
      this._head = (this._head + 1) % RING_SIZE;
      if (this._filled < RING_SIZE) this._filled++;
    }

    if (this._filled < RING_SIZE) return true; // not enough data yet

    if (++this._quantum % POST_EVERY !== 0) return true;

    // Unroll ring into a time-ordered snapshot (oldest sample first)
    const start = this._head;
    for (let j = 0; j < RING_SIZE; j++) {
      this._snapshot[j] = this._ring[(start + j) % RING_SIZE];
    }

    // sampleRate is a global in AudioWorkletGlobalScope
    this.port.postMessage(smootherPush(autoCorrelate(this._snapshot, sampleRate)));
    return true;
  }
}

registerProcessor('pitch-processor', PitchProcessor);
