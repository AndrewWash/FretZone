import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { startWith } from 'rxjs/operators';

interface FieldRow {
  main: string;
  sub: string;
}

interface TimebaseConfig {
  cycles: number;
  minutesPerField: number;
  fields: FieldRow[];
}

const DEFAULT_FIELD_COUNT = 3;
const COUNTDOWN_WARNING_SEC = 5;

const FIVE_MINUTE_DRILL: FieldRow[] = [
  { main: 'Independence Exercise', sub: 'Spider Walk' },
  { main: 'RH pattern/arp',         sub: 'Type finger pattern here ex: imaima' },
  { main: 'Scales',                 sub: 'quarter note, dotted, 16th, etc' },
  { main: 'Slurs',                  sub: '' },
  { main: 'Strength',               sub: 'isometric Barre Hold' },
];

type FieldGroup = FormGroup<{
  main: FormControl<string>;
  sub: FormControl<string>;
}>;

@Component({
  selector: 'app-timebase',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timebase.component.html',
  host: {
    '(document:keydown.space)': 'onSpace($event)',
  },
})
export class TimebaseComponent implements OnDestroy {
  private fb = inject(FormBuilder);

  protected fieldsArr: FormArray<FieldGroup>;
  protected form;

  protected phase = signal<'setup' | 'running' | 'done'>('setup');
  protected cfg = signal<TimebaseConfig | null>(null);
  protected cycleIdx = signal(0);
  protected fieldIdx = signal(0);
  protected remainingSec = signal(0);
  protected paused = signal(false);

  protected hasAnyMain;
  protected currentField = computed<FieldRow | null>(() => {
    const c = this.cfg();
    if (!c) return null;
    return c.fields[this.fieldIdx()] ?? null;
  });
  protected showCountdown = computed(() =>
    this.remainingSec() > 0 && this.remainingSec() <= COUNTDOWN_WARNING_SEC,
  );

  private runRoot = viewChild<ElementRef<HTMLElement>>('runRoot');
  private timerId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.fieldsArr = this.fb.array<FieldGroup>(
      Array.from({ length: DEFAULT_FIELD_COUNT }, () => this.makeFieldGroup({ main: '', sub: '' })),
    );

    this.form = this.fb.group({
      cycles: this.fb.nonNullable.control(1),
      minutesPerField: this.fb.nonNullable.control(1),
      fields: this.fieldsArr,
    });

    const valueSig = toSignal(
      this.form.valueChanges.pipe(startWith(this.form.value)),
      { initialValue: this.form.value },
    );
    this.hasAnyMain = computed(() => {
      void valueSig();
      return this.fieldsArr.controls.some(g => g.controls.main.value.trim().length > 0);
    });
  }

  ngOnDestroy(): void {
    this.cleanupRun();
  }

  protected addField(): void {
    this.fieldsArr.push(this.makeFieldGroup({ main: '', sub: '' }));
  }

  protected removeField(idx: number): void {
    if (this.fieldsArr.length <= 1) return;
    this.fieldsArr.removeAt(idx);
  }

  protected loadFiveMinuteDrill(): void {
    while (this.fieldsArr.length > 0) {
      this.fieldsArr.removeAt(0);
    }
    for (const row of FIVE_MINUTE_DRILL) {
      this.fieldsArr.push(this.makeFieldGroup(row));
    }
  }

  protected start(): void {
    const cycles = Math.max(1, Math.floor(Number(this.form.controls.cycles.value) || 1));
    const minutesPerField = Math.max(1, Math.floor(Number(this.form.controls.minutesPerField.value) || 1));
    const fields: FieldRow[] = this.fieldsArr.controls
      .map(g => ({ main: g.controls.main.value.trim(), sub: g.controls.sub.value.trim() }))
      .filter(f => f.main.length > 0);

    if (fields.length === 0) return;

    this.cfg.set({ cycles, minutesPerField, fields });
    this.cycleIdx.set(0);
    this.fieldIdx.set(0);
    this.remainingSec.set(minutesPerField * 60);
    this.paused.set(false);
    this.phase.set('running');
    this.armTimer();

    queueMicrotask(() => this.runRoot()?.nativeElement.focus());
  }

  protected backToSetup(): void {
    this.cleanupRun();
    this.phase.set('setup');
  }

  protected onSpace(event: Event): void {
    if (this.phase() !== 'running') return;
    event.preventDefault();
    this.togglePause();
  }

  private togglePause(): void {
    if (this.paused()) {
      this.paused.set(false);
      this.armTimer();
    } else {
      this.paused.set(true);
      this.disarmTimer();
    }
  }

  private armTimer(): void {
    if (this.timerId != null) return;
    this.timerId = setInterval(() => this.tick(), 1000);
  }

  private disarmTimer(): void {
    if (this.timerId != null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private tick(): void {
    if (this.phase() !== 'running' || this.paused()) return;
    const next = this.remainingSec() - 1;
    if (next > 0) {
      this.remainingSec.set(next);
      return;
    }
    this.advance();
  }

  private advance(): void {
    const c = this.cfg();
    if (!c) return;
    const nextFieldIdx = this.fieldIdx() + 1;
    if (nextFieldIdx < c.fields.length) {
      this.fieldIdx.set(nextFieldIdx);
      this.remainingSec.set(c.minutesPerField * 60);
      return;
    }
    const nextCycleIdx = this.cycleIdx() + 1;
    if (nextCycleIdx < c.cycles) {
      this.cycleIdx.set(nextCycleIdx);
      this.fieldIdx.set(0);
      this.remainingSec.set(c.minutesPerField * 60);
      return;
    }
    this.cleanupRun();
    this.phase.set('done');
  }

  private cleanupRun(): void {
    this.disarmTimer();
    this.paused.set(false);
  }

  private makeFieldGroup(row: FieldRow): FieldGroup {
    return this.fb.nonNullable.group({
      main: this.fb.nonNullable.control(row.main),
      sub: this.fb.nonNullable.control(row.sub),
    });
  }
}
