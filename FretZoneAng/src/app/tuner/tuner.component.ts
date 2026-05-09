import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PitchDetectService, Unsubscribe } from '../core/audio/pitch-detect.service';
import { midiToFreq, midiToNoteName } from '../core/theory/note';
import { loadFromStorage, saveToStorage } from '../core/utils/storage';

const STORAGE_KEY = 'fretzone.tuner.a4.v1';

@Component({
  selector: 'app-tuner',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-md">
      <h3 class="text-lg font-semibold">Tuner</h3>
      <div class="flex flex-wrap gap-3 items-center mt-3">
        <button (click)="onStart()" [disabled]="running()">Start Mic</button>
        <button class="secondary" (click)="onStop()" [disabled]="!running()">Stop</button>
        <label>A4 (Hz)
          <input type="number" min="400" max="480" step="0.1" [formControl]="a4Ctrl" />
        </label>
      </div>

      @if (error(); as err) {
        <p class="text-red-400 mt-3">{{ err }}</p>
      }

      <div class="grid gap-3 grid-cols-1 sm:grid-cols-3 mt-4">
        <div>
          <span class="inline-block px-2.5 py-1.5 border border-slate-800 rounded-full text-xs">Frequency</span>
          <div class="text-3xl font-bold mt-1">{{ hzText() }}</div>
        </div>
        <div>
          <span class="inline-block px-2.5 py-1.5 border border-slate-800 rounded-full text-xs">Note</span>
          <div class="text-3xl font-bold mt-1">{{ noteText() }}</div>
        </div>
        <div>
          <span class="inline-block px-2.5 py-1.5 border border-slate-800 rounded-full text-xs">Cents</span>
          <div class="text-3xl font-bold mt-1">{{ centsText() }}</div>
        </div>
      </div>

      <div class="mt-4">
        <span class="inline-block px-2.5 py-1.5 border border-slate-800 rounded-full text-xs">Tip</span>
        <p class="mt-2 text-slate-400">Use the tuner to calibrate your instrument; changes to A4 are used by the Fretboard Quiz too.</p>
      </div>
    </div>
  `,
})
export class TunerComponent implements OnDestroy {
  private service = inject(PitchDetectService);

  protected a4Ctrl = new FormControl<number>(
    loadFromStorage<number>(STORAGE_KEY, 440),
    { nonNullable: true },
  );

  protected running = signal(false);
  protected hz = signal<number | null>(null);
  protected note = signal<string>('--');
  protected cents = signal<number | null>(null);
  protected error = signal<string | null>(null);

  protected hzText = () => {
    const v = this.hz();
    return v == null ? '--' : `${v.toFixed(1)} Hz`;
  };
  protected noteText = () => this.note();
  protected centsText = () => {
    const c = this.cents();
    if (c == null) return '--';
    return (c > 0 ? '+' : '') + c.toFixed(1);
  };

  private unsub: Unsubscribe | null = null;

  constructor() {
    this.a4Ctrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(v => saveToStorage(STORAGE_KEY, v ?? 440));
  }

  async onStart() {
    this.error.set(null);
    try {
      await this.service.startLive();
      this.unsub?.();
      this.unsub = this.service.subscribe(({ hz }) => this.update(hz));
      this.running.set(true);
    } catch {
      this.error.set('Unable to start microphone. Ensure HTTPS or localhost and allow mic access.');
      this.running.set(false);
    }
  }

  onStop() {
    this.unsub?.();
    this.unsub = null;
    this.service.stop();
    this.running.set(false);
    this.hz.set(null);
    this.note.set('--');
    this.cents.set(null);
  }

  ngOnDestroy(): void {
    this.onStop();
  }

  private update(hz: number) {
    const a4 = this.a4Ctrl.value || 440;
    this.hz.set(hz);
    const midi = Math.round(69 + 12 * Math.log2(hz / a4));
    const { name, octave } = midiToNoteName(midi);
    this.note.set(`${name}${octave}`);
    const ref = midiToFreq(midi, a4);
    this.cents.set(1200 * Math.log2(hz / ref));
  }
}
