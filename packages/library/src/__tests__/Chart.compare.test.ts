// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
import type { CompareRenderer } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 0, 5);
const bar = (time: number, close: number): OHLCBar => ({ time, open: close, high: close + 1, low: close - 1, close, volume: 1 });
const main: OHLCBar[] = Array.from({ length: 60 }, (_, i) => bar(T0 + i * HOUR, 100 + i));
/** The other symbol: every other hour only, at ten times the price. */
const other: OHLCBar[] = Array.from({ length: 30 }, (_, i) => bar(T0 + i * 2 * HOUR, 1000 + i * 10));

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, {});
  chart.setData(main);
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const values = (id: string) => chart.getIndicatorOutput(id)?.series?.map((v) => v?.value ?? null) ?? [];

describe('another symbol on the chart', () => {
  it('asks for the symbol’s bars once, and draws them by time once given', () => {
    const asked: string[] = [];
    chart.on('symbolSeriesRequest', (e) => asked.push(e.payload.symbol));
    const cmp = chart.addIndicator('compareSymbol', { symbol: 'B' }, 'bottom', { scale: 'left' })!;
    expect(asked).toEqual(['B']);
    expect(chart.getRequiredSymbols()).toEqual(['B']);
    expect(values(cmp).every((v) => v === null)).toBe(true);

    chart.setSymbolSeries('B', other);
    expect(values(cmp).slice(0, 4)).toEqual([1000, 1000, 1010, 1010]);
    // A second reader of B: nothing more to ask.
    chart.addIndicator('spread', { symbol: 'B', mode: 'ratio' });
    expect(asked).toEqual(['B']);
  });

  it('takes the spread and the ratio, in a pane of their own', () => {
    chart.setSymbolSeries('B', other);
    const spread = chart.addIndicator('spread', { symbol: 'B' })!;
    const ratio = chart.addIndicator('spread', { symbol: 'B', mode: 'ratio' })!;
    expect(values(spread)[2]).toBe(102 - 1010);
    expect(values(ratio)[2]).toBeCloseTo(102 / 1010);
    expect(chart.getIndicatorPanes().map((p) => p.instanceId)).toEqual([spread, ratio]);
  });

  it('asks again when an indicator switches to a symbol it hasn’t got', () => {
    const asked: string[] = [];
    chart.on('symbolSeriesRequest', (e) => asked.push(e.payload.symbol));
    chart.setSymbolSeries('B', other);
    const cmp = chart.addIndicator('compareSymbol', { symbol: 'B' })!;
    chart.updateIndicator(cmp, { symbol: 'C' });
    expect(asked).toEqual(['C']);
    expect(chart.getRequiredSymbols()).toEqual(['C']);
  });

  it('keeps the symbol in a saved state, and asks for it after a load', () => {
    chart.setSymbolSeries('B', other);
    chart.addIndicator('spread', { symbol: 'B' });
    const saved = chart.saveState()!;
    const fresh = new Chart(sizedHost(), {});
    fresh.setData(main);
    const asked: string[] = [];
    fresh.on('symbolSeriesRequest', (e) => asked.push(e.payload.symbol));
    fresh.loadState(saved);
    expect(asked).toEqual(['B']);
    fresh.destroy();
  });
});

describe('compare lines and the auto scale', () => {
  it('fits the price scale to the compare lines on it', () => {
    chart.setCompareMode('absolute');
    chart.addCompareSymbol('b', 'B', other, '#f00');
    chart.fitContent?.();
    chart.resize();
    const { max } = (chart as unknown as { viewport: { getState(): ViewportState } }).viewport.getState().priceRange;
    expect(max).toBeGreaterThan(1000);
  });
});

