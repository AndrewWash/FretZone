import { describe, it, expect } from 'vitest';
import { rhFingerLabel, RH_FINGERING_OPTIONS } from './models';

describe('rhFingerLabel', () => {
  it('returns null when the pattern is off', () => {
    expect(rhFingerLabel(0, 'off')).toBeNull();
    expect(rhFingerLabel(1, 'off')).toBeNull();
    expect(rhFingerLabel(7, 'off')).toBeNull();
  });

  it('cycles a two-finger pattern', () => {
    expect([0, 1, 2, 3, 4].map(i => rhFingerLabel(i, 'im'))).toEqual(['i', 'm', 'i', 'm', 'i']);
    expect([0, 1, 2, 3].map(i => rhFingerLabel(i, 'mi'))).toEqual(['m', 'i', 'm', 'i']);
    expect([0, 1, 2, 3].map(i => rhFingerLabel(i, 'ia'))).toEqual(['i', 'a', 'i', 'a']);
  });

  it('cycles a three-finger pattern', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(i => rhFingerLabel(i, 'ami')))
      .toEqual(['a', 'm', 'i', 'a', 'm', 'i', 'a']);
    expect([0, 1, 2, 3].map(i => rhFingerLabel(i, 'pmi'))).toEqual(['p', 'm', 'i', 'p']);
  });

  it('has a label for every selectable pattern', () => {
    for (const o of RH_FINGERING_OPTIONS) {
      expect(o.label.length).toBeGreaterThan(0);
    }
    expect(RH_FINGERING_OPTIONS[0].value).toBe('off');
  });
});
