import { Flow } from 'vexflow';
import { spellMidi, AccidentalMode, BaseLetter } from '../core/theory/note';
import { keyAwareSpelling, keySignatureSpec, ModeName } from '../core/theory/modes';
import type { MelodyTickable } from '../core/melody/models';

export interface NotationOptions {
  width?: number;
  height?: number;
  accidentalMode?: AccidentalMode;
}

export interface Spelled { key: string; accidental?: '#' | 'b'; }

export function renderTrebleNoteEl(container: HTMLElement, midiSounding: number, opts: NotationOptions = {}) {
  const width = opts.width ?? 320;
  const height = opts.height ?? 140;
  const mode: AccidentalMode = opts.accidentalMode ?? 'Naturals';
  container.innerHTML = '';

  const renderer = new Flow.Renderer(container as HTMLDivElement, Flow.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  context.setFont('Arial', 10, '').setBackgroundFillStyle('#111827');

  const stave = new Flow.Stave(10, 20, width - 20);
  stave.addClef('treble');
  stave.setContext(context).draw();

  const writtenMidi = midiSounding + 12;
  const spelled = spellMidi(writtenMidi, mode);
  const keys = [spelled.key];

  const note = new Flow.StaveNote({ keys, duration: 'q', clef: 'treble' });
  if (spelled.accidental) {
    note.addModifier(new Flow.Accidental(spelled.accidental), 0);
  }

  const voice = new Flow.Voice({ num_beats: 1, beat_value: 4 });
  voice.addTickables([note]);
  new Flow.Formatter().joinVoices([voice]).format([voice], width - 60);
  voice.draw(context, stave);
}

export function renderStaffEl(container: HTMLElement, n1: Spelled, n2: Spelled, mode: 'Dyad' | 'Sequential') {
  const width = 520; const height = 180;
  container.innerHTML = '';
  const renderer = new Flow.Renderer(container as HTMLDivElement, Flow.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  context.setFont('Arial', 10, '').setBackgroundFillStyle('#111827');
  const stave = new Flow.Stave(10, 20, width - 20);
  stave.addClef('treble');
  stave.setContext(context).draw();

  const keys = [n1.key, n2.key];

  const mk = (k: string, acc?: '#' | 'b') => {
    const note = new Flow.StaveNote({ keys: [k], duration: 'q', clef: 'treble' });
    if (acc) note.addModifier(new Flow.Accidental(acc), 0);
    return note;
  };

  if (mode === 'Dyad') {
    const dy = new Flow.StaveNote({ keys, duration: 'q', clef: 'treble' });
    if (n1.accidental) dy.addModifier(new Flow.Accidental(n1.accidental), 0);
    if (n2.accidental) dy.addModifier(new Flow.Accidental(n2.accidental), 1);
    const voice = new Flow.Voice({ num_beats: 1, beat_value: 4 });
    voice.addTickables([dy]);
    new Flow.Formatter().joinVoices([voice]).format([voice], width - 60);
    voice.draw(context, stave);
  } else {
    const nLeft = mk(n1.key, n1.accidental);
    const nRight = mk(n2.key, n2.accidental);
    const voice = new Flow.Voice({ num_beats: 2, beat_value: 4 });
    voice.addTickables([nLeft, nRight]);
    new Flow.Formatter().joinVoices([voice]).format([voice], width - 60);
    voice.draw(context, stave);
    const txt1 = new Flow.TextNote({ text: '1', duration: 'q' }).setJustification(Flow.TextNote.Justification.CENTER);
    const txt2 = new Flow.TextNote({ text: '2', duration: 'q' }).setJustification(Flow.TextNote.Justification.CENTER);
    const v2 = new Flow.Voice({ num_beats: 2, beat_value: 4 });
    v2.addTickables([txt1, txt2]);
    new Flow.Formatter().joinVoices([v2]).format([v2], width - 60);
    v2.draw(context, stave);
  }
}

export interface MelodyRenderOptions {
  width?: number;
  tonic?: BaseLetter;
  mode?: ModeName;
}

const DIM_FILL = '#5a5d6c';
const DIM_STROKE = '#5a5d6c';
const DIM_STYLE = { fillStyle: DIM_FILL, strokeStyle: DIM_STROKE };

export function renderMelodyEl(
  container: HTMLElement,
  bars: MelodyTickable[][],
  playedCount: number,
  opts: MelodyRenderOptions = {},
) {
  const width = opts.width ?? 720;
  const tonic: BaseLetter = opts.tonic ?? 'C';
  const mode: ModeName = opts.mode ?? 'Ionian';
  const keySpec = keySignatureSpec(tonic, mode);
  container.innerHTML = '';

  // wrap into rows of at most 4 bars each — keeps 8-bar phrases readable
  // without a horizontal scroll
  const barsPerRow = bars.length <= 4 ? bars.length : 4;
  const rows: MelodyTickable[][][] = [];
  for (let i = 0; i < bars.length; i += barsPerRow) {
    rows.push(bars.slice(i, i + barsPerRow));
  }
  const rowHeight = 110;
  const topPad = 30;
  const bottomPad = 20;
  const height = topPad + rows.length * rowHeight + bottomPad;

  const renderer = new Flow.Renderer(container as HTMLDivElement, Flow.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();
  ctx.setFont('Arial', 10, '').setBackgroundFillStyle('#111827');

  const buildVoice = (ticks: MelodyTickable[]) => {
    const notes = ticks.map(t => toMelodyStaveNote(t, tonic, mode));
    const voice = new Flow.Voice({ num_beats: 4, beat_value: 4 });
    voice.setMode(Flow.Voice.Mode.SOFT);
    voice.addTickables(notes);
    return { voice, notes };
  };

  const allVoices = bars.map(b => buildVoice(b));

  // Auto-place accidentals based on key signature: in-scale notes get no
  // glyph (key sig handles them); out-of-scale chromatics get an explicit
  // accidental. Must happen BEFORE format so layout reserves space.
  try {
    Flow.Accidental.applyAccidentals(allVoices.map(v => v.voice), keySpec);
  } catch {}

  let dimRemaining = playedCount;
  const dimNotes = (notes: any[], ticks: MelodyTickable[]) => {
    for (let i = 0; i < notes.length; i++) {
      if (dimRemaining <= 0) break;
      if (ticks[i].kind !== 'note') continue;
      const n = notes[i];
      n.setStyle(DIM_STYLE);
      const mods = n.getModifiers ? n.getModifiers() : [];
      mods.forEach((m: any) => { try { m.setStyle?.(DIM_STYLE); } catch {} });
      dimRemaining--;
    }
  };

  const drawBeams = (notes: any[], ticks: MelodyTickable[]) => {
    const noteOnly: any[] = [];
    for (let i = 0; i < notes.length; i++) {
      if (ticks[i].kind === 'note') noteOnly.push(notes[i]);
    }
    if (!noteOnly.length) return;
    try {
      const beams = Flow.Beam.generateBeams(noteOnly);
      beams.forEach(b => b.setContext(ctx).draw());
    } catch {}
  };

  const formatBar = (voice: any, stave: any) => {
    const formatter = new Flow.Formatter();
    formatter.joinVoices([voice]);
    formatter.format([voice], Math.max(40, stave.getWidth() - 20));
    voice.draw(ctx, stave);
  };

  // padding for clef + key sig + time sig on the row's first stave
  const padClef = 120;
  const totalAvailable = width - 20;
  const tmp = new Flow.Formatter();

  let voiceCursor = 0;
  rows.forEach((rowBars, rowIdx) => {
    const rowVoices = allVoices.slice(voiceCursor, voiceCursor + rowBars.length);
    const mins = rowVoices.map(v => {
      let m: number;
      try { m = tmp.preCalculateMinTotalWidth([v.voice]); } catch { m = 200; }
      if (!isFinite(m) || m <= 0) m = 200;
      return m;
    });
    const totalMin = mins.reduce((a, b) => a + b, 0) + padClef;
    const scale = totalAvailable / totalMin;
    const widths = mins.map((m, i) => i === 0 ? (m + padClef) * scale : m * scale);

    const yTop = topPad + rowIdx * rowHeight;
    let xCursor = 10;
    rowVoices.forEach((rv, i) => {
      const stave = new Flow.Stave(xCursor, yTop, widths[i]);
      if (i === 0) {
        stave.addClef('treble').addKeySignature(keySpec).addTimeSignature('4/4');
      }
      stave.setContext(ctx).draw();
      dimNotes(rv.notes, rowBars[i]);
      formatBar(rv.voice, stave);
      drawBeams(rv.notes, rowBars[i]);
      xCursor += widths[i];
    });
    voiceCursor += rowBars.length;
  });
}

function toMelodyStaveNote(t: MelodyTickable, tonic: BaseLetter, mode: ModeName) {
  if (t.kind === 'rest') {
    return new Flow.StaveNote({ keys: ['b/4'], duration: t.duration === 'q' ? 'qr' : '8r' });
  }
  const writtenMidi = (t.midi ?? 60) + 12;
  const sp = keyAwareSpelling(writtenMidi, tonic, mode);
  // No manual addModifier — Flow.Accidental.applyAccidentals at the voice
  // level decides which glyphs to draw vs. let the key signature speak.
  return new Flow.StaveNote({ keys: [sp.key], duration: t.duration, clef: 'treble' });
}
