// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DataAdapter, OHLCBar, SymbolInfo, TimeFrame } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const hourly = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * HOUR, open: 1.5, high: 1.6, low: 1.4, close: 1.55, volume: 1 }));

const nyse: SymbolInfo = {
  symbol: 'AAPL',
  description: 'Apple Inc.',
  exchange: 'NASDAQ',
  type: 'stock',
  pricePrecision: 2,
  timezone: 'America/New_York',
  sessions: [{ start: '09:30', end: '16:00' }],
};

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

function adapterWith(resolveSymbol: (symbol: string) => Promise<SymbolInfo | null>): DataAdapter {
  return {
    name: 'fake',
    connect: () => {},
    disconnect: () => {},
    getConnectionState: () => 'connected',
    fetchHistory: async (_s: string, _tf: TimeFrame, limit?: number) => hourly(limit ?? 100),
    resolveSymbol,
    on: () => {},
    off: () => {},
    dispose: () => {},
  };
}

describe('Chart.setSymbolInfo', () => {
  it('formats prices with the symbol’s precision', () => {
    chart.setData(hourly(100));
    chart.setSymbolInfo({ symbol: 'X', pricePrecision: 4 });
    expect(chart.formatPrice(1.234567)).toBe('1.2346');
    expect(chart.getSymbolInfo()?.pricePrecision).toBe(4);
  });

  it('lets a precision set with setMarket win', () => {
    chart.setMarket({ type: 'crypto', pricePrecision: 1 });
    chart.setSymbolInfo({ symbol: 'X', pricePrecision: 4 });
    expect(chart.formatPrice(1.234567)).toBe('1.2');
  });

  it('shows the exchange’s time zone when asked to', () => {
    chart.setTimezone('exchange');
    expect(chart.getTimezone()).toBe('exchange');
    expect(chart.getEffectiveTimezone()).toBe('UTC');
    chart.setSymbolInfo(nyse);
    expect(chart.getEffectiveTimezone()).toBe('America/New_York');
    chart.setTimezone(null);
    expect(chart.getEffectiveTimezone()).toBeNull();
  });

  it('shades the symbol’s trading hours in its time zone', () => {
    chart.setSymbolInfo(nyse);
    const config = (chart as unknown as { sessionShading: { getConfig(): Record<string, unknown> } }).sessionShading.getConfig();
    expect(config).toMatchObject({ timeZone: 'America/New_York', windows: [{ startMinute: 570, endMinute: 960 }] });
  });

  it('announces the change', () => {
    const seen: (SymbolInfo | null)[] = [];
    chart.on('symbolInfoChange', (e) => seen.push((e.payload as { info: SymbolInfo | null }).info));
    chart.setSymbolInfo(nyse);
    chart.setSymbolInfo(null);
    expect(seen.map((i) => i?.symbol ?? null)).toEqual(['AAPL', null]);
  });
});

describe('Chart resolving the stream’s symbol', () => {
  it('asks the adapter about the symbol it connects to', async () => {
    const resolveSymbol = vi.fn(async (symbol: string) => ({ ...nyse, symbol }));
    await chart.connect({ adapter: adapterWith(resolveSymbol), symbol: 'AAPL', timeframe: '1h', historyLimit: 50 });
    await vi.waitFor(() => expect(chart.getSymbolInfo()?.symbol).toBe('AAPL'));
    expect(resolveSymbol).toHaveBeenCalledWith('AAPL');
  });

  it('drops an answer about a symbol the chart has left', async () => {
    const slow = deferred<SymbolInfo | null>();
    const resolveSymbol = vi.fn((symbol: string) =>
      symbol === 'AAPL' ? slow.promise : Promise.resolve({ symbol, pricePrecision: 3 }));
    await chart.connect({ adapter: adapterWith(resolveSymbol), symbol: 'AAPL', timeframe: '1h', historyLimit: 50 });
    await chart.switchStream('MSFT', '1h');
    await vi.waitFor(() => expect(chart.getSymbolInfo()?.symbol).toBe('MSFT'));
    slow.resolve(nyse);
    await Promise.resolve();
    expect(chart.getSymbolInfo()?.symbol).toBe('MSFT');
  });
});
