import { describe, it, expect } from 'vitest';
import { buildEtudeRows, computeBeamGroupIndices, renderEtudeEl } from './vexflow-render';
import { SOR_OP60_NO1 } from '../core/sor/catalog';
import { sliceEtudeByRanges } from '../core/sor/engine';
import type { EtudeDuration, EtudeNote } from '../core/sor/models';

describe('vexflow-render buildEtudeRows', () => {
  it('packs contiguous bars up to barsPerRow', () => {
    expect(buildEtudeRows(8, 4, null)).toEqual([
      [0, 1, 2, 3],
      [4, 5, 6, 7],
    ]);
  });

  it('keeps a single row when bar count fits exactly', () => {
    expect(buildEtudeRows(3, 4, null)).toEqual([[0, 1, 2]]);
  });

  it('forces a row break at every sectionBreaks[i] === true', () => {
    // Scenario: user picked 2-4 + 8 → sliced bars [m2, m3, m4, m8],
    // sectionBreakBefore = [false, false, false, true]. Expected: m8 lives
    // on its own line, not tacked onto m4.
    const rows = buildEtudeRows(4, 4, [false, false, false, true]);
    expect(rows).toEqual([
      [0, 1, 2],
      [3],
    ]);
  });

  it('handles multiple non-adjacent sections', () => {
    // bars [m3, m4, m9, m13, m14] → breaks at indices 2 and 3.
    const rows = buildEtudeRows(5, 4, [false, false, true, true, false]);
    expect(rows).toEqual([
      [0, 1],
      [2],
      [3, 4],
    ]);
  });

  it('still wraps at barsPerRow within a single section', () => {
    // Six contiguous bars with no section breaks should wrap at 4.
    expect(buildEtudeRows(6, 4, [false, false, false, false, false, false])).toEqual([
      [0, 1, 2, 3],
      [4, 5],
    ]);
  });

  it('treats undefined and null sectionBreaks the same', () => {
    expect(buildEtudeRows(3, 4, undefined)).toEqual([[0, 1, 2]]);
    expect(buildEtudeRows(3, 4, null)).toEqual([[0, 1, 2]]);
  });
});

describe('vexflow-render computeBeamGroupIndices', () => {
  const n = (duration: EtudeDuration, dotted = false): EtudeNote =>
    ({ kind: 'note', duration, ...(dotted ? { dotted: true } : {}) });
  const r = (duration: EtudeDuration): EtudeNote => ({ kind: 'rest', duration });

  it('beams a lone dotted-8 + 16 pair', () => {
    expect(computeBeamGroupIndices([n('8', true), n('16')])).toEqual([[0, 1]]);
  });

  it('splits dotted-8 + 16 from a trailing run of plain 8ths (m4/m7/m16/m21 shape)', () => {
    const seq = [n('8', true), n('16'), n('8'), n('8'), n('8'), n('8')];
    expect(computeBeamGroupIndices(seq)).toEqual([[0, 1], [2, 3, 4, 5]]);
  });

  it('handles 8d+16 | q | 8d+16 (m6/m25 shape)', () => {
    const seq = [n('8', true), n('16'), n('q'), n('8', true), n('16')];
    expect(computeBeamGroupIndices(seq)).toEqual([[0, 1], [3, 4]]);
  });

  it('beams the trailing 8d+16 after two quarters (m8/m22 shape)', () => {
    const seq = [n('q'), n('q'), n('8', true), n('16')];
    expect(computeBeamGroupIndices(seq)).toEqual([[2, 3]]);
  });

  it('beams 8d+16 alone when followed by quarters', () => {
    const seq = [n('8', true), n('16'), n('q'), n('q')];
    expect(computeBeamGroupIndices(seq)).toEqual([[0, 1]]);
  });

  it('handles 8d+16 | q | 8+8 (m24 shape)', () => {
    const seq = [n('8', true), n('16'), n('q'), n('8'), n('8')];
    expect(computeBeamGroupIndices(seq)).toEqual([[0, 1], [3, 4]]);
  });

  it('beams a continuous run of plain 8ths', () => {
    const seq = [n('8'), n('8'), n('8'), n('8'), n('8'), n('8')];
    expect(computeBeamGroupIndices(seq)).toEqual([[0, 1, 2, 3, 4, 5]]);
  });

  it('does not beam a lone dotted-8', () => {
    expect(computeBeamGroupIndices([n('8', true)])).toEqual([[0]]);
  });

  it('does not pair a dotted-8 across a rest', () => {
    const seq = [n('8', true), r('16'), n('16')];
    expect(computeBeamGroupIndices(seq)).toEqual([[0], [2]]);
  });

  it('splits a dotted-8 from a following plain 8 (dottedness mismatch)', () => {
    expect(computeBeamGroupIndices([n('8', true), n('8')])).toEqual([[0], [1]]);
  });

  it('splits a plain 8 from a following 16', () => {
    expect(computeBeamGroupIndices([n('8'), n('16')])).toEqual([[0], [1]]);
  });

  it('beams runs of 16ths and 8ths separately at duration changes', () => {
    const seq = [n('16'), n('16'), n('8'), n('8')];
    expect(computeBeamGroupIndices(seq)).toEqual([[0, 1], [2, 3]]);
  });

  it('returns no groups for empty input', () => {
    expect(computeBeamGroupIndices([])).toEqual([]);
  });
});

describe('vexflow-render renderEtudeEl section-break layout', () => {
  function renderToSvg(ranges: { start: number; end: number }[]) {
    const sliced = sliceEtudeByRanges(SOR_OP60_NO1, ranges);
    const host = document.createElement('div');
    document.body.appendChild(host);
    renderEtudeEl(host, sliced.etude, 0, {
      width: 960,
      showTab: false,
      showLhFingerings: false,
      showRhFingerings: false,
      barLabels: sliced.originalBarNumbers,
      sectionBreaks: sliced.sectionBreakBefore,
    });
    const svg = host.querySelector('svg')!;
    const height = Number(svg.getAttribute('height') ?? svg.getAttribute('viewBox')?.split(' ')[3] ?? '0');
    host.remove();
    return { svg, height, sliced };
  }

  it('a contiguous 3-bar slice renders on a single row', () => {
    const { height } = renderToSvg([{ start: 2, end: 4 }]);
    // Single-row height: topPad(30) + rowHeight(120) + bottomPad(40) = 190.
    expect(height).toBeGreaterThan(150);
    expect(height).toBeLessThan(230);
  });

  it('non-adjacent 2-4 + 8 selection renders on TWO rows', () => {
    const { height, sliced } = renderToSvg([
      { start: 2, end: 4 },
      { start: 8, end: 8 },
    ]);
    expect(sliced.sectionBreakBefore).toEqual([false, false, false, true]);
    // Two-row height adds a second rowHeight(120) + rowGap(30) on top of the
    // single-row baseline — so anything over ~300 confirms a real row break.
    expect(height).toBeGreaterThan(300);
  });

  it('non-adjacent slice is taller than the same bar count contiguous', () => {
    const contiguous = renderToSvg([{ start: 1, end: 4 }]);
    const broken = renderToSvg([
      { start: 2, end: 4 },
      { start: 8, end: 8 },
    ]);
    expect(broken.height).toBeGreaterThan(contiguous.height + 100);
  });
});
