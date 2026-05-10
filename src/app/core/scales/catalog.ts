import type { PatternNote, ScaleEntry, SegoviaPattern, Tonic, ScaleQuality } from './models';

// Segovia Pattern #1 — C Major, 2 octaves (C3 -> C5). 29 notes total after
// the shared-apex merge in patternToRun. Starts and ends on the A string,
// 3rd fret.
//   A:      C(3)  D(5)
//   D:      E(2)  F(3)  G(5)
//   G:      A(2)  B(4)  C(5)  D(7)  <- position shift onto V at C
//   B:      E(5)  F(6)  G(8)
//   high E: A(5)  B(7)  C(8)
const PATTERN_1_ASCENDING: PatternNote[] = [
  { stringId: 5, fret: 3, finger: 2 },  // C3 — bottom tonic
  { stringId: 5, fret: 5, finger: 4 },  // D3
  { stringId: 4, fret: 2, finger: 1 },  // E3
  { stringId: 4, fret: 3, finger: 2 },  // F3
  { stringId: 4, fret: 5, finger: 4 },  // G3
  { stringId: 3, fret: 2, finger: 1 },  // A3
  { stringId: 3, fret: 4, finger: 3 },  // B3
  { stringId: 3, fret: 5, finger: 1 },  // C4 — position shift to V
  { stringId: 3, fret: 7, finger: 3 },  // D4
  { stringId: 2, fret: 5, finger: 1 },  // E4
  { stringId: 2, fret: 6, finger: 2 },  // F4
  { stringId: 2, fret: 8, finger: 4 },  // G4
  { stringId: 1, fret: 5, finger: 1 },  // A4
  { stringId: 1, fret: 7, finger: 3 },  // B4
  { stringId: 1, fret: 8, finger: 4 },  // C5 — top tonic
];

// Descending — position shift from V to II happens between C4 and B3:
// C4 is fingered "1" in V position, then finger "3" reaches back to B3
// in II position.
const PATTERN_1_DESCENDING: PatternNote[] = [
  { stringId: 1, fret: 8, finger: 4 },  // C5
  { stringId: 1, fret: 7, finger: 3 },  // B4
  { stringId: 1, fret: 5, finger: 1 },  // A4
  { stringId: 2, fret: 8, finger: 4 },  // G4
  { stringId: 2, fret: 6, finger: 2 },  // F4
  { stringId: 2, fret: 5, finger: 1 },  // E4
  { stringId: 3, fret: 7, finger: 3 },  // D4
  { stringId: 3, fret: 5, finger: 1 },  // C4 — still V position
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

const PATTERNS: SegoviaPattern[] = [PATTERN_1];

export function getPatternById(id: string): SegoviaPattern | undefined {
  return PATTERNS.find(p => p.id === id);
}

// Tonics ordered along the chromatic circle, with enharmonic spellings shown
// as separate entries (Db distinct from C#) so the dropdown can display the
// preferred classical-guitar spelling per scale family.
const ALL_TONICS: Tonic[] = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
  'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
];

const SCALES: ScaleEntry[] = [];

// Build the catalog. Only C Major is enabled at prototype time. Per the
// user's note, C / D / Db / Eb major share Pattern #1; the rest carry
// placeholder pattern IDs (data not yet provided). Quality-major and
// melodic-minor entries are both stubbed for non-C-major.
const PATTERN_1_TONICS: Tonic[] = ['C', 'D', 'Db', 'Eb'];

for (const quality of ['Major', 'MelodicMinor'] as ScaleQuality[]) {
  for (const tonic of ALL_TONICS) {
    const id = `${tonic.toLowerCase().replace('#', 'sharp')}-${quality.toLowerCase()}`;
    const inPattern1 = quality === 'Major' && PATTERN_1_TONICS.includes(tonic);
    SCALES.push({
      id,
      tonic,
      quality,
      patternId: inPattern1 ? 'pattern-1' : `pattern-${quality.toLowerCase()}-${tonic}`,
      enabled: tonic === 'C' && quality === 'Major',
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

// Group scales by patternId for use in the dropdown's <optgroup>s. Returned
// in catalog order.
export interface ScaleGroup {
  patternId: string;
  patternLabel: string;
  scales: ScaleEntry[];
}

export function scalesGroupedByPattern(quality: ScaleQuality): ScaleGroup[] {
  const groups = new Map<string, ScaleEntry[]>();
  for (const s of SCALES) {
    if (s.quality !== quality) continue;
    const arr = groups.get(s.patternId) ?? [];
    arr.push(s);
    groups.set(s.patternId, arr);
  }
  const out: ScaleGroup[] = [];
  for (const [patternId, scales] of groups) {
    const knownPattern = getPatternById(patternId);
    out.push({
      patternId,
      patternLabel: knownPattern?.label ?? patternId,
      scales,
    });
  }
  return out;
}
