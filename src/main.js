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

// --- settings ---
document.getElementById("tolInput").onchange = (e) => { S.tolerance = +e.target.value; };
document.getElementById("concurrentChk").onchange = (e) => { S.concurrentEnabled = e.target.checked; };
document.getElementById("playheadChk").onchange = (e) => { S.playheadEnabled = e.target.checked; };
const tempoVal = document.getElementById("tempoVal");
document.getElementById("tempoSlider").oninput = (e) => {
  S.tempo = +e.target.value;
  tempoVal.textContent = S.tempo.toFixed(2).replace(/0$/, "") + "×";
};

// Brief warm-noise burst over the tuner face — mimics a CRT/amp powering down.
function playStaticBurst() {
  const face = document.querySelector(".face");
  const W = face.clientWidth || 400;
  const H = face.clientHeight || 120;
  const SCALE = 4; // chunky phosphor pixels
  const cvs = document.createElement("canvas");
  cvs.width = Math.max(1, Math.ceil(W / SCALE));
  cvs.height = Math.max(1, Math.ceil(H / SCALE));
  Object.assign(cvs.style, {
    position: "absolute", inset: "0",
    width: "100%", height: "100%",
    pointerEvents: "none", opacity: "1",
    transition: "opacity 150ms ease-out",
    zIndex: "10", mixBlendMode: "screen",
    borderRadius: "10px", imageRendering: "pixelated",
  });
  const wasStatic = getComputedStyle(face).position === "static";
  if (wasStatic) face.style.position = "relative";
  face.appendChild(cvs);

  const ctx = cvs.getContext("2d");
  let animId;
  function drawNoise() {
    const img = ctx.createImageData(cvs.width, cvs.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const on = Math.random() > 0.38;
      const v = on ? ((Math.random() * 180 + 60) | 0) : 0;
      d[i] = v; d[i + 1] = (v * 0.72) | 0; d[i + 2] = (v * 0.35) | 0; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    animId = requestAnimationFrame(drawNoise);
  }
  drawNoise();

  setTimeout(() => {
    cancelAnimationFrame(animId);
    cvs.style.opacity = "0";
    setTimeout(() => {
      if (face.contains(cvs)) face.removeChild(cvs);
      if (wasStatic) face.style.position = "";
    }, 180);
  }, 80);
}

// --- mic toggle ---
document.getElementById("micBtn").onclick = async (e) => {
  if (S.phase !== "IDLE") return; // don't toggle mid-drill
  if (S.micOn) {
    micOffSound();
    playStaticBurst();
    disableMic();
    updateLiveTuner(); // reset the strobe to "no signal" (loop has stopped)
    e.target.textContent = "Enable mic";
    e.target.classList.remove("ghost");
    document.getElementById("micState").textContent = "mic off";
    document.getElementById("startBtn").disabled = true;
    status("mic off");
    return;
  }
  try {
    await enableMic();
    micOnSound();
    loop();
    e.target.textContent = "Turn mic off";
    e.target.classList.add("ghost");
    document.getElementById("micState").textContent = "mic on";
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
