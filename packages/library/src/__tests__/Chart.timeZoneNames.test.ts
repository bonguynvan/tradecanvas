// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MARKET_HOSE, type DataAdapter, type OHLCBar } from '@tradecanvas/commons';
import { Chart, EXCHANGE_TIME_ZONE, EXCHANGE_TIMEZONE } from '../index.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HALF_HOUR = 30 * 60_000;
// Monday 5 January 2026, 00:00 in New York (UTC−5).
const NY_MIDNIGHT = Date.UTC(2026, 0, 5, 5);
/** Half-hour bars around the clock for two days. */
const bars: OHLCBar[] = Array.from({ length: 96 }, (_, i) => ({
  time: NY_MIDNIGHT + i * HALF_HOUR, open: 100, high: 101, low: 99, close: 100, volume: 1,
}));
/** Regular hours: 09:30 to 16:00, 13 half hours a day. */
const REGULAR_PER_DAY = 13;
const NEW_YORK = 'America/New_York';

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, {});
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('the time zone, spelled as the timeZone option is', () => {
  it('sets with setTimeZone and reads back with getTimeZone and getEffectiveTimeZone', () => {
    chart.setTimeZone(NEW_YORK);
    expect(chart.getTimeZone()).toBe(NEW_YORK);
    expect(chart.getEffectiveTimeZone()).toBe(NEW_YORK);
    chart.setTimeZone(-300);
    expect(chart.getEffectiveTimeZone()).toBe(-300);
    chart.setTimeZone(null);
    expect(chart.getTimeZone()).toBeNull();
  });

  it("resolves 'exchange' to the market's zone, as getExchangeTimeZone tells", () => {
    expect(EXCHANGE_TIME_ZONE).toBe('exchange');
    expect(chart.getExchangeTimeZone()).toBeNull();
    chart.setMarket(MARKET_HOSE);
    chart.setTimeZone(EXCHANGE_TIME_ZONE);
    expect(chart.getTimeZone()).toBe('exchange');
    expect(chart.getExchangeTimeZone()).toBe('Asia/Ho_Chi_Minh');
    expect(chart.getEffectiveTimeZone()).toBe('Asia/Ho_Chi_Minh');
  });

  it('throws for a zone the browser does not know', () => {
    expect(() => chart.setTimeZone('Not/AZone')).toThrow(RangeError);
  });

  it('keeps the older spellings working, as the same calls', () => {
    chart.setTimezone(330);
    expect(chart.getTimeZone()).toBe(330);
    expect(chart.getTimezone()).toBe(330);
    expect(chart.getEffectiveTimezone()).toBe(330);
    chart.setTimezoneOffset(null);
    expect(chart.getTimeZone()).toBeNull();
    chart.setMarket(MARKET_HOSE);
    expect(chart.getExchangeTimezone()).toBe(chart.getExchangeTimeZone());
    expect(EXCHANGE_TIMEZONE).toBe(EXCHANGE_TIME_ZONE);
  });
});

