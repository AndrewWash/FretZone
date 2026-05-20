import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, viewChild } from '@angular/core';
import { BaseLetter } from '../core/theory/note';
import { ModeName } from '../core/theory/modes';
import type { MelodyTickable, TimeSignature } from '../core/melody/models';
import { ThemeService } from '../core/theme/theme.service';
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
  timeSignature = input<TimeSignature>('4/4');

  private host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private theme = inject(ThemeService);

  constructor() {
    effect(() => {
      renderMelodyEl(this.host().nativeElement, this.bars(), this.playedCount(), {
        width: this.width(),
        tonic: this.tonic(),
        mode: this.mode(),
        timeSignature: this.timeSignature(),
        theme: this.theme.notationTheme(),
      });
    });
  }
}
