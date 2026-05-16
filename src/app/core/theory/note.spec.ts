import {
  NOTE_NAMES,
  BASE_LETTERS,
  STANDARD_TUNING_MIDI,
  freqToMidi,
  midiToFreq,
  midiToNoteName,
  noteNameToMidi,
  centsDiff,
  getFretMidi,
  closestMidiFromFreq,
  isWithinTolerance,
  allowedPitchClasses,
  spellMidi,
  naturalPc,
  enharmonicDisplay,
  type AccidentalMode,
} from './note';

describe('note.ts — constants', () => {
  it('NOTE_NAMES is the 12 chromatic pitch classes starting at C', () => {
    expect(NOTE_NAMES).toEqual([
      'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
    ]);
    expect(NOTE_NAMES).toHaveLength(12);
  });

  it('BASE_LETTERS is the 7 natural letters in C-major order', () => {
    expect(BASE_LETTERS).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    expect(BASE_LETTERS).toHaveLength(7);
  });

  it('STANDARD_TUNING_MIDI is exactly [40,45,50,55,59,64] (E2 A2 D3 G3 B3 E4)', () => {
    expect(STANDARD_TUNING_MIDI).toEqual([40, 45, 50, 55, 59, 64]);
    // Index 0 (low E) = E2, index 5 (high E) = E4.
    expect(midiToNoteName(STANDARD_TUNING_MIDI[0])).toEqual({ name: 'E', octave: 2 });
    expect(midiToNoteName(STANDARD_TUNING_MIDI[1])).toEqual({ name: 'A', octave: 2 });
    expect(midiToNoteName(STANDARD_TUNING_MIDI[2])).toEqual({ name: 'D', octave: 3 });
    expect(midiToNoteName(STANDARD_TUNING_MIDI[3])).toEqual({ name: 'G', octave: 3 });
    expect(midiToNoteName(STANDARD_TUNING_MIDI[4])).toEqual({ name: 'B', octave: 3 });
    expect(midiToNoteName(STANDARD_TUNING_MIDI[5])).toEqual({ name: 'E', octave: 4 });
  });
});

describe('freqToMidi', () => {
  it('maps the A4 = 440 Hz anchor to MIDI 69', () => {
    expect(freqToMidi(440)).toBe(69);
  });

  it('maps C4 (~261.626 Hz) to MIDI 60', () => {
    expect(freqToMidi(261.6256)).toBe(60);
  });

  it('rounds to the nearest semitone for off-pitch input', () => {
    // A bit sharp of A4 but well within half a semitone.
    expect(freqToMidi(445)).toBe(69);
    // Slightly flat of A4.
    expect(freqToMidi(435)).toBe(69);
  });

  it('an octave above A4 (880 Hz) is MIDI 81', () => {
    expect(freqToMidi(880)).toBe(81);
  });

  it('an octave below A4 (220 Hz) is MIDI 57', () => {
    expect(freqToMidi(220)).toBe(57);
  });

  it('respects a non-440 a4 reference (a4 = 432 -> 432 Hz is MIDI 69)', () => {
    expect(freqToMidi(432, 432)).toBe(69);
  });

  it('with a4 = 442, 442 Hz is MIDI 69 and 440 Hz rounds down to 69', () => {
    expect(freqToMidi(442, 442)).toBe(69);
    expect(freqToMidi(440, 442)).toBe(69);
  });
});

describe('midiToFreq', () => {
  it('maps MIDI 69 to exactly 440 Hz', () => {
    expect(midiToFreq(69)).toBe(440);
  });

  it('maps MIDI 60 (C4) to ~261.626 Hz', () => {
    expect(midiToFreq(60)).toBeCloseTo(261.6256, 3);
  });

  it('an octave doubles the frequency (MIDI 81 -> 880 Hz)', () => {
    expect(midiToFreq(81)).toBeCloseTo(880, 6);
  });

  it('an octave below MIDI 69 halves the frequency (MIDI 57 -> 220 Hz)', () => {
    expect(midiToFreq(57)).toBeCloseTo(220, 6);
  });

  it('respects a non-440 a4 reference (a4 = 432 -> MIDI 69 is 432 Hz)', () => {
    expect(midiToFreq(69, 432)).toBe(432);
  });

  it('round-trips with freqToMidi for every MIDI 40..76', () => {
    for (let m = 40; m <= 76; m++) {
      expect(freqToMidi(midiToFreq(m))).toBe(m);
    }
  });

  it('round-trips with a non-standard a4', () => {
    for (let m = 40; m <= 76; m++) {
      expect(freqToMidi(midiToFreq(m, 432), 432)).toBe(m);
    }
  });
});

