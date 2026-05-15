import type {
  CustomOptions,
  Difficulty,
  PhraseBarCount,
  TickDuration,
} from './models';
import { DURATION_BEATS } from './models';

export interface RhythmSlot {
  duration: TickDuration;
  beat: number;
  isRest: boolean;
  isStrong: boolean;     // beat 0 or 2 of a bar
  isCadence: boolean;    // sounding slot at/before phrase midpoint
  isFinal: boolean;      // last sounding slot of the phrase
  barIdx: number;        // 0-based bar this slot belongs to
}

interface TierPalette {
  notes: TickDuration[];
  rests: TickDuration[];
  // Probability per beat-group of inserting a rest instead of a note.
  restProbability: number;
  // Probability of using a sub-beat (eighth / 16th) split on a weak beat.
  subdivisionProbability: number;
}

const TIER_PALETTES: Record<Exclude<Difficulty, 'Custom'>, TierPalette> = {
  Easy: {
    notes: ['q'],
    rests: [],
    restProbability: 0,
    subdivisionProbability: 0,
  },
  Intermediate: {
    notes: ['h', 'q', '8'],
    rests: ['q'],
    restProbability: 0.18,
    subdivisionProbability: 0.40,
  },
  Expert: {
    notes: ['w', 'h', 'q', '8', '16'],
    rests: ['h', 'q', '8'],
    restProbability: 0.16,
    subdivisionProbability: 0.55,
  },
};

export function planRhythm(
  barCount: PhraseBarCount,
  difficulty: Difficulty,
  custom: CustomOptions,
): RhythmSlot[] {
  const palette = paletteFor(difficulty, custom);
  // Easy mode is deterministic enough that we just fill with quarter notes.
  if (difficulty === 'Easy') {
    return markCadenceAndFinal(buildSimpleQuarterRhythm(barCount), barCount);
  }

  // Try up to a handful of times to produce a phrase that ends on a sounding
  // slot — the constraint is loose enough that we rarely need to retry.
  for (let attempt = 0; attempt < 20; attempt++) {
    const slots: RhythmSlot[] = [];
    for (let bar = 0; bar < barCount; bar++) {
      const isLastBar = bar === barCount - 1;
      fillBar(slots, bar, palette, isLastBar);
    }
    if (slots.length === 0) continue;
    const last = slots[slots.length - 1];
    // If the last slot turned out to be a rest, retry — we want the phrase
    // to end on a sounding note.
    if (last.isRest) continue;
    return markCadenceAndFinal(slots, barCount);
  }

  // Failsafe: deterministic fill if randomized passes never settled.
  return markCadenceAndFinal(buildSimpleQuarterRhythm(barCount), barCount);
}

function paletteFor(difficulty: Difficulty, custom: CustomOptions): TierPalette {
  if (difficulty !== 'Custom') return TIER_PALETTES[difficulty];
  const notes: TickDuration[] = custom.allowedNoteValues.length
    ? custom.allowedNoteValues.slice()
    : ['q'];
  const rests: TickDuration[] = custom.allowRests && custom.allowedRestValues.length
    ? custom.allowedRestValues.slice()
    : [];
  // Custom mode: model rests like Expert when enabled, otherwise off entirely.
  return {
    notes,
    rests,
    restProbability: rests.length ? 0.18 : 0,
    // Sub-beat probability scales with how many short values are allowed.
    subdivisionProbability: hasAny(notes, ['8', '16', '32']) ? 0.50 : 0.10,
  };
}

function hasAny(arr: TickDuration[], wanted: TickDuration[]): boolean {
  return wanted.some(w => arr.includes(w));
}

function buildSimpleQuarterRhythm(barCount: PhraseBarCount): RhythmSlot[] {
  const slots: RhythmSlot[] = [];
  for (let i = 0; i < barCount * 4; i++) {
    slots.push({
      duration: 'q',
      beat: i,
      isRest: false,
      isStrong: i % 2 === 0,
      isCadence: false,
      isFinal: false,
      barIdx: Math.floor(i / 4),
    });
  }
  return slots;
}

