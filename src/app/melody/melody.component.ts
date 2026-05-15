import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { startWith } from 'rxjs/operators';
import { PitchDetectService } from '../core/audio/pitch-detect.service';
import { startMelodyDetection } from '../core/audio/melody-detection';
import { MetronomeBarComponent } from '../core/audio/metronome-bar.component';
import { MetronomeService } from '../core/audio/metronome.service';
import { AccidentalMode, BASE_LETTERS, BaseLetter, enharmonicDisplay } from '../core/theory/note';
import { MODE_LABELS, MODE_NAMES, ModeName, preferFlatsFor } from '../core/theory/modes';
import { defaultConfig, generatePhrase, normalizeBarCount, playablePool } from '../core/melody/engine';
import type { Difficulty, LimitMode, MelodyConfig, MelodyPhrase, PhraseBarCount } from '../core/melody/models';
import { PHRASE_BAR_OPTIONS } from '../core/melody/models';
import type { StringId } from '../core/quiz/models';
import { loadFromStorage, saveToStorage } from '../core/utils/storage';
import { MelodyStaffComponent } from '../notation/melody-staff.component';

const STORAGE_KEY = 'fretzone.melody.cfg.v1';

interface MelodyFormValue {
  difficulty: Difficulty;
  tonic: BaseLetter;
  mode: ModeName;
  fretStart: number;
  fretEnd: number;
  strings: boolean[];
  iterations: number;
  bars: PhraseBarCount;
  limitMode: LimitMode;
  timeMinutes: number;
  a4: number;
  centsTolerance: number;
}

