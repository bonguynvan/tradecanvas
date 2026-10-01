import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { ReplayManager } from '../ReplayManager.js';

const bars = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: i * 60_000, open: i, high: i, low: i, close: i, volume: 1 }));

let rm: ReplayManager;
let shown: number[];

beforeEach(() => {
  vi.useFakeTimers();
  rm = new ReplayManager();
  shown = [];
  rm.on('bar', ({ index }) => shown.push(index));
  rm.load(bars(10));
});

afterEach(() => {
  rm.dispose();
  vi.useRealTimers();
});

describe('ReplayManager', () => {
  it('reveals the start bar on the first tick, then one bar per tick', () => {
    rm.play({ startIndex: 3, interval: 100, speed: 1 });
    vi.advanceTimersByTime(300);
    expect(shown).toEqual([3, 4, 5]);
    expect(rm.getProgress().current).toBe(5); // the bar on screen
  });

  it('can start paused, showing the start bar at once', () => {
    rm.play({ startIndex: 4, interval: 100, speed: 1, paused: true });
    expect(shown).toEqual([4]);
    expect(rm.getState()).toBe('paused');
    vi.advanceTimersByTime(1000);
    expect(shown).toEqual([4]);
    rm.resume();
    vi.advanceTimersByTime(100);
    expect(shown).toEqual([4, 5]);
  });

  it('stops on the last bar, paused, instead of jumping back to the start', () => {
    const complete = vi.fn();
    rm.on('complete', complete);
    rm.play({ startIndex: 7, interval: 100, speed: 1 });
    vi.advanceTimersByTime(1000);
    expect(shown).toEqual([7, 8, 9]);
    expect(rm.getState()).toBe('paused');
    expect(rm.getProgress()).toMatchObject({ current: 9, total: 10, percent: 100 });
    expect(rm.isAtEnd()).toBe(true);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('does not restart from the end on resume', () => {
    rm.play({ startIndex: 9, interval: 100, speed: 1, paused: true });
    rm.resume();
    vi.advanceTimersByTime(500);
    expect(shown).toEqual([9]);
    expect(rm.getState()).toBe('paused');
  });

  it('seeks and reports the bar on screen, so stepping moves one bar', () => {
    rm.play({ startIndex: 2, interval: 100, speed: 1, paused: true });
    rm.seekTo(rm.getProgress().current + 1);
    rm.seekTo(rm.getProgress().current + 1);
    rm.seekTo(rm.getProgress().current - 1);
    expect(shown).toEqual([2, 3, 4, 3]);
  });

  it('never runs two clocks when play is called while playing', () => {
    rm.play({ startIndex: 0, interval: 100, speed: 1 });
    rm.play();
    vi.advanceTimersByTime(300);
    expect(shown).toEqual([0, 1, 2]);
  });

  it('changes speed without losing its place', () => {
    rm.play({ startIndex: 0, interval: 100, speed: 1 });
    vi.advanceTimersByTime(200);
    rm.setSpeed(2); // 50 ms ticks
    vi.advanceTimersByTime(100);
    expect(shown).toEqual([0, 1, 2, 3]);
  });

  it('pauses where it is when asked to without a start bar', () => {
    rm.play({ startIndex: 3, interval: 100, speed: 1 });
    vi.advanceTimersByTime(200);
    rm.play({ paused: true });
    expect(rm.getState()).toBe('paused');
    expect(shown.at(-1)).toBe(4);
    vi.advanceTimersByTime(500);
    expect(shown.at(-1)).toBe(4);
  });

  it('treats a non-numeric index as the first bar', () => {
    rm.seekTo(Number.NaN);
    rm.play({ startIndex: Number.NaN, paused: true });
    expect(shown).toEqual([0, 0]);
  });

  it('resets on stop', () => {
    rm.play({ startIndex: 5, interval: 100, speed: 1 });
    vi.advanceTimersByTime(100);
    rm.stop();
    expect(rm.getState()).toBe('stopped');
    expect(rm.getProgress().current).toBe(0);
  });
});
