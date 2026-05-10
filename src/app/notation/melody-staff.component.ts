import { ChangeDetectionStrategy, Component, ElementRef, effect, input, viewChild } from '@angular/core';
import { BaseLetter } from '../core/theory/note';
import { ModeName } from '../core/theory/modes';
import type { MelodyTickable } from '../core/melody/models';
import { renderMelodyEl } from './vexflow-render';

@Component({
  selector: 'app-melody-staff',
  templateUrl: './melody-staff.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MelodyStaffComponent {
  bars = input.required<MelodyTickable[][]>();
  playedCount = input<number>(0);
  tonic = input<BaseLetter>('C');
  mode = input<ModeName>('Ionian');
  width = input(720);

  private host = viewChild.required<ElementRef<HTMLDivElement>>('host');

  constructor() {
    effect(() => {
      renderMelodyEl(this.host().nativeElement, this.bars(), this.playedCount(), {
        width: this.width(),
        tonic: this.tonic(),
        mode: this.mode(),
      });
    });
  }
}
