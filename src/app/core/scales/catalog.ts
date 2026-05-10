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
// Pattern #1 — Db Major, 2 octaves (Db3 → Db5). Starts on A string, fret 4.
// Same shape as C Major Pattern #1, transposed up 1 fret. Skips low E.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_1_DFLAT_ASCENDING: PatternNote[] = [
  { stringId: 5, fret: 4,  finger: 2 },  // Db3 — bottom tonic
  { stringId: 5, fret: 6,  finger: 4 },  // Eb3
  { stringId: 4, fret: 3,  finger: 1 },  // F3
  { stringId: 4, fret: 4,  finger: 2 },  // Gb3
  { stringId: 4, fret: 6,  finger: 4 },  // Ab3
  { stringId: 3, fret: 3,  finger: 1 },  // Bb3
  { stringId: 3, fret: 5,  finger: 3 },  // C4
  { stringId: 3, fret: 6,  finger: 1 },  // Db4 — shift to VI
  { stringId: 3, fret: 8,  finger: 3 },  // Eb4
  { stringId: 2, fret: 6,  finger: 1 },  // F4
  { stringId: 2, fret: 7,  finger: 2 },  // Gb4
  { stringId: 2, fret: 9,  finger: 4 },  // Ab4
  { stringId: 1, fret: 6,  finger: 1 },  // Bb4
  { stringId: 1, fret: 8,  finger: 3 },  // C5
  { stringId: 1, fret: 9,  finger: 4 },  // Db5 — top tonic
];
const PATTERN_1_DFLAT_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 9,  finger: 4 },  // Db5
  { stringId: 1, fret: 8,  finger: 3 },  // C5
  { stringId: 1, fret: 6,  finger: 1 },  // Bb4
  { stringId: 2, fret: 9,  finger: 4 },  // Ab4
  { stringId: 2, fret: 7,  finger: 2 },  // Gb4
  { stringId: 2, fret: 6,  finger: 1 },  // F4
  { stringId: 3, fret: 8,  finger: 3 },  // Eb4
  { stringId: 3, fret: 6,  finger: 1 },  // Db4
  { stringId: 3, fret: 5,  finger: 3 },  // C4 — shift back to III
  { stringId: 3, fret: 3,  finger: 1 },  // Bb3
  { stringId: 4, fret: 6,  finger: 4 },  // Ab3
  { stringId: 4, fret: 4,  finger: 2 },  // Gb3
  { stringId: 4, fret: 3,  finger: 1 },  // F3
  { stringId: 5, fret: 6,  finger: 4 },  // Eb3
  { stringId: 5, fret: 4,  finger: 2 },  // Db3
];
export const PATTERN_1_DFLAT: SegoviaPattern = {
  id: 'pattern-1-dflat',
  label: 'Pattern #1',
  ascending: PATTERN_1_DFLAT_ASCENDING,
  descending: PATTERN_1_DFLAT_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #1 — Eb Major, 2 octaves (Eb3 → Eb5). Starts on A string, fret 6.
// Same shape as C Major Pattern #1, transposed up 3 frets. Skips low E.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_1_EFLAT_ASCENDING: PatternNote[] = [
  { stringId: 5, fret: 6,  finger: 2 },  // Eb3 — bottom tonic
  { stringId: 5, fret: 8,  finger: 4 },  // F3
  { stringId: 4, fret: 5,  finger: 1 },  // G3
  { stringId: 4, fret: 6,  finger: 2 },  // Ab3
  { stringId: 4, fret: 8,  finger: 4 },  // Bb3
  { stringId: 3, fret: 5,  finger: 1 },  // C4
  { stringId: 3, fret: 7,  finger: 3 },  // D4
  { stringId: 3, fret: 8,  finger: 1 },  // Eb4 — shift to VIII
  { stringId: 3, fret: 10, finger: 3 },  // F4
  { stringId: 2, fret: 8,  finger: 1 },  // G4
  { stringId: 2, fret: 9,  finger: 2 },  // Ab4
  { stringId: 2, fret: 11, finger: 4 },  // Bb4
  { stringId: 1, fret: 8,  finger: 1 },  // C5
  { stringId: 1, fret: 10, finger: 3 },  // D5
  { stringId: 1, fret: 11, finger: 4 },  // Eb5 — top tonic
];
const PATTERN_1_EFLAT_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 11, finger: 4 },  // Eb5
  { stringId: 1, fret: 10, finger: 3 },  // D5
  { stringId: 1, fret: 8,  finger: 1 },  // C5
  { stringId: 2, fret: 11, finger: 4 },  // Bb4
  { stringId: 2, fret: 9,  finger: 2 },  // Ab4
  { stringId: 2, fret: 8,  finger: 1 },  // G4
  { stringId: 3, fret: 10, finger: 3 },  // F4
  { stringId: 3, fret: 8,  finger: 1 },  // Eb4
  { stringId: 3, fret: 7,  finger: 3 },  // D4 — shift back to V
  { stringId: 3, fret: 5,  finger: 1 },  // C4
  { stringId: 4, fret: 8,  finger: 4 },  // Bb3
  { stringId: 4, fret: 6,  finger: 2 },  // Ab3
  { stringId: 4, fret: 5,  finger: 1 },  // G3
  { stringId: 5, fret: 8,  finger: 4 },  // F3
  { stringId: 5, fret: 6,  finger: 2 },  // Eb3
];
export const PATTERN_1_EFLAT: SegoviaPattern = {
  id: 'pattern-1-eflat',
  label: 'Pattern #1',
  ascending: PATTERN_1_EFLAT_ASCENDING,
  descending: PATTERN_1_EFLAT_DESCENDING,
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
// Pattern #2 — G# Melodic Minor, 3 octaves (G#2 → G#5). Starts low E fret 4.
// Same shape as A Melodic Minor Pattern #2, transposed down 1 fret.
// Ascending raises 6 (E→E#) and 7 (F#→F##/G); descending is natural minor.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_2_GSHARP_ASCENDING: PatternNote[] = [
  { stringId: 6, fret: 4,  finger: 1 },  // G#2 — bottom tonic
  { stringId: 6, fret: 6,  finger: 3 },  // A#2
  { stringId: 6, fret: 7,  finger: 4 },  // B2
  { stringId: 5, fret: 4,  finger: 1 },  // C#3
  { stringId: 5, fret: 6,  finger: 3 },  // D#3
  { stringId: 5, fret: 8,  finger: 1 },  // E#3 (= F3) — shift to VIII
  { stringId: 5, fret: 10, finger: 3 },  // F##3 (= G3)
  { stringId: 5, fret: 11, finger: 4 },  // G#3
  { stringId: 4, fret: 8,  finger: 1 },  // A#3
  { stringId: 4, fret: 9,  finger: 2 },  // B3
  { stringId: 4, fret: 11, finger: 4 },  // C#4
  { stringId: 3, fret: 8,  finger: 1 },  // D#4
  { stringId: 3, fret: 10, finger: 3 },  // E#4 (= F4)
  { stringId: 2, fret: 8,  finger: 1 },  // F##4 (= G4)
  { stringId: 2, fret: 9,  finger: 1 },  // G#4 — shift to IX
  { stringId: 2, fret: 11, finger: 3 },  // A#4
  { stringId: 2, fret: 12, finger: 4 },  // B4
  { stringId: 1, fret: 9,  finger: 1 },  // C#5
  { stringId: 1, fret: 11, finger: 3 },  // D#5
  { stringId: 1, fret: 13, finger: 1 },  // E#5 (= F5) — shift to XIII
  { stringId: 1, fret: 15, finger: 3 },  // F##5 (= G5)
  { stringId: 1, fret: 16, finger: 4 },  // G#5 — top tonic
];
const PATTERN_2_GSHARP_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 16, finger: 4 },  // G#5
  { stringId: 1, fret: 14, finger: 2 },  // F#5
  { stringId: 1, fret: 12, finger: 4 },  // E5 — shift to IX
  { stringId: 1, fret: 11, finger: 3 },  // D#5
  { stringId: 1, fret: 9,  finger: 1 },  // C#5
  { stringId: 2, fret: 12, finger: 4 },  // B4
  { stringId: 2, fret: 11, finger: 3 },  // A#4
  { stringId: 2, fret: 9,  finger: 1 },  // G#4
  { stringId: 3, fret: 11, finger: 3 },  // F#4
  { stringId: 3, fret: 9,  finger: 1 },  // E4
  { stringId: 3, fret: 8,  finger: 3 },  // D#4 — shift to VI
  { stringId: 3, fret: 6,  finger: 1 },  // C#4
  { stringId: 4, fret: 9,  finger: 4 },  // B3
  { stringId: 4, fret: 8,  finger: 3 },  // A#3
  { stringId: 4, fret: 6,  finger: 1 },  // G#3
  { stringId: 5, fret: 9,  finger: 4 },  // F#3
  { stringId: 5, fret: 7,  finger: 2 },  // E3
  { stringId: 5, fret: 6,  finger: 1 },  // D#3
  { stringId: 6, fret: 9,  finger: 4 },  // C#3
  { stringId: 6, fret: 7,  finger: 4 },  // B2 — shift to IV
  { stringId: 6, fret: 6,  finger: 3 },  // A#2
  { stringId: 6, fret: 4,  finger: 1 },  // G#2
];
export const PATTERN_2_GSHARP: SegoviaPattern = {
  id: 'pattern-2-gsharp',
  label: 'Pattern #2',
  ascending: PATTERN_2_GSHARP_ASCENDING,
  descending: PATTERN_2_GSHARP_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #2 — F Melodic Minor, 3 octaves (F2 → F5). Starts low E fret 1.
// Same shape as A Melodic Minor Pattern #2, transposed down 4 frets.
// Ascending raises 6 (Db→D) and 7 (Eb→E); descending is natural minor.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_2_F_ASCENDING: PatternNote[] = [
  { stringId: 6, fret: 1,  finger: 1 },  // F2 — bottom tonic
  { stringId: 6, fret: 3,  finger: 3 },  // G2
  { stringId: 6, fret: 4,  finger: 4 },  // Ab2
  { stringId: 5, fret: 1,  finger: 1 },  // Bb2
  { stringId: 5, fret: 3,  finger: 3 },  // C3
  { stringId: 5, fret: 5,  finger: 1 },  // D3 — shift to V
  { stringId: 5, fret: 7,  finger: 3 },  // E3
  { stringId: 5, fret: 8,  finger: 4 },  // F3
  { stringId: 4, fret: 5,  finger: 1 },  // G3
  { stringId: 4, fret: 6,  finger: 2 },  // Ab3
  { stringId: 4, fret: 8,  finger: 4 },  // Bb3
  { stringId: 3, fret: 5,  finger: 1 },  // C4
  { stringId: 3, fret: 7,  finger: 3 },  // D4
  { stringId: 2, fret: 5,  finger: 1 },  // E4
  { stringId: 2, fret: 6,  finger: 1 },  // F4 — shift to VI
  { stringId: 2, fret: 8,  finger: 3 },  // G4
  { stringId: 2, fret: 9,  finger: 4 },  // Ab4
  { stringId: 1, fret: 6,  finger: 1 },  // Bb4
  { stringId: 1, fret: 8,  finger: 3 },  // C5
  { stringId: 1, fret: 10, finger: 1 },  // D5 — shift to X
  { stringId: 1, fret: 12, finger: 3 },  // E5
  { stringId: 1, fret: 13, finger: 4 },  // F5 — top tonic
];
const PATTERN_2_F_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 13, finger: 4 },  // F5
  { stringId: 1, fret: 11, finger: 2 },  // Eb5
  { stringId: 1, fret: 9,  finger: 4 },  // Db5 — shift to VI
  { stringId: 1, fret: 8,  finger: 3 },  // C5
  { stringId: 1, fret: 6,  finger: 1 },  // Bb4
  { stringId: 2, fret: 9,  finger: 4 },  // Ab4
  { stringId: 2, fret: 8,  finger: 3 },  // G4
  { stringId: 2, fret: 6,  finger: 1 },  // F4
  { stringId: 3, fret: 8,  finger: 3 },  // Eb4
  { stringId: 3, fret: 6,  finger: 1 },  // Db4
  { stringId: 3, fret: 5,  finger: 3 },  // C4 — shift to III
  { stringId: 3, fret: 3,  finger: 1 },  // Bb3
  { stringId: 4, fret: 6,  finger: 4 },  // Ab3
  { stringId: 4, fret: 5,  finger: 3 },  // G3
  { stringId: 4, fret: 3,  finger: 1 },  // F3
  { stringId: 5, fret: 6,  finger: 4 },  // Eb3
  { stringId: 5, fret: 4,  finger: 2 },  // Db3
  { stringId: 5, fret: 3,  finger: 1 },  // C3
  { stringId: 6, fret: 6,  finger: 4 },  // Bb2
  { stringId: 6, fret: 4,  finger: 4 },  // Ab2 — shift to I
  { stringId: 6, fret: 3,  finger: 3 },  // G2
  { stringId: 6, fret: 1,  finger: 1 },  // F2
];
export const PATTERN_2_F: SegoviaPattern = {
  id: 'pattern-2-f',
  label: 'Pattern #2',
  ascending: PATTERN_2_F_ASCENDING,
  descending: PATTERN_2_F_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #2 — G Melodic Minor, 3 octaves (G2 → G5). Starts low E fret 3.
// Same shape as A Melodic Minor Pattern #2, transposed down 2 frets.
// Ascending raises 6 (Eb→E) and 7 (F→F#); descending is natural minor.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_2_G_ASCENDING: PatternNote[] = [
  { stringId: 6, fret: 3,  finger: 1 },  // G2 — bottom tonic
  { stringId: 6, fret: 5,  finger: 3 },  // A2
  { stringId: 6, fret: 6,  finger: 4 },  // Bb2
  { stringId: 5, fret: 3,  finger: 1 },  // C3
  { stringId: 5, fret: 5,  finger: 3 },  // D3
  { stringId: 5, fret: 7,  finger: 1 },  // E3 — shift to VII
  { stringId: 5, fret: 9,  finger: 3 },  // F#3
  { stringId: 5, fret: 10, finger: 4 },  // G3
  { stringId: 4, fret: 7,  finger: 1 },  // A3
  { stringId: 4, fret: 8,  finger: 2 },  // Bb3
  { stringId: 4, fret: 10, finger: 4 },  // C4
  { stringId: 3, fret: 7,  finger: 1 },  // D4
  { stringId: 3, fret: 9,  finger: 3 },  // E4
  { stringId: 2, fret: 7,  finger: 1 },  // F#4
  { stringId: 2, fret: 8,  finger: 1 },  // G4 — shift to VIII
  { stringId: 2, fret: 10, finger: 3 },  // A4
  { stringId: 2, fret: 11, finger: 4 },  // Bb4
  { stringId: 1, fret: 8,  finger: 1 },  // C5
  { stringId: 1, fret: 10, finger: 3 },  // D5
  { stringId: 1, fret: 12, finger: 1 },  // E5 — shift to XII
  { stringId: 1, fret: 14, finger: 3 },  // F#5
  { stringId: 1, fret: 15, finger: 4 },  // G5 — top tonic
];
const PATTERN_2_G_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 15, finger: 4 },  // G5
  { stringId: 1, fret: 13, finger: 2 },  // F5
  { stringId: 1, fret: 11, finger: 4 },  // Eb5 — shift to VIII
  { stringId: 1, fret: 10, finger: 3 },  // D5
  { stringId: 1, fret: 8,  finger: 1 },  // C5
  { stringId: 2, fret: 11, finger: 4 },  // Bb4
  { stringId: 2, fret: 10, finger: 3 },  // A4
  { stringId: 2, fret: 8,  finger: 1 },  // G4
  { stringId: 3, fret: 10, finger: 3 },  // F4
  { stringId: 3, fret: 8,  finger: 1 },  // Eb4
  { stringId: 3, fret: 7,  finger: 3 },  // D4 — shift to V
  { stringId: 3, fret: 5,  finger: 1 },  // C4
  { stringId: 4, fret: 8,  finger: 4 },  // Bb3
  { stringId: 4, fret: 7,  finger: 3 },  // A3
  { stringId: 4, fret: 5,  finger: 1 },  // G3
  { stringId: 5, fret: 8,  finger: 4 },  // F3
  { stringId: 5, fret: 6,  finger: 2 },  // Eb3
  { stringId: 5, fret: 5,  finger: 1 },  // D3
  { stringId: 6, fret: 8,  finger: 4 },  // C3
  { stringId: 6, fret: 6,  finger: 4 },  // Bb2 — shift to III
  { stringId: 6, fret: 5,  finger: 3 },  // A2
  { stringId: 6, fret: 3,  finger: 1 },  // G2
];
export const PATTERN_2_G: SegoviaPattern = {
  id: 'pattern-2-g',
  label: 'Pattern #2',
  ascending: PATTERN_2_G_ASCENDING,
  descending: PATTERN_2_G_DESCENDING,
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
// Pattern #6 — E Major, 3 octaves (E2 → E5). Starts on open low E.
// Open-position variant: ascending packs six notes onto the low E string
// before jumping to position VI; descending unwinds the same way.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_6_E_ASCENDING: PatternNote[] = [
  { stringId: 6, fret: 0,  finger: null }, // E2 (open) — bottom tonic
  { stringId: 6, fret: 2,  finger: 1 },    // F#2
  { stringId: 6, fret: 4,  finger: 3 },    // G#2
  { stringId: 6, fret: 5,  finger: 4 },    // A2
  { stringId: 6, fret: 7,  finger: 2 },    // B2 — shift to VI
  { stringId: 6, fret: 9,  finger: 4 },    // C#3
  { stringId: 5, fret: 6,  finger: 1 },    // D#3
  { stringId: 5, fret: 7,  finger: 2 },    // E3
  { stringId: 5, fret: 9,  finger: 4 },    // F#3
  { stringId: 4, fret: 6,  finger: 1 },    // G#3
  { stringId: 4, fret: 7,  finger: 2 },    // A3
  { stringId: 4, fret: 9,  finger: 4 },    // B3
  { stringId: 3, fret: 6,  finger: 1 },    // C#4
  { stringId: 3, fret: 8,  finger: 3 },    // D#4
  { stringId: 3, fret: 9,  finger: 1 },    // E4 — shift to IX
  { stringId: 3, fret: 11, finger: 3 },    // F#4
  { stringId: 2, fret: 9,  finger: 1 },    // G#4
  { stringId: 2, fret: 10, finger: 2 },    // A4
  { stringId: 2, fret: 12, finger: 4 },    // B4
  { stringId: 1, fret: 9,  finger: 1 },    // C#5
  { stringId: 1, fret: 11, finger: 3 },    // D#5
  { stringId: 1, fret: 12, finger: 4 },    // E5 — top tonic
];
const PATTERN_6_E_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 12, finger: 4 },    // E5
  { stringId: 1, fret: 11, finger: 3 },    // D#5
  { stringId: 1, fret: 9,  finger: 1 },    // C#5
  { stringId: 1, fret: 7,  finger: 4 },    // B4 — shift to IV
  { stringId: 1, fret: 5,  finger: 2 },    // A4
  { stringId: 1, fret: 4,  finger: 1 },    // G#4
  { stringId: 2, fret: 7,  finger: 4 },    // F#4
  { stringId: 2, fret: 5,  finger: 2 },    // E4
  { stringId: 2, fret: 4,  finger: 1 },    // D#4
  { stringId: 3, fret: 6,  finger: 1 },    // C#4
  { stringId: 3, fret: 4,  finger: 3 },    // B3 — shift to II
  { stringId: 4, fret: 7,  finger: 4 },    // A3
  { stringId: 4, fret: 6,  finger: 3 },    // G#3
  { stringId: 4, fret: 4,  finger: 1 },    // F#3
  { stringId: 5, fret: 7,  finger: 4 },    // E3
  { stringId: 5, fret: 6,  finger: 3 },    // D#3
  { stringId: 5, fret: 4,  finger: 1 },    // C#3
  { stringId: 5, fret: 2,  finger: 1 },    // B2 — shift to II
  { stringId: 6, fret: 5,  finger: 4 },    // A2
  { stringId: 6, fret: 4,  finger: 3 },    // G#2
  { stringId: 6, fret: 2,  finger: 1 },    // F#2
  { stringId: 6, fret: 0,  finger: null }, // E2 (open) — bottom tonic
];
export const PATTERN_6_E: SegoviaPattern = {
  id: 'pattern-6-e',
  label: 'Pattern #6',
  ascending: PATTERN_6_E_ASCENDING,
  descending: PATTERN_6_E_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #3 — B Major, 3 octaves (B2 → B5). Starts low E fret 7.
// Same shape as G Major Pattern #3, transposed up 4 frets.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_3_B_ASCENDING: PatternNote[] = [
  { stringId: 6, fret: 7,  finger: 2 },  // B2 — bottom tonic
  { stringId: 6, fret: 9,  finger: 4 },  // C#3
  { stringId: 5, fret: 6,  finger: 1 },  // D#3
  { stringId: 5, fret: 7,  finger: 2 },  // E3
  { stringId: 5, fret: 9,  finger: 4 },  // F#3
  { stringId: 4, fret: 6,  finger: 1 },  // G#3
  { stringId: 4, fret: 8,  finger: 3 },  // A#3
  { stringId: 4, fret: 9,  finger: 4 },  // B3
  { stringId: 3, fret: 6,  finger: 1 },  // C#4
  { stringId: 3, fret: 8,  finger: 3 },  // D#4
  { stringId: 3, fret: 9,  finger: 1 },  // E4 — shift to IX
  { stringId: 3, fret: 11, finger: 3 },  // F#4
  { stringId: 2, fret: 9,  finger: 1 },  // G#4
  { stringId: 2, fret: 11, finger: 3 },  // A#4
  { stringId: 2, fret: 12, finger: 4 },  // B4
  { stringId: 1, fret: 9,  finger: 1 },  // C#5
  { stringId: 1, fret: 11, finger: 3 },  // D#5
  { stringId: 1, fret: 12, finger: 1 },  // E5 — shift to XII
  { stringId: 1, fret: 14, finger: 3 },  // F#5
  { stringId: 1, fret: 16, finger: 1 },  // G#5 — shift to XVI
  { stringId: 1, fret: 18, finger: 3 },  // A#5
  { stringId: 1, fret: 19, finger: 4 },  // B5 — top tonic
];
const PATTERN_3_B_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 19, finger: 4 },  // B5
  { stringId: 1, fret: 18, finger: 3 },  // A#5
  { stringId: 1, fret: 16, finger: 1 },  // G#5
  { stringId: 1, fret: 14, finger: 4 },  // F#5 — shift to XI
  { stringId: 1, fret: 12, finger: 2 },  // E5
  { stringId: 1, fret: 11, finger: 1 },  // D#5
  { stringId: 2, fret: 14, finger: 4 },  // C#5
  { stringId: 2, fret: 12, finger: 2 },  // B4
  { stringId: 2, fret: 11, finger: 1 },  // A#4
  { stringId: 3, fret: 13, finger: 3 },  // G#4
  { stringId: 3, fret: 11, finger: 1 },  // F#4
  { stringId: 4, fret: 14, finger: 4 },  // E4
  { stringId: 4, fret: 13, finger: 3 },  // D#4
  { stringId: 4, fret: 11, finger: 1 },  // C#4
  { stringId: 5, fret: 14, finger: 4 },  // B3
  { stringId: 5, fret: 13, finger: 3 },  // A#3
  { stringId: 5, fret: 11, finger: 1 },  // G#3
  { stringId: 5, fret: 9,  finger: 4 },  // F#3 — shift to VI
  { stringId: 5, fret: 7,  finger: 2 },  // E3
  { stringId: 5, fret: 6,  finger: 1 },  // D#3
  { stringId: 6, fret: 9,  finger: 4 },  // C#3
  { stringId: 6, fret: 7,  finger: 2 },  // B2
];
export const PATTERN_3_B: SegoviaPattern = {
  id: 'pattern-3-b',
  label: 'Pattern #3',
  ascending: PATTERN_3_B_ASCENDING,
  descending: PATTERN_3_B_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #3 — F# Major, 3 octaves (F#2 → F#5). Starts low E fret 2.
// Same shape as G Major Pattern #3, transposed down 1 fret.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_3_FSHARP_ASCENDING: PatternNote[] = [
  { stringId: 6, fret: 2,  finger: 2 },  // F#2 — bottom tonic
  { stringId: 6, fret: 4,  finger: 4 },  // G#2
  { stringId: 5, fret: 1,  finger: 1 },  // A#2
  { stringId: 5, fret: 2,  finger: 2 },  // B2
  { stringId: 5, fret: 4,  finger: 4 },  // C#3
  { stringId: 4, fret: 1,  finger: 1 },  // D#3
  { stringId: 4, fret: 3,  finger: 3 },  // E#3 (= F3)
  { stringId: 4, fret: 4,  finger: 4 },  // F#3
  { stringId: 3, fret: 1,  finger: 1 },  // G#3
  { stringId: 3, fret: 3,  finger: 3 },  // A#3
  { stringId: 3, fret: 4,  finger: 1 },  // B3 — shift to IV
  { stringId: 3, fret: 6,  finger: 3 },  // C#4
  { stringId: 2, fret: 4,  finger: 1 },  // D#4
  { stringId: 2, fret: 6,  finger: 3 },  // E#4 (= F4)
  { stringId: 2, fret: 7,  finger: 4 },  // F#4
  { stringId: 1, fret: 4,  finger: 1 },  // G#4
  { stringId: 1, fret: 6,  finger: 3 },  // A#4
  { stringId: 1, fret: 7,  finger: 1 },  // B4 — shift to VII
  { stringId: 1, fret: 9,  finger: 3 },  // C#5
  { stringId: 1, fret: 11, finger: 1 },  // D#5 — shift to XI
  { stringId: 1, fret: 13, finger: 3 },  // E#5 (= F5)
  { stringId: 1, fret: 14, finger: 4 },  // F#5 — top tonic
];
const PATTERN_3_FSHARP_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 14, finger: 4 },  // F#5
  { stringId: 1, fret: 13, finger: 3 },  // E#5
  { stringId: 1, fret: 11, finger: 1 },  // D#5
  { stringId: 1, fret: 9,  finger: 4 },  // C#5 — shift to VI
  { stringId: 1, fret: 7,  finger: 2 },  // B4
  { stringId: 1, fret: 6,  finger: 1 },  // A#4
  { stringId: 2, fret: 9,  finger: 4 },  // G#4
  { stringId: 2, fret: 7,  finger: 2 },  // F#4
  { stringId: 2, fret: 6,  finger: 1 },  // E#4
  { stringId: 3, fret: 8,  finger: 3 },  // D#4
  { stringId: 3, fret: 6,  finger: 1 },  // C#4
  { stringId: 4, fret: 9,  finger: 4 },  // B3
  { stringId: 4, fret: 8,  finger: 3 },  // A#3
  { stringId: 4, fret: 6,  finger: 1 },  // G#3
  { stringId: 5, fret: 9,  finger: 4 },  // F#3
  { stringId: 5, fret: 8,  finger: 3 },  // E#3
  { stringId: 5, fret: 6,  finger: 1 },  // D#3
  { stringId: 5, fret: 4,  finger: 4 },  // C#3 — shift to I
  { stringId: 5, fret: 2,  finger: 2 },  // B2
  { stringId: 5, fret: 1,  finger: 1 },  // A#2
  { stringId: 6, fret: 4,  finger: 4 },  // G#2
  { stringId: 6, fret: 2,  finger: 2 },  // F#2
];
export const PATTERN_3_FSHARP: SegoviaPattern = {
  id: 'pattern-3-fsharp',
  label: 'Pattern #3',
  ascending: PATTERN_3_FSHARP_ASCENDING,
  descending: PATTERN_3_FSHARP_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #3 — Ab Major, 3 octaves (Ab2 → Ab5). Starts low E fret 4.
// Same shape as G Major Pattern #3, transposed up 1 fret.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_3_AFLAT_ASCENDING: PatternNote[] = [
  { stringId: 6, fret: 4,  finger: 2 },  // Ab2 — bottom tonic
  { stringId: 6, fret: 6,  finger: 4 },  // Bb2
  { stringId: 5, fret: 3,  finger: 1 },  // C3
  { stringId: 5, fret: 4,  finger: 2 },  // Db3
  { stringId: 5, fret: 6,  finger: 4 },  // Eb3
  { stringId: 4, fret: 3,  finger: 1 },  // F3
  { stringId: 4, fret: 5,  finger: 3 },  // G3
  { stringId: 4, fret: 6,  finger: 4 },  // Ab3
  { stringId: 3, fret: 3,  finger: 1 },  // Bb3
  { stringId: 3, fret: 5,  finger: 3 },  // C4
  { stringId: 3, fret: 6,  finger: 1 },  // Db4 — shift to VI
  { stringId: 3, fret: 8,  finger: 3 },  // Eb4
  { stringId: 2, fret: 6,  finger: 1 },  // F4
  { stringId: 2, fret: 8,  finger: 3 },  // G4
  { stringId: 2, fret: 9,  finger: 4 },  // Ab4
  { stringId: 1, fret: 6,  finger: 1 },  // Bb4
  { stringId: 1, fret: 8,  finger: 3 },  // C5
  { stringId: 1, fret: 9,  finger: 1 },  // Db5 — shift to IX
  { stringId: 1, fret: 11, finger: 3 },  // Eb5
  { stringId: 1, fret: 13, finger: 1 },  // F5 — shift to XIII
  { stringId: 1, fret: 15, finger: 3 },  // G5
  { stringId: 1, fret: 16, finger: 4 },  // Ab5 — top tonic
];
const PATTERN_3_AFLAT_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 16, finger: 4 },  // Ab5
  { stringId: 1, fret: 15, finger: 3 },  // G5
  { stringId: 1, fret: 13, finger: 1 },  // F5
  { stringId: 1, fret: 11, finger: 4 },  // Eb5 — shift to VIII
  { stringId: 1, fret: 9,  finger: 2 },  // Db5
  { stringId: 1, fret: 8,  finger: 1 },  // C5
  { stringId: 2, fret: 11, finger: 4 },  // Bb4
  { stringId: 2, fret: 9,  finger: 2 },  // Ab4
  { stringId: 2, fret: 8,  finger: 1 },  // G4
  { stringId: 3, fret: 10, finger: 3 },  // F4
  { stringId: 3, fret: 8,  finger: 1 },  // Eb4
  { stringId: 4, fret: 11, finger: 4 },  // Db4
  { stringId: 4, fret: 10, finger: 3 },  // C4
  { stringId: 4, fret: 8,  finger: 1 },  // Bb3
  { stringId: 5, fret: 11, finger: 4 },  // Ab3
  { stringId: 5, fret: 10, finger: 3 },  // G3
  { stringId: 5, fret: 8,  finger: 1 },  // F3
  { stringId: 5, fret: 6,  finger: 4 },  // Eb3 — shift to III
  { stringId: 5, fret: 4,  finger: 2 },  // Db3
  { stringId: 5, fret: 3,  finger: 1 },  // C3
  { stringId: 6, fret: 6,  finger: 4 },  // Bb2
  { stringId: 6, fret: 4,  finger: 2 },  // Ab2
];
export const PATTERN_3_AFLAT: SegoviaPattern = {
  id: 'pattern-3-aflat',
  label: 'Pattern #3',
  ascending: PATTERN_3_AFLAT_ASCENDING,
  descending: PATTERN_3_AFLAT_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #3 — Bb Major, 3 octaves (Bb2 → Bb5). Starts low E fret 6.
// Same shape as G Major Pattern #3, transposed up 3 frets.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_3_BFLAT_ASCENDING: PatternNote[] = [
  { stringId: 6, fret: 6,  finger: 2 },  // Bb2 — bottom tonic
  { stringId: 6, fret: 8,  finger: 4 },  // C3
  { stringId: 5, fret: 5,  finger: 1 },  // D3
  { stringId: 5, fret: 6,  finger: 2 },  // Eb3
  { stringId: 5, fret: 8,  finger: 4 },  // F3
  { stringId: 4, fret: 5,  finger: 1 },  // G3
  { stringId: 4, fret: 7,  finger: 3 },  // A3
  { stringId: 4, fret: 8,  finger: 4 },  // Bb3
  { stringId: 3, fret: 5,  finger: 1 },  // C4
  { stringId: 3, fret: 7,  finger: 3 },  // D4
  { stringId: 3, fret: 8,  finger: 1 },  // Eb4 — shift to VIII
  { stringId: 3, fret: 10, finger: 3 },  // F4
  { stringId: 2, fret: 8,  finger: 1 },  // G4
  { stringId: 2, fret: 10, finger: 3 },  // A4
  { stringId: 2, fret: 11, finger: 4 },  // Bb4
  { stringId: 1, fret: 8,  finger: 1 },  // C5
  { stringId: 1, fret: 10, finger: 3 },  // D5
  { stringId: 1, fret: 11, finger: 1 },  // Eb5 — shift to XI
  { stringId: 1, fret: 13, finger: 3 },  // F5
  { stringId: 1, fret: 15, finger: 1 },  // G5 — shift to XV
  { stringId: 1, fret: 17, finger: 3 },  // A5
  { stringId: 1, fret: 18, finger: 4 },  // Bb5 — top tonic
];
const PATTERN_3_BFLAT_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 18, finger: 4 },  // Bb5
  { stringId: 1, fret: 17, finger: 3 },  // A5
  { stringId: 1, fret: 15, finger: 1 },  // G5
  { stringId: 1, fret: 13, finger: 4 },  // F5 — shift to X
  { stringId: 1, fret: 11, finger: 2 },  // Eb5
  { stringId: 1, fret: 10, finger: 1 },  // D5
  { stringId: 2, fret: 13, finger: 4 },  // C5
  { stringId: 2, fret: 11, finger: 2 },  // Bb4
  { stringId: 2, fret: 10, finger: 1 },  // A4
  { stringId: 3, fret: 12, finger: 3 },  // G4
  { stringId: 3, fret: 10, finger: 1 },  // F4
  { stringId: 4, fret: 13, finger: 4 },  // Eb4
  { stringId: 4, fret: 12, finger: 3 },  // D4
  { stringId: 4, fret: 10, finger: 1 },  // C4
  { stringId: 5, fret: 13, finger: 4 },  // Bb3
  { stringId: 5, fret: 12, finger: 3 },  // A3
  { stringId: 5, fret: 10, finger: 1 },  // G3
  { stringId: 5, fret: 8,  finger: 4 },  // F3 — shift to V
  { stringId: 5, fret: 6,  finger: 2 },  // Eb3
  { stringId: 5, fret: 5,  finger: 1 },  // D3
  { stringId: 6, fret: 8,  finger: 4 },  // C3
  { stringId: 6, fret: 6,  finger: 2 },  // Bb2
];
export const PATTERN_3_BFLAT: SegoviaPattern = {
  id: 'pattern-3-bflat',
  label: 'Pattern #3',
  ascending: PATTERN_3_BFLAT_ASCENDING,
  descending: PATTERN_3_BFLAT_DESCENDING,
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

// ──────────────────────────────────────────────────────────────────────────
// Pattern #5 — Bb Melodic Minor, 3 octaves (Bb2 → Bb5). Starts A string fret 1.
// Same shape as B Melodic Minor Pattern #5, transposed down 1 fret.
// Ascending raises 6 (Gb→G) and 7 (Ab→A); descending is natural minor.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_5_BFLAT_ASCENDING: PatternNote[] = [
  { stringId: 5, fret: 1,  finger: 1 },  // Bb2 — bottom tonic
  { stringId: 5, fret: 3,  finger: 3 },  // C3
  { stringId: 5, fret: 4,  finger: 4 },  // Db3
  { stringId: 4, fret: 1,  finger: 1 },  // Eb3
  { stringId: 4, fret: 3,  finger: 3 },  // F3
  { stringId: 4, fret: 5,  finger: 1 },  // G3 — shift to V
  { stringId: 4, fret: 7,  finger: 3 },  // A3
  { stringId: 4, fret: 8,  finger: 1 },  // Bb3 — shift to VIII
  { stringId: 4, fret: 10, finger: 3 },  // C4
  { stringId: 4, fret: 11, finger: 4 },  // Db4
  { stringId: 3, fret: 8,  finger: 1 },  // Eb4
  { stringId: 3, fret: 10, finger: 3 },  // F4
  { stringId: 2, fret: 8,  finger: 1 },  // G4
  { stringId: 2, fret: 10, finger: 3 },  // A4
  { stringId: 2, fret: 11, finger: 1 },  // Bb4 — shift to XI
  { stringId: 2, fret: 13, finger: 3 },  // C5
  { stringId: 2, fret: 14, finger: 4 },  // Db5
  { stringId: 1, fret: 11, finger: 1 },  // Eb5
  { stringId: 1, fret: 13, finger: 3 },  // F5
  { stringId: 1, fret: 15, finger: 1 },  // G5 — shift to XV
  { stringId: 1, fret: 17, finger: 3 },  // A5
  { stringId: 1, fret: 18, finger: 4 },  // Bb5 — top tonic
];
const PATTERN_5_BFLAT_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 18, finger: 4 },  // Bb5
  { stringId: 1, fret: 16, finger: 2 },  // Ab5
  { stringId: 1, fret: 14, finger: 4 },  // Gb5 — shift to XI
  { stringId: 1, fret: 13, finger: 3 },  // F5
  { stringId: 1, fret: 11, finger: 1 },  // Eb5
  { stringId: 2, fret: 14, finger: 4 },  // Db5
  { stringId: 2, fret: 13, finger: 3 },  // C5
  { stringId: 2, fret: 11, finger: 1 },  // Bb4
  { stringId: 2, fret: 9,  finger: 4 },  // Ab4 — shift to VI
  { stringId: 2, fret: 7,  finger: 2 },  // G4
  { stringId: 2, fret: 6,  finger: 1 },  // F4
  { stringId: 2, fret: 4,  finger: 4 },  // Eb4 — shift to I
  { stringId: 2, fret: 2,  finger: 2 },  // Db4
  { stringId: 2, fret: 1,  finger: 1 },  // C4
  { stringId: 3, fret: 3,  finger: 3 },  // Bb3
  { stringId: 3, fret: 1,  finger: 1 },  // Ab3
  { stringId: 4, fret: 4,  finger: 4 },  // Gb3
  { stringId: 4, fret: 3,  finger: 3 },  // F3
  { stringId: 4, fret: 1,  finger: 1 },  // Eb3
  { stringId: 5, fret: 4,  finger: 4 },  // Db3 (slide-in from the D string)
  { stringId: 5, fret: 3,  finger: 3 },  // C3
  { stringId: 5, fret: 1,  finger: 1 },  // Bb2
];
export const PATTERN_5_BFLAT: SegoviaPattern = {
  id: 'pattern-5-bflat',
  label: 'Pattern #5',
  ascending: PATTERN_5_BFLAT_ASCENDING,
  descending: PATTERN_5_BFLAT_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #7 — C# Melodic Minor, 2 octaves (C#3 → C#5). Starts A string fret 4.
// Skips the low E string entirely. Ascending raises 6 (A→A#) and 7 (B→B#/C);
// descending is natural minor.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_7_CSHARP_ASCENDING: PatternNote[] = [
  { stringId: 5, fret: 4,  finger: 1 },  // C#3 — bottom tonic
  { stringId: 5, fret: 6,  finger: 3 },  // D#3
  { stringId: 5, fret: 7,  finger: 4 },  // E3
  { stringId: 4, fret: 4,  finger: 1 },  // F#3
  { stringId: 4, fret: 6,  finger: 3 },  // G#3
  { stringId: 4, fret: 8,  finger: 1 },  // A#3 — shift to VIII
  { stringId: 4, fret: 10, finger: 3 },  // B#3 (= C4)
  { stringId: 4, fret: 11, finger: 4 },  // C#4
  { stringId: 3, fret: 8,  finger: 1 },  // D#4
  { stringId: 3, fret: 9,  finger: 2 },  // E4
  { stringId: 3, fret: 11, finger: 4 },  // F#4
  { stringId: 2, fret: 9,  finger: 2 },  // G#4
  { stringId: 2, fret: 11, finger: 4 },  // A#4
  { stringId: 1, fret: 8,  finger: 1 },  // B#4 (= C5)
  { stringId: 1, fret: 9,  finger: 2 },  // C#5 — top tonic
];
const PATTERN_7_CSHARP_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 9,  finger: 2 },  // C#5
  { stringId: 1, fret: 7,  finger: 4 },  // B4 — shift to IV
  { stringId: 1, fret: 5,  finger: 2 },  // A4
  { stringId: 1, fret: 4,  finger: 1 },  // G#4
  { stringId: 2, fret: 7,  finger: 4 },  // F#4
  { stringId: 2, fret: 5,  finger: 2 },  // E4
  { stringId: 2, fret: 4,  finger: 1 },  // D#4
  { stringId: 3, fret: 6,  finger: 3 },  // C#4
  { stringId: 3, fret: 4,  finger: 1 },  // B3
  { stringId: 4, fret: 7,  finger: 4 },  // A3
  { stringId: 4, fret: 6,  finger: 3 },  // G#3
  { stringId: 4, fret: 4,  finger: 1 },  // F#3
  { stringId: 5, fret: 7,  finger: 4 },  // E3
  { stringId: 5, fret: 6,  finger: 3 },  // D#3
  { stringId: 5, fret: 4,  finger: 1 },  // C#3
];
export const PATTERN_7_CSHARP: SegoviaPattern = {
  id: 'pattern-7-csharp',
  label: 'Pattern #7',
  ascending: PATTERN_7_CSHARP_ASCENDING,
  descending: PATTERN_7_CSHARP_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #7 — C Melodic Minor, 2 octaves (C3 → C5). Starts A string fret 3.
// Same shape as C# Melodic Minor Pattern #7, transposed down 1 fret.
// Ascending raises 6 (Ab→A) and 7 (Bb→B); descending is natural minor.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_7_C_ASCENDING: PatternNote[] = [
  { stringId: 5, fret: 3,  finger: 1 },  // C3 — bottom tonic
  { stringId: 5, fret: 5,  finger: 3 },  // D3
  { stringId: 5, fret: 6,  finger: 4 },  // Eb3
  { stringId: 4, fret: 3,  finger: 1 },  // F3
  { stringId: 4, fret: 5,  finger: 3 },  // G3
  { stringId: 4, fret: 7,  finger: 1 },  // A3 — shift to VII
  { stringId: 4, fret: 9,  finger: 3 },  // B3
  { stringId: 4, fret: 10, finger: 4 },  // C4
  { stringId: 3, fret: 7,  finger: 1 },  // D4
  { stringId: 3, fret: 8,  finger: 2 },  // Eb4
  { stringId: 3, fret: 10, finger: 4 },  // F4
  { stringId: 2, fret: 8,  finger: 2 },  // G4
  { stringId: 2, fret: 10, finger: 4 },  // A4
  { stringId: 1, fret: 7,  finger: 1 },  // B4
  { stringId: 1, fret: 8,  finger: 2 },  // C5 — top tonic
];
const PATTERN_7_C_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 8,  finger: 2 },  // C5
  { stringId: 1, fret: 6,  finger: 4 },  // Bb4 — shift to III
  { stringId: 1, fret: 4,  finger: 2 },  // Ab4
  { stringId: 1, fret: 3,  finger: 1 },  // G4
  { stringId: 2, fret: 6,  finger: 4 },  // F4
  { stringId: 2, fret: 4,  finger: 2 },  // Eb4
  { stringId: 2, fret: 3,  finger: 1 },  // D4
  { stringId: 3, fret: 5,  finger: 3 },  // C4
  { stringId: 3, fret: 3,  finger: 1 },  // Bb3
  { stringId: 4, fret: 6,  finger: 4 },  // Ab3
  { stringId: 4, fret: 5,  finger: 3 },  // G3
  { stringId: 4, fret: 3,  finger: 1 },  // F3
  { stringId: 5, fret: 6,  finger: 4 },  // Eb3
  { stringId: 5, fret: 5,  finger: 3 },  // D3
  { stringId: 5, fret: 3,  finger: 1 },  // C3
];
export const PATTERN_7_C: SegoviaPattern = {
  id: 'pattern-7-c',
  label: 'Pattern #7',
  ascending: PATTERN_7_C_ASCENDING,
  descending: PATTERN_7_C_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #7 — D Melodic Minor, 2 octaves (D3 → D5). Starts A string fret 5.
// Same shape as C# Melodic Minor Pattern #7, transposed up 1 fret.
// Ascending raises 6 (Bb→B) and 7 (C→C#); descending is natural minor.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_7_D_ASCENDING: PatternNote[] = [
  { stringId: 5, fret: 5,  finger: 1 },  // D3 — bottom tonic
  { stringId: 5, fret: 7,  finger: 3 },  // E3
  { stringId: 5, fret: 8,  finger: 4 },  // F3
  { stringId: 4, fret: 5,  finger: 1 },  // G3
  { stringId: 4, fret: 7,  finger: 3 },  // A3
  { stringId: 4, fret: 9,  finger: 1 },  // B3 — shift to IX
  { stringId: 4, fret: 11, finger: 3 },  // C#4
  { stringId: 4, fret: 12, finger: 4 },  // D4
  { stringId: 3, fret: 9,  finger: 1 },  // E4
  { stringId: 3, fret: 10, finger: 2 },  // F4
  { stringId: 3, fret: 12, finger: 4 },  // G4
  { stringId: 2, fret: 10, finger: 2 },  // A4
  { stringId: 2, fret: 12, finger: 4 },  // B4
  { stringId: 1, fret: 9,  finger: 1 },  // C#5
  { stringId: 1, fret: 10, finger: 2 },  // D5 — top tonic
];
const PATTERN_7_D_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 10, finger: 2 },  // D5
  { stringId: 1, fret: 8,  finger: 4 },  // C5 — shift to V
  { stringId: 1, fret: 6,  finger: 2 },  // Bb4
  { stringId: 1, fret: 5,  finger: 1 },  // A4
  { stringId: 2, fret: 8,  finger: 4 },  // G4
  { stringId: 2, fret: 6,  finger: 2 },  // F4
  { stringId: 2, fret: 5,  finger: 1 },  // E4
  { stringId: 3, fret: 7,  finger: 3 },  // D4
  { stringId: 3, fret: 5,  finger: 1 },  // C4
  { stringId: 4, fret: 8,  finger: 4 },  // Bb3
  { stringId: 4, fret: 7,  finger: 3 },  // A3
  { stringId: 4, fret: 5,  finger: 1 },  // G3
  { stringId: 5, fret: 8,  finger: 4 },  // F3
  { stringId: 5, fret: 7,  finger: 3 },  // E3
  { stringId: 5, fret: 5,  finger: 1 },  // D3
];
export const PATTERN_7_D: SegoviaPattern = {
  id: 'pattern-7-d',
  label: 'Pattern #7',
  ascending: PATTERN_7_D_ASCENDING,
  descending: PATTERN_7_D_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #7 — D# Melodic Minor, 2 octaves (D#3 → D#5). Starts A string fret 6.
// Same shape as C# Melodic Minor Pattern #7, transposed up 2 frets.
// Ascending raises 6 (B→B#) and 7 (C#→C##); descending is natural minor.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_7_DSHARP_ASCENDING: PatternNote[] = [
  { stringId: 5, fret: 6,  finger: 1 },  // D#3 — bottom tonic
  { stringId: 5, fret: 8,  finger: 3 },  // E#3 (= F3)
  { stringId: 5, fret: 9,  finger: 4 },  // F#3
  { stringId: 4, fret: 6,  finger: 1 },  // G#3
  { stringId: 4, fret: 8,  finger: 3 },  // A#3
  { stringId: 4, fret: 10, finger: 1 },  // B#3 (= C4) — shift to X
  { stringId: 4, fret: 12, finger: 3 },  // C##4 (= D4)
  { stringId: 4, fret: 13, finger: 4 },  // D#4
  { stringId: 3, fret: 10, finger: 1 },  // E#4 (= F4)
  { stringId: 3, fret: 11, finger: 2 },  // F#4
  { stringId: 3, fret: 13, finger: 4 },  // G#4
  { stringId: 2, fret: 11, finger: 2 },  // A#4
  { stringId: 2, fret: 13, finger: 4 },  // B#4 (= C5)
  { stringId: 1, fret: 10, finger: 1 },  // C##5 (= D5)
  { stringId: 1, fret: 11, finger: 2 },  // D#5 — top tonic
];
const PATTERN_7_DSHARP_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 11, finger: 2 },  // D#5
  { stringId: 1, fret: 9,  finger: 4 },  // C#5 — shift to VI
  { stringId: 1, fret: 7,  finger: 2 },  // B4
  { stringId: 1, fret: 6,  finger: 1 },  // A#4
  { stringId: 2, fret: 9,  finger: 4 },  // G#4
  { stringId: 2, fret: 7,  finger: 2 },  // F#4
  { stringId: 2, fret: 6,  finger: 1 },  // E#4 (= F4)
  { stringId: 3, fret: 8,  finger: 3 },  // D#4
  { stringId: 3, fret: 6,  finger: 1 },  // C#4
  { stringId: 4, fret: 9,  finger: 4 },  // B3
  { stringId: 4, fret: 8,  finger: 3 },  // A#3
  { stringId: 4, fret: 6,  finger: 1 },  // G#3
  { stringId: 5, fret: 9,  finger: 4 },  // F#3
  { stringId: 5, fret: 8,  finger: 3 },  // E#3 (= F3)
  { stringId: 5, fret: 6,  finger: 1 },  // D#3
];
export const PATTERN_7_DSHARP: SegoviaPattern = {
  id: 'pattern-7-dsharp',
  label: 'Pattern #7',
  ascending: PATTERN_7_DSHARP_ASCENDING,
  descending: PATTERN_7_DSHARP_DESCENDING,
};

