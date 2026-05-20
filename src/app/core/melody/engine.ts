import { BASE_LETTERS } from '../theory/note';
import { planContour } from './contour-planner';
import { planForm } from './form-planner';
import { planHarmony } from './harmony-planner';
import { planRhythm, type RhythmSlot } from './rhythm-planner';
import { planPitches, type TierLimits } from './pitch-planner';
import { playablePool } from './engine-pool';
import { BEATS_PER_BAR, PHRASE_BAR_OPTIONS } from './models';
import type {
  CustomOptions,
  Difficulty,
  JumpTier,
  MelodyConfig,
  MelodyPhrase,
  MelodyTickable,
  PhraseBarCount,
  TimeSignature,
} from './models';

// Re-export so existing call sites that import from `./engine` keep working.
export { playablePool } from './engine-pool';
export type { PlayablePool } from './engine-pool';

export function defaultCustomOptions(): CustomOptions {
  return {
    allowedNoteValues: ['q', '8'],
    allowRests: true,
    allowedRestValues: ['q'],
    jumpTier: 'Easy',
    timeSignature: '4/4',
  };
}

// Time signature is a Custom-mode option; the fixed difficulty tiers always
// generate in 4/4 so their character stays predictable.
function timeSignatureFor(cfg: MelodyConfig): TimeSignature {
  return cfg.difficulty === 'Custom' ? cfg.custom.timeSignature : '4/4';
}

export function defaultConfig(): MelodyConfig {
  return {
    difficulty: 'Easy',
    tonic: 'C',
    mode: 'Ionian',
    fretStart: 1,
    fretEnd: 7,
    strings: [1, 2, 3, 4, 5, 6],
    iterations: 5,
    bars: 2,
    limitMode: 'iterations',
    timeMinutes: 3,
    a4: 440,
    centsTolerance: 25,
    progression: 'Off',
    custom: defaultCustomOptions(),
    practiceMode: 'mic',
  };
}

export function normalizeBarCount(n: unknown): PhraseBarCount {
  return PHRASE_BAR_OPTIONS.includes(n as PhraseBarCount) ? (n as PhraseBarCount) : 2;
}

const JUMP_TIER_MAX_LEAP: Record<JumpTier, number> = {
  Easy: 4,    // up to a major third
  Medium: 7,  // up to a perfect fifth
  Hard: 12,   // up to an octave
};

function limitsFor(cfg: MelodyConfig): TierLimits {
  switch (cfg.difficulty) {
    case 'Easy':
      return { maxLeap: 4, repeatCap: 2, windowSemitones: 12 };
    case 'Intermediate':
      return { maxLeap: 7, repeatCap: 3, windowSemitones: 14 };
    case 'Expert':
      return { maxLeap: 12, repeatCap: 4, windowSemitones: 19 };
    case 'Custom':
      return {
        maxLeap: JUMP_TIER_MAX_LEAP[cfg.custom.jumpTier],
        repeatCap: 3,
        windowSemitones: 16,
      };
  }
}

export function generatePhrase(cfg: MelodyConfig): MelodyPhrase {
  const pool = playablePool(cfg);
  if (!pool.midis.length) {
    throw new Error('No playable scale tones in the selected fret range and strings.');
  }

  const barCount = normalizeBarCount(cfg.bars);
  const timeSignature = timeSignatureFor(cfg);
  const beatsPerBar = BEATS_PER_BAR[timeSignature];
  const form = planForm(barCount, cfg.difficulty);
  const contour = planContour(barCount);
  const harmony = planHarmony(cfg);
  const slots = planRhythm(barCount, cfg.difficulty, cfg.custom, beatsPerBar);
  const limits = limitsFor(cfg);

  let pitches = planPitches({ pool, slots, contour, form, harmony, limits });
  if (!pitches) {
    pitches = randomWalk(pool, slots.filter(s => !s.isRest).length, limits);
  }

  return assemblePhrase(slots, pitches, barCount, beatsPerBar, timeSignature);
}

function randomWalk(
  pool: ReturnType<typeof playablePool>,
  count: number,
  limits: TierLimits,
): number[] {
  if (!count) return [];
  const start = pool.midis[Math.floor(pool.midis.length / 2)];
  const out: number[] = [start];
  while (out.length < count) {
    const prev = out[out.length - 1];
    const close = pool.midis.filter(
      m =>
        Math.abs(m - prev) <= Math.max(2, Math.min(limits.maxLeap, 7)) &&
        Math.abs(m - out[0]) <= limits.windowSemitones,
    );
    out.push(close.length ? close[Math.floor(Math.random() * close.length)] : prev);
  }
  return out;
}

function assemblePhrase(
  slots: RhythmSlot[],
  pitches: number[],
  barCount: PhraseBarCount,
  beatsPerBar: number,
  timeSignature: TimeSignature,
): MelodyPhrase {
  const tickables: MelodyTickable[] = [];
  let pIdx = 0;
  for (const s of slots) {
    if (s.isRest) {
      tickables.push({ kind: 'rest', duration: s.duration, beat: s.beat });
    } else {
      tickables.push({ kind: 'note', duration: s.duration, midi: pitches[pIdx++], beat: s.beat });
    }
  }
  const bars: MelodyTickable[][] = [];
  for (let b = 0; b < barCount; b++) {
    const lo = b * beatsPerBar;
    const hi = lo + beatsPerBar;
    bars.push(tickables.filter(t => t.beat >= lo && t.beat < hi));
  }
  const noteMidis = tickables.filter(t => t.kind === 'note').map(t => t.midi!);
  return { tickables, bars, noteMidis, timeSignature };
}

export const ALL_TONICS = [...BASE_LETTERS];

// ── Metronome-driven cursor ─────────────────────────────────────────────────
// Walks a phrase's note-onsets at a fixed BPM, advancing playedCount as each
// note's beat-position is reached. Used by the melody applet's metronome
// practice mode (no mic). Mirrors the Sor applet's cursor.

import { createBeatCursor, type BeatCursor } from '../audio/beat-cursor';

export interface MelodyCursorOpts {
  bpm: number;
  onAdvance: (playedIndex: number) => void;
  onComplete: () => void;
}

export function totalPhraseBeats(phrase: MelodyPhrase): number {
  return phrase.bars.length * BEATS_PER_BAR[phrase.timeSignature];
}

export function createMelodyMetronomeCursor(
  phrase: MelodyPhrase,
  opts: MelodyCursorOpts,
): BeatCursor {
  const noteOnsets = phrase.tickables
    .filter(t => t.kind === 'note')
    .map(t => t.beat);
  return createBeatCursor({
    bpm: opts.bpm,
    noteOnsets,
    totalBeats: totalPhraseBeats(phrase),
    onAdvance: opts.onAdvance,
    onComplete: opts.onComplete,
  });
}
