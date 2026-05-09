import { PitchDetectBridge } from '../audio/pitchdetect-bridge';
import { midiToFreq } from '../theory/note';

export type DetectStatus = 'Idle'|'WaitingBottom'|'WaitingTop'|'Success';

export interface DetectConfig {
  bottomMidi: number;
  topMidi: number;
  a4: number;
  centsTolerance: number;
}

export interface DetectCallbacks {
  onHeard?: (hz: number) => void;
  onBottomAccepted?: (hz: number) => void;
  onTopAccepted?: (hz: number) => void;
  onSuccess?: () => void;
  onStatus?: (s: DetectStatus) => void;
}

// Copied baseline thresholds from quiz.ts so they can be tuned here independently later
const HOLD_COMMIT_MS = 500;   // require ~0.5s of stable pitch to commit
const STABILITY_CENTS = 35;   // window around first detected freq counts as "stable"
const POST_PROMPT_IGNORE_MS = 400; // ignore carryover

export function startTwoNoteDetection(cfg: DetectConfig, cbs: DetectCallbacks = {}) {
  let unsub: (()=>void)|null = null;
  let status: DetectStatus = 'WaitingBottom';
  cbs.onStatus?.(status);

  const targetBottomHz = midiToFreq(cfg.bottomMidi, cfg.a4);
  const targetTopHz = midiToFreq(cfg.topMidi, cfg.a4);

  let holdStartAt: number | null = null;
  let holdRefHz: number | null = null;
  let promptChangedAt: number = Date.now();
  let acceptedBottom = false;
  let lastAcceptedMidi: number | null = null;

  const withinTol = (hz: number, target: number) => {
    const cents = 1200 * Math.log2(hz / target);
    return Math.abs(cents) <= cfg.centsTolerance;
  };
  const withinStability = (hz: number, ref: number) => {
    const cents = 1200 * Math.log2(hz / ref);
    return Math.abs(cents) <= STABILITY_CENTS;
  };

  const handleHz = (hz: number) => {
    cbs.onHeard?.(hz);

    const now = Date.now();
    if (now - promptChangedAt < POST_PROMPT_IGNORE_MS) return;

    const targetHz = status === 'WaitingBottom' ? targetBottomHz : targetTopHz;
    const targetMidi = status === 'WaitingBottom' ? cfg.bottomMidi : cfg.topMidi;

    // Ignore repeats of the previously accepted midi while waiting for top
    if (status === 'WaitingTop' && lastAcceptedMidi === cfg.bottomMidi) {
      // Allow if this is far from bottom but close to top
      if (withinTol(hz, targetBottomHz) && !withinTol(hz, targetTopHz)) return;
    }

    if (withinTol(hz, targetHz)) {
      if (holdStartAt == null) { holdStartAt = now; holdRefHz = hz; return; }
      if (holdRefHz != null && withinStability(hz, holdRefHz)) {
        if (now - (holdStartAt ?? now) >= HOLD_COMMIT_MS) {
          // Commit
          if (status === 'WaitingBottom') {
            acceptedBottom = true;
            lastAcceptedMidi = cfg.bottomMidi;
            cbs.onBottomAccepted?.(hz);
            status = 'WaitingTop';
            cbs.onStatus?.(status);
            // reset hold
            holdStartAt = null; holdRefHz = null; promptChangedAt = now;
          } else if (status === 'WaitingTop') {
            lastAcceptedMidi = cfg.topMidi;
            cbs.onTopAccepted?.(hz);
            status = 'Success';
            cbs.onStatus?.(status);
            cbs.onSuccess?.();
          }
        }
      } else {
        // broke stability window
        holdStartAt = now; holdRefHz = hz;
      }
    } else {
      // out of tolerance => reset hold
      holdStartAt = null; holdRefHz = null;
    }
  };

  const start = async () => {
    await PitchDetectBridge.startLive();
    unsub?.();
    unsub = PitchDetectBridge.subscribe(({ hz }) => handleHz(hz));
  };

  const stop = () => { unsub?.(); unsub = null; };

  return { start, stop };
}
