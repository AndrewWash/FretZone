/*
 A thin bridge to use the legacy zPitchDetect pitchdetect.js directly from TypeScript.
 It dynamically loads the script, starts one of its input modes, and exposes a
 simple subscription to detected pitch (Hz) values computed using its own
 autoCorrelate() on the global analyser.
*/

export type PitchData = { hz: number };
export type Unsubscribe = () => void;

class Bridge {
  private scriptLoaded: Promise<void> | null = null;
  private rafId: number | null = null;
  private subscribers = new Set<(d: PitchData) => void>();

  private ensureLoaded(): Promise<void> {
    if (this.scriptLoaded) return this.scriptLoaded;
    this.scriptLoaded = new Promise((resolve, reject) => {
      // If already present, resolve immediately
      if ((window as any).autoCorrelate && (window as any).AudioContext) {
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
    // Call the library to start the mic flow. This will also start its own RAF update,
    // but we run our own lightweight reader to emit raw Hz values for our app.
    try {
      const startPitchDetect = (window as any).startPitchDetect as (() => void) | undefined;
      if (startPitchDetect) startPitchDetect(); else throw new Error('startPitchDetect not found');
    } catch (e) {
      console.error('PitchDetectBridge.startLive: failed to start mic', e);
      throw e;
    }
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
    // Stop our own loop
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    // Try to stop the legacy loop/source if running
    const w = (window as any);
    if (w.rafID && w.cancelAnimationFrame) {
      try { w.cancelAnimationFrame(w.rafID); } catch {}
    }
    try {
      if (w.sourceNode && typeof w.sourceNode.stop === 'function') {
        w.sourceNode.stop(0);
      }
    } catch {}
    // Note: media stream from getUserMedia is not explicitly stopped by the lib; we leave it as-is.
  }

  subscribe(cb: (d: PitchData) => void): Unsubscribe {
    this.subscribers.add(cb);
    return () => { this.subscribers.delete(cb); };
  }

  private startReaderLoop() {
    if (this.rafId != null) return; // already running
    const w = (window as any) as {
      analyser?: AnalyserNode;
      audioContext?: AudioContext;
      autoCorrelate?: (buf: Float32Array, sampleRate: number) => number;
      buflen?: number;
      buf?: Float32Array;
    } & any;

    const step = () => {
      try {
        const analyser: AnalyserNode | undefined = w.analyser;
        const ac: AudioContext | undefined = w.audioContext;
        const autoCorrelate: ((b: Float32Array, s: number) => number) | undefined = (w as any).autoCorrelate;
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
      } catch (e) {
        // swallow per-frame errors
      }
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }
}

export const PitchDetectBridge = new Bridge();
