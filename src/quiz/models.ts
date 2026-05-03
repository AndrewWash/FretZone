import type { NoteName } from '../theory/note';

export type StringId = 1|2|3|4|5|6; // 1=low E, 6=high E

export interface QuizConfig {
  fretStart: number; // inclusive, 1..16 per spec (0=open always included)
  fretEnd: number;   // inclusive
  strings: StringId[]; // allowed strings for prompts
  notes: NoteName[]; // allowed chromatic note names
  sightReading: boolean; // hide string hint
  iterations: number; // number of prompts
  timeLimitSec: number; // per note
  a4: number; // calibration
  centsTolerance: number; // correctness tolerance
}

export interface Prompt {
  stringId: StringId;
  fret: number; // 0..16 (0 means open)
  midi: number; // target midi sounding
}

export interface QuizState {
  index: number; // 0-based current prompt
  score: number; // correct count
  remainingSec: number; // timer
  current?: Prompt;
  done: boolean;
  results: { correct: boolean; prompt: Prompt; heardHz?: number }[];
}