describe('midiToNoteName', () => {
  it('maps MIDI 69 to A4', () => {
    expect(midiToNoteName(69)).toEqual({ name: 'A', octave: 4 });
  });

  it('maps MIDI 60 to C4', () => {
    expect(midiToNoteName(60)).toEqual({ name: 'C', octave: 4 });
  });

  it('maps MIDI 0 to C-1 (lowest MIDI)', () => {
    expect(midiToNoteName(0)).toEqual({ name: 'C', octave: -1 });
  });

  it('handles the B->C octave boundary: 59 is B3, 60 is C4', () => {
    expect(midiToNoteName(59)).toEqual({ name: 'B', octave: 3 });
    expect(midiToNoteName(60)).toEqual({ name: 'C', octave: 4 });
  });

  it('maps sharp pitch classes (MIDI 61 -> C#4)', () => {
    expect(midiToNoteName(61)).toEqual({ name: 'C#', octave: 4 });
  });

  it('maps MIDI 127 (highest MIDI) to G9', () => {
    expect(midiToNoteName(127)).toEqual({ name: 'G', octave: 9 });
  });
});

describe('noteNameToMidi', () => {
  it('maps A4 to MIDI 69', () => {
    expect(noteNameToMidi('A', 4)).toBe(69);
  });

  it('maps C4 to MIDI 60', () => {
    expect(noteNameToMidi('C', 4)).toBe(60);
  });

  it('maps C-1 to MIDI 0', () => {
    expect(noteNameToMidi('C', -1)).toBe(0);
  });

  it('handles the B->C octave boundary: B3 is 59, C4 is 60', () => {
    expect(noteNameToMidi('B', 3)).toBe(59);
    expect(noteNameToMidi('C', 4)).toBe(60);
  });

  it('round-trips with midiToNoteName for MIDI 0..127', () => {
    for (let m = 0; m <= 127; m++) {
      const { name, octave } = midiToNoteName(m);
      expect(noteNameToMidi(name, octave)).toBe(m);
    }
  });
});

describe('centsDiff', () => {
  it('is 0 cents for equal frequencies', () => {
    expect(centsDiff(440, 440)).toBe(0);
  });

  it('is +1200 cents for one octave up', () => {
    expect(centsDiff(880, 440)).toBeCloseTo(1200, 6);
  });

  it('is -1200 cents for one octave down', () => {
    expect(centsDiff(220, 440)).toBeCloseTo(-1200, 6);
  });

  it('is +100 cents for one semitone up', () => {
    expect(centsDiff(midiToFreq(70), midiToFreq(69))).toBeCloseTo(100, 6);
  });

  it('is positive when the freq is sharp of the reference', () => {
    expect(centsDiff(445, 440)).toBeGreaterThan(0);
  });

  it('is negative when the freq is flat of the reference', () => {
    expect(centsDiff(435, 440)).toBeLessThan(0);
  });
});

describe('getFretMidi', () => {
  // stringIndex1to6 indexes STANDARD_TUNING_MIDI directly (index - 1):
  // string 1 = STANDARD_TUNING_MIDI[0] = 40 (low E2),
  // string 6 = STANDARD_TUNING_MIDI[5] = 64 (high E4).
  it('open low-E string (string 1, fret 0) is MIDI 40 (E2)', () => {
    expect(getFretMidi(1, 0)).toBe(40);
  });

  it('open high-E string (string 6, fret 0) is MIDI 64 (E4)', () => {
    expect(getFretMidi(6, 0)).toBe(64);
  });

  it('fret 5 on the low-E string is MIDI 45 (A2, matches open A string)', () => {
    expect(getFretMidi(1, 5)).toBe(45);
    expect(getFretMidi(1, 5)).toBe(getFretMidi(2, 0));
  });

  it('fret 12 is exactly one octave above the open string', () => {
    for (let s = 1; s <= 6; s++) {
      expect(getFretMidi(s, 12)).toBe(getFretMidi(s, 0) + 12);
    }
  });

  it('high frets extend correctly (high-E string, fret 22 -> MIDI 86, D6)', () => {
    expect(getFretMidi(6, 22)).toBe(86);
    expect(midiToNoteName(86)).toEqual({ name: 'D', octave: 6 });
  });

  it('each open string equals its STANDARD_TUNING_MIDI entry', () => {
    for (let s = 1; s <= 6; s++) {
      expect(getFretMidi(s, 0)).toBe(STANDARD_TUNING_MIDI[s - 1]);
    }
  });
});

