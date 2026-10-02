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

type Internals = {
  sessionShading: { getConfig(): Record<string, unknown> };
  tradingManager: { config: { pricePrecision?: number } };
  alertManager: { pricePrecision: number };
};
const shading = () => (chart as unknown as Internals).sessionShading.getConfig();

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
    expect(shading()).toMatchObject({ timeZone: 'America/New_York', windows: [{ startMinute: 570, endMinute: 960 }] });
  });

  it('drops the last symbol’s hours for a symbol without any', () => {
    const before = shading();
    chart.setSymbolInfo({ ...nyse, timezone: 'Asia/Bangkok', sessions: [{ start: '10:00', end: '12:30' }, { start: '14:30', end: '16:30' }] });
    chart.setSymbolInfo({ symbol: 'BTCUSDT', timezone: 'UTC' });
    expect(shading()).toEqual(before);
  });

  it('goes back to the host’s hours after a symbol without hours', () => {
    chart.setSessionShadingConfig({ timeZone: 'Asia/Kolkata', startMinute: 555, endMinute: 930 });
    chart.setSymbolInfo(nyse);
    chart.setSymbolInfo({ symbol: 'X' });
    expect(shading()).toMatchObject({ timeZone: 'Asia/Kolkata', startMinute: 555, endMinute: 930 });
    expect(shading().windows).toBeUndefined();
  });

  it('lets hours the host sets later win over the symbol’s', () => {
    chart.setSymbolInfo(nyse);
    chart.setSessionShadingConfig({ tzOffsetMinutes: 330, startMinute: 600, endMinute: 900 });
    expect(shading()).toMatchObject({ tzOffsetMinutes: 330, startMinute: 600, endMinute: 900 });
    expect(shading().timeZone).toBeUndefined();
    expect(shading().windows).toBeUndefined();
  });

  it('puts order and alert prices back on the default precision after a symbol without one', () => {
    const internals = chart as unknown as Internals;
    chart.setSymbolInfo({ symbol: 'A', pricePrecision: 8 });
    expect(internals.alertManager.pricePrecision).toBe(8);
    chart.setSymbolInfo({ symbol: 'B' });
    expect(internals.tradingManager.config.pricePrecision).toBeUndefined();
    expect(internals.alertManager.pricePrecision).toBe(2);
  });

  it('widens the price scale for the symbol’s decimals', () => {
    chart.setData(hourly(100).map((bar) => ({ ...bar, open: 123_456, high: 123_460, low: 123_450, close: 123_456.5 })));
    const width = chart.getPlotRect().width;
    chart.setSymbolInfo({ symbol: 'X', pricePrecision: 6 });
    expect(chart.getPlotRect().width).toBeLessThan(width);
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

  it('keeps info the host set when the adapter knows nothing of the symbol', async () => {
    chart.setSymbolInfo({ symbol: 'AAPL', pricePrecision: 3 });
    const resolveSymbol = vi.fn(async () => null);
    await chart.connect({ adapter: adapterWith(resolveSymbol), symbol: 'AAPL', timeframe: '1h', historyLimit: 50 });
    await vi.waitFor(() => expect(resolveSymbol).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(chart.getSymbolInfo()?.pricePrecision).toBe(3);
  });

  it('does not report a failed lookup as a feed error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errors: unknown[] = [];
    chart.on('dataUpdate', (e) => {
      if ((e.payload as { error?: string })?.error) errors.push(e.payload);
    });
    await chart.connect({ adapter: adapterWith(() => Promise.reject(new Error('exchangeInfo 451'))), symbol: 'AAPL', timeframe: '1h', historyLimit: 50 });
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    expect(errors).toEqual([]);
  });

  it('copes with a lookup that throws or answers without a promise', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const throwing = adapterWith((() => { throw new Error('boom'); }) as never);
    await expect(chart.connect({ adapter: throwing, symbol: 'AAPL', timeframe: '1h', historyLimit: 50 })).resolves.toBeUndefined();
    const plain = adapterWith((() => nyse) as never);
    chart.disconnectStream();
    await expect(chart.connect({ adapter: plain, symbol: 'AAPL', timeframe: '1h', historyLimit: 50 })).resolves.toBeUndefined();
    await vi.waitFor(() => expect(chart.getSymbolInfo()?.symbol).toBe('AAPL'));
  });

  it('ignores an answer that lands after the chart is gone', async () => {
    const slow = deferred<SymbolInfo | null>();
    const other = new Chart(sizedHost(), { chartType: 'candlestick' });
    await other.connect({ adapter: adapterWith(() => slow.promise), symbol: 'AAPL', timeframe: '1h', historyLimit: 50 });
    const setInfo = vi.spyOn(other, 'setSymbolInfo');
    other.destroy();
    slow.resolve(nyse);
    await new Promise((r) => setTimeout(r, 0));
    expect(setInfo).not.toHaveBeenCalled();
  });
});
