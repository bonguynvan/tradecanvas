// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { MockAdapter } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const T0 = Date.UTC(2025, 0, 1);
const bars: OHLCBar[] = Array.from({ length: 120 }, (_, i) => ({
  time: T0 + i * 60_000, open: 100, high: 101, low: 99, close: 100 + (i % 3), volume: 5,
}));

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('chart events', () => {
  it('chartTypeChange: the type and the one before, on a change only', () => {
    const seen = vi.fn();
    chart.on('chartTypeChange', (e) => seen(e.payload));
    chart.setChartType('line');
    chart.setChartType('line');
    expect(seen.mock.calls).toEqual([[{ type: 'line', previous: 'candlestick' }]]);
  });

  it('historyChange: whether there is something to undo or redo', () => {
    const seen = vi.fn();
    chart.on('historyChange', (e) => seen(e.payload));
    chart.addIndicator('rsi');
    expect(seen).toHaveBeenLastCalledWith(expect.objectContaining({ canUndo: true, canRedo: false }));
    chart.undo();
    expect(seen).toHaveBeenLastCalledWith(expect.objectContaining({ canUndo: false, canRedo: true }));
  });

  it('drawingSelect: the selected drawings, the primary first', () => {
    const seen = vi.fn();
    chart.on('drawingSelect', (e) => seen(e.payload));
    const id = chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: bars[50].time, price: 100 }] })!;
    expect(chart.selectDrawing(id)).toBe(true);
    expect(seen).toHaveBeenLastCalledWith({ ids: [id], primary: id });
  });

  it('scrollBars: the view moves by bars, later for a positive count', () => {
    const seen: { from: number; to: number }[] = [];
    chart.on('visibleRangeChange', (e) => seen.push(e.payload as { from: number; to: number }));
    chart.scrollBars(-20);
    const back = seen.at(-1)!;
    chart.scrollBars(10);
    const forward = seen.at(-1)!;
    expect(forward.from - back.from).toBeCloseTo(10, 0);
  });

  it('symbolChange and timeframeChange when the stream moves', async () => {
    const events: [string, unknown][] = [];
    chart.on('symbolChange', (e) => events.push(['symbol', e.payload]));
    chart.on('timeframeChange', (e) => events.push(['timeframe', e.payload]));
    await chart.connect({ adapter: new MockAdapter({ historySize: 50 }), symbol: 'AAA', timeframe: '1m' });
    await chart.setTimeframe('5m');
    await chart.switchStream('BBB', '5m');
    expect(events).toEqual([
      ['symbol', { symbol: 'AAA', previous: null }],
      ['timeframe', { timeframe: '1m', previous: null }],
      ['timeframe', { timeframe: '5m', previous: '1m' }],
      ['symbol', { symbol: 'BBB', previous: 'AAA' }],
    ]);
  });
});
