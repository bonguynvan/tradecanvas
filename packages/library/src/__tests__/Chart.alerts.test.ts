// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DataAdapter, OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const bar = (i: number, close: number): OHLCBar => ({ time: T0 + i * HOUR, open: close, high: close + 1, low: close - 1, close, volume: 10 });

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(Array.from({ length: 60 }, (_, i) => bar(i, 100)));
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart alerts with options', () => {
  it('fires when the price crosses a moving average', () => {
    const fired: string[] = [];
    chart.on('alertTriggered', (e) => fired.push((e.payload as { message?: string }).message ?? ''));
    const sma = chart.addIndicator('sma', { period: 5 })!;
    chart.addAlert(Number.NaN, 'crossingUp', 'over the SMA', 'price', undefined, { target: `${sma}:value` });
    chart.setCurrentPrice(99);
    chart.setCurrentPrice(99.5);
    expect(fired).toEqual([]);
    chart.setCurrentPrice(100.5);
    expect(fired).toEqual(['over the SMA']);
  });

  it('keeps the options in a saved layout, the lines following their indicators', () => {
    const sma = chart.addIndicator('sma', { period: 5 })!;
    chart.addAlert(Number.NaN, 'crossing', 'cross', 'price', undefined, { target: `${sma}:value`, onBarClose: true, expiresAt: 9e12 });
    chart.addAlert(Number.NaN, 'movesUp', 'pump', 'price', undefined, { percent: 4, bars: 10 });
    chart.loadState(chart.saveState()!);
    const newSma = chart.getActiveIndicators()[0].instanceId;
    expect(newSma).not.toBe(sma);
    const alerts = chart.getAlerts();
    expect(alerts.map((a) => [a.condition, a.target, a.onBarClose, a.expiresAt, a.percent, a.bars])).toEqual([
      ['crossing', `${newSma}:value`, true, 9e12, undefined, undefined],
      ['movesUp', undefined, undefined, undefined, 4, 10],
    ]);
  });

  it('turns down options that don’t fit together', () => {
    expect(() => chart.addAlert(100, 'movesUp', '', 'price', undefined, { percent: 0, bars: 3 })).toThrow(RangeError);
  });
});

describe('Chart alerts on a live feed', () => {
  it('fire on the feed’s prices, not only on setCurrentPrice', async () => {
    const handlers = new Map<string, (e: { data: unknown }) => void>();
    const adapter: DataAdapter = {
      name: 'fake',
      connect: () => {},
      disconnect: () => {},
      getConnectionState: () => 'connected',
      fetchHistory: async () => Array.from({ length: 60 }, (_, i) => bar(i, 100)),
      on: ((type: string, cb: (e: { data: unknown }) => void) => { handlers.set(type, cb); }) as DataAdapter['on'],
      off: () => {},
      dispose: () => {},
    };
    await chart.connect({ adapter, symbol: 'AAA', timeframe: '1h', historyLimit: 60 });
    const fired: string[] = [];
    chart.on('alertTriggered', (e) => fired.push(e.payload.message ?? ''));
    chart.addAlert(105, 'crossingUp', 'over 105');
    const tick = (price: number) => handlers.get('tick')?.({ data: { price, volume: 1, time: T0 + 60 * HOUR } });
    tick(104);
    tick(106);
    expect(fired).toEqual(['over 105']);
  });

  it('say what they watch in their events', () => {
    const sma = chart.addIndicator('sma', { period: 5 })!;
    const seen: unknown[] = [];
    chart.on('alertAdd', (e) => seen.push(e.payload));
    chart.addAlert(Number.NaN, 'movesUp', 'pump', 'price', undefined, { percent: 5, bars: 12 });
    chart.addAlert(Number.NaN, 'crossingUp', 'cross', 'price', 'Price', { target: `${sma}:value` });
    expect(seen).toMatchObject([
      { condition: 'movesUp', channel: 'price', percent: 5, bars: 12 },
      { condition: 'crossingUp', channel: 'price', label: 'Price', target: `${sma}:value` },
    ]);
  });
});

