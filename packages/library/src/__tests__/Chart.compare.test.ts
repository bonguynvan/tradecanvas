// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
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
