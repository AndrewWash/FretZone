import type { BaseLetter } from '../theory/note';
import type { ModeName } from '../theory/modes';
import type { StringId } from '../quiz/models';

export type Difficulty = 'Easy' | 'Intermediate';

export type PhraseBarCount = 2 | 4 | 8;
export const PHRASE_BAR_OPTIONS: readonly PhraseBarCount[] = [2, 4, 8];

export type LimitMode = 'iterations' | 'time';

export interface MelodyConfig {
  difficulty: Difficulty;
  tonic: BaseLetter;
  mode: ModeName;
  fretStart: number;
  fretEnd: number;
  strings: StringId[];
  iterations: number;
  bars: PhraseBarCount;
  limitMode: LimitMode;
  timeMinutes: number;
  a4: number;
  centsTolerance: number;
}

export type TickKind = 'note' | 'rest';
export type TickDuration = 'q' | '8';

export interface MelodyTickable {
  kind: TickKind;
  duration: TickDuration;
  midi?: number;     // sounding MIDI when kind === 'note'
  beat: number;      // start position in beats from phrase start (0..barCount*4-0.5)
}

export interface MelodyPhrase {
  tickables: MelodyTickable[];
  bars: MelodyTickable[][];
  noteMidis: number[];   // sounding MIDIs in play order, used for detection
}
