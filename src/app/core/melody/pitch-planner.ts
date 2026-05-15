import type { ContourPlan } from './contour-planner';
import { bandWindow } from './contour-planner';
import type { PhraseForm } from './form-planner';
import type { HarmonyPlan } from './harmony-planner';
import type { RhythmSlot } from './rhythm-planner';
import type { PlayablePool } from './engine-pool';

export interface TierLimits {
  maxLeap: number;          // semitones
  repeatCap: number;        // max consecutive identical pitches
  windowSemitones: number;  // pitch window around the starting note
}

export interface PitchPlanInput {
  pool: PlayablePool;
  slots: RhythmSlot[];
  contour: ContourPlan;
  form: PhraseForm;
  harmony: HarmonyPlan | null;
  limits: TierLimits;
}

interface RuleFlags {
  enforceTendency: boolean;
  enforcePostLeap: boolean;
  enforceStrongBeatChordTone: boolean;
  enforceStrongBeatDegree: boolean;
  enforceContourBand: boolean;
  enforceCadence: boolean;
}

const FULL_RULES: RuleFlags = {
  enforceTendency: true,
  enforcePostLeap: true,
  enforceStrongBeatChordTone: true,
  enforceStrongBeatDegree: true,
  enforceContourBand: true,
  enforceCadence: true,
};

// Plan the pitch for every sounding slot. Returns one MIDI per sounding slot
// in source order, or null if no constraint stage could satisfy the rules.
export function planPitches(input: PitchPlanInput): number[] | null {
  // Stage relaxation: try strict rules first, then drop softer constraints
  // until something fits. Cadence stays last because it carries the most
  // musical meaning (half cadence + tonic resolution).
  const stages: RuleFlags[] = [
    FULL_RULES,
    { ...FULL_RULES, enforceTendency: false },
    { ...FULL_RULES, enforceTendency: false, enforceContourBand: false },
    { ...FULL_RULES, enforceTendency: false, enforceContourBand: false, enforcePostLeap: false },
    { ...FULL_RULES, enforceTendency: false, enforceContourBand: false, enforcePostLeap: false, enforceStrongBeatChordTone: false },
    { ...FULL_RULES, enforceTendency: false, enforceContourBand: false, enforcePostLeap: false, enforceStrongBeatChordTone: false, enforceStrongBeatDegree: false },
    {
      enforceTendency: false,
      enforcePostLeap: false,
      enforceStrongBeatChordTone: false,
      enforceStrongBeatDegree: false,
      enforceContourBand: false,
      enforceCadence: false,
    },
  ];

  for (const flags of stages) {
    const result = solve(input, flags);
    if (result) return result;
  }
  return null;
}

