import type { PatternNote, ScaleEntry, SegoviaPattern, Tonic, ScaleQuality } from './models';

// ──────────────────────────────────────────────────────────────────────────
// Pattern #1 — C Major, 2 octaves (C3 → C5). Starts and ends on the A string.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_1_ASCENDING: PatternNote[] = [
  { stringId: 5, fret: 3, finger: 2 },  // C3 — bottom tonic
  { stringId: 5, fret: 5, finger: 4 },  // D3
  { stringId: 4, fret: 2, finger: 1 },  // E3
  { stringId: 4, fret: 3, finger: 2 },  // F3
  { stringId: 4, fret: 5, finger: 4 },  // G3
  { stringId: 3, fret: 2, finger: 1 },  // A3
  { stringId: 3, fret: 4, finger: 3 },  // B3
  { stringId: 3, fret: 5, finger: 1 },  // C4 — shift to V
  { stringId: 3, fret: 7, finger: 3 },  // D4
  { stringId: 2, fret: 5, finger: 1 },  // E4
  { stringId: 2, fret: 6, finger: 2 },  // F4
  { stringId: 2, fret: 8, finger: 4 },  // G4
  { stringId: 1, fret: 5, finger: 1 },  // A4
  { stringId: 1, fret: 7, finger: 3 },  // B4
  { stringId: 1, fret: 8, finger: 4 },  // C5 — top tonic
];
const PATTERN_1_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 8, finger: 4 },  // C5
  { stringId: 1, fret: 7, finger: 3 },  // B4
  { stringId: 1, fret: 5, finger: 1 },  // A4
  { stringId: 2, fret: 8, finger: 4 },  // G4
  { stringId: 2, fret: 6, finger: 2 },  // F4
  { stringId: 2, fret: 5, finger: 1 },  // E4
  { stringId: 3, fret: 7, finger: 3 },  // D4
  { stringId: 3, fret: 5, finger: 1 },  // C4
  { stringId: 3, fret: 4, finger: 3 },  // B3 — shift back to II
  { stringId: 3, fret: 2, finger: 1 },  // A3
  { stringId: 4, fret: 5, finger: 4 },  // G3
  { stringId: 4, fret: 3, finger: 2 },  // F3
  { stringId: 4, fret: 2, finger: 1 },  // E3
  { stringId: 5, fret: 5, finger: 4 },  // D3
  { stringId: 5, fret: 3, finger: 2 },  // C3
];
export const PATTERN_1: SegoviaPattern = {
  id: 'pattern-1',
  label: 'Pattern #1',
  ascending: PATTERN_1_ASCENDING,
  descending: PATTERN_1_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #1 — D Major, 2 octaves (D3 → D5). Starts on A string, fret 5.
// Same shape as C Major Pattern #1, transposed up a step. Skips low E.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_1_D_ASCENDING: PatternNote[] = [
  { stringId: 5, fret: 5, finger: 2 },   // D3 — bottom tonic
  { stringId: 5, fret: 7, finger: 4 },   // E3
  { stringId: 4, fret: 4, finger: 1 },   // F#3
  { stringId: 4, fret: 5, finger: 2 },   // G3
  { stringId: 4, fret: 7, finger: 4 },   // A3
  { stringId: 3, fret: 4, finger: 1 },   // B3
  { stringId: 3, fret: 6, finger: 3 },   // C#4
  { stringId: 3, fret: 7, finger: 1 },   // D4 — shift to VII
  { stringId: 3, fret: 9, finger: 3 },   // E4
  { stringId: 2, fret: 7, finger: 1 },   // F#4
  { stringId: 2, fret: 8, finger: 2 },   // G4
  { stringId: 2, fret: 10, finger: 4 },  // A4
  { stringId: 1, fret: 7, finger: 1 },   // B4
  { stringId: 1, fret: 9, finger: 3 },   // C#5
  { stringId: 1, fret: 10, finger: 4 },  // D5 — top tonic
];
const PATTERN_1_D_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 10, finger: 4 },  // D5
  { stringId: 1, fret: 9, finger: 3 },   // C#5
  { stringId: 1, fret: 7, finger: 1 },   // B4
  { stringId: 2, fret: 10, finger: 4 },  // A4
  { stringId: 2, fret: 8, finger: 2 },   // G4
  { stringId: 2, fret: 7, finger: 1 },   // F#4
  { stringId: 3, fret: 9, finger: 3 },   // E4
  { stringId: 3, fret: 7, finger: 1 },   // D4
  { stringId: 3, fret: 6, finger: 3 },   // C#4 — shift back to IV
  { stringId: 3, fret: 4, finger: 1 },   // B3
  { stringId: 4, fret: 7, finger: 4 },   // A3
  { stringId: 4, fret: 5, finger: 2 },   // G3
  { stringId: 4, fret: 4, finger: 1 },   // F#3
  { stringId: 5, fret: 7, finger: 4 },   // E3
  { stringId: 5, fret: 5, finger: 2 },   // D3
];
export const PATTERN_1_D: SegoviaPattern = {
  id: 'pattern-1-d',
  label: 'Pattern #1',
  ascending: PATTERN_1_D_ASCENDING,
  descending: PATTERN_1_D_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #2 — A Melodic Minor, 3 octaves (A2 → A5). Starts low E fret 5.
// Ascending: melodic minor (raised 6 & 7). Descending: natural minor.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_2_A_ASCENDING: PatternNote[] = [
  { stringId: 6, fret: 5,  finger: 1 },  // A2 — bottom tonic
  { stringId: 6, fret: 7,  finger: 3 },  // B2
  { stringId: 6, fret: 8,  finger: 4 },  // C3
  { stringId: 5, fret: 5,  finger: 1 },  // D3
  { stringId: 5, fret: 7,  finger: 3 },  // E3
  { stringId: 5, fret: 9,  finger: 1 },  // F#3 — shift to IX
  { stringId: 5, fret: 11, finger: 3 },  // G#3
  { stringId: 5, fret: 12, finger: 4 },  // A3
  { stringId: 4, fret: 9,  finger: 1 },  // B3
  { stringId: 4, fret: 10, finger: 2 },  // C4
  { stringId: 4, fret: 12, finger: 4 },  // D4
  { stringId: 3, fret: 9,  finger: 1 },  // E4
  { stringId: 3, fret: 11, finger: 3 },  // F#4
  { stringId: 2, fret: 9,  finger: 1 },  // G#4
  { stringId: 2, fret: 10, finger: 1 },  // A4 — shift to X
  { stringId: 2, fret: 12, finger: 3 },  // B4
  { stringId: 2, fret: 13, finger: 4 },  // C5
  { stringId: 1, fret: 10, finger: 1 },  // D5
  { stringId: 1, fret: 12, finger: 3 },  // E5
  { stringId: 1, fret: 14, finger: 1 },  // F#5 — shift to XIV
  { stringId: 1, fret: 16, finger: 3 },  // G#5
  { stringId: 1, fret: 17, finger: 4 },  // A5 — top tonic
];
const PATTERN_2_A_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 17, finger: 4 },  // A5
  { stringId: 1, fret: 15, finger: 2 },  // G5
  { stringId: 1, fret: 13, finger: 4 },  // F5 — shift to X
  { stringId: 1, fret: 12, finger: 3 },  // E5
  { stringId: 1, fret: 10, finger: 1 },  // D5
  { stringId: 2, fret: 13, finger: 4 },  // C5
  { stringId: 2, fret: 12, finger: 3 },  // B4
  { stringId: 2, fret: 10, finger: 1 },  // A4
  { stringId: 3, fret: 12, finger: 3 },  // G4
  { stringId: 3, fret: 10, finger: 1 },  // F4
  { stringId: 3, fret: 9,  finger: 3 },  // E4 — shift to VII
  { stringId: 3, fret: 7,  finger: 1 },  // D4
  { stringId: 4, fret: 10, finger: 4 },  // C4
  { stringId: 4, fret: 9,  finger: 3 },  // B3
  { stringId: 4, fret: 7,  finger: 1 },  // A3
  { stringId: 5, fret: 10, finger: 4 },  // G3
  { stringId: 5, fret: 8,  finger: 2 },  // F3
  { stringId: 5, fret: 7,  finger: 1 },  // E3
  { stringId: 6, fret: 10, finger: 4 },  // D3
  { stringId: 6, fret: 8,  finger: 4 },  // C3 — shift to V
  { stringId: 6, fret: 7,  finger: 3 },  // B2
  { stringId: 6, fret: 5,  finger: 1 },  // A2
];
export const PATTERN_2_A: SegoviaPattern = {
  id: 'pattern-2-a',
  label: 'Pattern #2',
  ascending: PATTERN_2_A_ASCENDING,
  descending: PATTERN_2_A_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #2 — F# Melodic Minor, 3 octaves (F#2 → F#5). Starts low E fret 2.
// Same fingering shape as A Melodic Minor, transposed down 3 frets.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_2_FSHARP_ASCENDING: PatternNote[] = [
  { stringId: 6, fret: 2,  finger: 1 },  // F#2 — bottom tonic
  { stringId: 6, fret: 4,  finger: 3 },  // G#2
  { stringId: 6, fret: 5,  finger: 4 },  // A2
  { stringId: 5, fret: 2,  finger: 1 },  // B2
  { stringId: 5, fret: 4,  finger: 3 },  // C#3
  { stringId: 5, fret: 6,  finger: 1 },  // D#3 — shift to VI
  { stringId: 5, fret: 8,  finger: 3 },  // E#3 (= F3)
  { stringId: 5, fret: 9,  finger: 4 },  // F#3
  { stringId: 4, fret: 6,  finger: 1 },  // G#3
  { stringId: 4, fret: 7,  finger: 2 },  // A3
  { stringId: 4, fret: 9,  finger: 4 },  // B3
  { stringId: 3, fret: 6,  finger: 1 },  // C#4
  { stringId: 3, fret: 8,  finger: 3 },  // D#4
  { stringId: 2, fret: 6,  finger: 1 },  // E#4 (= F4)
  { stringId: 2, fret: 7,  finger: 1 },  // F#4 — shift to VII
  { stringId: 2, fret: 9,  finger: 3 },  // G#4
  { stringId: 2, fret: 10, finger: 4 },  // A4
  { stringId: 1, fret: 7,  finger: 1 },  // B4
  { stringId: 1, fret: 9,  finger: 3 },  // C#5
  { stringId: 1, fret: 11, finger: 1 },  // D#5 — shift to XI
  { stringId: 1, fret: 13, finger: 3 },  // E#5 (= F5)
  { stringId: 1, fret: 14, finger: 4 },  // F#5 — top tonic
];
const PATTERN_2_FSHARP_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 14, finger: 4 },  // F#5
  { stringId: 1, fret: 12, finger: 2 },  // E5
  { stringId: 1, fret: 10, finger: 4 },  // D5 — shift to VII
  { stringId: 1, fret: 9,  finger: 3 },  // C#5
  { stringId: 1, fret: 7,  finger: 1 },  // B4
  { stringId: 2, fret: 10, finger: 4 },  // A4
  { stringId: 2, fret: 9,  finger: 3 },  // G#4
  { stringId: 2, fret: 7,  finger: 1 },  // F#4
  { stringId: 3, fret: 9,  finger: 3 },  // E4
  { stringId: 3, fret: 7,  finger: 1 },  // D4
  { stringId: 3, fret: 6,  finger: 3 },  // C#4 — shift to IV
  { stringId: 3, fret: 4,  finger: 1 },  // B3
  { stringId: 4, fret: 7,  finger: 4 },  // A3
  { stringId: 4, fret: 6,  finger: 3 },  // G#3
  { stringId: 4, fret: 4,  finger: 1 },  // F#3
  { stringId: 5, fret: 7,  finger: 4 },  // E3
  { stringId: 5, fret: 5,  finger: 2 },  // D3
  { stringId: 5, fret: 4,  finger: 1 },  // C#3
  { stringId: 6, fret: 7,  finger: 4 },  // B2
  { stringId: 6, fret: 5,  finger: 4 },  // A2 — shift to II
  { stringId: 6, fret: 4,  finger: 3 },  // G#2
  { stringId: 6, fret: 2,  finger: 1 },  // F#2
];
export const PATTERN_2_FSHARP: SegoviaPattern = {
  id: 'pattern-2-fsharp',
  label: 'Pattern #2',
  ascending: PATTERN_2_FSHARP_ASCENDING,
  descending: PATTERN_2_FSHARP_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #3 — G Major, 3 octaves (G2 → G5). Starts low E fret 3.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_3_ASCENDING: PatternNote[] = [
  { stringId: 6, fret: 3,  finger: 2 },  // G2 — bottom tonic
  { stringId: 6, fret: 5,  finger: 4 },  // A2
  { stringId: 5, fret: 2,  finger: 1 },  // B2
  { stringId: 5, fret: 3,  finger: 2 },  // C3
  { stringId: 5, fret: 5,  finger: 4 },  // D3
  { stringId: 4, fret: 2,  finger: 1 },  // E3
  { stringId: 4, fret: 4,  finger: 3 },  // F#3
  { stringId: 4, fret: 5,  finger: 4 },  // G3
  { stringId: 3, fret: 2,  finger: 1 },  // A3
  { stringId: 3, fret: 4,  finger: 3 },  // B3
  { stringId: 3, fret: 5,  finger: 1 },  // C4 — shift to V
  { stringId: 3, fret: 7,  finger: 3 },  // D4
  { stringId: 2, fret: 5,  finger: 1 },  // E4
  { stringId: 2, fret: 7,  finger: 3 },  // F#4
  { stringId: 2, fret: 8,  finger: 4 },  // G4
  { stringId: 1, fret: 5,  finger: 1 },  // A4
  { stringId: 1, fret: 7,  finger: 3 },  // B4
  { stringId: 1, fret: 8,  finger: 1 },  // C5 — shift to VIII
  { stringId: 1, fret: 10, finger: 3 },  // D5
  { stringId: 1, fret: 12, finger: 1 },  // E5 — shift to XII
  { stringId: 1, fret: 14, finger: 3 },  // F#5
  { stringId: 1, fret: 15, finger: 4 },  // G5 — top tonic
];
const PATTERN_3_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 15, finger: 4 },  // G5
  { stringId: 1, fret: 14, finger: 3 },  // F#5
  { stringId: 1, fret: 12, finger: 1 },  // E5
  { stringId: 1, fret: 10, finger: 4 },  // D5 — shift to VII
  { stringId: 1, fret: 8,  finger: 2 },  // C5
  { stringId: 1, fret: 7,  finger: 1 },  // B4
  { stringId: 2, fret: 10, finger: 4 },  // A4
  { stringId: 2, fret: 8,  finger: 2 },  // G4
  { stringId: 2, fret: 7,  finger: 1 },  // F#4
  { stringId: 3, fret: 9,  finger: 3 },  // E4
  { stringId: 3, fret: 7,  finger: 1 },  // D4
  { stringId: 4, fret: 10, finger: 4 },  // C4
  { stringId: 4, fret: 9,  finger: 3 },  // B3
  { stringId: 4, fret: 7,  finger: 1 },  // A3
  { stringId: 5, fret: 10, finger: 4 },  // G3
  { stringId: 5, fret: 9,  finger: 3 },  // F#3
  { stringId: 5, fret: 7,  finger: 1 },  // E3
  { stringId: 5, fret: 5,  finger: 4 },  // D3 — shift to II
  { stringId: 5, fret: 3,  finger: 2 },  // C3
  { stringId: 5, fret: 2,  finger: 1 },  // B2
  { stringId: 6, fret: 5,  finger: 4 },  // A2
  { stringId: 6, fret: 3,  finger: 2 },  // G2
];
export const PATTERN_3: SegoviaPattern = {
  id: 'pattern-3',
  label: 'Pattern #3',
  ascending: PATTERN_3_ASCENDING,
  descending: PATTERN_3_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #3 — A Major, 3 octaves (A2 → A5). Starts low E fret 5.
// Same shape as G Major Pattern #3, transposed up 2 frets.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_3_A_ASCENDING: PatternNote[] = [
  { stringId: 6, fret: 5,  finger: 2 },  // A2 — bottom tonic
  { stringId: 6, fret: 7,  finger: 4 },  // B2
  { stringId: 5, fret: 4,  finger: 1 },  // C#3
  { stringId: 5, fret: 5,  finger: 2 },  // D3
  { stringId: 5, fret: 7,  finger: 4 },  // E3
  { stringId: 4, fret: 4,  finger: 1 },  // F#3
  { stringId: 4, fret: 6,  finger: 3 },  // G#3
  { stringId: 4, fret: 7,  finger: 4 },  // A3
  { stringId: 3, fret: 4,  finger: 1 },  // B3
  { stringId: 3, fret: 6,  finger: 3 },  // C#4
  { stringId: 3, fret: 7,  finger: 1 },  // D4 — shift to VII
  { stringId: 3, fret: 9,  finger: 3 },  // E4
  { stringId: 2, fret: 7,  finger: 1 },  // F#4
  { stringId: 2, fret: 9,  finger: 3 },  // G#4
  { stringId: 2, fret: 10, finger: 4 },  // A4
  { stringId: 1, fret: 7,  finger: 1 },  // B4
  { stringId: 1, fret: 9,  finger: 3 },  // C#5
  { stringId: 1, fret: 10, finger: 1 },  // D5 — shift to X
  { stringId: 1, fret: 12, finger: 3 },  // E5
  { stringId: 1, fret: 14, finger: 1 },  // F#5 — shift to XIV
  { stringId: 1, fret: 16, finger: 3 },  // G#5
  { stringId: 1, fret: 17, finger: 4 },  // A5 — top tonic
];
const PATTERN_3_A_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 17, finger: 4 },  // A5
  { stringId: 1, fret: 16, finger: 3 },  // G#5
  { stringId: 1, fret: 14, finger: 1 },  // F#5
  { stringId: 1, fret: 12, finger: 4 },  // E5 — shift to IX
  { stringId: 1, fret: 10, finger: 2 },  // D5
  { stringId: 1, fret: 9,  finger: 1 },  // C#5
  { stringId: 2, fret: 12, finger: 4 },  // B4
  { stringId: 2, fret: 10, finger: 2 },  // A4
  { stringId: 2, fret: 9,  finger: 1 },  // G#4
  { stringId: 3, fret: 11, finger: 3 },  // F#4
  { stringId: 3, fret: 9,  finger: 1 },  // E4
  { stringId: 4, fret: 12, finger: 4 },  // D4
  { stringId: 4, fret: 11, finger: 3 },  // C#4
  { stringId: 4, fret: 9,  finger: 1 },  // B3
  { stringId: 5, fret: 12, finger: 4 },  // A3
  { stringId: 5, fret: 11, finger: 3 },  // G#3
  { stringId: 5, fret: 9,  finger: 1 },  // F#3
  { stringId: 5, fret: 7,  finger: 4 },  // E3 — shift to IV
  { stringId: 5, fret: 5,  finger: 2 },  // D3
  { stringId: 5, fret: 4,  finger: 1 },  // C#3
  { stringId: 6, fret: 7,  finger: 4 },  // B2
  { stringId: 6, fret: 5,  finger: 2 },  // A2
];
export const PATTERN_3_A: SegoviaPattern = {
  id: 'pattern-3-a',
  label: 'Pattern #3',
  ascending: PATTERN_3_A_ASCENDING,
  descending: PATTERN_3_A_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #4 — E Melodic Minor, 3 octaves (E2 → E5). Starts on open low E.
// Bottom tonic is open E2; bottom of the descent returns to open E2.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_4_E_ASCENDING: PatternNote[] = [
  { stringId: 6, fret: 0,  finger: null }, // E2 (open) — bottom tonic
  { stringId: 6, fret: 2,  finger: 1 },    // F#2
  { stringId: 6, fret: 3,  finger: 2 },    // G2
  { stringId: 6, fret: 5,  finger: 4 },    // A2
  { stringId: 5, fret: 2,  finger: 1 },    // B2
  { stringId: 5, fret: 4,  finger: 3 },    // C#3
  { stringId: 5, fret: 6,  finger: 3 },    // D#3 — shift to IV
  { stringId: 5, fret: 7,  finger: 4 },    // E3
  { stringId: 4, fret: 4,  finger: 1 },    // F#3
  { stringId: 4, fret: 5,  finger: 2 },    // G3
  { stringId: 4, fret: 7,  finger: 4 },    // A3
  { stringId: 4, fret: 9,  finger: 2 },    // B3 — shift to VIII
  { stringId: 4, fret: 11, finger: 4 },    // C#4
  { stringId: 3, fret: 8,  finger: 1 },    // D#4
  { stringId: 3, fret: 9,  finger: 2 },    // E4
  { stringId: 3, fret: 11, finger: 4 },    // F#4
  { stringId: 2, fret: 8,  finger: 1 },    // G4
  { stringId: 2, fret: 10, finger: 3 },    // A4
  { stringId: 2, fret: 12, finger: 2 },    // B4 — shift to XI
  { stringId: 2, fret: 14, finger: 4 },    // C#5
  { stringId: 1, fret: 11, finger: 1 },    // D#5
  { stringId: 1, fret: 12, finger: 2 },    // E5 — top tonic
];
const PATTERN_4_E_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 12, finger: 2 },    // E5
  { stringId: 1, fret: 10, finger: 4 },    // D5 — shift to VII
  { stringId: 1, fret: 8,  finger: 2 },    // C5
  { stringId: 1, fret: 7,  finger: 1 },    // B4
  { stringId: 2, fret: 10, finger: 4 },    // A4
  { stringId: 2, fret: 8,  finger: 2 },    // G4
  { stringId: 2, fret: 7,  finger: 1 },    // F#4
  { stringId: 3, fret: 9,  finger: 3 },    // E4
  { stringId: 3, fret: 7,  finger: 1 },    // D4
  { stringId: 4, fret: 10, finger: 4 },    // C4
  { stringId: 4, fret: 9,  finger: 3 },    // B3
  { stringId: 4, fret: 7,  finger: 1 },    // A3
  { stringId: 5, fret: 10, finger: 4 },    // G3
  { stringId: 5, fret: 9,  finger: 3 },    // F#3
  { stringId: 5, fret: 7,  finger: 1 },    // E3
  { stringId: 5, fret: 5,  finger: 4 },    // D3 — shift to II
  { stringId: 5, fret: 3,  finger: 2 },    // C3
  { stringId: 5, fret: 2,  finger: 1 },    // B2
  { stringId: 6, fret: 5,  finger: 4 },    // A2
  { stringId: 6, fret: 3,  finger: 2 },    // G2
  { stringId: 6, fret: 2,  finger: 1 },    // F#2
  { stringId: 6, fret: 0,  finger: null }, // E2 (open) — bottom tonic
];
export const PATTERN_4_E: SegoviaPattern = {
  id: 'pattern-4-e',
  label: 'Pattern #4',
  ascending: PATTERN_4_E_ASCENDING,
  descending: PATTERN_4_E_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #5 — B Melodic Minor, 3 octaves (B2 → B5). Starts A string fret 2.
// Heavy use of the D string spanning multiple positions before crossing over.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_5_B_ASCENDING: PatternNote[] = [
  { stringId: 5, fret: 2,  finger: 1 },  // B2 — bottom tonic
  { stringId: 5, fret: 4,  finger: 3 },  // C#3
  { stringId: 5, fret: 5,  finger: 4 },  // D3
  { stringId: 4, fret: 2,  finger: 1 },  // E3
  { stringId: 4, fret: 4,  finger: 3 },  // F#3
  { stringId: 4, fret: 6,  finger: 1 },  // G#3 — shift to VI
  { stringId: 4, fret: 8,  finger: 3 },  // A#3
  { stringId: 4, fret: 9,  finger: 1 },  // B3 — shift to IX
  { stringId: 4, fret: 11, finger: 3 },  // C#4
  { stringId: 4, fret: 12, finger: 4 },  // D4
  { stringId: 3, fret: 9,  finger: 1 },  // E4
  { stringId: 3, fret: 11, finger: 3 },  // F#4
  { stringId: 2, fret: 9,  finger: 1 },  // G#4
  { stringId: 2, fret: 11, finger: 3 },  // A#4
  { stringId: 2, fret: 12, finger: 1 },  // B4 — shift to XII
  { stringId: 2, fret: 14, finger: 3 },  // C#5
  { stringId: 2, fret: 15, finger: 4 },  // D5
  { stringId: 1, fret: 12, finger: 1 },  // E5
  { stringId: 1, fret: 14, finger: 3 },  // F#5
  { stringId: 1, fret: 16, finger: 1 },  // G#5 — shift to XVI
  { stringId: 1, fret: 18, finger: 3 },  // A#5
  { stringId: 1, fret: 19, finger: 4 },  // B5 — top tonic
];
const PATTERN_5_B_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 19, finger: 4 },  // B5
  { stringId: 1, fret: 17, finger: 2 },  // A5
  { stringId: 1, fret: 15, finger: 4 },  // G5 — shift to XII
  { stringId: 1, fret: 14, finger: 3 },  // F#5
  { stringId: 1, fret: 12, finger: 1 },  // E5
  { stringId: 2, fret: 15, finger: 4 },  // D5
  { stringId: 2, fret: 14, finger: 3 },  // C#5
  { stringId: 2, fret: 12, finger: 1 },  // B4
  { stringId: 2, fret: 10, finger: 4 },  // A4 — shift to VII
  { stringId: 2, fret: 8,  finger: 2 },  // G4
  { stringId: 2, fret: 7,  finger: 1 },  // F#4
  { stringId: 2, fret: 5,  finger: 4 },  // E4 — shift to II
  { stringId: 2, fret: 3,  finger: 2 },  // D4
  { stringId: 2, fret: 2,  finger: 1 },  // C#4
  { stringId: 3, fret: 4,  finger: 3 },  // B3
  { stringId: 3, fret: 2,  finger: 1 },  // A3
  { stringId: 4, fret: 5,  finger: 4 },  // G3
  { stringId: 4, fret: 4,  finger: 3 },  // F#3
  { stringId: 4, fret: 2,  finger: 1 },  // E3
  { stringId: 5, fret: 5,  finger: 4 },  // D3 (slide-in from the D string)
  { stringId: 5, fret: 4,  finger: 3 },  // C#3
  { stringId: 5, fret: 2,  finger: 1 },  // B2
];
export const PATTERN_5_B: SegoviaPattern = {
  id: 'pattern-5-b',
  label: 'Pattern #5',
  ascending: PATTERN_5_B_ASCENDING,
  descending: PATTERN_5_B_DESCENDING,
};

