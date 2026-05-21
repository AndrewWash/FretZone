import { describe, it, expect } from 'vitest';
import { SOR_OP60_NO1 } from './catalog';
import {
  expandBarOrder,
  flattenPlaySequence,
  flattenUpperVoice,
  sliceEtudeByRanges,
  totalBeats,
  upperNoteCount,
  validateTies,
} from './engine';
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

describe('sor/engine expandBarOrder', () => {
  it('unrolls Op. 60 No. 1 repeats to m1-8, m1-8, m9-16, m9-16', () => {
    const order = expandBarOrder(SOR_OP60_NO1);
    const first8 = [0, 1, 2, 3, 4, 5, 6, 7];
    const second8 = [8, 9, 10, 11, 12, 13, 14, 15];
    expect(order).toEqual([...first8, ...first8, ...second8, ...second8]);
  });

  it('returns a straight 0..n-1 pass for an etude with no repeat flags', () => {
    const noRepeats: SorEtude = {
      ...SOR_OP60_NO1,
      bars: SOR_OP60_NO1.bars.map(b => ({
        upper: b.upper,
        lower: b.lower,
      })),
    };
    expect(expandBarOrder(noRepeats)).toEqual(
      noRepeats.bars.map((_, i) => i),
    );
  });

  it('a backward repeat with no forward repeat loops from bar 0', () => {
    const etude: SorEtude = {
      ...SOR_OP60_NO1,
      bars: [
        { upper: [], lower: [] },
        { upper: [], lower: [], endRepeat: true },
        { upper: [], lower: [] },
      ],
    };
    expect(expandBarOrder(etude)).toEqual([0, 1, 0, 1, 2]);
  });
});

describe('sor/engine flattenPlaySequence', () => {
  it('doubles the note count for the fully-repeated Op. 60 No. 1', () => {
    const physical = flattenUpperVoice(SOR_OP60_NO1);
    const played = flattenPlaySequence(SOR_OP60_NO1);
    expect(played.length).toBe(physical.length * 2);
  });

  it('keeps beatOnset non-decreasing across the expanded timeline', () => {
    const seq = flattenPlaySequence(SOR_OP60_NO1);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i].beatOnset).toBeGreaterThanOrEqual(seq[i - 1].beatOnset);
    }
  });

  it('maps the second m1 pass back to physical bar 0, note 0', () => {
    const seq = flattenPlaySequence(SOR_OP60_NO1);
    // The first pass covers m1-8; the second pass of m1-8 starts right after.
    const firstPassNotes = SOR_OP60_NO1.bars
      .slice(0, 8)
      .reduce((s, b) => s + b.upper.filter(n => n.kind === 'note').length, 0);
    const secondPassStart = seq[firstPassNotes];
    expect(secondPassStart.barIndex).toBe(0);
    expect(secondPassStart.physicalIndex).toBe(0);
    expect(secondPassStart.midi).toBe(seq[0].midi);
  });

  it('matches flattenUpperVoice when the etude has no repeats', () => {
    const noRepeats: SorEtude = {
      ...SOR_OP60_NO1,
      bars: SOR_OP60_NO1.bars.map(b => ({ upper: b.upper, lower: b.lower })),
    };
    expect(flattenPlaySequence(noRepeats).length).toBe(
      flattenUpperVoice(noRepeats).length,
    );
  });
});

