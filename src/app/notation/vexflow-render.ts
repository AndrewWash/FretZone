import { Flow } from 'vexflow';
import { spellMidi, AccidentalMode, BaseLetter } from '../core/theory/note';
import { keyAwareSpelling, keySignatureSpec, tonicPc, ModeName } from '../core/theory/modes';
import type { MelodyTickable, TimeSignature } from '../core/melody/models';
import { BEATS_PER_BAR } from '../core/melody/models';
import { rhFingerLabel, type RhFingeringPattern } from '../core/scales/models';
import type {
  EtudeBar,
  EtudeNote,
  EtudeTimeSignature,
  SorEtude,
} from '../core/sor/models';
import { ETUDE_BEATS_PER_BAR, noteBeats } from '../core/sor/models';

export type NotationTheme = 'light' | 'dark';

export interface NotationOptions {
  width?: number;
  height?: number;
  accidentalMode?: AccidentalMode;
  theme?: NotationTheme;
}

export interface Spelled { key: string; accidental?: '#' | 'b'; }

// Theme color spec for VexFlow rendering. Built per call so the same render
// function can output either a black-on-white or white-on-black SVG.
function themeColors(theme: NotationTheme | undefined) {
  const isDark = theme !== 'light';
  return {
    FG:  isDark ? '#ffffff' : '#000000',
    BG:  isDark ? '#000000' : '#ffffff',
    DIM: isDark ? '#a0a0a0' : '#5a5d6c',
  };
}

// VexFlow draws clefs / key signatures / time signatures as StaveModifiers
// with their own style state — setStyle on the stave alone leaves them in the
// default color, which is invisible against a black background.
function styleStave(stave: any, fg: string) {
  const style = { fillStyle: fg, strokeStyle: fg };
  stave.setStyle(style);
  try {
    const mods = stave.getModifiers?.() ?? [];
    mods.forEach((m: any) => { try { m.setStyle?.(style); } catch {} });
  } catch {}
}

// MusicXML <repeat direction="forward|backward"/> → VexFlow repeat barlines.
// Applied before draw() so the stave allocates space for the thick bar + dots.
function applyRepeatBarlines(stave: any, bar: EtudeBar) {
  const T = (Flow as any).Barline?.type;
  if (!T) return;
  try {
    if (bar.startRepeat) stave.setBegBarType(T.REPEAT_BEGIN);
    if (bar.endRepeat) stave.setEndBarType(T.REPEAT_END);
  } catch {}
}

// Notehead + stem + flag are covered by StaveNote.setStyle, but accidentals
// and fret-hand-finger badges are modifiers that need their own style call.
function styleNote(note: any, fg: string) {
  const style = { fillStyle: fg, strokeStyle: fg };
  note.setStyle(style);
  try {
    const mods = note.getModifiers?.() ?? [];
    mods.forEach((m: any) => { try { m.setStyle?.(style); } catch {} });
  } catch {}
}

// VexFlow draws at a fixed glyph size — sizing the SVG larger only adds blank
// space. To make a small staff feel larger on screen, render at the intrinsic
// size, then set a viewBox + scaled width/height so the browser upscales the
// vector content. CSS `max-width: 100%; height: auto` still clamps to the
// container, so the staff never overflows its column.
function scaleSvg(container: HTMLElement, intrinsicWidth: number, intrinsicHeight: number, scale: number) {
  const svg = container.querySelector('svg') as SVGSVGElement | null;
  if (!svg) return;
  // VexFlow's renderer.resize() writes inline width/height styles on the SVG;
  // those would win over the attributes below and silently cancel the upscale.
  svg.style.removeProperty('width');
  svg.style.removeProperty('height');
  svg.setAttribute('viewBox', `0 0 ${intrinsicWidth} ${intrinsicHeight}`);
  svg.setAttribute('width', String(Math.round(intrinsicWidth * scale)));
  svg.setAttribute('height', String(Math.round(intrinsicHeight * scale)));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
}

const DISPLAY_SCALE = 2.0;

