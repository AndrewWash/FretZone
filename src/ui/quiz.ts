import { PitchDetectBridge } from '../audio/pitchdetect-bridge';
import { BASE_LETTERS, midiToFreq, midiToNoteName, STANDARD_TUNING_MIDI, AccidentalMode } from '../theory/note';
import { defaultConfig, randomPrompt, freqMatchesPrompt, allCandidates } from '../quiz/engine';
import type { QuizConfig, Prompt } from '../quiz/models';
import { renderTrebleNote } from './notation';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { stringsRow } from './form-helpers';

const STORAGE_KEY = 'fretzone.quiz.cfg.v1';

function notesGrid(cfg: QuizConfig): string {
  return `<div class="grid cols-4">${BASE_LETTERS.map(n => {
    const c = (cfg.notes as any).includes(n) ? 'checked' : '';
    return `<label><input type="checkbox" data-note="${n}" ${c}/> ${n}</label>`;
  }).join('')}</div>`;
}

function stringDiagram(el: HTMLElement, highlight?: number) {
  const lines = [] as string[];
  // Render with High E (6) at the top and Low E (1) at the bottom
  for (let s = 6; s >= 1; s--) {
    const active = highlight === s ? ' style="background:#1f2937"' : '';
    const label = s === 6 ? 'High E (6)' : s === 1 ? 'Low E (1)' : `String ${s}`;
    lines.push(`<div${active}>——————— ${label}</div>`);
  }
  el.innerHTML = `<div class="card">${lines.join('')}</div>`;
}

export function renderQuiz(host: HTMLElement) {
  let cfg: QuizConfig = { ...defaultConfig(), ...loadFromStorage<Partial<QuizConfig>>(STORAGE_KEY, {}) };
  host.innerHTML = `
    <div class="card">
      <h3>Fretboard Quiz — Setup</h3>
      <div class="grid cols-3 mt-2">
        <div>
          <div class="pill">Fret range (1–16, opens always included)</div>
          <div class="row mt-2">
            <label>Start <input id="frStart" type="number" min="1" max="16" value="${cfg.fretStart}"/></label>
            <label>End <input id="frEnd" type="number" min="1" max="16" value="${cfg.fretEnd}"/></label>
          </div>
        </div>
        <div>
          <div class="pill">Time per note (sec)</div>
          <input id="timeLimit" type="number" min="1" max="60" value="${cfg.timeLimitSec}"/>
          <div class="pill mt-2">Iterations</div>
          <input id="iters" type="number" min="1" max="200" value="${cfg.iterations}"/>
        </div>
        <div>
          <div class="pill">Options</div>
          <label class="mt-2"><input id="sight" type="checkbox" ${cfg.sightReading? 'checked':''}/> Sight-reading (hide string hint)</label>
          <div class="mt-2"><label>A4 (Hz) <input id="a4" type="number" min="400" max="480" step="0.1" value="${cfg.a4}"></label></div>
          <div class="mt-2"><label>Tolerance (cents) <input id="tol" type="number" min="5" max="50" step="1" value="${cfg.centsTolerance}"></label></div>
        </div>
      </div>
      <div class="mt-3">
        <div class="pill">Strings</div>
        ${stringsRow(cfg)}
      </div>
      <div class="mt-3">
        <div class="pill">Notes</div>
        ${notesGrid(cfg)}
        <div class="mt-2">
          <label>Accidentals
            <select id="accMode">
              <option value="Naturals" ${cfg.accidentalMode==='Naturals'?'selected':''}>Naturals only</option>
              <option value="SharpsPlusNaturals" ${cfg.accidentalMode==='SharpsPlusNaturals'?'selected':''}>Sharps + naturals</option>
              <option value="FlatsPlusNaturals" ${cfg.accidentalMode==='FlatsPlusNaturals'?'selected':''}>Flats + naturals</option>
              <option value="All" ${cfg.accidentalMode==='All'?'selected':''}>All</option>
            </select>
          </label>
        </div>
      </div>
      <div class="row mt-3">
        <button id="startQuiz">Start Quiz</button>
        <span class="pill" id="poolInfo"></span>
      </div>
    </div>
    <div id="quizRun" class="mt-4 hidden"></div>
  `;

  const poolInfo = document.getElementById('poolInfo')!;
  const updatePoolInfo = () => {
    cfg = collectConfig(host, cfg);
    const total = allCandidates(cfg).length;
    poolInfo.textContent = `${total} possible prompts`;
    saveToStorage(STORAGE_KEY, cfg);
  };
  host.querySelectorAll('input,select').forEach(el => el.addEventListener('input', updatePoolInfo));
  updatePoolInfo();

  (document.getElementById('startQuiz') as HTMLButtonElement).onclick = () => runQuiz(host, collectConfig(host, cfg));
}

