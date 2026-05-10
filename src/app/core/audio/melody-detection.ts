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
const POST_NOTE_IGNORE_MS = 120;

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

  const targets = cfg.midis.map(m => midiToFreq(m, cfg.a4));

  const withinTol = (hz: number, target: number) => {
    const cents = 1200 * Math.log2(hz / target);
    return Math.abs(cents) <= cfg.centsTolerance;
  };
  const withinStability = (hz: number, ref: number) => {
    const cents = 1200 * Math.log2(hz / ref);
    return Math.abs(cents) <= STABILITY_CENTS;
  };

  const handleHz = (hz: number) => {
    if (completed) return;
    cbs.onHeard?.(hz);
    const now = Date.now();
    if (now - lastAcceptedAt < POST_NOTE_IGNORE_MS) return;
    if (idx >= targets.length) return;

    const target = targets[idx];

    // If two consecutive targets are the same MIDI, the player must release
    // and re-attack — but our detection is monophonic, so we treat any match
    // that holds for the required time as acceptance, then enter the post-
    // note ignore window so we don't double-count the same continuous tone.
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
    unsub = service.subscribe(({ hz }) => handleHz(hz));
  };

  const stop = () => {
    unsub?.();
    unsub = null;
  };

  return { start, stop };
}
