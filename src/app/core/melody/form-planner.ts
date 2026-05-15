import type { Difficulty, PhraseBarCount } from './models';

export type FormName = 'statement' | 'period' | 'sentence' | 'AABA';

export type BarRole =
  | 'motif-establish'   // first statement of the motif
  | 'motif-repeat'      // exact or near-exact restatement
  | 'motif-vary'        // varied restatement (transposed or inverted)
  | 'continuation'      // develops the motif (no direct restatement)
  | 'contrast'          // B-section material (AABA)
  | 'cadence'           // resolves to the cadence target
  | 'free';

export type MotifTransform = 'identity' | 'transpose' | 'invert';

export interface MotifBeat {
  // Bars participating in the motif, in source/target pairs.
  sourceBar: number;
  targetBar: number;
  transform: MotifTransform;
}

export interface PhraseForm {
  form: FormName;
  // One role per bar.
  roles: BarRole[];
  // Bar index that holds the cadence midpoint (V or IV target).
  cadenceMidBar: number;
  // Bar index that ends the phrase (final note resolves to tonic).
  finalBar: number;
  // Motif pairs — when filling a target bar, the pitch planner consults the
  // source bar's pitch contour and applies the transform.
  motifPairs: MotifBeat[];
}

// Pick the form for a phrase. Higher difficulty unlocks longer forms;
// shorter phrases collapse to simpler shapes.
export function planForm(barCount: PhraseBarCount, difficulty: Difficulty): PhraseForm {
  switch (barCount) {
    case 2:  return makeStatement(barCount);
    case 4:  return makeStatement(barCount);
    case 8:  return makePeriod(barCount, difficulty);
    case 16: return makeAABA(barCount, difficulty);
  }
}

function makeStatement(barCount: PhraseBarCount): PhraseForm {
  const roles: BarRole[] = [];
  const motifPairs: MotifBeat[] = [];
  // 2 bars: bar0 establishes, bar1 cadences with light variation.
  // 4 bars: bar0 establishes, bar1 continues, bar2 varies bar0, bar3 cadences.
  if (barCount === 2) {
    roles.push('motif-establish', 'cadence');
  } else {
    roles.push('motif-establish', 'continuation', 'motif-vary', 'cadence');
    motifPairs.push({ sourceBar: 0, targetBar: 2, transform: 'transpose' });
  }
  return {
    form: 'statement',
    roles,
    cadenceMidBar: Math.floor(barCount / 2) - 1,
    finalBar: barCount - 1,
    motifPairs,
  };
}

function makePeriod(barCount: PhraseBarCount, difficulty: Difficulty): PhraseForm {
  // Period form: antecedent (bars 0-3) + consequent (bars 4-7).
  // Both halves share the first 2 bars (motif statement + continuation),
  // then diverge: antecedent ends on a half cadence, consequent on tonic.
  const roles: BarRole[] = [
    'motif-establish',  // bar 0
    'continuation',     // bar 1
    'continuation',     // bar 2
    'cadence',          // bar 3 — half cadence
    'motif-repeat',     // bar 4 — restate the motif
    'continuation',     // bar 5
    'continuation',     // bar 6
    'cadence',          // bar 7 — authentic cadence
  ];
  const motifPairs: MotifBeat[] = [
    { sourceBar: 0, targetBar: 4, transform: difficulty === 'Easy' ? 'identity' : 'transpose' },
  ];
  return {
    form: 'period',
    roles,
    cadenceMidBar: 3,
    finalBar: 7,
    motifPairs,
  };
}

function makeAABA(barCount: PhraseBarCount, difficulty: Difficulty): PhraseForm {
  // AABA on 16 bars (4-bar units): A (0-3) | A' (4-7) | B (8-11) | A'' (12-15).
  // Each A statement is its own mini period: motif + continuation + restate + cadence.
  // The B section provides melodic contrast — no motif reuse.
  const roles: BarRole[] = [
    // A
    'motif-establish', 'continuation', 'motif-vary',     'cadence',
    // A'
    'motif-repeat',    'continuation', 'motif-vary',     'cadence',
    // B (contrast)
    'contrast',        'contrast',     'contrast',       'contrast',
    // A''
    'motif-repeat',    'continuation', 'motif-vary',     'cadence',
  ];
  const expertOnly = difficulty === 'Expert';
  const motifPairs: MotifBeat[] = [
    { sourceBar: 0, targetBar: 2,  transform: 'transpose' },
    { sourceBar: 0, targetBar: 4,  transform: 'identity' },
    { sourceBar: 0, targetBar: 6,  transform: expertOnly ? 'invert' : 'transpose' },
    { sourceBar: 0, targetBar: 12, transform: 'identity' },
    { sourceBar: 0, targetBar: 14, transform: 'transpose' },
  ];
  return {
    form: 'AABA',
    roles,
    cadenceMidBar: 7,
    finalBar: 15,
    motifPairs,
  };
}
