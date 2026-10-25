// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { feedBars, type FedBars } from '../frameworks/feedBars.js';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const bar = (time: number, close = 1): OHLCBar => ({ time, open: 1, high: Math.max(2, close), low: 0, close, volume: 1 });

/** A chart that keeps its bars as the real one does, and counts how they came. */
function fakeChart(options: { extendedHours?: boolean; replay?: boolean } = {}) {
  const held: OHLCBar[] = [];
  return {
    held,
    setData: vi.fn((bars: OHLCBar[]) => { held.splice(0, held.length, ...bars); }),
    updateLastBar: vi.fn((b: OHLCBar) => { held[held.length - 1] = b; }),
    appendBar: vi.fn((b: OHLCBar) => { held.push(b); }),
    appendBars: vi.fn((bars: OHLCBar[]) => { held.push(...bars); }),
    getData: () => held,
    isExtendedHoursVisible: () => options.extendedHours ?? true,
    isReplayActive: () => options.replay ?? false,
  };
}

describe('feedBars', () => {
  it('gives the first bars as a series', () => {
    const chart = fakeChart();
    feedBars(chart, [bar(1), bar(2)], null);
    expect(chart.setData).toHaveBeenCalledWith([bar(1), bar(2)]);
  });

  it('feeds a new array that changes the last bar or adds bars as ticks', () => {
    const chart = fakeChart();
    let fed: FedBars = feedBars(chart, [bar(1), bar(2)], null);
    fed = feedBars(chart, [bar(1), bar(2, 5)], fed);
    expect(chart.updateLastBar).toHaveBeenLastCalledWith(bar(2, 5));
    fed = feedBars(chart, [bar(1), bar(2, 6), bar(3)], fed);
    expect(chart.updateLastBar).toHaveBeenLastCalledWith(bar(2, 6));
    expect(chart.appendBar).toHaveBeenLastCalledWith(bar(3));
    // The bar before the new ones is as it was: only they go in, together.
    fed = feedBars(chart, [bar(1), bar(2, 6), bar(3), bar(4), bar(5)], fed);
    expect(chart.updateLastBar).toHaveBeenCalledTimes(2);
    expect(chart.appendBars).toHaveBeenLastCalledWith([bar(4), bar(5)]);
    // A volume-only change is a change.
    fed = feedBars(chart, [bar(1), bar(2, 6), bar(3), bar(4), { ...bar(5), volume: 9 }], fed);
    expect(chart.updateLastBar).toHaveBeenLastCalledWith({ ...bar(5), volume: 9 });
    feedBars(chart, [bar(1), bar(2, 6), bar(3), bar(4), { ...bar(5), volume: 9 }], fed);
    expect(chart.setData).toHaveBeenCalledTimes(1);
    expect(chart.updateLastBar).toHaveBeenCalledTimes(3);
    expect(chart.held).toEqual([bar(1), bar(2, 6), bar(3), bar(4), { ...bar(5), volume: 9 }]);
  });

  it('feeds the same array changed in place as ticks', () => {
    const chart = fakeChart();
    const bars = [bar(1), bar(2)];
    let fed = feedBars(chart, bars, null);
    Object.assign(bars[1], { close: 7, high: 7 });
    fed = feedBars(chart, bars, fed);
    expect(chart.updateLastBar).toHaveBeenLastCalledWith(bar(2, 7));
    bars.push(bar(3));
    fed = feedBars(chart, bars, fed);
    expect(chart.appendBar).toHaveBeenLastCalledWith(bar(3));
    // The last bar's time moved in place: not the same bar, so a new series.
    bars[2].time = 4;
    feedBars(chart, bars, fed);
    expect(chart.setData).toHaveBeenCalledTimes(2);
    expect(chart.held).toEqual([bar(1), bar(2, 7), bar(4)]);
  });

  it('takes anything else as a new series', () => {
    const before = [bar(1), bar(2), bar(3)];
    const others = [
      [bar(1, 9), bar(2), bar(3)],
      [bar(1), bar(2), bar(4)],
      [bar(1), bar(2)],
      [...before, bar(3)],
      [...before, bar(4), bar(2)],
      [...before, { ...bar(4), close: Number.NaN }],
      [bar(1), bar(2), { ...bar(3), close: Number.NaN }],
      [],
    ];
    for (const next of others) {
      const chart = fakeChart();
      const fed = feedBars(chart, before, null);
      chart.setData.mockClear();
      feedBars(chart, next, fed);
      expect(chart.setData).toHaveBeenCalledWith(next);
      expect(chart.updateLastBar).not.toHaveBeenCalled();
      expect(chart.appendBar).not.toHaveBeenCalled();
      expect(chart.appendBars).not.toHaveBeenCalled();
    }
  });

  it('takes the bars again when something else gave the chart bars since', () => {
    const chart = fakeChart();
    const fed = feedBars(chart, [bar(1), bar(2)], null);
    chart.held.push(bar(3, 99)); // a stream's bar, or one from the chart itself
    feedBars(chart, [bar(1), bar(2, 5)], fed);
    expect(chart.updateLastBar).not.toHaveBeenCalled();
    expect(chart.held).toEqual([bar(1), bar(2, 5)]);
  });

  it('takes the bars again when another writer left the last time as it was', () => {
    const chart = fakeChart();
    const fed = feedBars(chart, [bar(1), bar(2)], null);
    chart.held[1] = bar(2, 50); // a stream's tick on the same bar, or another series on the same times
    feedBars(chart, [bar(1), bar(2, 5)], fed);
    expect(chart.updateLastBar).not.toHaveBeenCalled();
    expect(chart.held).toEqual([bar(1), bar(2, 5)]);
  });

  it('takes the bars again when the array fed before was cut short in place', () => {
    const chart = fakeChart();
    const old = [bar(1), bar(2), bar(3), bar(4)];
    const fed = feedBars(chart, old, null);
    old.length = 0;
    expect(() => feedBars(chart, [bar(1), bar(2), bar(3), bar(4), bar(5)], fed)).not.toThrow();
    expect(chart.setData).toHaveBeenCalledTimes(2);
  });

  it('takes the bars again when the chart left out the last one fed', () => {
    const chart = fakeChart();
    chart.setData.mockImplementation((bars: OHLCBar[]) => { chart.held.splice(0, chart.held.length, ...bars.filter((b) => !Number.isNaN(b.close))); });
    const fed = feedBars(chart, [bar(1), bar(2), { ...bar(3), close: Number.NaN }], null);
    feedBars(chart, [bar(1), bar(2), bar(3, 4)], fed);
    expect(chart.updateLastBar).not.toHaveBeenCalled();
    expect(chart.setData).toHaveBeenCalledTimes(2);
  });

  it('takes the bars again after a last bar the chart could not take, hours hidden or not', () => {
    const chart = fakeChart({ extendedHours: false });
    chart.setData.mockImplementation((bars: OHLCBar[]) => { chart.held.splice(0, chart.held.length, ...bars.filter((b) => !Number.isNaN(b.close))); });
    const fed = feedBars(chart, [bar(1), bar(2), { ...bar(3), close: Number.NaN }], null);
    feedBars(chart, [bar(1), bar(2), bar(3, 4)], fed);
    expect(chart.updateLastBar).not.toHaveBeenCalled();
    expect(chart.held).toEqual([bar(1), bar(2), bar(3, 4)]);
  });

  it('ticks on while extended hours keep the last bar aside, and during a replay', () => {
    const hidden = fakeChart({ extendedHours: false });
    hidden.setData.mockImplementation((bars: OHLCBar[]) => { hidden.held.splice(0, hidden.held.length, ...bars.slice(0, 1)); });
    let fed = feedBars(hidden, [bar(1), bar(2)], null);
    fed = feedBars(hidden, [bar(1), bar(2, 3)], fed);
    expect(hidden.updateLastBar).toHaveBeenCalledWith(bar(2, 3));
    expect(hidden.setData).toHaveBeenCalledTimes(1);

    const replay = fakeChart({ replay: true });
    fed = feedBars(replay, [bar(1), bar(2)], null);
    replay.held.splice(1); // the replay shows fewer bars than the live series has
    feedBars(replay, [bar(1), bar(2), bar(3)], fed);
    expect(replay.appendBar).toHaveBeenCalledWith(bar(3));
  });

  it('gives the chart plain copies, not the bars it was given', () => {
    const chart = fakeChart();
    const a = Object.freeze(bar(1));
    const fed = feedBars(chart, [a], null);
    const set = chart.setData.mock.calls[0][0] as OHLCBar[];
    expect(set[0]).toEqual(a);
    expect(set[0]).not.toBe(a);
    feedBars(chart, [a, Object.freeze(bar(3))], fed);
    expect(Object.isFrozen(chart.appendBar.mock.calls[0][0])).toBe(false);
  });

  it('does not see an older bar changed in place: that needs a new bar in its place', () => {
    const chart = fakeChart();
    const bars = [bar(1), bar(2), bar(3)];
    const fed = feedBars(chart, bars, null);
    const next = bars.slice();
    next[0].close = 9;
    feedBars(chart, next, fed);
    expect(chart.setData).toHaveBeenCalledTimes(1);
  });
});

