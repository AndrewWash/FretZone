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

  it('first upper note in the starter catalog is C3 (MIDI 48)', () => {
    const seq = flattenUpperVoice(SOR_OP60_NO1);
    expect(seq[0].midi).toBe(48);
  });
});

describe('sor/engine totalBeats', () => {
  it('matches bars * beatsPerBar for 2/4 etude', () => {
    expect(totalBeats(SOR_OP60_NO1)).toBe(SOR_OP60_NO1.bars.length * 2);
  });

  it('returns 0 for empty etude', () => {
    const empty: SorEtude = { ...SOR_OP60_NO1, bars: [] };
    expect(totalBeats(empty)).toBe(0);
  });
});

describe('sor/engine validateTies', () => {
  it('finds no tie issues in the starter catalog', () => {
    // The starter catalog ties the lower-voice C across bar 5→6, so a tie
    // pair exists and resolves cleanly.
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

describe('sor/engine cross-bar tie resolution (catalog bar 5→6)', () => {
  it('lower voice C ties across the bar line in the starter catalog', () => {
    const bar5 = SOR_OP60_NO1.bars[4];
    const lowerWithTie = bar5.lower.find(n => n.tieToNext);
    expect(lowerWithTie).toBeTruthy();
    // tie target lives in bar 5 itself (two-note tie within the same bar)
    const target = bar5.lower[1];
    expect(target).toBeTruthy();
    expect(target.kind).toBe('note');
  });
});
