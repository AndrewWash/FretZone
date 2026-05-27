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

export type ModeFlavor = 'major' | 'minor';

const MAJOR_MODES = new Set<ModeName>(['Ionian', 'Lydian', 'Mixolydian']);
export function modeFlavor(mode: ModeName): ModeFlavor {
  return MAJOR_MODES.has(mode) ? 'major' : 'minor';
}

// Catalog keyed by bar count. Each entry is a chord progression — array of
// scale-degree chord roots, one per bar. All progressions start on degree 1
// (the bass voice and pitch-planner both assume bar 0 is tonic).
const CATALOG: Record<PhraseBarCount, Record<ModeFlavor, ChordDegree[][]>> = {
  2: {
    major: [
      [1, 5], // I-V authentic half-cadence
      [1, 4], // I-IV plagal
      [1, 6], // I-vi deceptive setup
      [1, 2], // I-ii predominant
      [1, 3], // I-iii lift
    ],
    minor: [
      [1, 5], // i-v
      [1, 4], // i-iv
      [1, 7], // i-VII rock cell
      [1, 6], // i-VI
      [1, 3], // i-III relative-major lift
    ],
  },
  4: {
    major: [
      [1, 5, 6, 4], // Axis / 50s
      [1, 4, 5, 1], // I-IV-V-I
      [1, 6, 4, 5], // doo-wop
      [1, 5, 6, 3], // Pachelbel head
      [1, 6, 2, 5], // rhythm changes A
      [1, 4, 2, 5], // I-IV-ii-V
      [1, 3, 4, 5], // Stand By Me
      [1, 5, 4, 5], // blues-ish I-V-IV-V
    ],
    minor: [
      [1, 6, 3, 7], // i-VI-III-VII minor Axis
      [1, 4, 5, 1], // i-iv-v-i
      [1, 7, 6, 5], // Andalusian cadence
      [1, 6, 7, 1], // Aeolian cadence
      [1, 4, 7, 1], // minor plagal + bVII
      [1, 3, 7, 4], // minor-epic
      [1, 5, 1, 7], // lament
    ],
  },
  8: {
    major: [
      [1, 5, 6, 4, 1, 5, 4, 1],
      [1, 6, 4, 5, 1, 4, 5, 1],
      [1, 6, 2, 5, 1, 4, 5, 1], // rhythm-changes A
      [1, 5, 6, 3, 4, 1, 4, 5], // full Pachelbel
      [1, 4, 1, 5, 6, 4, 5, 1], // extended doo-wop
      [1, 4, 5, 4, 1, 6, 2, 5], // period antecedent/consequent
    ],
    minor: [
      [1, 4, 5, 1, 6, 7, 1, 1],
      [1, 6, 3, 7, 1, 4, 5, 1],
      [1, 7, 6, 5, 1, 7, 6, 5], // doubled Andalusian
      [1, 4, 7, 3, 6, 2, 5, 1], // minor circle of fifths
      [1, 5, 6, 4, 1, 4, 5, 1], // minor Axis hybrid
    ],
  },
  16: {
    major: [
      // doubled period
      [1, 5, 6, 4, 1, 5, 4, 1, 1, 5, 6, 4, 2, 5, 1, 1],
      // AABA-shaped (4-bar units)
      [1, 5, 1, 5, 1, 5, 1, 5, 4, 5, 4, 5, 1, 5, 1, 1],
      // full Pachelbel doubled
      [1, 5, 6, 3, 4, 1, 4, 5, 1, 5, 6, 3, 4, 1, 5, 1],
      // rhythm-changes A-A-B-A skeleton
      [1, 6, 2, 5, 1, 6, 2, 5, 3, 6, 2, 5, 1, 4, 5, 1],
    ],
    minor: [
      [1, 4, 5, 1, 6, 7, 1, 1, 1, 4, 5, 1, 6, 7, 1, 1],
      // Andalusian with bridge
      [1, 7, 6, 5, 1, 7, 6, 5, 4, 3, 2, 5, 1, 7, 6, 5],
      // minor period + circle bridge
      [1, 4, 5, 1, 6, 7, 1, 1, 1, 4, 7, 3, 6, 2, 5, 1],
    ],
  },
};

// Roman numeral spellings indexed by scale degree (1-based: index 0 unused).
const MAJOR_ROMAN: readonly string[] = ['', 'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const MINOR_ROMAN: readonly string[] = ['', 'i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

export function romanNumeralsFor(chords: ChordDegree[], mode: ModeName): string[] {
  const table = modeFlavor(mode) === 'major' ? MAJOR_ROMAN : MINOR_ROMAN;
  return chords.map(d => table[d] ?? String(d));
}

// Decide whether to apply a progression to this phrase, then pick one and
// resolve its triads to pitch-class sets. Returns null when no progression
// should be applied this phrase (Off, or Random rolled off).
export function planHarmony(cfg: MelodyConfig): HarmonyPlan | null {
  if (!shouldApply(cfg.progression)) return null;

  const flavor = modeFlavor(cfg.mode);
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