function collectConfig(host: HTMLElement, cur: QuizConfig): QuizConfig {
  const getNum = (id: string) => Number((host.querySelector('#'+id) as HTMLInputElement).value);
  const strings: number[] = [];
  host.querySelectorAll('input[data-s]').forEach(i => { if ((i as HTMLInputElement).checked) strings.push(Number((i as HTMLInputElement).dataset.s)); });
  const notes: string[] = [];
  host.querySelectorAll('input[data-note]').forEach(i => { if ((i as HTMLInputElement).checked) notes.push(String((i as HTMLInputElement).dataset.note)); });
  const accMode = (host.querySelector('#accMode') as HTMLSelectElement)?.value as AccidentalMode ?? cur.accidentalMode;
  return {
    ...cur,
    fretStart: Math.min(16, Math.max(1, getNum('frStart'))),
    fretEnd: Math.min(16, Math.max(1, getNum('frEnd'))),
    strings: strings.length? strings as any : [1,2,3,4,5,6],
    notes: (notes.length? notes as any : [...BASE_LETTERS]) as any,
    accidentalMode: accMode,
    sightReading: (host.querySelector('#sight') as HTMLInputElement).checked,
    iterations: Math.max(1, getNum('iters')),
    timeLimitSec: Math.min(60, Math.max(1, getNum('timeLimit'))),
    a4: Number((host.querySelector('#a4') as HTMLInputElement).value) || 440,
    centsTolerance: Math.min(50, Math.max(5, Number((host.querySelector('#tol') as HTMLInputElement).value) || 25)),
  };
}

