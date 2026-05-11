import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, viewChild } from '@angular/core';
import { ThemeService } from '../core/theme/theme.service';
import { Spelled, renderStaffEl } from './vexflow-render';

@Component({
  selector: 'app-staff',
  templateUrl: './staff.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffComponent {
  n1 = input.required<Spelled>();
  n2 = input.required<Spelled>();
  mode = input<'Dyad' | 'Sequential'>('Dyad');

  private host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private theme = inject(ThemeService);

  constructor() {
    effect(() => {
      renderStaffEl(this.host().nativeElement, this.n1(), this.n2(), this.mode(), {
        theme: this.theme.notationTheme(),
      });
    });
  }
}
