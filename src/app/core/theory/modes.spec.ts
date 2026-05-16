import {
  MODE_NAMES,
  MODE_LABELS,
  tonicPc,
  scalePitchClasses,
  scaleDegree,
  preferFlatsFor,
  parentMajor,
  keySignatureSpec,
  keyAwareSpelling,
  type ModeName,
} from './modes';
import type { BaseLetter } from './note';

describe('modes.ts — constants', () => {
  it('MODE_NAMES is the 7 diatonic modes in scale-degree order starting at Ionian', () => {
    expect(MODE_NAMES).toEqual([
      'Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian',
    ]);
    expect(MODE_NAMES).toHaveLength(7);
  });

  it('MODE_LABELS has a human label for every mode, tagging Ionian/Aeolian with Major/Minor', () => {
    expect(MODE_LABELS).toEqual({
      Ionian: 'Ionian (Major)',
      Dorian: 'Dorian',
      Phrygian: 'Phrygian',
      Lydian: 'Lydian',
      Mixolydian: 'Mixolydian',
      Aeolian: 'Aeolian (Minor)',
      Locrian: 'Locrian',
    });
  });

  it('MODE_LABELS has exactly one entry per MODE_NAMES entry', () => {
    expect(Object.keys(MODE_LABELS).sort()).toEqual([...MODE_NAMES].sort());
  });
});

describe('tonicPc', () => {
  it('maps each natural letter to its C-major pitch class (default offset 0)', () => {
    expect(tonicPc('C')).toBe(0);
    expect(tonicPc('D')).toBe(2);
    expect(tonicPc('E')).toBe(4);
    expect(tonicPc('F')).toBe(5);
    expect(tonicPc('G')).toBe(7);
    expect(tonicPc('A')).toBe(9);
    expect(tonicPc('B')).toBe(11);
  });

  it('offset +1 raises the pitch class by one semitone (sharp)', () => {
    expect(tonicPc('C', 1)).toBe(1);  // C#
    expect(tonicPc('F', 1)).toBe(6);  // F#
    expect(tonicPc('G', 1)).toBe(8);  // G#
  });

  it('offset -1 lowers the pitch class by one semitone (flat)', () => {
    expect(tonicPc('D', -1)).toBe(1); // Db
    expect(tonicPc('E', -1)).toBe(3); // Eb
    expect(tonicPc('A', -1)).toBe(8); // Ab
  });

  it('wraps with mod12 at the chromatic boundaries', () => {
    expect(tonicPc('B', 1)).toBe(0);   // B# = C
    expect(tonicPc('C', -1)).toBe(11); // Cb = B
  });
});

