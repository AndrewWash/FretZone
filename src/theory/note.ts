export type NoteName = 'C'|'C#'|'D'|'D#'|'E'|'F'|'F#'|'G'|'G#'|'A'|'A#'|'B';
export const NOTE_NAMES: NoteName[] = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export function freqToMidi(freq: number, a4 = 440): number {
  return Math.round(69 + 12 * Math.log2(freq / a4));
}

export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

export function midiToNoteName(midi: number): { name: NoteName; octave: number } {
  const idx = ((midi % 12) + 12) % 12;
  const name = NOTE_NAMES[idx] as NoteName;
  const octave = Math.floor(midi / 12) - 1;
  return { name, octave };
}

export function noteNameToMidi(name: NoteName, octave: number): number {
  const semitone = NOTE_NAMES.indexOf(name);
  return (octave + 1) * 12 + semitone;
}

export function centsDiff(freq: number, refFreq: number): number {
  return 1200 * Math.log2(freq / refFreq);
}

// Guitar standard tuning E2 A2 D3 G3 B3 E4 (sounding). Notation is written one octave up (E3..E5)
export const STANDARD_TUNING_MIDI: number[] = [40, 45, 50, 55, 59, 64]; // 6->1 strings

export function getFretMidi(stringIndex1to6: number, fret: number): number {
  const stringIdx = 6 - stringIndex1to6; // convert 1..6 to 0..5 from highest to lowest? No, our STANDARD is 6->1
  const baseMidi = STANDARD_TUNING_MIDI[stringIndex1to6 - 1]; // expect 1=low E (40), 6=high E (64)
  return baseMidi + fret;
}

export function closestMidiFromFreq(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

export function isWithinTolerance(freq: number, targetFreq: number, centsTolerance = 25): boolean { // ~ quarter tone
  return Math.abs(centsDiff(freq, targetFreq)) <= centsTolerance;
}
