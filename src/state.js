// Single shared mutable state object. Stateful modules (audio, engine, render,
// tuner, ui) read and write fields here instead of scattering globals.

import { DRILLS } from "./drills.js";

export const S = {
  // --- audio i/o ---
  audioCtx: null,
  analyser: null,
  timeBuf: null,
  micStream: null,
  micSource: null,
  micOn: false,
  currentFreq: -1, // latest smoothed pitch in Hz, or -1 when unvoiced

  // --- drill / settings ---
  phase: "IDLE",   // IDLE | PREPLAY | RESPONSE | REVIEW
  currentDrill: DRILLS.do_re_do,
  tonicMidi: 48,   // C3
  tolerance: 50,   // ± cents counted as "in band"
  concurrentEnabled: false, // user toggle: show the live line while singing

  // --- run-time flags ---
  drawLiveDuringResponse: false,
  abort: false,
  holdReview: false,    // keep the last attempt's lines on screen until next Start

  // --- per-attempt capture ---
  recording: false,
  trace: [],       // [{ t: ms-since-start, f: Hz }]
  recStart: 0,
  activeNote: -1,  // index of the note currently being played in preplay
};