describe('sor/engine sliceEtudeByRanges', () => {
  it('returns the original etude when no ranges are provided', () => {
    const out = sliceEtudeByRanges(SOR_OP60_NO1, []);
    expect(out.etude).toBe(SOR_OP60_NO1);
    expect(out.originalBarNumbers).toEqual(
      SOR_OP60_NO1.bars.map((_, i) => i + 1),
    );
    expect(out.sectionBreakBefore.every(b => b === false)).toBe(true);
  });

  it('returns the original etude when ranges cover the full piece', () => {
    const total = SOR_OP60_NO1.bars.length;
    const out = sliceEtudeByRanges(SOR_OP60_NO1, [{ start: 1, end: total }]);
    expect(out.etude).toBe(SOR_OP60_NO1);
    expect(out.sectionBreakBefore.every(b => b === false)).toBe(true);
  });

  it('keeps a single mid-piece range with no section breaks', () => {
    const out = sliceEtudeByRanges(SOR_OP60_NO1, [{ start: 3, end: 5 }]);
    expect(out.etude.bars.length).toBe(3);
    // Sliced bars are shallow clones (repeat flags stripped) but carry the
    // original voice arrays by reference.
    expect(out.etude.bars[0].upper).toBe(SOR_OP60_NO1.bars[2].upper);
    expect(out.etude.bars[1].upper).toBe(SOR_OP60_NO1.bars[3].upper);
    expect(out.etude.bars[2].upper).toBe(SOR_OP60_NO1.bars[4].upper);
    expect(out.originalBarNumbers).toEqual([3, 4, 5]);
    expect(out.sectionBreakBefore).toEqual([false, false, false]);
  });

  it('flags a section break between non-adjacent ranges', () => {
    const out = sliceEtudeByRanges(SOR_OP60_NO1, [
      { start: 3, end: 4 },
      { start: 9, end: 9 },
    ]);
    expect(out.etude.bars.length).toBe(3);
    expect(out.originalBarNumbers).toEqual([3, 4, 9]);
    expect(out.sectionBreakBefore).toEqual([false, false, true]);
  });

  it('preserves user-supplied range order (no sorting)', () => {
    const out = sliceEtudeByRanges(SOR_OP60_NO1, [
      { start: 9, end: 9 },
      { start: 3, end: 4 },
    ]);
    expect(out.originalBarNumbers).toEqual([9, 3, 4]);
    // 9 → 3 is a break (9 + 1 !== 3), 3 → 4 is contiguous.
    expect(out.sectionBreakBefore).toEqual([false, true, false]);
  });

  it('dedupes overlapping ranges by first occurrence', () => {
    const out = sliceEtudeByRanges(SOR_OP60_NO1, [
      { start: 3, end: 5 },
      { start: 4, end: 6 },
    ]);
    expect(out.originalBarNumbers).toEqual([3, 4, 5, 6]);
    expect(out.sectionBreakBefore.every(b => b === false)).toBe(true);
  });

  it('clamps out-of-range ends down to the etude length', () => {
    const total = SOR_OP60_NO1.bars.length;
    const out = sliceEtudeByRanges(SOR_OP60_NO1, [{ start: total - 1, end: total + 50 }]);
    expect(out.etude.bars.length).toBe(2);
    expect(out.originalBarNumbers).toEqual([total - 1, total]);
  });

  it('drops a range whose start exceeds the piece length', () => {
    const total = SOR_OP60_NO1.bars.length;
    const out = sliceEtudeByRanges(SOR_OP60_NO1, [
      { start: total + 5, end: total + 10 },
      { start: 2, end: 2 },
    ]);
    expect(out.originalBarNumbers).toEqual([2]);
  });

  it('falls back to full piece when every range is invalid', () => {
    const total = SOR_OP60_NO1.bars.length;
    const out = sliceEtudeByRanges(SOR_OP60_NO1, [{ start: total + 1, end: total + 2 }]);
    expect(out.etude).toBe(SOR_OP60_NO1);
  });

  it('sliced etude carries through key, time signature, and BPM hint', () => {
    const out = sliceEtudeByRanges(SOR_OP60_NO1, [{ start: 2, end: 3 }]);
    expect(out.etude.key).toBe(SOR_OP60_NO1.key);
    expect(out.etude.timeSignature).toBe(SOR_OP60_NO1.timeSignature);
    expect(out.etude.defaultBpm).toBe(SOR_OP60_NO1.defaultBpm);
  });

  it('strips repeat barlines from a real sub-range slice', () => {
    // m8 carries endRepeat, m9 carries startRepeat in the catalog.
    const out = sliceEtudeByRanges(SOR_OP60_NO1, [{ start: 8, end: 9 }]);
    for (const bar of out.etude.bars) {
      expect(bar.startRepeat).toBeFalsy();
      expect(bar.endRepeat).toBeFalsy();
    }
    // The sliced range therefore plays straight through, no inner loop.
    expect(expandBarOrder(out.etude)).toEqual([0, 1]);
  });

  it('keeps repeat barlines on the un-sliced full piece', () => {
    const out = sliceEtudeByRanges(SOR_OP60_NO1, []);
    expect(out.etude).toBe(SOR_OP60_NO1);
    expect(out.etude.bars[7].endRepeat).toBe(true);
    expect(out.etude.bars[8].startRepeat).toBe(true);
  });

  it('totalBeats and upperNoteCount adapt to the slice', () => {
    const out = sliceEtudeByRanges(SOR_OP60_NO1, [{ start: 1, end: 2 }]);
    expect(totalBeats(out.etude)).toBe(2 * 4);
    const directCount = SOR_OP60_NO1.bars
      .slice(0, 2)
      .reduce((s, b) => s + b.upper.filter(n => n.kind === 'note').length, 0);
    expect(upperNoteCount(out.etude)).toBe(directCount);
  });
});
