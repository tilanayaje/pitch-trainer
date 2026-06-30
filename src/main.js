// Entry point: render loop, dropdown population, and all DOM wiring.

import { S } from "./state.js";
import { DRILLS } from "./drills.js";
import { freqToName, midiToFreq } from "./theory.js";
import { enableMic, disableMic, readPitch, micOnSound, micOffSound } from "./audio.js";
import { drawPlot } from "./render.js";
import { updateLiveTuner } from "./tuner.js";
import { runDrill, sampleTrace } from "./engine.js";
import { status } from "./ui.js";
import { renderHistory, clearHistory } from "./history.js";
import { makeKnob } from "./knob.js";

// --- render loop: runs only while the mic is on (started on enable, stops on disable) ---
function loop() {
  if (!S.micOn) return;
  readPitch();
  updateLiveTuner();
  if (S.recording) {
    sampleTrace();
    S.recElapsed = performance.now() - S.recStart;
  }
  if (S.phase === "RESPONSE") drawPlot();
  else if (S.phase === "REVIEW" || S.holdReview) drawPlot({ review: true });
  requestAnimationFrame(loop);
}

// --- drill dropdown ---
const drillSel = document.getElementById("drillSel");
for (const [k, v] of Object.entries(DRILLS)) {
  const o = document.createElement("option");
  o.value = k;
  o.textContent = v.name;
  drillSel.appendChild(o);
}
drillSel.value = "do_re_do";
drillSel.onchange = (e) => {
  S.holdReview = false;
  S.currentDrill = DRILLS[e.target.value];
  drawPlot({ preplay: true });
};

// --- tonic dropdown (C2..C4) ---
const tonicSel = document.getElementById("tonicSel");
for (let m = 36; m <= 60; m++) {
  const o = document.createElement("option");
  o.value = m;
  o.textContent = freqToName(midiToFreq(m));
  tonicSel.appendChild(o);
}
tonicSel.value = "48";
tonicSel.onchange = (e) => {
  S.holdReview = false;
  S.tonicMidi = +e.target.value;
  drawPlot({ preplay: true });
};

// --- rotary knobs ---
makeKnob(document.getElementById("tolKnob"), {
  min: 10, max: 100, step: 5, value: 50,
  onChange: (v) => { S.tolerance = v; },
  formatVal: (v) => `${v} ¢`,
});

makeKnob(document.getElementById("tempoKnob"), {
  min: 0.5, max: 1.5, step: 0.05, value: 1,
  onChange: (v) => { S.tempo = v; },
  formatVal: (v) => `${v.toFixed(2).replace(/0$/, "")}×`,
});

// --- toggle switches (checkboxes inside .sw; wiring is identical) ---
document.getElementById("concurrentChk").onchange  = (e) => { S.concurrentEnabled  = e.target.checked; };
document.getElementById("playheadChk").onchange    = (e) => { S.playheadEnabled    = e.target.checked; };
document.getElementById("guideTonesChk").onchange  = (e) => {
  S.guideTonesEnabled = e.target.checked;
  console.log("[guide-diag] 1. toggle onchange fired — guideTonesEnabled=", S.guideTonesEnabled);
};

// CRT power-off: white overlay retracts top-to-bottom into a thin line at the
// bottom edge, then snaps out. .face is always position:relative in CSS so no
// dynamic position toggling is needed here (that toggle caused the layout shift).
function crtCollapse() {
  const face = document.querySelector(".face");
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "absolute", inset: "0",
    background: "white",
    pointerEvents: "none",
    zIndex: "10",
    transformOrigin: "bottom center",
    animation: "crt-collapse 0.07s ease-in forwards",
  });
  face.appendChild(el);
  setTimeout(() => { if (face.contains(el)) face.removeChild(el); }, 200);
}

// --- mic toggle ---
document.getElementById("micBtn").onclick = async (e) => {
  if (S.phase !== "IDLE") return; // don't toggle mid-drill
  if (S.micOn) {
    disableMic();
    updateLiveTuner(); // reset the strobe to "no signal" (loop has stopped)
    e.target.textContent = "Enable mic";
    e.target.classList.remove("ghost");
    document.getElementById("micStateText").textContent = "mic off";
    document.getElementById("micLed").classList.remove("rled-on");
    document.getElementById("startBtn").disabled = true;
    // Sound and visual fire together ~350 ms after the click — the discharge
    // lag of a real amp/CRT after the switch is flipped.
    setTimeout(() => { micOffSound(); crtCollapse(); }, 350);
    return;
  }
  try {
    await enableMic();
    micOnSound();
    loop();
    e.target.textContent = "Turn mic off";
    e.target.classList.add("ghost");
    document.getElementById("micStateText").textContent = "mic on";
    document.getElementById("micLed").classList.add("rled-on");
    document.getElementById("startBtn").disabled = false;
    status("mic ready");
    drawPlot({ preplay: true });
  } catch (err) {
    status("mic error: " + err.message + " — serve over http://localhost, not file://");
  }
};

// --- start / stop ---
document.getElementById("startBtn").onclick = () => { if (S.phase === "IDLE") runDrill(); };
document.getElementById("stopBtn").onclick = () => { S.abort = true; S.recording = false; };

document.getElementById("clearHistBtn").onclick = clearHistory;

// --- first paint ---
drawPlot({ preplay: true });
renderHistory();
