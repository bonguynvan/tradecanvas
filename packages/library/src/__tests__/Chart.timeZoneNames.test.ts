// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MARKET_HOSE, type DataAdapter, type OHLCBar } from '@tradecanvas/commons';
import * as library from '../index.js';
import { Chart, EXCHANGE_TIME_ZONE } from '../index.js';
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

  it('has one spelling: the names of 1.x are gone', () => {
    for (const name of ['setTimezone', 'getTimezone', 'getEffectiveTimezone', 'getExchangeTimezone', 'setTimezoneOffset']) {
      expect(name in chart, name).toBe(false);
    }
    expect('EXCHANGE_TIMEZONE' in library).toBe(false);
    expect(EXCHANGE_TIME_ZONE).toBe('exchange');
  });
});

describe('a symbol’s zone, SymbolInfo.timeZone', () => {
  it("is what 'exchange' shows", () => {
    chart.setTimeZone('exchange');
    chart.setSymbolInfo({ symbol: 'AAPL', timeZone: NEW_YORK });
    expect(chart.getExchangeTimeZone()).toBe(NEW_YORK);
    expect(chart.getEffectiveTimeZone()).toBe(NEW_YORK);
  });

  it('reads back as it was given, under the one name', () => {
    chart.setSymbolInfo({ symbol: 'AAPL', timeZone: NEW_YORK });
    expect(chart.getSymbolInfo()).toEqual({ symbol: 'AAPL', timeZone: NEW_YORK });
    expect(chart.getExchangeTimeZone()).toBe(NEW_YORK);
  });

  it('does not read the timezone of 1.x: a symbol that gives only that has no zone', () => {
    chart.setSymbolInfo({ symbol: 'AAPL', timezone: 'Asia/Tokyo' } as never);
    expect(chart.getExchangeTimeZone()).toBeNull();
  });

  it('changes over what getSymbolInfo gave', () => {
    chart.setSymbolInfo({ symbol: 'AAPL', timeZone: NEW_YORK });
    chart.setSymbolInfo({ ...chart.getSymbolInfo()!, timeZone: 'Asia/Tokyo' });
    expect(chart.getExchangeTimeZone()).toBe('Asia/Tokyo');
  });

  it('tells symbolInfoChange the zone', () => {
    const seen: unknown[] = [];
    chart.on('symbolInfoChange', (e) => seen.push((e.payload as { info: unknown }).info));
    chart.setSymbolInfo({ symbol: 'AAPL', timeZone: NEW_YORK });
    expect(seen).toEqual([expect.objectContaining({ timeZone: NEW_YORK })]);
  });

  it('places the regular hours that extended hours leave', () => {
    chart.setSymbolInfo({ symbol: 'AAA', timeZone: NEW_YORK, sessions: [{ start: '09:30', end: '16:00' }] });
    chart.setData(bars);
    chart.setExtendedHours(false);
    expect(chart.getData()).toHaveLength(2 * REGULAR_PER_DAY);
  });

  it('moves with a feed’s update', async () => {
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
    handlers.get('symbolInfo')?.({ data: { symbol: 'AAA', timeZone: 'Asia/Tokyo' } });
    expect(chart.getExchangeTimeZone()).toBe('Asia/Tokyo');
    expect(chart.getSymbolInfo()).toMatchObject({ timeZone: 'Asia/Tokyo', pricePrecision: 2 });
    handlers.get('symbolInfo')?.({ data: { symbol: 'AAA', timeZone: NEW_YORK } });
    expect(chart.getSymbolInfo()).toMatchObject({ timeZone: NEW_YORK });

    // The same zone again is no change.
    let changes = 0;
    chart.on('symbolInfoChange', () => changes++);
    handlers.get('symbolInfo')?.({ data: { symbol: 'AAA', timeZone: NEW_YORK } });
    expect(changes).toBe(0);
  });
});
