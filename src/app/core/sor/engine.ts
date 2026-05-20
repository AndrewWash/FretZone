import type { EtudeNote, SorEtude } from './models';
import { ETUDE_BEATS_PER_BAR, noteBeats } from './models';
import { createBeatCursor, type BeatCursor } from '../audio/beat-cursor';

// Flattened upper-voice play sequence — what the player is "reading along" to.
// Used both for mic-based pitch matching and metronome-based cursor advance.
export interface UpperNoteRef {
  midi: number;
  index: number;        // 0-based position among non-rest upper notes
  beatOnset: number;    // cumulative quarter-note beats from piece start
  beats: number;        // note's own duration in beats (with dot)
}

export function flattenUpperVoice(etude: SorEtude): UpperNoteRef[] {
  const out: UpperNoteRef[] = [];
  const beatsPerBar = ETUDE_BEATS_PER_BAR[etude.timeSignature];
  let idx = 0;
  let cursor = 0;
  for (const bar of etude.bars) {
    let beat = cursor;
    for (const n of bar.upper) {
      const beats = noteBeats(n);
      if (n.kind === 'note' && n.midi != null) {
        out.push({ midi: n.midi, index: idx, beatOnset: beat, beats });
        idx++;
      }
      beat += beats;
    }
    cursor += beatsPerBar;
  }
  return out;
}

export function totalBeats(etude: SorEtude): number {
  const beatsPerBar = ETUDE_BEATS_PER_BAR[etude.timeSignature];
  return etude.bars.length * beatsPerBar;
}

// Total non-rest upper-voice note count — used for "Notes: 3 / 24" readouts.
export function upperNoteCount(etude: SorEtude): number {
  let count = 0;
  for (const bar of etude.bars) {
    for (const n of bar.upper) if (n.kind === 'note') count++;
  }
  return count;
}

// ── Metronome-driven cursor ─────────────────────────────────────────────────
// Wraps a wall-clock timer that fires at each quarter-note beat boundary.
// The cursor advances to the next upper-voice note whose `beatOnset` has been
// reached. The metronome service handles its own audio scheduling; this
// cursor just tracks musical time independently so the visual highlight stays
// in step even if the metronome is muted.

export interface MetronomeCursorOpts {
  bpm: number;                                  // quarter-note BPM
  onAdvance: (playedIndex: number) => void;     // called as each upper note is "reached"
  onComplete: () => void;
}

// Alias kept so older imports don't break; new code should use BeatCursor.
export type MetronomeCursor = BeatCursor;

export function createMetronomeCursor(etude: SorEtude, opts: MetronomeCursorOpts): MetronomeCursor {
  const seq = flattenUpperVoice(etude);
  return createBeatCursor({
    bpm: opts.bpm,
    noteOnsets: seq.map(s => s.beatOnset),
    totalBeats: totalBeats(etude),
    onAdvance: opts.onAdvance,
    onComplete: opts.onComplete,
  });
}

// Sanity helper used by tests + by the engine itself: verify every tie marker
// has a real next-note target in the same voice.
export interface TieIssue {
  barIdx: number;
  voice: 'upper' | 'lower';
  noteIdxInBar: number;
  reason: string;
}

export function validateTies(etude: SorEtude): TieIssue[] {
  const issues: TieIssue[] = [];
  for (let bi = 0; bi < etude.bars.length; bi++) {
    for (const voice of ['upper', 'lower'] as const) {
      const arr = voice === 'upper' ? etude.bars[bi].upper : etude.bars[bi].lower;
      for (let ni = 0; ni < arr.length; ni++) {
        const note = arr[ni];
        if (!note.tieToNext) continue;
        const next = ni + 1 < arr.length
          ? arr[ni + 1]
          : findFirstInNextBar(etude, bi, voice);
        if (!next) {
          issues.push({ barIdx: bi, voice, noteIdxInBar: ni, reason: 'no next note for tie' });
          continue;
        }
        if (next.kind !== 'note') {
          issues.push({ barIdx: bi, voice, noteIdxInBar: ni, reason: 'tied to a rest' });
        }
      }
    }
  }
  return issues;
}

function findFirstInNextBar(etude: SorEtude, barIdx: number, voice: 'upper' | 'lower'): EtudeNote | null {
  for (let i = barIdx + 1; i < etude.bars.length; i++) {
    const arr = voice === 'upper' ? etude.bars[i].upper : etude.bars[i].lower;
    if (arr.length) return arr[0];
  }
  return null;
}