function solve(input: PitchPlanInput, flags: RuleFlags): number[] | null {
  const { pool, slots, contour, form, harmony, limits } = input;
  const sounding = slots.filter(s => !s.isRest);
  if (!sounding.length) return [];

  const distinctPcs = new Set(pool.midis.map(m => mod12(m)));
  const sparse = distinctPcs.size < 4;
  const tonicAvailable = pool.midis.some(m => pool.degreeOf.get(m) === 1);
  const fifthAvailable = pool.midis.some(m => pool.degreeOf.get(m) === 5);

  const poolLo = pool.midis[0];
  const poolHi = pool.midis[pool.midis.length - 1];

  const startMidi = chooseStart(pool);
  const result: number[] = [startMidi];
  let backtracks = 0;
  const maxBacktracks = Math.max(300, sounding.length * 80);

  function recurse(i: number): boolean {
    if (i === sounding.length) return true;
    const slot = sounding[i];
    const prev = result[i - 1];
    const prevPrev = i >= 2 ? result[i - 2] : null;
    const prevDeg = pool.degreeOf.get(prev);
    const prevInterval = prevPrev != null ? prev - prevPrev : 0;
    const prevWasLeap = Math.abs(prevInterval) > 2;
    const prevDir = Math.sign(prevInterval);

    // Repeat cap: count how many consecutive identical pitches end at i-1.
    let trailingRepeats = 0;
    for (let j = i - 1; j >= 0 && result[j] === prev; j--) trailingRepeats++;

    const barIdx = slot.barIdx;
    const isClimaxBar = barIdx === contour.climaxBarIdx;
    const band = contour.perBarBand[barIdx];
    const [bandLo, bandHi] = bandWindow(band, poolLo, poolHi);

    // Chord tones for this bar (if a progression is active).
    const chordPcs = harmony ? harmony.chordTonesByBar[barIdx] : null;

    // Build candidate set with all filters applied.
    let cands = pool.midis.filter(m => {
      const interval = m - prev;
      const abs = Math.abs(interval);

      // Repeat cap.
      if (m === prev && trailingRepeats >= limits.repeatCap) return false;

      // Tier-bound max leap.
      if (abs > limits.maxLeap) return false;

      // Stay roughly within the tier's window around the starting pitch.
      if (Math.abs(m - result[0]) > limits.windowSemitones) return false;

      const deg = pool.degreeOf.get(m);
      if (deg == null) return false;

      // Final note resolves to tonic when available.
      if (slot.isFinal) {
        if (tonicAvailable && deg !== 1) return false;
        if (!tonicAvailable && deg !== pool.degreeOf.get(pool.midis[0])) return false;
        return true;
      }

      if (flags.enforceCadence && slot.isCadence && !sparse) {
        // Half cadence: V (preferred) or IV/2.
        if (fifthAvailable) {
          if (deg !== 5 && deg !== 2) return false;
        } else if (deg !== 2 && deg !== 4) return false;
      }

      if (flags.enforceStrongBeatChordTone && slot.isStrong && chordPcs && !sparse) {
        if (!chordPcs.has(mod12(m))) return false;
      } else if (flags.enforceStrongBeatDegree && slot.isStrong && !chordPcs && !sparse) {
        if (deg !== 1 && deg !== 3 && deg !== 5) return false;
      }

      if (flags.enforcePostLeap && prevWasLeap) {
        if (abs > 2) return false;
        if (prevDir !== 0 && Math.sign(interval) === prevDir) return false;
      }

      if (flags.enforceTendency && !sparse) {
        if (prevDeg === 7 && deg !== 1 && abs > 2) return false;
        if (prevDeg === 4 && abs > 2) return false;
      }

      if (flags.enforceContourBand) {
        if (isClimaxBar) {
          // Climax bar holds the contour extreme. For 'high'-band climaxes
          // (arch / ascent / descent) require an upper-half pitch; for
          // 'low'-band climaxes (valley) require a lower-half pitch.
          if (band === 'high' && m < bandLo) return false;
          if (band === 'low' && m > bandHi) return false;
        } else if (m < bandLo || m > bandHi) {
          // Non-climax bars: soft band — only enforce when the pool has
          // enough tones inside the band to satisfy the slot count.
          const inBandCount = pool.midis.filter(p => p >= bandLo && p <= bandHi).length;
          if (inBandCount >= 3) return false;
        }
      }

      return true;
    });

    if (!cands.length) return false;

    // Weight by interval size: prefer stepwise motion (70/30 step/leap).
    const weights = cands.map(m => {
      if (m === prev) return 6;
      const abs = Math.abs(m - prev);
      if (abs <= 2) return 70;
      if (abs <= 4) return 22;
      if (abs <= 7) return 6;
      return 2;
    });

    const ordered = shuffleWeighted(cands, weights);
    for (const cand of ordered) {
      result[i] = cand;
      if (recurse(i + 1)) return true;
      backtracks++;
      if (backtracks > maxBacktracks) return false;
    }
    result.length = i;
    return false;
  }

  if (sounding.length === 1) {
    // Single sounding slot: it must be the final, which means tonic.
    if (sounding[0].isFinal && tonicAvailable) {
      const t = pool.midis.find(m => pool.degreeOf.get(m) === 1);
      return t != null ? [t] : [startMidi];
    }
    return [startMidi];
  }

  if (recurse(1)) {
    return applyMotifs(result, sounding, form, pool, limits);
  }
  return null;
}