export function renderTrebleNoteEl(container: HTMLElement, midiSounding: number, opts: NotationOptions = {}) {
  const width = opts.width ?? 320;
  const height = opts.height ?? 140;
  const mode: AccidentalMode = opts.accidentalMode ?? 'Naturals';
  const { FG, BG } = themeColors(opts.theme);
  container.innerHTML = '';

  const renderer = new Flow.Renderer(container as HTMLDivElement, Flow.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  context.setFont('Arial', 10, '').setBackgroundFillStyle(BG);
  // Context-level fill/stroke is the fallback color for elements that don't
  // carry their own style (e.g. ledger lines drawn during voice.draw).
  try { (context as any).setFillStyle?.(FG); (context as any).setStrokeStyle?.(FG); } catch {}

  const stave = new Flow.Stave(10, 20, width - 20);
  stave.addClef('treble');
  styleStave(stave, FG);
  stave.setContext(context).draw();

  const writtenMidi = midiSounding + 12;
  const spelled = spellMidi(writtenMidi, mode);
  const keys = [spelled.key];

  const note = new Flow.StaveNote({ keys, duration: 'q', clef: 'treble' });
  if (spelled.accidental) {
    note.addModifier(new Flow.Accidental(spelled.accidental), 0);
  }
  styleNote(note, FG);

  const voice = new Flow.Voice({ num_beats: 1, beat_value: 4 });
  voice.addTickables([note]);
  new Flow.Formatter().joinVoices([voice]).format([voice], width - 60);
  voice.draw(context, stave);

  scaleSvg(container, width, height, DISPLAY_SCALE);
}

export function renderStaffEl(
  container: HTMLElement,
  n1: Spelled,
  n2: Spelled,
  mode: 'Dyad' | 'Sequential',
  opts: { theme?: NotationTheme } = {},
) {
  const width = 400; const height = 160;
  const { FG, BG } = themeColors(opts.theme);
  container.innerHTML = '';
  const renderer = new Flow.Renderer(container as HTMLDivElement, Flow.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  context.setFont('Arial', 10, '').setBackgroundFillStyle(BG);
  try { (context as any).setFillStyle?.(FG); (context as any).setStrokeStyle?.(FG); } catch {}
  const stave = new Flow.Stave(10, 20, width - 20);
  stave.addClef('treble');
  styleStave(stave, FG);
  stave.setContext(context).draw();

  const keys = [n1.key, n2.key];

  const mk = (k: string, acc?: '#' | 'b') => {
    const note = new Flow.StaveNote({ keys: [k], duration: 'q', clef: 'treble' });
    if (acc) note.addModifier(new Flow.Accidental(acc), 0);
    styleNote(note, FG);
    return note;
  };

  if (mode === 'Dyad') {
    const dy = new Flow.StaveNote({ keys, duration: 'q', clef: 'treble' });
    if (n1.accidental) dy.addModifier(new Flow.Accidental(n1.accidental), 0);
    if (n2.accidental) dy.addModifier(new Flow.Accidental(n2.accidental), 1);
    styleNote(dy, FG);
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
    txt1.setStyle({ fillStyle: FG, strokeStyle: FG });
    txt2.setStyle({ fillStyle: FG, strokeStyle: FG });
    const v2 = new Flow.Voice({ num_beats: 2, beat_value: 4 });
    v2.addTickables([txt1, txt2]);
    new Flow.Formatter().joinVoices([v2]).format([v2], width - 60);
    v2.draw(context, stave);
  }

  scaleSvg(container, width, height, DISPLAY_SCALE);
}

export interface MelodyRenderOptions {
  width?: number;
  tonic?: BaseLetter;
  mode?: ModeName;
  theme?: NotationTheme;
  timeSignature?: TimeSignature;
}

export function renderMelodyEl(
  container: HTMLElement,
  bars: MelodyTickable[][],
  playedCount: number,
  opts: MelodyRenderOptions = {},
) {
  const width = opts.width ?? 720;
  const tonic: BaseLetter = opts.tonic ?? 'C';
  const mode: ModeName = opts.mode ?? 'Ionian';
  const timeSignature: TimeSignature = opts.timeSignature ?? '4/4';
  const beatsPerBar = BEATS_PER_BAR[timeSignature];
  const { FG, BG, DIM } = themeColors(opts.theme);
  const DIM_STYLE = { fillStyle: DIM, strokeStyle: DIM };
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
  ctx.setFont('Arial', 10, '').setBackgroundFillStyle(BG);
  try { (ctx as any).setFillStyle?.(FG); (ctx as any).setStrokeStyle?.(FG); } catch {}

  const buildVoice = (ticks: MelodyTickable[]) => {
    const notes = ticks.map(t => toMelodyStaveNote(t, tonic, mode));
    const voice = new Flow.Voice({ num_beats: beatsPerBar, beat_value: 4 });
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

  // Paint un-dimmed notes in the theme's foreground color. applyAccidentals
  // may have added new modifiers, so styling has to happen AFTER that pass.
  for (const v of allVoices) {
    for (const n of v.notes) styleNote(n, FG);
  }

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

  // Build beams BEFORE voice.draw(): the Beam constructor calls setBeam() on
  // each note, which is the signal that suppresses the note's own flag. If
  // beams are built after the notes are drawn, the eighth notes render a
  // flag AND a beam.
  const buildBeams = (notes: any[], ticks: MelodyTickable[]) => {
    const noteOnly: any[] = [];
    for (let i = 0; i < notes.length; i++) {
      if (ticks[i].kind === 'note') noteOnly.push(notes[i]);
    }
    if (!noteOnly.length) return [] as any[];
    try {
      return Flow.Beam.generateBeams(noteOnly, { groups: [new Flow.Fraction(1, 4)] });
    } catch {
      return [];
    }
  };

  const formatBar = (voice: any, stave: any, noteRegionWidth: number) => {
    const formatter = new Flow.Formatter();
    formatter.joinVoices([voice]);
    formatter.format([voice], Math.max(40, noteRegionWidth - 20));
    voice.draw(ctx, stave);
  };

  // Probe the actual leading-symbol width (clef + key sig + time sig) for
  // this key — varies with sharp/flat count. Building a hidden stave with
  // the same modifiers and reading getNoteStartX gives the real value.
  const probe = new Flow.Stave(0, 0, 400)
    .addClef('treble')
    .addKeySignature(keySpec)
    .addTimeSignature(timeSignature);
  probe.setContext(ctx);
  let leadWidth = probe.getNoteStartX() - probe.getX();
  if (!isFinite(leadWidth) || leadWidth < 60) leadWidth = 90;

  // Equalize the *note area* of every bar — the part where notes are
  // drawn. Bar 1 of each row is wider by exactly leadWidth so its clef +
  // key sig + time sig sit in front of the same-sized note region. Result:
  // all bars look visually aligned, and the last note never gets squeezed.
  const totalAvailable = width - 20;

  let voiceCursor = 0;
  rows.forEach((rowBars, rowIdx) => {
    const rowVoices = allVoices.slice(voiceCursor, voiceCursor + rowBars.length);
    const noteArea = (totalAvailable - leadWidth) / rowBars.length;

    const yTop = topPad + rowIdx * rowHeight;
    let xCursor = 10;
    rowVoices.forEach((rv, i) => {
      const staveWidth = i === 0 ? noteArea + leadWidth : noteArea;
      const stave = new Flow.Stave(xCursor, yTop, staveWidth);
      if (i === 0) {
        stave.addClef('treble').addKeySignature(keySpec).addTimeSignature(timeSignature);
      }
      styleStave(stave, FG);
      stave.setContext(ctx).draw();
      dimNotes(rv.notes, rowBars[i]);
      const beams = buildBeams(rv.notes, rowBars[i]);
      formatBar(rv.voice, stave, noteArea);
      beams.forEach(b => {
        try { b.setStyle({ fillStyle: FG, strokeStyle: FG }); } catch {}
        b.setContext(ctx).draw();
      });
      xCursor += staveWidth;
    });
    voiceCursor += rowBars.length;
  });
}

function toMelodyStaveNote(t: MelodyTickable, tonic: BaseLetter, mode: ModeName) {
  if (t.kind === 'rest') {
    // VexFlow names rests by appending 'r' to the duration code (e.g. 'qr',
    // '8r'). 'b/4' positions the rest glyph at staff middle, which VexFlow
    // then overrides per-duration to the conventional rest baseline.
    return new Flow.StaveNote({ keys: ['b/4'], duration: `${t.duration}r` });
  }
  const writtenMidi = (t.midi ?? 60) + 12;
  const sp = keyAwareSpelling(writtenMidi, tonic, mode);
  // No manual addModifier — Flow.Accidental.applyAccidentals at the voice
  // level decides which glyphs to draw vs. let the key signature speak.
  return new Flow.StaveNote({ keys: [sp.key], duration: t.duration, clef: 'treble' });
}

// ── Scale renderer ────────────────────────────────────────────────────────
// Renders a single ascending+descending scale on one row, with optional
// TAB staff and optional left-hand fingering modifiers. Notes are dimmed
// progressively as the player advances.

export interface ScaleRenderNote {
  midi: number;             // sounding MIDI
  stringId: 1 | 2 | 3 | 4 | 5 | 6;
  fret: number;
  finger: 1 | 2 | 3 | 4 | null;
}

export interface ScaleRenderOptions {
  width?: number;
  showTab?: boolean;
  showFingerings?: boolean;
  tonic?: BaseLetter;
  tonicOffset?: 0 | 1 | -1;
  mode?: ModeName;
  // Optional indices into `notes` where a new row begins. Each row gets its
  // own clef + key signature. Useful for 3-octave scales that look cramped
  // on a single line.
  rowBreaks?: number[];
  isMelodicMinor?: boolean;
  rhFingeringPattern?: RhFingeringPattern;
  theme?: NotationTheme;
}

export function renderScaleEl(
  container: HTMLElement,
  notes: ScaleRenderNote[],
  playedCount: number,
  opts: ScaleRenderOptions = {},
) {
  const requestedWidth = opts.width ?? 960;
  const tonic: BaseLetter = opts.tonic ?? 'C';
  const tonicOffset: 0 | 1 | -1 = opts.tonicOffset ?? 0;
  const mode: ModeName = opts.mode ?? 'Ionian';
  const showTab = !!opts.showTab;
  const showFingerings = !!opts.showFingerings;
  const rhPattern: RhFingeringPattern = opts.rhFingeringPattern ?? 'off';
  const { FG, BG, DIM } = themeColors(opts.theme);
  const DIM_STYLE = { fillStyle: DIM, strokeStyle: DIM };
  const keySpec = keySignatureSpec(tonic, mode, tonicOffset);
  container.innerHTML = '';

  // Resolve row break indices into [start, end) ranges. Empty / out-of-range
  // values collapse to a single row.
  const breaks = (opts.rowBreaks ?? [])
    .filter(b => Number.isFinite(b) && b > 0 && b < notes.length)
    .slice()
    .sort((a, b) => a - b);
  const ranges: Array<[number, number]> = [];
  let cursor = 0;
  for (const b of breaks) {
    if (b > cursor) ranges.push([cursor, b]);
    cursor = b;
  }
  if (cursor < notes.length) ranges.push([cursor, notes.length]);
  if (!ranges.length) ranges.push([0, notes.length]);

  // Extra headroom when RH fingerings are on so a TOP-justified annotation
  // above high ledger-line notes isn't clipped at the SVG top edge.
  const topPad = 30 + (rhPattern !== 'off' ? 14 : 0);
  // 72 + 8 gives a 40 px gap from the bottom treble line to the tab top.
  // Pattern #3's lowest note (G3 written) with fingering needs ~50 px, so
  // expect ~10 px of glyph overlap on that one extreme note; all other
  // patterns clear cleanly.
  const staveHeight = 72;
  const tabGap = 8;
  const tabHeight = showTab ? 110 : 0;
  const rowGap = 30;
  // When tab is hidden the tab stave no longer occupies the space below the
  // treble staff, so low ledger-line notes would crash into the next row.
  // Add extra clearance below each treble row to keep rows separated.
  const noTabClearance = showTab ? 0 : 60;
  const rowHeight = staveHeight + tabGap + tabHeight + noTabClearance;
  const bottomPad = showTab ? 20 : 60;
  const height =
    topPad + ranges.length * rowHeight + Math.max(0, ranges.length - 1) * rowGap + bottomPad;

  const renderer = new Flow.Renderer(container as HTMLDivElement, Flow.Renderer.Backends.SVG);
  renderer.resize(requestedWidth, height);
  const ctx = renderer.getContext();
  // BG fill paints the small rectangle VexFlow draws behind each TAB fret
  // number so it disappears against the (theme-matched) staff host bg.
  ctx.setFont('Arial', 10, '').setBackgroundFillStyle(BG);
  try { (ctx as any).setFillStyle?.(FG); (ctx as any).setStrokeStyle?.(FG); } catch {}

  const staveX = 10;
  const rightPad = 20;

  // Probe the real lead-in (clef + key signature) width for this key. F#
  // major (6 sharps) is much wider than C major; a fixed reservation would
  // either waste space or push the last note off the stave.
  const probe = new Flow.Stave(0, 0, 400).addClef('treble').addKeySignature(keySpec);
  probe.setContext(ctx);
  let leadWidth = probe.getNoteStartX() - probe.getX();
  if (!isFinite(leadWidth) || leadWidth < 60) leadWidth = 90;

  // Build voices first so we can ask the formatter how much room each row
  // actually needs before deciding the SVG width.
  type RowState = {
    rowNotes: ScaleRenderNote[];
    staveNotes: any[];
    voice: any;
    tabVoice: any | null;
    tabNotes: any[];
    start: number;
  };

  const builtRows: RowState[] = ranges.map(([start, end], rowIdx) => {
    const rowNotes = notes.slice(start, end);

    // Notation voice — each scale tone as a quarter note.
    const staveNotes = rowNotes.map((n, i) => {
      const written = n.midi + 12; // sounding → written (treble guitar is octave-up notation)
      const sp = keyAwareSpelling(written, tonic, mode, tonicOffset);
      const sn = new Flow.StaveNote({ keys: [sp.key], duration: 'q', clef: 'treble' });
      if (showFingerings && n.finger != null) {
        const fhf = new Flow.FretHandFinger(String(n.finger));
        // FretHandFinger defaults to Position.BELOW which is what we want; if
        // the enum is exposed, prefer it explicitly so future VexFlow updates
        // can't change the default.
        try {
          const pos = (Flow as any).Modifier?.Position?.BELOW;
          if (pos != null) fhf.setPosition(pos);
        } catch {}
        sn.addModifier(fhf, 0);
      }
      // Right-hand fingering — a letter (i/m) placed ABOVE the note, opposite
      // the LH badge below. `start + i` is the note's index in the continuous
      // full run, so alternation carries across row breaks and the turnaround.
      const rh = rhFingerLabel(start + i, rhPattern);
      if (rh) {
        const ann = new Flow.Annotation(rh);
        try {
          const top = (Flow as any).Annotation?.VerticalJustify?.TOP;
          if (top != null) ann.setVerticalJustification(top);
        } catch {}
        sn.addModifier(ann, 0);
      }
      return sn;
    });

    // VexFlow's Voice expects beat math to add up. For an arbitrary-length
    // scale, use SOFT mode so the formatter accepts any tickable count.
    const voice = new Flow.Voice({ num_beats: rowNotes.length, beat_value: 4 });
    voice.setMode(Flow.Voice.Mode.SOFT);
    voice.addTickables(staveNotes);

    // Apply key-signature-aware accidentals before formatting.
    try {
      Flow.Accidental.applyAccidentals([voice], keySpec);
    } catch {}

    // Melodic minor descending rows: rows are independent voices so VexFlow
    // has no memory of the D#/E# from the ascending row. Add explicit natural
    // signs to the lowered 6th and 7th so the reader knows they are natural.
    if (opts.isMelodicMinor && breaks.length > 0 && rowIdx > 0) {
      const rootPc = tonicPc(tonic, tonicOffset);
      const nat6Pc = (rootPc + 8) % 12;
      const nat7Pc = (rootPc + 10) % 12;
      for (let i = 0; i < staveNotes.length; i++) {
        const notePc = ((rowNotes[i].midi % 12) + 12) % 12;
        if (notePc === nat6Pc || notePc === nat7Pc) {
          staveNotes[i].addModifier(new Flow.Accidental('n'), 0);
        }
      }
    }

    // Paint un-dimmed notes in the theme foreground. Must run AFTER
    // applyAccidentals + the melodic-minor naturals pass so every modifier
    // present at draw time picks up the color.
    for (const sn of staveNotes) styleNote(sn, FG);

    // TAB voice mirrors the notation. Strings in VexFlow's TabNote are numbered
    // 1=top (high E) which matches the project's stringId convention.
    let tabVoice: any = null;
    let tabNotes: any[] = [];
    if (showTab) {
      tabNotes = rowNotes.map(n =>
        new Flow.TabNote({
          positions: [{ str: n.stringId, fret: n.fret }],
          duration: 'q',
        }),
      );
      for (const tn of tabNotes) tn.setStyle({ fillStyle: FG, strokeStyle: FG });
      tabVoice = new Flow.Voice({ num_beats: rowNotes.length, beat_value: 4 });
      tabVoice.setMode(Flow.Voice.Mode.SOFT);
      tabVoice.addTickables(tabNotes);
    }

    return { rowNotes, staveNotes, voice, tabVoice, tabNotes, start };
  });

  // Ask the formatter for the minimum note-region width across all rows.
  // This already accounts for accidentals + glyph spacing, so dense rows
  // (G# minor descending, anything with lots of chromatics + fingerings)
  // contribute their true cost here.
  let minNoteRegion = 0;
  for (const r of builtRows) {
    const voices = r.tabVoice ? [r.voice, r.tabVoice] : [r.voice];
    try {
      const fmt = new Flow.Formatter();
      fmt.joinVoices(voices);
      const w = fmt.preCalculateMinTotalWidth(voices);
      if (w > minNoteRegion) minNoteRegion = w;
    } catch {}
  }
  const formatPad = 20; // breathing room past the bare minimum
  minNoteRegion = Math.ceil(minNoteRegion + formatPad);

  // Pick the SVG width. If the requested width can't fit the content, we
  // render at the intrinsic width and shrink the SVG via viewBox below.
  const intrinsicWidth = staveX * 2 + leadWidth + minNoteRegion + rightPad;
  const renderWidth = Math.max(requestedWidth, intrinsicWidth);
  if (renderWidth !== requestedWidth) {
    renderer.resize(renderWidth, height);
    ctx.setFont('Arial', 10, '').setBackgroundFillStyle(BG);
    try { (ctx as any).setFillStyle?.(FG); (ctx as any).setStrokeStyle?.(FG); } catch {}
  }
  const staveWidth = renderWidth - 20;
  const noteRegion = staveWidth - leadWidth - rightPad;

  builtRows.forEach((r, rowIdx) => {
    const yTop = topPad + rowIdx * (rowHeight + rowGap);

    const stave = new Flow.Stave(staveX, yTop, staveWidth);
    stave.addClef('treble').addKeySignature(keySpec);
    styleStave(stave, FG);
    stave.setContext(ctx).draw();

    let tabStave: any = null;
    if (showTab) {
      tabStave = new Flow.TabStave(staveX, yTop + staveHeight + tabGap, staveWidth);
      tabStave.addClef('tab').setNumLines(6);
      styleStave(tabStave, FG);
      tabStave.setContext(ctx).draw();
      // Treble's lead (clef + key signature) is wider than the tab clef, so
      // each voice would otherwise draw against a different note-start X and
      // the columns drift. Force the tab stave's note region to begin at the
      // same X as the treble's. Must run AFTER draw so format() doesn't
      // overwrite our value.
      tabStave.setNoteStartX(stave.getNoteStartX());
    }

    // Dim played notes (and their TAB twins) using the same gray as melody.
    // playedCount is global across all rows — convert to row-local index.
    for (let i = 0; i < r.staveNotes.length; i++) {
      if (r.start + i >= playedCount) break;
      r.staveNotes[i].setStyle(DIM_STYLE);
      try {
        const mods = r.staveNotes[i].getModifiers();
        mods.forEach((m: any) => { try { m.setStyle?.(DIM_STYLE); } catch {} });
      } catch {}
      if (r.tabNotes[i]) r.tabNotes[i].setStyle(DIM_STYLE);
    }

    const formatter = new Flow.Formatter();
    if (r.tabVoice) {
      formatter.joinVoices([r.voice, r.tabVoice]).format([r.voice, r.tabVoice], noteRegion);
    } else {
      formatter.joinVoices([r.voice]).format([r.voice], noteRegion);
    }
    r.voice.draw(ctx, stave);
    if (r.tabVoice && tabStave) r.tabVoice.draw(ctx, tabStave);
  });

  // If the content needed more room than requested, scale the SVG down so
  // it occupies the requested footprint instead of overflowing the layout.
  if (renderWidth > requestedWidth) {
    const svg = container.querySelector('svg');
    if (svg) {
      svg.setAttribute('viewBox', `0 0 ${renderWidth} ${height}`);
      svg.setAttribute('width', String(requestedWidth));
      const scaledHeight = Math.round(height * (requestedWidth / renderWidth));
      svg.setAttribute('height', String(scaledHeight));
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }
  }
}

// ── Etude renderer ────────────────────────────────────────────────────────
// Renders a multi-bar two-voice classical guitar piece (e.g. Sor Op. 60).
// Differences from the Scale renderer:
//   - per-bar barlines and time signature
//   - two simultaneous voices per bar (stems up + stems down)
//   - dotted notes, rests, and ties (including across bar lines)
//   - per-note RH fingering labels (not a cyclic pattern)

export interface EtudeRenderOptions {
  width?: number;
  showTab?: boolean;
  showLhFingerings?: boolean;
  showRhFingerings?: boolean;
  theme?: NotationTheme;
  // Max bars per row before wrapping. Default 4.
  barsPerRow?: number;
  // Original 1-indexed measure number for each rendered bar (length === bars.length).
  // When omitted, falls back to (bars index + 1).
  barLabels?: number[] | null;
  // When true at index i, force a row break BEFORE bar i so a non-adjacent
  // section starts on its own line with a fresh clef/key/time lead-in.
  sectionBreaks?: boolean[] | null;
}

interface BuiltEtudeNote {
  // The VexFlow stave note (or null for rests, though we keep rests as notes).
  staveNote: any;
  tabNote: any | null;
  // Position in the upper-voice play order (used for dimming). -1 for rests
  // and for lower-voice notes (lower voice dims by beat position).
  upperIndex: number;
  // Cumulative beats from the start of the piece for this note's onset.
  beatOnset: number;
  source: EtudeNote;
}

interface BuiltBar {
  upper: BuiltEtudeNote[];
  lower: BuiltEtudeNote[];
  upperVoice: any;
  lowerVoice: any | null;
  upperTabVoice: any | null;
  lowerTabVoice: any | null;
  // Cumulative beats from start of piece at the bar's onset.
  beatStart: number;
}

function vfDuration(n: EtudeNote): string {
  const base = n.duration;
  const dotted = n.dotted ? 'd' : '';
  const rest = n.kind === 'rest' ? 'r' : '';
  return `${base}${dotted}${rest}`;
}

// Partition bar indices [0..barCount-1] into rows. A row breaks when it hits
// `barsPerRow`, OR when `sectionBreaks[i]` is true at the next bar — the
// latter keeps non-adjacent measure selections from rendering on one line.
// Exported for unit testing — the slice flow (e.g., 2-4 + 8) hinges on this.
export function buildEtudeRows(
  barCount: number,
  barsPerRow: number,
  sectionBreaks: boolean[] | null | undefined,
): number[][] {
  const rows: number[][] = [];
  const perRow = Math.max(1, barsPerRow);
  let i = 0;
  while (i < barCount) {
    const row: number[] = [i];
    i++;
    while (i < barCount && row.length < perRow && !(sectionBreaks && sectionBreaks[i])) {
      row.push(i);
      i++;
    }
    rows.push(row);
  }
  return rows;
}

// Deterministic vertical layout shared by the renderer and the SOR auto
// page-flip scroll logic. Pulled out so both call sites use one source of
// truth for row Y positions and the SVG's total height.
export interface EtudeRowLayout {
  rows: number[][];        // bar indices per row (from buildEtudeRows)
  rowYTops: number[];      // y-offset of each row's top in the SVG, parallel to `rows`
  rowHeight: number;       // per-row vertical extent (treble + tab + clearance)
  rowGap: number;          // vertical space between rows
  topPad: number;          // padding above the first row
  bottomPad: number;       // padding below the last row
  totalHeight: number;     // SVG canvas height
  trebleHeight: number;    // height of the treble stave within a row
  tabGap: number;          // vertical gap between treble and tab staves
}

export interface EtudeRowLayoutOptions {
  barsPerRow?: number;
  sectionBreaks?: boolean[] | null;
  showTab?: boolean;
  showRhFingerings?: boolean;
}

export function computeEtudeRowLayout(
  barCount: number,
  opts: EtudeRowLayoutOptions = {},
): EtudeRowLayout {
  const barsPerRow = Math.max(1, opts.barsPerRow ?? 4);
  const showTab = !!opts.showTab;
  const showRh = !!opts.showRhFingerings;
  const rows = buildEtudeRows(barCount, barsPerRow, opts.sectionBreaks ?? null);

  const trebleHeight = 72;
  const tabGap = 8;
  const tabHeight = showTab ? 110 : 0;
  const rowGap = 30;
  const noTabClearance = showTab ? 0 : 40;
  const topPad = 30 + (showRh ? 14 : 0);
  const rowHeight = trebleHeight + tabGap + tabHeight + noTabClearance;
  const bottomPad = showTab ? 20 : 40;
  const rowYTops = rows.map((_, i) => topPad + i * (rowHeight + rowGap));
  const totalHeight = topPad + rows.length * rowHeight + Math.max(0, rows.length - 1) * rowGap + bottomPad;

  return { rows, rowYTops, rowHeight, rowGap, topPad, bottomPad, totalHeight, trebleHeight, tabGap };
}

export function renderEtudeEl(
  container: HTMLElement,
  etude: SorEtude,
  playedCount: number,
  opts: EtudeRenderOptions = {},
) {
  const requestedWidth = opts.width ?? 960;
  const showTab = !!opts.showTab;
  const showLh = !!opts.showLhFingerings;
  const showRh = !!opts.showRhFingerings;
  const barsPerRow = Math.max(1, opts.barsPerRow ?? 4);
  const tonic: BaseLetter = etude.key;
  const tonicOffset = etude.keyOffset ?? 0;
  const mode: ModeName = etude.keyMode;
  const timeSignature: EtudeTimeSignature = etude.timeSignature;
  const beatsPerBar = ETUDE_BEATS_PER_BAR[timeSignature];
  const { FG, BG, DIM } = themeColors(opts.theme);
  const DIM_STYLE = { fillStyle: DIM, strokeStyle: DIM };
  const keySpec = keySignatureSpec(tonic, mode, tonicOffset);
  container.innerHTML = '';

  const bars = etude.bars;
  if (!bars.length) {
    // Empty etude — render an inviting placeholder stave so the layout
    // doesn't collapse to zero height in setup/preview.
    const renderer = new Flow.Renderer(container as HTMLDivElement, Flow.Renderer.Backends.SVG);
    renderer.resize(requestedWidth, 120);
    const ctx = renderer.getContext();
    ctx.setFont('Arial', 10, '').setBackgroundFillStyle(BG);
    const stave = new Flow.Stave(10, 20, requestedWidth - 20);
    stave.addClef('treble').addKeySignature(keySpec).addTimeSignature(timeSignature);
    styleStave(stave, FG);
    stave.setContext(ctx).draw();
    return;
  }

  // ── Layout math ──────────────────────────────────────────────────────────
  // Rows hold bar INDICES (into `bars`) so each row knows which original
  // measure each slot maps to. Vertical layout (topPad, rowHeight, rowYTops)
  // comes from computeEtudeRowLayout — the SOR component reads the same
  // layout helper to drive auto page-flip scrolling, so the two stay in sync.
  const sectionBreaks = opts.sectionBreaks ?? null;
  const barLabels = opts.barLabels ?? null;
  const layout = computeEtudeRowLayout(bars.length, {
    barsPerRow,
    sectionBreaks,
    showTab,
    showRhFingerings: showRh,
  });
  const { rows, rowYTops, totalHeight: height, trebleHeight, tabGap } = layout;

  const renderer = new Flow.Renderer(container as HTMLDivElement, Flow.Renderer.Backends.SVG);
  renderer.resize(requestedWidth, height);
  const ctx = renderer.getContext();
  ctx.setFont('Arial', 10, '').setBackgroundFillStyle(BG);
  try { (ctx as any).setFillStyle?.(FG); (ctx as any).setStrokeStyle?.(FG); } catch {}

  // ── Build voices for every bar ───────────────────────────────────────────
  // Walk bars in play order, assigning an upperIndex to each non-rest upper
  // note so playedCount can map back to "Nth melody note played".

  let upperCursor = 0;
  let beatCursor = 0;
  const built: BuiltBar[] = bars.map(bar => {
    const beatStart = beatCursor;

    // Upper voice — stems up, default direction.
    const upper = bar.upper.map(src => buildBuiltNote(
      src, tonic, mode, tonicOffset, FG, showTab, showLh, showRh, 1,
    ));
    // Assign sequence indices for non-rest upper notes (used for dimming).
    let upperBeat = beatStart;
    for (let i = 0; i < upper.length; i++) {
      upper[i].beatOnset = upperBeat;
      if (upper[i].source.kind === 'note') {
        upper[i].upperIndex = upperCursor++;
      }
      upperBeat += noteBeats(upper[i].source);
    }

    // Lower voice — stems down. May be empty.
    const lower = bar.lower.length
      ? bar.lower.map(src => buildBuiltNote(
          src, tonic, mode, tonicOffset, FG, showTab, showLh, showRh, -1,
        ))
      : [];
    let lowerBeat = beatStart;
    for (let i = 0; i < lower.length; i++) {
      lower[i].beatOnset = lowerBeat;
      lower[i].upperIndex = -1;
      lowerBeat += noteBeats(lower[i].source);
    }

    // Bar uses quarter-note beat value internally; convert dotted-eighth-based
    // meters (3/8, 6/8) to quarter beats via ETUDE_BEATS_PER_BAR.
    const upperVoice = new Flow.Voice({ num_beats: beatsPerBar, beat_value: 4 });
    upperVoice.setMode(Flow.Voice.Mode.SOFT);
    upperVoice.addTickables(upper.map(b => b.staveNote));

    let lowerVoice: any = null;
    if (lower.length) {
      lowerVoice = new Flow.Voice({ num_beats: beatsPerBar, beat_value: 4 });
      lowerVoice.setMode(Flow.Voice.Mode.SOFT);
      lowerVoice.addTickables(lower.map(b => b.staveNote));
    }

    // Apply key-signature-aware accidentals to both voices independently.
    try { Flow.Accidental.applyAccidentals([upperVoice], keySpec); } catch {}
    if (lowerVoice) {
      try { Flow.Accidental.applyAccidentals([lowerVoice], keySpec); } catch {}
    }
    // Re-style after applyAccidentals so any newly added accidental glyphs
    // pick up the theme foreground.
    for (const b of upper) styleNote(b.staveNote, FG);
    for (const b of lower) styleNote(b.staveNote, FG);

    let upperTabVoice: any = null;
    let lowerTabVoice: any = null;
    if (showTab) {
      const upperTabs = upper.map(b => b.tabNote).filter(Boolean);
      if (upperTabs.length) {
        upperTabVoice = new Flow.Voice({ num_beats: beatsPerBar, beat_value: 4 });
        upperTabVoice.setMode(Flow.Voice.Mode.SOFT);
        upperTabVoice.addTickables(upperTabs);
      }
      const lowerTabs = lower.map(b => b.tabNote).filter(Boolean);
      if (lowerTabs.length) {
        lowerTabVoice = new Flow.Voice({ num_beats: beatsPerBar, beat_value: 4 });
        lowerTabVoice.setMode(Flow.Voice.Mode.SOFT);
        lowerTabVoice.addTickables(lowerTabs);
      }
    }

    beatCursor = beatStart + beatsPerBar;

    return { upper, lower, upperVoice, lowerVoice, upperTabVoice, lowerTabVoice, beatStart };
  });

  // ── Resolve ties ─────────────────────────────────────────────────────────
  // A note with tieToNext links to the next note in the SAME voice (next index
  // in the bar; if at the end of a bar, the first note of the same voice in
  // the next bar). Mismatched pitch is allowed (renderer just draws the
  // curve); the engine is responsible for musical validity.

  const ties: any[] = [];
  for (let bi = 0; bi < bars.length; bi++) {
    for (const voice of ['upper', 'lower'] as const) {
      const arr = voice === 'upper' ? built[bi].upper : built[bi].lower;
      for (let ni = 0; ni < arr.length; ni++) {
        if (!arr[ni].source.tieToNext) continue;
        const next = ni + 1 < arr.length
          ? arr[ni + 1]
          : findFirstInNextBar(built, bi, voice);
        if (!next) continue;
        try {
          const tie = new Flow.StaveTie({
            first_note: arr[ni].staveNote,
            last_note: next.staveNote,
            first_indices: [0],
            last_indices: [0],
          });
          ties.push(tie);
        } catch {}
      }
    }
  }

  // ── Probe lead-in width for clef + key sig + time sig ────────────────────
  const probe = new Flow.Stave(0, 0, 400)
    .addClef('treble')
    .addKeySignature(keySpec)
    .addTimeSignature(timeSignature);
  probe.setContext(ctx);
  let leadWidth = probe.getNoteStartX() - probe.getX();
  if (!isFinite(leadWidth) || leadWidth < 60) leadWidth = 90;

  const totalAvailable = requestedWidth - 20;

  // ── Render bars row by row ───────────────────────────────────────────────
  rows.forEach((rowIdxs, rowIdx) => {
    const yTop = rowYTops[rowIdx];
    const noteArea = (totalAvailable - leadWidth) / rowIdxs.length;

    let xCursor = 10;
    rowIdxs.forEach((barIdx, i) => {
      const bar = bars[barIdx];
      const staveWidth = i === 0 ? noteArea + leadWidth : noteArea;
      const b = built[barIdx];

      // Treble stave.
      const stave = new Flow.Stave(xCursor, yTop, staveWidth);
      if (i === 0) {
        stave.addClef('treble').addKeySignature(keySpec).addTimeSignature(timeSignature);
      }
      applyRepeatBarlines(stave, bar);
      styleStave(stave, FG);
      stave.setContext(ctx).draw();

      // Bar number label above the stave (original measure number when the
      // staff is rendering a slice; otherwise its position in the etude).
      const label = barLabels?.[barIdx] ?? (barIdx + 1);
      try {
        ctx.save();
        ctx.setFont('Arial', 9, '');
        try { (ctx as any).setFillStyle?.(FG); } catch {}
        ctx.fillText(String(label), xCursor + (i === 0 ? leadWidth + 2 : 4), yTop - 6);
        ctx.restore();
      } catch {}

      // Tab stave.
      let tabStave: any = null;
      if (showTab) {
        tabStave = new Flow.TabStave(xCursor, yTop + trebleHeight + tabGap, staveWidth);
        tabStave.setNumLines(6);
        if (i === 0) {
          tabStave.addClef('tab');
        }
        applyRepeatBarlines(tabStave, bar);
        styleStave(tabStave, FG);
        tabStave.setContext(ctx).draw();
        tabStave.setNoteStartX(stave.getNoteStartX());
      }

      // Dim notes based on playedCount + beat position.
      const dimUpTo = playedCount;
      for (const bn of b.upper) {
        if (bn.upperIndex >= 0 && bn.upperIndex < dimUpTo) {
          styleNote(bn.staveNote, DIM);
          if (bn.tabNote) bn.tabNote.setStyle(DIM_STYLE);
        }
      }
      // Lower voice dims when the last-played upper note's beat onset has
      // passed this lower note's onset (so bass voice stays in step with
      // the melody cursor visually).
      const upperPlayedBeatLimit = findUpperPlayedBeatLimit(built, dimUpTo);
      for (const bn of b.lower) {
        if (bn.beatOnset < upperPlayedBeatLimit) {
          styleNote(bn.staveNote, DIM);
          if (bn.tabNote) bn.tabNote.setStyle(DIM_STYLE);
        }
      }

      // Format + draw notation voices.
      const voicesToFormat: any[] = [b.upperVoice];
      if (b.lowerVoice) voicesToFormat.push(b.lowerVoice);
      if (b.upperTabVoice) voicesToFormat.push(b.upperTabVoice);
      if (b.lowerTabVoice) voicesToFormat.push(b.lowerTabVoice);
      const formatter = new Flow.Formatter();
      formatter.joinVoices([b.upperVoice]);
      if (b.lowerVoice) formatter.joinVoices([b.lowerVoice]);
      if (b.upperTabVoice) formatter.joinVoices([b.upperTabVoice]);
      if (b.lowerTabVoice) formatter.joinVoices([b.lowerTabVoice]);
      try {
        formatter.format(voicesToFormat, Math.max(60, staveWidth - (i === 0 ? leadWidth : 0) - 20));
      } catch {
        // Last-ditch: format without joining if voice tick math mismatches.
      }

      // Beam eighths and shorter within each voice.
      const upperBeams = buildEtudeBeams(b.upper);
      const lowerBeams = buildEtudeBeams(b.lower);

      b.upperVoice.draw(ctx, stave);
      if (b.lowerVoice) b.lowerVoice.draw(ctx, stave);
      if (b.upperTabVoice && tabStave) b.upperTabVoice.draw(ctx, tabStave);
      if (b.lowerTabVoice && tabStave) b.lowerTabVoice.draw(ctx, tabStave);

      [...upperBeams, ...lowerBeams].forEach(beam => {
        try { beam.setStyle({ fillStyle: FG, strokeStyle: FG }); } catch {}
        beam.setContext(ctx).draw();
      });

      xCursor += staveWidth;
    });
  });

  // Draw ties last so they sit on top of the staves and pick up any cross-bar
  // routing the formatter assigned to the note positions.
  ties.forEach(tie => {
    try { tie.setStyle({ fillStyle: FG, strokeStyle: FG }); } catch {}
    tie.setContext(ctx).draw();
  });
}

// Build a single VexFlow note (StaveNote + optional TabNote) from an EtudeNote.
function buildBuiltNote(
  src: EtudeNote,
  tonic: BaseLetter,
  mode: ModeName,
  tonicOffset: 0 | 1 | -1,
  fg: string,
  showTab: boolean,
  showLh: boolean,
  showRh: boolean,
  stemDirection: 1 | -1,
): BuiltEtudeNote {
  const dur = vfDuration(src);

  let staveNote: any;
  if (src.kind === 'rest') {
    staveNote = new Flow.StaveNote({ keys: ['b/4'], duration: dur });
  } else {
    // Collect primary + chord pitches; sort ascending by midi so VexFlow draws
    // the lowest at the bottom of the stack.
    type Pitch = { midi: number; stringId?: number; fret?: number; lhFinger?: number | null };
    const allPitches: Pitch[] = [
      {
        midi: src.midi ?? 60,
        stringId: src.stringId,
        fret: src.fret,
        lhFinger: src.lhFinger ?? null,
      },
      ...(src.chord ?? []).map(p => ({
        midi: p.midi,
        stringId: p.stringId,
        fret: p.fret,
        lhFinger: p.lhFinger ?? null,
      })),
    ].sort((a, b) => a.midi - b.midi);

    const keys = allPitches.map(p => {
      const written = p.midi + 12; // sounding → written (octave up)
      return keyAwareSpelling(written, tonic, mode, tonicOffset).key;
    });

    staveNote = new Flow.StaveNote({
      keys,
      duration: dur,
      clef: 'treble',
      stem_direction: stemDirection,
    });
    if (src.dotted) {
      try { Flow.Dot.buildAndAttach([staveNote], { all: true }); } catch {}
    }
    if (showLh) {
      allPitches.forEach((p, idx) => {
        if (p.lhFinger != null && p.lhFinger >= 0) {
          const fhf = new Flow.FretHandFinger(String(p.lhFinger));
          try {
            const pos = (Flow as any).Modifier?.Position?.BELOW;
            if (pos != null) fhf.setPosition(pos);
          } catch {}
          staveNote.addModifier(fhf, idx);
        }
      });
    }
    if (showRh && src.rhFinger) {
      const ann = new Flow.Annotation(src.rhFinger);
      try {
        const top = (Flow as any).Annotation?.VerticalJustify?.TOP;
        if (top != null) ann.setVerticalJustification(top);
      } catch {}
      staveNote.addModifier(ann, 0);
    }
  }
  styleNote(staveNote, fg);

  let tabNote: any | null = null;
  if (showTab && src.kind === 'note' && src.stringId != null && src.fret != null) {
    const positions = [
      { str: src.stringId, fret: src.fret },
      ...(src.chord ?? [])
        .filter(p => p.stringId != null && p.fret != null)
        .map(p => ({ str: p.stringId as number, fret: p.fret as number })),
    ];
    tabNote = new Flow.TabNote({ positions, duration: dur });
    if (src.dotted) {
      try { Flow.Dot.buildAndAttach([tabNote], { all: true }); } catch {}
    }
    tabNote.setStyle({ fillStyle: fg, strokeStyle: fg });
  }

  return { staveNote, tabNote, upperIndex: -1, beatOnset: 0, source: src };
}

function findFirstInNextBar(built: BuiltBar[], barIdx: number, voice: 'upper' | 'lower'): BuiltEtudeNote | null {
  for (let i = barIdx + 1; i < built.length; i++) {
    const arr = voice === 'upper' ? built[i].upper : built[i].lower;
    if (arr.length) return arr[0];
  }
  return null;
}

// Walk built bars and beam runs of eighths-or-shorter notes within a single
// voice. Beams reset across the end of each run, on rests, and on duration
// boundaries (e.g. a quarter inside a run of eighths splits the beam).
function buildEtudeBeams(arr: BuiltEtudeNote[]): any[] {
  if (!arr.length) return [];
  const beamables: any[][] = [];
  let cur: any[] = [];
  const flush = () => {
    if (cur.length >= 2) beamables.push(cur);
    cur = [];
  };
  for (const b of arr) {
    const d = b.source.duration;
    const isShort = d === '8' || d === '16' || d === '32';
    if (b.source.kind === 'note' && isShort) {
      cur.push(b.staveNote);
    } else {
      flush();
    }
  }
  flush();
  const beams: any[] = [];
  for (const group of beamables) {
    try { beams.push(new Flow.Beam(group)); } catch {}
  }
  return beams;
}

// Among all built bars in piece order, return the beat onset of the
// (playedCount)-th non-rest upper note. Anything strictly before that onset
// is "already played" for lower-voice dimming.
function findUpperPlayedBeatLimit(built: BuiltBar[], playedCount: number): number {
  if (playedCount <= 0) return -1;
  let count = 0;
  for (const b of built) {
    for (const bn of b.upper) {
      if (bn.source.kind !== 'note') continue;
      count++;
      if (count >= playedCount) {
        return bn.beatOnset + noteBeats(bn.source);
      }
    }
  }
  return Number.POSITIVE_INFINITY;
}
