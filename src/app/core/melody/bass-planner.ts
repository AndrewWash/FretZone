import { scalePitchClasses } from '../theory/modes';
import type { ChordDegree, HarmonyPlan } from './harmony-planner';
import type { MelodyConfig, MelodyTickable } from './models';

// Bass voice MIDI range: low E2 (40) to D#3 (51). Every pitch class has exactly
// one octave inside this window, so resolving a pc to a MIDI is deterministic
// and the bass sits with at most ~2 ledger lines below the treble staff —
// natural for a guitar.
const BASS_LO = 40;
const BASS_HI = 51;

// Map a chord scale-degree to a MIDI in [BASS_LO, BASS_HI].
function rootMidiOf(degree: ChordDegree, scalePcs: number[]): number {
  const pc = scalePcs[(degree - 1) % 7];
  const offset = ((pc - BASS_LO) % 12 + 12) % 12;
  return BASS_LO + offset;
}

// Snap a pitch class to the MIDI in [BASS_LO, BASS_HI] (always exactly one).
function pcToBassMidi(pc: number): number {
  const offset = ((pc - BASS_LO) % 12 + 12) % 12;
  return BASS_LO + offset;
}

// Pick a non-root chord tone for the bar (used by Intermediate's 5th and the
// middle beats of Expert's walking line). Falls back to the root if the chord
// has no other tones somehow.
function chordToneOther(
  rootPc: number,
  chordPcs: Set<number>,
  prefer?: 'fifth' | 'third',
  scalePcs?: number[],
  degree?: ChordDegree,
): number {
  if (prefer === 'fifth' && scalePcs && degree) {
    const fifthPc = scalePcs[(degree - 1 + 4) % 7];
    if (chordPcs.has(fifthPc)) return fifthPc;
  }
  if (prefer === 'third' && scalePcs && degree) {
    const thirdPc = scalePcs[(degree - 1 + 2) % 7];
    if (chordPcs.has(thirdPc)) return thirdPc;
  }
  for (const pc of chordPcs) if (pc !== rootPc) return pc;
  return rootPc;
}

// Build a quarter-note that targets a step-neighbor of the NEXT bar's root.
// Diatonic neighbor (one scale degree above or below); prefer the neighbor
// that's already a chord tone in the CURRENT bar (smoother voice leading);
// tiebreak below (gives 5→1 / 7→1 motion which is the classic walking move).
function approachPcToNextRoot(
  nextDeg: ChordDegree,
  currentChord: Set<number>,
  scalePcs: number[],
): number {
  const aboveDeg = (nextDeg % 7) + 1;
  const belowDeg = nextDeg === 1 ? 7 : nextDeg - 1;
  const abovePc = scalePcs[aboveDeg - 1];
  const belowPc = scalePcs[belowDeg - 1];
  const aboveInChord = currentChord.has(abovePc);
  const belowInChord = currentChord.has(belowPc);
  if (belowInChord && !aboveInChord) return belowPc;
  if (aboveInChord && !belowInChord) return abovePc;
  return belowPc;
}

interface EmitArgs {
  beatStart: number;
  beatsPerBar: number;
  degree: ChordDegree;
  chordPcs: Set<number>;
  nextDegree: ChordDegree;
  scalePcs: number[];
}

function emitEasy(a: EmitArgs): MelodyTickable[] {
  const root = rootMidiOf(a.degree, a.scalePcs);
  if (a.beatsPerBar === 4) {
    return [{ kind: 'note', duration: 'w', midi: root, beat: a.beatStart }];
  }
  // 3/4: half + quarter on the root (TickDuration has no dotted-half token).
  return [
    { kind: 'note', duration: 'h', midi: root, beat: a.beatStart },
    { kind: 'note', duration: 'q', midi: root, beat: a.beatStart + 2 },
  ];
}

