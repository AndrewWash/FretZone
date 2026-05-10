import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { PitchDetectService } from '../core/audio/pitch-detect.service';
import { startTwoNoteDetection } from '../core/audio/two-note-detection';
import { AccidentalMode, BaseLetter, enharmonicDisplay, spellMidi } from '../core/theory/note';
import {
  Cycle,
  DirectionMode,
  DisplayMode,
  IntervalConfig,
  IntervalType,
  buildCycle,
  defaultIntervalConfig,
  overrideSpellingForTritone,
} from '../core/intervals/engine';
import { loadFromStorage, saveToStorage } from '../core/utils/storage';
import { StaffComponent } from '../notation/staff.component';
import { Spelled } from '../notation/vexflow-render';

const STORAGE_KEY = 'fretzone.intervals.cfg.v1';
const ALL_INTERVALS: IntervalType[] = [
  'm2','M2','m3','M3','P4','Aug4','Dim5','P5','m6','M6','m7','M7','P8',
];

interface IntervalFormValue {
  fretStart: number;
  fretEnd: number;
  strings: boolean[];
  intervals: boolean[];
  direction: DirectionMode;
  display: DisplayMode;
  iterations: number;
  accidentalMode: AccidentalMode;
  a4: number;
  centsTolerance: number;
}

