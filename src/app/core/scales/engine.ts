import { getFretMidi } from '../theory/note';
import type { PatternNote, ScalesConfig, SegoviaPattern } from './models';

export interface ScaleRunNote {
  midi: number;
  stringId: 1 | 2 | 3 | 4 | 5 | 6;
  fret: number;
  finger: 1 | 2 | 3 | 4 | null;
}

export interface ScaleRun {
  ascending: ScaleRunNote[];
  descending: ScaleRunNote[];
  full: ScaleRunNote[];
  midis: number[];
}

function patternNoteToRun(p: PatternNote): ScaleRunNote {
  // Catalog/diagram/tab use stringId 1 = high E (top); getFretMidi expects
  // 1 = low E (STANDARD_TUNING_MIDI index 0). Flip at the boundary.
  return {
    midi: getFretMidi(7 - p.stringId, p.fret),
    stringId: p.stringId,
    fret: p.fret,
    finger: p.finger,
  };
}

export function patternToRun(p: SegoviaPattern): ScaleRun {
  const ascending = p.ascending.map(patternNoteToRun);
  const descending = p.descending.map(patternNoteToRun);
  // If the descending list begins on the same pitch the ascending ends on
  // (apex shared), drop that first descending note to avoid double-attack.
  let descTail = descending;
  if (
    ascending.length > 0 &&
    descending.length > 0 &&
    ascending[ascending.length - 1].midi === descending[0].midi &&
    ascending[ascending.length - 1].stringId === descending[0].stringId &&
    ascending[ascending.length - 1].fret === descending[0].fret
  ) {
    descTail = descending.slice(1);
  }
  const full = [...ascending, ...descTail];
  return {
    ascending,
    descending,
    full,
    midis: full.map(n => n.midi),
  };
}

export function defaultScalesConfig(): ScalesConfig {
  return {
    scaleId: 'c-major',
    showTab: false,
    showFingerings: false,
    rhFingeringPattern: 'off',
    iterations: 1,
    limitMode: 'iterations',
    timeMinutes: 3,
    a4: 440,
    centsTolerance: 25,
  };
}
