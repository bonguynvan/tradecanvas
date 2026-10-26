// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DataAdapter, OHLCBar } from '@tradecanvas/commons';
import { MARKET_HOSE } from '@tradecanvas/commons';
import { HiLoRenderer, PointAndFigureRenderer } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';
import { secondBars } from './secondBars.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 0, 1);
/** A steady climb with a dip every tenth bar. */
const bars: OHLCBar[] = Array.from({ length: 200 }, (_, i) => {
  const p = 100 + i * 0.5 - (i % 10 === 9 ? 3 : 0);
  return { time: T0 + i * HOUR, open: p - 0.2, high: p + 0.4, low: p - 0.4, close: p, volume: 10 };
});

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, {});
  chart.setData(bars);
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

type RenderContext = { chartRenderer: unknown; priceLines?: { isHighLowVisible(): boolean; getBidAsk(): unknown } | null };
type Probe = {
  chartRenderer: unknown;
  getDisplayData(): OHLCBar[];
  syncRenderContext(): void;
  engine: { renderCtx: RenderContext };
  buildRenderContext(): RenderContext;
};
const probe = (): Probe => {
  const p = chart as unknown as Probe;
  p.buildRenderContext = () => { p.syncRenderContext(); return p.engine.renderCtx; };
  return p;
};

describe('the HiLo chart type', () => {
  it('draws high-low bars', () => {
    chart.setChartType('hiLo');
    expect(probe().chartRenderer).toBeInstanceOf(HiLoRenderer);
  });
});

describe('chart type settings', () => {
  it('sets the Renko box, and goes back to ATR boxes', () => {
    chart.setChartType('renko');
    chart.setChartTypeOptions({ renko: { boxSize: 2 } });
    const bricks = probe().getDisplayData();
    expect(bricks.length).toBeGreaterThan(10);
    expect(bricks.every((b) => Math.abs(Math.abs(b.close - b.open) - 2) < 1e-9)).toBe(true);
    chart.setChartTypeOptions({ renko: { boxSize: 'atr' } });
    expect(probe().getDisplayData().some((b) => Math.abs(Math.abs(b.close - b.open) - 2) > 1e-6)).toBe(true);
  });

  it('sets the lines of Line Break, Kagi’s reversal, Point & Figure’s box and reversal, and the range', () => {
    // A dip under the last line but not the last three turns a one-line break only.
    chart.setData(bars.map((b, i) => (i % 10 === 9 ? { ...b, close: b.close + 3 - 1.2 } : b)));
    const downs = () => probe().getDisplayData().filter((b) => b.close < b.open).length;
    chart.setChartType('lineBreak');
    const three = downs();
    chart.setChartTypeOptions({ lineBreak: { lines: 1 } });
    expect(downs()).toBeGreaterThan(three);

    chart.setData(bars);
    chart.setChartType('kagi');
    chart.setChartTypeOptions({ kagi: { reversal: 1, reversalType: 'price' } });
    const fine = probe().getDisplayData().length;
    chart.setChartTypeOptions({ kagi: { reversal: 10, reversalType: 'percent' } });
    expect(probe().getDisplayData().length).toBeLessThan(fine);

    chart.setChartType('pointAndFigure');
    chart.setChartTypeOptions({ pointAndFigure: { boxSize: 0.5, reversal: 1 } });
    const small = probe().getDisplayData().length;
    chart.setChartTypeOptions({ pointAndFigure: { boxSize: 5, reversal: 3 } });
    expect(probe().getDisplayData().length).toBeLessThan(small);

    chart.setChartType('rangeBars');
    chart.setChartTypeOptions({ rangeBars: { range: 1 } });
    // The last bar is the one still forming: it ends at the last close, whatever its range.
    const ranged = probe().getDisplayData();
    expect(ranged.slice(0, -1).every((b) => Math.abs(b.high - b.low - 1) < 1e-9)).toBe(true);
    expect(ranged.at(-1)!.close).toBe(bars.at(-1)!.close);
  });

  it('keeps settings of other types, ignores ones it can’t use, and hands out a copy', () => {
    chart.setChartTypeOptions({ renko: { boxSize: 2 } });
    chart.setChartTypeOptions({ kagi: { reversal: -3 }, lineBreak: { lines: 2.5 } });
    const options = chart.getChartTypeOptions();
    expect(options).toEqual({ renko: { boxSize: 2 }, kagi: {}, lineBreak: {} });
    (options.renko as { boxSize: number }).boxSize = 9;
    expect(chart.getChartTypeOptions().renko).toEqual({ boxSize: 2 });
  });

  it('are kept in a saved state', () => {
    chart.setChartType('renko');
    chart.setChartTypeOptions({ renko: { boxSize: 3 } });
    const saved = chart.saveState()!;
    chart.setChartTypeOptions({ renko: { boxSize: 'atr' } });
    chart.loadState(saved);
    expect(chart.getChartTypeOptions().renko).toEqual({ boxSize: 3 });
  });
});