const PATTERNS: SegoviaPattern[] = [
  PATTERN_1,
  PATTERN_1_D,
  PATTERN_2_A,
  PATTERN_2_FSHARP,
  PATTERN_3,
  PATTERN_3_A,
  PATTERN_4_E,
  PATTERN_5_B,
];

export function getPatternById(id: string): SegoviaPattern | undefined {
  return PATTERNS.find(p => p.id === id);
}

// Tonics ordered along the chromatic circle, with enharmonic spellings shown
// as separate entries so the dropdown can display the preferred spelling per
// scale family.
const ALL_TONICS: Tonic[] = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
  'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
];

// Map (quality, tonic) → patternId for the scales whose Segovia data is
// entered. Anything not listed here falls through to the pending sentinel.
const PATTERN_ASSIGNMENTS: Record<ScaleQuality, Partial<Record<Tonic, string>>> = {
  Major: {
    'C':  'pattern-1',
    'D':  'pattern-1-d',
    'G':  'pattern-3',
    'A':  'pattern-3-a',
  },
  MelodicMinor: {
    'A':  'pattern-2-a',
    'F#': 'pattern-2-fsharp',
    'E':  'pattern-4-e',
    'B':  'pattern-5-b',
  },
};

// Sentinel pattern ID for scales whose Segovia data hasn't been entered yet.
const PATTERN_PENDING_ID = 'pattern-pending';

