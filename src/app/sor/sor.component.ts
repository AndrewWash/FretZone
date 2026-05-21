import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PitchDetectService } from '../core/audio/pitch-detect.service';
import { startMelodyDetection } from '../core/audio/melody-detection';
import { MetronomeBarComponent } from '../core/audio/metronome-bar.component';
import { MetronomeService } from '../core/audio/metronome.service';
import { enharmonicDisplay } from '../core/theory/note';
import {
  defaultSorConfig,
  type LimitMode,
  type MeasureRange,
  type PracticeMode,
  type SorConfig,
  type SorEtude,
} from '../core/sor/models';
import {
  SOR_ETUDES,
  etudeLabel,
  getEtudeById,
} from '../core/sor/catalog';
import {
  createMetronomeCursor,
  flattenPlaySequence,
  sliceEtudeByRanges,
  type MetronomeCursor,
  type UpperNoteRef,
} from '../core/sor/engine';
import { waitForNextDownbeat } from '../core/audio/beat-cursor';
import { ThemeService } from '../core/theme/theme.service';
import { PracticeTimerService } from '../core/timer/practice-timer.service';
import { loadFromStorage, saveToStorage } from '../core/utils/storage';
import { EtudeStaffComponent } from '../notation/etude-staff.component';
import { computeEtudeRowLayout } from '../notation/vexflow-render';

const STORAGE_KEY = 'fretzone.sor.cfg.v1';