// ──────────────────────────────────────────────────────────────────────────
// Pattern #8 — F Major, 3 octaves (F2 → F5). Open-position variant: A string
// open is used as A2, and the ascent shifts up the A string before crossing
// over to D. Bottom and top tonics on the low E and high E respectively.
// ──────────────────────────────────────────────────────────────────────────
const PATTERN_8_F_ASCENDING: PatternNote[] = [
  { stringId: 6, fret: 1,  finger: 1 },     // F2 — bottom tonic
  { stringId: 6, fret: 3,  finger: 3 },     // G2
  { stringId: 5, fret: 0,  finger: null },  // A2 (open)
  { stringId: 5, fret: 1,  finger: 1 },     // Bb2
  { stringId: 5, fret: 3,  finger: 3 },     // C3
  { stringId: 5, fret: 5,  finger: 1 },     // D3 — shift to V
  { stringId: 5, fret: 7,  finger: 3 },     // E3
  { stringId: 5, fret: 8,  finger: 4 },     // F3
  { stringId: 4, fret: 5,  finger: 1 },     // G3
  { stringId: 4, fret: 7,  finger: 3 },     // A3
  { stringId: 4, fret: 8,  finger: 4 },     // Bb3
  { stringId: 3, fret: 5,  finger: 1 },     // C4
  { stringId: 3, fret: 7,  finger: 3 },     // D4
  { stringId: 2, fret: 5,  finger: 1 },     // E4
  { stringId: 2, fret: 6,  finger: 2 },     // F4
  { stringId: 2, fret: 8,  finger: 4 },     // G4
  { stringId: 1, fret: 5,  finger: 1 },     // A4
  { stringId: 1, fret: 6,  finger: 2 },     // Bb4
  { stringId: 1, fret: 8,  finger: 4 },     // C5
  { stringId: 1, fret: 10, finger: 1 },     // D5 — shift to X
  { stringId: 1, fret: 12, finger: 3 },     // E5
  { stringId: 1, fret: 13, finger: 4 },     // F5 — top tonic
];
const PATTERN_8_F_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 13, finger: 4 },     // F5
  { stringId: 1, fret: 12, finger: 3 },     // E5
  { stringId: 1, fret: 10, finger: 1 },     // D5
  { stringId: 1, fret: 8,  finger: 4 },     // C5 — shift to V
  { stringId: 1, fret: 6,  finger: 2 },     // Bb4
  { stringId: 1, fret: 5,  finger: 1 },     // A4
  { stringId: 2, fret: 8,  finger: 4 },     // G4
  { stringId: 2, fret: 6,  finger: 2 },     // F4
  { stringId: 2, fret: 5,  finger: 1 },     // E4
  { stringId: 3, fret: 7,  finger: 3 },     // D4
  { stringId: 3, fret: 5,  finger: 1 },     // C4
  { stringId: 4, fret: 8,  finger: 4 },     // Bb3
  { stringId: 4, fret: 7,  finger: 3 },     // A3
  { stringId: 4, fret: 5,  finger: 1 },     // G3
  { stringId: 5, fret: 8,  finger: 4 },     // F3
  { stringId: 5, fret: 7,  finger: 3 },     // E3
  { stringId: 5, fret: 5,  finger: 1 },     // D3
  { stringId: 5, fret: 3,  finger: 3 },     // C3 — shift back to I
  { stringId: 5, fret: 1,  finger: 1 },     // Bb2
  { stringId: 5, fret: 0,  finger: null },  // A2 (open)
  { stringId: 6, fret: 3,  finger: 3 },     // G2
  { stringId: 6, fret: 1,  finger: 1 },     // F2 — bottom tonic
];
export const PATTERN_8_F: SegoviaPattern = {
  id: 'pattern-8-f',
  label: 'Pattern #8',
  ascending: PATTERN_8_F_ASCENDING,
  descending: PATTERN_8_F_DESCENDING,
};