@Component({
  selector: 'app-melody',
  imports: [ReactiveFormsModule, MelodyStaffComponent, MetronomeBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './melody.component.html',
})
export class MelodyComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private service = inject(PitchDetectService);
  private metronome = inject(MetronomeService);

  protected baseLetters: BaseLetter[] = [...BASE_LETTERS];
  protected modeNames: ModeName[] = [...MODE_NAMES];
  protected modeLabel = (m: ModeName) => MODE_LABELS[m];
  protected barOptions: readonly PhraseBarCount[] = PHRASE_BAR_OPTIONS;

  protected form;
  protected stringsArr: FormArray<FormControl<boolean>>;

  protected phase = signal<'setup' | 'running' | 'done'>('setup');
  protected cfg = signal<MelodyConfig | null>(null);

  protected idx = signal(0);
  protected score = signal(0);
  protected phrase = signal<MelodyPhrase | null>(null);
  protected playedCount = signal(0);
  protected heard = signal('--');
  protected status = signal('Waiting...');
  protected micStarted = signal(false);
  protected endedByTimer = signal(false);
  protected limitModeSig = signal<LimitMode>('iterations');

  // Wider staff when bars-per-row goes up so each bar still has room.
  // 8-bar phrases wrap at 4 bars/row, so they share the 4-bar width.
  protected staffWidth = computed(() => {
    const n = this.cfg()?.bars ?? 2;
    return n === 2 ? 720 : 960;
  });

  protected poolCount;
  // Accidental hint for the plain-text "Heard" readout only — staff
  // rendering uses key-aware spelling and does not consume this.
  protected heardAcc = computed<AccidentalMode>(() => {
    const c = this.cfg();
    if (!c) return 'Naturals';
    return preferFlatsFor(c.tonic, c.mode) ? 'FlatsPlusNaturals' : 'SharpsPlusNaturals';
  });

  private det: { start: () => Promise<void>; stop: () => void } | null = null;
  private sessionTimeoutId: any = null;

  constructor() {
    const initial = { ...defaultConfig(), ...loadFromStorage<Partial<MelodyConfig>>(STORAGE_KEY, {}) };

    this.stringsArr = this.fb.array(
      [1, 2, 3, 4, 5, 6].map(s =>
        this.fb.nonNullable.control((initial.strings as number[]).includes(s)),
      ),
    );

    this.form = this.fb.group({
      difficulty: this.fb.nonNullable.control<Difficulty>(initial.difficulty),
      tonic: this.fb.nonNullable.control<BaseLetter>(initial.tonic),
      mode: this.fb.nonNullable.control<ModeName>(initial.mode),
      fretStart: this.fb.nonNullable.control(initial.fretStart),
      fretEnd: this.fb.nonNullable.control(initial.fretEnd),
      strings: this.stringsArr,
      iterations: this.fb.nonNullable.control(initial.iterations),
      bars: this.fb.nonNullable.control<PhraseBarCount>(normalizeBarCount(initial.bars)),
      limitMode: this.fb.nonNullable.control<LimitMode>(initial.limitMode),
      timeMinutes: this.fb.nonNullable.control(initial.timeMinutes),
      a4: this.fb.nonNullable.control(initial.a4),
      centsTolerance: this.fb.nonNullable.control(initial.centsTolerance),
    });

    this.limitModeSig.set(this.form.controls.limitMode.value);
    this.form.controls.limitMode.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(v => this.limitModeSig.set(v));

    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => saveToStorage(STORAGE_KEY, this.formToConfig()));

    const valueSig = toSignal(
      this.form.valueChanges.pipe(startWith(this.form.value)),
      { initialValue: this.form.value },
    );
    this.poolCount = computed(() => {
      void valueSig();
      try { return playablePool(this.formToConfig()).midis.length; } catch { return 0; }
    });
  }

  ngOnDestroy(): void {
    this.cleanupRun();
  }

  protected stringLabel(s: number): string {
    if (s === 6) return 'High E (6)';
    if (s === 1) return 'Low E (1)';
    return `String ${s}`;
  }

  protected start() {
    const c = this.formToConfig();
    saveToStorage(STORAGE_KEY, c);
    this.cfg.set(c);
    this.idx.set(0);
    this.score.set(0);
    this.heard.set('--');
    this.playedCount.set(0);
    this.micStarted.set(false);
    this.endedByTimer.set(false);
    try {
      this.phrase.set(generatePhrase(c));
    } catch (e: any) {
      this.status.set(e?.message ?? 'Cannot generate phrase.');
      return;
    }
    this.idx.set(1);
    this.status.set('Press Start Mic, then play the first note.');
    this.metronome.resetForNewSession();
    this.phase.set('running');
  }

  protected async startMic() {
    if (this.micStarted()) return;
    this.status.set('Starting mic...');
    try {
      await this.service.startLive();
      this.micStarted.set(true);
      this.spinUpDetection();
      this.status.set('Listening... Play the first note.');
      const c = this.cfg();
      if (c?.limitMode === 'time' && this.sessionTimeoutId == null) {
        this.sessionTimeoutId = setTimeout(
          () => this.finishByTimer(),
          c.timeMinutes * 60 * 1000,
        );
      }
    } catch {
      this.micStarted.set(false);
      this.status.set('Mic failed. Use HTTPS/localhost and allow permission.');
    }
  }

  protected stopAndReset() {
    this.cleanupRun();
    this.phase.set('setup');
  }

  protected reset() {
    this.cleanupRun();
    this.phase.set('setup');
  }

  private spinUpDetection() {
    const c = this.cfg();
    const ph = this.phrase();
    if (!c || !ph) return;
    this.tearDownDetection();
    this.det = startMelodyDetection(
      this.service,
      { midis: ph.noteMidis, a4: c.a4, centsTolerance: c.centsTolerance },
      {
        onHeard: hz => {
          const m = Math.round(69 + 12 * Math.log2(hz / c.a4));
          this.heard.set(`${hz.toFixed(1)} Hz (${enharmonicDisplay(m, this.heardAcc())})`);
        },
        onNoteAccepted: i => {
          this.playedCount.set(i + 1);
          this.status.set('Good!');
        },
        onComplete: () => {
          this.score.update(v => v + 1);
          const c2 = this.cfg();
          if (!c2) return;
          if (c2.limitMode === 'iterations' && this.idx() >= c2.iterations) {
            this.status.set('Done!');
            this.cleanupRun();
            this.phase.set('done');
            return;
          }
          this.advance();
        },
      },
    );
    this.det.start().catch(() => { /* mic already running, ignore */ });
  }

  private advance() {
    const c = this.cfg();
    if (!c) return;
    this.tearDownDetection();
    try {
      this.phrase.set(generatePhrase(c));
    } catch (e: any) {
      this.status.set(e?.message ?? 'Cannot generate phrase.');
      return;
    }
    this.playedCount.set(0);
    this.idx.update(v => v + 1);
    this.status.set('Next phrase. Play the first note.');
    setTimeout(() => this.spinUpDetection(), 0);
  }

  private tearDownDetection() {
    if (this.det) {
      try { this.det.stop(); } catch {}
      this.det = null;
    }
  }

  private finishByTimer() {
    if (this.phase() !== 'running') return;
    this.endedByTimer.set(true);
    this.cleanupRun();
    this.phase.set('done');
  }

  private cleanupRun() {
    this.tearDownDetection();
    this.service.stop();
    if (this.sessionTimeoutId != null) {
      clearTimeout(this.sessionTimeoutId);
      this.sessionTimeoutId = null;
    }
    this.micStarted.set(false);
    this.metronome.stop();
  }

  private formToConfig(): MelodyConfig {
    const v = this.form.getRawValue() as MelodyFormValue;
    const stringIds = ([1, 2, 3, 4, 5, 6] as StringId[]).filter((_, i) => v.strings[i]);
    return {
      difficulty: v.difficulty,
      tonic: v.tonic,
      mode: v.mode,
      fretStart: Math.min(20, Math.max(1, v.fretStart || 1)),
      fretEnd: Math.min(20, Math.max(1, v.fretEnd || 7)),
      strings: stringIds.length ? stringIds : [1, 2, 3, 4, 5, 6],
      iterations: Math.max(1, v.iterations || 5),
      bars: normalizeBarCount(v.bars),
      limitMode: v.limitMode === 'time' ? 'time' : 'iterations',
      timeMinutes: Math.min(60, Math.max(1, v.timeMinutes || 3)),
      a4: v.a4 || 440,
      centsTolerance: Math.min(50, Math.max(5, v.centsTolerance || 25)),
    };
  }
}