describe('closestMidiFromFreq', () => {
  it('maps 440 Hz to MIDI 69', () => {
    expect(closestMidiFromFreq(440)).toBe(69);
  });

  it('rounds an off-pitch frequency to the nearest semitone', () => {
    expect(closestMidiFromFreq(445)).toBe(69);
    expect(closestMidiFromFreq(435)).toBe(69);
  });

  it('maps 880 Hz to MIDI 81 (octave up)', () => {
    expect(closestMidiFromFreq(880)).toBe(81);
  });

  it('agrees with freqToMidi at the 440 Hz reference', () => {
    for (let m = 40; m <= 76; m++) {
      expect(closestMidiFromFreq(midiToFreq(m))).toBe(freqToMidi(midiToFreq(m)));
    }
  });
});

describe('isWithinTolerance', () => {
  it('is true for an exact match', () => {
    expect(isWithinTolerance(440, 440)).toBe(true);
  });

  it('uses a default tolerance of 25 cents', () => {
    // ~24 cents sharp -> within default tolerance.
    const within = 440 * Math.pow(2, 24 / 1200);
    expect(isWithinTolerance(within, 440)).toBe(true);
    // ~26 cents sharp -> outside default tolerance.
    const outside = 440 * Math.pow(2, 26 / 1200);
    expect(isWithinTolerance(outside, 440)).toBe(false);
  });

  it('is true just inside and false just outside the 25-cent boundary', () => {
    // A freq whose deviation is provably < 25 cents stays within tolerance.
    const justInside = 440 * Math.pow(2, 24.999 / 1200);
    expect(centsDiff(justInside, 440)).toBeLessThan(25);
    expect(isWithinTolerance(justInside, 440)).toBe(true);
    // A freq whose deviation is provably > 25 cents falls outside.
    const justOutside = 440 * Math.pow(2, 25.001 / 1200);
    expect(centsDiff(justOutside, 440)).toBeGreaterThan(25);
    expect(isWithinTolerance(justOutside, 440)).toBe(false);
  });

  it('is true just under and false just over a custom tolerance', () => {
    const tol = 10;
    const under = 440 * Math.pow(2, 9 / 1200);
    const over = 440 * Math.pow(2, 11 / 1200);
    expect(isWithinTolerance(under, 440, tol)).toBe(true);
    expect(isWithinTolerance(over, 440, tol)).toBe(false);
  });

  it('treats flat and sharp deviations symmetrically', () => {
    const flat = 440 * Math.pow(2, -24 / 1200);
    const sharp = 440 * Math.pow(2, 24 / 1200);
    expect(isWithinTolerance(flat, 440)).toBe(true);
    expect(isWithinTolerance(sharp, 440)).toBe(true);
  });

  // --- ADVERSARY edge cases ---

  // The exact 25-cent boundary: nominally constructed +25 cents, but FP rounding
  // pushes centsDiff to 25.0000000000001..., so abs(...) <= 25 is FALSE.
  it('ADVERSARY: a nominal +25 cents deviation is OUTSIDE tolerance (FP rounding)', () => {
    const at25 = 440 * Math.pow(2, 25 / 1200);
    expect(centsDiff(at25, 440)).toBeGreaterThan(25);
    expect(isWithinTolerance(at25, 440)).toBe(false);
  });

  // Asymmetry: a nominal -25 cents deviation rounds to -24.9999..., which IS
  // <= 25 in absolute value. So +25 and -25 are NOT treated the same.
  it('ADVERSARY: a nominal -25 cents deviation is INSIDE tolerance — asymmetric with +25', () => {
    const atNeg25 = 440 * Math.pow(2, -25 / 1200);
    expect(centsDiff(atNeg25, 440)).toBeGreaterThan(-25); // i.e. -24.9999...
    expect(isWithinTolerance(atNeg25, 440)).toBe(true);
    // Prove the asymmetry directly.
    const at25 = 440 * Math.pow(2, 25 / 1200);
    expect(isWithinTolerance(at25, 440)).not.toBe(isWithinTolerance(atNeg25, 440));
  });

  it('ADVERSARY: tolerance of 0 admits only an exact frequency match', () => {
    expect(isWithinTolerance(440, 440, 0)).toBe(true);
    expect(isWithinTolerance(440 * Math.pow(2, 1 / 1200), 440, 0)).toBe(false);
  });
});

