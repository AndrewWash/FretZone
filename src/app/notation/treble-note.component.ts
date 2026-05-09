import { ChangeDetectionStrategy, Component, ElementRef, effect, input, viewChild } from '@angular/core';
import { AccidentalMode } from '../core/theory/note';
import { renderTrebleNoteEl } from './vexflow-render';

@Component({
  selector: 'app-treble-note',
  template: `<div #host class="flex justify-center"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrebleNoteComponent {
  midi = input.required<number>();
  accidentalMode = input<AccidentalMode>('Naturals');
  width = input(320);
  height = input(140);

  private host = viewChild.required<ElementRef<HTMLDivElement>>('host');

  constructor() {
    effect(() => {
      renderTrebleNoteEl(this.host().nativeElement, this.midi(), {
        width: this.width(),
        height: this.height(),
        accidentalMode: this.accidentalMode(),
      });
    });
  }
}
