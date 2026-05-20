import type { EtudeBar, EtudeNote, SorEtude } from './models';
import { getFretMidi } from '../theory/note';

// Helpers — keep the catalog readable.
// `s` = string number (1=high E .. 6=low E), matches the rest of the codebase.

function n(opts: {
  s: 1 | 2 | 3 | 4 | 5 | 6;
  f: number;
  d: EtudeNote['duration'];
  lh?: EtudeNote['lhFinger'];
  rh?: EtudeNote['rhFinger'];
  dot?: boolean;
  tie?: boolean;
}): EtudeNote {
  // getFretMidi numbers strings 1=low E .. 6=high E internally; the catalog
  // uses 1=high E (consistent with Scales). Flip at the boundary.
  return {
    kind: 'note',
    duration: opts.d,
    dotted: opts.dot,
    tieToNext: opts.tie,
    stringId: opts.s,
    fret: opts.f,
    midi: getFretMidi(7 - opts.s, opts.f),
    lhFinger: opts.lh ?? null,
    rhFinger: opts.rh ?? null,
  };
}

function rest(d: EtudeNote['duration'], dot = false): EtudeNote {
  return { kind: 'rest', duration: d, dotted: dot };
}

// ── Op. 60 No. 1 — placeholder / starter entry ─────────────────────────────
// Sor's Op. 60 No. 1 is a beginner C-major arpeggio study (2/4, Andante). The
// notes are public-domain (Sor died 1839), but rather than ship a specific
// edition's editorial fingerings, this entry is a short representative excerpt
// in the same style: open-position C-major arpeggios with optional bass voice
// in a couple of bars. Replace this catalog data with a full transcription
// (or the output of `npm run import-etude` against a MusicXML export) when
// ready. The shape of the file does not need to change.

const OP60_NO1_BARS: EtudeBar[] = [
  // Bar 1 — single-voice C major arpeggio (C–E–G–C–E–G–E–C), eighths
  {
    upper: [
      n({ s: 5, f: 3, d: '8', lh: 3, rh: 'p' }),   // C3
      n({ s: 4, f: 2, d: '8', lh: 2, rh: 'i' }),   // E3
      n({ s: 3, f: 0, d: '8', lh: 0, rh: 'm' }),   // G3
      n({ s: 2, f: 1, d: '8', lh: 1, rh: 'a' }),   // C4
    ],
    lower: [],
  },
  // Bar 2 — arpeggio continues, ascends to the high G
  {
    upper: [
      n({ s: 3, f: 0, d: '8', lh: 0, rh: 'm' }),   // G3
      n({ s: 2, f: 1, d: '8', lh: 1, rh: 'a' }),   // C4
      n({ s: 1, f: 3, d: '8', lh: 3, rh: 'm' }),   // G4
      n({ s: 2, f: 1, d: '8', lh: 1, rh: 'i' }),   // C4
    ],
    lower: [],
  },
  // Bar 3 — two-voice: melody on the high strings, sustained bass on string 5
  {
    upper: [
      n({ s: 3, f: 0, d: '8', lh: 0, rh: 'm' }),   // G3
      n({ s: 2, f: 1, d: '8', lh: 1, rh: 'i' }),   // C4
      n({ s: 3, f: 0, d: '8', lh: 0, rh: 'm' }),   // G3
      n({ s: 4, f: 2, d: '8', lh: 2, rh: 'i' }),   // E3
    ],
    lower: [
      n({ s: 5, f: 3, d: 'h', lh: 3, rh: 'p' }),   // C3 held under the upper voice
    ],
  },
  // Bar 4 — G7 arpeggio leading back toward C
  {
    upper: [
      n({ s: 6, f: 3, d: '8', lh: 3, rh: 'p' }),   // G2
      n({ s: 4, f: 0, d: '8', lh: 0, rh: 'i' }),   // D3
      n({ s: 3, f: 0, d: '8', lh: 0, rh: 'm' }),   // G3
      n({ s: 2, f: 0, d: '8', lh: 0, rh: 'a' }),   // B3
    ],
    lower: [],
  },
  // Bar 5 — dotted rhythm + tie back into bar 6 (exercises both renderer paths)
  {
    upper: [
      n({ s: 2, f: 1, d: 'q', dot: true, lh: 1, rh: 'a' }),  // C4 dotted-quarter
      n({ s: 3, f: 0, d: '8', lh: 0, rh: 'm' }),             // G3
    ],
    lower: [
      n({ s: 5, f: 3, d: 'q', lh: 3, rh: 'p', tie: true }),  // C3 tied
      n({ s: 5, f: 3, d: 'q', lh: 3 }),                       // C3 (tie target)
    ],
  },
  // Bar 6 — resolution
  {
    upper: [
      n({ s: 2, f: 1, d: 'q', lh: 1, rh: 'i' }),   // C4
      n({ s: 3, f: 0, d: 'q', lh: 0, rh: 'm' }),   // G3
    ],
    lower: [],
  },
];

export const SOR_OP60_NO1: SorEtude = {
  id: 'sor-op60-no1',
  opus: 60,
  number: 1,
  title: 'Op. 60 No. 1',
  key: 'C',
  keyMode: 'Ionian',
  timeSignature: '2/4',
  defaultBpm: 72,
  bars: OP60_NO1_BARS,
  enabled: true,
  attribution:
    'Starter excerpt in the style of Op. 60 No. 1 — replace via the MusicXML importer or hand transcription.',
};

// Future etudes — registered but disabled so the UI can show the full Op. 60
// roster as a roadmap. Add bars + flip `enabled` to publish one.
function stub(num: number): SorEtude {
  return {
    id: `sor-op60-no${num}`,
    opus: 60,
    number: num,
    title: `Op. 60 No. ${num}`,
    key: 'C',
    keyMode: 'Ionian',
    timeSignature: '2/4',
    defaultBpm: 72,
    bars: [],
    enabled: false,
  };
}

export const SOR_ETUDES: SorEtude[] = [
  SOR_OP60_NO1,
  ...Array.from({ length: 24 }, (_, i) => stub(i + 2)),
];

export function getEtudeById(id: string): SorEtude | undefined {
  return SOR_ETUDES.find(e => e.id === id);
}

export function etudeLabel(e: SorEtude): string {
  return e.title;
}
