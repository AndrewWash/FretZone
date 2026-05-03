export type MicState = 'idle' | 'starting' | 'running' | 'stopped' | 'error';

export class MicService {
  private audioCtx?: AudioContext;
  private mediaStream?: MediaStream;
  private sourceNode?: MediaStreamAudioSourceNode;
  private analyser?: AnalyserNode;
  private state: MicState = 'idle';

  getState() { return this.state; }
  getContext() { return this.audioCtx; }
  getAnalyser() { return this.analyser; }

  async start(constraints: MediaStreamConstraints = { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }): Promise<void> {
    if (this.state === 'running') return;
    this.state = 'starting';
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStream = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.audioCtx = ctx;
      const source = ctx.createMediaStreamSource(stream);
      this.sourceNode = source;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096; // higher for better low‑freq resolution
      analyser.smoothingTimeConstant = 0.0; // time-domain detection prefers no built-in smoothing
      source.connect(analyser);
      this.analyser = analyser;
      this.state = 'running';
    } catch (e) {
      console.error('Mic start error', e);
      this.state = 'error';
      throw e;
    }
  }

  stop() {
    try {
      this.mediaStream?.getTracks().forEach(t => t.stop());
      this.audioCtx?.close();
    } finally {
      this.mediaStream = undefined;
      this.sourceNode = undefined;
      this.analyser = undefined;
      this.audioCtx = undefined;
      this.state = 'stopped';
    }
  }
}
