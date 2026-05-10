import { STANDARD_TUNING_MIDI, BASE_LETTERS } from '../theory/note';
import { scalePitchClasses, scaleDegree, ModeName } from '../theory/modes';
import type { MelodyConfig, MelodyPhrase, MelodyTickable, PhraseBarCount, TickDuration } from './models';
import { PHRASE_BAR_OPTIONS } from './models';
import type { StringId } from '../quiz/models';

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
    a4: 440,
    centsTolerance: 25,
  };
}

export function normalizeBarCount(n: unknown): PhraseBarCount {
  return PHRASE_BAR_OPTIONS.includes(n as PhraseBarCount) ? (n as PhraseBarCount) : 2;
}

function mod12(n: number) { return ((n % 12) + 12) % 12; }

export interface PlayablePool {
  midis: number[];
  degreeOf: Map<number, number>;
}

export function playablePool(cfg: MelodyConfig): PlayablePool {
  const pcs = new Set(scalePitchClasses(cfg.tonic, cfg.mode));
  const strings: StringId[] = cfg.strings.length ? cfg.strings : [1, 2, 3, 4, 5, 6];
  const start = Math.max(1, Math.min(cfg.fretStart, cfg.fretEnd));
  const end = Math.min(16, Math.max(cfg.fretStart, cfg.fretEnd));

  const set = new Set<number>();
  for (const s of strings) {
    const open = STANDARD_TUNING_MIDI[s - 1];
    if (pcs.has(mod12(open))) set.add(open);
    for (let f = start; f <= end; f++) {
      const m = open + f;
      if (pcs.has(mod12(m))) set.add(m);
    }
  }
  const midis = [...set].sort((a, b) => a - b);
  const degreeOf = new Map<number, number>();
  for (const m of midis) {
    const d = scaleDegree(m, cfg.tonic, cfg.mode);
    if (d != null) degreeOf.set(m, d);
  }
  return { midis, degreeOf };
}

interface RhythmSlot {
  duration: TickDuration;     // 'q' or '8'
  beat: number;               // start position
  isRest: boolean;
  isStrong: boolean;          // beats 0,2,4,6 (downbeat of each beat group)
  isCadence: boolean;         // antecedent target — sounding slot at/before beat 4
  isFinal: boolean;           // last sounding slot
}

function buildEasyRhythm(barCount: PhraseBarCount): RhythmSlot[] {
  const totalBeats = barCount * 4;
  const slots: RhythmSlot[] = [];
  for (let i = 0; i < totalBeats; i++) {
    slots.push({
      duration: 'q',
      beat: i,
      isRest: false,
      isStrong: i % 2 === 0,
      isCadence: false,
      isFinal: false,
    });
  }
  markCadenceAndFinal(slots, barCount);
  return slots;
}

type BeatChoice = 'q' | 'ee' | 'qr';

function pickBeatPattern(totalBeats: number): BeatChoice[] {
  const beats: BeatChoice[] = [];
  for (let i = 0; i < totalBeats; i++) {
    const r = Math.random();
    if (r < 0.50) beats.push('q');
    else if (r < 0.85) beats.push('ee');
    else beats.push('qr');
  }
  return beats;
}

function buildIntermediateRhythm(barCount: PhraseBarCount): RhythmSlot[] {
  const totalBeats = barCount * 4;
  // scale rest budget with phrase length so a longer phrase doesn't feel sparse
  const minRests = Math.max(1, Math.floor(totalBeats / 8));
  const maxRests = Math.max(2, Math.floor(totalBeats / 3));
  const minEighths = Math.max(1, Math.floor(totalBeats / 4));

  let beats: BeatChoice[] = [];
  let attempts = 0;
  while (attempts++ < 80) {
    beats = pickBeatPattern(totalBeats);
    const rests = beats.filter(b => b === 'qr').length;
    const eighths = beats.filter(b => b === 'ee').length;
    if (rests >= minRests && rests <= maxRests && eighths >= minEighths) {
      // require last beat to be sounding so phrase ends on a note
      if (beats[totalBeats - 1] !== 'qr') break;
    }
  }
  // hard-floor fallback: ensure last beat is sounding
  if (beats[totalBeats - 1] === 'qr') beats[totalBeats - 1] = 'q';

  const slots: RhythmSlot[] = [];
  let beatPos = 0;
  for (const b of beats) {
    const isStrong = beatPos % 2 === 0;
    if (b === 'q') {
      slots.push({ duration: 'q', beat: beatPos, isRest: false, isStrong, isCadence: false, isFinal: false });
    } else if (b === 'ee') {
      slots.push({ duration: '8', beat: beatPos,       isRest: false, isStrong, isCadence: false, isFinal: false });
      slots.push({ duration: '8', beat: beatPos + 0.5, isRest: false, isStrong: false, isCadence: false, isFinal: false });
    } else {
      slots.push({ duration: 'q', beat: beatPos, isRest: true, isStrong, isCadence: false, isFinal: false });
    }
    beatPos += 1;
  }

  markCadenceAndFinal(slots, barCount);
  return slots;
}

