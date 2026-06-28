import { freqToName, midiToFreq } from "./theory.js";

const KEY = "pt_history";
const MAX = 50;
const TUNE = 15;
// Octave/harmonic detector glitches produce |mean| far beyond any real singing error.
// Notes past this threshold are excluded from stored averages and tallies only —
// the live display and per-attempt score table are never filtered.
const ARTIFACT_THRESHOLD = 80;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function persist(records) {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch {}
}

export function saveAttempt(scores, drill, tonicMidi) {
  const withMean = scores.filter((s) => s.mean != null);
  const usable = withMean.filter((s) => Math.abs(s.mean) <= ARTIFACT_THRESHOLD);
  const avgMean = usable.length
    ? Math.round(usable.reduce((a, s) => a + s.mean, 0) / usable.length)
    : null;
  const record = {
    ts: Date.now(),
    drill: drill.name,
    tonic: freqToName(midiToFreq(tonicMidi)),
    notes: scores.length,
    inTune: usable.filter((s) => Math.abs(s.mean) <= TUNE).length,
    flat: usable.filter((s) => s.mean < -TUNE).length,
    sharp: usable.filter((s) => s.mean > TUNE).length,
    avgMean,
  };
  const records = load();
  records.push(record);
  if (records.length > MAX) records.splice(0, records.length - MAX);
  persist(records);
}

export function clearHistory() {
  if (load().length === 0) return;
  try { localStorage.removeItem(KEY); } catch {}
  renderHistory();
}

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return (
    d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  );
}

export function renderHistory() {
  const list = document.getElementById("historyList");
  if (!list) return;
  const records = load();
  const btn = document.getElementById("clearHistBtn");
  if (btn) btn.disabled = records.length === 0;
  if (records.length === 0) {
    list.innerHTML = '<div class="hist-empty">No attempts yet.</div>';
    return;
  }
  list.innerHTML = records
    .slice()
    .reverse()
    .map((r) => {
      const parts = [
        r.inTune > 0 ? `<span class="good">${r.inTune}✓</span>` : "",
        r.flat > 0 ? `<span class="flat">${r.flat}♭</span>` : "",
        r.sharp > 0 ? `<span class="sharp">${r.sharp}♯</span>` : "",
      ]
        .filter(Boolean)
        .join(" ");
      const avg =
        r.avgMean != null
          ? ` · avg ${r.avgMean > 0 ? "+" : ""}${r.avgMean}c`
          : "";
      return `<div class="hist-row">
        <span class="hist-time">${formatTime(r.ts)}</span>
        <span class="hist-drill">${r.drill} · ${r.tonic}</span>
        <span class="hist-result">${parts || "—"}${avg}</span>
      </div>`;
    })
    .join("");
}
