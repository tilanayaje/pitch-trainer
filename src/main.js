// Entry point: render loop, dropdown population, and all DOM wiring.

import { S } from "./state.js";
import { DRILLS } from "./drills.js";
import { DEGREE, freqForDegree, freqToName, midiToFreq } from "./theory.js";
import { enableMic, disableMic, readPitch, micOnSound, micOffSound, playTone } from "./audio.js";
import { drawPlot } from "./render.js";
import { updateLiveTuner } from "./tuner.js";
import { runDrill, sampleTrace } from "./engine.js";
import { status } from "./ui.js";
import { renderHistory, clearHistory } from "./history.js";
import { loadCustomDrills, saveCustomDrill, deleteCustomDrill } from "./customdrills.js";
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
const CATEGORY_ORDER = ["sustain", "steps", "leaps", "scales", "arpeggios"];
const CATEGORY_LABELS = { sustain: "Sustain", steps: "Steps", leaps: "Leaps", scales: "Scales", arpeggios: "Arpeggios" };
const truncOpt = (s, max = 35) => s.length > max ? s.slice(0, max - 1) + "…" : s;
for (const cat of CATEGORY_ORDER) {
  const group = document.createElement("optgroup");
  group.label = CATEGORY_LABELS[cat];
  for (const [k, v] of Object.entries(DRILLS)) {
    if (v.category === cat) {
      const o = document.createElement("option");
      o.value = k;
      o.textContent = truncOpt(v.name);
      group.appendChild(o);
    }
  }
  drillSel.appendChild(group);
}

let customDrills = loadCustomDrills();
const customGroup = document.createElement("optgroup");
customGroup.label = "Custom";
customGroup.hidden = customDrills.length === 0;
drillSel.appendChild(customGroup);

function syncCustomOptgroup() {
  customGroup.innerHTML = "";
  customDrills.forEach((d) => {
    const o = document.createElement("option");
    o.value = "__custom_" + d.id;
    o.textContent = truncOpt(d.name);
    customGroup.appendChild(o);
  });
  customGroup.hidden = customDrills.length === 0;
}
syncCustomOptgroup();

drillSel.value = "do_re_do";
drillSel.onchange = (e) => {
  S.holdReview = false;
  const val = e.target.value;
  if (val.startsWith("__custom_")) {
    const id = val.slice(9); // "__custom_".length === 9
    S.currentDrill = customDrills.find((d) => d.id === id) || S.currentDrill;
  } else {
    S.currentDrill = DRILLS[val];
  }
  drawPlot({ preplay: true });
};

// --- custom drill builder ---
const builderNotes = [];
let nameAutoFill = true;

function updateSeqDisplay() {
  const el = document.getElementById("seqDisplay");
  el.textContent = builderNotes.length ? builderNotes.join(" · ") : "—";
  if (nameAutoFill) {
    document.getElementById("drillName").value = builderNotes.join("-");
  }
}

Object.keys(DEGREE).forEach((deg) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "solfege-btn";
  btn.textContent = deg;
  btn.onclick = () => {
    builderNotes.push(deg);
    updateSeqDisplay();
    playTone(freqForDegree(deg, S.tonicMidi), 400).catch(() => {});
  };
  document.getElementById("solfegePad").appendChild(btn);
});

document.getElementById("seqUndo").onclick = () => { builderNotes.pop(); updateSeqDisplay(); };
document.getElementById("seqClear").onclick = () => {
  builderNotes.length = 0;
  nameAutoFill = true;
  updateSeqDisplay();
};
document.getElementById("drillName").addEventListener("input", () => { nameAutoFill = false; });

function setBuilderMsg(text, cls) {
  const el = document.getElementById("builderMsg");
  el.textContent = text;
  el.className = "builder-msg" + (cls ? " " + cls : "");
}

function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderCustomDrillList() {
  const el = document.getElementById("customDrillList");
  if (!customDrills.length) {
    el.innerHTML = '<div class="custom-empty">No custom drills saved.</div>';
    return;
  }
  el.innerHTML =
    '<div class="custom-list-head">Saved custom drills</div>' +
    customDrills
      .map(
        (d) =>
          `<div class="custom-item">` +
          `<span class="custom-item-name">${escHtml(d.name)}</span>` +
          `<button class="ghost custom-item-del" data-id="${d.id}">delete</button>` +
          `</div>`
      )
      .join("");
  el.querySelectorAll(".custom-item-del").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      customDrills = deleteCustomDrill(id);
      syncCustomOptgroup();
      if (drillSel.value === "__custom_" + id) {
        drillSel.value = "do_re_do";
        S.holdReview = false;
        S.currentDrill = DRILLS.do_re_do;
        drawPlot({ preplay: true });
      }
      renderCustomDrillList();
    };
  });
}

document.getElementById("saveDrillBtn").onclick = () => {
  const name = document.getElementById("drillName").value.trim();
  const noteDur = parseInt(document.getElementById("drillDur").value, 10);
  if (!name) { setBuilderMsg("Enter a drill name.", "err"); return; }
  if (builderNotes.length < 2) { setBuilderMsg("Add at least 2 notes.", "err"); return; }
  if (isNaN(noteDur) || noteDur < 200 || noteDur > 3000) {
    setBuilderMsg("Duration must be 200–3000 ms.", "err");
    return;
  }
  const drill = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    notes: [...builderNotes],
    noteDur,
  };
  customDrills = saveCustomDrill(drill);
  syncCustomOptgroup();
  drillSel.value = "__custom_" + drill.id;
  S.holdReview = false;
  S.currentDrill = drill;
  drawPlot({ preplay: true });
  builderNotes.length = 0;
  nameAutoFill = true;
  updateSeqDisplay();
  document.getElementById("drillName").value = "";
  setBuilderMsg(`"${name}" saved!`, "ok");
  renderCustomDrillList();
};

renderCustomDrillList();

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

// --- toggle persistence ---
const TOGGLE_KEY = "pt_toggles";
function loadToggles() {
  try { return JSON.parse(localStorage.getItem(TOGGLE_KEY) || "{}"); } catch { return {}; }
}
function saveToggles(patch) {
  try { localStorage.setItem(TOGGLE_KEY, JSON.stringify({ ...loadToggles(), ...patch })); } catch {}
}

// --- toggle switches: restore saved state then wire onchange ---
const savedToggles = loadToggles();
const concChk = document.getElementById("concurrentChk");
const playChk = document.getElementById("playheadChk");
const guidChk = document.getElementById("guideTonesChk");

if (savedToggles.concurrent != null) { concChk.checked = savedToggles.concurrent; S.concurrentEnabled  = savedToggles.concurrent; }
if (savedToggles.playhead   != null) { playChk.checked = savedToggles.playhead;   S.playheadEnabled    = savedToggles.playhead; }
if (savedToggles.guideTones != null) { guidChk.checked = savedToggles.guideTones; S.guideTonesEnabled  = savedToggles.guideTones; }

concChk.onchange = (e) => { S.concurrentEnabled  = e.target.checked; saveToggles({ concurrent: e.target.checked }); };
playChk.onchange = (e) => { S.playheadEnabled    = e.target.checked; saveToggles({ playhead:   e.target.checked }); };
guidChk.onchange = (e) => { S.guideTonesEnabled  = e.target.checked; saveToggles({ guideTones: e.target.checked }); };

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

document.getElementById("clearHistBtn").onclick = (e) => { e.stopPropagation(); clearHistory(); };

// --- first paint ---
drawPlot({ preplay: true });
renderHistory();
