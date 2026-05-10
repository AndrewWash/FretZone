import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { startWith } from 'rxjs/operators';
import { PitchDetectService, Unsubscribe } from '../core/audio/pitch-detect.service';
import { AccidentalMode, BASE_LETTERS, BaseLetter, enharmonicDisplay } from '../core/theory/note';
import { allCandidates, defaultConfig, freqMatchesPrompt, randomPrompt } from '../core/quiz/engine';
import type { Prompt, QuizConfig, StringId } from '../core/quiz/models';
import { loadFromStorage, saveToStorage } from '../core/utils/storage';
import { TrebleNoteComponent } from '../notation/treble-note.component';

const STORAGE_KEY = 'fretzone.quiz.cfg.v1';
const HOLD_COMMIT_MS = 500;
const STABILITY_CENTS = 35;
const POST_PROMPT_IGNORE_MS = 400;
const ADVANCE_DELAY_MS = 700;

interface QuizFormValue {
  fretStart: number;
  fretEnd: number;
  strings: boolean[];
  notes: boolean[];
  accidentalMode: AccidentalMode;
  sightReading: boolean;
  iterations: number;
  timeLimitSec: number;
  a4: number;
  centsTolerance: number;
}

@Component({
  selector: 'app-quiz',
  imports: [ReactiveFormsModule, TrebleNoteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quiz.component.html',
})
export class QuizComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private service = inject(PitchDetectService);

  protected baseLetters: BaseLetter[] = [...BASE_LETTERS];

  protected form;
  protected stringsArr: FormArray<FormControl<boolean>>;
  protected notesArr: FormArray<FormControl<boolean>>;

  protected phase = signal<'setup' | 'running' | 'done'>('setup');
  protected cfg = signal<QuizConfig | null>(null);

  protected idx = signal(0);
  protected score = signal(0);
  protected current = signal<Prompt | null>(null);
  protected remaining = signal(0);
  protected heard = signal('--');
  protected status = signal('Waiting...');
  protected noteFilter = signal('');
  protected micStarted = signal(false);

  protected poolCount;

  private unsub: Unsubscribe | null = null;
  private timerId: any = null;
  private advanceTimeoutId: any = null;
  private holdStartAt: number | null = null;
  private holdRefHz: number | null = null;
  private promptChangedAt = 0;
  private committedThisPrompt = false;
  private pendingAdvance = false;

  constructor() {
    const initial = { ...defaultConfig(), ...loadFromStorage<Partial<QuizConfig>>(STORAGE_KEY, {}) };

    this.stringsArr = this.fb.array(
      [1, 2, 3, 4, 5, 6].map(s =>
        this.fb.nonNullable.control((initial.strings as number[]).includes(s)),
      ),
    );
    this.notesArr = this.fb.array(
      this.baseLetters.map(L =>
        this.fb.nonNullable.control((initial.notes as BaseLetter[]).includes(L)),
      ),
    );

    this.form = this.fb.group({
      fretStart: this.fb.nonNullable.control(initial.fretStart),
      fretEnd: this.fb.nonNullable.control(initial.fretEnd),
      strings: this.stringsArr,
      notes: this.notesArr,
      accidentalMode: this.fb.nonNullable.control<AccidentalMode>(initial.accidentalMode),
      sightReading: this.fb.nonNullable.control(initial.sightReading),
      iterations: this.fb.nonNullable.control(initial.iterations),
      timeLimitSec: this.fb.nonNullable.control(initial.timeLimitSec),
      a4: this.fb.nonNullable.control(initial.a4),
      centsTolerance: this.fb.nonNullable.control(initial.centsTolerance),
    });

    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => saveToStorage(STORAGE_KEY, this.formToConfig()));

    const valueSig = toSignal(
      this.form.valueChanges.pipe(startWith(this.form.value)),
      { initialValue: this.form.value },
    );
    this.poolCount = computed(() => {
      void valueSig();
      try { return allCandidates(this.formToConfig()).length; } catch { return 0; }
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

  protected startQuiz() {
    const c = this.formToConfig();
    saveToStorage(STORAGE_KEY, c);
    this.cfg.set(c);
    this.idx.set(0);
    this.score.set(0);
    this.heard.set('--');
    this.status.set('Play the note');
    this.noteFilter.set('');
    this.micStarted.set(false);
    this.phase.set('running');
    this.timerId = setInterval(() => this.tickTimer(), 1000);
    this.nextPrompt();
  }

  protected async startMic() {
    if (this.micStarted()) return;
    this.micStarted.set(true);
    this.status.set('Starting mic...');
    try {
      await this.service.startLive();
      this.unsub?.();
      this.unsub = this.service.subscribe(({ hz }) => this.onHz(hz));
      this.status.set('Play the note');
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

  private nextPrompt() {
    const c = this.cfg();
    if (!c) return;
    if (this.idx() >= c.iterations) {
      this.finish();
      return;
    }
    const p = randomPrompt(c);
    this.current.set(p);
    this.idx.update(v => v + 1);
    this.remaining.set(c.timeLimitSec);
    this.status.set('Play the note');
    this.noteFilter.set('');
    this.holdStartAt = null;
    this.holdRefHz = null;
    this.promptChangedAt = Date.now();
    this.committedThisPrompt = false;
    this.pendingAdvance = false;
    if (this.advanceTimeoutId) {
      clearTimeout(this.advanceTimeoutId);
      this.advanceTimeoutId = null;
    }
  }

  private tickTimer() {
    if (this.phase() !== 'running') return;
    this.remaining.update(v => v - 1);
    if (this.remaining() <= 0) {
      this.status.set('Time up');
      this.nextPrompt();
    }
  }

  private finish() {
    this.cleanupRun();
    this.phase.set('done');
  }

  private onHz(hz: number) {
    const c = this.cfg();
    const cur = this.current();
    if (!c || !cur) return;
    const now = Date.now();

    if (this.committedThisPrompt || this.pendingAdvance) return;
    if (now - this.promptChangedAt < POST_PROMPT_IGNORE_MS) return;

    const midi = Math.round(69 + 12 * Math.log2(hz / c.a4));
    this.heard.set(`${hz.toFixed(1)} Hz (${enharmonicDisplay(midi, c.accidentalMode)})`);

    const isCorrectNow = freqMatchesPrompt(hz, cur, c.a4, c.centsTolerance);
    const centsBetween = (a: number, b: number) => 1200 * Math.log2(a / b);

    if (isCorrectNow) {
      if (this.holdRefHz == null) {
        this.holdRefHz = hz;
        this.holdStartAt = now;
      } else {
        const drift = Math.abs(centsBetween(hz, this.holdRefHz));
        if (drift > STABILITY_CENTS) {
          this.holdRefHz = hz;
          this.holdStartAt = now;
        }
      }
      if (this.holdStartAt != null) {
        const heldMs = now - this.holdStartAt;
        const remain = Math.max(0, HOLD_COMMIT_MS - heldMs);
        this.status.set(remain > 0 ? `Good! Hold steady... ${Math.ceil(remain / 100)}%` : 'Good!');
      }
      if (this.holdStartAt != null && now - this.holdStartAt >= HOLD_COMMIT_MS) {
        this.score.update(v => v + 1);
        this.status.set('Correct!');
        this.noteFilter.set('hue-rotate(90deg)');
        this.committedThisPrompt = true;
        this.pendingAdvance = true;
        this.holdStartAt = null;
        this.holdRefHz = null;
        if (this.advanceTimeoutId) clearTimeout(this.advanceTimeoutId);
        this.advanceTimeoutId = setTimeout(() => {
          this.noteFilter.set('');
          this.pendingAdvance = false;
          this.nextPrompt();
        }, ADVANCE_DELAY_MS);
      }
    } else {
      if (this.holdRefHz != null) {
        const driftFromHold = Math.abs(centsBetween(hz, this.holdRefHz));
        if (driftFromHold > STABILITY_CENTS) {
          this.holdRefHz = null;
          this.holdStartAt = null;
        }
      }
      this.status.set('Listening... Try to match the note.');
      this.noteFilter.set('');
    }
  }

  private cleanupRun() {
    this.unsub?.();
    this.unsub = null;
    this.service.stop();
    if (this.timerId != null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.advanceTimeoutId) {
      clearTimeout(this.advanceTimeoutId);
      this.advanceTimeoutId = null;
    }
    this.pendingAdvance = false;
    this.committedThisPrompt = false;
    this.micStarted.set(false);
  }

  private formToConfig(): QuizConfig {
    const v = this.form.getRawValue() as QuizFormValue;
    const stringIds = ([1, 2, 3, 4, 5, 6] as StringId[]).filter((_, i) => v.strings[i]);
    const notes = this.baseLetters.filter((_, i) => v.notes[i]);
    return {
      fretStart: Math.min(20, Math.max(1, v.fretStart || 1)),
      fretEnd: Math.min(20, Math.max(1, v.fretEnd || 5)),
      strings: stringIds.length ? stringIds : [1, 2, 3, 4, 5, 6],
      notes: notes.length ? notes : [...BASE_LETTERS],
      accidentalMode: v.accidentalMode,
      sightReading: v.sightReading,
      iterations: Math.max(1, v.iterations || 10),
      timeLimitSec: Math.min(60, Math.max(1, v.timeLimitSec || 20)),
      a4: v.a4 || 440,
      centsTolerance: Math.min(50, Math.max(5, v.centsTolerance || 25)),
    };
  }
}
