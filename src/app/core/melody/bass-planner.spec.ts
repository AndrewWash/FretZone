import { planBass } from './bass-planner';
import { scalePitchClasses } from '../theory/modes';
import type { HarmonyPlan } from './harmony-planner';
import type { MelodyConfig } from './models';

function harmonyFor(tonic: 'C', mode: 'Ionian', degrees: number[]): HarmonyPlan {
  const scalePcs = scalePitchClasses(tonic, mode);
  return {
    chordsByBar: degrees as HarmonyPlan['chordsByBar'],
    chordTonesByBar: degrees.map(d => {
      const i = (d - 1) % 7;
      return new Set([scalePcs[i], scalePcs[(i + 2) % 7], scalePcs[(i + 4) % 7]]);
    }),
  };
}

function baseCfg(over: Partial<MelodyConfig> = {}): MelodyConfig {
  return {
    difficulty: 'Easy',
    tonic: 'C',
    mode: 'Ionian',
    fretStart: 1,
    fretEnd: 7,
    strings: [1, 2, 3, 4, 5, 6],
    iterations: 5,
    bars: 4,
    limitMode: 'iterations',
    timeMinutes: 3,
    a4: 440,
    centsTolerance: 25,
    progression: 'On',
    bassVoiceEnabled: true,
    custom: {
      allowedNoteValues: ['q', '8'],
      allowRests: true,
      allowedRestValues: ['q'],
      jumpTier: 'Easy',
      timeSignature: '4/4',
    },
    practiceMode: 'mic',
    ...over,
  };
}

describe('bass-planner — Easy difficulty', () => {
  it('4/4 emits exactly one whole-note root per bar', () => {
    const harmony = harmonyFor('C', 'Ionian', [1, 4, 5, 1]);
    const cfg = baseCfg({ difficulty: 'Easy' });
    const bars = planBass(harmony, cfg, 4);
    expect(bars).toHaveLength(4);
    for (const bar of bars) {
      expect(bar).toHaveLength(1);
      expect(bar[0].kind).toBe('note');
      expect(bar[0].duration).toBe('w');
    }
  });

  it('3/4 emits half + quarter, both on the root', () => {
    const harmony = harmonyFor('C', 'Ionian', [1, 5, 1, 4]);
    const cfg = baseCfg({ difficulty: 'Easy' });
    const bars = planBass(harmony, cfg, 3);
    for (const bar of bars) {
      expect(bar).toHaveLength(2);
      expect(bar[0].duration).toBe('h');
      expect(bar[1].duration).toBe('q');
      expect(bar[0].midi).toBe(bar[1].midi);
    }
  });
});

describe('bass-planner — Intermediate difficulty', () => {
  it('4/4 emits two halves: root then 5th', () => {
    const harmony = harmonyFor('C', 'Ionian', [1, 4, 5, 1]);
    const cfg = baseCfg({ difficulty: 'Intermediate' });
    const bars = planBass(harmony, cfg, 4);
    for (const bar of bars) {
      expect(bar).toHaveLength(2);
      expect(bar[0].duration).toBe('h');
      expect(bar[1].duration).toBe('h');
      expect(bar[0].midi).not.toBe(bar[1].midi);
    }
  });

  it('first bar of C-Ionian I plays C (MIDI 48) then G (MIDI 43)', () => {
    const harmony = harmonyFor('C', 'Ionian', [1, 4, 5, 1]);
    const cfg = baseCfg({ difficulty: 'Intermediate' });
    const bars = planBass(harmony, cfg, 4);
    expect(bars[0][0].midi).toBe(48); // C3 is the C-pc in [40,51]
    expect(bars[0][1].midi).toBe(43); // G2 is the G-pc in [40,51]
  });
});

describe('bass-planner — Expert difficulty', () => {
  it('4/4 emits 4 quarter notes per bar', () => {
    const harmony = harmonyFor('C', 'Ionian', [1, 4, 5, 1]);
    const cfg = baseCfg({ difficulty: 'Expert' });
    const bars = planBass(harmony, cfg, 4);
    for (const bar of bars) {
      expect(bar).toHaveLength(4);
      for (const n of bar) expect(n.duration).toBe('q');
    }
  });

  it('3/4 emits 3 quarter notes per bar', () => {
    const harmony = harmonyFor('C', 'Ionian', [1, 4, 5, 1]);
    const cfg = baseCfg({ difficulty: 'Expert' });
    const bars = planBass(harmony, cfg, 3);
    for (const bar of bars) {
      expect(bar).toHaveLength(3);
      for (const n of bar) expect(n.duration).toBe('q');
    }
  });

  it('beat 1 of each bar is the chord root', () => {
    const harmony = harmonyFor('C', 'Ionian', [1, 4, 5, 6]);
    const cfg = baseCfg({ difficulty: 'Expert' });
    const bars = planBass(harmony, cfg, 4);
    // C-Ionian roots: I=C(0), IV=F(5), V=G(7), vi=A(9).
    // In [40,51]: C=48, F=41, G=43, A=45.
    expect(bars[0][0].midi).toBe(48);
    expect(bars[1][0].midi).toBe(41);
    expect(bars[2][0].midi).toBe(43);
    expect(bars[3][0].midi).toBe(45);
  });

  it('last beat is a diatonic neighbor of the NEXT bar root', () => {
    // bar 0 → bar 1: I (C) → IV (F). Diatonic neighbors of F: E (3) or G (4).
    // Both are step-neighbors; either is acceptable.
    const harmony = harmonyFor('C', 'Ionian', [1, 4, 1, 4]);
    const cfg = baseCfg({ difficulty: 'Expert' });
    const bars = planBass(harmony, cfg, 4);
    const lastOfBar0 = bars[0][3].midi!;
    // F pc = 5 (MIDI 41). Diatonic neighbors of F in C-major are E (pc 4) and G (pc 7).
    // The corresponding MIDIs in [40,51] are E=40, G=43.
    expect([40, 43]).toContain(lastOfBar0);
  });
});

describe('bass-planner — MIDI range', () => {
  it('all emitted MIDIs are within [40, 51]', () => {
    const harmony = harmonyFor('C', 'Ionian', [1, 2, 3, 4]);
    for (const diff of ['Easy', 'Intermediate', 'Expert'] as const) {
      const cfg = baseCfg({ difficulty: diff });
      const bars = planBass(harmony, cfg, 4);
      for (const bar of bars) {
        for (const n of bar) {
          expect(n.midi!).toBeGreaterThanOrEqual(40);
          expect(n.midi!).toBeLessThanOrEqual(51);
        }
      }
    }
  });
});

describe('bass-planner — defensive guards', () => {
  it('returns [] when harmony bar count does not match cfg.bars', () => {
    const harmony = harmonyFor('C', 'Ionian', []);
    const cfg = baseCfg({ difficulty: 'Easy' });
    expect(planBass(harmony, cfg, 4)).toEqual([]);
  });
});