describe('a symbol’s zone, SymbolInfo.timeZone', () => {
  it("is what 'exchange' shows", () => {
    chart.setTimeZone('exchange');
    chart.setSymbolInfo({ symbol: 'AAPL', timeZone: NEW_YORK });
    expect(chart.getExchangeTimeZone()).toBe(NEW_YORK);
    expect(chart.getEffectiveTimeZone()).toBe(NEW_YORK);
  });

  it('reads back in both spellings, whichever was given', () => {
    chart.setSymbolInfo({ symbol: 'AAPL', timeZone: NEW_YORK });
    expect(chart.getSymbolInfo()).toMatchObject({ timeZone: NEW_YORK, timezone: NEW_YORK });
    chart.setSymbolInfo({ symbol: 'AAPL', timezone: NEW_YORK });
    expect(chart.getSymbolInfo()).toMatchObject({ timeZone: NEW_YORK, timezone: NEW_YORK });
    expect(chart.getExchangeTimeZone()).toBe(NEW_YORK);
  });

  it('comes before the older timezone when both are given', () => {
    chart.setSymbolInfo({ symbol: 'AAPL', timeZone: NEW_YORK, timezone: 'Asia/Tokyo' });
    expect(chart.getExchangeTimeZone()).toBe(NEW_YORK);
    expect(chart.getSymbolInfo()).toMatchObject({ timeZone: NEW_YORK, timezone: NEW_YORK });
  });

  it('changes with either spelling over what getSymbolInfo gave', () => {
    chart.setSymbolInfo({ symbol: 'AAPL', timezone: NEW_YORK });
    chart.setSymbolInfo({ ...chart.getSymbolInfo()!, timezone: 'Asia/Tokyo' });
    expect(chart.getExchangeTimeZone()).toBe('Asia/Tokyo');
    chart.setSymbolInfo({ ...chart.getSymbolInfo()!, timeZone: NEW_YORK });
    expect(chart.getExchangeTimeZone()).toBe(NEW_YORK);
    expect(chart.getSymbolInfo()).toMatchObject({ timeZone: NEW_YORK, timezone: NEW_YORK });
  });

  it('tells symbolInfoChange in both spellings', () => {
    const seen: unknown[] = [];
    chart.on('symbolInfoChange', (e) => seen.push((e.payload as { info: unknown }).info));
    chart.setSymbolInfo({ symbol: 'AAPL', timeZone: NEW_YORK });
    expect(seen).toEqual([expect.objectContaining({ timeZone: NEW_YORK, timezone: NEW_YORK })]);
  });

  it('places the regular hours that extended hours leave', () => {
    chart.setSymbolInfo({ symbol: 'AAA', timeZone: NEW_YORK, sessions: [{ start: '09:30', end: '16:00' }] });
    chart.setData(bars);
    chart.setExtendedHours(false);
    expect(chart.getData()).toHaveLength(2 * REGULAR_PER_DAY);
  });

  it('moves with a feed’s update in either spelling', async () => {
    const handlers = new Map<string, (e: { data: unknown }) => void>();
    const adapter: DataAdapter = {
      name: 'feed',
      connect: () => {},
      disconnect: () => {},
      getConnectionState: () => 'connected',
      fetchHistory: async () => bars,
      on: ((type: string, cb: (e: { data: unknown }) => void) => { handlers.set(type, cb); }) as DataAdapter['on'],
      off: () => {},
      dispose: () => {},
    };
    await chart.connect({ adapter, symbol: 'AAA', timeframe: '30m', historyLimit: 96 });
    chart.setSymbolInfo({ symbol: 'AAA', timeZone: NEW_YORK, pricePrecision: 2 });
    handlers.get('symbolInfo')?.({ data: { symbol: 'AAA', timezone: 'Asia/Tokyo' } });
    expect(chart.getExchangeTimeZone()).toBe('Asia/Tokyo');
    expect(chart.getSymbolInfo()).toMatchObject({ timeZone: 'Asia/Tokyo', timezone: 'Asia/Tokyo', pricePrecision: 2 });
    handlers.get('symbolInfo')?.({ data: { symbol: 'AAA', timeZone: NEW_YORK } });
    expect(chart.getSymbolInfo()).toMatchObject({ timeZone: NEW_YORK, timezone: NEW_YORK });

    // The same zone again, in either spelling or both, is no change.
    let changes = 0;
    chart.on('symbolInfoChange', () => changes++);
    handlers.get('symbolInfo')?.({ data: { symbol: 'AAA', timezone: NEW_YORK } });
    handlers.get('symbolInfo')?.({ data: { symbol: 'AAA', timeZone: NEW_YORK } });
    handlers.get('symbolInfo')?.({ data: { symbol: 'AAA', timeZone: NEW_YORK, timezone: NEW_YORK } });
    expect(changes).toBe(0);
  });
});
