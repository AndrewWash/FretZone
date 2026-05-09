import { midiToFreq } from '../theory/note';
import { PitchDetectService } from './pitch-detect.service';

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

const HOLD_COMMIT_MS = 500;
const STABILITY_CENTS = 35;
const POST_PROMPT_IGNORE_MS = 400;

export function startTwoNoteDetection(
  service: PitchDetectService,
  cfg: DetectConfig,
  cbs: DetectCallbacks = {},
) {
  let unsub: (() => void) | null = null;
  let status: DetectStatus = 'WaitingBottom';
  cbs.onStatus?.(status);

  const targetBottomHz = midiToFreq(cfg.bottomMidi, cfg.a4);
  const targetTopHz = midiToFreq(cfg.topMidi, cfg.a4);

  let holdStartAt: number | null = null;
  let holdRefHz: number | null = null;
  let promptChangedAt: number = Date.now();
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

    if (status === 'WaitingTop' && lastAcceptedMidi === cfg.bottomMidi) {
      if (withinTol(hz, targetBottomHz) && !withinTol(hz, targetTopHz)) return;
    }

    if (withinTol(hz, targetHz)) {
      if (holdStartAt == null) { holdStartAt = now; holdRefHz = hz; return; }
      if (holdRefHz != null && withinStability(hz, holdRefHz)) {
        if (now - (holdStartAt ?? now) >= HOLD_COMMIT_MS) {
          if (status === 'WaitingBottom') {
            lastAcceptedMidi = cfg.bottomMidi;
            cbs.onBottomAccepted?.(hz);
            status = 'WaitingTop';
            cbs.onStatus?.(status);
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
        holdStartAt = now; holdRefHz = hz;
      }
    } else {
      holdStartAt = null; holdRefHz = null;
    }
  };

  const start = async () => {
    await service.startLive();
    unsub?.();
    unsub = service.subscribe(({ hz }) => handleHz(hz));
  };

  const stop = () => { unsub?.(); unsub = null; };

  return { start, stop };
}