const SCALES: ScaleEntry[] = [];

for (const quality of ['Major', 'MelodicMinor'] as ScaleQuality[]) {
  for (const tonic of ALL_TONICS) {
    const id = `${tonic.toLowerCase().replace('#', 'sharp')}-${quality.toLowerCase()}`;
    const assigned = PATTERN_ASSIGNMENTS[quality][tonic];
    SCALES.push({
      id,
      tonic,
      quality,
      patternId: assigned ?? PATTERN_PENDING_ID,
      enabled: assigned !== undefined,
    });
  }
}

export { SCALES };

export function getScaleById(id: string): ScaleEntry | undefined {
  return SCALES.find(s => s.id === id);
}

export function scaleLabel(s: ScaleEntry): string {
  const q = s.quality === 'Major' ? 'Major' : 'Melodic Minor';
  return `${s.tonic} ${q}`;
}

// Group scales by Segovia pattern *number* (the human-readable label) so that
// e.g. C Major and D Major both show under "Pattern #1" even though their
// underlying SegoviaPattern objects carry different absolute frets.
export interface ScaleGroup {
  patternId: string;       // stable key for trackBy; uses the label
  patternLabel: string;
  scales: ScaleEntry[];
}

export function scalesGroupedByPattern(quality: ScaleQuality): ScaleGroup[] {
  const groups = new Map<string, ScaleEntry[]>();
  const labelOrder: string[] = [];
  for (const s of SCALES) {
    if (s.quality !== quality) continue;
    const knownPattern = getPatternById(s.patternId);
    const label = knownPattern?.label ?? 'Coming soon';
    if (!groups.has(label)) labelOrder.push(label);
    const arr = groups.get(label) ?? [];
    arr.push(s);
    groups.set(label, arr);
  }
  // Sort labels: known Segovia patterns first (numeric order), then "Coming
  // soon" last. Scales within each group keep ALL_TONICS catalog order.
  labelOrder.sort((a, b) => {
    const aMatch = a.match(/#(\d+)/);
    const bMatch = b.match(/#(\d+)/);
    if (aMatch && bMatch) return Number(aMatch[1]) - Number(bMatch[1]);
    if (aMatch) return -1;
    if (bMatch) return 1;
    return a.localeCompare(b);
  });
  return labelOrder.map(label => ({
    patternId: label,
    patternLabel: label,
    scales: groups.get(label)!,
  }));
}
