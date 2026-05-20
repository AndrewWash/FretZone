// Generic tempo-driven cursor for "follow-the-score" practice modes.
// Walks a precomputed list of beat onsets at the given BPM, firing onAdvance
// for each onset reached and onComplete once the total piece length elapses.

export interface BeatCursorOpts {
  bpm: number;                      // quarter-note BPM
  noteOnsets: number[];             // beat onset of each playable note in order
  totalBeats: number;               // total length of the piece in quarter beats
  onAdvance: (playedIndex: number) => void;
  onComplete: () => void;
  // Optional override for the tick interval (ms). Defaults to 30 ms.
  tickMs?: number;
}

export interface BeatCursor {
  // start(anchor?) — pass a performance.now() value to align the cursor's
  // beat-0 to an external event (e.g. a metronome downbeat). When omitted,
  // beat-0 is the moment of the call.
  start: (anchorMs?: number) => void;
  stop: () => void;
}

export function createBeatCursor(opts: BeatCursorOpts): BeatCursor {
  let timer: any = null;
  let startedAt = 0;
  let cursorIdx = 0;
  let done = false;

  const tick = () => {
    const elapsedSec = (performance.now() - startedAt) / 1000;
    const elapsedBeats = elapsedSec * (opts.bpm / 60);
    while (cursorIdx < opts.noteOnsets.length && opts.noteOnsets[cursorIdx] <= elapsedBeats) {
      cursorIdx++;
      opts.onAdvance(cursorIdx);
    }
    if (!done && elapsedBeats >= opts.totalBeats) {
      done = true;
      stop();
      opts.onComplete();
    }
  };

  const start = (anchorMs?: number) => {
    if (timer != null) return;
    cursorIdx = 0;
    done = false;
    startedAt = anchorMs ?? performance.now();
    timer = setInterval(tick, opts.tickMs ?? 30);
  };

  const stop = () => {
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
  };

  return { start, stop };
}

// Watches a downbeat-marker getter (e.g. MetronomeService.downbeatAt). Calls
// onArrive with the new marker value on the next downbeat after subscription.
// Returns a cancel function to abort the wait (e.g. when the user hits Stop
// before the next downbeat lands).
export function waitForNextDownbeat(
  getMarker: () => number,
  onArrive: (markerMs: number) => void,
  pollMs = 10,
): () => void {
  const initial = getMarker();
  const id = setInterval(() => {
    const m = getMarker();
    if (m > 0 && m !== initial) {
      clearInterval(id);
      onArrive(m);
    }
  }, pollMs);
  return () => clearInterval(id);
}
