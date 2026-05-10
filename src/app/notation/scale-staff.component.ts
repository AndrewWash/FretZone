import { ChangeDetectionStrategy, Component, ElementRef, effect, input, viewChild } from '@angular/core';
import type { BaseLetter } from '../core/theory/note';
import type { ModeName } from '../core/theory/modes';
import { renderScaleEl, type ScaleRenderNote } from './vexflow-render';

@Component({
  selector: 'app-scale-staff',
  templateUrl: './scale-staff.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScaleStaffComponent {
  notes = input.required<ScaleRenderNote[]>();
  playedCount = input<number>(0);
  tonic = input<BaseLetter>('C');
  tonicOffset = input<0 | 1 | -1>(0);
  mode = input<ModeName>('Ionian');
  width = input(960);
  showTab = input<boolean>(false);
  showFingerings = input<boolean>(false);
  rowBreaks = input<number[]>([]);
  isMelodicMinor = input<boolean>(false);

  private host = viewChild.required<ElementRef<HTMLDivElement>>('host');

  constructor() {
    effect(() => {
      renderScaleEl(this.host().nativeElement, this.notes(), this.playedCount(), {
        width: this.width(),
        tonic: this.tonic(),
        tonicOffset: this.tonicOffset(),
        mode: this.mode(),
        showTab: this.showTab(),
        showFingerings: this.showFingerings(),
        rowBreaks: this.rowBreaks(),
        isMelodicMinor: this.isMelodicMinor(),
      });
    });
  }
}
