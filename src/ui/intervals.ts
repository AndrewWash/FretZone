import { PitchDetectBridge } from '../audio/pitchdetect-bridge';
import { STANDARD_TUNING_MIDI, AccidentalMode, spellMidi, BaseLetter } from '../theory/note';
import { buildCycle, defaultIntervalConfig, IntervalConfig, IntervalType, DirectionMode, DisplayMode, writtenNoteNameFromMidi, overrideSpellingForTritone } from '../intervals/engine';
import { startTwoNoteDetection } from '../intervals/detect';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { stringsRow } from './form-helpers';
import { renderStaff } from './notation';

const STORAGE_KEY = 'fretzone.intervals.cfg.v1';

const ALL_INTERVALS: IntervalType[] = ['m2','M2','m3','M3','P4','Aug4','Dim5','P5','m6','M6','m7','M7','P8'];

function intervalsGrid(cfg: IntervalConfig): string {
  return `<div class="grid cols-4">${ALL_INTERVALS.map(iv => {
    const c = cfg.intervals.includes(iv) ? 'checked' : '';
    return `<label><input type="checkbox" data-iv="${iv}" ${c}/> ${iv}</label>`;
  }).join('')}</div>`;
}

export function renderIntervals(host: HTMLElement) {
  let cfg: IntervalConfig = { ...defaultIntervalConfig(), ...loadFromStorage<Partial<IntervalConfig>>(STORAGE_KEY, {}) };
  host.innerHTML = `
    <div class="card">
      <h3>Interval Memorization — Setup</h3>
      <p>Choose an interval and practice playing them. For best practice, say the note and interval out loud as you play them. Example: "G is a perfect fifth up from C".</p>
      <div class="grid cols-3 mt-2">
        <div>
          <div class="pill">Fret range (1–16, opens always included)</div>
          <div class="row mt-2">
            <label>Start <input id="frStart" type="number" min="1" max="16" value="${cfg.fretStart}"/></label>
            <label>End <input id="frEnd" type="number" min="1" max="16" value="${cfg.fretEnd}"/></label>
          </div>
          <div class="mt-2">
            <div class="pill">Strings</div>
            ${stringsRow(cfg)}
          </div>
        </div>
        <div>
          <div class="pill">Intervals</div>
          ${intervalsGrid(cfg)}
          <div class="mt-2 pill">Iterations</div>
          <input id="iters" type="number" min="1" max="200" value="${cfg.iterations}"/>
        </div>
        <div>
          <div class="pill">Options</div>
          <label class="mt-1">Direction
            <select id="dir">
              <option value="UpDown" ${cfg.direction==='UpDown'?'selected':''}>Up → Down</option>
              <option value="DownUp" ${cfg.direction==='DownUp'?'selected':''}>Down → Up</option>
            </select>
          </label>
          <label class="mt-1">Display
            <select id="disp">
              <option value="Dyad" ${cfg.display==='Dyad'?'selected':''}>Dyads</option>
              <option value="Sequential" ${cfg.display==='Sequential'?'selected':''}>Sequential</option>
              <option value="Both" ${cfg.display==='Both'?'selected':''}>Both (random)</option>
            </select>
          </label>
          <label class="mt-1">Accidentals
            <select id="accMode">
              <option value="Naturals" ${cfg.accidentalMode==='Naturals'?'selected':''}>Naturals only</option>
              <option value="SharpsPlusNaturals" ${cfg.accidentalMode==='SharpsPlusNaturals'?'selected':''}>Sharps + naturals</option>
              <option value="FlatsPlusNaturals" ${cfg.accidentalMode==='FlatsPlusNaturals'?'selected':''}>Flats + naturals</option>
              <option value="All" ${cfg.accidentalMode==='All'?'selected':''}>All</option>
            </select>
          </label>
          <div class="mt-1"><label>A4 (Hz) <input id="a4" type="number" min="400" max="480" step="0.1" value="${cfg.a4}"></label></div>
          <div class="mt-1"><label>Tolerance (cents) <input id="tol" type="number" min="5" max="50" step="1" value="${cfg.centsTolerance}"></label></div>
        </div>
      </div>
      <div class="row mt-3">
        <button id="start">Start</button>
        <span class="pill" id="iterInfo"></span>
      </div>
    </div>
    <div id="run" class="mt-4 hidden"></div>
  `;

  const readCfg = (): IntervalConfig => {
    const strings: number[] = []; host.querySelectorAll('input[data-s]').forEach(i=>{ if((i as HTMLInputElement).checked) strings.push(Number((i as HTMLInputElement).dataset.s)); });
    const intervals: string[] = []; host.querySelectorAll('input[data-iv]').forEach(i=>{ if((i as HTMLInputElement).checked) intervals.push(String((i as HTMLInputElement).dataset.iv)); });
    return {
      ...cfg,
      fretStart: Math.min(16, Math.max(1, Number((host.querySelector('#frStart') as HTMLInputElement).value)) ),
      fretEnd: Math.min(16, Math.max(1, Number((host.querySelector('#frEnd') as HTMLInputElement).value)) ),
      strings: (strings.length? strings as any : [1,2,3,4,5,6]),
      intervals: (intervals.length? intervals as any : ALL_INTERVALS),
      iterations: Math.max(1, Number((host.querySelector('#iters') as HTMLInputElement).value) || 10),
      direction: ((host.querySelector('#dir') as HTMLSelectElement).value as DirectionMode),
      display: ((host.querySelector('#disp') as HTMLSelectElement).value as DisplayMode),
      accidentalMode: ((host.querySelector('#accMode') as HTMLSelectElement).value as AccidentalMode),
      a4: Number((host.querySelector('#a4') as HTMLInputElement).value) || 440,
      centsTolerance: Math.min(50, Math.max(5, Number((host.querySelector('#tol') as HTMLInputElement).value) || 25)),
    };
  };

  host.querySelectorAll('input,select').forEach(el => el.addEventListener('input', ()=>{ cfg = readCfg(); saveToStorage(STORAGE_KEY, cfg); }));

  (host.querySelector('#start') as HTMLButtonElement).onclick = () => run(host, readCfg());
}