// Mark cadence target (sounding slot at or before phrase midpoint) and final
// (last sounding slot). For 2-bar phrases the midpoint sits at end-of-bar-1;
// for 4 it's end-of-bar-2; for 8 it's end-of-bar-4. This gives an
// antecedent (half-cadence on 2 or 5) → consequent (resolves to 1) shape
// that scales with phrase length.
function markCadenceAndFinal(slots: RhythmSlot[], barCount: PhraseBarCount): void {
  const sounding = slots.filter(s => !s.isRest);
  if (!sounding.length) return;
  const midBeat = (barCount * 4) / 2;
  const cadenceCandidate = [...sounding].reverse().find(s => s.beat < midBeat);
  if (cadenceCandidate) cadenceCandidate.isCadence = true;
  sounding[sounding.length - 1].isFinal = true;
}

function shuffleWeighted<T>(items: T[], weights: number[]): T[] {
  const out: T[] = [];
  const pool = items.slice();
  const w = weights.slice();
  while (pool.length) {
    const sum = w.reduce((a, b) => a + b, 0);
    if (sum <= 0) {
      // append remainder in original order
      out.push(...pool);
      break;
    }
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

interface RuleFlags {
  enforceTendency: boolean;
  enforcePostLeap: boolean;
  enforceStrongBeat: boolean;
  enforceCadence: boolean;
}

function chooseStart(pool: PlayablePool, anchorMidi: number | null): number {
  // prefer tonic, then degree 5, then 3
  const wanted = [1, 5, 3];
  for (const d of wanted) {
    const candidates = pool.midis.filter(m => pool.degreeOf.get(m) === d);
    if (candidates.length) {
      if (anchorMidi == null) return candidates[Math.floor(Math.random() * candidates.length)];
      // pick the one closest to a comfortable middle of the pool
      candidates.sort((a, b) => Math.abs(a - anchorMidi) - Math.abs(b - anchorMidi));
      return candidates[0];
    }
  }
  // fallback: lowest-degree present
  return pool.midis[0];
}

function midRangeMidi(pool: PlayablePool): number {
  if (!pool.midis.length) return 60;
  const lo = pool.midis[0];
  const hi = pool.midis[pool.midis.length - 1];
  return Math.round((lo + hi) / 2);
}

function generatePitches(
  pool: PlayablePool,
  slots: RhythmSlot[],
  flags: RuleFlags,
): number[] | null {
  const sounding = slots.filter(s => !s.isRest);
  const distinctPcs = new Set(pool.midis.map(mod12));
  const sparse = distinctPcs.size < 4;

  const startMidi = chooseStart(pool, midRangeMidi(pool));
  const startDeg = pool.degreeOf.get(startMidi);
  const tonicAvailable = pool.midis.some(m => pool.degreeOf.get(m) === 1);

  const result: number[] = [startMidi];
  let backtracks = 0;
  const MAX_BACKTRACKS = Math.max(250, sounding.length * 60);

  function recurse(i: number): boolean {
    if (i === sounding.length) return true;
    const slot = sounding[i];
    const prev = result[i - 1];
    const prevPrev = i >= 2 ? result[i - 2] : null;
    const prevDeg = pool.degreeOf.get(prev);
    const prevInterval = prevPrev != null ? prev - prevPrev : 0;
    const prevWasLeap = Math.abs(prevInterval) > 2;
    const prevDir = Math.sign(prevInterval);

    // build candidate set
    let cands = pool.midis.filter(m => {
      if (m === prev) return true; // allow repeats
      const interval = m - prev;
      const abs = Math.abs(interval);
      if (abs > 7) return false;                              // no leap > P5
      if (Math.abs(m - result[0]) > 12) return false;         // ±octave from start

      const deg = pool.degreeOf.get(m);
      if (deg == null) return false;

      if (flags.enforceStrongBeat && slot.isStrong) {
        if (!sparse && deg !== 1 && deg !== 3 && deg !== 5) return false;
      }
      if (flags.enforceCadence && slot.isCadence && !sparse) {
        if (deg !== 2 && deg !== 5) return false;
      }
      if (slot.isFinal) {
        if (tonicAvailable) { if (deg !== 1) return false; }
        else { if (deg !== pool.degreeOf.get(pool.midis[0])) return false; }
      }
      if (flags.enforcePostLeap && prevWasLeap) {
        // recover by step in opposite direction
        if (abs > 2) return false;
        if (prevDir !== 0 && Math.sign(interval) === prevDir) return false;
      }
      if (flags.enforceTendency && !sparse) {
        if (prevDeg === 7 && deg !== 1 && abs > 2) return false;
        if (prevDeg === 4 && abs > 2) return false; // discourage leap from 4
      }
      return true;
    });

    if (!cands.length) return false;

    // weights based on interval size
    const weights = cands.map(m => {
      if (m === prev) return 8;          // repeat — possible but uncommon
      const abs = Math.abs(m - prev);
      if (abs <= 2) return 70;
      if (abs <= 4) return 22;
      if (abs <= 5) return 6;
      return 2;
    });
    const ordered = shuffleWeighted(cands, weights);

    for (const cand of ordered) {
      result[i] = cand;
      if (recurse(i + 1)) return true;
      backtracks++;
      if (backtracks > MAX_BACKTRACKS) return false;
    }
    result.length = i;
    return false;
  }

  // handle 1-slot edge case: starting note IS the only sounding note
  if (sounding.length === 1) {
    if (!sounding[0].isFinal || !tonicAvailable) return result;
    if (startDeg === 1) return result;
    const t = pool.midis.find(m => pool.degreeOf.get(m) === 1);
    return t != null ? [t] : result;
  }

  // if final slot exists but the start happens to also be final (edge case), skip recursion
  if (recurse(1)) return result;
  return null;
}

export function generatePhrase(cfg: MelodyConfig): MelodyPhrase {
  const pool = playablePool(cfg);
  if (!pool.midis.length) {
    throw new Error('No playable scale tones in the selected fret range and strings.');
  }

  const barCount = normalizeBarCount(cfg.bars);
  const slots = cfg.difficulty === 'Easy'
    ? buildEasyRhythm(barCount)
    : buildIntermediateRhythm(barCount);

  // try with all rules; relax in stages on failure
  const stages: RuleFlags[] = [
    { enforceTendency: true,  enforcePostLeap: true,  enforceStrongBeat: true,  enforceCadence: true  },
    { enforceTendency: false, enforcePostLeap: true,  enforceStrongBeat: true,  enforceCadence: true  },
    { enforceTendency: false, enforcePostLeap: false, enforceStrongBeat: true,  enforceCadence: true  },
    { enforceTendency: false, enforcePostLeap: false, enforceStrongBeat: false, enforceCadence: true  },
    { enforceTendency: false, enforcePostLeap: false, enforceStrongBeat: false, enforceCadence: false },
  ];

  let pitches: number[] | null = null;
  for (const flags of stages) {
    pitches = generatePitches(pool, slots, flags);
    if (pitches) break;
  }
  if (!pitches) {
    // last-resort: random walk through pool, ignoring rules entirely
    pitches = [chooseStart(pool, midRangeMidi(pool))];
    const sounding = slots.filter(s => !s.isRest).length;
    while (pitches.length < sounding) {
      const prev = pitches[pitches.length - 1];
      const close = pool.midis
        .filter(m => Math.abs(m - prev) <= 7 && Math.abs(m - pitches![0]) <= 12);
      pitches.push(close.length ? close[Math.floor(Math.random() * close.length)] : prev);
    }
  }

  // assemble tickables
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
    const lo = b * 4;
    const hi = lo + 4;
    bars.push(tickables.filter(t => t.beat >= lo && t.beat < hi));
  }
  const noteMidis = tickables.filter(t => t.kind === 'note').map(t => t.midi!);

  return { tickables, bars, noteMidis };
}

export const ALL_TONICS = [...BASE_LETTERS];
