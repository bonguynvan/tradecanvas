// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DataAdapter, OHLCBar } from '@tradecanvas/commons';
import { HiLoRenderer } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

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
    expect(probe().getDisplayData().every((b) => Math.abs(b.high - b.low - 1) < 1e-9)).toBe(true);
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
