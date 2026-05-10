import type { BaseLetter } from '../theory/note';
import type { ModeName } from '../theory/modes';

export type ScaleQuality = 'Major' | 'MelodicMinor';

export type Tonic =
  | 'C' | 'C#' | 'Db'
  | 'D' | 'D#' | 'Eb'
  | 'E'
  | 'F' | 'F#' | 'Gb'
  | 'G' | 'G#' | 'Ab'
  | 'A' | 'A#' | 'Bb'
  | 'B';

export interface PatternNote {
  stringId: 1 | 2 | 3 | 4 | 5 | 6;
  fret: number;
  finger: 1 | 2 | 3 | 4 | null;
}

export interface SegoviaPattern {
  id: string;
  label: string;
  ascending: PatternNote[];
  descending: PatternNote[];
}

export interface ScaleEntry {
  id: string;
  tonic: Tonic;
  quality: ScaleQuality;
  patternId: string;
  enabled: boolean;
}

export interface ScalesConfig {
  scaleId: string;
  showTab: boolean;
  showFingerings: boolean;
  iterations: number;
  a4: number;
  centsTolerance: number;
}

// Map a (Tonic, ScaleQuality) pair to the (BaseLetter, ModeName) understood by
// the existing key-signature / spelling helpers.
export function tonicBaseLetter(t: Tonic): { base: BaseLetter; offset: 0 | 1 | -1 } {
  // Returned `base` is the natural letter; `offset` says whether the tonic
  // is sharp (+1) or flat (−1) of that letter. Used only when callers need
  // the BaseLetter and accept that key signature is computed downstream.
  switch (t) {
    case 'C':  return { base: 'C', offset: 0 };
    case 'C#': return { base: 'C', offset: 1 };
    case 'Db': return { base: 'D', offset: -1 };
    case 'D':  return { base: 'D', offset: 0 };
    case 'D#': return { base: 'D', offset: 1 };
    case 'Eb': return { base: 'E', offset: -1 };
    case 'E':  return { base: 'E', offset: 0 };
    case 'F':  return { base: 'F', offset: 0 };
    case 'F#': return { base: 'F', offset: 1 };
    case 'Gb': return { base: 'G', offset: -1 };
    case 'G':  return { base: 'G', offset: 0 };
    case 'G#': return { base: 'G', offset: 1 };
    case 'Ab': return { base: 'A', offset: -1 };
    case 'A':  return { base: 'A', offset: 0 };
    case 'A#': return { base: 'A', offset: 1 };
    case 'Bb': return { base: 'B', offset: -1 };
    case 'B':  return { base: 'B', offset: 0 };
  }
}

export function qualityToMode(q: ScaleQuality): ModeName {
  // Major → Ionian; Melodic Minor approximated as Aeolian for key-signature
  // purposes (true ascending melodic minor raises 6 & 7 chromatically — the
  // raised tones will appear as accidentals in notation, which is correct).
  return q === 'Major' ? 'Ionian' : 'Aeolian';
}
