import { midiToFreq } from '../theory/note';

// Lightweight YIN pitch detector inspired by de Cheveigné & Kawahara 2002
export class PitchDetector {
  private sampleRate: number;
  private buf: Float32Array;

  constructor(sampleRate: number, bufferSize = 2048) {
    this.sampleRate = sampleRate;
    this.buf = new Float32Array(bufferSize);
  }

  detectFrom(analyser: AnalyserNode): number | null {
    const bufferLen = this.buf.length;
    const timeData = new Float32Array(bufferLen);
    analyser.getFloatTimeDomainData(timeData);

    // YIN differences
    const yin = new Float32Array(bufferLen / 2);
    let runningSum = 0;

    for (let tau = 1; tau < yin.length; tau++) {
      let sum = 0;
      for (let i = 0; i < yin.length; i++) {
        const delta = timeData[i] - timeData[i + tau];
        sum += delta * delta;
      }
      runningSum += sum;
      yin[tau] = runningSum === 0 ? 1 : sum / runningSum;
    }

    // absolute threshold
    const threshold = 0.1;
    let tauEstimate = -1;
    for (let tau = 2; tau < yin.length; tau++) {
      if (yin[tau] < threshold) {
        while (tau + 1 < yin.length && yin[tau + 1] < yin[tau]) tau++;
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) return null;

    // parabolic interpolation for better tau estimate
    const x0 = tauEstimate < 1 ? tauEstimate : tauEstimate - 1;
    const x2 = tauEstimate + 1 < yin.length ? tauEstimate + 1 : tauEstimate;
    const s0 = yin[x0];
    const s1 = yin[tauEstimate];
    const s2 = yin[x2];
    const betterTau = tauEstimate + (x2 - x0) * (s2 - s0) / (2 * (2 * s1 - s2 - s0));

    const freq = this.sampleRate / betterTau;
    if (!isFinite(freq) || freq <= 0) return null;
    return freq;
  }
}

export function stablePitchStream(analyser: AnalyserNode, onPitch: (hz: number|null) => void) {
  const ctx = analyser.context as AudioContext;
  const detector = new PitchDetector(ctx.sampleRate, analyser.fftSize);
  let raf = 0;

  const tick = () => {
    const hz = detector.detectFrom(analyser);
    onPitch(hz);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

export function midiDiffCents(freq: number, midi: number, a4 = 440): number {
  const ref = midiToFreq(midi, a4);
  return 1200 * Math.log2(freq / ref);
}