describe('allowedPitchClasses', () => {
  it("Naturals mode returns only the natural pitch classes of the chosen letters", () => {
    const set = allowedPitchClasses(['C', 'D', 'E'], 'Naturals');
    expect([...set].sort((a, b) => a - b)).toEqual([0, 2, 4]);
  });

  it("SharpsPlusNaturals adds the semitone above each natural", () => {
    const set = allowedPitchClasses(['C'], 'SharpsPlusNaturals');
    expect([...set].sort((a, b) => a - b)).toEqual([0, 1]);
  });

  it("FlatsPlusNaturals adds the semitone below each natural", () => {
    const set = allowedPitchClasses(['C'], 'FlatsPlusNaturals');
    // C natural = 0, Cb = 11 (mod12 wraparound).
    expect([...set].sort((a, b) => a - b)).toEqual([0, 11]);
  });

  it("All adds both neighbouring semitones", () => {
    const set = allowedPitchClasses(['C'], 'All');
    expect([...set].sort((a, b) => a - b)).toEqual([0, 1, 11]);
  });

  it('an empty letter list defaults to all 7 natural letters', () => {
    const set = allowedPitchClasses([], 'Naturals');
    expect([...set].sort((a, b) => a - b)).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('deduplicates overlapping pitch classes (E# and F share pc 5)', () => {
    // E natural = 4, E# = 5; F natural = 5. The set must collapse the dup.
    const set = allowedPitchClasses(['E', 'F'], 'SharpsPlusNaturals');
    expect([...set].sort((a, b) => a - b)).toEqual([4, 5, 6]);
  });
});

describe('naturalPc', () => {
  it('returns the C-major pitch class for each natural letter', () => {
    expect(naturalPc('C')).toBe(0);
    expect(naturalPc('D')).toBe(2);
    expect(naturalPc('E')).toBe(4);
    expect(naturalPc('F')).toBe(5);
    expect(naturalPc('G')).toBe(7);
    expect(naturalPc('A')).toBe(9);
    expect(naturalPc('B')).toBe(11);
  });
});

describe('spellMidi', () => {
  it('spells a fully unambiguous natural note (D4, pc2) the same in every mode', () => {
    // pc 2 has no sharp/flat enharmonic within +-1 semitone, so D is forced.
    const modes: AccidentalMode[] = ['Naturals', 'SharpsPlusNaturals', 'FlatsPlusNaturals', 'All'];
    for (const mode of modes) {
      const r = spellMidi(62, mode);
      expect(r.name).toBe('D');
      expect(r.letter).toBe('d');
      expect(r.accidental).toBeUndefined();
      expect(r.octave).toBe(4);
      expect(r.key).toBe('d/4');
    }
  });

  it('spells C4 as C when the natural letter C is preferred', () => {
    // pc 0 also has the B# enharmonic, so preferLetter pins the spelling.
    const modes: AccidentalMode[] = ['Naturals', 'SharpsPlusNaturals', 'FlatsPlusNaturals', 'All'];
    for (const mode of modes) {
      const r = spellMidi(60, mode, 'C');
      expect(r.name).toBe('C');
      expect(r.letter).toBe('c');
      expect(r.accidental).toBeUndefined();
      expect(r.octave).toBe(4);
      expect(r.key).toBe('c/4');
    }
  });

  it('SharpsPlusNaturals spells an accidental as a sharp', () => {
    const r = spellMidi(61, 'SharpsPlusNaturals');
    expect(r.name).toBe('C#');
    expect(r.accidental).toBe('#');
    expect(r.octave).toBe(4);
    expect(r.key).toBe('c#/4');
  });

  it('FlatsPlusNaturals spells an accidental as a flat', () => {
    const r = spellMidi(61, 'FlatsPlusNaturals');
    expect(r.name).toBe('Db');
    expect(r.accidental).toBe('b');
    expect(r.octave).toBe(4);
    expect(r.key).toBe('db/4');
  });

  it('Naturals mode falls back to a natural-letter candidate for a black key', () => {
    // No natural candidate exists for pc 1, so the filter empties and the
    // full candidate pool (C# / Db) is used instead.
    const r = spellMidi(61, 'Naturals');
    expect(['C#', 'Db']).toContain(r.name);
  });

  it('honours preferLetter when that spelling is valid', () => {
    // MIDI 61 = pc1: prefer D -> Db.
    const r = spellMidi(61, 'All', 'D');
    expect(r.name).toBe('Db');
    expect(r.accidental).toBe('b');
  });

  it('honours preferLetter for the sharp spelling', () => {
    const r = spellMidi(61, 'All', 'C');
    expect(r.name).toBe('C#');
    expect(r.accidental).toBe('#');
  });

  it('spells MIDI 60 as B# (octave adjusted down) when preferring B', () => {
    // B# crosses the B->C boundary: B#3 sounds as C4.
    const r = spellMidi(60, 'All', 'B');
    expect(r.name).toBe('B#');
    expect(r.accidental).toBe('#');
    expect(r.octave).toBe(3);
    expect(r.key).toBe('b#/3');
  });

  it('spells MIDI 59 as Cb (octave adjusted up) when preferring C', () => {
    // Cb crosses the B->C boundary: Cb4 sounds as B3.
    const r = spellMidi(59, 'All', 'C');
    expect(r.name).toBe('Cb');
    expect(r.accidental).toBe('b');
    expect(r.octave).toBe(4);
    expect(r.key).toBe('cb/4');
  });

  it('produces VexFlow-style keys with lowercase letters', () => {
    const r = spellMidi(57, 'Naturals'); // A3
    expect(r.letter).toBe('a');
    expect(r.key).toBe('a/3');
  });

  // --- ADVERSARY edge cases ---

  // preferLetter that has no valid candidate (G is not within +-1 of pc1) is
  // silently ignored: pool.find returns undefined and a random pick is used.
  it('ADVERSARY: an impossible preferLetter is ignored, falling back to the pool', () => {
    const valid = new Set(['C#', 'Db']);
    for (let i = 0; i < 50; i++) {
      const r = spellMidi(61, 'All', 'G');
      expect(valid.has(r.name)).toBe(true);
    }
  });

  // Verifies the random pick is REAL: over many calls with no preferLetter on a
  // mode that keeps both candidates, both spellings must appear.
  it('ADVERSARY: with no preferLetter in All mode, both enharmonic spellings occur', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(spellMidi(61, 'All').name);
    expect(seen).toEqual(new Set(['C#', 'Db']));
  });

  // Same verification for the Naturals fallback pool (the existing test only
  // asserts toContain, which would pass even if the pick were never random).
  it('ADVERSARY: Naturals fallback pool for a black key still yields both spellings', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(spellMidi(61, 'Naturals').name);
    expect(seen).toEqual(new Set(['C#', 'Db']));
  });

  // SharpsPlusNaturals on pc1 filters out Db, leaving only C# — deterministic,
  // no randomness, exact value knowable.
  it('ADVERSARY: SharpsPlusNaturals on pc1 is deterministic across many calls', () => {
    for (let i = 0; i < 50; i++) {
      expect(spellMidi(61, 'SharpsPlusNaturals').name).toBe('C#');
    }
  });

  // preferLetter B for MIDI 60 in SharpsPlusNaturals: B# is a sharp, so it
  // survives the filter and the octave is still adjusted down.
  it('ADVERSARY: B# octave adjustment also applies in SharpsPlusNaturals mode', () => {
    const r = spellMidi(60, 'SharpsPlusNaturals', 'B');
    expect(r.name).toBe('B#');
    expect(r.octave).toBe(3);
    expect(r.key).toBe('b#/3');
  });

  // preferLetter B for MIDI 60 in FlatsPlusNaturals: B# is a sharp and gets
  // filtered out, so preferLetter cannot be honoured — it falls back.
  it('ADVERSARY: preferLetter B in FlatsPlusNaturals cannot produce B# (filtered out)', () => {
    const r = spellMidi(60, 'FlatsPlusNaturals', 'B');
    // B# is filtered; pool for pc0 in FlatsPlusNaturals is just {C}. Db candidate
    // does not exist for pc0. So C is forced.
    expect(r.name).toBe('C');
    expect(r.octave).toBe(4);
  });

  // preferLetter C for MIDI 59 in SharpsPlusNaturals: Cb is a flat, filtered
  // out, so Cb cannot be produced; B is forced.
  it('ADVERSARY: preferLetter C in SharpsPlusNaturals cannot produce Cb (filtered out)', () => {
    const r = spellMidi(59, 'SharpsPlusNaturals', 'C');
    expect(r.name).toBe('B');
    expect(r.octave).toBe(3);
  });

  // Negative-MIDI octave math: MIDI 0 spelled as B# crosses into octave -2.
  it('ADVERSARY: B# spelling at MIDI 0 yields octave -2', () => {
    const r = spellMidi(0, 'All', 'B');
    expect(r.name).toBe('B#');
    expect(r.octave).toBe(-2);
    expect(r.key).toBe('b#/-2');
  });

  // Cb spelling at MIDI 11 (B-1) crosses up to octave 0 (Cb0 sounds as B-1).
  it('ADVERSARY: Cb spelling at MIDI 11 yields octave 0', () => {
    expect(midiToNoteName(11)).toEqual({ name: 'B', octave: -1 });
    const r = spellMidi(11, 'All', 'C');
    expect(r.name).toBe('Cb');
    expect(r.octave).toBe(0);
    expect(r.key).toBe('cb/0');
  });

  // Every pc that has a natural letter spells deterministically with no
  // accidental in Naturals mode — exact, no randomness.
  it('ADVERSARY: Naturals mode spells every white key deterministically', () => {
    const whites: Array<[number, string]> = [
      [60, 'C'], [62, 'D'], [64, 'E'], [65, 'F'], [67, 'G'], [69, 'A'], [71, 'B'],
    ];
    for (const [midi, name] of whites) {
      expect(spellMidi(midi, 'Naturals').name).toBe(name);
    }
  });
});

