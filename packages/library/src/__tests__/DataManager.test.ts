import { describe, it, expect } from 'vitest';
import { mergeBar, type OHLCBar } from '@tradecanvas/commons';
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
      bar(NaN, 10, 12, 9, 11, 1),
      bar(5, 10, 12, 9, 11, 1),
    ]);
    expect(dm.getData().map((b) => b.time)).toEqual([1, 5]);
  });

  it('keeps the forming bar at its own time when a later trade goes into it', () => {
    const dm = new DataManager();
    dm.setData([bar(60, 10, 12, 9, 11, 5)]);
    dm.updateLastBarFromTick({ price: 13, volume: 2, time: 75 });
    expect(dm.getData()).toEqual([bar(60, 10, 13, 9, 13, 7)]);
  });

  it('merges a trade into a bar as mergeBar, the bar keeping its time', () => {
    expect(mergeBar(bar(60, 10, 12, 9, 11, 5), { price: 8, volume: 1, time: 90 })).toEqual(bar(60, 10, 12, 8, 8, 6));
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

describe('DataManager.prependBars', () => {
  it('adds the bars older than the first one, in time order, and counts them', () => {
    const dm = new DataManager();
    dm.setData([bar(10, 1, 1, 1, 1, 1), bar(11, 1, 1, 1, 1, 1)]);
    const added = dm.prependBars([bar(8, 2, 2, 2, 2, 1), bar(7, 3, 3, 3, 3, 1), bar(9, 4, 4, 4, 4, 1)]);
    expect(added).toBe(3);
    expect(dm.getData().map((b) => b.time)).toEqual([7, 8, 9, 10, 11]);
  });

  it('skips bars at or after the first loaded bar, duplicates and invalid bars', () => {
    const dm = new DataManager();
    dm.setData([bar(10, 1, 1, 1, 1, 1), bar(11, 1, 1, 1, 1, 1)]);
    const added = dm.prependBars([
      bar(9, 1, 1, 1, 1, 1),
      bar(9, 5, 5, 5, 5, 1),
      bar(10, 9, 9, 9, 9, 1),
      bar(12, 1, 1, 1, 1, 1),
      bar(8, NaN, 1, 1, 1, 1),
    ]);
    expect(added).toBe(1);
    expect(dm.getData().map((b) => b.time)).toEqual([9, 10, 11]);
    expect(dm.getData()[1].open).toBe(1); // the loaded bar wins over the page's copy
  });

  it('repairs bars like setData does', () => {
    const dm = new DataManager();
    dm.setData([bar(10, 1, 1, 1, 1, 1)]);
    dm.prependBars([bar(9, 10, 10.5, 9, 11)]);
    expect(dm.getData()[0]).toMatchObject({ high: 11, low: 9, volume: 0 });
  });

  it('returns 0 and leaves the data alone when nothing is older', () => {
    const dm = new DataManager();
    dm.setData([bar(10, 1, 1, 1, 1, 1)]);
    const before = dm.getData();
    expect(dm.prependBars([bar(10, 1, 1, 1, 1, 1), bar(11, 1, 1, 1, 1, 1)])).toBe(0);
    expect(dm.prependBars([])).toBe(0);
    expect(dm.getData()).toBe(before);
  });

  it('takes every valid bar into an empty series', () => {
    const dm = new DataManager();
    expect(dm.prependBars([bar(2, 1, 1, 1, 1, 1), bar(1, 1, 1, 1, 1, 1)])).toBe(2);
    expect(dm.getData().map((b) => b.time)).toEqual([1, 2]);
  });
});

describe('DataManager — one time unit per series', () => {
  const S = 1_790_000_000; // seconds
  const seconds = () => {
    const dm = new DataManager();
    dm.setData([bar(S, 1, 2, 0.5, 1.5, 1), bar(S + 60, 1, 2, 0.5, 1.5, 1)]);
    return dm;
  };

  it('stores bars that come in milliseconds in the series’ seconds', () => {
    const dm = seconds();
    dm.appendBar(bar((S + 120) * 1000, 1, 2, 0.5, 1.5, 1));
    dm.updateLastBar(bar((S + 120) * 1000, 1, 3, 0.5, 2, 1));
    dm.updateLastBarFromTick({ price: 2.5, time: (S + 120) * 1000 });
    expect(dm.getData().map((b) => b.time)).toEqual([S, S + 60, S + 120]);
  });

  it('stores older bars in the series’ unit, so a page in milliseconds lands before the first', () => {
    const dm = seconds();
    expect(dm.prependBars([bar((S - 60) * 1000, 1, 2, 0.5, 1.5, 1)])).toBe(1);
    expect(dm.getData()[0].time).toBe(S - 60);
  });

  it('stores bars in seconds in a series in milliseconds', () => {
    const dm = new DataManager();
    dm.setData([bar(S * 1000, 1, 2, 0.5, 1.5, 1)]);
    dm.appendBar(bar(S + 60, 1, 2, 0.5, 1.5, 1));
    expect(dm.getData()[1].time).toBe((S + 60) * 1000);
  });
});
