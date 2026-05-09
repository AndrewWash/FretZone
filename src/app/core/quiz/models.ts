import type { BaseLetter, AccidentalMode } from '../theory/note';

export type StringId = 1|2|3|4|5|6;

export interface QuizConfig {
  fretStart: number;
  fretEnd: number;
  strings: StringId[];
  notes: BaseLetter[];
  accidentalMode: AccidentalMode;
  sightReading: boolean;
  iterations: number;
  timeLimitSec: number;
  a4: number;
  centsTolerance: number;
}

export interface Prompt {
  stringId: StringId;
  fret: number;
  midi: number;
}

export interface QuizState {
  index: number;
  score: number;
  remainingSec: number;
  current?: Prompt;
  done: boolean;
  results: { correct: boolean; prompt: Prompt; heardHz?: number }[];
}
