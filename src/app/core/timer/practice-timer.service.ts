import { Injectable, computed, effect, signal } from '@angular/core';
import { loadFromStorage, saveToStorage } from '../utils/storage';

export type TimerMode = 'countdown' | 'stopwatch';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'overtime' | 'finished';

const STORAGE_KEY = 'fretzone.practiceTimer.v1';
const DEFAULT_MINUTES = 20;
const MIN_MINUTES = 1;
const MAX_MINUTES = 240;

interface PersistedTimer {
  visible: boolean;
  mode: TimerMode;
  minutes: number;
  status: TimerStatus;
  anchorEpochMs: number | null;
  baseElapsedSec: number;
}

export function formatMmSs(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

@Injectable({ providedIn: 'root' })
export class PracticeTimerService {
  readonly visible = signal(false);
  readonly mode = signal<TimerMode>('countdown');
  readonly minutes = signal(DEFAULT_MINUTES);
  readonly status = signal<TimerStatus>('idle');

  private readonly anchorEpochMs = signal<number | null>(null);
  private readonly baseElapsedSec = signal(0);
  private readonly nowMs = signal(Date.now());

  readonly runActive = signal(0);

  private tickId: ReturnType<typeof setInterval> | null = null;

  readonly elapsedSec = computed(() => {
    const s = this.status();
    if ((s === 'running' || s === 'overtime') && this.anchorEpochMs() != null) {
      const live = Math.floor((this.nowMs() - this.anchorEpochMs()!) / 1000);
      return this.baseElapsedSec() + Math.max(0, live);
    }
    return this.baseElapsedSec();
  });

  readonly targetSec = computed(() => this.minutes() * 60);
  readonly remainingSec = computed(() => Math.max(0, this.targetSec() - this.elapsedSec()));
  readonly displaySec = computed(() =>
    this.mode() === 'countdown' ? this.remainingSec() : this.elapsedSec(),
  );
  readonly displayLabel = computed(() => formatMmSs(this.displaySec()));
  readonly isFinished = computed(() => this.status() === 'finished');
  readonly isOvertime = computed(() => this.status() === 'overtime');

  constructor() {
    this.restore();

    effect(() => {
      const payload: PersistedTimer = {
        visible: this.visible(),
        mode: this.mode(),
        minutes: this.minutes(),
        status: this.status(),
        anchorEpochMs: this.anchorEpochMs(),
        baseElapsedSec:
          this.status() === 'running' || this.status() === 'overtime'
            ? this.baseElapsedSec()
            : this.elapsedSec(),
      };
      saveToStorage(STORAGE_KEY, payload);
    });
  }

  start(): void {
    this.baseElapsedSec.set(0);
    this.nowMs.set(Date.now());
    this.anchorEpochMs.set(Date.now());
    this.status.set('running');
    this.arm();
  }

  pause(): void {
    if (this.status() !== 'running' && this.status() !== 'overtime') return;
    this.baseElapsedSec.set(this.elapsedSec());
    this.anchorEpochMs.set(null);
    this.status.set('paused');
    this.disarm();
  }

  resume(): void {
    if (this.status() !== 'paused') return;
    this.nowMs.set(Date.now());
    this.anchorEpochMs.set(Date.now());
    this.status.set('running');
    this.arm();
  }

  reset(): void {
    this.disarm();
    this.baseElapsedSec.set(0);
    this.anchorEpochMs.set(null);
    this.status.set('idle');
  }

  toggleVisible(): void {
    this.visible.update(v => !v);
  }

  setVisible(v: boolean): void {
    this.visible.set(v);
  }

  setMode(mode: TimerMode): void {
    this.mode.set(mode);
    this.reset();
  }

  setMinutes(n: number): void {
    if (!Number.isFinite(n)) return;
    this.minutes.set(Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.floor(n))));
  }

  markRunStart(): void {
    this.runActive.update(n => n + 1);
  }

  markRunEnd(): void {
    this.runActive.update(n => Math.max(0, n - 1));
    if (this.runActive() === 0 && this.status() === 'overtime') {
      this.finishNow();
    }
  }

  private handleElapsed(): void {
    if (this.runActive() > 0) {
      this.status.set('overtime');
    } else {
      this.finishNow();
    }
  }

  private finishNow(): void {
    this.baseElapsedSec.set(this.elapsedSec());
    this.anchorEpochMs.set(null);
    this.status.set('finished');
    this.disarm();
  }

  private tick(): void {
    this.nowMs.set(Date.now());
    if (
      this.mode() === 'countdown' &&
      this.status() === 'running' &&
      this.remainingSec() === 0
    ) {
      this.handleElapsed();
    }
  }

  private arm(): void {
    if (this.tickId != null) return;
    this.tickId = setInterval(() => this.tick(), 1000);
  }

  private disarm(): void {
    if (this.tickId != null) {
      clearInterval(this.tickId);
      this.tickId = null;
    }
  }

  private restore(): void {
    const stored = loadFromStorage<Partial<PersistedTimer>>(STORAGE_KEY, {});

    if (typeof stored.visible === 'boolean') this.visible.set(stored.visible);
    if (stored.mode === 'countdown' || stored.mode === 'stopwatch') this.mode.set(stored.mode);
    if (typeof stored.minutes === 'number') this.setMinutes(stored.minutes);

    const base = typeof stored.baseElapsedSec === 'number' ? stored.baseElapsedSec : 0;

    if (stored.status === 'running' || stored.status === 'overtime') {
      if (typeof stored.anchorEpochMs === 'number') {
        this.baseElapsedSec.set(base);
        this.nowMs.set(Date.now());
        this.anchorEpochMs.set(stored.anchorEpochMs);
        this.status.set('running');
        this.arm();
      }
    } else if (stored.status === 'paused') {
      this.baseElapsedSec.set(base);
      this.anchorEpochMs.set(null);
      this.status.set('paused');
    }
  }
}
