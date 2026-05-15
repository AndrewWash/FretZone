import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PitchDetectService, Unsubscribe } from '../core/audio/pitch-detect.service';
import { midiToFreq, midiToNoteName } from '../core/theory/note';
import { loadFromStorage, saveToStorage } from '../core/utils/storage';

const STORAGE_KEY = 'fretzone.tuner.a4.v1';
const IN_TUNE_CENTS = 5;
const METER_RANGE = 50;

@Component({
  selector: 'app-tuner',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tuner.component.html',
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

  protected hzText = computed(() => {
    const v = this.hz();
    return v == null ? '—' : `${v.toFixed(1)} Hz`;
  });

  protected centsText = computed(() => {
    const c = this.cents();
    if (c == null) return '—';
    return (c > 0 ? '+' : '') + c.toFixed(1);
  });

  protected hasReading = computed(() => this.hz() != null && this.cents() != null);

  protected inTune = computed(() => {
    const c = this.cents();
    return c != null && Math.abs(c) < IN_TUNE_CENTS;
  });

  protected meterOffsetPct = computed(() => {
    const c = this.cents();
    if (c == null) return 50;
    const clamped = Math.max(-METER_RANGE, Math.min(METER_RANGE, c));
    return 50 + (clamped / METER_RANGE) * 50;
  });

  protected statusBadge = computed(() => {
    if (!this.running()) return 'Idle';
    if (!this.hasReading()) return 'Listening…';
    if (this.inTune()) return 'In tune';
    const c = this.cents() ?? 0;
    return c > 0 ? 'Sharp' : 'Flat';
  });

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
    this.note.set('—');
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
