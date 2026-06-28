// Audio I/O only — no DOM, no UI. Owns the AudioContext, mic stream, and the
// oscillator used to play the "call" tones.

import { S } from "../state.js";
import { autoCorrelate, smoother } from "../pitch.js";

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