// Fill one bar with weighted durations, biased so longer values land on
// strong beats and shorter values land on weak subdivisions. Ensures the
// final bar ends on a sounding slot.
function fillBar(
  out: RhythmSlot[],
  barIdx: number,
  palette: TierPalette,
  isLastBar: boolean,
): void {
  const barStartBeat = barIdx * 4;
  let cursor = 0;
  while (cursor < 4) {
    const remaining = 4 - cursor;
    const beatInBar = cursor;
    const isStrong = beatInBar === 0 || beatInBar === 2;
    const onBeat = Number.isInteger(beatInBar);

    // Decide rest vs note. Never end the last bar on a rest; never start the
    // very first slot of a bar with a rest (downbeats want a note).
    const shouldRest =
      palette.rests.length > 0 &&
      Math.random() < palette.restProbability &&
      !(isLastBar && willFinishBar(cursor, palette.rests, remaining)) &&
      !(beatInBar === 0);

    const pool = shouldRest ? palette.rests : palette.notes;
    const duration = pickDuration(pool, remaining, isStrong, onBeat, palette);
    if (!duration) {
      // No allowed duration fits the remaining time. Force a quarter or eighth
      // as a safety filler so the bar still sums to 4 beats.
      const filler: TickDuration = remaining >= 1 ? 'q' : remaining >= 0.5 ? '8' : '16';
      out.push({
        duration: filler,
        beat: barStartBeat + cursor,
        isRest: false,
        isStrong,
        isCadence: false,
        isFinal: false,
        barIdx,
      });
      cursor += DURATION_BEATS[filler];
      continue;
    }
    out.push({
      duration,
      beat: barStartBeat + cursor,
      isRest: shouldRest,
      isStrong,
      isCadence: false,
      isFinal: false,
      barIdx,
    });
    cursor += DURATION_BEATS[duration];
  }
}

// True if picking ANY rest from the rest palette would push the cursor exactly
// to the end of the bar — used to prevent the last bar from finishing on a rest.
function willFinishBar(cursor: number, rests: TickDuration[], remaining: number): boolean {
  return rests.some(r => Math.abs(DURATION_BEATS[r] - remaining) < 1e-9);
}

function pickDuration(
  pool: TickDuration[],
  remaining: number,
  isStrong: boolean,
  onBeat: boolean,
  palette: TierPalette,
): TickDuration | null {
  // Only durations that fit the remaining time are candidates.
  const candidates = pool.filter(d => DURATION_BEATS[d] <= remaining + 1e-9);
  if (!candidates.length) return null;

  const weights = candidates.map(d => weightFor(d, isStrong, onBeat, palette.subdivisionProbability));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return candidates[0];
  let r = Math.random() * sum;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function weightFor(
  d: TickDuration,
  isStrong: boolean,
  onBeat: boolean,
  subdivisionProb: number,
): number {
  const beats = DURATION_BEATS[d];
  if (!onBeat) {
    // Off-beat positions strongly favor short values.
    if (beats >= 1) return 1;
    if (beats >= 0.5) return 30;
    return 50;
  }
  if (isStrong) {
    // Downbeats give long values real presence — without this, melodies
    // with halves/wholes in the palette never actually use them.
    if (beats >= 4) return 25;
    if (beats >= 2) return 40;
    if (beats >= 1) return 50;
    if (beats >= 0.5) return Math.round(20 * subdivisionProb * 2);
    return Math.round(8 * subdivisionProb * 2);
  }
  // Weak on-beat (beat 1 or 3): rarely use long values here.
  if (beats >= 4) return 1;
  if (beats >= 2) return 6;
  if (beats >= 1) return 45;
  if (beats >= 0.5) return Math.round(30 * subdivisionProb * 2);
  return Math.round(15 * subdivisionProb * 2);
}

// Mark the cadence target (last sounding slot at or before the phrase
// midpoint) and the final sounding slot. Both are read by the pitch planner
// to enforce a half cadence on V/IV at the midpoint and resolution to I at
// the end.
function markCadenceAndFinal(slots: RhythmSlot[], barCount: PhraseBarCount): RhythmSlot[] {
  const sounding = slots.filter(s => !s.isRest);
  if (!sounding.length) return slots;
  const midBeat = (barCount * 4) / 2;
  const cadence = [...sounding].reverse().find(s => s.beat < midBeat);
  if (cadence) cadence.isCadence = true;
  sounding[sounding.length - 1].isFinal = true;
  return slots;
}
