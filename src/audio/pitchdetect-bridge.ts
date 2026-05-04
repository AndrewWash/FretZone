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
      const w = (window as any);
      // If already present, resolve immediately
      if (w.autoCorrelate && w.startPitchDetect) {
        console.info('[PitchDetectBridge] Legacy script already present; skipping load');
        resolve();
        return;
      }
      if (!('isSecureContext' in window) || !window.isSecureContext) {
        console.warn('[PitchDetectBridge] Page is not a secure context (https or localhost). Mic will be blocked by browser.');
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('[PitchDetectBridge] navigator.mediaDevices.getUserMedia is not available in this context');
      }
      const s = document.createElement('script');
      s.src = '/vendor/pitchdetect.js'; // served from Vite public/ with proper MIME
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.onload = () => {
        console.info('[PitchDetectBridge] Loaded /vendor/pitchdetect.js');
        if (!(w.autoCorrelate && w.startPitchDetect)) {
          console.error('[PitchDetectBridge] pitchdetect.js loaded but expected globals not found');
          reject(new Error('pitchdetect.js did not expose expected globals'));
          return;
        }
        resolve();
      };
      s.onerror = (e) => {
        console.error('[PitchDetectBridge] Failed to load /vendor/pitchdetect.js', e);
        reject(new Error('Failed to load pitchdetect.js'));
      };
      document.head.appendChild(s);
    });
    return this.scriptLoaded;
  }

  async startLive(): Promise<void> {
    await this.ensureLoaded();
    console.info('[PitchDetectBridge] Starting live mic...');
    // Call the legacy library to start the mic flow.
    try {
      const w = (window as any);
      const startPitchDetect = w.startPitchDetect as (() => void) | undefined;
      if (!startPitchDetect) throw new Error('startPitchDetect not found');
      startPitchDetect();
      // Some browsers require resuming AudioContext after a user gesture.
      setTimeout(() => {
        try {
          const ac: AudioContext | undefined = w.audioContext;
          if (ac && ac.state === 'suspended' && typeof ac.resume === 'function') {
            console.info('[PitchDetectBridge] Resuming suspended AudioContext...');
            ac.resume().catch((err: any) => console.warn('[PitchDetectBridge] AudioContext.resume failed', err));
          }
        } catch (e) {
          console.warn('[PitchDetectBridge] AudioContext resume check failed', e);
        }
      }, 0);
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
