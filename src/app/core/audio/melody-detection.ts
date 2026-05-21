import { midiToFreq } from '../theory/note';
import { PitchDetectService } from './pitch-detect.service';

// Each position is either a single MIDI (regular note) or an array of MIDIs
// (chord / multi-note — any of the pitches landing within tolerance counts).
export type MelodyDetectTarget = number | number[];

export interface MelodyDetectConfig {
  midis: MelodyDetectTarget[]; // sounding MIDIs in order; arrays = chord groups
  a4: number;
  centsTolerance: number;
  // When true, the first note is NOT armed at start. A tone left ringing from
  // a previous iteration cannot be counted as the first note — the re-arm gate
  // must open first (the pitch leaves the first note's band, or a fresh RMS
  // attack appears). Use for every iteration after the first.
  requireFreshAttack?: boolean;
}

export interface MelodyDetectCallbacks {
  onHeard?: (hz: number) => void;
  onNoteAccepted?: (idx: number) => void;
  onComplete?: () => void;
}

const HOLD_COMMIT_MS = 90;
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

  // Normalize each position to an array of target frequencies. A single-pitch
  // position becomes a 1-element array; chord positions become N-element. The
  // detector then accepts a position when hz lands within tolerance of ANY of
  // its targets — so a chord counts as "played" if even one of its pitches is
  // detected on the mic.
  const targetGroups: number[][] = cfg.midis.map(m =>
    Array.isArray(m) ? m.map(x => midiToFreq(x, cfg.a4)) : [midiToFreq(m, cfg.a4)]
  );

  // Re-arm state. With requireFreshAttack the first position starts un-armed
  // and its target group is seeded as the "just-accepted" pitches, so a
  // leftover ringing tone is held off by the same gate that separates repeats.
  let armed = !cfg.requireFreshAttack;
  let acceptedTargetsHz: number[] | null = cfg.requireFreshAttack
    ? targetGroups[0] ?? null
    : null;
  const rmsHistory: number[] = [];

  const withinTol = (hz: number, target: number) => {
    const cents = 1200 * Math.log2(hz / target);
    return Math.abs(cents) <= cfg.centsTolerance;
  };
  const anyWithinTol = (hz: number, targets: number[]) =>
    targets.some(t => withinTol(hz, t));
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
    if (idx >= targetGroups.length) return;

    if (!armed) {
      // Path A: pitch moved off ALL just-accepted pitches → next note is coming.
      // Suppressed for the very first position under requireFreshAttack: there
      // the gating pitches ARE the first targets, so a spurious decay-time
      // reading would arm the gate and let a tone left ringing from the
      // previous iteration commit. Only a real re-attack (Path B) may start it.
      const allowPathA = !(cfg.requireFreshAttack && idx === 0);
      if (allowPathA && acceptedTargetsHz != null && hz > 0 && !anyWithinTol(hz, acceptedTargetsHz)) {
        armed = true;
      }
      // Path B: amplitude evidence of a fresh strike.
      else if (rmsHistory.length >= MIN_HISTORY_FRAMES) {
        const lm = localMinRms();
        if (rms > RMS_FLOOR && rms > lm * RE_ATTACK_RATIO) {
          armed = true;
        }
      }
      if (!armed) return;
    }

    if (hz <= 0) return;

    const group = targetGroups[idx];

    if (anyWithinTol(hz, group)) {
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
        acceptedTargetsHz = group;
        rmsHistory.length = 0;
        cbs.onNoteAccepted?.(acceptedIdx);
        if (idx >= targetGroups.length) {
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
