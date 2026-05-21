import { TestBed } from '@angular/core/testing';
import { PracticeTimerService, formatMmSs } from './practice-timer.service';

const STORAGE_KEY = 'fretzone.practiceTimer.v1';
const BASE = 1_700_000_000_000;

function makeService(): PracticeTimerService {
  return TestBed.inject(PracticeTimerService);
}

describe('formatMmSs', () => {
  it('formats sub-minute, minute, and ten-minute values', () => {
    expect(formatMmSs(0)).toBe('0:00');
    expect(formatMmSs(5)).toBe('0:05');
    expect(formatMmSs(65)).toBe('1:05');
    expect(formatMmSs(600)).toBe('10:00');
  });

  it('clamps negative input to zero', () => {
    expect(formatMmSs(-10)).toBe('0:00');
  });
});

describe('PracticeTimerService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(BASE);
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to a hidden idle 20-minute countdown', () => {
    const s = makeService();
    expect(s.mode()).toBe('countdown');
    expect(s.minutes()).toBe(20);
    expect(s.status()).toBe('idle');
    expect(s.visible()).toBe(false);
  });

  it('counts up in stopwatch mode', () => {
    const s = makeService();
    s.setMode('stopwatch');
    s.start();
    vi.advanceTimersByTime(90_000);
    expect(s.elapsedSec()).toBe(90);
    expect(s.displayLabel()).toBe('1:30');
  });

  it('finishes a countdown when it reaches zero', () => {
    const s = makeService();
    s.setMinutes(1);
    s.start();
    vi.advanceTimersByTime(60_000);
    expect(s.status()).toBe('finished');
    expect(s.displaySec()).toBe(0);
    expect(s.displayLabel()).toBe('0:00');
  });

  it('freezes elapsed time across pause and resumes from it', () => {
    const s = makeService();
    s.setMode('stopwatch');
    s.start();
    vi.advanceTimersByTime(30_000);
    s.pause();
    expect(s.status()).toBe('paused');
    vi.advanceTimersByTime(20_000);
    expect(s.elapsedSec()).toBe(30);
    s.resume();
    vi.advanceTimersByTime(15_000);
    expect(s.elapsedSec()).toBe(45);
  });

  it('defers finish to overtime while an applet run is active', () => {
    const s = makeService();
    s.setMinutes(1);
    s.start();
    s.markRunStart();
    vi.advanceTimersByTime(60_000);
    expect(s.status()).toBe('overtime');
    s.markRunEnd();
    expect(s.status()).toBe('finished');
  });

  it('stays in overtime until every active run ends', () => {
    const s = makeService();
    s.setMinutes(1);
    s.start();
    s.markRunStart();
    s.markRunStart();
    vi.advanceTimersByTime(60_000);
    expect(s.status()).toBe('overtime');
    s.markRunEnd();
    expect(s.status()).toBe('overtime');
    s.markRunEnd();
    expect(s.status()).toBe('finished');
  });

  it('keeps a running timer advancing across a reload', () => {
    const seed = {
      visible: true,
      mode: 'stopwatch',
      minutes: 20,
      status: 'running',
      anchorEpochMs: BASE,
      baseElapsedSec: 40,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    vi.setSystemTime(BASE + 10_000);

    const s = makeService();
    expect(s.status()).toBe('running');
    expect(s.elapsedSec()).toBe(50);
  });

  it('restores a paused timer with its elapsed time frozen', () => {
    const seed = {
      visible: true,
      mode: 'stopwatch',
      minutes: 20,
      status: 'paused',
      anchorEpochMs: null,
      baseElapsedSec: 30,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    vi.setSystemTime(BASE + 99_000);

    const s = makeService();
    expect(s.status()).toBe('paused');
    expect(s.elapsedSec()).toBe(30);
  });

  it('clamps the countdown minutes input', () => {
    const s = makeService();
    s.setMinutes(0);
    expect(s.minutes()).toBe(1);
    s.setMinutes(9999);
    expect(s.minutes()).toBe(240);
  });

  it('persists running state to localStorage', () => {
    const s = makeService();
    s.setMode('stopwatch');
    s.start();
    TestBed.tick();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.status).toBe('running');
    expect(stored.anchorEpochMs).toBe(BASE);
  });
});