@Component({
  selector: 'app-sor',
  imports: [ReactiveFormsModule, EtudeStaffComponent, MetronomeBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sor.component.html',
})
export class SorComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private service = inject(PitchDetectService);
  private metronome = inject(MetronomeService);
  protected theme = inject(ThemeService);
  private practiceTimer = inject(PracticeTimerService);
  private runCounted = false;

  protected etudes = SOR_ETUDES;
  protected form;

  protected phase = signal<'setup' | 'running' | 'done'>('setup');
  protected cfg = signal<SorConfig | null>(null);
  protected etude = signal<SorEtude | null>(null);
  // Expanded play sequence (repeats unrolled) — drives mic detection, the
  // metronome cursor, the progress readout, and the highlight/scroll mapping.
  protected playSeq = signal<UpperNoteRef[]>([]);
  protected playedCount = signal(0);
  protected iterationIdx = signal(1);
  protected heard = signal('--');
  protected status = signal('Waiting...');
  protected micStarted = signal(false);
  protected endedByTimer = signal(false);
  protected limitModeSig = signal<LimitMode>('iterations');
  protected practiceModeSig = signal<PracticeMode>('metronome');
  protected iterationReady = signal(false);
  protected measureRanges = signal<MeasureRange[]>([]);
  protected etudeIdSig = signal<string>('sor-op60-no1');
  protected rangeStartSig = signal<number | null>(null);
  protected rangeEndSig = signal<number | null>(null);
  // Layout hints for the staff renderer; populated on Start from sliceEtudeByRanges.
  protected barLabels = signal<number[] | null>(null);
  protected sectionBreaks = signal<boolean[] | null>(null);

  private sessionTimeoutId: any = null;
  private det: { start: () => Promise<void>; stop: () => void } | null = null;
  private cursor: MetronomeCursor | null = null;
  private cancelDownbeatWait: (() => void) | null = null;
  private staffScroll = viewChild<ElementRef<HTMLDivElement>>('staffScroll');
  // Tracks the last row the auto page-flip animated to, so we don't fire a new
  // scroll on every advance once we've already brought a row to the top.
  private lastFlippedRow = -1;
  private resizeRaf: number | null = null;
  // Re-evaluate the page-flip when the window resizes — the number of staff
  // rows that fit changes, so the cursor's row may need to be brought back
  // into view. rAF-coalesced so a drag-resize doesn't thrash scrollTo.
  private onResize = () => {
    if (this.resizeRaf != null) return;
    this.resizeRaf = requestAnimationFrame(() => {
      this.resizeRaf = null;
      this.maybeAutoScroll();
    });
  };

  protected etudeTitle = computed(() => {
    const e = this.etude();
    return e ? etudeLabel(e) : '';
  });

  protected totalNotes = computed(() => this.playSeq().length);

  // Played-note count for the renderer/auto-scroll. `playedCount` indexes the
  // expanded play sequence; the staff only draws each physical note once, so
  // map back to the physical note index. Resets naturally when a repeat loops
  // playback backward, so the dim highlight tracks the current pass.
  protected highlightCount = computed(() => {
    const pc = this.playedCount();
    const seq = this.playSeq();
    if (pc <= 0 || pc > seq.length) return 0;
    return seq[pc - 1].physicalIndex + 1;
  });

  // Bar count for the currently picked etude in the setup form. Drives the
  // start/end input bounds and the "Selected N of M bars" hint.
  protected setupBarCount = computed(() => {
    const e = getEtudeById(this.etudeIdSig());
    return e?.bars.length ?? 0;
  });

  protected selectedBarsCount = computed(() => {
    const total = this.setupBarCount();
    if (!total) return 0;
    const seen = new Set<number>();
    for (const r of this.measureRanges()) {
      const start = Math.max(1, Math.min(total, r.start | 0));
      const end = Math.max(1, Math.min(total, r.end | 0));
      if (start > end) continue;
      for (let m = start; m <= end; m++) seen.add(m);
    }
    return seen.size;
  });

  constructor() {
    const initial = { ...defaultSorConfig(), ...loadFromStorage<Partial<SorConfig>>(STORAGE_KEY, {}) };
    const stored = getEtudeById(initial.etudeId);
    const safeId = stored?.enabled ? stored.id : 'sor-op60-no1';

    this.form = this.fb.group({
      etudeId: this.fb.nonNullable.control(safeId),
      practiceMode: this.fb.nonNullable.control<PracticeMode>(initial.practiceMode),
      showTab: this.fb.nonNullable.control(initial.showTab),
      showLhFingerings: this.fb.nonNullable.control(initial.showLhFingerings),
      showRhFingerings: this.fb.nonNullable.control(initial.showRhFingerings),
      autoScroll: this.fb.nonNullable.control(initial.autoScroll ?? true),
      iterations: this.fb.nonNullable.control(initial.iterations),
      limitMode: this.fb.nonNullable.control<LimitMode>(initial.limitMode),
      timeMinutes: this.fb.nonNullable.control(initial.timeMinutes),
      a4: this.fb.nonNullable.control(initial.a4),
      centsTolerance: this.fb.nonNullable.control(initial.centsTolerance),
      rangeStart: this.fb.control<number | null>(null),
      rangeEnd: this.fb.control<number | null>(null),
    });

    this.limitModeSig.set(this.form.controls.limitMode.value);
    this.practiceModeSig.set(this.form.controls.practiceMode.value);
    this.etudeIdSig.set(this.form.controls.etudeId.value);
    const initialRanges = Array.isArray(initial.measureRanges) ? initial.measureRanges : [];
    this.measureRanges.set(this.normalizeRanges(initialRanges, getEtudeById(safeId)?.bars.length ?? 0));

    this.form.controls.limitMode.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(v => this.limitModeSig.set(v));
    this.form.controls.practiceMode.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(v => this.practiceModeSig.set(v));
    this.form.controls.etudeId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(v => {
        this.etudeIdSig.set(v);
        // Drop ranges so a stale selection from a different-length etude
        // can't trigger out-of-range silence on the next Start.
        this.measureRanges.set([]);
        this.form.controls.rangeStart.setValue(null);
        this.form.controls.rangeEnd.setValue(null);
      });
    this.form.controls.rangeStart.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(v => this.rangeStartSig.set(v));
    this.form.controls.rangeEnd.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(v => this.rangeEndSig.set(v));

    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => saveToStorage(STORAGE_KEY, this.formToConfig()));

    // Persist whenever the measure-range list changes (it's outside the form).
    effect(() => {
      this.measureRanges();
      saveToStorage(STORAGE_KEY, this.formToConfig());
    });

    // Auto page-flip — scrolls the staff panel when the playback cursor
    // (metronome or mic) advances. Reads layout from the same helper the
    // renderer uses so row Y positions stay in sync with what's drawn.
    effect(() => this.maybeAutoScroll());
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  private normalizeRanges(ranges: MeasureRange[], total: number): MeasureRange[] {
    if (!total) return [];
    const out: MeasureRange[] = [];
    for (const r of ranges) {
      const start = Math.max(1, Math.min(total, r.start | 0));
      const end = Math.max(1, Math.min(total, r.end | 0));
      if (start > end) continue;
      out.push({ start, end });
    }
    return out;
  }

  protected canAddRange = computed(() => {
    const s = this.rangeStartSig();
    const e = this.rangeEndSig();
    const total = this.setupBarCount();
    if (!total) return false;
    if (s == null || e == null) return false;
    if (!Number.isFinite(s) || !Number.isFinite(e)) return false;
    if (s < 1 || e < 1) return false;
    if (s > total || e > total) return false;
    return s <= e;
  });

  protected addRange() {
    const s = this.form.controls.rangeStart.value;
    const e = this.form.controls.rangeEnd.value;
    const total = this.setupBarCount();
    if (s == null || e == null || !total) return;
    const start = Math.max(1, Math.min(total, Math.trunc(s)));
    const end = Math.max(1, Math.min(total, Math.trunc(e)));
    if (start > end) return;
    this.measureRanges.update(arr => [...arr, { start, end }]);
    this.form.controls.rangeStart.setValue(null);
    this.form.controls.rangeEnd.setValue(null);
  }

  protected removeRange(index: number) {
    this.measureRanges.update(arr => arr.filter((_, i) => i !== index));
  }

  protected clearRanges() {
    this.measureRanges.set([]);
  }

  protected rangeLabel(r: MeasureRange): string {
    return r.start === r.end ? `${r.start}` : `${r.start}–${r.end}`;
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    if (this.resizeRaf != null) cancelAnimationFrame(this.resizeRaf);
    this.cleanupRun();
  }

  protected start() {
    const c = this.formToConfig();
    saveToStorage(STORAGE_KEY, c);
    const entry = getEtudeById(c.etudeId);
    if (!entry?.enabled) {
      this.status.set('That etude isn\'t available yet — pick Op. 60 No. 1.');
      return;
    }
    if (!entry.bars.length) {
      this.status.set('That etude has no notes yet — import it via MusicXML first.');
      return;
    }
    const sliced = sliceEtudeByRanges(entry, c.measureRanges);
    if (!sliced.etude.bars.length) {
      this.status.set('No measures selected — pick a range or clear the list.');
      return;
    }
    this.cfg.set(c);
    this.etude.set(sliced.etude);
    this.playSeq.set(flattenPlaySequence(sliced.etude));
    this.barLabels.set(sliced.originalBarNumbers);
    this.sectionBreaks.set(sliced.sectionBreakBefore);
    this.playedCount.set(0);
    this.iterationIdx.set(1);
    this.heard.set('--');
    this.micStarted.set(false);
    this.endedByTimer.set(false);
    this.iterationReady.set(false);
    if (c.practiceMode === 'mic') {
      this.status.set('Press Start Mic, then play the first note.');
    } else {
      this.status.set('Press Play to start.');
    }
    this.metronome.resetForNewSession();
    this.phase.set('running');
    if (!this.runCounted) {
      this.runCounted = true;
      this.practiceTimer.markRunStart();
    }
  }

  private finishByTimer() {
    if (this.phase() !== 'running') return;
    this.endedByTimer.set(true);
    this.cleanupRun();
    this.phase.set('done');
  }

  // Mic-mode entry point.
  protected async startMic() {
    if (this.micStarted()) return;
    this.status.set('Starting mic...');
    try {
      await this.service.startLive();
      this.micStarted.set(true);
      this.spinUpDetection();
      this.status.set('Listening... Play the first note.');
      this.armTimeLimitIfNeeded();
    } catch {
      this.micStarted.set(false);
      this.status.set('Mic failed. Use HTTPS/localhost and allow permission.');
    }
  }

  // Metronome-mode entry point. Sync cursor's beat-0 to the next audible
  // downbeat so the highlight tracks the click. If the metronome is off,
  // turn it on first — its first downbeat arrives ~50ms later and the
  // cursor anchors to that.
  protected playMetronome() {
    if (this.cursor || this.cancelDownbeatWait) return;
    const e = this.etude();
    if (!e) return;
    this.armTimeLimitIfNeeded();
    this.iterationReady.set(false);
    if (!this.metronome.enabled()) this.metronome.setEnabled(true);
    this.status.set('Counting in — starts on the next downbeat.');
    this.cancelDownbeatWait = waitForNextDownbeat(
      () => this.metronome.downbeatAt(),
      (at) => {
        this.cancelDownbeatWait = null;
        this.cursor = createMetronomeCursor(e, {
          bpm: this.metronome.bpm(),
          onAdvance: i => {
            this.playedCount.set(i);
          },
          onComplete: () => this.onIterationComplete(),
        });
        this.cursor.start(at);
        this.status.set('Playing — follow the metronome.');
      },
    );
  }

  private armTimeLimitIfNeeded() {
    const c = this.cfg();
    if (c?.limitMode === 'time' && this.sessionTimeoutId == null) {
      this.sessionTimeoutId = setTimeout(
        () => this.finishByTimer(),
        c.timeMinutes * 60 * 1000,
      );
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

  // Restart the current etude from the first note without leaving the run.
  protected restart() {
    if (this.phase() !== 'running') return;
    this.playedCount.set(0);
    this.heard.set('--');
    this.iterationReady.set(false);
    const c = this.cfg();
    if (c?.practiceMode === 'mic') {
      if (this.micStarted()) {
        this.tearDownDetection();
        this.status.set('Restarted — play the first note.');
        setTimeout(() => this.spinUpDetection(true), 0);
      } else {
        this.status.set('Restarted. Press Start Mic, then play the first note.');
      }
    } else {
      this.tearDownCursor();
      this.status.set('Restarted. Press Play.');
    }
  }

  private spinUpDetection(requireFreshAttack = false) {
    const c = this.cfg();
    const e = this.etude();
    if (!c || !e) return;
    this.tearDownDetection();
    const seq = this.playSeq();
    // Chord tickables expose every stacked pitch as an alternative — landing
    // mic detection on any one of them counts the position as played.
    const midis = seq.map(n =>
      n.chordMidis?.length ? [n.midi, ...n.chordMidis] : n.midi
    );
    this.det = startMelodyDetection(
      this.service,
      { midis, a4: c.a4, centsTolerance: c.centsTolerance, requireFreshAttack },
      {
        onHeard: hz => {
          const m = Math.round(69 + 12 * Math.log2(hz / c.a4));
          this.heard.set(`${hz.toFixed(1)} Hz (${enharmonicDisplay(m, 'SharpsPlusNaturals')})`);
        },
        onNoteAccepted: i => {
          this.playedCount.set(i + 1);
          this.status.set('Good!');
        },
        onComplete: () => this.onIterationComplete(),
      },
    );
    this.det.start().catch(() => { /* mic already running, ignore */ });
  }

  private onIterationComplete() {
    const c2 = this.cfg();
    if (!c2) return;
    if (c2.limitMode === 'iterations' && this.iterationIdx() >= c2.iterations) {
      this.status.set('Done!');
      this.cleanupRun();
      this.phase.set('done');
      return;
    }
    if (c2.practiceMode === 'mic') {
      // Mic mode auto-advances so the player doesn't break their flow.
      this.iterationIdx.update(v => v + 1);
      this.playedCount.set(0);
      this.status.set(`Iteration ${this.iterationIdx()} — keep going.`);
      this.tearDownDetection();
      setTimeout(() => this.spinUpDetection(true), 0);
    } else {
      // Metronome mode waits for the user — they may want to rest, slow the
      // tempo, or just breathe before the next pass.
      this.tearDownCursor();
      this.iterationReady.set(true);
      this.status.set('Iteration complete — tap Next when you\'re ready.');
    }
  }

  // Metronome-mode "Next" handler — only meaningful when iterationReady is on.
  protected next() {
    if (!this.iterationReady()) return;
    this.iterationReady.set(false);
    this.iterationIdx.update(v => v + 1);
    this.playedCount.set(0);
    this.status.set(`Iteration ${this.iterationIdx()} — press Play.`);
    // Don't auto-start the cursor; let the user press Play when they're set.
  }

  private tearDownDetection() {
    if (this.det) {
      try { this.det.stop(); } catch {}
      this.det = null;
    }
  }

  private tearDownCursor() {
    if (this.cancelDownbeatWait) {
      try { this.cancelDownbeatWait(); } catch {}
      this.cancelDownbeatWait = null;
    }
    if (this.cursor) {
      try { this.cursor.stop(); } catch {}
      this.cursor = null;
    }
  }

  private cleanupRun() {
    if (this.runCounted) {
      this.runCounted = false;
      this.practiceTimer.markRunEnd();
    }
    this.tearDownDetection();
    this.tearDownCursor();
    if (this.sessionTimeoutId != null) {
      clearTimeout(this.sessionTimeoutId);
      this.sessionTimeoutId = null;
    }
    this.service.stop();
    this.micStarted.set(false);
    this.metronome.stop();
  }

  private formToConfig(): SorConfig {
    const v = this.form.getRawValue();
    return {
      etudeId: v.etudeId || 'sor-op60-no1',
      practiceMode: v.practiceMode === 'mic' ? 'mic' : 'metronome',
      showTab: !!v.showTab,
      showLhFingerings: !!v.showLhFingerings,
      showRhFingerings: !!v.showRhFingerings,
      autoScroll: !!v.autoScroll,
      iterations: Math.max(1, v.iterations || 1),
      limitMode: v.limitMode === 'time' ? 'time' : 'iterations',
      timeMinutes: Math.min(60, Math.max(1, v.timeMinutes || 3)),
      a4: v.a4 || 440,
      centsTolerance: Math.min(50, Math.max(5, v.centsTolerance || 25)),
      measureRanges: this.measureRanges(),
    };
  }

  // Page-flip the staff panel as the playback cursor advances, bringing the
  // line the player is reaching the end of up to the top so fresh staff is
  // always ahead. The trigger adapts to how many rows the *current* viewport
  // fully fits — so it behaves on a wide desktop window, a short one, or a
  // phone:
  //   • 2+ full rows  → flip when the cursor reaches the 2nd measure of the
  //     last fully-visible row; that row becomes the new top row.
  //   • 0–1 full rows → flip only once the cursor finishes the active row (its
  //     last note), bringing the next row to the top (one line per page).
  // Row geometry comes from the same layout helper the renderer uses, mapped
  // through the SVG's live on-screen position + scale, so it stays correct
  // even when the staff is offset by container padding or CSS-scaled to fit.
  private maybeAutoScroll() {
    const playedCount = this.playedCount();
    const cfg = this.cfg();
    const e = this.etude();
    const containerRef = this.staffScroll();
    if (!cfg || !e || !containerRef) return;
    const container = containerRef.nativeElement;

    // Iteration just (re)started — drop the highlight to the top and reset
    // the row tracker so the next flip fires correctly.
    if (playedCount === 0) {
      container.scrollTop = 0;
      this.lastFlippedRow = -1;
      return;
    }

    if (!cfg.autoScroll) return;

    // Current cursor bar. With repeats expanded the same bar recurs in the play
    // sequence, so read it off the sequence entry rather than a note onset.
    const seq = this.playSeq();
    const seqRef = seq[playedCount - 1];
    if (!seqRef) return;
    const barIdx = seqRef.barIndex;

    const layout = computeEtudeRowLayout(e.bars.length, {
      barsPerRow: 4, // matches renderEtudeEl / etude-staff default — keep in sync
      sectionBreaks: this.sectionBreaks(),
      showTab: cfg.showTab,
      showRhFingerings: cfg.showRhFingerings,
    });
    const rowCount = layout.rows.length;
    const rowOf = (bar: number) => layout.rows.findIndex(r => r.includes(bar));
    const activeRow = rowOf(barIdx);
    if (activeRow < 0) return;

    // Map the renderer's internal SVG coordinates into the container's scroll
    // coordinate space. The staff SVG sits below the container's padding and
    // may be CSS-scaled on a narrow viewport — fold both in (svgTop offset and
    // scale factor) or the row math drifts on anything but a wide window.
    const svg = container.querySelector('svg');
    if (!svg) return;
    const cRect = container.getBoundingClientRect();
    const sRect = svg.getBoundingClientRect();
    const scale = sRect.height / Math.max(1, layout.totalHeight);
    const svgTop = sRect.top - cRect.top + container.scrollTop;
    const rowTopPx = (r: number) => svgTop + layout.rowYTops[r] * scale;
    const rowBottomPx = (r: number) =>
      svgTop + (layout.rowYTops[r] + layout.rowHeight) * scale;
    // Scroll offset that pins row r just below the viewport's top edge.
    const topForRow = (r: number) =>
      Math.max(0, rowTopPx(r) - layout.topPad * scale * 0.5);

    const visTop = container.scrollTop;
    const visBottom = visTop + container.clientHeight;
    const epsilon = 8;

    // Cursor scrolled out of view above the viewport (a repeat looped back) —
    // bring its row home and re-arm forward flips from there.
    if (rowTopPx(activeRow) < visTop - epsilon) {
      container.scrollTo({ top: topForRow(activeRow), behavior: 'smooth' });
      this.lastFlippedRow = activeRow;
      return;
    }

    // Rows fully inside the viewport right now.
    let firstFull = -1;
    let lastFull = -1;
    for (let r = 0; r < rowCount; r++) {
      if (rowTopPx(r) >= visTop - epsilon && rowBottomPx(r) <= visBottom + epsilon) {
        if (firstFull < 0) firstFull = r;
        lastFull = r;
      }
    }

    // Pick the row to bring to the top, and the moment to do it.
    let targetRow: number;
    if (lastFull < 0 || firstFull === lastFull) {
      // 0–1 fully-visible rows — flip only once the cursor finishes the active
      // row (its last note), bringing the next row up to the top.
      const nextRef = seq[playedCount]; // next note in the play sequence
      if (!nextRef) return;             // last note of the run — nothing to flip
      const nextRow = rowOf(nextRef.barIndex);
      if (nextRow <= activeRow) return; // still mid-row (or a repeat) — wait
      targetRow = nextRow;
    } else {
      // 2+ fully-visible rows — flip when the cursor reaches the 2nd measure of
      // the last fully-visible row. If that's already the final row the run's
      // end is in view, so there's nothing left to flip to.
      if (lastFull >= rowCount - 1) return;
      targetRow = lastFull;
      if (activeRow < targetRow) return;
      const rowBars = layout.rows[targetRow];
      const triggerBar = rowBars[1] ?? rowBars[0]; // 2nd measure (1st if single-bar)
      if (barIdx < triggerBar) return;
    }

    // Dedup: flip forward only, once per target row. The strict check also
    // absorbs the smooth-scroll latency window, during which container.scrollTop
    // is briefly stale and would otherwise re-fire the same flip.
    if (targetRow <= this.lastFlippedRow) return;

    container.scrollTo({ top: topForRow(targetRow), behavior: 'smooth' });
    this.lastFlippedRow = targetRow;
  }

  protected etudeLabelOf(id: string): string {
    const e = getEtudeById(id);
    return e ? etudeLabel(e) : id;
  }
}
