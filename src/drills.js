// Drill library. A drill is one call-and-response phrase: an array of solfège
// degrees plus a per-note duration. Single-note drills get a long duration so the
// hold/sustain is what gets trained. Add new drills here — nothing else changes.

export const DRILLS = {
  single_do: { name: "do (sustain)",             notes: ["do"],                                       noteDur: 2500 },
  do_re_do:  { name: "do-re-do",                 notes: ["do", "re", "do"],                           noteDur: 800 },
  do_mi_do:  { name: "do-mi-do",                 notes: ["do", "mi", "do"],                           noteDur: 800 },
  do_fa_do:  { name: "do-fa-do",                 notes: ["do", "fa", "do"],                           noteDur: 800 },
  do_so_do:  { name: "do-so-do",                 notes: ["do", "so", "do"],                           noteDur: 800 },
  turn3:     { name: "do-re-mi-re-do",           notes: ["do", "re", "mi", "re", "do"],               noteDur: 700 },
  turn4:     { name: "do-re-mi-fa-mi-re-do",     notes: ["do", "re", "mi", "fa", "mi", "re", "do"],   noteDur: 650 },
  scale_up:  { name: "do-re-mi-fa-so-la-ti-do",  notes: ["do", "re", "mi", "fa", "so", "la", "ti", "do'"], noteDur: 600 },
};


// scoring trims TAIL_TRIM ms off each note's tail so the scoop toward the NEXT note
// can't pollute this note's hold statistics.
export const NOTE_GAP = 0;
export const TAIL_TRIM = 150; // ms excluded from hold stats at the end of each note (except the last)

export const stepMs = (drill) => drill.noteDur + NOTE_GAP;
