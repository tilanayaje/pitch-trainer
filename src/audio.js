// Audio I/O only 
// AudioContext, mic stream, and the oscillator used to play the "call" tones.

import { S } from "./state.js";
import { autoCorrelate, smoother } from "./pitch.js";

export async function enableMic() {
  S.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  await S.audioCtx.resume();
  S.micStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  S.micSource = S.audioCtx.createMediaStreamSource(S.micStream);
  S.analyser = S.audioCtx.createAnalyser();
  S.analyser.fftSize = 2048;
  S.timeBuf = new Float32Array(S.analyser.fftSize);
  S.micSource.connect(S.analyser);
  S.micOn = true;
}

export function disableMic() {
  S.micOn = false; // the render loop checks this and stops
  try { if (S.micSource) S.micSource.disconnect(); } catch (e) { /* already gone */ }
  if (S.micStream) S.micStream.getTracks().forEach((t) => t.stop()); // releases the device
  if (S.audioCtx) S.audioCtx.close();
  S.micStream = null;
  S.micSource = null;
  S.analyser = null;
  S.audioCtx = null;
  S.currentFreq = -1;
  smoother.reset();
}

// Read one frame; updates and returns S.currentFreq (Hz, or -1 unvoiced).
export function readPitch() {
  if (!S.micOn || !S.analyser) return -1;
  S.analyser.getFloatTimeDomainData(S.timeBuf);
  S.currentFreq = smoother.push(autoCorrelate(S.timeBuf, S.audioCtx.sampleRate));
  return S.currentFreq;
}

// Soft-clip saturation curve — higher amount = grittier/dirtier.
function distortionCurve(amount) {
  const n = 256;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

// Analog switch-engage "clunk" — low distorted thud, fast attack, short decay.
// Own AudioContext so it's self-contained regardless of mic state.
export function micOnSound() {
  const ac = new AudioContext();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const ws = ac.createWaveShaper();
  const g = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = 45;
  ws.curve = distortionCurve(280);
  ws.oversample = "2x";
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.55, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(ws).connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.11);
  setTimeout(() => ac.close(), 400);
}

// Lower, heavier clunk for mic off — more distortion, lower fundamental.
// Own AudioContext so it plays cleanly after the main context is torn down.
export function micOffSound() {
  const ac = new AudioContext();
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  const ws = ac.createWaveShaper();
  const g = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = 30;
  ws.curve = distortionCurve(480);
  ws.oversample = "2x";
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.45, t + 0.007);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
  osc.connect(ws).connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.15);

  // Short noise burst — pairs with the power-down flash on the tuner face.
  const len = (ac.sampleRate * 0.1) | 0;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  const noiseSrc = ac.createBufferSource();
  noiseSrc.buffer = buf;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.12, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  noiseSrc.connect(ng).connect(ac.destination);
  noiseSrc.start(t);

  setTimeout(() => ac.close(), 500);
}

// Play a target tone with a short attack/release envelope to avoid clicks.
export function playTone(freq, durMs) {
  return new Promise((res) => {
    const osc = S.audioCtx.createOscillator();
    const g = S.audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const t = S.audioCtx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.02);
    g.gain.setValueAtTime(0.18, t + durMs / 1000 - 0.05);
    g.gain.linearRampToValueAtTime(0, t + durMs / 1000);
    osc.connect(g).connect(S.audioCtx.destination);
    osc.start(t);
    osc.stop(t + durMs / 1000);
    setTimeout(res, durMs);
  });
}
