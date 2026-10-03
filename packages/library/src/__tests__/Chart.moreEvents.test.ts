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

describe('tick timeframes', () => {
  it('connects a feed with trades on a tick timeframe, with no older pages and no countdown', async () => {
    const adapter = new MockAdapter({ basePrice: 50, tickInterval: 60_000 });
    const before = vi.spyOn(adapter, 'fetchHistoryBefore');
    await chart.connect({ adapter, symbol: 'AAA', timeframe: '10T' });
    expect(chart.getData().length).toBeGreaterThan(50);
    expect(chart.hasMoreHistory()).toBe(false);
    expect(before).not.toHaveBeenCalled();
  });

  it('refuses a tick timeframe from a feed without trades', async () => {
    const adapter = new MockAdapter();
    (adapter as { subscribeTrades?: unknown }).subscribeTrades = undefined;
    await expect(chart.connect({ adapter, symbol: 'AAA', timeframe: '10T' })).rejects.toThrow(RangeError);
  });
});

describe('stream bars by their time', () => {
  /** A feed whose bars the test sends. */
  function feed() {
    const listeners = new Map<string, ((e: { data: unknown }) => void)[]>();
    return {
      adapter: {
        name: 'fake',
        connect() {},
        disconnect() {},
        dispose() {},
        getConnectionState: () => 'connected',
        fetchHistory: async () => [{ time: T0, open: 1, high: 1, low: 1, close: 1, volume: 1 }],
        on: (type: string, l: (e: { data: unknown }) => void) => listeners.set(type, [...(listeners.get(type) ?? []), l]),
        off: () => {},
      },
      bar: (time: number, close: number, closed: boolean) => {
        for (const l of listeners.get('bar') ?? []) l({ data: { bar: { time, open: close, high: close, low: close, close, volume: 1 }, closed } });
      },
    };
  }

  it('keeps a closed bar’s last values, and starts the next one after it', async () => {
    const f = feed();
    await chart.connect({ adapter: f.adapter as never, symbol: 'X', timeframe: '1m' });
    const t1 = T0 + 60_000;
    f.bar(t1, 2, false);
    f.bar(t1, 3, true); // closes with a new last value
    expect(chart.getData().map((b) => [b.time, b.close])).toEqual([[T0, 1], [t1, 3]]);
    f.bar(t1 + 60_000, 4, false);
    expect(chart.getData().map((b) => [b.time, b.close])).toEqual([[T0, 1], [t1, 3], [t1 + 60_000, 4]]);
    f.bar(T0 - 60_000, 9, false); // older than the last: left out
    expect(chart.getData()).toHaveLength(3);
  });
});

describe('keys and history, after review', () => {
  it('tells historyChange only when what can be undone or redone changes', () => {
    const seen = vi.fn();
    chart.on('historyChange', seen);
    chart.addIndicator('rsi');
    chart.addIndicator('cci');
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('leaves comma and period alone when the chart takes no keys', () => {
    chart.destroy();
    host.remove();
    host = sizedHost();
    chart = new Chart(host, { features: { keyboard: false } });
    chart.setData(bars);
    host.focus();
    const e = new KeyboardEvent('keydown', { key: '.', bubbles: true, cancelable: true });
    window.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });

  it('leaves Space to a button inside the chart', () => {
    const button = document.createElement('button');
    host.appendChild(button);
    button.focus();
    const e = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    button.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });
});