// After the constraint solver runs, replay motif source bars into their
// target bars. This is a best-effort pass — when the transform would
// produce pitches outside the pool, we leave the original generated
// pitches untouched.
function applyMotifs(
  pitches: number[],
  sounding: RhythmSlot[],
  form: PhraseForm,
  pool: PlayablePool,
  limits: TierLimits,
): number[] {
  const out = pitches.slice();
  const indexByBar = new Map<number, number[]>();
  for (let i = 0; i < sounding.length; i++) {
    const b = sounding[i].barIdx;
    const list = indexByBar.get(b) ?? [];
    list.push(i);
    indexByBar.set(b, list);
  }

  for (const pair of form.motifPairs) {
    const srcIndexes = indexByBar.get(pair.sourceBar);
    const tgtIndexes = indexByBar.get(pair.targetBar);
    if (!srcIndexes || !tgtIndexes) continue;
    // Need at least 2 source notes to define an interval contour, and the
    // target bar must have the same number of sounding slots (otherwise
    // the rhythm wouldn't line up musically and we leave things alone).
    if (srcIndexes.length < 2 || srcIndexes.length !== tgtIndexes.length) continue;

    // Compute the relative intervals from the source bar.
    const srcMidis = srcIndexes.map(i => out[i]);
    const intervals: number[] = [];
    for (let i = 1; i < srcMidis.length; i++) {
      const delta = srcMidis[i] - srcMidis[0];
      intervals.push(pair.transform === 'invert' ? -delta : delta);
    }

    // Find a start pitch for the target bar — prefer a pool tone closest to
    // the generated target[0], then offset by the relative pattern.
    const tgtStart = out[tgtIndexes[0]];
    const target: number[] = [tgtStart];
    let ok = true;
    for (const iv of intervals) {
      const wanted = tgtStart + iv;
      const pick = pool.midis.find(m => m === wanted);
      if (pick == null) { ok = false; break; }
      // Respect tier window from the phrase start.
      if (Math.abs(pick - out[0]) > limits.windowSemitones) { ok = false; break; }
      target.push(pick);
    }
    if (!ok) continue;

    // Don't overwrite the final note (it must stay on the tonic).
    for (let k = 0; k < tgtIndexes.length; k++) {
      const sIdx = tgtIndexes[k];
      if (sounding[sIdx].isFinal) continue;
      out[sIdx] = target[k];
    }
  }
  return out;
}

function chooseStart(pool: PlayablePool): number {
  // Prefer tonic, then 5, then 3, then the closest-to-middle pool tone.
  const wanted = [1, 5, 3];
  const mid = pool.midis[Math.floor(pool.midis.length / 2)];
  for (const d of wanted) {
    const cands = pool.midis.filter(m => pool.degreeOf.get(m) === d);
    if (cands.length) {
      cands.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
      return cands[0];
    }
  }
  return mid;
}

function shuffleWeighted<T>(items: T[], weights: number[]): T[] {
  const out: T[] = [];
  const pool = items.slice();
  const w = weights.slice();
  while (pool.length) {
    const sum = w.reduce((a, b) => a + b, 0);
    if (sum <= 0) { out.push(...pool); break; }
    let r = Math.random() * sum;
    let idx = 0;
    for (; idx < w.length; idx++) {
      r -= w[idx];
      if (r <= 0) break;
    }
    if (idx >= pool.length) idx = pool.length - 1;
    out.push(pool[idx]);
    pool.splice(idx, 1);
    w.splice(idx, 1);
  }
  return out;
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}
