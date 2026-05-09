export type NoteName = 'C'|'C#'|'D'|'D#'|'E'|'F'|'F#'|'G'|'G#'|'A'|'A#'|'B';
export const NOTE_NAMES: NoteName[] = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export type BaseLetter = 'A'|'B'|'C'|'D'|'E'|'F'|'G';
export const BASE_LETTERS: BaseLetter[] = ['C','D','E','F','G','A','B'];
export type AccidentalMode = 'Naturals'|'SharpsPlusNaturals'|'FlatsPlusNaturals'|'All';

const LETTER_TO_PC: Record<BaseLetter, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
const PC_TO_SHARP_NAME: NoteName[] = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function mod12(n: number){ return ((n % 12) + 12) % 12; }

export function freqToMidi(freq: number, a4 = 440): number {
  return Math.round(69 + 12 * Math.log2(freq / a4));
}

export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

export function midiToNoteName(midi: number): { name: NoteName; octave: number } {
  const idx = mod12(midi);
  const name = PC_TO_SHARP_NAME[idx] as NoteName;
  const octave = Math.floor(midi / 12) - 1;
  return { name, octave };
}

export function noteNameToMidi(name: NoteName, octave: number): number {
  const semitone = PC_TO_SHARP_NAME.indexOf(name);
  return (octave + 1) * 12 + semitone;
}

export function centsDiff(freq: number, refFreq: number): number {
  return 1200 * Math.log2(freq / refFreq);
}

export const STANDARD_TUNING_MIDI: number[] = [40, 45, 50, 55, 59, 64];

export function getFretMidi(stringIndex1to6: number, fret: number): number {
  const baseMidi = STANDARD_TUNING_MIDI[stringIndex1to6 - 1];
  return baseMidi + fret;
}

export function closestMidiFromFreq(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

export function isWithinTolerance(freq: number, targetFreq: number, centsTolerance = 25): boolean {
  return Math.abs(centsDiff(freq, targetFreq)) <= centsTolerance;
}

export function allowedPitchClasses(letters: BaseLetter[], mode: AccidentalMode): Set<number> {
  const set = new Set<number>();
  const selected = letters.length ? letters : [...BASE_LETTERS];
  for (const L of selected) {
    const nat = LETTER_TO_PC[L];
    set.add(nat);
    if (mode === 'SharpsPlusNaturals' || mode === 'All') set.add(mod12(nat + 1));
    if (mode === 'FlatsPlusNaturals' || mode === 'All') set.add(mod12(nat - 1));
  }
  return set;
}

export function spellMidi(
  midi: number,
  mode: AccidentalMode,
  preferLetter?: BaseLetter
): { name: string; letter: string; accidental?: '#'|'b'; octave: number; key: string } {
  const pc = mod12(midi);
  const octave = Math.floor(midi / 12) - 1;

  type Cand = { letter: BaseLetter; accidental?: '#'|'b' };
  const cands: Cand[] = [];
  for (const L of BASE_LETTERS) {
    const natPc = LETTER_TO_PC[L];
    const diff = mod12(pc - natPc);
    const diffSigned = diff > 6 ? diff - 12 : diff;
    if (diffSigned === 0) cands.push({ letter: L });
    else if (diffSigned === 1) cands.push({ letter: L, accidental: '#' });
    else if (diffSigned === -1) cands.push({ letter: L, accidental: 'b' });
  }

  const filtered = cands.filter(c => {
    if (!c.accidental) return true;
    if (mode === 'Naturals') return false;
    if (mode === 'SharpsPlusNaturals') return c.accidental === '#';
    if (mode === 'FlatsPlusNaturals') return c.accidental === 'b';
    return true;
  });

  const pool = filtered.length ? filtered : cands;

  let pick: Cand | undefined = preferLetter ? pool.find(c => c.letter === preferLetter) : undefined;
  if (!pick) {
    pick = pool[Math.floor(Math.random() * pool.length)];
  }

  const name = pick.letter + (pick.accidental ?? '');
  const vfLetter = pick.letter.toLowerCase();
  const key = `${vfLetter}${pick.accidental ?? ''}/${octave}`;
  return { name, letter: vfLetter, accidental: pick.accidental, octave, key };
}

export function naturalPc(letter: BaseLetter): number { return LETTER_TO_PC[letter]; }