function run(host: HTMLElement, cfg: IntervalConfig) {
  saveToStorage(STORAGE_KEY, cfg);
  const area = document.getElementById('run')!;
  area.classList.remove('hidden');
  area.innerHTML = `
    <div class="card" style="padding-bottom: 160px;">
      <div class="row" style="justify-content:space-between">
        <div><strong>Interval Memorization</strong> <span class="pill" id="idx">0/${cfg.iterations}</span></div>
        <div>
          <button class="secondary" id="stop">Stop</button>
          <button id="startAudio">Start Mic</button>
        </div>
      </div>
      <div class="mt-3 grid cols-2">
        <div>
          <div class="mt-1" id="noteArea" style="display:flex; justify-content:center;"></div>
          <div class="pill mt-1">Instruction</div>
          <div id="instr">Play the lower note, then the upper note.</div>
        </div>
        <div>
          <div class="pill">Heard</div>
          <div id="heard">--</div>
          <div class="pill mt-2">Status</div>
          <div id="status">Waiting...</div>
        </div>
      </div>
    </div>
  `;

  const elIdx = area.querySelector('#idx') as HTMLElement;
  const elNote = area.querySelector('#noteArea') as HTMLElement;
  const elHeard = area.querySelector('#heard') as HTMLElement;
  const elStatus = area.querySelector('#status') as HTMLElement;
  const elInstr = area.querySelector('#instr') as HTMLElement;

  // Mic/session state for seamless multi-step detection
  let micStarted = false; // set to true after the first user-initiated mic start
  let activeDet: { start: () => Promise<void>; stop: () => void } | null = null;

  let cycleIdx = 0; // counts 1..iterations
  let step = 0;     // 0 or 1 within a cycle
  let current = buildCycle(cfg);

  const updateInstr = (disp: 'Dyad'|'Sequential') => {
    elInstr.textContent = disp === 'Sequential' ? 'Play the left note first, then the right.' : 'Play the lower note first, then the upper note.';
  };

  const renderStep = () => {
    // Stop any previous detector before starting a new step
    if (activeDet) { try { activeDet.stop(); } catch {} activeDet = null; }
    const p = step === 0 ? current.step1 : current.step2;
    const bottomMidi = p.anchorIsBottom ? p.anchor.midi : p.partner.midi;
    const topMidi = p.anchorIsBottom ? p.partner.midi : p.anchor.midi;

    // Update instruction per current display mode
    updateInstr(p.display);

    // Spell notes according to global accidental policy with theoretical consistency
    const lettersU: BaseLetter[] = ['C','D','E','F','G','A','B'];
    const lettersL = ['c','d','e','f','g','a','b'];
    const stepsMap: Record<IntervalType, number> = { m2:1, M2:1, m3:2, M3:2, P4:3, Aug4:3, Dim5:4, P5:4, m6:5, M6:5, m7:6, M7:6, P8:0 };
    const steps = stepsMap[p.interval];

    const anchorSp = spellMidi(p.anchor.midi + 12, cfg.accidentalMode);
    const aIdx = Math.max(0, lettersL.indexOf(anchorSp.letter));
    const mod = (n:number)=>((n%7)+7)%7;
    const relUp = (n:number)=> lettersU[mod(aIdx + n)];

    let bottomSp = spellMidi(bottomMidi + 12, cfg.accidentalMode);
    let topSp = spellMidi(topMidi + 12, cfg.accidentalMode);

    if (p.anchorIsBottom) {
      const preferTop = relUp(steps);
      topSp = spellMidi(topMidi + 12, cfg.accidentalMode, preferTop);
      bottomSp = anchorSp;
    } else {
      const preferBottom = relUp(-steps);
      bottomSp = spellMidi(bottomMidi + 12, cfg.accidentalMode, preferBottom);
      topSp = anchorSp;
    }

    // Override for tritone to force # or b
    if (p.interval === 'Aug4' || p.interval === 'Dim5') {
      const ov = overrideSpellingForTritone(p.anchor.midi, p.partner.midi, p.interval, cfg.accidentalMode);
      if (ov) {
        if (p.anchorIsBottom) topSp = { key: ov.key, accidental: ov.accidental } as any;
        else bottomSp = { key: ov.key, accidental: ov.accidental } as any;
      }
    }
    renderStaff(elNote, { key: bottomSp.key, accidental: bottomSp.accidental }, { key: topSp.key, accidental: topSp.accidental }, p.display);
    
    // Show progress at the start of each cycle (1-based)
    if (step === 0) elIdx.textContent = `${cycleIdx + 1}/${cfg.iterations}`;

    elStatus.textContent = 'Play bottom note...';
    elHeard.textContent = '--';
    
    const det = startTwoNoteDetection({ bottomMidi, topMidi, a4: cfg.a4, centsTolerance: cfg.centsTolerance }, {
      onHeard(hz){ elHeard.textContent = hz.toFixed(1) + ' Hz'; },
      onBottomAccepted(){ elStatus.textContent = 'Good! Now play the top note...'; },
      onTopAccepted(){ elStatus.textContent = 'Nice!'; },
      onSuccess(){
        // Stop current detector immediately to avoid double events during transition
        try { det.stop(); } catch {}
        // Advance to next step or next cycle, defer render to next tick to avoid races
        if (step === 0) {
          step = 1;
          setTimeout(() => renderStep(), 0);
        } else {
          step = 0; cycleIdx++; elIdx.textContent = `${cycleIdx}/${cfg.iterations}`;
          if (cycleIdx >= cfg.iterations) {
            elStatus.textContent = 'Done!';
          } else {
            current = buildCycle(cfg);
            setTimeout(() => renderStep(), 0);
          }
        }
      }
    });

    // hold onto current detector and auto-start if mic already running
    activeDet = det;
    if (micStarted) { try { det.start(); } catch {} }

    // start mic listening only when user clicks Start Mic (to align with browser autoplay policies)
    const btnStart = (area.querySelector('#startAudio') as HTMLButtonElement);
    const btnStop = (area.querySelector('#stop') as HTMLButtonElement);

    // reflect current mic state in UI
    btnStart.disabled = micStarted;

    btnStart.onclick = async () => {
      // prevent double-clicks while starting
      if (btnStart.disabled && !micStarted) return;
      btnStart.disabled = true;
      const prevStatus = elStatus.textContent;
      elStatus.textContent = 'Starting mic...';
      try {
        if (!activeDet) {
          // No active detector yet — at least warm up the mic; the next render will auto-start
          await PitchDetectBridge.startLive();
          micStarted = true;
          elStatus.textContent = 'Mic on. Listening...';
        } else {
          await activeDet.start();
          micStarted = true;
          elStatus.textContent = 'Listening...';
        }
      } catch (e) {
        // Roll back UI state so the user can try again
        micStarted = false;
        btnStart.disabled = false;
        elStatus.textContent = 'Mic start failed. Click Start Mic and allow access.';
        try { console.error('Start Mic failed', e); } catch {}
      }
    };

    btnStop.onclick = () => {
      try { activeDet?.stop(); } catch {}
      activeDet = null;
      PitchDetectBridge.stop();
      micStarted = false;
      btnStart.disabled = false;
      elStatus.textContent = 'Mic stopped. Click Start Mic to resume.';
    };
  };

  renderStep();
}
