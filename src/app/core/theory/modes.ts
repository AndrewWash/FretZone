import { BaseLetter, spellMidi } from './note';

export type ModeName =
  | 'Ionian'
  | 'Dorian'
  | 'Phrygian'
  | 'Lydian'
  | 'Mixolydian'
  | 'Aeolian'
  | 'Locrian';

export const MODE_NAMES: ModeName[] = [
  'Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian',
];

export const MODE_LABELS: Record<ModeName, string> = {
  Ionian:     'Ionian (Major)',
  Dorian:     'Dorian',
  Phrygian:   'Phrygian',
  Lydian:     'Lydian',
  Mixolydian: 'Mixolydian',
  Aeolian:    'Aeolian (Minor)',
  Locrian:    'Locrian',
};

const MODE_INTERVALS: Record<ModeName, number[]> = {
  Ionian:     [0, 2, 4, 5, 7, 9, 11],
  Dorian:     [0, 2, 3, 5, 7, 9, 10],
  Phrygian:   [0, 1, 3, 5, 7, 8, 10],
  Lydian:     [0, 2, 4, 6, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  Aeolian:    [0, 2, 3, 5, 7, 8, 10],
  Locrian:    [0, 1, 3, 5, 6, 8, 10],
};

const LETTER_TO_PC: Record<BaseLetter, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };

function mod12(n: number) { return ((n % 12) + 12) % 12; }

export function tonicPc(tonic: BaseLetter): number {
  return LETTER_TO_PC[tonic];
}

export function scalePitchClasses(tonic: BaseLetter, mode: ModeName): number[] {
  const root = LETTER_TO_PC[tonic];
  return MODE_INTERVALS[mode].map(iv => mod12(root + iv));
}

export function scaleDegree(midi: number, tonic: BaseLetter, mode: ModeName): number | null {
  const pc = mod12(midi);
  const pcs = scalePitchClasses(tonic, mode);
  const idx = pcs.indexOf(pc);
  return idx === -1 ? null : idx + 1;
}

const FLAT_TONICS = new Set<BaseLetter>(['F']);
const FLAT_MODES = new Set<ModeName>(['Phrygian', 'Aeolian', 'Locrian']);

export function preferFlatsFor(tonic: BaseLetter, mode: ModeName): boolean {
  return FLAT_TONICS.has(tonic) || FLAT_MODES.has(mode);
}

// ── Parent-major key signature lookup ──────────────────────────────────

const MODE_LETTER_OFFSET: Record<ModeName, number> = {
  Ionian: 0, Dorian: 1, Phrygian: 2, Lydian: 3, Mixolydian: 4, Aeolian: 5, Locrian: 6,
};
const MODE_PC_OFFSET: Record<ModeName, number> = {
  Ionian: 0, Dorian: 2, Phrygian: 4, Lydian: 5, Mixolydian: 7, Aeolian: 9, Locrian: 11,
};

const LETTERS_CYCLE: BaseLetter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

function letterIdx(L: BaseLetter): number {
  return LETTERS_CYCLE.indexOf(L);
}

export interface ParentMajor {
  letter: BaseLetter;
  accidental: '' | '#' | 'b';
  spec: string;       // VexFlow keySpec, e.g. "C", "F#", "Bb"
  pc: number;
}

const parentMajorCache = new Map<string, ParentMajor>();

export function parentMajor(tonic: BaseLetter, mode: ModeName): ParentMajor {
  const cacheKey = `${tonic}-${mode}`;
  const cached = parentMajorCache.get(cacheKey);
  if (cached) return cached;

  const tonicLetterIdx = letterIdx(tonic);
  const parentLetterIdx = (tonicLetterIdx - MODE_LETTER_OFFSET[mode] + 7) % 7;
  const parentLetter = LETTERS_CYCLE[parentLetterIdx];
  const parentPc = mod12(LETTER_TO_PC[tonic] - MODE_PC_OFFSET[mode]);
  const naturalPc = LETTER_TO_PC[parentLetter];
  const delta = mod12(parentPc - naturalPc);
  let accidental: '' | '#' | 'b' = '';
  if (delta === 1) accidental = '#';
  else if (delta === 11) accidental = 'b';
  // delta should be 0/1/11 for any valid (tonic, mode); other values mean a bug.

  const spec = parentLetter + accidental;
  const result: ParentMajor = { letter: parentLetter, accidental, spec, pc: parentPc };
  parentMajorCache.set(cacheKey, result);
  return result;
}

export function keySignatureSpec(tonic: BaseLetter, mode: ModeName): string {
  return parentMajor(tonic, mode).spec;
}

// ── Key-aware spelling: deterministic per scale-tone ──────────────────

export interface KeyAwareSpelling {
  key: string;             // VexFlow key string, e.g. "f#/5"
  letter: string;          // lowercase a..g
  accidental?: '#' | 'b';
  octave: number;
}

interface PcSpelling {
  letter: BaseLetter;
  accidental?: '#' | 'b';
}

const pcMapCache = new Map<string, Map<number, PcSpelling>>();

function buildPcSpellingMap(pm: ParentMajor): Map<number, PcSpelling> {
  const map = new Map<number, PcSpelling>();
  const startIdx = letterIdx(pm.letter);
  for (let i = 0; i < 7; i++) {
    const pc = mod12(pm.pc + MAJOR_INTERVALS[i]);
    const letter = LETTERS_CYCLE[(startIdx + i) % 7];
    const naturalPc = LETTER_TO_PC[letter];
    const delta = mod12(pc - naturalPc);
    let acc: '#' | 'b' | undefined;
    if (delta === 1) acc = '#';
    else if (delta === 11) acc = 'b';
    map.set(pc, { letter, accidental: acc });
  }
  return map;
}

export function keyAwareSpelling(midi: number, tonic: BaseLetter, mode: ModeName): KeyAwareSpelling {
  const pm = parentMajor(tonic, mode);
  const cacheKey = `${tonic}-${mode}`;
  let pcMap = pcMapCache.get(cacheKey);
  if (!pcMap) {
    pcMap = buildPcSpellingMap(pm);
    pcMapCache.set(cacheKey, pcMap);
  }

  const pc = mod12(midi);
  const found = pcMap.get(pc);
  if (!found) {
    // Chromatic note (engine doesn't currently produce these). Fall back to
    // generic spelling biased to match the parent's accidental style.
    const accMode = pm.accidental === 'b' ? 'FlatsPlusNaturals'
                  : pm.accidental === '#' ? 'SharpsPlusNaturals'
                  : 'Naturals';
    const sp = spellMidi(midi, accMode);
    return { key: sp.key, letter: sp.letter, accidental: sp.accidental, octave: sp.octave };
  }

  const baseOctave = Math.floor(midi / 12) - 1;
  let octave = baseOctave;
  // B# crosses up into the next octave's MIDI region (B#3 = MIDI 60),
  // Cb crosses down (Cb4 = MIDI 59).
  if (found.letter === 'B' && found.accidental === '#') octave--;
  if (found.letter === 'C' && found.accidental === 'b') octave++;

  const lower = found.letter.toLowerCase();
  const accStr = found.accidental ?? '';
  return {
    key: `${lower}${accStr}/${octave}`,
    letter: lower,
    accidental: found.accidental,
    octave,
  };
}
