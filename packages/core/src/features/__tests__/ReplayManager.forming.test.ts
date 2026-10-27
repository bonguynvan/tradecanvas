import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { ReplayManager, type ReplayClock } from '../ReplayManager.js';

const bars = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: i * 60_000, open: i, high: i, low: i, close: i, volume: 1 }));

/** A clock the test moves: each `frame(ms)` runs the waiting frame `ms` later. */
function manualClock() {
  let time = 0;
  let waiting: (() => void) | null = null;
  const clock: ReplayClock = {
    now: () => time,
    frame: (run) => { waiting = run; return run; },
    cancel: () => { waiting = null; },
  };
  const frame = (ms: number) => { time += ms; const run = waiting; waiting = null; run?.(); };
  const frames = (count: number, ms = 50) => { for (let i = 0; i < count; i++) frame(ms); };
  return { clock, frame, frames, pending: () => waiting !== null };
}

type Phase = { index: number; fraction: number };
let rm: ReplayManager;
let clock: ReturnType<typeof manualClock>;
let shown: number[];
let phases: Phase[];
const lastPhase = () => phases.at(-1)!;

beforeEach(() => {
  clock = manualClock();
  rm = new ReplayManager(clock.clock);
  shown = [];
  phases = [];
  rm.on('bar', ({ index }) => shown.push(index));
  rm.on('phase', (p) => { phases.push(p); });
});

afterEach(() => rm.dispose());

describe('a step that forms over its time (animate)', () => {
  beforeEach(() => {
    rm.load(bars(10));
    rm.play({ startIndex: 2, paused: true, interval: 1000, speed: 1, animate: true });
  });

  it('tells the next step at its start on Play, then how far into it, once a frame', () => {
    rm.resume();
    expect(phases).toEqual([{ index: 3, fraction: 0 }]);
    clock.frames(5);
    expect(lastPhase().index).toBe(3);
    expect(lastPhase().fraction).toBeCloseTo(0.25);
    expect(shown).toEqual([2]);
  });

  it('completes a step at its time, then starts the next one from 0', () => {
    rm.resume();
    clock.frames(20);
    expect(shown).toEqual([2, 3]);
    expect(lastPhase()).toEqual({ index: 4, fraction: 0 });
  });

  it('keeps how far it was through a pause', () => {
    rm.resume();
    clock.frames(5);
    rm.pause();
    clock.frames(10); // nothing runs while paused
    rm.resume();
    expect(lastPhase().fraction).toBeCloseTo(0.25);
    clock.frames(1);
    expect(lastPhase().fraction).toBeCloseTo(0.3);
  });

  it('starts over at the step after a seek', () => {
    rm.resume();
    clock.frames(5);
    rm.seekTo(6);
    clock.frames(1);
    expect(lastPhase().index).toBe(7);
    expect(lastPhase().fraction).toBeCloseTo(0.05);
  });

  it('keeps how far it is into the step when the speed changes', () => {
    rm.resume();
    clock.frames(5);
    rm.setSpeed(2);
    clock.frames(1);
    expect(lastPhase().fraction).toBeCloseTo(0.35); // 0.25, then 50 ms of a 500 ms step
  });
});

describe('when there is nothing to animate', () => {
  it('tells no phase without animate', () => {
    rm.load(bars(10));
    rm.play({ startIndex: 2, interval: 1000, speed: 1 });
    clock.frames(5);
    expect(phases).toEqual([]);
  });

  it('tells no phase for a step shorter than three frames', () => {
    rm.load(bars(100));
    rm.play({ startIndex: 2, paused: true, interval: 1000, speed: 25, animate: true });
    rm.resume();
    clock.frames(10, 16);
    expect(phases).toEqual([]);
    expect(shown.length).toBeGreaterThan(1);
  });
});

describe('how often a forming step is told', () => {
  it('tells it about 30 times a second on 60 Hz frames', () => {
    rm.load(bars(10));
    rm.play({ startIndex: 2, paused: true, interval: 5000, speed: 1, animate: true });
    rm.resume();
    clock.frames(60, 16);
    expect(phases.length).toBeGreaterThan(25);
    expect(phases.length).toBeLessThanOrEqual(31);
  });

  it('forms the bars of a duration replay that last three frames or more', () => {
    rm.load(bars(31));
    rm.play({ startIndex: 0, paused: true, duration: 60_000, animate: true });
    rm.resume();
    clock.frames(10);
    expect(lastPhase().index).toBe(1);
    expect(lastPhase().fraction).toBeCloseTo(0.25);
  });

  it('says how far into the next bar it is', () => {
    rm.load(bars(10));
    rm.play({ startIndex: 2, paused: true, interval: 1000, speed: 1, animate: true });
    rm.resume();
    clock.frames(5);
    expect(rm.getFraction()).toBeCloseTo(0.25);
    rm.seekTo(4);
    expect(rm.getFraction()).toBe(0);
  });
});