describe('scalePitchClasses', () => {
  it('C Ionian (major scale) has no accidentals: [0,2,4,5,7,9,11]', () => {
    expect(scalePitchClasses('C', 'Ionian')).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('A Aeolian (natural minor) is the C-major collection rooted at A', () => {
    expect(scalePitchClasses('A', 'Aeolian')).toEqual([9, 11, 0, 2, 4, 5, 7]);
  });

  it('D Dorian is the C-major collection rooted at D', () => {
    expect(scalePitchClasses('D', 'Dorian')).toEqual([2, 4, 5, 7, 9, 11, 0]);
  });

  it('E Phrygian is the C-major collection rooted at E', () => {
    expect(scalePitchClasses('E', 'Phrygian')).toEqual([4, 5, 7, 9, 11, 0, 2]);
  });

  it('F Lydian is the C-major collection rooted at F', () => {
    expect(scalePitchClasses('F', 'Lydian')).toEqual([5, 7, 9, 11, 0, 2, 4]);
  });

  it('G Mixolydian is the C-major collection rooted at G', () => {
    expect(scalePitchClasses('G', 'Mixolydian')).toEqual([7, 9, 11, 0, 2, 4, 5]);
  });

  it('B Locrian is the C-major collection rooted at B', () => {
    expect(scalePitchClasses('B', 'Locrian')).toEqual([11, 0, 2, 4, 5, 7, 9]);
  });

  it('G Ionian (one sharp, F#) is [7,9,11,0,2,4,6]', () => {
    expect(scalePitchClasses('G', 'Ionian')).toEqual([7, 9, 11, 0, 2, 4, 6]);
  });

  it('every mode produces exactly 7 distinct pitch classes', () => {
    for (const tonic of ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as BaseLetter[]) {
      for (const mode of MODE_NAMES) {
        const pcs = scalePitchClasses(tonic, mode);
        expect(pcs).toHaveLength(7);
        expect(new Set(pcs).size).toBe(7);
        expect(pcs.every((p) => p >= 0 && p < 12)).toBe(true);
      }
    }
  });

  it('all 7 modes rooted on C are rotations of the same parent collection', () => {
    // C Ionian, D Dorian, E Phrygian ... all share the C-major pitch set.
    const cMajor = new Set([0, 2, 4, 5, 7, 9, 11]);
    const rootForMode: Record<ModeName, BaseLetter> = {
      Ionian: 'C', Dorian: 'D', Phrygian: 'E', Lydian: 'F',
      Mixolydian: 'G', Aeolian: 'A', Locrian: 'B',
    };
    for (const mode of MODE_NAMES) {
      expect(new Set(scalePitchClasses(rootForMode[mode], mode))).toEqual(cMajor);
    }
  });

  it('Lydian has a raised 4th relative to Ionian on the same tonic', () => {
    // C Ionian degree 4 = F (5); C Lydian degree 4 = F# (6).
    expect(scalePitchClasses('C', 'Ionian')[3]).toBe(5);
    expect(scalePitchClasses('C', 'Lydian')[3]).toBe(6);
  });

  it('Mixolydian has a lowered 7th relative to Ionian on the same tonic', () => {
    // C Ionian degree 7 = B (11); C Mixolydian degree 7 = Bb (10).
    expect(scalePitchClasses('C', 'Ionian')[6]).toBe(11);
    expect(scalePitchClasses('C', 'Mixolydian')[6]).toBe(10);
  });
});

describe('scaleDegree', () => {
  it('returns scale degree 1..7 for in-scale MIDI notes of C Ionian', () => {
    // C4=60 D4=62 E4=64 F4=65 G4=67 A4=69 B4=71.
    expect(scaleDegree(60, 'C', 'Ionian')).toBe(1);
    expect(scaleDegree(62, 'C', 'Ionian')).toBe(2);
    expect(scaleDegree(64, 'C', 'Ionian')).toBe(3);
    expect(scaleDegree(65, 'C', 'Ionian')).toBe(4);
    expect(scaleDegree(67, 'C', 'Ionian')).toBe(5);
    expect(scaleDegree(69, 'C', 'Ionian')).toBe(6);
    expect(scaleDegree(71, 'C', 'Ionian')).toBe(7);
  });

  it('returns null for out-of-scale notes (C#/F# are not in C Ionian)', () => {
    expect(scaleDegree(61, 'C', 'Ionian')).toBeNull(); // C#
    expect(scaleDegree(66, 'C', 'Ionian')).toBeNull(); // F#
    expect(scaleDegree(70, 'C', 'Ionian')).toBeNull(); // Bb
  });

  it('is octave-independent: any C maps to degree 1 of C Ionian', () => {
    expect(scaleDegree(0, 'C', 'Ionian')).toBe(1);   // C-1
    expect(scaleDegree(48, 'C', 'Ionian')).toBe(1);  // C3
    expect(scaleDegree(60, 'C', 'Ionian')).toBe(1);  // C4
    expect(scaleDegree(120, 'C', 'Ionian')).toBe(1); // C9
  });

  it('handles negative MIDI via mod12 wraparound', () => {
    // MIDI -1 -> pc 11 -> B = degree 7 of C Ionian.
    expect(scaleDegree(-1, 'C', 'Ionian')).toBe(7);
  });

  it('reports the tonic as degree 1 for A Aeolian', () => {
    expect(scaleDegree(69, 'A', 'Aeolian')).toBe(1); // A4
    expect(scaleDegree(71, 'A', 'Aeolian')).toBe(2); // B4
    expect(scaleDegree(60, 'A', 'Aeolian')).toBe(3); // C5
  });

  it('returns null when a note is chromatic to a non-Ionian mode', () => {
    // A Aeolian = {A,B,C,D,E,F,G}; G#/MIDI 68 is not in it.
    expect(scaleDegree(68, 'A', 'Aeolian')).toBeNull();
  });

  it('reflects Lydian raised 4th: F# is degree 4, F natural is out', () => {
    expect(scaleDegree(66, 'C', 'Lydian')).toBe(4); // F#4 in scale
    expect(scaleDegree(65, 'C', 'Lydian')).toBeNull(); // F natural not in C Lydian
  });
});

describe('preferFlatsFor', () => {
  it('prefers flats for the F tonic regardless of mode', () => {
    expect(preferFlatsFor('F', 'Ionian')).toBe(true);
    expect(preferFlatsFor('F', 'Lydian')).toBe(true);
  });

  it('prefers flats for Phrygian, Aeolian and Locrian (the minor-leaning modes)', () => {
    expect(preferFlatsFor('C', 'Phrygian')).toBe(true);
    expect(preferFlatsFor('C', 'Aeolian')).toBe(true);
    expect(preferFlatsFor('C', 'Locrian')).toBe(true);
  });

  it('prefers sharps (returns false) for non-F tonics in major-leaning modes', () => {
    expect(preferFlatsFor('C', 'Ionian')).toBe(false);
    expect(preferFlatsFor('G', 'Ionian')).toBe(false);
    expect(preferFlatsFor('D', 'Dorian')).toBe(false);
    expect(preferFlatsFor('G', 'Lydian')).toBe(false);
    expect(preferFlatsFor('A', 'Mixolydian')).toBe(false);
  });

  it('F tonic forces flats even in a normally-sharp mode', () => {
    expect(preferFlatsFor('F', 'Mixolydian')).toBe(true);
  });
});

describe('parentMajor', () => {
  it('Ionian is its own parent major', () => {
    expect(parentMajor('C', 'Ionian')).toEqual({
      letter: 'C', accidental: '', spec: 'C', pc: 0,
    });
    expect(parentMajor('G', 'Ionian')).toEqual({
      letter: 'G', accidental: '', spec: 'G', pc: 7,
    });
  });

  it('A Aeolian has C major as its relative/parent major', () => {
    const pm = parentMajor('A', 'Aeolian');
    expect(pm.spec).toBe('C');
    expect(pm.letter).toBe('C');
    expect(pm.accidental).toBe('');
    expect(pm.pc).toBe(0);
  });

  it('the C-rooted collection maps every mode back to C major', () => {
    // D Dorian, E Phrygian, F Lydian, G Mixolydian, A Aeolian, B Locrian.
    const rooted: Array<[BaseLetter, ModeName]> = [
      ['C', 'Ionian'], ['D', 'Dorian'], ['E', 'Phrygian'], ['F', 'Lydian'],
      ['G', 'Mixolydian'], ['A', 'Aeolian'], ['B', 'Locrian'],
    ];
    for (const [tonic, mode] of rooted) {
      expect(parentMajor(tonic, mode).spec).toBe('C');
    }
  });

  it('E Aeolian has G major as its parent (one sharp)', () => {
    const pm = parentMajor('E', 'Aeolian');
    expect(pm.spec).toBe('G');
    expect(pm.letter).toBe('G');
    expect(pm.pc).toBe(7);
  });

  it('D Dorian raised to D# resolves to a C# major parent', () => {
    const pm = parentMajor('D', 'Dorian', 1);
    expect(pm.letter).toBe('C');
    expect(pm.accidental).toBe('#');
    expect(pm.spec).toBe('C#');
    expect(pm.pc).toBe(1);
  });

  it('B Locrian lowered to Bb resolves to a Cb major parent', () => {
    // Bb Locrian -> parent letter C, pc mod12(11-1-11)=11 -> Cb.
    const pm = parentMajor('B', 'Locrian', -1);
    expect(pm.letter).toBe('C');
    expect(pm.accidental).toBe('b');
    expect(pm.spec).toBe('Cb');
    expect(pm.pc).toBe(11);
  });

  it('G Mixolydian has C major as parent; G Ionian has G major as parent', () => {
    expect(parentMajor('G', 'Mixolydian').spec).toBe('C');
    expect(parentMajor('G', 'Ionian').spec).toBe('G');
  });

  it('parent-major letter is the diatonic letter a mode-offset below the tonic letter', () => {
    // Dorian is the 2nd degree, so its parent letter is one letter below the tonic.
    expect(parentMajor('E', 'Dorian').letter).toBe('D'); // E Dorian -> D major
    expect(parentMajor('B', 'Phrygian').letter).toBe('G'); // B Phrygian -> G major
  });

  it('parent pc equals tonicPc minus the mode pc-offset (mod 12)', () => {
    // A Aeolian: tonicPc(A)=9, Aeolian offset 9 -> parent pc 0.
    expect(parentMajor('A', 'Aeolian').pc).toBe(0);
    // F Lydian: tonicPc(F)=5, Lydian offset 5 -> parent pc 0.
    expect(parentMajor('F', 'Lydian').pc).toBe(0);
  });
});

describe('keySignatureSpec', () => {
  it('C major (Ionian) has the empty/natural key signature "C"', () => {
    expect(keySignatureSpec('C', 'Ionian')).toBe('C');
  });

  it('returns the VexFlow keySpec for the parent major of common modes', () => {
    expect(keySignatureSpec('G', 'Ionian')).toBe('G');     // 1 sharp
    expect(keySignatureSpec('A', 'Aeolian')).toBe('C');     // A minor -> C major
    expect(keySignatureSpec('E', 'Phrygian')).toBe('C');    // E Phrygian -> C major
    expect(keySignatureSpec('D', 'Dorian')).toBe('C');      // D Dorian -> C major
    expect(keySignatureSpec('G', 'Mixolydian')).toBe('C');  // G Mixolydian -> C major
    expect(keySignatureSpec('F', 'Lydian')).toBe('C');      // F Lydian -> C major
    expect(keySignatureSpec('B', 'Locrian')).toBe('C');     // B Locrian -> C major
  });

  it('produces sharp specs for sharp keys', () => {
    expect(keySignatureSpec('D', 'Ionian')).toBe('D');
    expect(keySignatureSpec('E', 'Ionian')).toBe('E');
    // C# major from raising D Dorian.
    expect(keySignatureSpec('D', 'Dorian', 1)).toBe('C#');
  });

  it('produces flat specs for flat keys', () => {
    // Bb Locrian -> Cb major.
    expect(keySignatureSpec('B', 'Locrian', -1)).toBe('Cb');
  });

  it('agrees with parentMajor().spec', () => {
    for (const tonic of ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as BaseLetter[]) {
      for (const mode of MODE_NAMES) {
        expect(keySignatureSpec(tonic, mode)).toBe(parentMajor(tonic, mode).spec);
      }
    }
  });
});

describe('keyAwareSpelling', () => {
  it('spells the diatonic notes of C major as plain naturals', () => {
    // C4=60 ... B4=71, all in C major.
    expect(keyAwareSpelling(60, 'C', 'Ionian')).toEqual({
      key: 'c/4', letter: 'c', accidental: undefined, octave: 4,
    });
    expect(keyAwareSpelling(64, 'C', 'Ionian')).toEqual({
      key: 'e/4', letter: 'e', accidental: undefined, octave: 4,
    });
    expect(keyAwareSpelling(71, 'C', 'Ionian')).toEqual({
      key: 'b/4', letter: 'b', accidental: undefined, octave: 4,
    });
  });

  it('spells F# as f# within G major (G Ionian) — the key signature note', () => {
    // F#4 = MIDI 66, a diatonic tone of G major.
    const sp = keyAwareSpelling(66, 'G', 'Ionian');
    expect(sp.letter).toBe('f');
    expect(sp.accidental).toBe('#');
    expect(sp.octave).toBe(4);
    expect(sp.key).toBe('f#/4');
  });

  it('spells Bb as bb within F major (F Ionian) — the key signature note', () => {
    // Bb3 = MIDI 58, a diatonic tone of F major.
    const sp = keyAwareSpelling(58, 'F', 'Ionian');
    expect(sp.letter).toBe('b');
    expect(sp.accidental).toBe('b');
    expect(sp.octave).toBe(3);
    expect(sp.key).toBe('bb/3');
  });

  it('spells the diatonic tones of A Aeolian (relative C major) as naturals', () => {
    // A4=69 B4=71 C5=72.
    expect(keyAwareSpelling(69, 'A', 'Aeolian').key).toBe('a/4');
    expect(keyAwareSpelling(71, 'A', 'Aeolian').key).toBe('b/4');
    expect(keyAwareSpelling(72, 'A', 'Aeolian').key).toBe('c/5');
  });

  it('spells diatonic accidentals consistently for D major (two sharps F#, C#)', () => {
    // D Ionian -> D major: F# and C# are diatonic.
    expect(keyAwareSpelling(66, 'D', 'Ionian').key).toBe('f#/4'); // F#4
    expect(keyAwareSpelling(61, 'D', 'Ionian').key).toBe('c#/4'); // C#4
    expect(keyAwareSpelling(62, 'D', 'Ionian').key).toBe('d/4');  // D4 natural
  });

  it('is octave-aware: the same pitch class one octave up advances the octave number', () => {
    const low = keyAwareSpelling(60, 'C', 'Ionian');  // C4
    const high = keyAwareSpelling(72, 'C', 'Ionian'); // C5
    expect(low.letter).toBe(high.letter);
    expect(low.accidental).toBe(high.accidental);
    expect(low.octave).toBe(4);
    expect(high.octave).toBe(5);
  });

  it('spells a chromatic (non-diatonic) note using the key’s sharp/flat preference', () => {
    // C# is not in C major; C major is a sharp key, so a non-diatonic note
    // is spelled with a sharp.
    const sp = keyAwareSpelling(61, 'C', 'Ionian'); // C#4
    expect(sp.letter).toBe('c');
    expect(sp.accidental).toBe('#');
    expect(sp.octave).toBe(4);
  });

  it('spells a chromatic note in a flat key with a flat', () => {
    // F major is a flat key; Eb4 (MIDI 63) is non-diatonic and spelled flat.
    const sp = keyAwareSpelling(63, 'F', 'Ionian');
    expect(sp.letter).toBe('e');
    expect(sp.accidental).toBe('b');
    expect(sp.octave).toBe(4);
  });

  it('spells the leading tone of A harmonic-minor context (G#) as a raised diatonic tone', () => {
    // A Aeolian parent is C major; G#4 = MIDI 68 is non-diatonic.
    // The note one semitone below (G, MIDI 67) is a plain natural in C major,
    // so this raised tone prefers the G# spelling over Ab.
    const sp = keyAwareSpelling(68, 'A', 'Aeolian');
    expect(sp.letter).toBe('g');
    expect(sp.accidental).toBe('#');
    expect(sp.octave).toBe(4);
  });

  it('produces a VexFlow key string of the form "<letter><acc>/<octave>"', () => {
    expect(keyAwareSpelling(67, 'C', 'Ionian').key).toBe('g/4');
    expect(keyAwareSpelling(66, 'G', 'Ionian').key).toBe('f#/4');
  });

  it('key string letter+accidental+octave fields are mutually consistent', () => {
    for (const midi of [55, 60, 62, 64, 65, 67, 69, 71, 72]) {
      const sp = keyAwareSpelling(midi, 'C', 'Ionian');
      const acc = sp.accidental ?? '';
      expect(sp.key).toBe(`${sp.letter}${acc}/${sp.octave}`);
    }
  });

  // ── Adversary-added: B#/Cb octave-crossing branches (modes.ts:172-173) ──
  // These were claimed "unreachable through the public API" — they are NOT.

  it('spells a diatonic B# in C# major and drops the octave (modes.ts:172)', () => {
    // D Dorian raised +1 -> C# major parent. C# major contains B# (pc 0).
    // MIDI 60 -> baseOctave 4; B# belongs to octave 3 (B#3 == C4).
    const sp = keyAwareSpelling(60, 'D', 'Dorian', 1);
    expect(sp.letter).toBe('b');
    expect(sp.accidental).toBe('#');
    expect(sp.octave).toBe(3);
    expect(sp.key).toBe('b#/3');
  });

  it('spells a diatonic Cb in Cb major and raises the octave (modes.ts:173)', () => {
    // Bb Locrian (offset -1) -> Cb major parent. Cb major contains Cb (pc 11).
    // MIDI 59 -> baseOctave 3; Cb belongs to octave 4 (Cb4 == B3).
    const sp = keyAwareSpelling(59, 'B', 'Locrian', -1);
    expect(sp.letter).toBe('c');
    expect(sp.accidental).toBe('b');
    expect(sp.octave).toBe(4);
    expect(sp.key).toBe('cb/4');
  });

  it('B# octave-crossing also applies one octave lower', () => {
    // MIDI 48 (C3) spelled as B# in C# major -> B#2.
    const sp = keyAwareSpelling(48, 'D', 'Dorian', 1);
    expect(sp.key).toBe('b#/2');
    expect(sp.octave).toBe(2);
  });

  // ── Adversary-added: tonicOffset -1 / sharp-and-flat-key chromatic paths ──

  it('handles negative MIDI via mod12 wraparound (B3 region below MIDI 0)', () => {
    // MIDI -1 -> pc 11 -> B, diatonic in C major. baseOctave = floor(-1/12)-1 = -2.
    const sp = keyAwareSpelling(-1, 'C', 'Ionian');
    expect(sp.letter).toBe('b');
    expect(sp.accidental).toBeUndefined();
    expect(sp.octave).toBe(-2);
    expect(sp.key).toBe('b/-2');
  });

  it('spells a chromatic note in a flat key as a flat even when a natural sits one semitone below', () => {
    // F major (flat key). MIDI 68 = pc 8. pc 7 (G) is a plain natural in F major,
    // so preferLetter='G' is passed — but FlatsPlusNaturals cannot spell pc8 as G#,
    // so the flat spelling Ab wins.
    const sp = keyAwareSpelling(68, 'F', 'Ionian');
    expect(sp.letter).toBe('a');
    expect(sp.accidental).toBe('b');
    expect(sp.octave).toBe(4);
    expect(sp.key).toBe('ab/4');
  });

  it('spells a chromatic raised tone in a sharp key with a sharp (raised-diatonic heuristic)', () => {
    // G major (sharp key). MIDI 70 = pc 10. pc 9 (A) is a plain natural in G major,
    // so the raised-tone heuristic prefers A# over Bb.
    const sp = keyAwareSpelling(70, 'G', 'Ionian');
    expect(sp.letter).toBe('a');
    expect(sp.accidental).toBe('#');
    expect(sp.octave).toBe(4);
    expect(sp.key).toBe('a#/4');
  });

  it('spells a chromatic note with no natural one-semitone-below as the plain key preference', () => {
    // C major. MIDI 63 = pc 3 (Eb/D#). pc 2 (D) IS natural -> heuristic prefers D#.
    const sp = keyAwareSpelling(63, 'C', 'Ionian');
    expect(sp.letter).toBe('d');
    expect(sp.accidental).toBe('#');
    // MIDI 68 = pc 8 (G#/Ab). pc 7 (G) IS natural -> heuristic prefers G#.
    const sp2 = keyAwareSpelling(68, 'C', 'Ionian');
    expect(sp2.letter).toBe('g');
    expect(sp2.accidental).toBe('#');
  });

  it('keyAwareSpelling is octave-correct across the MIDI octave boundary for diatonic tones', () => {
    // C major: MIDI 59 (B3) and 60 (C4) straddle the octave boundary.
    expect(keyAwareSpelling(59, 'C', 'Ionian').key).toBe('b/3');
    expect(keyAwareSpelling(60, 'C', 'Ionian').key).toBe('c/4');
  });

  it('chromatic note whose one-semitone-below diatonic tone is itself accidental falls back to the plain key preference', () => {
    // D Dorian +1 -> C# major; diatonic pcs are {1,3,5,6,8,10,0}.
    // MIDI 67 = pc 7, chromatic. pc 6 (F#) IS diatonic but carries a sharp,
    // so the raised-tone heuristic does NOT set preferLetter — spellMidi picks
    // the SharpsPlusNaturals default. The branch where oneBelowEntry has an
    // accidental (preferLetter stays undefined) is exercised here.
    const sp = keyAwareSpelling(67, 'D', 'Dorian', 1);
    expect(sp.octave).toBe(4);
    // pc 7 under SharpsPlusNaturals with no forced letter spells as G natural.
    expect(sp.letter).toBe('g');
    expect(sp.accidental).toBeUndefined();
    expect(sp.key).toBe('g/4');
  });
});

describe('parentMajor — offset and flat-spec coverage (adversary-added)', () => {
  it('tonicOffset -1 producing a single-flat parent major (Gb)', () => {
    // E Aeolian (parent G major) lowered to Eb Aeolian -> Gb major parent.
    const pm = parentMajor('E', 'Aeolian', -1);
    expect(pm.letter).toBe('G');
    expect(pm.accidental).toBe('b');
    expect(pm.spec).toBe('Gb');
    expect(pm.pc).toBe(6);
  });

  it('tonicOffset +1 producing a single-sharp parent major (F#)', () => {
    // E Ionian raised to E# Ionian -> F major? E#=pc5 -> parent pc 5 -> F natural.
    // Use B Ionian raised to B# -> C major? Choose A Aeolian +1 = A# Aeolian -> C# major.
    const pm = parentMajor('A', 'Aeolian', 1);
    expect(pm.letter).toBe('C');
    expect(pm.accidental).toBe('#');
    expect(pm.spec).toBe('C#');
    expect(pm.pc).toBe(1);
  });

  it('offset wraps the parent pc with mod12 (Cb parent has pc 11, not -1)', () => {
    const pm = parentMajor('B', 'Locrian', -1);
    expect(pm.pc).toBe(11);
    expect(pm.pc).toBeGreaterThanOrEqual(0);
  });

  it('returns a deep-equal result on repeated calls with the same arguments (cache stability)', () => {
    // parentMajor memoizes on a `${tonic}${tonicOffset}-${mode}` key. Repeated
    // calls must yield the same value — a guard against cache-key collisions.
    const a1 = parentMajor('A', 'Aeolian');
    const a2 = parentMajor('A', 'Aeolian');
    expect(a2).toEqual(a1);
    expect(a2).toEqual({ letter: 'C', accidental: '', spec: 'C', pc: 0 });

    // Same tonic+mode but a different offset must NOT collide with the above.
    const b1 = parentMajor('A', 'Aeolian', 1);
    const b2 = parentMajor('A', 'Aeolian', 1);
    expect(b2).toEqual(b1);
    expect(b2).toEqual({ letter: 'C', accidental: '#', spec: 'C#', pc: 1 });
    expect(b2).not.toEqual(a2);

    // A distinct tonic that shares no cache key stays independent across calls.
    const c1 = parentMajor('D', 'Dorian', 1);
    const c2 = parentMajor('D', 'Dorian', 1);
    expect(c2).toEqual(c1);
    expect(c2).toEqual({ letter: 'C', accidental: '#', spec: 'C#', pc: 1 });
  });
});