describe('enharmonicDisplay', () => {
  it('Naturals mode shows only the sharp/natural name with no enharmonic', () => {
    expect(enharmonicDisplay(60, 'Naturals')).toBe('C');
    expect(enharmonicDisplay(61, 'Naturals')).toBe('C#');
    expect(enharmonicDisplay(69, 'Naturals')).toBe('A');
  });

  it('SharpsPlusNaturals lists the sharp first for a black key', () => {
    expect(enharmonicDisplay(61, 'SharpsPlusNaturals')).toBe('C#/Db');
    expect(enharmonicDisplay(63, 'SharpsPlusNaturals')).toBe('D#/Eb');
  });

  it('FlatsPlusNaturals lists the flat first for a black key', () => {
    expect(enharmonicDisplay(61, 'FlatsPlusNaturals')).toBe('Db/C#');
    expect(enharmonicDisplay(70, 'FlatsPlusNaturals')).toBe('Bb/A#');
  });

  it('All mode shows both spellings of a black key (sharp first)', () => {
    expect(enharmonicDisplay(61, 'All')).toBe('C#/Db');
  });

  it('shows B/Cb enharmonic for B in FlatsPlusNaturals and All modes', () => {
    expect(enharmonicDisplay(59, 'FlatsPlusNaturals')).toBe('Cb/B');
    expect(enharmonicDisplay(59, 'All')).toBe('B/Cb');
  });

  it('shows B#/C enharmonic for C in SharpsPlusNaturals and All modes', () => {
    expect(enharmonicDisplay(60, 'SharpsPlusNaturals')).toBe('B#/C');
    expect(enharmonicDisplay(60, 'All')).toBe('B#/C');
  });

  it('All mode adds Fb and E# enharmonics for E and F', () => {
    expect(enharmonicDisplay(64, 'All')).toBe('E/Fb');
    expect(enharmonicDisplay(65, 'All')).toBe('E#/F');
  });

  it('E and F have no enharmonic in non-All modes', () => {
    expect(enharmonicDisplay(64, 'SharpsPlusNaturals')).toBe('E');
    expect(enharmonicDisplay(65, 'FlatsPlusNaturals')).toBe('F');
  });

  // --- ADVERSARY edge cases ---

  // B in SharpsPlusNaturals: the B/Cb branch only triggers for Flats/All, so B
  // falls through with no enharmonic. Untested branch.
  it('ADVERSARY: B in SharpsPlusNaturals shows no Cb enharmonic', () => {
    expect(enharmonicDisplay(59, 'SharpsPlusNaturals')).toBe('B');
  });

  // C in FlatsPlusNaturals: the B#/C branch only triggers for Sharps/All, so C
  // falls through with no enharmonic. Untested branch.
  it('ADVERSARY: C in FlatsPlusNaturals shows no B# enharmonic', () => {
    expect(enharmonicDisplay(60, 'FlatsPlusNaturals')).toBe('C');
  });

  // E and F in SharpsPlusNaturals / FlatsPlusNaturals: E#/Fb only appear in All.
  it('ADVERSARY: E has no Fb and F has no E# outside All mode', () => {
    expect(enharmonicDisplay(64, 'FlatsPlusNaturals')).toBe('E');
    expect(enharmonicDisplay(65, 'SharpsPlusNaturals')).toBe('F');
  });

  // mod12 wraparound: pitch classes are taken mod 12, so MIDI 73 (C#5) and
  // MIDI 61 (C#4) display identically.
  it('ADVERSARY: enharmonicDisplay is octave-independent (mod-12 pitch class)', () => {
    expect(enharmonicDisplay(73, 'All')).toBe(enharmonicDisplay(61, 'All'));
    expect(enharmonicDisplay(73, 'All')).toBe('C#/Db');
  });
});

