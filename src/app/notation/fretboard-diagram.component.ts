import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type FretboardDotKind = 'fingering' | 'tonic' | 'reference';

export interface FretboardDot {
  stringId: 1 | 2 | 3 | 4 | 5 | 6;  // 1 = high E (top of diagram), 6 = low E (bottom)
  fret: number;                     // 0 = open string (drawn at the nut)
  kind: FretboardDotKind;
  label?: string;                   // shown inside fingering dots
}

interface RenderedDot {
  cx: number;
  cy: number;
  kind: FretboardDotKind;
  label?: string;
}

@Component({
  selector: 'app-fretboard-diagram',
  templateUrl: './fretboard-diagram.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FretboardDiagramComponent {
  dots = input.required<FretboardDot[]>();
  caption = input<string>('');
  startFret = input<number>(1);
  fretCount = input<number>(8);
  fretGap = input<number>(38);
  // The diagram orients with high E at the top (string 1) — matches the
  // visual convention used in classical-guitar pattern books.

  // Geometry (in SVG units; viewBox-driven so it scales freely).
  private readonly leftPad = 26;
  private readonly rightPad = 18;
  private readonly topPad = 28;
  private readonly bottomPad = 18;
  private readonly stringGap = 18;
  private readonly stringCount = 6;

  protected width = computed(
    () => this.leftPad + this.rightPad + this.fretCount() * this.fretGap(),
  );
  protected height = computed(
    () => this.topPad + this.bottomPad + (this.stringCount - 1) * this.stringGap,
  );

  protected stringYs = computed(() => {
    const ys: number[] = [];
    for (let s = 1; s <= this.stringCount; s++) {
      ys.push(this.topPad + (s - 1) * this.stringGap);
    }
    return ys;
  });

  protected fretXs = computed(() => {
    const xs: number[] = [];
    const gap = this.fretGap();
    for (let f = 0; f <= this.fretCount(); f++) {
      xs.push(this.leftPad + f * gap);
    }
    return xs;
  });

  protected fretLabels = computed(() => {
    // Label every fret between startFret and startFret+fretCount(); shown
    // below the diagram.
    const labels: { x: number; text: string }[] = [];
    const start = this.startFret();
    const gap = this.fretGap();
    for (let f = 1; f <= this.fretCount(); f++) {
      const x = this.leftPad + f * gap - gap / 2;
      labels.push({ x, text: String(start + f - 1) });
    }
    return labels;
  });

  protected renderedDots = computed<RenderedDot[]>(() => {
    const dots = this.dots();
    const start = this.startFret();
    const gap = this.fretGap();
    const out: RenderedDot[] = [];
    for (const d of dots) {
      const inWindow = d.fret >= start && d.fret <= start + this.fretCount() - 1;
      if (!inWindow && d.fret !== 0) continue;
      const cy = this.topPad + (d.stringId - 1) * this.stringGap;
      const cx =
        d.fret === 0
          ? this.leftPad - 12
          : this.leftPad + (d.fret - start + 1) * gap - gap / 2;
      out.push({ cx, cy, kind: d.kind, label: d.label });
    }
    return out;
  });
}
