import { Flow } from 'vexflow';
import { midiToNoteName } from '../theory/note';

export interface NotationOptions {
  width?: number;
  height?: number;
}

// Render a single note on treble clef, using standard guitar notation (written pitch one octave above sounding)
export function renderTrebleNote(container: HTMLElement, midiSounding: number, opts: NotationOptions = {}) {
  const width = opts.width ?? 320;
  const height = opts.height ?? 140;
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
  const { name, octave } = midiToNoteName(writtenMidi);
  // Build VexFlow key string. Use 'b' for flats and '#' for sharps.
  const vfName = name.toLowerCase();
  const keys = [`${vfName}/${octave}`];

  const note = new Flow.StaveNote({ keys, duration: 'q', clef: 'treble' });
  // Add accidental if needed (supports sharps and flats)
  if (name.includes('#')) {
    note.addModifier(new Flow.Accidental('#'), 0);
  } else if (name.includes('b')) {
    note.addModifier(new Flow.Accidental('b'), 0);
  }

  const voice = new Flow.Voice({ num_beats: 1, beat_value: 4 });
  voice.addTickables([note]);

  new Flow.Formatter().joinVoices([voice]).format([voice], width - 60);
  voice.draw(context, stave);
}
