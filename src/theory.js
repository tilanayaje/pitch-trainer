// Pure music-theory helpers

export const A4 = 440;
export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const midiToFreq = (m) => A4 * Math.pow(2, (m - 69) / 12);
export const freqToMidi = (f) => 69 + 12 * Math.log2(f / A4);

export function freqToName(f) {
  const m = Math.round(freqToMidi(f));
  return NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
}

// Deviation of f from a target pitch, in cents (100 cents = one semitone).
export const cents = (f, target) => 1200 * Math.log2(f / target);

// Movable-do solfège -> semitone offset from the tonic (major scale + a little above).
export const DEGREE = {
  do: 0, re: 2, mi: 4, fa: 5, so: 7, la: 9, ti: 11,
  "do'": 12, "re'": 14, "mi'": 16,
};

// Concrete frequency of a solfège degree for a given tonic (MIDI note number).
export const freqForDegree = (label, tonicMidi) => midiToFreq(tonicMidi + DEGREE[label]);