@Component({
  selector: 'app-intervals',
  imports: [ReactiveFormsModule, StaffComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './intervals.component.html',
})
export class IntervalsComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private service = inject(PitchDetectService);

  protected allIntervals = ALL_INTERVALS;

  protected form;
  protected stringsArr: FormArray<FormControl<boolean>>;
  protected intervalsArr: FormArray<FormControl<boolean>>;

  protected phase = signal<'setup' | 'running'>('setup');
  protected cfg = signal<IntervalConfig | null>(null);
  protected current = signal<Cycle | null>(null);
  protected step = signal<0 | 1>(0);
  protected cycleIdx = signal(0);

  protected bottomSp = signal<Spelled | null>(null);
  protected topSp = signal<Spelled | null>(null);
  protected displayMode = signal<'Dyad' | 'Sequential'>('Dyad');
  protected instr = signal('Play the lower note, then the upper note.');
  protected heard = signal('--');
  protected status = signal('Waiting...');
  protected micStarted = signal(false);

  protected progressLabel = () => Math.min(this.cycleIdx() + 1, this.cfg()?.iterations ?? 0);

  protected stringLabel(s: number): string {
    if (s === 6) return 'High E (6)';
    if (s === 1) return 'Low E (1)';
    return `String ${s}`;
  }

  private activeDet: { start: () => Promise<void>; stop: () => void } | null = null;

  constructor() {
    const initial = { ...defaultIntervalConfig(), ...loadFromStorage<Partial<IntervalConfig>>(STORAGE_KEY, {}) };

    this.stringsArr = this.fb.array(
      [1, 2, 3, 4, 5, 6].map(s =>
        this.fb.nonNullable.control((initial.strings as number[]).includes(s)),
      ),
    );
    this.intervalsArr = this.fb.array(
      ALL_INTERVALS.map(iv =>
        this.fb.nonNullable.control((initial.intervals as IntervalType[]).includes(iv)),
      ),
    );

    this.form = this.fb.group({
      fretStart: this.fb.nonNullable.control(initial.fretStart),
      fretEnd: this.fb.nonNullable.control(initial.fretEnd),
      strings: this.stringsArr,
      intervals: this.intervalsArr,
      direction: this.fb.nonNullable.control<DirectionMode>(initial.direction),
      display: this.fb.nonNullable.control<DisplayMode>(initial.display),
      iterations: this.fb.nonNullable.control(initial.iterations),
      accidentalMode: this.fb.nonNullable.control<AccidentalMode>(initial.accidentalMode),
      a4: this.fb.nonNullable.control(initial.a4),
      centsTolerance: this.fb.nonNullable.control(initial.centsTolerance),
    });

    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => saveToStorage(STORAGE_KEY, this.formToConfig()));
  }

  ngOnDestroy(): void {
    this.cleanupRun();
  }

  protected start() {
    const c = this.formToConfig();
    saveToStorage(STORAGE_KEY, c);
    this.cfg.set(c);
    this.cycleIdx.set(0);
    this.step.set(0);
    this.heard.set('--');
    this.status.set('Play bottom note...');
    this.micStarted.set(false);
    try {
      this.current.set(buildCycle(c));
    } catch {
      this.status.set('No playable notes for this configuration.');
      return;
    }
    this.phase.set('running');
    this.renderStep();
  }

  protected async startMic() {
    if (this.micStarted()) return;
    this.status.set('Starting mic...');
    try {
      if (!this.activeDet) {
        await this.service.startLive();
        this.micStarted.set(true);
        this.status.set('Mic on. Listening...');
      } else {
        await this.activeDet.start();
        this.micStarted.set(true);
        this.status.set('Listening...');
      }
    } catch {
      this.micStarted.set(false);
      this.status.set('Mic start failed. Click Start Mic and allow access.');
    }
  }

  protected stopRun() {
    this.cleanupRun();
    this.phase.set('setup');
  }

  private renderStep() {
    if (this.activeDet) {
      try { this.activeDet.stop(); } catch {}
      this.activeDet = null;
    }
    const c = this.cfg();
    const cyc = this.current();
    if (!c || !cyc) return;
    const p = this.step() === 0 ? cyc.step1 : cyc.step2;
    const bottomMidi = p.anchorIsBottom ? p.anchor.midi : p.partner.midi;
    const topMidi = p.anchorIsBottom ? p.partner.midi : p.anchor.midi;

    this.displayMode.set(p.display);
    this.instr.set(
      p.display === 'Sequential'
        ? 'Play the left note first, then the right.'
        : 'Play the lower note first, then the upper note.',
    );

    const lettersU: BaseLetter[] = ['C','D','E','F','G','A','B'];
    const lettersL = ['c','d','e','f','g','a','b'];
    const stepsMap: Record<IntervalType, number> = {
      m2:1, M2:1, m3:2, M3:2, P4:3, Aug4:3, Dim5:4, P5:4, m6:5, M6:5, m7:6, M7:6, P8:0,
    };
    const steps = stepsMap[p.interval];

    const anchorSp = spellMidi(p.anchor.midi + 12, c.accidentalMode);
    const aIdx = Math.max(0, lettersL.indexOf(anchorSp.letter));
    const mod = (n: number) => ((n % 7) + 7) % 7;
    const relUp = (n: number) => lettersU[mod(aIdx + n)];

    let bottomSp: Spelled = spellMidi(bottomMidi + 12, c.accidentalMode);
    let topSp: Spelled = spellMidi(topMidi + 12, c.accidentalMode);

    if (p.anchorIsBottom) {
      const preferTop = relUp(steps);
      topSp = spellMidi(topMidi + 12, c.accidentalMode, preferTop);
      bottomSp = anchorSp;
    } else {
      const preferBottom = relUp(-steps);
      bottomSp = spellMidi(bottomMidi + 12, c.accidentalMode, preferBottom);
      topSp = anchorSp;
    }

    if (p.interval === 'Aug4' || p.interval === 'Dim5') {
      const ov = overrideSpellingForTritone(p.anchor.midi, p.partner.midi, p.interval, c.accidentalMode);
      if (ov) {
        if (p.anchorIsBottom) topSp = { key: ov.key, accidental: ov.accidental };
        else bottomSp = { key: ov.key, accidental: ov.accidental };
      }
    }

    this.bottomSp.set({ key: bottomSp.key, accidental: bottomSp.accidental });
    this.topSp.set({ key: topSp.key, accidental: topSp.accidental });
    this.status.set('Play bottom note...');
    this.heard.set('--');

    const det = startTwoNoteDetection(
      this.service,
      { bottomMidi, topMidi, a4: c.a4, centsTolerance: c.centsTolerance },
      {
        onHeard: hz => {
          const c = this.cfg();
          const mode = c?.accidentalMode ?? 'Naturals';
          const midi = Math.round(69 + 12 * Math.log2(hz / (c?.a4 ?? 440)));
          this.heard.set(`${hz.toFixed(1)} Hz (${enharmonicDisplay(midi, mode)})`);
        },
        onBottomAccepted: () => this.status.set('Good! Now play the top note...'),
        onTopAccepted: () => this.status.set('Nice!'),
        onSuccess: () => {
          try { det.stop(); } catch {}
          if (this.step() === 0) {
            this.step.set(1);
            setTimeout(() => this.renderStep(), 0);
          } else {
            this.step.set(0);
            this.cycleIdx.update(v => v + 1);
            if (this.cycleIdx() >= (this.cfg()?.iterations ?? 0)) {
              this.status.set('Done!');
              this.cleanupRun();
              this.phase.set('setup');
            } else {
              try {
                this.current.set(buildCycle(this.cfg()!));
                setTimeout(() => this.renderStep(), 0);
              } catch {
                this.status.set('No playable notes.');
              }
            }
          }
        },
      },
    );

    this.activeDet = det;
    if (this.micStarted()) {
      try { det.start(); } catch {}
    }
  }

  private cleanupRun() {
    if (this.activeDet) {
      try { this.activeDet.stop(); } catch {}
      this.activeDet = null;
    }
    this.service.stop();
    this.micStarted.set(false);
  }

  private formToConfig(): IntervalConfig {
    const v = this.form.getRawValue() as IntervalFormValue;
    const stringIds = ([1,2,3,4,5,6] as (1|2|3|4|5|6)[]).filter((_, i) => v.strings[i]);
    const intervals = ALL_INTERVALS.filter((_, i) => v.intervals[i]);
    return {
      fretStart: Math.min(20, Math.max(1, v.fretStart || 1)),
      fretEnd: Math.min(20, Math.max(1, v.fretEnd || 5)),
      strings: stringIds.length ? stringIds : [1,2,3,4,5,6],
      intervals: intervals.length ? intervals : ALL_INTERVALS,
      direction: v.direction,
      display: v.display,
      iterations: Math.max(1, v.iterations || 10),
      accidentalMode: v.accidentalMode,
      a4: v.a4 || 440,
      centsTolerance: Math.min(50, Math.max(5, v.centsTolerance || 25)),
    };
  }
}
