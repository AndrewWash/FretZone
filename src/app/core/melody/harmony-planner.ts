import { scalePitchClasses, ModeName } from '../theory/modes';
import type { BaseLetter } from '../theory/note';
import type { MelodyConfig, PhraseBarCount, ProgressionMode } from './models';

// A chord is identified by its scale degree (1-7). Quality (major/minor) is
// implied by the active mode's diatonic triad at that degree, so the engine
// doesn't need to track it separately.
export type ChordDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface HarmonyPlan {
  // One chord per bar.
  chordsByBar: ChordDegree[];
  // One Set per bar containing the pitch classes (0-11) of that chord's triad.
  chordTonesByBar: Set<number>[];
}

type ModeFlavor = 'major' | 'minor';

const MAJOR_MODES = new Set<ModeName>(['Ionian', 'Lydian', 'Mixolydian']);
function flavorOf(mode: ModeName): ModeFlavor {
  return MAJOR_MODES.has(mode) ? 'major' : 'minor';
}

// Catalog keyed by bar count. Each entry is a chord progression — array of
// scale-degree chord roots, one per bar, that ends with a cadence to I.
const CATALOG: Record<PhraseBarCount, Record<ModeFlavor, ChordDegree[][]>> = {
  2: {
    major: [[1, 5], [1, 4]],
    minor: [[1, 5], [1, 4]],
  },
  4: {
    major: [
      [1, 5, 6, 4],   // I-V-vi-IV ("50s")
      [1, 4, 5, 1],   // I-IV-V-I
      [6, 4, 1, 5],   // vi-IV-I-V
      [1, 6, 4, 5],
    ],
    minor: [
      [1, 6, 3, 7],   // i-VI-III-VII
      [1, 4, 5, 1],   // i-iv-v-i
      [1, 7, 6, 5],
    ],
  },
  8: {
    major: [
      [1, 5, 6, 4, 1, 5, 4, 1],
      [1, 6, 4, 5, 1, 4, 5, 1],
      [2, 5, 1, 6, 2, 5, 1, 1],
    ],
    minor: [
      [1, 4, 5, 1, 6, 7, 1, 1],
      [1, 6, 3, 7, 1, 4, 5, 1],
    ],
  },
  16: {
    major: [
      // doubled period
      [1, 5, 6, 4, 1, 5, 4, 1, 1, 5, 6, 4, 2, 5, 1, 1],
      // AABA-shaped (4-bar units)
      [1, 5, 1, 5, 1, 5, 1, 5, 4, 5, 4, 5, 1, 5, 1, 1],
    ],
    minor: [
      [1, 4, 5, 1, 6, 7, 1, 1, 1, 4, 5, 1, 6, 7, 1, 1],
    ],
  },
};

// Decide whether to apply a progression to this phrase, then pick one and
// resolve its triads to pitch-class sets. Returns null when no progression
// should be applied this phrase (Off, or Random rolled off).
export function planHarmony(cfg: MelodyConfig): HarmonyPlan | null {
  if (!shouldApply(cfg.progression)) return null;

  const flavor = flavorOf(cfg.mode);
  const options = CATALOG[cfg.bars][flavor] ?? CATALOG[cfg.bars].major;
  if (!options || !options.length) return null;
  const chosen = options[Math.floor(Math.random() * options.length)];
  const chordsByBar = chosen.slice() as ChordDegree[];

  // Resolve each chord into its pitch-class triad for the active key + mode.
  const scalePcs = scalePitchClasses(cfg.tonic, cfg.mode);  // 7 entries, 1-based degree -> index (deg-1)
  const chordTonesByBar = chordsByBar.map(deg => triadPcs(scalePcs, deg));

  return { chordsByBar, chordTonesByBar };
}

function shouldApply(mode: ProgressionMode): boolean {
  if (mode === 'On') return true;
  if (mode === 'Off') return false;
  return Math.random() < 0.5;
}

function triadPcs(scalePcs: number[], degree: ChordDegree): Set<number> {
  // Diatonic triad = degree, degree+2, degree+4 (1-based, wraps modulo 7).
  const idx = (degree - 1) % 7;
  return new Set([
    scalePcs[idx],
    scalePcs[(idx + 2) % 7],
    scalePcs[(idx + 4) % 7],
  ]);
}
