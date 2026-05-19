import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PitchDetectService } from '../core/audio/pitch-detect.service';
import { startMelodyDetection } from '../core/audio/melody-detection';
import { MetronomeBarComponent } from '../core/audio/metronome-bar.component';
import { MetronomeService } from '../core/audio/metronome.service';
import { enharmonicDisplay } from '../core/theory/note';
import type { ModeName } from '../core/theory/modes';
import type { BaseLetter } from '../core/theory/note';
import { defaultScalesConfig, patternToRun, type ScaleRun } from '../core/scales/engine';
import {
  getPatternById,
  getScaleById,
  scaleLabel,
  scalesGroupedByPattern,
} from '../core/scales/catalog';
import {
  qualityToMode,
  tonicBaseLetter,
  RH_FINGERING_OPTIONS,
  type LimitMode,
  type RhFingeringPattern,
  type ScaleQuality,
  type ScalesConfig,
} from '../core/scales/models';
import { ThemeService } from '../core/theme/theme.service';
import { loadFromStorage, saveToStorage } from '../core/utils/storage';
import { ScaleStaffComponent } from '../notation/scale-staff.component';
import {
  FretboardDiagramComponent,
  type FretboardDot,
} from '../notation/fretboard-diagram.component';

const STORAGE_KEY = 'fretzone.scales.cfg.v1';

