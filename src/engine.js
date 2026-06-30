// The drill engine: call-and-response, single attempt.
// PREPLAY -> count-in -> RESPONSE -> REVIEW.
// The concurrent live line is an opt-in toggle, not a stage.

import { S } from "./state.js";
import { stepMs, NOTE_GAP } from "./drills.js";
import { freqForDegree } from "./theory.js";
import { playTone, countTick, countGo, playGuideTone } from "./audio.js";
import { scoreAttempt } from "./scoring.js";
import { drawPlot } from "./render.js";
import { status, setControls, renderScores } from "./ui.js";
import { saveAttempt, renderHistory } from "./history.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Comfortable beat duration at default tempo — intentionally longer than the old
// 450 ms hardcode. Tempo scaling multiplies on top of this.
const COUNT_IN_STEP_MS = 750;

// Called from the render loop while S.recording is true.
export function sampleTrace() {
  S.trace.push({ t: performance.now() - S.recStart, f: S.currentFreq });
}

export async function runDrill() {
  S.abort = false;
  S.holdReview = false;
  setControls(true);

  const drill = S.currentDrill;

  // --- PREPLAY (the "call") ---
  S.phase = "PREPLAY";
  status("listen (watch the grid)");
  drawPlot({ preplay: true });
  for (let i = 0; i < drill.notes.length && !S.abort; i++) {
    S.activeNote = i;
    drawPlot({ preplay: true });
    await playTone(freqForDegree(drill.notes[i], S.tonicMidi), drill.noteDur * S.tempo);
    if (i < drill.notes.length - 1) await sleep(NOTE_GAP * S.tempo);
  }
  S.activeNote = -1;

  // --- count-in ---
  if (!S.abort) {
    for (const w of ["3", "2", "1", "GO"]) {
      status(w);
      if (w === "GO") await countGo(); else await countTick();
      await sleep(COUNT_IN_STEP_MS * S.tempo);
      if (S.abort) break;
    }
  }

  // --- RESPONSE (sing back; target + playhead shown if playheadEnabled; live pitch line if concurrentEnabled) ---
  if (!S.abort) {
    S.phase = "RESPONSE";
    S.drawLiveDuringResponse = S.concurrentEnabled;
    const recTotal = drill.notes.length * stepMs(drill) * S.tempo;
    S.trace = [];
    S.recElapsed = 0;
    S.recStart = performance.now();
    S.recording = true;
    if (S.guideTonesEnabled) {
      // Fire-and-forget: plays each target note in sync with the response window.
      // Non-blocking so the main await sleep(recTotal) continues uninterrupted.
      (async () => {
        for (let i = 0; i < drill.notes.length; i++) {
          if (!S.recording) break;
          if (i > 0) await sleep(stepMs(drill) * S.tempo);
          if (!S.recording) break;
          playGuideTone(freqForDegree(drill.notes[i], S.tonicMidi), drill.noteDur * S.tempo);
        }
      })();
    }
    status("singing…" + (S.drawLiveDuringResponse ? " (live line on)" : ""));
    drawPlot();
    await sleep(recTotal + 250);
    S.recording = false;
    S.drawLiveDuringResponse = false;
  }

  // --- REVIEW ---
  if (!S.abort) {
    S.phase = "REVIEW";
    const scores = scoreAttempt(S.trace, drill, S.tonicMidi, S.tolerance, S.tempo);
    drawPlot({ review: true });
    renderScores(scores);
    saveAttempt(scores, drill, S.tonicMidi);
    renderHistory();
    status("result");
    await sleep(2600);
    S.holdReview = true;
  }

  S.phase = "IDLE";
  status(S.abort ? "stopped" : "done");
  S.activeNote = -1;
  setControls(false);
}
