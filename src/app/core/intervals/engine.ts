import { midiToFreq, STANDARD_TUNING_MIDI, AccidentalMode, spellMidi, BaseLetter } from '../theory/note';
import { randOf } from '../utils/random';

export type IntervalType = 'm2'|'M2'|'m3'|'M3'|'P4'|'Aug4'|'Dim5'|'P5'|'m6'|'M6'|'m7'|'M7'|'P8';
export type DirectionMode = 'UpDown'|'DownUp';
export type DisplayMode = 'Dyad'|'Sequential'|'Both';
export type LimitMode = 'iterations' | 'time';

export interface IntervalConfig {
  fretStart: number;
  fretEnd: number;
  strings: (1|2|3|4|5|6)[];
  intervals: IntervalType[];
  direction: DirectionMode;
  display: DisplayMode;
  iterations: number;
  limitMode: LimitMode;
  timeMinutes: number;
  a4: number;
  centsTolerance: number;
  accidentalMode: AccidentalMode;
}

export interface FretPos { stringId: 1|2|3|4|5|6; fret: number; midi: number; }
export interface DyadPrompt {
  anchor: FretPos;
  partner: FretPos;
  anchorIsBottom: boolean;
  upward: boolean;
  interval: IntervalType;
  display: 'Dyad'|'Sequential';
}

export function defaultIntervalConfig(): IntervalConfig {
  return {
    fretStart: 1,
    fretEnd: 5,
    strings: [1,2,3,4,5,6],
    intervals: ['P5'],
    direction: 'UpDown',
    display: 'Dyad',
    iterations: 10,
    limitMode: 'iterations',
    timeMinutes: 3,
    a4: 440,
    centsTolerance: 25,
    accidentalMode: 'Naturals',
  };
}

export function allPlayable(cfg: IntervalConfig): FretPos[] {
  const res: FretPos[] = [];
  const strings = cfg.strings.length ? cfg.strings : [1,2,3,4,5,6];
  for (const s of strings) {
    const m = STANDARD_TUNING_MIDI[s-1];
    res.push({ stringId: s as any, fret: 0, midi: m });
  }
  const start = Math.max(1, Math.min(cfg.fretStart, cfg.fretEnd));
  const end = Math.min(20, Math.max(cfg.fretStart, cfg.fretEnd));
  for (const s of strings) {
    const base = STANDARD_TUNING_MIDI[s-1];
    for (let f = start; f <= end; f++) res.push({ stringId: s as any, fret: f, midi: base + f });
  }
  return res;
}

const INTERVAL_TO_SEMITONES: Record<IntervalType, number> = {
  m2: 1, M2: 2,
  m3: 3, M3: 4,
  P4: 5, Aug4: 6, Dim5: 6,
  P5: 7,
  m6: 8, M6: 9,
  m7: 10, M7: 11,
  P8: 12,
};

export interface Cycle {
  step1: DyadPrompt;
  step2: DyadPrompt;
}

export function buildCycle(cfg: IntervalConfig): Cycle {
  const playable = allPlayable(cfg);
  if (!playable.length) throw new Error('No playable notes in range');
  const interval = cfg.intervals.length ? randOf(cfg.intervals) : 'P5';
  const semis = INTERVAL_TO_SEMITONES[interval];

  const playableSet = new Set(playable.map(p => p.midi));
  const anchors = playable.filter(p => playableSet.has(p.midi + semis) && playableSet.has(p.midi - semis));
  const anchor = anchors.length ? randOf(anchors) : randOf(playable);
  const upMidi = anchor.midi + semis;
  const downMidi = anchor.midi - semis;
  const upPartner = randOf(playable.filter(p => p.midi === upMidi)) || { stringId: anchor.stringId, fret: anchor.fret + semis, midi: upMidi } as FretPos;
  const downPartner = randOf(playable.filter(p => p.midi === downMidi)) || { stringId: anchor.stringId, fret: Math.max(0, anchor.fret - semis), midi: downMidi } as FretPos;

  const display = cfg.display === 'Both' ? (Math.random() < 0.5 ? 'Dyad' : 'Sequential') : cfg.display;

  if (cfg.direction === 'UpDown') {
    return {
      step1: { anchor, partner: upPartner, anchorIsBottom: true, upward: true, interval, display },
      step2: { anchor, partner: downPartner, anchorIsBottom: false, upward: false, interval, display },
    };
  } else {
    return {
      step1: { anchor, partner: downPartner, anchorIsBottom: false, upward: false, interval, display },
      step2: { anchor, partner: upPartner, anchorIsBottom: true, upward: true, interval, display },
    };
  }
}

export function writtenNoteNameFromMidi(midiSounding: number, mode: AccidentalMode): { key: string; accidental?: '#'|'b'; octave: number; letter: string; name: string } {
  const spelled = spellMidi(midiSounding + 12, mode);
  return { key: spelled.key, accidental: spelled.accidental, octave: spelled.octave, letter: spelled.letter, name: spelled.name };
}

export function overrideSpellingForTritone(anchorMidi: number, partnerMidi: number, interval: IntervalType, mode: AccidentalMode): { key: string; accidental?: '#'|'b' } | null {
  if (interval !== 'Aug4' && interval !== 'Dim5') return null;
  const a = writtenNoteNameFromMidi(anchorMidi, mode);
  const p = writtenNoteNameFromMidi(partnerMidi, mode);
  const letters = ['c','d','e','f','g','a','b'];
  const aIdx = letters.indexOf(a.letter);
  if (aIdx < 0) return null;
  const targetIdx = interval === 'Aug4' ? (aIdx + 3) % 7 : (aIdx + 4) % 7;
  const targetLetter = letters[targetIdx];
  const octave = p.octave;
  if (interval === 'Aug4') {
    return { key: `${targetLetter}#/${octave}`, accidental: '#' };
  } else {
    return { key: `${targetLetter}b/${octave}`, accidental: 'b' };
  }
}