describe('percent compares on a percent scale', () => {
  const state = () => (chart as unknown as { viewport: { getState(): ViewportState } }).viewport.getState();
  const lines = () => (chart as unknown as { compareRenderer: CompareRenderer }).compareRenderer;
  /** The first bar on screen. */
  const first = () => Math.max(0, state().visibleRange.from);

  it('reads a later-starting symbol’s own change on a percent scale', () => {
    chart.setScaleMode('percentage');
    // Its bars start ten bars into the screen, flat: 0% all along.
    chart.addCompareSymbol('b', 'B', main.slice(first() + 10).map((b) => bar(b.time, 50)), '#f00');
    const range = lines().getPriceRange(chart.getData(), state())!;
    expect(range.min / state().scaleBaseline!).toBeCloseTo(1);
    expect(range.max / state().scaleBaseline!).toBeCloseTo(1);
  });

  it('gives each compare’s close and its change since its first bar on screen', () => {
    const start = first() + 10;
    chart.addCompareSymbol('b', 'B', main.slice(start).map((b, k) => bar(b.time, 50 + k)), '#f00');
    const [at] = chart.getCompareValues(start + 10);
    expect(at).toMatchObject({ id: 'b', label: 'B', color: '#f00', visible: true, close: 60, stale: false });
    expect(at.change).toBeCloseTo(20);
    // Before its first bar it has nothing to say.
    expect(chart.getCompareValues(start - 1)[0]).toMatchObject({ close: null, change: null });
    // The last bar by default.
    expect(chart.getCompareValues()[0].close).toBe(50 + main.length - 1 - start);
  });

  it('gives a compare’s last close after the main streams on', () => {
    chart.addCompareSymbol('b', 'B', main.map((b) => bar(b.time, 50)), '#f00');
    for (let i = 0; i < 3; i++) chart.appendBar(bar(T0 + (main.length + i) * HOUR, 200 + i));
    const [at] = chart.getCompareValues();
    expect(at.close).toBe(50);
    expect(at.stale).toBe(true);
  });

  it('hides a compare line, and leaves it out of the auto scale', () => {
    chart.setCompareMode('absolute');
    chart.addCompareSymbol('b', 'B', other, '#f00');
    chart.setCompareVisible('b', false);
    expect(chart.getCompareValues()[0].visible).toBe(false);
    expect(state().priceRange.max).toBeLessThan(1000);
    chart.setCompareVisible('b', true);
    expect(state().priceRange.max).toBeGreaterThan(1000);
  });

  it('fits the price scale to a percent line on the first bar on screen after a pan', () => {
    const long = Array.from({ length: 300 }, (_, i) => bar(T0 + i * HOUR, 100 + i));
    chart.setData(long);
    // Falling fast: its line goes well under the bars on screen.
    chart.addCompareSymbol('b', 'B', long.map((b, i) => bar(b.time, 1000 - 3 * i)), '#f00');
    chart.scrollBars(-150);
    const range = lines().getPriceRange(chart.getData(), state())!;
    expect(state().priceRange.min).toBeLessThanOrEqual(range.min);
    expect(state().priceRange.max).toBeGreaterThanOrEqual(range.max);
  });
});

describe('compares on chart types whose bars carry no time', () => {
  const state = () => (chart as unknown as { viewport: { getState(): ViewportState } }).viewport.getState();
  /** The compare renderer the next frames draw with, null when they draw none. */
  const drawnWith = () => {
    let drawn: unknown = 'never set';
    const engine = (chart as unknown as { engine: { setRenderContext(ctx: { compareRenderer: unknown }): void } }).engine;
    const original = engine.setRenderContext.bind(engine);
    engine.setRenderContext = (ctx) => {
      drawn = ctx.compareRenderer;
      original(ctx);
    };
    return () => drawn;
  };

  it('draws no compare line on bricks, lines or columns, nor fits the scale to one', () => {
    chart.setCompareMode('absolute');
    chart.addCompareSymbol('b', 'B', other, '#f00');
    const drawn = drawnWith();
    for (const type of ['renko', 'lineBreak', 'kagi', 'pointAndFigure', 'rangeBars'] as const) {
      chart.setChartType(type);
      expect(drawn(), type).toBeNull();
      expect(state().priceRange.max, type).toBeLessThan(1000);
    }
    // Heikin-Ashi keeps a bar per data bar, and its times.
    chart.setChartType('heikinAshi');
    expect(drawn()).not.toBeNull();
    expect(state().priceRange.max).toBeGreaterThan(1000);
  });

  it('gives each compare’s close at the latest bar there, and no change, whatever bar is asked for', () => {
    chart.addCompareSymbol('b', 'B', other, '#f00');
    chart.setChartType('renko');
    const values = [chart.getCompareValues(), chart.getCompareValues(0)];
    for (const [at] of values) {
      expect(at).toMatchObject({ id: 'b', close: other[other.length - 1].close, change: null, stale: false });
    }
  });
});

