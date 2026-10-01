import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { DataManager } from '../DataManager.js';

const bar = (time: number, o: number, h: number, l: number, c: number, volume?: number): OHLCBar =>
  ({ time, open: o, high: h, low: l, close: c, ...(volume !== undefined ? { volume } : {}) });

describe('DataManager.setData', () => {
  it('keeps already well-formed bars without copying them', () => {
    const input = [bar(1, 10, 12, 9, 11, 5), bar(2, 11, 13, 10, 12, 0)];
    const dm = new DataManager();
    dm.setData(input);
    const out = dm.getData();
    expect(out).not.toBe(input); // owns its array
    expect(out[0]).toBe(input[0]);
    expect(out[1]).toBe(input[1]);
  });

  it('copies and repairs bars whose high/low do not envelope open/close', () => {
    const input = [bar(1, 10, 10.5, 9, 11, 5), bar(2, 11, 13, 11.5, 11.2, 1)];
    const dm = new DataManager();
    dm.setData(input);
    const [a, b] = dm.getData();
    expect(a).not.toBe(input[0]);
    expect(a).toMatchObject({ high: 11, low: 9 });
    expect(b).toMatchObject({ high: 13, low: 11 });
    expect(input[0].high).toBe(10.5); // caller's bar untouched
  });

  it('fills a missing volume with 0', () => {
    const dm = new DataManager();
    dm.setData([bar(1, 10, 12, 9, 11)]);
    expect(dm.getData()[0].volume).toBe(0);
  });

  it('drops invalid bars', () => {
    const dm = new DataManager();
    dm.setData([
      bar(1, 10, 12, 9, 11, 1),
      bar(2, NaN, 12, 9, 11, 1),
      bar(3, 10, 8, 9, 11, 1), // high < low
      bar(4, 10, 12, 9, 11, -1),
      bar(5, 10, 12, 9, 11, 1),
    ]);
    expect(dm.getData().map((b) => b.time)).toEqual([1, 5]);
  });

  it('never mutates shared bars on later updates', () => {
    const input = [bar(1, 10, 12, 9, 11, 5), bar(2, 11, 13, 10, 12, 5)];
    const dm = new DataManager();
    dm.setData(input);
    dm.updateLastBarFromTick({ price: 20, volume: 1, time: 2 });
    dm.updateLastBar(bar(2, 11, 14, 10, 13, 6));
    expect(input[1]).toEqual(bar(2, 11, 13, 10, 12, 5));
    expect(dm.getData()[1].close).toBe(13);
  });
});
