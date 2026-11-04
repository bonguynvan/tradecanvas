import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { DataManager } from '../../DataManager.js';
import { DisplaySeries } from '../DisplaySeries.js';

const bar = (i: number, close: number): OHLCBar => ({ time: 1_700_000_000 + i * 60, open: close - 1, high: close + 1, low: close - 2, close, volume: 1 });
const rising = (n: number) => Array.from({ length: n }, (_, i) => bar(i, 100 + i * 3));

function setup(type = 'heikinAshi') {
  const bars = new DataManager();
  bars.setData(rising(30));
  const state = { type, options: {} as Record<string, unknown> };
  const boxes: number[] = [];
  const display = new DisplaySeries({
    bars: () => bars.getData(),
    version: () => bars.version(),
    chartType: () => state.type,
    chartTypeOptions: () => state.options,
    lookup: () => undefined,
    stepAt: () => 0.01,
    onBoxSize: (box) => boxes.push(box),
  });
  return { bars, state, display, boxes };
}

describe('DisplaySeries', () => {
  it('draws the bars themselves for a plain chart type', () => {
    const { bars, display } = setup('candlestick');
    expect(display.get()).toBe(bars.getData());
  });

  it('keeps the series it made while nothing it is made of changed', () => {
    const { display } = setup();
    expect(display.get()).toBe(display.get());
  });

  it('makes it again after a write in place, which keeps the same array', () => {
    const { bars, display } = setup();
    const before = display.get();
    bars.updateLastBar(bar(29, 500));
    const after = display.get();
    expect(after).not.toBe(before);
    expect(after[after.length - 1].high).toBeGreaterThan(before[before.length - 1].high);
  });

  it('makes it again for another chart type, or new options for it', () => {
    const { state, display } = setup('renko');
    const bricks = display.get();
    state.options = { renko: { boxSize: 1 } };
    const finer = display.get();
    expect(finer.length).toBeGreaterThan(bricks.length);
    state.type = 'candlestick';
    expect(display.get().length).toBe(30);
  });

  it('hands the point & figure box to its renderer each time it builds the columns', () => {
    const { bars, display, boxes } = setup('pointAndFigure');
    display.get();
    display.get();
    expect(boxes.length).toBe(1);
    bars.appendBar(bar(30, 300));
    display.get();
    expect(boxes.length).toBe(2);
  });

  it('leaves an empty series as it is', () => {
    const { bars, display } = setup();
    bars.setData([]);
    expect(display.get()).toEqual([]);
  });

  it('invalidate() makes it again when something it cannot see changed (a plugin chart type)', () => {
    const { display } = setup();
    const first = display.get();
    display.invalidate();
    expect(display.get()).not.toBe(first);
  });
});