@Component({
  selector: 'app-scales',
  imports: [ReactiveFormsModule, ScaleStaffComponent, FretboardDiagramComponent, MetronomeBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scales.component.html',
})
export class ScalesComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private service = inject(PitchDetectService);
  private metronome = inject(MetronomeService);
  protected theme = inject(ThemeService);

  protected patternGroups = scalesGroupedByPattern();
  protected rhFingeringOptions = RH_FINGERING_OPTIONS;

  protected form;

  protected phase = signal<'setup' | 'running' | 'done'>('setup');
  protected cfg = signal<ScalesConfig | null>(null);
  protected run = signal<ScaleRun | null>(null);
  protected playedCount = signal(0);
  protected iterationIdx = signal(1);
  protected heard = signal('--');
  protected status = signal('Waiting...');
  protected micStarted = signal(false);
  protected endedByTimer = signal(false);
  protected limitModeSig = signal<LimitMode>('iterations');

  private sessionTimeoutId: any = null;

  protected scaleEntry = computed(() => {
    const c = this.cfg();
    if (!c) return null;
    return getScaleById(c.scaleId) ?? null;
  });

  protected scaleTitle = computed(() => {
    const e = this.scaleEntry();
    return e ? scaleLabel(e) : '';
  });

  protected staffTonic = computed<BaseLetter>(() => {
    const e = this.scaleEntry();
    return e ? tonicBaseLetter(e.tonic).base : 'C';
  });

  protected staffTonicOffset = computed<0 | 1 | -1>(() => {
    const e = this.scaleEntry();
    return e ? tonicBaseLetter(e.tonic).offset : 0;
  });

  protected staffMode = computed<ModeName>(() => {
    const e = this.scaleEntry();
    return e ? qualityToMode(e.quality) : 'Ionian';
  });

  protected staffIsMelodicMinor = computed(() => this.scaleEntry()?.quality === 'MelodicMinor');

  protected ascendingDots = computed<FretboardDot[]>(() => {
    const r = this.run();
    const e = this.scaleEntry();
    if (!r || !e) return [];
    return runToDots(r.ascending, tonicBaseLetter(e.tonic).base);
  });

  protected descendingDots = computed<FretboardDot[]>(() => {
    const r = this.run();
    const e = this.scaleEntry();
    if (!r || !e) return [];
    return runToDots(r.descending, tonicBaseLetter(e.tonic).base);
  });

  // Fretboard diagram window: derive from the lowest/highest fret in the run
  // so the layout always frames the pattern. Open strings sit outside the
  // window and render at the nut position.
  protected diagramStartFret = computed(() => {
    const r = this.run();
    if (!r) return 1;
    const frets = r.full.map(n => n.fret).filter(f => f > 0);
    if (!frets.length) return 1;
    const lo = Math.min(...frets);
    return Math.max(1, lo - 1);
  });

  // Long scales (3-octave) wrap onto two staff lines, breaking at the apex
  // so row 1 is the ascent and row 2 is the descent. Threshold of 30 notes
  // captures Pattern #3 (43) but leaves Pattern #1 (29) on a single row.
  protected staffRowBreaks = computed<number[]>(() => {
    const r = this.run();
    if (!r) return [];
    return r.full.length > 30 ? [r.ascending.length] : [];
  });

  protected diagramFretCount = computed(() => {
    const r = this.run();
    if (!r) return 8;
    const frets = r.full.map(n => n.fret).filter(f => f > 0);
    if (!frets.length) return 8;
    const lo = Math.min(...frets);
    const hi = Math.max(...frets);
    return Math.max(6, hi - Math.max(1, lo - 1) + 2);
  });

  // Shrink the per-fret cell for wide windows (3-octave patterns span ~16
  // frets) so the asc/desc diagrams still fit comfortably side-by-side.
  protected diagramFretGap = computed(() => {
    return this.diagramFretCount() > 12 ? 22 : 38;
  });

  private det: { start: () => Promise<void>; stop: () => void } | null = null;

  constructor() {
    const initial = { ...defaultScalesConfig(), ...loadFromStorage<Partial<ScalesConfig>>(STORAGE_KEY, {}) };
    // Guard: if a previously stored scaleId is no longer in the catalog or
    // is disabled, fall back to the default.
    const stored = getScaleById(initial.scaleId);
    const safeId = stored?.enabled ? stored.id : 'c-major';

    this.form = this.fb.group({
      scaleId: this.fb.nonNullable.control(safeId),
      showTab: this.fb.nonNullable.control(initial.showTab),
      showFingerings: this.fb.nonNullable.control(initial.showFingerings),
      rhFingeringPattern: this.fb.nonNullable.control<RhFingeringPattern>(initial.rhFingeringPattern),
      iterations: this.fb.nonNullable.control(initial.iterations),
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
  }

  ngOnDestroy(): void {
    this.cleanupRun();
  }

  protected start() {
    const c = this.formToConfig();
    saveToStorage(STORAGE_KEY, c);
    const entry = getScaleById(c.scaleId);
    if (!entry?.enabled) {
      this.status.set('That scale isn\'t available yet — pick C Major.');
      return;
    }
    const pattern = getPatternById(entry.patternId);
    if (!pattern) {
      this.status.set('Pattern data missing for this scale.');
      return;
    }
    this.cfg.set(c);
    this.run.set(patternToRun(pattern));
    this.playedCount.set(0);
    this.iterationIdx.set(1);
    this.heard.set('--');
    this.micStarted.set(false);
    this.endedByTimer.set(false);
    this.status.set('Press Start Mic, then play the first note.');
    this.metronome.resetForNewSession();
    this.phase.set('running');
  }

  private finishByTimer() {
    if (this.phase() !== 'running') return;
    this.endedByTimer.set(true);
    this.cleanupRun();
    this.phase.set('done');
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

  // Restart the current scale run from its first note without leaving the run.
  protected restart() {
    if (this.phase() !== 'running') return;
    this.playedCount.set(0);
    this.heard.set('--');
    if (this.micStarted()) {
      this.tearDownDetection();
      this.status.set('Restarted — play the first note.');
      setTimeout(() => this.spinUpDetection(true), 0);
    } else {
      this.status.set('Restarted. Press Start Mic, then play the first note.');
    }
  }

  private spinUpDetection(requireFreshAttack = false) {
    const c = this.cfg();
    const r = this.run();
    if (!c || !r) return;
    this.tearDownDetection();
    this.det = startMelodyDetection(
      this.service,
      { midis: r.midis, a4: c.a4, centsTolerance: c.centsTolerance, requireFreshAttack },
      {
        onHeard: hz => {
          const m = Math.round(69 + 12 * Math.log2(hz / c.a4));
          this.heard.set(`${hz.toFixed(1)} Hz (${enharmonicDisplay(m, 'SharpsPlusNaturals')})`);
        },
        onNoteAccepted: i => {
          this.playedCount.set(i + 1);
          this.status.set('Good!');
        },
        onComplete: () => {
          const c2 = this.cfg();
          if (!c2) return;
          if (c2.limitMode === 'iterations' && this.iterationIdx() >= c2.iterations) {
            this.status.set('Done!');
            this.cleanupRun();
            this.phase.set('done');
            return;
          }
          this.iterationIdx.update(v => v + 1);
          this.playedCount.set(0);
          this.status.set(`Iteration ${this.iterationIdx()} — keep going.`);
          this.tearDownDetection();
          setTimeout(() => this.spinUpDetection(true), 0);
        },
      },
    );
    this.det.start().catch(() => { /* mic already running, ignore */ });
  }

  private tearDownDetection() {
    if (this.det) {
      try { this.det.stop(); } catch {}
      this.det = null;
    }
  }

  private cleanupRun() {
    this.tearDownDetection();
    if (this.sessionTimeoutId != null) {
      clearTimeout(this.sessionTimeoutId);
      this.sessionTimeoutId = null;
    }
    this.service.stop();
    this.micStarted.set(false);
    this.metronome.stop();
  }

  private formToConfig(): ScalesConfig {
    const v = this.form.getRawValue();
    return {
      scaleId: v.scaleId || 'c-major',
      showTab: !!v.showTab,
      showFingerings: !!v.showFingerings,
      rhFingeringPattern: RH_FINGERING_OPTIONS.some(o => o.value === v.rhFingeringPattern)
        ? v.rhFingeringPattern
        : 'off',
      iterations: Math.max(1, v.iterations || 1),
      limitMode: v.limitMode === 'time' ? 'time' : 'iterations',
      timeMinutes: Math.min(60, Math.max(1, v.timeMinutes || 3)),
      a4: v.a4 || 440,
      centsTolerance: Math.min(50, Math.max(5, v.centsTolerance || 25)),
    };
  }

  protected scaleLabelOf(scaleId: string): string {
    const e = getScaleById(scaleId);
    return e ? scaleLabel(e) : scaleId;
  }
}

// Pitch-class index for each natural letter.
const LETTER_PC: Record<string, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };

function runToDots(
  notes: { stringId: 1|2|3|4|5|6; fret: number; finger: 1|2|3|4|null; midi: number }[],
  tonicLetter: BaseLetter,
): FretboardDot[] {
  const tonicPc = LETTER_PC[tonicLetter];
  return notes.map(n => {
    const isTonic = ((n.midi % 12) + 12) % 12 === tonicPc;
    return {
      stringId: n.stringId,
      fret: n.fret,
      kind: isTonic ? 'tonic' : 'fingering',
      label: n.finger != null ? String(n.finger) : undefined,
    };
  });
}
