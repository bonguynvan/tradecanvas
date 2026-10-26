// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { barIndexToX } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { fakeContext, installChartStubs, sizedHost } from './chartTestEnv.js';

/**
 * `updateBar` corrects a loaded bar, wherever it is: the chart is then what
 * `setData` with the corrected series would give, its view kept, and no
 * live price taken from it.
 */
const NYSE = { symbol: 'AAA', timeZone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] };
const HALF_HOUR = 30 * 60_000;
const T0 = Date.UTC(2026, 0, 5, 5); // Monday, midnight in New York

const at = (slot: number, close = 10, volume: number | undefined = 3): OHLCBar => ({
  time: T0 + slot * HALF_HOUR, open: 10, high: Math.max(10, close) + 0.5, low: Math.min(10, close) - 0.5, close,
  ...(volume === undefined ? {} : { volume }),
});
const slots = (from: number, n: number) => Array.from({ length: n }, (_, i) => at(from + i, 10 + (i % 5)));
/** The six fields: a stream's bars carry more. */
const plain = (bars: readonly OHLCBar[]) => bars.map(({ time, open, high, low, close, volume }) => ({ time, open, high, low, close, volume }));

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const inside = (chart: Chart) => chart as unknown as Any;
/** The events setData sent after it (the indicators', once the task is over) gone out. */
const settled = () => Promise.resolve();

