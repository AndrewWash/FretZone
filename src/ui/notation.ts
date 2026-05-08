import { Flow } from 'vexflow';
import { spellMidi, AccidentalMode } from '../theory/note';

export interface NotationOptions {
  width?: number;
  height?: number;
  accidentalMode?: AccidentalMode;
}

// Render a single note on treble clef, using standard guitar notation (written pitch one octave above sounding)
export function renderTrebleNote(container: HTMLElement, midiSounding: number, opts: NotationOptions = {}) {
  const width = opts.width ?? 320;
  const height = opts.height ?? 140;
  const mode: AccidentalMode = opts.accidentalMode ?? 'Naturals';
  container.innerHTML = '';

  const renderer = new Flow.Renderer(container, Flow.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  context.setFont('Arial', 10, '').setBackgroundFillStyle('#111827');

  const stave = new Flow.Stave(10, 20, width - 20);
  stave.addClef('treble');
  stave.setContext(context).draw();

  // Convert sounding midi to written (guitar written an octave higher)
  const writtenMidi = midiSounding + 12;
  const spelled = spellMidi(writtenMidi, mode);
  const keys = [spelled.key];

  const note = new Flow.StaveNote({ keys, duration: 'q', clef: 'treble' });
  // Add accidental if needed (supports sharps and flats)
  if (spelled.accidental) {
    note.addModifier(new Flow.Accidental(spelled.accidental), 0);
  }

  const voice = new Flow.Voice({ num_beats: 1, beat_value: 4 });
  voice.addTickables([note]);

  new Flow.Formatter().joinVoices([voice]).format([voice], width - 60);
  voice.draw(context, stave);
}
