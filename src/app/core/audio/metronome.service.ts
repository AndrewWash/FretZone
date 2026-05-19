import { Injectable, effect, signal } from '@angular/core';
import { loadFromStorage, saveToStorage } from '../utils/storage';

export type TimeSig = '2/4' | '3/4';

interface PersistedState {
  bpm: number;
  volume: number;
  timeSig: TimeSig;
}

const STORAGE_KEY = 'fretzone.metronome.v1';

const MIN_BPM = 40;
const MAX_BPM = 240;
const DEFAULT_BPM = 60;
const DEFAULT_VOLUME = 0.5;
const DEFAULT_TIMESIG: TimeSig = '2/4';

const SCHEDULER_INTERVAL_MS = 25;
const LOOKAHEAD_SEC = 0.1;

const DOWNBEAT_FREQ = 400;
const UPBEAT_FREQ = 600;
const FILTER_HZ = 1200;
const ATTACK_SEC = 0.002;
const DECAY_SEC = 0.08;
const UPBEAT_GAIN_RATIO = 0.7;

// 2/4: alternating. 3/4: down-down-up per the user spec (intentional, not waltz).
const PATTERNS: Record<TimeSig, Array<'down' | 'up'>> = {
  '2/4': ['down', 'up'],
  '3/4': ['down', 'down', 'up'],
};

@Injectable({ providedIn: 'root' })
export class MetronomeService {
  readonly enabled = signal(false);
  readonly bpm = signal(DEFAULT_BPM);
  readonly volume = signal(DEFAULT_VOLUME);
  readonly timeSig = signal<TimeSig>(DEFAULT_TIMESIG);
  readonly beatIdx = signal(0);

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private schedulerId: ReturnType<typeof setInterval> | null = null;
  private nextBeatTime = 0;
  private beatCounter = 0;

  private customDownbeat: AudioBuffer | null = null;
  private customUpbeat: AudioBuffer | null = null;

  constructor() {
    const stored = loadFromStorage<Partial<PersistedState>>(STORAGE_KEY, {});
    if (typeof stored.bpm === 'number') this.bpm.set(this.clampBpm(stored.bpm));
    if (typeof stored.volume === 'number') this.volume.set(this.clampVolume(stored.volume));
    if (stored.timeSig === '2/4' || stored.timeSig === '3/4') this.timeSig.set(stored.timeSig);

    effect(() => {
      const payload: PersistedState = {
        bpm: this.bpm(),
        volume: this.volume(),
        timeSig: this.timeSig(),
      };
      saveToStorage(STORAGE_KEY, payload);
    });

    effect(() => {
      const v = this.volume();
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(v, this.ctx?.currentTime ?? 0, 0.01);
      }
    });
  }

  setBpm(n: number): void {
    this.bpm.set(this.clampBpm(n));
  }

  setVolume(v: number): void {
    this.volume.set(this.clampVolume(v));
  }

  setTimeSig(s: TimeSig): void {
    if (s !== this.timeSig()) {
      this.timeSig.set(s);
      this.beatCounter = 0;
      this.beatIdx.set(0);
    }
  }

  setEnabled(on: boolean): void {
    if (on === this.enabled()) return;
    this.enabled.set(on);
    if (on) this.start();
    else this.stop();
  }

  toggle(): void {
    this.setEnabled(!this.enabled());
  }

  start(): void {
    if (this.schedulerId != null) return;
    this.ensureContext();
    const ctx = this.ctx!;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => { /* ignore — user gesture not yet given */ });
    }
    this.beatCounter = 0;
    this.beatIdx.set(0);
    this.nextBeatTime = ctx.currentTime + 0.05;
    this.schedulerId = setInterval(() => this.scheduleAhead(), SCHEDULER_INTERVAL_MS);
  }

  stop(): void {
    if (this.schedulerId != null) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    this.beatCounter = 0;
    this.beatIdx.set(0);
  }

  // Called by mode components on phase 'setup' -> 'running' transition so the
  // toggle begins off for every new run, while bpm/volume/timeSig persist.
  resetForNewSession(): void {
    if (this.enabled()) this.enabled.set(false);
    this.stop();
  }

  // Future-ready hooks. When a custom buffer is set, the scheduler plays it
  // in place of the synth click. No UI yet — wired so the upload feature can
  // ship without touching the engine.
  setCustomDownbeat(buffer: AudioBuffer | null): void {
    this.customDownbeat = buffer;
  }

  setCustomUpbeat(buffer: AudioBuffer | null): void {
    this.customUpbeat = buffer;
  }

  private ensureContext(): void {
    if (this.ctx) return;
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor() as AudioContext;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume();
    this.masterGain.connect(this.ctx.destination);
  }

  private scheduleAhead(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const secPerBeat = 60 / this.bpm();

    // If the main thread was blocked long enough that beat times slipped into
    // the past (e.g. a heavy note-detection render froze the setInterval
    // scheduler), fast-forward past the fully-missed beats. This plays a
    // single catch-up click instead of a burst, and keeps beatCounter aligned
    // to the bar so downbeats stay on the original grid.
    if (this.nextBeatTime < ctx.currentTime) {
      const skip = Math.floor((ctx.currentTime - this.nextBeatTime) / secPerBeat);
      if (skip > 0) {
        this.beatCounter += skip;
        this.nextBeatTime += skip * secPerBeat;
      }
    }

    while (this.nextBeatTime < ctx.currentTime + LOOKAHEAD_SEC) {
      const pattern = PATTERNS[this.timeSig()];
      const idxInBar = this.beatCounter % pattern.length;
      const kind = pattern[idxInBar];
      this.scheduleClick(kind, this.nextBeatTime, idxInBar);
      this.nextBeatTime += secPerBeat;
      this.beatCounter += 1;
    }
  }

  private scheduleClick(kind: 'down' | 'up', when: number, idxInBar: number): void {
    const ctx = this.ctx;
    const out = this.masterGain;
    if (!ctx || !out) return;

    // Guard against a `when` that has slipped into the past (main-thread jank).
    // An envelope scheduled entirely in the past has already elapsed, so the
    // click would play silently — clamp to "now" so it stays audible.
    const startAt = Math.max(when, ctx.currentTime);

    const buffer = kind === 'down' ? this.customDownbeat : this.customUpbeat;
    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const g = ctx.createGain();
      g.gain.value = kind === 'down' ? 1 : UPBEAT_GAIN_RATIO;
      src.connect(g).connect(out);
      src.start(startAt);
    } else {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = kind === 'down' ? DOWNBEAT_FREQ : UPBEAT_FREQ;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = FILTER_HZ;

      const env = ctx.createGain();
      const peak = kind === 'down' ? 1 : UPBEAT_GAIN_RATIO;
      env.gain.setValueAtTime(0.0001, startAt);
      env.gain.exponentialRampToValueAtTime(peak, startAt + ATTACK_SEC);
      env.gain.exponentialRampToValueAtTime(0.0001, startAt + ATTACK_SEC + DECAY_SEC);

      osc.connect(filter).connect(env).connect(out);
      osc.start(startAt);
      osc.stop(startAt + ATTACK_SEC + DECAY_SEC + 0.02);
    }

    const delayMs = Math.max(0, (startAt - ctx.currentTime) * 1000);
    setTimeout(() => {
      this.beatIdx.set(idxInBar);
    }, delayMs);
  }

  private clampBpm(n: number): number {
    if (!isFinite(n)) return DEFAULT_BPM;
    return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(n)));
  }

  private clampVolume(v: number): number {
    if (!isFinite(v)) return DEFAULT_VOLUME;
    return Math.max(0, Math.min(1, v));
  }
}
