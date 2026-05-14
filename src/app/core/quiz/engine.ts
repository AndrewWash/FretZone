import { STANDARD_TUNING_MIDI, midiToFreq, BASE_LETTERS, allowedPitchClasses, AccidentalMode } from '../theory/note';
import type { QuizConfig, Prompt, StringId } from './models';
import { randOf } from '../utils/random';

export function defaultConfig(): QuizConfig {
  return {
    fretStart: 1,
    fretEnd: 5,
    strings: [1,2,3,4,5,6],
    notes: [...BASE_LETTERS],
    accidentalMode: 'Naturals',
    sightReading: false,
    hideStringLabels: true,
    iterations: 25,
    timeLimitSec: 20,
    a4: 440,
    centsTolerance: 25,
  };
}

export function allCandidates(cfg: QuizConfig): Prompt[] {
  const prompts: Prompt[] = [];
  const strings: StringId[] = cfg.strings.length ? cfg.strings : [1,2,3,4,5,6];
  const pcs = allowedPitchClasses(cfg.notes as any, cfg.accidentalMode);

  for (const s of strings) {
    const openMidi = STANDARD_TUNING_MIDI[s-1];
    if (pcs.has(((openMidi % 12) + 12) % 12)) {
      prompts.push({ stringId: s, fret: 0, midi: openMidi });
    }
  }

  const start = Math.max(1, Math.min(cfg.fretStart, cfg.fretEnd));
  const end = Math.min(20, Math.max(cfg.fretStart, cfg.fretEnd));
  for (const s of strings) {
    const base = STANDARD_TUNING_MIDI[s-1];
    for (let f = start; f <= end; f++) {
      const m = base + f;
      if (pcs.has(((m % 12) + 12) % 12)) {
        prompts.push({ stringId: s, fret: f, midi: m });
      }
    }
  }
  return prompts;
}

export function randomPrompt(cfg: QuizConfig): Prompt {
  const list = allCandidates(cfg);
  if (!list.length) throw new Error('No prompts available for this configuration.');
  return randOf(list);
}

export function freqMatchesPrompt(freq: number, p: Prompt, a4 = 440, centsTol = 25): boolean {
  const target = midiToFreq(p.midi, a4);
  const cents = 1200 * Math.log2(freq / target);
  return Math.abs(cents) <= centsTol;
}