describe('range bars', () => {
  it('draws range bars of one-second bars at 100,000, ending at the live price', () => {
    const seconds = secondBars(145);
    chart.setData(seconds);
    chart.setChartType('rangeBars');
    expect(probe().getDisplayData().length).toBeGreaterThan(10);
    expect(probe().getDisplayData().at(-1)!.close).toBe(seconds.at(-1)!.close);

    const last = seconds.at(-1)!;
    chart.updateLastBar({ ...last, close: last.close + 3, high: Math.max(last.high, last.close + 3) });
    expect(probe().getDisplayData().at(-1)!.close).toBe(last.close + 3);
  });

  it('puts automatic range bars on the symbol’s price step', () => {
    chart.setData(secondBars(145));
    chart.setChartType('rangeBars');
    const spans = () => probe().getDisplayData().slice(0, -1).map((b) => Number((b.high - b.low).toFixed(9)));
    expect(new Set(spans())).toEqual(new Set([10]));
    chart.setSymbolInfo({ symbol: 'BTCUSDT', minTick: 25 });
    expect(new Set(spans())).toEqual(new Set([25]));
  });

  it('keeps the automatic range when the last price crosses a band edge', () => {
    // Steps of 0.05 below 50 and 0.1 from it; bars moving 0.05 around 50 have a mean true range of 0.05.
    chart.setMarket({ type: 'stock', priceStep: 0.01, priceSteps: MARKET_HOSE.priceSteps });
    const cycle = [50, 50.05, 50, 49.95];
    const around = Array.from({ length: 120 }, (_, i): OHLCBar => {
      const open = cycle[(i + 3) % 4];
      const close = cycle[i % 4];
      return { time: T0 + i * HOUR, open, high: Math.max(open, close), low: Math.min(open, close), close, volume: 1 };
    });
    chart.setData(around);
    chart.setChartType('rangeBars');
    const spans = () => new Set(probe().getDisplayData().slice(0, -1).map((b) => Number((b.high - b.low).toFixed(9))));
    const last = around.at(-1)!;
    for (const close of [50.05, 49.95, 50.05]) {
      chart.updateLastBar({ ...last, close, high: Math.max(last.open, close), low: Math.min(last.open, close) });
      expect(spans()).toEqual(new Set([0.1]));
    }
  });
});

describe('the main series and lines on the price pane', () => {
  it('hides and shows the main series', () => {
    chart.setMainSeriesVisible(false);
    expect(chart.isMainSeriesVisible()).toBe(false);
    expect(probe().buildRenderContext().chartRenderer).toBeNull();
    chart.setMainSeriesVisible(true);
    expect(probe().buildRenderContext().chartRenderer).not.toBeNull();
  });

  it('marks the visible high and low, from the options too', () => {
    expect(probe().buildRenderContext().priceLines?.isHighLowVisible()).toBe(false);
    chart.setHighLowLines(true);
    expect(chart.isHighLowLinesVisible()).toBe(true);
    const other = new Chart(sizedHost(), { highLowLines: true });
    expect(other.isHighLowLinesVisible()).toBe(true);
    other.destroy();
  });

  it('marks the bid and ask, given or from a feed’s ticks', async () => {
    chart.setBidAsk({ bid: 199.9, ask: 200.1 });
    expect(chart.getBidAsk()).toEqual({ bid: 199.9, ask: 200.1 });
    chart.setBidAsk(null);
    expect(chart.getBidAsk()).toBeNull();

    const handlers = new Map<string, (e: { data: unknown }) => void>();
    const adapter: DataAdapter = {
      name: 'fake',
      connect: () => {},
      disconnect: () => {},
      getConnectionState: () => 'connected',
      fetchHistory: async () => bars,
      on: ((type: string, cb: (e: { data: unknown }) => void) => { handlers.set(type, cb); }) as DataAdapter['on'],
      off: () => {},
      dispose: () => {},
    };
    await chart.connect({ adapter, symbol: 'AAA', timeframe: '1h', historyLimit: 200 });
    handlers.get('tick')?.({ data: { price: 200, volume: 1, time: T0 + 200 * HOUR, bid: 199.95, ask: 200.05 } });
    expect(chart.getBidAsk()).toEqual({ bid: 199.95, ask: 200.05 });
  });
});

describe('point & figure boxes', () => {
  it('draws boxes of the size the columns were built with: 1% of the average close, or the one set', () => {
    const setBox = vi.spyOn(PointAndFigureRenderer.prototype, 'setBoxSize');
    const thousandfold = bars.map((b) => ({ ...b, open: b.open * 1000, high: b.high * 1000, low: b.low * 1000, close: b.close * 1000 }));
    chart.setData(thousandfold);
    chart.setChartType('pointAndFigure');
    const average = thousandfold.reduce((s, b) => s + b.close, 0) / thousandfold.length;
    expect(setBox.mock.calls.at(-1)?.[0]).toBeCloseTo(average * 0.01, 6);
    chart.setChartTypeOptions({ pointAndFigure: { boxSize: 250 } });
    expect(setBox.mock.calls.at(-1)?.[0]).toBe(250);
  });

  it('draws the boxes the columns were raised to, when a tiny box would make more than 100,000', () => {
    // Closes 100, 101, 100, 104 over and over: three boxes of 0.25 reverse on every move, three of 0.5 only on the 4s.
    const closes = [100, 101, 100, 104];
    const zigzag = Array.from({ length: 150_000 }, (_, i) => {
      const open = closes[(i + 3) % 4];
      const close = closes[i % 4];
      return { time: T0 + i * HOUR, open, high: Math.max(open, close), low: Math.min(open, close), close, volume: 1 };
    });
    const setBox = vi.spyOn(PointAndFigureRenderer.prototype, 'setBoxSize');
    chart.setData(zigzag);
    chart.setChartType('pointAndFigure');
    chart.setChartTypeOptions({ pointAndFigure: { boxSize: 0.25 } });
    expect(setBox.mock.calls.at(-1)?.[0]).toBe(0.5);
    expect(probe().getDisplayData().length).toBeLessThanOrEqual(100_001);
  });
});
