import { Flow } from 'vexflow';
import { spellMidi, AccidentalMode, BaseLetter } from '../core/theory/note';
import { keyAwareSpelling, keySignatureSpec, tonicPc, ModeName } from '../core/theory/modes';
import type { MelodyTickable } from '../core/melody/models';

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
    .addTimeSignature('4/4');
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
        stave.addClef('treble').addKeySignature(keySpec).addTimeSignature('4/4');
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
    return new Flow.StaveNote({ keys: ['b/4'], duration: t.duration === 'q' ? 'qr' : '8r' });
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

  const topPad = 30;
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
    const staveNotes = rowNotes.map(n => {
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
