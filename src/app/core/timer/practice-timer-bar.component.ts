import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PracticeTimerService, type TimerMode } from './practice-timer.service';

@Component({
  selector: 'app-practice-timer-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'fz-ptimer-host',
    '[class.is-finished]': 'isFinished()',
    '[class.is-overtime]': 'isOvertime()',
  },
  template: `
    @if (!visible()) {
      <button
        type="button"
        class="fz-ptimer-reveal"
        aria-pressed="false"
        (click)="timer.toggleVisible()">
        Practice timer
      </button>
    } @else {
      <div class="fz-ptimer" role="group" aria-label="Practice timer">
        <button
          type="button"
          class="fz-ptimer-toggle"
          aria-pressed="true"
          aria-label="Hide practice timer"
          (click)="timer.toggleVisible()">
          Hide
        </button>

        <div class="fz-ptimer-modes" role="radiogroup" aria-label="Timer mode">
          <button
            type="button"
            class="fz-ptimer-mode-btn"
            [class.is-on]="mode() === 'countdown'"
            role="radio"
            [attr.aria-checked]="mode() === 'countdown'"
            (click)="onMode('countdown')">
            Countdown
          </button>
          <button
            type="button"
            class="fz-ptimer-mode-btn"
            [class.is-on]="mode() === 'stopwatch'"
            role="radio"
            [attr.aria-checked]="mode() === 'stopwatch'"
            (click)="onMode('stopwatch')">
            Stopwatch
          </button>
        </div>

        @if (mode() === 'countdown') {
          <label class="fz-ptimer-field">
            <span class="fz-ptimer-lbl">Min</span>
            <input
              type="number"
              class="fz-ptimer-input"
              min="1"
              max="240"
              step="1"
              [value]="minutes()"
              (change)="onMinutes($event)"
              aria-label="Countdown minutes" />
          </label>
        }

        <span class="fz-ptimer-readout" role="timer">{{ displayLabel() }}</span>

        @if (isFinished()) {
          <span class="fz-ptimer-badge" role="status">Time's up</span>
        } @else if (isOvertime()) {
          <span class="fz-ptimer-badge is-overtime">Overtime</span>
        }

        <button type="button" class="fz-ptimer-btn" (click)="onPrimary()">
          {{ primaryLabel() }}
        </button>
        <button
          type="button"
          class="fz-ptimer-btn"
          [disabled]="status() === 'idle'"
          (click)="timer.reset()">
          Reset
        </button>
      </div>
    }
  `,
})
export class PracticeTimerBarComponent {
  protected timer = inject(PracticeTimerService);

  protected visible = this.timer.visible;
  protected mode = this.timer.mode;
  protected minutes = this.timer.minutes;
  protected status = this.timer.status;
  protected displayLabel = this.timer.displayLabel;
  protected isFinished = this.timer.isFinished;
  protected isOvertime = this.timer.isOvertime;

  protected primaryLabel = computed(() => {
    switch (this.status()) {
      case 'running':
      case 'overtime':
        return 'Pause';
      case 'paused':
        return 'Resume';
      default:
        return 'Start';
    }
  });

  protected onPrimary(): void {
    const s = this.status();
    if (s === 'running' || s === 'overtime') this.timer.pause();
    else if (s === 'paused') this.timer.resume();
    else this.timer.start();
  }

  protected onMode(mode: TimerMode): void {
    this.timer.setMode(mode);
  }

  protected onMinutes(ev: Event): void {
    this.timer.setMinutes(Number((ev.target as HTMLInputElement).value));
  }
}
