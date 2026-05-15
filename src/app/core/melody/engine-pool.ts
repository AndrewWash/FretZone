import { STANDARD_TUNING_MIDI } from '../theory/note';
import { scalePitchClasses, scaleDegree } from '../theory/modes';
import type { MelodyConfig } from './models';
import type { StringId } from '../quiz/models';

export interface PlayablePool {
  midis: number[];
  degreeOf: Map<number, number>;
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

// Build the set of MIDI pitches that are both in the active scale AND
// reachable on the selected strings within the fret range. Open strings are
// always included when they belong to the scale.
export function playablePool(cfg: MelodyConfig): PlayablePool {
  const pcs = new Set(scalePitchClasses(cfg.tonic, cfg.mode));
  const strings: StringId[] = cfg.strings.length ? cfg.strings : [1, 2, 3, 4, 5, 6];
  const start = Math.max(1, Math.min(cfg.fretStart, cfg.fretEnd));
  const end = Math.min(20, Math.max(cfg.fretStart, cfg.fretEnd));

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
