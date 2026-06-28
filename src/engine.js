// The drill engine: the call-and-response state machine and the fade schedule.
//
// Round 1: target shown on the grid -> sing blind -> result revealed after.
// Round 2: target played (audio only, no grid) -> sing blind -> result after,
//          unless retentionTest is on, in which case round 2 is silent (no feedback).
// The concurrent live line is an opt-in toggle, not a stage — a rescue tool.

import { S } from "./state.js";
import { stepMs, NOTE_GAP } from "./drills.js";
import { freqForDegree } from "./theory.js";
import { playTone } from "./audio.js";
import { scoreAttempt } from "./scoring.js";
import { drawPlot } from "./render.js";
import { status, setControls, renderScores } from "./ui.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Called from the render loop while S.recording is true.
export function sampleTrace() {
  S.trace.push({ t: performance.now() - S.recStart, f: S.currentFreq });
}

export async function runDrill() {
  S.abort = false;
  S.holdReview = false;
  setControls(true);

  for (let round = 1; round <= 2 && !S.abort; round++) {
    const showGrid = round === 1;
    const reveal = round === 1 || !S.retentionTest;
    const drill = S.currentDrill;

    // --- PREPLAY (the "call") ---
    S.phase = "PREPLAY";
    status(`Round ${round}: listen` + (showGrid ? " (watch the grid)" : " (audio only)"));
    drawPlot(showGrid ? { preplay: true } : {});
    for (let i = 0; i < drill.notes.length && !S.abort; i++) {
      S.activeNote = i;
      if (showGrid) drawPlot({ preplay: true });
      await playTone(freqForDegree(drill.notes[i], S.tonicMidi), drill.noteDur);
      if (i < drill.notes.length - 1) await sleep(NOTE_GAP);
    }
    S.activeNote = -1;
    if (S.abort) break;

    // --- count-in ---
    for (const w of ["5", "4", "3", "2", "1", "SING"]) {
      status(w);
      await sleep(450);
      if (S.abort) break;
    }
    if (S.abort) break;

    // --- RESPONSE (you sing, blind unless the live-line toggle is on) ---
    S.phase = "RESPONSE";
    S.drawLiveDuringResponse = S.concurrentEnabled;
    const recTotal = drill.notes.length * stepMs(drill);
    S.trace = [];
    S.recStart = performance.now();
    S.recording = true;
    status("singing…" + (S.drawLiveDuringResponse ? " (live line on)" : ""));
    drawPlot();
    await sleep(recTotal + 250); // record window sized to the phrase
    S.recording = false;
    S.drawLiveDuringResponse = false;
    if (S.abort) break;

    // --- REVIEW (result after the attempt) ---
    S.phase = "REVIEW";
    const scores = scoreAttempt(S.trace, drill, S.tonicMidi, S.tolerance);
    S.showReviewPlot = reveal;
    if (reveal) {
      drawPlot({ review: true });
      renderScores(scores);
      status(`Round ${round} result`);
    } else {
      // retention round: no new feedback, but keep the last shown table
      drawPlot({});
      status(`Round ${round}: retention test — logged, not shown`);
    }
    await sleep(reveal ? 2600 : 1400);
  }

  S.holdReview = S.showReviewPlot; // leave the last revealed attempt on screen
  S.phase = "IDLE";
  status(S.abort ? "stopped" : "done");
  S.activeNote = -1;
  setControls(false);
}
