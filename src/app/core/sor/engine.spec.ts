import { describe, it, expect } from 'vitest';
import { SOR_OP60_NO1 } from './catalog';
import { flattenUpperVoice, totalBeats, upperNoteCount, validateTies } from './engine';
import type { SorEtude } from './models';

describe('sor/engine flattenUpperVoice', () => {
  it('captures only non-rest upper-voice notes', () => {
    const seq = flattenUpperVoice(SOR_OP60_NO1);
    expect(seq.length).toBe(upperNoteCount(SOR_OP60_NO1));
    expect(seq.length).toBeGreaterThan(0);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i].index).toBe(seq[i - 1].index + 1);
    }
  });

  it('computes monotonically increasing beatOnsets', () => {
    const seq = flattenUpperVoice(SOR_OP60_NO1);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i].beatOnset).toBeGreaterThanOrEqual(seq[i - 1].beatOnset);
    }
  });

  it('first upper note in the catalog is C4 (MIDI 60)', () => {
    // Op. 60 No. 1 opens on a half-note C4 (s2 fret 1, lh1), per the PDF
    // imported via Audiveris.
    const seq = flattenUpperVoice(SOR_OP60_NO1);
    expect(seq[0].midi).toBe(60);
  });
});

describe('sor/engine totalBeats', () => {
  it('matches bars * beatsPerBar for the catalog etude (4/4)', () => {
    expect(totalBeats(SOR_OP60_NO1)).toBe(SOR_OP60_NO1.bars.length * 4);
  });

  it('returns 0 for empty etude', () => {
    const empty: SorEtude = { ...SOR_OP60_NO1, bars: [] };
    expect(totalBeats(empty)).toBe(0);
  });
});

describe('sor/engine validateTies', () => {
  it('finds no tie issues in the catalog', () => {
    const issues = validateTies(SOR_OP60_NO1);
    expect(issues).toEqual([]);
  });

  it('flags a tie with no following note', () => {
    const broken: SorEtude = {
      ...SOR_OP60_NO1,
      bars: [
        {
          upper: [
            { kind: 'note', duration: 'q', midi: 60, stringId: 2, fret: 1, tieToNext: true },
          ],
          lower: [],
        },
      ],
    };
    const issues = validateTies(broken);
    expect(issues.length).toBe(1);
    expect(issues[0].reason).toMatch(/no next note/);
  });
});

describe('sor/engine bar-length structure', () => {
  it('every bar in every voice sums to exactly 4 beats (4/4 sanity check)', () => {
    const dur: Record<string, number> = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25, '32': 0.125 };
    for (let i = 0; i < SOR_OP60_NO1.bars.length; i++) {
      const bar = SOR_OP60_NO1.bars[i];
      for (const voice of ['upper', 'lower'] as const) {
        const arr = voice === 'upper' ? bar.upper : bar.lower;
        if (arr.length === 0) continue;
        const beats = arr.reduce((s, n) => s + (n.dotted ? dur[n.duration] * 1.5 : dur[n.duration]), 0);
        expect(beats, `bar ${i + 1} ${voice}`).toBe(4);
      }
    }
  });

  it('m8 cadence carries a chord tickable on the upper voice', () => {
    // m8 is the half-cadence on V: a G-major chord stacked on beat 2.
    const m8 = SOR_OP60_NO1.bars[7];
    const chordTickable = m8.upper.find(x => x.kind === 'note' && x.chord && x.chord.length > 0);
    expect(chordTickable, 'm8 should contain at least one chord').toBeDefined();
    // Three pitches total: primary + at least 2 others.
    expect(chordTickable!.chord!.length).toBeGreaterThanOrEqual(2);
  });

  it('m16 final cadence carries a chord with the tonic C present', () => {
    const m16 = SOR_OP60_NO1.bars[15];
    const chordTickable = m16.upper.find(x => x.kind === 'note' && x.chord && x.chord.length > 0);
    expect(chordTickable, 'm16 should contain at least one chord').toBeDefined();
    const allMidis = [chordTickable!.midi!, ...chordTickable!.chord!.map(p => p.midi)];
    // Tonic C4 (MIDI 60) must be one of the chord pitches — losing it would
    // make the final cadence sound unresolved.
    expect(allMidis).toContain(60);
  });
});
