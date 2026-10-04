import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { SeriesUploads, FLOATS_PER_BAR } from '../seriesUploads.js';

const bar = (i: number, close = 100 + i): OHLCBar => ({ time: 1_700_000_000_000 + i * 60_000, open: close - 1, high: close + 2, low: close - 3, close, volume: 10 + i });
const series = (n: number) => Array.from({ length: n }, (_, i) => bar(i));

describe('SeriesUploads', () => {
  it('writes every bar the first time, relative to a base price', () => {
    const up = new SeriesUploads();
    const change = up.sync(series(3));
    expect(change).toEqual({ full: true, from: 0, to: 3 });
    expect(up.length).toBe(3);
    const base = up.base;
    const v = up.values;
    // open, high, low, close relative to the base, then volume, then direction.
    expect([...v.subarray(0, FLOATS_PER_BAR)]).toEqual([99 - base, 102 - base, 97 - base, 100 - base, 10, 1]);
  });

  it('rewrites only the last bar on a live tick', () => {
    const up = new SeriesUploads();
    const data = series(5);
    up.sync(data);
    data[4] = { ...data[4], close: 90, low: 89 };
    expect(up.sync(data)).toEqual({ full: false, from: 4, to: 5 });
    expect(up.values[4 * FLOATS_PER_BAR + 3]).toBe(90 - up.base);
    // Down now: the close is below the open.
    expect(up.values[4 * FLOATS_PER_BAR + 5]).toBe(0);
  });

  it('writes only the new bars when bars are appended', () => {
    const up = new SeriesUploads();
    const data = series(5);
    up.sync(data);
    data.push(bar(5), bar(6));
    expect(up.sync(data)).toEqual({ full: false, from: 5, to: 7 });
    expect(up.length).toBe(7);
  });

  it('writes everything for a new array, whatever it holds', () => {
    const up = new SeriesUploads();
    up.sync(series(5));
    expect(up.sync(series(7)).full).toBe(true);
  });

  it('starts over when the history changes', () => {
    const up = new SeriesUploads();
    up.sync(series(5));
    const data = series(5);
    up.sync(data);
    data[1] = { ...data[1], close: 500 };
    expect(up.sync(data).full).toBe(true);
    // Older bars prepended (history paging): a new first bar.
    const paged = [bar(-1), ...series(5)];
    expect(up.sync(paged).full).toBe(true);
    // Fewer bars.
    expect(up.sync(series(2)).full).toBe(true);
  });

  it('reports nothing to write when nothing changed', () => {
    const up = new SeriesUploads();
    const data = series(4);
    up.sync(data);
    expect(up.sync(data)).toEqual({ full: false, from: 4, to: 4 });
  });

  it('empties for no bars', () => {
    const up = new SeriesUploads();
    up.sync(series(3));
    expect(up.sync([]).full).toBe(true);
    expect(up.length).toBe(0);
  });
});
