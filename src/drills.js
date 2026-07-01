// Drill library. A drill is one call-and-response phrase: an array of solfège
// degrees plus a per-note duration. Single-note drills get a long duration so the
// hold/sustain is what gets trained. Add new drills here — nothing else changes.

export const DRILLS = {
  // --- sustain ---
  single_do:            { name: "do (sustain)",              notes: ["do"],                                            noteDur: 2500, category: "sustain"   },

  // --- ascending single leaps (tonic up to degree, back) ---
  do_re_do:             { name: "do-re-do",                  notes: ["do", "re", "do"],                                noteDur: 800,  category: "steps"     },
  do_mi_do:             { name: "do-mi-do",                  notes: ["do", "mi", "do"],                                noteDur: 800,  category: "leaps"     },
  do_fa_do:             { name: "do-fa-do",                  notes: ["do", "fa", "do"],                                noteDur: 800,  category: "leaps"     },
  do_so_do:             { name: "do-so-do",                  notes: ["do", "so", "do"],                                noteDur: 800,  category: "leaps"     },
  do_la_do:             { name: "do-la-do",                  notes: ["do", "la", "do"],                                noteDur: 800,  category: "leaps"     },
  do_ti_do:             { name: "do-ti-do",                  notes: ["do", "ti", "do"],                                noteDur: 800,  category: "leaps"     },
  do_oct_do:            { name: "do-do'-do",                 notes: ["do", "do'", "do"],                               noteDur: 800,  category: "leaps"     },

  // --- descending single leaps (from do' down to degree, back) ---
  do_prime_so_do_prime: { name: "do'-so-do'",                notes: ["do'", "so", "do'"],                              noteDur: 800,  category: "leaps"     },
  do_prime_fa_do_prime: { name: "do'-fa-do'",                notes: ["do'", "fa", "do'"],                              noteDur: 800,  category: "leaps"     },
  do_prime_mi_do_prime: { name: "do'-mi-do'",                notes: ["do'", "mi", "do'"],                              noteDur: 800,  category: "leaps"     },
  do_prime_re_do_prime: { name: "do'-re-do'",                notes: ["do'", "re", "do'"],                              noteDur: 800,  category: "leaps"     },

  // --- turns / agility ---
  turn3:                { name: "do-re-mi-re-do",            notes: ["do", "re", "mi", "re", "do"],                    noteDur: 700,  category: "steps"     },
  turn4:                { name: "do-re-mi-fa-mi-re-do",      notes: ["do", "re", "mi", "fa", "mi", "re", "do"],        noteDur: 650,  category: "steps"     },

  // --- 5-note runs ---
  run5_up:              { name: "do-re-mi-fa-so (run)",      notes: ["do", "re", "mi", "fa", "so"],                    noteDur: 650,  category: "steps"     },
  run5_down:            { name: "so-fa-mi-re-do (run)",      notes: ["so", "fa", "mi", "re", "do"],                    noteDur: 650,  category: "steps"     },

  // --- 6-note runs ---
  run6_up:              { name: "do-re-mi-fa-so-la (run)",   notes: ["do", "re", "mi", "fa", "so", "la"],              noteDur: 600,  category: "steps"     },
  run6_down:            { name: "la-so-fa-mi-re-do (run)",   notes: ["la", "so", "fa", "mi", "re", "do"],              noteDur: 600,  category: "steps"     },

  // --- scales ---
  scale_up:             { name: "do-re-mi-fa-so-la-ti-do'",  notes: ["do", "re", "mi", "fa", "so", "la", "ti", "do'"], noteDur: 600,  category: "scales"    },
  scale_down:           { name: "do'-ti-la-so-fa-mi-re-do",  notes: ["do'", "ti", "la", "so", "fa", "mi", "re", "do"], noteDur: 600,  category: "scales"    },

  // --- arpeggios ---
  arp_up:               { name: "do-mi-so-do' (arpeggio)",   notes: ["do", "mi", "so", "do'"],                         noteDur: 700,  category: "arpeggios" },
  arp_down:             { name: "do'-so-mi-do (arpeggio)",   notes: ["do'", "so", "mi", "do"],                         noteDur: 700,  category: "arpeggios" },

  // --- longer phrases (steps + leap) ---
  phrase_leap_step:     { name: "do-so-la-ti-do' (phrase)",  notes: ["do", "so", "la", "ti", "do'"],                   noteDur: 650,  category: "steps"     },
  phrase_step_leap:     { name: "do-re-mi-fa-do' (phrase)",  notes: ["do", "re", "mi", "fa", "do'"],                   noteDur: 650,  category: "steps"     },
};


// scoring trims TAIL_TRIM ms off each note's tail so the scoop toward the NEXT note
// can't pollute this note's hold statistics. ONSET_TRIM does the mirror job at the
// start: it excludes the scoop FROM the PREVIOUS note (audio buffer/acoustic latency
// blends old+new pitch right after a transition, which can trigger a false early land).
export const NOTE_GAP = 0;
export const TAIL_TRIM = 150;  // ms excluded from hold stats at the end of each note (except the last)
export const ONSET_TRIM = 50; // ms excluded from hold stats at the start of each note (except the first)

export const stepMs = (drill) => drill.noteDur + NOTE_GAP;
