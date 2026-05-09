import { Flow } from 'vexflow';
import { spellMidi, AccidentalMode } from '../core/theory/note';

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
