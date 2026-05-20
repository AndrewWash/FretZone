import type { BaseLetter } from '../theory/note';
import type { ModeName } from '../theory/modes';

// Duration codes match the rest of the codebase (VexFlow + melody).
export type EtudeDuration = 'w' | 'h' | 'q' | '8' | '16' | '32';

export const ETUDE_DURATION_BEATS: Record<EtudeDuration, number> = {
  w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25, '32': 0.125,
};

// Etude time signatures. Sor's beginner studies live in 2/4, 3/4, 4/4, 3/8, 6/8.
export type EtudeTimeSignature = '2/4' | '3/4' | '4/4' | '3/8' | '6/8';

export const ETUDE_BEATS_PER_BAR: Record<EtudeTimeSignature, number> = {
  '2/4': 2,
  '3/4': 3,
  '4/4': 4,
  '3/8': 1.5,
  '6/8': 3,
};

export type EtudeVoice = 'upper' | 'lower';
export type RhFinger = 'p' | 'i' | 'm' | 'a';
export type LhFinger = 0 | 1 | 2 | 3 | 4;
export type StringId = 1 | 2 | 3 | 4 | 5 | 6;

// A single tickable in one voice of one bar. `kind` distinguishes rests from
// notes; `tieToNext` joins two consecutive notes of the same pitch in the same
// voice (can span bars — the renderer resolves cross-bar ties).
export interface EtudeNote {
  kind: 'note' | 'rest';
  duration: EtudeDuration;
  dotted?: boolean;
  midi?: number;            // sounding MIDI (treble guitar; renderer offsets +12 to written)
  stringId?: StringId;
  fret?: number;
  lhFinger?: LhFinger | null;
  rhFinger?: RhFinger | null;
  tieToNext?: boolean;
}

// One bar has two voices. `lower` is optional — single-voice passages put
// everything in `upper` and leave `lower` empty.
export interface EtudeBar {
  upper: EtudeNote[];
  lower: EtudeNote[];
}

export interface SorEtude {
  id: string;                  // 'sor-op60-no1'
  opus: 60;
  number: number;
  title: string;
  key: BaseLetter;
  keyMode: ModeName;
  keyOffset?: 0 | 1 | -1;      // for sharp/flat tonics; defaults to 0
  timeSignature: EtudeTimeSignature;
  defaultBpm: number;          // quarter-note BPM hint
  bars: EtudeBar[];
  enabled: boolean;            // grey out in the picker when false
  attribution?: string;        // free-form: source edition / arrangement note
}

// ── Practice config ────────────────────────────────────────────────────────

export type PracticeMode = 'mic' | 'metronome';
export type LimitMode = 'iterations' | 'time';

export interface SorConfig {
  etudeId: string;
  practiceMode: PracticeMode;
  showTab: boolean;
  showLhFingerings: boolean;
  showRhFingerings: boolean;
  limitMode: LimitMode;
  iterations: number;
  timeMinutes: number;
  a4: number;
  centsTolerance: number;
}

export function defaultSorConfig(): SorConfig {
  return {
    etudeId: 'sor-op60-no1',
    practiceMode: 'metronome',
    showTab: true,
    showLhFingerings: true,
    showRhFingerings: true,
    limitMode: 'iterations',
    iterations: 1,
    timeMinutes: 3,
    a4: 440,
    centsTolerance: 25,
  };
}

// Total beats (quarter-note units) in one note's value, including a dot.
export function noteBeats(n: EtudeNote): number {
  const base = ETUDE_DURATION_BEATS[n.duration];
  return n.dotted ? base * 1.5 : base;
}
