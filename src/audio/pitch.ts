import { midiToFreq } from '../theory/note';

// Improved YIN-based pitch detector with RMS gate, confidence metric, and smoothing
// Inspired by de Cheveigné & Kawahara (2002) and tuned for guitar range
class YinPitchDetector {
  private sampleRate: number;
  private bufSize: number;
  private diff: Float32Array;
  private cmnd: Float32Array;

  constructor(sampleRate: number, bufferSize = 2048) {
    this.sampleRate = sampleRate;
    this.bufSize = bufferSize;
    const half = Math.floor(bufferSize / 2);
    this.diff = new Float32Array(half);
    this.cmnd = new Float32Array(half);
  }

  // Returns null if no reliable pitch is found
  detect(timeData: Float32Array, threshold = 0.1): { freq: number; probability: number } | null {
    const N = Math.min(timeData.length, this.bufSize);
    const half = Math.floor(N / 2);

    // Difference function d(tau)
    this.diff.fill(0);
    for (let tau = 1; tau < half; tau++) {
      let sum = 0;
      for (let i = 0; i < half; i++) {
        const delta = timeData[i] - timeData[i + tau];
        sum += delta * delta;
      }
      this.diff[tau] = sum;
    }

    // Cumulative mean normalized difference d'(tau)
    this.cmnd[0] = 1;
    let runningSum = 0;
    let tauEstimate = -1;
    for (let tau = 1; tau < half; tau++) {
      const d = this.diff[tau];
      runningSum += d;
      this.cmnd[tau] = d * tau / (runningSum || 1); // avoid divide by 0
    }

    // Absolute threshold search (pick the first local minimum under threshold)
    for (let tau = 2; tau < half - 1; tau++) {
      if (this.cmnd[tau] < threshold && this.cmnd[tau] <= this.cmnd[tau - 1]) {
        while (tau + 1 < half && this.cmnd[tau + 1] < this.cmnd[tau]) tau++;
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) return null;

    // Parabolic interpolation around tauEstimate for sub-sample accuracy
    const x0 = tauEstimate > 0 ? tauEstimate - 1 : tauEstimate;
    const x2 = tauEstimate + 1 < half ? tauEstimate + 1 : tauEstimate;
    const s0 = this.cmnd[x0];
    const s1 = this.cmnd[tauEstimate];
    const s2 = this.cmnd[x2];
    const denom = 2 * (2 * s1 - s2 - s0) || 1;
    const betterTau = tauEstimate + (x2 - x0) * (s2 - s0) / denom;

    const freq = this.sampleRate / betterTau;
    if (!isFinite(freq) || freq <= 0) return null;

    const probability = Math.max(0, Math.min(1, 1 - s1));
    return { freq, probability };
  }
}

// Stream pitch estimates with gating and smoothing
// - Applies an RMS noise gate to ignore silence/background
// - Uses YIN with confidence metric
// - Returns null for low confidence or out-of-range values
// - Throttles callbacks and debounces nulls so UI can register stable notes
export function stablePitchStream(analyser: AnalyserNode, onPitch: (hz: number | null) => void) {
  const ctx = analyser.context as AudioContext;
  const N = analyser.fftSize;
  const timeData = new Float32Array(N);
  const detector = new YinPitchDetector(ctx.sampleRate, N);

  // Config tuned for guitar
  const RMS_GATE = 0.003;         // ignore if below this signal level (slightly lower to catch softer highs)
  const CONF_THRESH = 0.6;        // minimum YIN confidence (slightly relaxed for upper strings)
  const FREQ_MIN = 50;            // Hz
  const FREQ_MAX = 1800;          // Hz (allow a bit more headroom for harmonics/false lows correction)

  // Simple smoothing over last few frames
  const history: number[] = [];
  const HISTORY_MAX = 7;
  let ema = 0;
  const EMA_ALPHA = 0.18; // 0..1 — lower alpha = steadier

  // Throttle to avoid spamming UI; and debounce brief dropouts
  const MIN_EMIT_INTERVAL_MS = 60;     // min gap between callbacks
  const MIN_HZ_CHANGE_CENTS = 6;       // require ~6 cents change to emit early
  let lastEmitTime = 0;
  let lastEmitHz: number | null = null;
  let nullStreak = 0;
  const NULL_DEBOUNCE_FRAMES = 2;      // require 2 consecutive nulls before emitting null

  let raf = 0;
  const tick = () => {
    analyser.getFloatTimeDomainData(timeData);

    // Compute RMS
    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) { const v = timeData[i]; sumSq += v * v; }
    const rms = Math.sqrt(sumSq / timeData.length);

    const now = performance.now();

    if (rms < RMS_GATE) {
      history.length = 0; ema = 0;
      // Debounce nulls
      if (nullStreak < NULL_DEBOUNCE_FRAMES) { nullStreak++; }
      else {
        if (lastEmitHz !== null) { onPitch(null); lastEmitHz = null; lastEmitTime = now; }
      }
      raf = requestAnimationFrame(tick);
      return;
    }

    const res = detector.detect(timeData, 0.1);
    if (!res || res.probability < CONF_THRESH || res.freq < FREQ_MIN || res.freq > FREQ_MAX) {
      history.length = 0; ema = 0;
      // Debounce nulls
      if (nullStreak < NULL_DEBOUNCE_FRAMES) { nullStreak++; }
      else {
        if (lastEmitHz !== null) { onPitch(null); lastEmitHz = null; lastEmitTime = now; }
      }
      raf = requestAnimationFrame(tick);
      return;
    }

    nullStreak = 0; // we have a valid estimate

    // Median of short history to reduce jitter
    history.push(res.freq);
    if (history.length > HISTORY_MAX) history.shift();
    const sorted = [...history].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // Exponential moving average for additional smoothing
    ema = ema === 0 ? median : ema + EMA_ALPHA * (median - ema);

    // Throttle emissions: only emit if enough time passed or significant change
    const shouldEmitTime = (now - lastEmitTime) >= MIN_EMIT_INTERVAL_MS;
    let shouldEmitChange = false;
    if (lastEmitHz == null) {
      shouldEmitChange = true; // coming from null
    } else {
      const cents = Math.abs(1200 * Math.log2(ema / lastEmitHz));
      shouldEmitChange = cents >= MIN_HZ_CHANGE_CENTS;
    }

    if (shouldEmitTime || shouldEmitChange) {
      onPitch(ema);
      lastEmitHz = ema;
      lastEmitTime = now;
    }

    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

// Aggregate-on-onset detector for quiz mode: wait for onset, delay a few ms, then collect ~1s and emit one locked pitch
export interface LockedNoteOptions {
  onsetDelayMs?: number;   // wait after onset before collecting (default 2ms)
  windowMs?: number;       // collection window length (default 1000ms)
  rmsGate?: number;        // silence gate
  confThresh?: number;     // YIN confidence threshold
  freqMin?: number;
  freqMax?: number;
  silenceHoldMs?: number;  // how long signal must stay below gate to arm next onset
}

export function lockedNoteStream(
  analyser: AnalyserNode,
  onLocked: (hz: number) => void,
  opts: LockedNoteOptions = {}
) {
  const ctx = analyser.context as AudioContext;
  const N = analyser.fftSize;
  const timeData = new Float32Array(N);
  const detector = new YinPitchDetector(ctx.sampleRate, N);

  const RMS_GATE = opts.rmsGate ?? 0.003;
  const CONF_THRESH = opts.confThresh ?? 0.6;
  const FREQ_MIN = opts.freqMin ?? 50;
  const FREQ_MAX = opts.freqMax ?? 1800;
  const ONSET_DELAY_MS = opts.onsetDelayMs ?? 2;
  const WINDOW_MS = opts.windowMs ?? 1000;
  const SILENCE_HOLD_MS = opts.silenceHoldMs ?? 120; // require brief silence to re-arm

  type State = 'waiting' | 'onset' | 'collect' | 'cooldown';
  let state: State = 'waiting';
  let onsetAt = 0;
  let collectUntil = 0;
  let lastBelowGateAt = performance.now();
  const samples: number[] = [];

  let raf = 0;
  const tick = () => {
    analyser.getFloatTimeDomainData(timeData);

    // Compute RMS
    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) { const v = timeData[i]; sumSq += v * v; }
    const rms = Math.sqrt(sumSq / timeData.length);
    const now = performance.now();

    // Track silence periods
    if (rms < RMS_GATE) {
      if (state !== 'collect') lastBelowGateAt = now;
      if (state === 'cooldown' && now - lastBelowGateAt >= SILENCE_HOLD_MS) {
        state = 'waiting';
        samples.length = 0;
      }
    }

    switch (state) {
      case 'waiting': {
        if (rms >= RMS_GATE) {
          onsetAt = now;
          state = 'onset';
        }
        break;
      }
      case 'onset': {
        if (rms < RMS_GATE) { // false start, go back to waiting
          state = 'waiting';
          break;
        }
        if (now - onsetAt >= ONSET_DELAY_MS) {
          samples.length = 0;
          collectUntil = now + WINDOW_MS;
          state = 'collect';
        }
        break;
      }
      case 'collect': {
        // run pitch detector and collect good frames
        const res = detector.detect(timeData, 0.1);
        if (res && res.probability >= CONF_THRESH && res.freq >= FREQ_MIN && res.freq <= FREQ_MAX) {
          samples.push(res.freq);
        }
        if (now >= collectUntil) {
          if (samples.length) {
            const sorted = samples.slice().sort((a,b)=>a-b);
            const median = sorted[Math.floor(sorted.length/2)];
            onLocked(median);
          }
          state = 'cooldown';
          lastBelowGateAt = now; // require a bit of silence before next onset
          samples.length = 0;
        }
        break;
      }
      case 'cooldown': {
        // wait for silence long enough handled at top; nothing else to do
        break;
      }
    }

    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

export function midiDiffCents(freq: number, midi: number, a4 = 440): number {
  const ref = midiToFreq(midi, a4);
  return 1200 * Math.log2(freq / ref);
}
