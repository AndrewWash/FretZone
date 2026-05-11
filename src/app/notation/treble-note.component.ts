import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, viewChild } from '@angular/core';
import { AccidentalMode } from '../core/theory/note';
import { ThemeService } from '../core/theme/theme.service';
import { renderTrebleNoteEl } from './vexflow-render';

@Component({
  selector: 'app-treble-note',
  templateUrl: './treble-note.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrebleNoteComponent {
  midi = input.required<number>();
  accidentalMode = input<AccidentalMode>('Naturals');
  width = input(320);
  height = input(140);

  private host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private theme = inject(ThemeService);

  constructor() {
    effect(() => {
      renderTrebleNoteEl(this.host().nativeElement, this.midi(), {
        width: this.width(),
        height: this.height(),
        accidentalMode: this.accidentalMode(),
        theme: this.theme.notationTheme(),
      });
    });
  }
}
