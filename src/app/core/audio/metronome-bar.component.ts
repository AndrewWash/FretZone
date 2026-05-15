import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MetronomeService, type TimeSig } from './metronome.service';

@Component({
  selector: 'app-metronome-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fz-metronome" role="group" aria-label="Metronome">
      <span class="fz-metronome-lbl" aria-hidden="true">Metronome</span>
      <button
        type="button"
        class="fz-metronome-toggle"
        [class.is-on]="enabled()"
        [attr.aria-pressed]="enabled()"
        (click)="metronome.toggle()">
        <span class="fz-metronome-toggle-dot" aria-hidden="true"></span>
        <span>{{ enabled() ? 'On' : 'Off' }}</span>
      </button>

      <span
        class="fz-metronome-pulse"
        [class.is-down]="isDown()"
        [class.is-pulsing]="enabled()"
        [attr.data-beat]="beatIdx()"
        aria-hidden="true"></span>

      <label class="fz-metronome-field">
        <span class="fz-metronome-lbl">Tempo</span>
        <input
          type="range"
          class="fz-metronome-slider"
          min="40"
          max="240"
          step="1"
          [value]="bpm()"
          (input)="onBpmInput($event)"
          aria-label="Tempo, beats per minute"
          [attr.aria-valuetext]="bpm() + ' beats per minute'" />
        <span class="fz-metronome-readout">{{ bpm() }} BPM</span>
      </label>

      <div class="fz-metronome-sig" role="radiogroup" aria-label="Time signature">
        <button
          type="button"
          class="fz-metronome-sig-btn"
          [class.is-on]="timeSig() === '2/4'"
          role="radio"
          [attr.aria-checked]="timeSig() === '2/4'"
          (click)="metronome.setTimeSig('2/4')">2/4</button>
        <button
          type="button"
          class="fz-metronome-sig-btn"
          [class.is-on]="timeSig() === '3/4'"
          role="radio"
          [attr.aria-checked]="timeSig() === '3/4'"
          (click)="metronome.setTimeSig('3/4')">3/4</button>
      </div>

      <label class="fz-metronome-field">
        <span class="fz-metronome-lbl">Volume</span>
        <input
          type="range"
          class="fz-metronome-slider"
          min="0"
          max="1"
          step="0.01"
          [value]="volume()"
          (input)="onVolumeInput($event)"
          aria-label="Volume, percent"
          [attr.aria-valuetext]="volumePct() + ' percent'" />
        <span class="fz-metronome-readout">{{ volumePct() }}%</span>
      </label>
    </div>
  `,
})
export class MetronomeBarComponent {
  protected metronome = inject(MetronomeService);

  protected enabled = this.metronome.enabled;
  protected bpm = this.metronome.bpm;
  protected volume = this.metronome.volume;
  protected timeSig = this.metronome.timeSig;
  protected beatIdx = this.metronome.beatIdx;

  protected volumePct = computed(() => Math.round(this.volume() * 100));
  protected isDown = computed(() => this.beatIdx() === 0);

  protected onBpmInput(ev: Event): void {
    const n = Number((ev.target as HTMLInputElement).value);
    this.metronome.setBpm(n);
  }

  protected onVolumeInput(ev: Event): void {
    const v = Number((ev.target as HTMLInputElement).value);
    this.metronome.setVolume(v);
  }

  protected setTimeSig(s: TimeSig): void {
    this.metronome.setTimeSig(s);
  }
}