const charts: Chart[] = [];
afterEach(() => {
  for (const chart of charts.splice(0)) chart.destroy();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function make(options: Record<string, unknown> = {}) {
  installChartStubs();
  const chart = new Chart(sizedHost(), { features: { replay: true, alerts: true, trading: true }, ...options });
  charts.push(chart);
  chart.setSymbolInfo(NYSE);
  chart.setExtendedHours(true);
  const ids = {
    ema: chart.addIndicator('ema', { period: 5 })!,
    rsi: chart.addIndicator('rsi', { period: 4 }, 'bottom')!,
    vwap: chart.addIndicator('svwap')!,
    zz: chart.addIndicator('zigzag')!,
  };
  return { chart, ids };
}

/** A chart given `bars` with setData, to compare with. */
function oracleOf(bars: OHLCBar[], options: Record<string, unknown> = {}) {
  const oracle = make(options);
  oracle.chart.setData(bars);
  return oracle;
}

function expectSameAs(live: ReturnType<typeof make>, oracle: ReturnType<typeof make>): void {
  expect(plain(live.chart.getData())).toEqual(plain(oracle.chart.getData()));
  for (const key of ['ema', 'rsi', 'vwap', 'zz'] as const) {
    expect(live.chart.getIndicatorOutput(live.ids[key])?.series, key).toEqual(oracle.chart.getIndicatorOutput(oracle.ids[key])?.series);
  }
}

describe('Chart.updateBar', () => {
  it('replaces the bar with the same time and keeps the view', () => {
    const live = make();
    const bars = slots(0, 200);
    live.chart.setData(bars);
    live.chart.setVisibleRange(bars[40].time, bars[90].time);
    const view = live.chart.getVisibleTimeRange();
    const fixed = { ...bars[197], close: 8, low: 7 };
    expect(live.chart.updateBar(fixed)).toBe(true);
    const whole = bars.slice();
    whole[197] = fixed;
    expectSameAs(live, oracleOf(whole));
    expect(live.chart.getVisibleTimeRange()).toEqual(view);
  });

  it('returns false and changes nothing for a time not loaded or a bar it cannot take', async () => {
    const { chart } = make();
    const bars = slots(0, 20);
    chart.setData(bars);
    await settled();
    const before = plain(chart.getData());
    const told: unknown[] = [];
    chart.on('dataUpdate', (e) => told.push(e.payload));
    chart.on('indicatorUpdate', (e) => told.push(e.payload));
    expect(chart.updateBar({ ...bars[5], time: bars[5].time + 1 })).toBe(false); // between two bars
    expect(chart.updateBar(at(-1))).toBe(false); // before the first: prependBars'
    expect(chart.updateBar(at(20))).toBe(false); // after the last: appendBar's
    expect(chart.updateBar({ ...bars[5], close: Number.NaN })).toBe(false);
    expect(chart.updateBar({ ...bars[5], high: 1, low: 2 })).toBe(false);
    expect(chart.updateBar({ ...bars[5], volume: -1 })).toBe(false);
    expect(plain(chart.getData())).toEqual(before);
    await Promise.resolve();
    expect(told).toEqual([]);
  });

  it('takes a bar in seconds onto a series in milliseconds', () => {
    const { chart } = make();
    const bars = slots(0, 20);
    chart.setData(bars);
    expect(chart.updateBar({ ...bars[17], time: bars[17].time / 1000, close: 13, high: 13.5 })).toBe(true);
    expect(chart.getData()[17]).toMatchObject({ time: bars[17].time, close: 13 });
  });

  it('draws Heikin-Ashi and Renko from the corrected bars', () => {
    for (const chartType of ['heikinAshi', 'renko'] as const) {
      const live = make({ chartType });
      const bars = slots(0, 120);
      live.chart.setData(bars);
      inside(live.chart).getDisplayData();
      const whole = bars.slice();
      whole[110] = { ...bars[110], close: 20, high: 20.5 };
      live.chart.updateBar(whole[110]);
      const oracle = oracleOf(whole, { chartType });
      expect(plain(inside(live.chart).getDisplayData()), chartType).toEqual(plain(inside(oracle.chart).getDisplayData()));
    }
  });

  it('fires no alert and moves no order price; the price line shows the last bar’s corrected close', () => {
    const { chart } = make();
    chart.setData(slots(0, 40).map((b) => ({ ...b, open: 10, high: 10.5, low: 9.5, close: 10 })));
    const fired: string[] = [];
    chart.on('alertTriggered', (e) => fired.push(e.payload.message ?? ''));
    chart.addAlert(9, 'crossingDown', 'under 9');
    const orders = () => inside(chart).tradingManager.getCurrentPrice();
    const price = orders();
    chart.updateBar({ ...at(38, 8), open: 10 });
    chart.updateBar({ ...at(39, 8), open: 10 }); // the last one too
    expect(fired).toEqual([]);
    expect(orders()).toBe(price);
    expect(inside(chart).currentPriceLine.getPrice()).toBe(8);
  });

  it('compares the price line of a corrected last bar with the bar before it', () => {
    const { chart } = make();
    chart.setData(slots(0, 40).map((b) => ({ ...b, close: 10, open: 10 })));
    chart.updateBar({ ...at(39, 12), open: 10 });
    expect(inside(chart).currentPriceLine.previousClose).toBe(10);
    chart.updateBar({ ...at(38, 11), open: 10 });
    chart.updateBar({ ...at(39, 9), open: 10 });
    expect(inside(chart).currentPriceLine.previousClose).toBe(11);
  });

  it('seeds the price alert from a corrected last bar: the next price crosses from it', () => {
    const { chart } = make();
    chart.setData(slots(0, 40).map((b) => ({ ...b, close: 100, open: 100, high: 101, low: 99 })));
    const fired: string[] = [];
    chart.on('alertTriggered', (e) => fired.push(e.payload.message ?? ''));
    chart.addAlert(95, 'crossingDown', 'under 95');
    chart.updateBar({ time: at(39).time, open: 100, high: 101, low: 93, close: 94, volume: 3 });
    expect(fired).toEqual([]);
    // From 94 to 94.1 crosses nothing; from the old close, 100, it would have.
    chart.updateLastBar({ time: at(39).time, open: 100, high: 101, low: 93, close: 94.1, volume: 4 });
    expect(fired).toEqual([]);
  });

  it('during a replay keeps the bars shown; replayStop shows the correction', () => {
    const { chart } = make();
    const bars = slots(0, 60);
    chart.setData(bars);
    chart.replayStart({ startIndex: 30, paused: true });
    const replayed = plain(chart.getData());
    expect(chart.updateBar({ ...bars[58], close: 14, high: 14.5 })).toBe(true);
    expect(plain(chart.getData())).toEqual(replayed);
    chart.replayStop();
    expect(chart.getData()[58].close).toBe(14);
  });

  it('corrects a hidden extended-hours bar, shown with the hours', () => {
    const { chart } = make();
    chart.setExtendedHours(false);
    const bars = slots(0, 96); // two days of half hours
    chart.setData(bars);
    const hidden = bars.findIndex((b, i) => i > 50 && !chart.getData().some((s) => s.time === b.time));
    expect(chart.updateBar({ ...bars[hidden], close: 15, high: 15.5 })).toBe(true);
    chart.setExtendedHours(true);
    expect(chart.getData()[hidden].close).toBe(15);
  });

  it('several corrections in one task: one indicatorUpdate from the earliest, one computation per indicator', async () => {
    const { chart } = make();
    const bars = slots(0, 200);
    chart.setData(bars);
    await settled();
    const engine = inside(chart).indicatorEngine;
    const computes = vi.spyOn(engine, 'compute');
    const updates: unknown[] = [];
    chart.on('indicatorUpdate', (e) => updates.push(e.payload));
    for (const k of [199, 195, 197]) chart.updateBar({ ...bars[k], close: 11.5 });
    expect(computes).not.toHaveBeenCalled();
    chart.getIndicatorOutput(chart.getActiveIndicators()[0].instanceId);
    expect(computes).toHaveBeenCalledTimes(4);
    await Promise.resolve();
    expect(updates).toEqual([{ from: 195 }]);
  });

  it.each([
    ['the same values', (b: OHLCBar) => b],
    ['no volume', (b: OHLCBar) => ({ ...b, volume: undefined })],
    ['a high under its close', (b: OHLCBar) => ({ ...b, high: b.close - 0.25 })],
  ])('a bar with %s sent again computes nothing and tells nothing', async (_, shape) => {
    const { chart } = make();
    const bars = slots(0, 50).map(shape);
    chart.setData(bars);
    await settled();
    const engine = inside(chart).indicatorEngine;
    const computes = vi.spyOn(engine, 'compute');
    const told: unknown[] = [];
    chart.on('dataUpdate', (e) => told.push(e.payload));
    chart.on('indicatorUpdate', (e) => told.push(e.payload));
    expect(chart.updateBar({ ...bars[47] })).toBe(true);
    expect(chart.updateBar({ ...bars[48] })).toBe(true);
    chart.getIndicatorOutput(chart.getActiveIndicators()[0].instanceId);
    expect(computes).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(told).toEqual([]);
  });

  it('sends dataUpdate { kind: "correction", time, index }, after the indicators have it', () => {
    const { chart, ids } = make();
    const bars = slots(0, 50);
    chart.setData(bars);
    const seen: unknown[] = [];
    chart.on('dataUpdate', (e) => {
      seen.push(e.payload);
      seen.push(chart.getIndicatorOutput(ids.ema)!.series[45]!.value);
    });
    chart.updateBar({ ...bars[45], close: 30, high: 30.5 });
    const oracle = oracleOf([...bars.slice(0, 45), { ...bars[45], close: 30, high: 30.5 }, ...bars.slice(46)]);
    expect(seen).toEqual([{ kind: 'correction', time: bars[45].time, index: 45 }, oracle.chart.getIndicatorOutput(oracle.ids.ema)!.series[45]!.value]);
  });

  it('sends no dataUpdate for a bar kept aside or hidden', () => {
    const { chart } = make();
    chart.setExtendedHours(false);
    const bars = slots(0, 96);
    chart.setData(bars);
    const seen: unknown[] = [];
    chart.on('dataUpdate', (e) => seen.push(e.payload));
    const hidden = bars.findIndex((b, i) => i > 50 && !chart.getData().some((s) => s.time === b.time));
    chart.updateBar({ ...bars[hidden], close: 15, high: 15.5 });
    expect(seen).toEqual([]);
    chart.replayStart({ startIndex: 10, paused: true });
    seen.length = 0;
    chart.updateBar({ ...bars[80], close: 15, high: 15.5 });
    expect(seen).toEqual([]);
  });

  describe('a corrected bar under the pointer', () => {
    /** The pointer resting on bar `index`: the crosshair reports it, as a frame does. */
    async function hover(chart: Chart, index: number) {
      const vs = inside(chart).viewport.getState();
      const handler = inside(chart).crosshairHandler;
      handler.onPointerMove({ x: barIndexToX(index, vs), y: vs.chartRect.y + 20 });
      handler.render(fakeContext(document.createElement('canvas')), vs, inside(chart).themeManager.getTheme());
      await Promise.resolve();
    }

    it.each([[197, 197], [198, 197]])('with the pointer on bar %i, crosshairMove and the legend show the new values of bar %i', async (pointed, corrected) => {
      const { chart } = make();
      const bars = slots(0, 200);
      chart.setData(bars);
      chart.setVisibleRange(bars[150].time, bars[199].time);
      const moves: { close?: number; index: number }[] = [];
      chart.on('crosshairMove', (e) => moves.push({ close: e.payload.bar?.close, index: e.payload.barIndex }));
      await hover(chart, pointed);
      expect(moves).toEqual([{ close: bars[pointed].close, index: pointed }]);
      chart.updateBar({ ...bars[corrected], close: 4, low: 3.5 });
      await Promise.resolve();
      expect(moves).toEqual([{ close: bars[pointed].close, index: pointed }, { close: pointed === corrected ? 4 : bars[pointed].close, index: pointed }]);
      const legend = inside(chart).chartLegend;
      const shown = pointed === corrected ? legend.hoverBar : legend.hoverPrev;
      expect(shown.close).toBe(4);
    });

    it('leaves the crosshair alone for a bar further back', async () => {
      const { chart } = make();
      const bars = slots(0, 200);
      chart.setData(bars);
      chart.setVisibleRange(bars[150].time, bars[199].time);
      const moves: unknown[] = [];
      chart.on('crosshairMove', (e) => moves.push(e.payload.barIndex));
      await hover(chart, 197);
      chart.updateBar({ ...bars[190], close: 4, low: 3.5 });
      await Promise.resolve();
      expect(moves).toEqual([197]);
    });
  });

  it('puts the corrected values in the pinned tooltip', () => {
    const { chart } = make();
    const bars = slots(0, 50);
    chart.setData(bars);
    const pinned = inside(chart).pinnedTooltip;
    const data = inside(chart).getDisplayData();
    pinned.pin(data[45], 45, inside(chart).themeManager.getTheme());
    chart.updateBar({ ...bars[45], close: 4, low: 3.5 });
    expect(pinned.pinnedBar.close).toBe(4);
  });

  it('tells a WebGL renderer the bars shown changed in place, and not for a bar sent again', () => {
    const { chart } = make();
    const bars = slots(0, 50);
    chart.setData(bars);
    const revision = () => {
      inside(chart).syncRenderContext();
      return inside(chart).engine.renderCtx.seriesRevision;
    };
    const before = revision();
    chart.updateBar({ ...bars[45] });
    expect(revision()).toBe(before);
    chart.updateBar({ ...bars[45], close: 4, low: 3.5 });
    expect(revision()).not.toBe(before);
  });
});
