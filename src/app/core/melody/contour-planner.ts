import type { PhraseBarCount } from './models';

export type ContourShape = 'arch' | 'ascent' | 'descent' | 'valley';
export type PitchBand = 'low' | 'mid' | 'high';

export interface ContourPlan {
  shape: ContourShape;
  // Bar index that should hold the phrase's peak (or trough for descent).
  climaxBarIdx: number;
  // Soft target band per bar; the pitch planner uses these to bias selection.
  perBarBand: PitchBand[];
}

// Pick a contour shape and per-bar pitch-band targets.
// Climax sits at 60-75% of the phrase length — late enough to feel like a
// peak, early enough to leave room to resolve.
export function planContour(barCount: PhraseBarCount): ContourPlan {
  const shape = pickShape();
  const climaxBarIdx = pickClimaxBar(barCount, shape);
  const perBarBand = buildBands(barCount, shape, climaxBarIdx);
  return { shape, climaxBarIdx, perBarBand };
}

function pickShape(): ContourShape {
  // Arch is the most common natural phrase shape — bias toward it.
  const r = Math.random();
  if (r < 0.55) return 'arch';
  if (r < 0.80) return 'ascent';
  if (r < 0.95) return 'descent';
  return 'valley';
}

function pickClimaxBar(barCount: PhraseBarCount, shape: ContourShape): number {
  // Single-bar phrase: climax is trivially that bar.
  if (barCount <= 1) return 0;
  // Place the extreme at ~62.5% through the phrase.
  const target = Math.floor(barCount * 0.625);
  if (shape === 'ascent') return barCount - 1;       // climbs to the end
  if (shape === 'descent') return 0;                  // peak is the start
  if (shape === 'valley') return Math.floor(barCount / 2); // dip mid-phrase
  return Math.min(barCount - 1, Math.max(1, target));
}

function buildBands(
  barCount: PhraseBarCount,
  shape: ContourShape,
  climaxBarIdx: number,
): PitchBand[] {
  const bands: PitchBand[] = [];
  for (let i = 0; i < barCount; i++) {
    bands.push(bandForBar(i, barCount, shape, climaxBarIdx));
  }
  return bands;
}

function bandForBar(
  barIdx: number,
  barCount: PhraseBarCount,
  shape: ContourShape,
  climaxBarIdx: number,
): PitchBand {
  if (shape === 'ascent') {
    const t = barIdx / Math.max(1, barCount - 1);
    return t < 0.34 ? 'low' : t < 0.67 ? 'mid' : 'high';
  }
  if (shape === 'descent') {
    const t = barIdx / Math.max(1, barCount - 1);
    return t < 0.34 ? 'high' : t < 0.67 ? 'mid' : 'low';
  }
  if (shape === 'valley') {
    const dist = Math.abs(barIdx - climaxBarIdx);
    if (dist === 0) return 'low';
    if (dist <= barCount / 4) return 'mid';
    return 'high';
  }
  // arch
  const dist = Math.abs(barIdx - climaxBarIdx);
  if (dist === 0) return 'high';
  if (dist <= barCount / 4) return 'mid';
  return 'low';
}

// Translate a pitch-band target into a (loMidi, hiMidi) window inside the pool.
export function bandWindow(band: PitchBand, poolLo: number, poolHi: number): [number, number] {
  const range = poolHi - poolLo;
  // Bands overlap to keep the constraint solvable in narrow pools.
  if (range <= 5) return [poolLo, poolHi];
  if (band === 'low')  return [poolLo, poolLo + Math.round(range * 0.55)];
  if (band === 'high') return [poolLo + Math.round(range * 0.45), poolHi];
  // mid: middle 70% of the pool
  return [poolLo + Math.round(range * 0.15), poolLo + Math.round(range * 0.85)];
}
