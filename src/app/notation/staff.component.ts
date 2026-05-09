import { ChangeDetectionStrategy, Component, ElementRef, effect, input, viewChild } from '@angular/core';
import { Spelled, renderStaffEl } from './vexflow-render';

@Component({
  selector: 'app-staff',
  template: `<div #host class="flex justify-center"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffComponent {
  n1 = input.required<Spelled>();
  n2 = input.required<Spelled>();
  mode = input<'Dyad' | 'Sequential'>('Dyad');

  private host = viewChild.required<ElementRef<HTMLDivElement>>('host');

  constructor() {
    effect(() => {
      renderStaffEl(this.host().nativeElement, this.n1(), this.n2(), this.mode());
    });
  }
}