describe('feedBars on a chart', () => {
  let host: HTMLDivElement;
  let chart: Chart;
  const others: Chart[] = [];
  afterEach(() => {
    chart.destroy();
    for (const other of others.splice(0)) other.destroy();
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('leaves the chart as setData would, with hours hidden, shown again and bars in batches', () => {
    installChartStubs();
    host = sizedHost();
    chart = new Chart(host, {});
    const oracle = new Chart(sizedHost(), {});
    others.push(oracle);
    const nyse = { symbol: 'AAA', timeZone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] };
    chart.setSymbolInfo(nyse);
    oracle.setSymbolInfo(nyse);
    const HALF_HOUR = 30 * 60_000;
    const T0 = Date.UTC(2026, 0, 5, 5); // Monday, midnight in New York
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const at = (i: number, close: number): OHLCBar => ({ time: T0 + i * HALF_HOUR, open: 10, high: Math.max(10, close), low: Math.min(10, close), close, volume: 1 });
    let given = Array.from({ length: 30 }, (_, i) => at(i, 10));
    let fed = feedBars(chart, given, null);
    for (let step = 0; step < 300; step++) {
      if (step % 37 === 0) {
        const show = step % 74 === 0;
        chart.setExtendedHours(show);
        oracle.setExtendedHours(show);
      }
      const n = given.length;
      const close = 5 + Math.round(random() * 10);
      given = random() < 0.5
        ? [...given.slice(0, -1), { ...at(n - 1, close) }]
        : [...given, ...Array.from({ length: 1 + Math.floor(random() * 3) }, (_, k) => at(n + k, close))];
      fed = feedBars(chart, given, fed);
      oracle.setData(given);
      expect(chart.getData(), `step ${step}`).toEqual(oracle.getData());
    }
  });

  it('keeps a view that stops following new bars, bars added one or several at a time', () => {
    installChartStubs();
    host = sizedHost();
    chart = new Chart(host, {});
    type View = { viewport: { getState(): { visibleRange: { from: number; to: number } } } };
    // The first bar on screen: the view scrolled if it moved (the last can grow into the right margin).
    const first = () => (chart as unknown as View).viewport.getState().visibleRange.from;
    const T = 60_000;
    const T0 = Date.UTC(2025, 0, 6);
    chart.setData(Array.from({ length: 100 }, (_, i) => bar(T0 + i * T)));
    chart.setAutoScroll(false);
    const before = first();
    chart.appendBar(bar(T0 + 100 * T));
    expect(first()).toBe(before);
    chart.appendBars([bar(T0 + 101 * T), bar(T0 + 102 * T)]);
    expect(first()).toBe(before);
  });

  it('leaves the chart with the bars given, tick by tick and after another writer', () => {
    installChartStubs();
    host = sizedHost();
    chart = new Chart(host, {});
    const T0 = Date.UTC(2025, 0, 6);
    const T = 60_000;
    const bars = Array.from({ length: 50 }, (_, i) => bar(T0 + i * T, 10 + (i % 5)));
    let fed = feedBars(chart, bars, null);
    let given = bars;
    for (let i = 50; i < 60; i++) {
      given = [...given.slice(0, -1), { ...given[given.length - 1], close: 20, high: 20 }];
      fed = feedBars(chart, given, fed);
      given = [...given, bar(T0 + i * T, 11)];
      fed = feedBars(chart, given, fed);
      expect(chart.getData()).toEqual(given);
    }
    chart.appendBar(bar(T0 + 60 * T, 99)); // another writer
    given = [...given.slice(0, -1), { ...given[given.length - 1], close: 30, high: 30 }];
    feedBars(chart, given, fed);
    expect(chart.getData()).toEqual(given);
  });
});
