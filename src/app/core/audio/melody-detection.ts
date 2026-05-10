import { midiToFreq } from '../theory/note';
import { PitchDetectService } from './pitch-detect.service';

export interface MelodyDetectConfig {
  midis: number[];          // sounding MIDIs in order
  a4: number;
  centsTolerance: number;
}

export interface MelodyDetectCallbacks {
  onHeard?: (hz: number) => void;
  onNoteAccepted?: (idx: number) => void;
  onComplete?: () => void;
}

const HOLD_COMMIT_MS = 200;
const STABILITY_CENTS = 40;
const POST_NOTE_IGNORE_MS = 60;

// Re-arm gate: after each accept, the next acceptance is blocked until either
// the pitch leaves the just-accepted note's tolerance band, or RMS evidence
// of a fresh attack appears (current sample exceeds a recent local minimum
// by RE_ATTACK_RATIO). A sustained, decaying tone has localMin tracking the
// current sample, so the ratio stays near 1 — the gate stays shut. A real
// re-pluck spikes RMS far above the recent floor — the gate opens.
const RE_ATTACK_RATIO = 1.8;
const RMS_FLOOR = 0.01;
const HISTORY_FRAMES = 12; // ~200ms at 60fps
const MIN_HISTORY_FRAMES = 6;

export function startMelodyDetection(
  service: PitchDetectService,
  cfg: MelodyDetectConfig,
  cbs: MelodyDetectCallbacks = {},
) {
  let unsub: (() => void) | null = null;
  let idx = 0;
  let holdStartAt: number | null = null;
  let holdRefHz: number | null = null;
  let lastAcceptedAt = Date.now();
  let completed = false;

  // Re-arm state
  let armed = true;                       // first note can fire immediately
  let acceptedTargetHz: number | null = null;
  const rmsHistory: number[] = [];

  const targets = cfg.midis.map(m => midiToFreq(m, cfg.a4));

  const withinTol = (hz: number, target: number) => {
    const cents = 1200 * Math.log2(hz / target);
    return Math.abs(cents) <= cfg.centsTolerance;
  };
  const withinStability = (hz: number, ref: number) => {
    const cents = 1200 * Math.log2(hz / ref);
    return Math.abs(cents) <= STABILITY_CENTS;
  };

  const pushRms = (rms: number) => {
    rmsHistory.push(rms);
    if (rmsHistory.length > HISTORY_FRAMES) rmsHistory.shift();
  };
  const localMinRms = () => {
    let m = Infinity;
    for (const v of rmsHistory) if (v < m) m = v;
    return m === Infinity ? 0 : m;
  };

  const handleFrame = ({ hz, rms }: { hz: number; rms: number }) => {
    if (completed) return;
    if (hz > 0) cbs.onHeard?.(hz);

    pushRms(rms);

    const now = Date.now();
    if (now - lastAcceptedAt < POST_NOTE_IGNORE_MS) return;
    if (idx >= targets.length) return;

    if (!armed) {
      // Path A: pitch moved off the just-accepted note → next note is coming.
      if (acceptedTargetHz != null && hz > 0 && !withinTol(hz, acceptedTargetHz)) {
        armed = true;
      }
      // Path B: amplitude evidence of a fresh strike on the same pitch.
      else if (rmsHistory.length >= MIN_HISTORY_FRAMES) {
        const lm = localMinRms();
        if (rms > RMS_FLOOR && rms > lm * RE_ATTACK_RATIO) {
          armed = true;
        }
      }
      if (!armed) return;
    }

    if (hz <= 0) return;

    const target = targets[idx];

    if (withinTol(hz, target)) {
      if (holdStartAt == null) {
        holdStartAt = now;
        holdRefHz = hz;
        return;
      }
      if (holdRefHz != null && !withinStability(hz, holdRefHz)) {
        holdStartAt = now;
        holdRefHz = hz;
        return;
      }
      if (now - holdStartAt >= HOLD_COMMIT_MS) {
        const acceptedIdx = idx;
        idx++;
        lastAcceptedAt = now;
        holdStartAt = null;
        holdRefHz = null;
        armed = false;
        acceptedTargetHz = target;
        rmsHistory.length = 0;
        cbs.onNoteAccepted?.(acceptedIdx);
        if (idx >= targets.length) {
          completed = true;
          cbs.onComplete?.();
        }
      }
    } else {
      holdStartAt = null;
      holdRefHz = null;
    }
  };

  const start = async () => {
    await service.startLive();
    unsub?.();
    unsub = service.subscribeFrames(handleFrame);
  };

  const stop = () => {
    unsub?.();
    unsub = null;
  };

  return { start, stop };
}
