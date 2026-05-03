import { MicService } from '../audio/mic';
import { stablePitchStream } from '../audio/pitch';
import { midiToFreq, midiToNoteName } from '../theory/note';

const STORAGE_KEY = 'fretzone.tuner.a4.v1';

function loadA4(): number { try { const v = Number(localStorage.getItem(STORAGE_KEY)); return v || 440; } catch { return 440; } }
function saveA4(v: number) { try { localStorage.setItem(STORAGE_KEY, String(v)); } catch {} }

export function renderTuner(host: HTMLElement) {
  const a4 = loadA4();
  host.innerHTML = `
    <div class="card">
      <h3>Tuner</h3>
      <div class="row">
        <button id="start">Start Mic</button>
        <button class="secondary" id="stop">Stop</button>
        <label>A4 <input id="a4" type="number" min="400" max="480" step="0.1" value="${a4}"></label>
      </div>
      <div class="grid cols-3 mt-3">
        <div>
          <div class="pill">Frequency</div>
          <div id="hz" style="font-size:36px; font-weight:700">--</div>
        </div>
        <div>
          <div class="pill">Note</div>
          <div id="note" style="font-size:36px; font-weight:700">--</div>
        </div>
        <div>
          <div class="pill">Cents</div>
          <div id="cents" style="font-size:36px; font-weight:700">--</div>
        </div>
      </div>
      <div class="mt-3">
        <div class="pill">Tip</div>
        <p>Use the tuner to calibrate your instrument; changes to A4 are used by the Fretboard Quiz too.</p>
      </div>
    </div>
  `;

  const mic = new MicService();
  let cancel: (()=>void) | null = null;

  const elHz = host.querySelector('#hz') as HTMLElement;
  const elNote = host.querySelector('#note') as HTMLElement;
  const elCents = host.querySelector('#cents') as HTMLElement;

  function updatePitch(hz: number|null) {
    const a4 = Number((host.querySelector('#a4') as HTMLInputElement).value) || 440;
    if (!hz) { elHz.textContent = '--'; elNote.textContent = '--'; elCents.textContent = '--'; return; }
    elHz.textContent = hz.toFixed(1) + ' Hz';
    const midi = Math.round(69 + 12 * Math.log2(hz / a4));
    const { name, octave } = midiToNoteName(midi);
    elNote.textContent = `${name}${octave}`;
    const ref = midiToFreq(midi, a4);
    const cents = 1200 * Math.log2(hz / ref);
    elCents.textContent = (cents>0?'+':'') + cents.toFixed(1);
  }

  (host.querySelector('#start') as HTMLButtonElement).onclick = async () => {
    await mic.start();
    cancel = stablePitchStream(mic.getAnalyser()!, updatePitch);
  };
  (host.querySelector('#stop') as HTMLButtonElement).onclick = () => { cancel?.(); mic.stop(); };
  (host.querySelector('#a4') as HTMLInputElement).addEventListener('input', () => {
    const v = Number((host.querySelector('#a4') as HTMLInputElement).value) || 440; saveA4(v);
  });
}
