import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { PitchDetectService } from '../core/audio/pitch-detect.service';
import { startTwoNoteDetection } from '../core/audio/two-note-detection';
import { AccidentalMode, BaseLetter, spellMidi } from '../core/theory/note';
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
  template: `
    @if (phase() === 'setup') {
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-md" [formGroup]="form">
        <h3 class="text-lg font-semibold">Interval Memorization — Setup</h3>
        <p class="mt-2 text-slate-400">
          Choose an interval and practice playing them. For best practice, say the note and interval out loud as you play them.
          Example: "G is a perfect fifth up from C".
        </p>

        <div class="grid gap-3 grid-cols-1 md:grid-cols-3 mt-3">
          <div>
            <span class="inline-block px-2.5 py-1.5 border border-slate-800 rounded-full text-xs">Fret range (1–16, opens always included)</span>
            <div class="flex flex-wrap gap-3 items-center mt-2">
              <label>Start <input type="number" min="1" max="16" formControlName="fretStart" /></label>
              <label>End <input type="number" min="1" max="16" formControlName="fretEnd" /></label>
            </div>
            <div class="mt-3">
              <span class="inline-block px-2.5 py-1.5 border border-slate-800 rounded-full text-xs">Strings</span>
              <div class="flex flex-wrap gap-3 mt-2" formArrayName="strings">
                @for (ctrl of stringsArr.controls; track $index) {
                  <label><input type="checkbox" [formControlName]="$index" /> String {{ $index + 1 }}</label>
                }
              </div>
            </div>
          </div>

          <div>
            <span class="inline-block px-2.5 py-1.5 border border-slate-800 rounded-full text-xs">Intervals</span>
            <div class="grid gap-2 grid-cols-4 mt-2" formArrayName="intervals">
              @for (ctrl of intervalsArr.controls; track $index) {
                <label><input type="checkbox" [formControlName]="$index" /> {{ allIntervals[$index] }}</label>
              }
            </div>
            <span class="inline-block px-2.5 py-1.5 border border-slate-800 rounded-full text-xs mt-3">Iterations</span>
            <input type="number" min="1" max="200" formControlName="iterations" class="block mt-2" />
          </div>

          <div>
            <span class="inline-block px-2.5 py-1.5 border border-slate-800 rounded-full text-xs">Options</span>
            <label class="block mt-2">Direction
              <select formControlName="direction">
                <option value="UpDown">Up → Down</option>
                <option value="DownUp">Down → Up</option>
              </select>
            </label>
            <label class="block mt-2">Display
              <select formControlName="display">
                <option value="Dyad">Dyads</option>
                <option value="Sequential">Sequential</option>
                <option value="Both">Both (random)</option>
              </select>
            </label>
            <label class="block mt-2">Accidentals
              <select formControlName="accidentalMode">
                <option value="Naturals">Naturals only</option>
                <option value="SharpsPlusNaturals">Sharps + naturals</option>
                <option value="FlatsPlusNaturals">Flats + naturals</option>
                <option value="All">All</option>
              </select>
            </label>
            <label class="block mt-2">A4 (Hz) <input type="number" min="400" max="480" step="0.1" formControlName="a4" /></label>
            <label class="block mt-2">Tolerance (cents) <input type="number" min="5" max="50" step="1" formControlName="centsTolerance" /></label>
          </div>
        </div>

        <div class="flex flex-wrap gap-3 items-center mt-4">
          <button (click)="start()">Start</button>
        </div>
      </div>
    }

    @if (phase() === 'running' && cfg(); as c) {
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-md pb-40">
        <div class="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <strong>Interval Memorization</strong>
            <span class="inline-block px-2.5 py-1.5 border border-slate-800 rounded-full text-xs ml-2">{{ progressLabel() }}/{{ c.iterations }}</span>
          </div>
          <div class="flex gap-2">
            <button class="secondary" (click)="stopRun()">Stop</button>
            <button (click)="startMic()" [disabled]="micStarted()">Start Mic</button>
          </div>
        </div>

        <div class="grid gap-3 grid-cols-1 md:grid-cols-2 mt-4">
          <div>
            <div class="mt-1 flex justify-center">
              @if (bottomSp() && topSp()) {
                <app-staff [n1]="bottomSp()!" [n2]="topSp()!" [mode]="displayMode()" />
              }
            </div>
            <span class="inline-block px-2.5 py-1.5 border border-slate-800 rounded-full text-xs mt-2">Instruction</span>
            <div class="mt-1">{{ instr() }}</div>
          </div>
          <div>
            <span class="inline-block px-2.5 py-1.5 border border-slate-800 rounded-full text-xs">Heard</span>
            <div class="mt-1">{{ heard() }}</div>
            <span class="inline-block px-2.5 py-1.5 border border-slate-800 rounded-full text-xs mt-3">Status</span>
            <div class="mt-1">{{ status() }}</div>
          </div>
        </div>
      </div>
    }
  `,
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
        onHeard: hz => this.heard.set(hz.toFixed(1) + ' Hz'),
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
      fretStart: Math.min(16, Math.max(1, v.fretStart || 1)),
      fretEnd: Math.min(16, Math.max(1, v.fretEnd || 5)),
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
