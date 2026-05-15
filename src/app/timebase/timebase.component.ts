import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { startWith } from 'rxjs/operators';
import { MetronomeBarComponent } from '../core/audio/metronome-bar.component';
import { MetronomeService } from '../core/audio/metronome.service';

interface FieldRow {
  main: string;
  mainImage: string | null;
  sub: string;
  subImage: string | null;
}

interface TimebaseConfig {
  cycles: number;
  minutesPerField: number;
  fields: FieldRow[];
}

const DEFAULT_FIELD_COUNT = 3;
const COUNTDOWN_WARNING_SEC = 5;
const MAX_PASTE_IMAGE_BYTES = 5 * 1024 * 1024;
const PASTE_ERROR_CLEAR_MS = 3000;

const FIVE_MINUTE_DRILL: FieldRow[] = [
  { main: 'Independence Exercise', mainImage: null, sub: 'Spider Walk', subImage: null },
  { main: 'RH pattern/arp',         mainImage: null, sub: 'Type finger pattern here ex: imaima', subImage: null },
  { main: 'Scales',                 mainImage: null, sub: 'quarter note, dotted, 16th, etc', subImage: null },
  { main: 'Slurs',                  mainImage: null, sub: '', subImage: null },
  { main: 'Strength',               mainImage: null, sub: 'isometric Barre Hold', subImage: null },
];

type FieldGroup = FormGroup<{
  main: FormControl<string>;
  mainImage: FormControl<string | null>;
  sub: FormControl<string>;
  subImage: FormControl<string | null>;
}>;

type ImageSlot = 'mainImage' | 'subImage';

@Component({
  selector: 'app-timebase',
  imports: [ReactiveFormsModule, MetronomeBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timebase.component.html',
  host: {
    '(document:keydown.space)': 'onSpace($event)',
  },
})
export class TimebaseComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private metronome = inject(MetronomeService);

  protected fieldsArr: FormArray<FieldGroup>;
  protected form;

  protected phase = signal<'setup' | 'running' | 'done'>('setup');
  protected cfg = signal<TimebaseConfig | null>(null);
  protected cycleIdx = signal(0);
  protected fieldIdx = signal(0);
  protected remainingSec = signal(0);
  protected paused = signal(false);
  protected pasteError = signal<string | null>(null);

  private pasteErrorTimer: ReturnType<typeof setTimeout> | null = null;

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
      Array.from({ length: DEFAULT_FIELD_COUNT }, () =>
        this.makeFieldGroup({ main: '', mainImage: null, sub: '', subImage: null }),
      ),
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
      return this.fieldsArr.controls.some(g =>
        g.controls.main.value.trim().length > 0 || g.controls.mainImage.value !== null,
      );
    });
  }

  ngOnDestroy(): void {
    this.cleanupRun();
    if (this.pasteErrorTimer != null) {
      clearTimeout(this.pasteErrorTimer);
      this.pasteErrorTimer = null;
    }
  }

  protected addField(): void {
    this.fieldsArr.push(this.makeFieldGroup({ main: '', mainImage: null, sub: '', subImage: null }));
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
      .map(g => ({
        main: g.controls.main.value.trim(),
        mainImage: g.controls.mainImage.value,
        sub: g.controls.sub.value.trim(),
        subImage: g.controls.subImage.value,
      }))
      .filter(f => f.main.length > 0 || f.mainImage !== null);

    if (fields.length === 0) return;

    this.cfg.set({ cycles, minutesPerField, fields });
    this.cycleIdx.set(0);
    this.fieldIdx.set(0);
    this.remainingSec.set(minutesPerField * 60);
    this.paused.set(false);
    this.metronome.resetForNewSession();
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
    this.metronome.stop();
  }

  private makeFieldGroup(row: FieldRow): FieldGroup {
    return this.fb.group({
      main: this.fb.nonNullable.control(row.main),
      mainImage: new FormControl<string | null>(row.mainImage),
      sub: this.fb.nonNullable.control(row.sub),
      subImage: new FormControl<string | null>(row.subImage),
    });
  }

  protected onPaste(event: ClipboardEvent, group: FieldGroup, slot: ImageSlot): void {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        event.preventDefault();
        if (file.size > MAX_PASTE_IMAGE_BYTES) {
          this.flashPasteError('Image too large (max 5 MB).');
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            group.controls[slot].setValue(result);
            group.controls[slot].markAsDirty();
          }
        };
        reader.onerror = () => this.flashPasteError('Could not read pasted image.');
        reader.readAsDataURL(file);
        return;
      }
    }
  }

  protected clearImage(group: FieldGroup, slot: ImageSlot): void {
    group.controls[slot].setValue(null);
    group.controls[slot].markAsDirty();
  }

  private flashPasteError(message: string): void {
    this.pasteError.set(message);
    if (this.pasteErrorTimer != null) clearTimeout(this.pasteErrorTimer);
    this.pasteErrorTimer = setTimeout(() => {
      this.pasteError.set(null);
      this.pasteErrorTimer = null;
    }, PASTE_ERROR_CLEAR_MS);
  }
}
