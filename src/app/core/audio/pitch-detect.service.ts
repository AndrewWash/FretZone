import { Injectable } from '@angular/core';

export type PitchData = { hz: number };
export type Unsubscribe = () => void;

@Injectable({ providedIn: 'root' })
export class PitchDetectService {
  private scriptLoaded: Promise<void> | null = null;
  private rafId: number | null = null;
  private subscribers = new Set<(d: PitchData) => void>();

  private ensureLoaded(): Promise<void> {
    if (this.scriptLoaded) return this.scriptLoaded;
    this.scriptLoaded = new Promise((resolve, reject) => {
      const w = window as any;
      if (w.autoCorrelate && w.AudioContext) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = 'zPitchDetect/PitchDetect-main/PitchDetect-main/js/pitchdetect.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load pitchdetect.js'));
      document.head.appendChild(s);
    });
    return this.scriptLoaded;
  }

  async startLive(): Promise<void> {
    await this.ensureLoaded();
    const startPitchDetect = (window as any).startPitchDetect as (() => void) | undefined;
    if (!startPitchDetect) throw new Error('startPitchDetect not found');
    startPitchDetect();
    this.startReaderLoop();
  }

  async startOsc(): Promise<void> {
    await this.ensureLoaded();
    const toggleOsc = (window as any).toggleOscillator as (() => void) | undefined;
    if (toggleOsc) toggleOsc();
    this.startReaderLoop();
  }

  async startDemo(): Promise<void> {
    await this.ensureLoaded();
    const togglePlayback = (window as any).togglePlayback as (() => void) | undefined;
    if (togglePlayback) togglePlayback();
    this.startReaderLoop();
  }

  stop(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    const w = window as any;
    if (w.rafID) {
      try { cancelAnimationFrame(w.rafID); } catch {}
    }
    try {
      if (w.sourceNode && typeof w.sourceNode.stop === 'function') {
        w.sourceNode.stop(0);
      }
    } catch {}
  }

  subscribe(cb: (d: PitchData) => void): Unsubscribe {
    this.subscribers.add(cb);
    return () => { this.subscribers.delete(cb); };
  }

  private startReaderLoop() {
    if (this.rafId != null) return;
    const w = window as any;

    const step = () => {
      try {
        const analyser: AnalyserNode | undefined = w.analyser;
        const ac: AudioContext | undefined = w.audioContext;
        const autoCorrelate: ((b: Float32Array, s: number) => number) | undefined = w.autoCorrelate;
        if (analyser && ac && autoCorrelate) {
          const size = analyser.fftSize || 2048;
          const buf = new Float32Array(size);
          analyser.getFloatTimeDomainData(buf);
          const hz = autoCorrelate(buf, ac.sampleRate);
          if (hz && hz > 0 && isFinite(hz)) {
            const payload = { hz };
            this.subscribers.forEach(fn => { try { fn(payload); } catch {} });
          }
        }
      } catch {}
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }
}
