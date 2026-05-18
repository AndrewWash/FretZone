import type { BaseLetter } from '../theory/note';
import type { ModeName } from '../theory/modes';
import type { StringId } from '../quiz/models';

export type Difficulty = 'Easy' | 'Intermediate' | 'Expert' | 'Custom';

export type PhraseBarCount = 2 | 4 | 8 | 16;
export const PHRASE_BAR_OPTIONS: readonly PhraseBarCount[] = [2, 4, 8, 16];

export type LimitMode = 'iterations' | 'time';

// Off = never apply a progression; On = always; Random = roll per phrase.
export type ProgressionMode = 'Off' | 'On' | 'Random';

// All durations the engine + renderer understand. Beats per duration:
//   w=4  h=2  q=1  8=0.5  16=0.25  32=0.125
export type TickDuration = 'w' | 'h' | 'q' | '8' | '16' | '32';
export const ALL_NOTE_DURATIONS: readonly TickDuration[] = ['w', 'h', 'q', '8', '16', '32'];
// Rests use a slightly narrower palette — 32nd rests are rarely musical.
export const ALL_REST_DURATIONS: readonly TickDuration[] = ['w', 'h', 'q', '8', '16'];

export const DURATION_BEATS: Record<TickDuration, number> = {
  w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25, '32': 0.125,
};

// Supported meters. Beats per bar are quarter-note beats — both meters use a
// quarter-note beat value, they differ only in how many beats fill a bar.
export type TimeSignature = '4/4' | '3/4';
export const TIME_SIGNATURE_OPTIONS: readonly TimeSignature[] = ['4/4', '3/4'];
export const BEATS_PER_BAR: Record<TimeSignature, number> = { '4/4': 4, '3/4': 3 };

export type JumpTier = 'Easy' | 'Medium' | 'Hard';

export interface CustomOptions {
  allowedNoteValues: TickDuration[];
  allowRests: boolean;
  allowedRestValues: TickDuration[];
  jumpTier: JumpTier;
  timeSignature: TimeSignature;
}

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
  progression: ProgressionMode;
  custom: CustomOptions;
}

export type TickKind = 'note' | 'rest';

export interface MelodyTickable {
  kind: TickKind;
  duration: TickDuration;
  midi?: number;     // sounding MIDI when kind === 'note'
  beat: number;      // start position in beats from phrase start
}

export interface MelodyPhrase {
  tickables: MelodyTickable[];
  bars: MelodyTickable[][];
  noteMidis: number[];   // sounding MIDIs in play order, used for detection
  timeSignature: TimeSignature;
}