describe('freqToMidi — degenerate inputs', () => {
  // log2(0) = -Infinity; Math.round(-Infinity) = -Infinity. Documents behavior,
  // not asserting it is "correct" — callers must guard.
  it('ADVERSARY: zero frequency yields -Infinity (no input guard)', () => {
    expect(freqToMidi(0)).toBe(-Infinity);
  });

  it('ADVERSARY: negative frequency yields NaN (log2 of negative)', () => {
    expect(Number.isNaN(freqToMidi(-100))).toBe(true);
  });

  it('ADVERSARY: Infinity frequency yields Infinity', () => {
    expect(freqToMidi(Infinity)).toBe(Infinity);
  });

  it('ADVERSARY: NaN frequency yields NaN', () => {
    expect(Number.isNaN(freqToMidi(NaN))).toBe(true);
  });

  it('ADVERSARY: closestMidiFromFreq has the same degenerate behavior', () => {
    expect(closestMidiFromFreq(0)).toBe(-Infinity);
    expect(Number.isNaN(closestMidiFromFreq(-1))).toBe(true);
  });
});

describe('midiToNoteName — wraparound and non-integer', () => {
  it('ADVERSARY: deeply negative MIDI wraps the pitch class via mod12', () => {
    // MIDI -1 -> pc 11 -> B; octave floor(-1/12)-1 = -1-1 = -2.
    expect(midiToNoteName(-1)).toEqual({ name: 'B', octave: -2 });
  });

  it('ADVERSARY: a non-integer MIDF is floored for octave and rounded-by-mod for pc', () => {
    // mod12(60.7) = 0.7 -> PC_TO_SHARP_NAME[0.7] is undefined (fractional index).
    const r = midiToNoteName(60.7);
    expect(r.octave).toBe(4);
    expect(r.name).toBeUndefined();
  });
});