function emitIntermediate(a: EmitArgs): MelodyTickable[] {
  const root = rootMidiOf(a.degree, a.scalePcs);
  const fifthPc = a.scalePcs[(a.degree - 1 + 4) % 7];
  const fifth = pcToBassMidi(fifthPc);
  if (a.beatsPerBar === 4) {
    return [
      { kind: 'note', duration: 'h', midi: root, beat: a.beatStart },
      { kind: 'note', duration: 'h', midi: fifth, beat: a.beatStart + 2 },
    ];
  }
  // 3/4: half (root) + quarter (5th).
  return [
    { kind: 'note', duration: 'h', midi: root, beat: a.beatStart },
    { kind: 'note', duration: 'q', midi: fifth, beat: a.beatStart + 2 },
  ];
}

function emitExpert(a: EmitArgs): MelodyTickable[] {
  const root = rootMidiOf(a.degree, a.scalePcs);
  const rootPc = a.scalePcs[(a.degree - 1) % 7];
  const approachPc = approachPcToNextRoot(a.nextDegree, a.chordPcs, a.scalePcs);
  const approach = pcToBassMidi(approachPc);

  if (a.beatsPerBar === 3) {
    // 3 quarters: root → chord tone (5th preferred) → approach to next root.
    const fifth = pcToBassMidi(chordToneOther(rootPc, a.chordPcs, 'fifth', a.scalePcs, a.degree));
    return [
      { kind: 'note', duration: 'q', midi: root, beat: a.beatStart },
      { kind: 'note', duration: 'q', midi: fifth, beat: a.beatStart + 1 },
      { kind: 'note', duration: 'q', midi: approach, beat: a.beatStart + 2 },
    ];
  }

  // 4/4: 4 quarters — root, chord tone A, chord tone B, approach.
  // Pick one of {third, fifth} for beat 2 randomly so phrases vary; the other
  // goes on beat 3. Falls back to whatever chordPcs has if a tone is missing.
  const pickFifthFirst = Math.random() < 0.5;
  const firstPc = pickFifthFirst
    ? chordToneOther(rootPc, a.chordPcs, 'fifth', a.scalePcs, a.degree)
    : chordToneOther(rootPc, a.chordPcs, 'third', a.scalePcs, a.degree);
  const secondPc = pickFifthFirst
    ? chordToneOther(rootPc, a.chordPcs, 'third', a.scalePcs, a.degree)
    : chordToneOther(rootPc, a.chordPcs, 'fifth', a.scalePcs, a.degree);
  return [
    { kind: 'note', duration: 'q', midi: root, beat: a.beatStart },
    { kind: 'note', duration: 'q', midi: pcToBassMidi(firstPc), beat: a.beatStart + 1 },
    { kind: 'note', duration: 'q', midi: pcToBassMidi(secondPc), beat: a.beatStart + 2 },
    { kind: 'note', duration: 'q', midi: approach, beat: a.beatStart + 3 },
  ];
}

export function planBass(
  harmony: HarmonyPlan,
  cfg: MelodyConfig,
  beatsPerBar: number,
): MelodyTickable[][] {
  const barCount = harmony.chordsByBar.length;
  if (!barCount) return [];

  const scalePcs = scalePitchClasses(cfg.tonic, cfg.mode);
  const out: MelodyTickable[][] = [];

  for (let b = 0; b < barCount; b++) {
    const degree = harmony.chordsByBar[b];
    const nextDegree = harmony.chordsByBar[(b + 1) % barCount];
    const args: EmitArgs = {
      beatStart: b * beatsPerBar,
      beatsPerBar,
      degree,
      chordPcs: harmony.chordTonesByBar[b],
      nextDegree,
      scalePcs,
    };
    switch (cfg.difficulty) {
      case 'Intermediate':
        out.push(emitIntermediate(args));
        break;
      case 'Expert':
        out.push(emitExpert(args));
        break;
      case 'Easy':
      case 'Custom':
      default:
        out.push(emitEasy(args));
        break;
    }
  }
  return out;
}
