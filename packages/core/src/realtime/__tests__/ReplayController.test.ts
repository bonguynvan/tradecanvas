import { describe, it, expect, vi } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { ReplayController } from '../ReplayController.js';

function makeBars(n: number, base = 100): OHLCBar[] {
  const out: OHLCBar[] = [];
  for (let i = 0; i < n; i++) {
    const o = base + i;
    out.push({ time: i * 60_000, open: o, high: o + 1, low: o - 1, close: o + 0.5, volume: 10 + i });
  }
  return out;
}

describe('ReplayController', () => {
  it('throws on empty data', () => {
    expect(() => new ReplayController({ data: [] })).toThrow();
  });

  it('emits bars sequentially when stepped', () => {
    const data = makeBars(5);
    const rc = new ReplayController({ data });
    const received: number[] = [];
    rc.on('bar', (e) => received.push(e.index));

    rc.step(3);
    expect(received).toEqual([0, 1, 2]);
    expect(rc.getStatus()).toBe('paused');
    expect(rc.getIndex()).toBe(3);
  });

  it('emits finished when stepping through the end', () => {
    const data = makeBars(2);
    const rc = new ReplayController({ data });
    const onFinished = vi.fn();
    rc.on('finished', onFinished);

    rc.step(10);
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(rc.getStatus()).toBe('finished');
  });

  it('seek jumps without emitting bars', () => {
    const data = makeBars(10);
    const rc = new ReplayController({ data });
    const onBar = vi.fn();
    rc.on('bar', onBar);

    rc.seek(5);
    expect(onBar).not.toHaveBeenCalled();
    expect(rc.getIndex()).toBe(5);
    expect(rc.getPrefix()).toHaveLength(5);
  });

  it('start/pause emits stateChange events', () => {
    const data = makeBars(3);
    const rc = new ReplayController({ data, speed: 1000 });
    const states: string[] = [];
    rc.on('stateChange', (e) => states.push(e.status));

    rc.start();
    rc.pause();
    expect(states).toEqual(['playing', 'paused']);
  });

  it('respects startIndex', () => {
    const data = makeBars(5);
    const rc = new ReplayController({ data, startIndex: 2 });
    expect(rc.getIndex()).toBe(2);
    expect(rc.getPrefix()).toHaveLength(2);

    const received: number[] = [];
    rc.on('bar', (e) => received.push(e.index));
    rc.step(1);
    expect(received).toEqual([2]);
  });

  it('plays bars on a timer with fake timers', () => {
    vi.useFakeTimers();
    try {
      const data = makeBars(4);
      const rc = new ReplayController({ data, speed: 10 });
      const received: number[] = [];
      rc.on('bar', (e) => received.push(e.index));

      rc.start();
      vi.advanceTimersByTime(500);
      expect(received).toEqual([0, 1, 2, 3]);
      expect(rc.getStatus()).toBe('finished');
    } finally {
      vi.useRealTimers();
    }
  });
});