const PATTERNS: SegoviaPattern[] = [
  PATTERN_1,
  PATTERN_1_D,
  PATTERN_1_DFLAT,
  PATTERN_1_EFLAT,
  PATTERN_2_A,
  PATTERN_2_F,
  PATTERN_2_FSHARP,
  PATTERN_2_G,
  PATTERN_2_GSHARP,
  PATTERN_3,
  PATTERN_3_A,
  PATTERN_3_AFLAT,
  PATTERN_3_B,
  PATTERN_3_BFLAT,
  PATTERN_3_FSHARP,
  PATTERN_4_E,
  PATTERN_5_B,
  PATTERN_5_BFLAT,
  PATTERN_6_E,
  PATTERN_7_C,
  PATTERN_7_CSHARP,
  PATTERN_7_D,
  PATTERN_7_DSHARP,
  PATTERN_8_F,
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
    'Db': 'pattern-1-dflat',
    'D':  'pattern-1-d',
    'Eb': 'pattern-1-eflat',
    'E':  'pattern-6-e',
    'F':  'pattern-8-f',
    'F#': 'pattern-3-fsharp',
    'G':  'pattern-3',
    'Ab': 'pattern-3-aflat',
    'A':  'pattern-3-a',
    'Bb': 'pattern-3-bflat',
    'B':  'pattern-3-b',
  },
  MelodicMinor: {
    'C':  'pattern-7-c',
    'C#': 'pattern-7-csharp',
    'D':  'pattern-7-d',
    'D#': 'pattern-7-dsharp',
    'E':  'pattern-4-e',
    'F':  'pattern-2-f',
    'F#': 'pattern-2-fsharp',
    'G':  'pattern-2-g',
    'G#': 'pattern-2-gsharp',
    'A':  'pattern-2-a',
    'Bb': 'pattern-5-bflat',
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

// Groups every enabled scale by its Segovia pattern label and quality, sorted
// strictly by pattern number (Major and Melodic Minor interleave). Each group
// label is e.g. "Pattern #1 — Major" so the quality is visible on its own.
export function scalesGroupedByPattern(): ScaleGroup[] {
  const groups = new Map<string, { label: string; patternNumber: number; scales: ScaleEntry[] }>();
  for (const s of SCALES) {
    if (!s.enabled) continue;
    const knownPattern = getPatternById(s.patternId);
    if (!knownPattern) continue;
    const qualityLabel = s.quality === 'Major' ? 'Major' : 'Melodic Minor';
    const label = `${knownPattern.label} — ${qualityLabel}`;
    const patternNumber = Number(knownPattern.label.match(/#(\d+)/)?.[1] ?? Number.MAX_SAFE_INTEGER);
    const existing = groups.get(label);
    if (existing) {
      existing.scales.push(s);
    } else {
      groups.set(label, { label, patternNumber, scales: [s] });
    }
  }
  return [...groups.values()]
    .sort((a, b) => {
      if (a.patternNumber !== b.patternNumber) return a.patternNumber - b.patternNumber;
      // Tie-break: Major before Melodic Minor when both share a pattern number.
      return a.label.localeCompare(b.label);
    })
    .map(g => ({
      patternId: g.label,
      patternLabel: g.label,
      scales: g.scales,
    }));
}
