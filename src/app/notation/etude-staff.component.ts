import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, viewChild } from '@angular/core';
import { ThemeService } from '../core/theme/theme.service';
import { renderEtudeEl } from './vexflow-render';
import type { SorEtude } from '../core/sor/models';

@Component({
  selector: 'app-etude-staff',
  template: `<div #host class="etude-staff-host" aria-hidden="true"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EtudeStaffComponent {
  etude = input.required<SorEtude>();
  playedCount = input<number>(0);
  width = input(960);
  showTab = input<boolean>(false);
  showLhFingerings = input<boolean>(false);
  showRhFingerings = input<boolean>(false);
  barsPerRow = input<number>(4);
  barLabels = input<number[] | null>(null);
  sectionBreaks = input<boolean[] | null>(null);

  private host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private theme = inject(ThemeService);

  constructor() {
    effect(() => {
      renderEtudeEl(this.host().nativeElement, this.etude(), this.playedCount(), {
        width: this.width(),
        showTab: this.showTab(),
        showLhFingerings: this.showLhFingerings(),
        showRhFingerings: this.showRhFingerings(),
        barsPerRow: this.barsPerRow(),
        barLabels: this.barLabels(),
        sectionBreaks: this.sectionBreaks(),
        theme: this.theme.notationTheme(),
      });
    });
  }
}
