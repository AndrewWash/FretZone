import { renderQuiz } from './quiz';
import { renderTuner } from './tuner';
import { renderIntervals } from './intervals';

export function renderApp() {
  const root = document.getElementById('app')!;
  root.innerHTML = `
    <div class="container">
      <header>
        <h1>FretZone</h1>
        <span class="pill">Mic-powered guitar practice</span>
      </header>

      <div class="mt-3 grid cols-2">
        <div class="card">
          <h3>Apps</h3>
          <div class="row mt-2">
            <button id="btn-quiz">Fretboard Quiz</button>
            <button id="btn-intervals">Interval Memorization</button>
            <button class="secondary" id="btn-tuner">Tuner</button>
          </div>
        </div>
        <div class="card">
          <h3>About</h3>
          <p>Practice fretboard knowledge with realistic, focused ranges and sight-reading on treble clef. Uses your microphone to validate notes by frequency.</p>
          <p>Tip: On mobile and some browsers you must press a Start button before audio can begin.</p>
        </div>
      </div>

      <div id="workspace" class="mt-4"></div>
    </div>
  `;

  const ws = document.getElementById('workspace')!;
  (document.getElementById('btn-quiz') as HTMLButtonElement).onclick = () => renderQuiz(ws);
  (document.getElementById('btn-intervals') as HTMLButtonElement).onclick = () => renderIntervals(ws);
  (document.getElementById('btn-tuner') as HTMLButtonElement).onclick = () => renderTuner(ws);

  // Default view
  renderQuiz(ws);
}
