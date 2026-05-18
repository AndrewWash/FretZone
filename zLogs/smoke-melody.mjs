// Quick runtime smoke test for the melody engine.
// Run from project root: npx tsx zLogs/smoke-melody.mjs
import { defaultConfig, generatePhrase } from '../src/app/core/melody/engine.ts';
import { DURATION_BEATS, BEATS_PER_BAR } from '../src/app/core/melody/models.ts';

function summarize(label, p) {
  const durations = [...new Set(p.tickables.map(t => t.duration))].join(',');
  const rests = p.tickables.filter(t => t.kind === 'rest').length;
  const minPitch = Math.min(...p.noteMidis);
  const maxPitch = Math.max(...p.noteMidis);
  // Verify every bar sums to the meter's beats-per-bar.
  const expected = BEATS_PER_BAR[p.timeSignature];
  const badBar = p.bars.findIndex(
    bar => Math.abs(bar.reduce((s, t) => s + DURATION_BEATS[t.duration], 0) - expected) > 1e-9,
  );
  console.log(
    `${label}: ts=${p.timeSignature} bars=${p.bars.length} notes=${p.noteMidis.length}` +
    ` rests=${rests} durations=[${durations}] range=${minPitch}-${maxPitch}` +
    (badBar >= 0 ? ` !! BAR ${badBar} DOES NOT SUM TO ${expected}` : ''),
  );
  if (badBar >= 0) throw new Error(`${label}: bar ${badBar} has wrong beat total`);
}

try {
  const cfg = defaultConfig();

  cfg.difficulty = 'Easy'; cfg.bars = 4; cfg.progression = 'Off';
  summarize('Easy 4-bar', generatePhrase(cfg));

  cfg.difficulty = 'Intermediate'; cfg.bars = 8; cfg.progression = 'On';
  summarize('Inter 8-bar prog=On', generatePhrase(cfg));

  cfg.difficulty = 'Expert'; cfg.bars = 16; cfg.progression = 'Random';
  for (let i = 0; i < 3; i++) {
    summarize(`Expert 16-bar prog=Rand #${i}`, generatePhrase(cfg));
  }

  cfg.difficulty = 'Custom'; cfg.bars = 4; cfg.progression = 'Off';
  cfg.custom = {
    allowedNoteValues: ['h', 'q'],
    allowRests: false,
    allowedRestValues: [],
    jumpTier: 'Hard',
    timeSignature: '4/4',
  };
  summarize('Custom h+q no-rests jump=Hard', generatePhrase(cfg));

  cfg.custom = {
    allowedNoteValues: ['w', 'h', 'q', '8', '16', '32'],
    allowRests: true,
    allowedRestValues: ['q', '8'],
    jumpTier: 'Medium',
    timeSignature: '4/4',
  };
  summarize('Custom full palette', generatePhrase(cfg));

  cfg.bars = 8;
  cfg.custom = {
    allowedNoteValues: ['32'],
    allowRests: false,
    allowedRestValues: [],
    jumpTier: 'Easy',
    timeSignature: '4/4',
  };
  summarize('Custom 32nd-only 8-bar', generatePhrase(cfg));

  cfg.bars = 2;
  cfg.custom = {
    allowedNoteValues: ['w'],
    allowRests: false,
    allowedRestValues: [],
    jumpTier: 'Easy',
    timeSignature: '4/4',
  };
  summarize('Custom whole-only 2-bar', generatePhrase(cfg));

  // 3/4 meter — three beats per bar.
  cfg.bars = 4;
  cfg.custom = {
    allowedNoteValues: ['h', 'q'],
    allowRests: true,
    allowedRestValues: ['q'],
    jumpTier: 'Easy',
    timeSignature: '3/4',
  };
  summarize('Custom 3/4 h+q 4-bar', generatePhrase(cfg));

  cfg.bars = 8;
  cfg.custom = {
    allowedNoteValues: ['q', '8', '16'],
    allowRests: true,
    allowedRestValues: ['q', '8'],
    jumpTier: 'Medium',
    timeSignature: '3/4',
  };
  for (let i = 0; i < 3; i++) {
    summarize(`Custom 3/4 mixed 8-bar #${i}`, generatePhrase(cfg));
  }

  console.log('ALL GREEN');
} catch (e) {
  console.error('FAIL:', e);
  process.exit(1);
}