function runQuiz(host: HTMLElement, cfg: QuizConfig) {
  saveToStorage(STORAGE_KEY, cfg);
  const area = document.getElementById('quizRun')!;
  area.classList.remove('hidden');
  area.innerHTML = `
    <div class="card" style="padding-bottom: 160px;">
      <div class="row" style="justify-content:space-between">
        <div><strong>Quiz</strong> <span class="pill" id="idx">0/${cfg.iterations}</span></div>
        <div>
          <button class="secondary" id="stop">Stop</button>
          <button id="startAudio">Start Mic</button>
        </div>
      </div>
      <div class="mt-3 grid cols-2">
        <div>
          <div id="strings"></div>
          <div class="mt-3" id="noteArea" style="display:flex; justify-content:center;"></div>
        </div>
        <div>
          <div class="pill">Timer</div>
          <div id="timer" style="font-size:48px; font-weight:800">--</div>
          <div class="pill mt-2">Heard</div>
          <div id="heard">--</div>
          <div class="pill mt-2">Status</div>
          <div id="status">Waiting...</div>
        </div>
      </div>
    </div>
  `;

  let idx = 0; let score = 0; let current: Prompt | null = null; let unsub: (()=>void)|null = null; let timerId: any = null; let remaining = cfg.timeLimitSec;
  // Hold-to-commit state: require a stable note for a period before committing as answer
  let holdStartAt: number | null = null;  // when the current stable note window started
  let holdRefHz: number | null = null;    // reference frequency for stability comparison
  // Per-prompt guards
  let promptChangedAt: number = 0;          // timestamp when we switched to the current prompt
  let committedThisPrompt: boolean = false; // prevent processing input after commit until next prompt
  let pendingAdvance: boolean = false;      // true while we are showing feedback before advancing
  let advanceTimeoutId: any = null;         // timeout handle for scheduled nextPrompt

  // Detection parameters
  const HOLD_COMMIT_MS = 500;             // require ~0.5s of stable pitch to commit
  const STABILITY_CENTS = 35;             // within this window around first detected freq counts as "stable"
  const POST_PROMPT_IGNORE_MS = 400;      // ignore any input for this period after nextPrompt to avoid carryover

  const elIdx = area.querySelector('#idx')!;
  const elStrings = area.querySelector('#strings') as HTMLElement;
  const elNote = area.querySelector('#noteArea') as HTMLElement;
  const elTimer = area.querySelector('#timer') as HTMLElement;
  const elHeard = area.querySelector('#heard') as HTMLElement;
  const elStatus = area.querySelector('#status') as HTMLElement;

  function finish() {
    stopAll();
    elStatus.textContent = `Done! Score: ${score}/${cfg.iterations}`;
    elIdx.textContent = `${cfg.iterations}/${cfg.iterations}`;
  }

  function nextPrompt() {
    if (idx >= cfg.iterations) { finish(); return; }
    current = randomPrompt(cfg);
    elIdx.textContent = `${idx+1}/${cfg.iterations}`;
    // Clear any prior tint before rendering the next note
    elNote.style.filter = '';
    renderTrebleNote(elNote, current.midi, { width: 520, height: 180, accidentalMode: cfg.accidentalMode });
    stringDiagram(elStrings, cfg.sightReading ? undefined : current.stringId);
    remaining = cfg.timeLimitSec; elTimer.textContent = String(remaining);
    elStatus.textContent = 'Play the note';
    // Reset hold/guard state for this new prompt
    holdStartAt = null;
    holdRefHz = null;
    promptChangedAt = Date.now();
    committedThisPrompt = false;
    pendingAdvance = false;
    if (advanceTimeoutId) { clearTimeout(advanceTimeoutId); advanceTimeoutId = null; }
    idx++;
  }

  function tickTimer() {
    remaining -= 1; elTimer.textContent = String(remaining);
    if (remaining <= 0) {
      elStatus.textContent = 'Time up';
      nextPrompt();
    }
  }

  async function startAudio() {
    try {
      await PitchDetectBridge.startLive();
      unsub?.();
      unsub = PitchDetectBridge.subscribe(({ hz }) => {
        const now = Date.now();

        // If we've already committed or are pending an advance, ignore input
        if (committedThisPrompt || pendingAdvance) return;

        // Ignore any input right after prompt changes to avoid counting ringing from prior note
        if (now - promptChangedAt < POST_PROMPT_IGNORE_MS) return;

        const midi = Math.round(69 + 12 * Math.log2(hz / cfg.a4));
        const { name } = midiToNoteName(midi);
        elHeard.textContent = `${hz.toFixed(1)} Hz (${name})`;

        if (!current) return;

        // Determine if the currently heard pitch matches the target within tolerance
        const isCorrectNow = freqMatchesPrompt(hz, current, cfg.a4, cfg.centsTolerance);

        // Helper to compute cents distance between two frequencies
        const centsBetween = (a: number, b: number) => 1200 * Math.log2(a / b);

        if (isCorrectNow) {
          // Start or continue a stability hold window around the first matching frequency
          if (holdRefHz == null) {
            holdRefHz = hz;
            holdStartAt = now;
          } else {
            const drift = Math.abs(centsBetween(hz, holdRefHz));
            if (drift > STABILITY_CENTS) {
              // Reset stability window to the new center if user moved a lot
              holdRefHz = hz;
              holdStartAt = now;
            }
          }

          // Show feedback while holding
          if (holdStartAt != null) {
            const heldMs = now - holdStartAt;
            const remain = Math.max(0, HOLD_COMMIT_MS - heldMs);
            elStatus.textContent = remain > 0 ? `Good! Hold steady... ${Math.ceil(remain/100)}%` : 'Good!';
          }

          // Commit as correct if held long enough
          if (holdStartAt != null && now - holdStartAt >= HOLD_COMMIT_MS) {
            score++;
            elStatus.textContent = 'Correct!';
            elNote.style.filter = 'hue-rotate(90deg)';

            // Commit this prompt and schedule advance
            committedThisPrompt = true;
            pendingAdvance = true;
            holdStartAt = null;
            holdRefHz = null;
            if (advanceTimeoutId) { clearTimeout(advanceTimeoutId); }
            advanceTimeoutId = setTimeout(() => {
              elNote.style.filter = '';
              pendingAdvance = false;
              nextPrompt();
            }, 700);
          }
        } else {
          // Not within target tolerance; do not mark incorrect immediately.
          // Loosen sensitivity by requiring a stable correct note before committing.
          // Reset stability window if we drift far from current hold center
          if (holdRefHz != null) {
            const driftFromHold = Math.abs(centsBetween(hz, holdRefHz));
            if (driftFromHold > STABILITY_CENTS) {
              holdRefHz = null;
              holdStartAt = null;
            }
          }
          elStatus.textContent = 'Listening... Try to match the note.';
          elNote.style.filter = '';
        }
      });
    } catch (e) {
      console.error(e);
      elStatus.textContent = 'Mic failed. Use HTTPS/localhost and allow permission.';
    }
  }

  function stopAll() {
    unsub?.(); unsub = null;
    PitchDetectBridge.stop();
    clearInterval(timerId); timerId = null;
    if (advanceTimeoutId) { clearTimeout(advanceTimeoutId); advanceTimeoutId = null; }
    pendingAdvance = false;
    const startBtn = area.querySelector('#startAudio') as HTMLButtonElement;
    if (startBtn) startBtn.disabled = false;
  }

  (area.querySelector('#startAudio') as HTMLButtonElement).onclick = () => {
    if (!timerId) timerId = setInterval(tickTimer, 1000);
    startAudio();
    (area.querySelector('#startAudio') as HTMLButtonElement).disabled = true;
  };
  (area.querySelector('#stop') as HTMLButtonElement).onclick = () => { stopAll(); };

  nextPrompt();
}