describe('a pane in percent', () => {
  it('labels a pane in percent of its first value on screen, and keeps it in a saved state', () => {
    chart.setSymbolSeries('B', other);
    const cmp = chart.addIndicator('compareSymbol', { symbol: 'B' })!;
    // Into a pane of its own.
    const spread = chart.addIndicator('spread', { symbol: 'B' })!;
    expect(chart.setPaneScale(spread, { percent: true })).toBe(true);
    expect(chart.getPaneScale(spread)).toEqual({ log: false, invert: false, percent: true });
    type Probe = { buildPanelRenderInfos(): { instanceId: string; viewport: ViewportState }[] };
    const vp = (chart as unknown as Probe).buildPanelRenderInfos().find((p) => p.instanceId === spread)!.viewport;
    expect(vp.scaleMode).toBe('percentage');
    expect(vp.scaleBaseline).toBeDefined();
    chart.loadState(chart.saveState()!);
    const now = chart.getIndicatorPanes()[0].instanceId;
    expect(chart.getPaneScale(now).percent).toBe(true);
    expect(cmp).toBeTruthy();
  });
});

describe('correlation with another symbol', () => {
  it('asks for the symbol, and draws the correlation once its bars are given', () => {
    const asked: string[] = [];
    chart.on('symbolSeriesRequest', (e) => asked.push(e.payload.symbol));
    const id = chart.addIndicator('correlation', { symbol: 'C', length: 10 })!;
    chart.addIndicator('correlationlog', { symbol: 'D', length: 10 });
    expect(asked).toEqual(['C', 'D']);
    expect(chart.getRequiredSymbols().sort()).toEqual(['C', 'D']);
    // The main series climbs one an hour: a symbol climbing with it correlates fully.
    chart.setSymbolSeries('C', main.map((b) => bar(b.time, b.close * 3)));
    expect(values(id).at(-1)).toBeCloseTo(1, 9);
  });
});

describe('a compare line’s changes', () => {
  it('are told as compareChange: added, its bars, shown or hidden, taken off', () => {
    const changes: unknown[] = [];
    chart.on('compareChange', (e) => changes.push(e.payload));
    chart.addCompareSymbol('cmp_B', 'B', other, '#b552c9');
    chart.updateCompareData('cmp_B', other.slice(1));
    chart.setCompareVisible('cmp_B', false);
    chart.removeCompareSymbol('cmp_B');
    expect(changes).toEqual([
      { id: 'cmp_B', change: 'add' }, { id: 'cmp_B', change: 'data' }, { id: 'cmp_B', change: 'visible' }, { id: 'cmp_B', change: 'remove' },
    ]);
  });

  it('are each told as taken off when they are cleared', () => {
    chart.addCompareSymbol('cmp_B', 'B', other, '#b552c9');
    chart.addCompareSymbol('cmp_C', 'C', other, '#1398a8');
    const changes: unknown[] = [];
    chart.on('compareChange', (e) => changes.push(e.payload));
    chart.clearCompareSymbols();
    expect(changes).toEqual([{ id: 'cmp_B', change: 'remove' }, { id: 'cmp_C', change: 'remove' }]);
    chart.clearCompareSymbols();
    expect(changes).toHaveLength(2);
  });
});
