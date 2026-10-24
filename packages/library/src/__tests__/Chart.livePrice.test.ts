// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MARKET_HOSE, type OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const bar = (i: number, close: number): OHLCBar => ({ time: T0 + i * HOUR, open: close, high: close + 1, low: close - 1, close, volume: 10 });

let host: HTMLDivElement;
let chart: Chart;

type Internals = { tradingManager: { getCurrentPrice(): number | null } };
const ordersPrice = () => (chart as unknown as Internals).tradingManager.getCurrentPrice();

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick', features: { trading: true, alerts: true } });
  chart.setData(Array.from({ length: 60 }, (_, i) => bar(i, 100)));
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function alertsFired(): string[] {
  const fired: string[] = [];
  chart.on('alertTriggered', (e) => fired.push(e.payload.message ?? ''));
  return fired;
}

describe('a price fed by hand', () => {
  it('fires alerts from the forming bar', () => {
    const fired = alertsFired();
    chart.addAlert(105, 'crossingUp', 'over 105');
    chart.updateLastBar(bar(59, 104));
    expect(fired).toEqual([]);
    chart.updateLastBar(bar(59, 106));
    expect(fired).toEqual(['over 105']);
  });

  it('fires alerts from a new bar, and from a tick', () => {
    const fired = alertsFired();
    chart.addAlert(105, 'crossingUp', 'over 105');
    chart.addAlert(95, 'crossingDown', 'under 95');
    chart.updateLastBar(bar(59, 101));
    chart.appendBar(bar(60, 107));
    expect(fired).toEqual(['over 105']);
    chart.updateLastBarFromTick({ price: 94, time: T0 + 60 * HOUR + 1000 });
    expect(fired).toEqual(['over 105', 'under 95']);
  });

  it('fires alerts from the last of bars appended together', () => {
    const fired = alertsFired();
    chart.addAlert(105, 'crossingUp', 'over 105');
    chart.updateLastBar(bar(59, 101));
    chart.appendBars([bar(60, 102), bar(61, 106)]);
    expect(fired).toEqual(['over 105']);
  });

  it('is the price the orders follow', () => {
    chart.updateLastBar(bar(59, 103.5));
    expect(ordersPrice()).toBe(103.5);
    chart.appendBar(bar(60, 99));
    expect(ordersPrice()).toBe(99);
  });

  it('fires an alert once when setCurrentPrice sends the same price', () => {
    const fired = alertsFired();
    chart.addAlert(105, 'crossingUp', 'over 105');
    chart.updateLastBar(bar(59, 104));
    chart.updateLastBar(bar(59, 106));
    chart.setCurrentPrice(106);
    expect(fired).toEqual(['over 105']);
  });
});

describe('dataUpdate', () => {
  it('says which change it is: bars replaced, or a bar added; not a tick', () => {
    const seen: unknown[] = [];
    chart.on('dataUpdate', (e) => seen.push(e.payload));
    chart.setData(Array.from({ length: 10 }, (_, i) => bar(i, 100)));
    chart.updateLastBar(bar(9, 101));
    chart.appendBar(bar(10, 102));
    chart.appendBars([bar(11, 103), bar(12, 104)]);
    expect(seen).toEqual([
      { kind: 'bars', length: 10 },
      { kind: 'bars', length: 11 },
      { kind: 'bars', length: 13 },
    ]);
  });

  it('names a triggered alert as such', () => {
    const seen: unknown[] = [];
    chart.on('dataUpdate', (e) => seen.push(e.payload));
    const id = chart.addAlert(105, 'crossingUp', 'over 105');
    chart.setCurrentPrice(104);
    chart.setCurrentPrice(106);
    expect(seen).toContainEqual(expect.objectContaining({ kind: 'alert', alert: 'triggered', alertId: id }));
  });
});

describe('getChartType', () => {
  it('reads back the type set, in the options or later, and from a saved layout', () => {
    expect(chart.getChartType()).toBe('candlestick');
    chart.setChartType('line');
    expect(chart.getChartType()).toBe('line');
    const saved = chart.saveState()!;
    chart.setChartType('area');
    chart.loadState(saved);
    expect(chart.getChartType()).toBe('line');
  });

  it('is candlestick when the options name none', () => {
    const other = new Chart(sizedHost(), {});
    expect(other.getChartType()).toBe('candlestick');
    other.destroy();
  });
});

describe("a market's time zone", () => {
  it("is the exchange's zone when the symbol names none", () => {
    chart.setMarket(MARKET_HOSE);
    chart.setTimezone('exchange');
    expect(chart.getEffectiveTimezone()).toBe('Asia/Ho_Chi_Minh');
  });

  it("gives way to the symbol's own zone", () => {
    chart.setMarket(MARKET_HOSE);
    chart.setSymbolInfo({ symbol: 'AAPL', timezone: 'America/New_York' });
    chart.setTimezone('exchange');
    expect(chart.getEffectiveTimezone()).toBe('America/New_York');
  });

  it('follows a market set after the exchange zone was chosen', () => {
    chart.setTimezone('exchange');
    expect(chart.getEffectiveTimezone()).toBe('UTC');
    chart.setMarket(MARKET_HOSE);
    expect(chart.getEffectiveTimezone()).toBe('Asia/Ho_Chi_Minh');
  });

  it("leaves a zone chosen otherwise as it is", () => {
    chart.setTimezone('Europe/London');
    chart.setMarket(MARKET_HOSE);
    expect(chart.getEffectiveTimezone()).toBe('Europe/London');
  });
});

describe('a price fed by hand, what goes with it', () => {
  type Line = { currentPriceLine: { getPrice(): number | null } };
  const lineAt = () => (chart as unknown as Line).currentPriceLine.getPrice();

  it('moves the price line with a new bar too', () => {
    chart.appendBar(bar(60, 123));
    expect(lineAt()).toBe(123);
    chart.appendBars([bar(61, 124), bar(62, 130)]);
    expect(lineAt()).toBe(130);
  });

  it('leaves out a bar the chart turns down: no alert, no price, no dataUpdate', () => {
    const fired = alertsFired();
    const seen: unknown[] = [];
    chart.on('dataUpdate', (e) => seen.push(e.payload));
    chart.addAlert(90, 'crossingDown', 'under 90');
    chart.updateLastBar({ ...bar(59, 80), high: 70, low: 90 });
    chart.appendBar({ ...bar(60, Number.NaN) });
    chart.updateLastBarFromTick({ price: Number.NaN, time: T0 + 59 * HOUR });
    expect(fired).toEqual([]);
    expect(seen).toEqual([]);
    expect(ordersPrice()).not.toBeNaN();
    expect(chart.getData()).toHaveLength(60);
  });

  it('fires an alert the first price after the bars crosses, from the last close', () => {
    const fired = alertsFired();
    chart.addAlert(105, 'crossingUp', 'over 105');
    chart.updateLastBar(bar(59, 106));
    expect(fired).toEqual(['over 105']);
  });

  it('sends the bars before the alerts it sets off', () => {
    const order: string[] = [];
    chart.on('dataUpdate', (e) => order.push(e.payload.kind));
    chart.addAlert(105, 'crossingUp', 'over 105');
    chart.appendBar(bar(60, 107));
    expect(order).toEqual(['bars', 'alert']);
  });
});

describe('a stream', () => {
  async function connected() {
    const handlers = new Map<string, (e: { data: unknown }) => void>();
    const adapter = {
      name: 'fake',
      connect: () => {},
      disconnect: () => {},
      getConnectionState: () => 'connected',
      fetchHistory: async () => Array.from({ length: 60 }, (_, i) => bar(i, 100)),
      on: (type: string, cb: (e: { data: unknown }) => void) => { handlers.set(type, cb); },
      off: () => {},
      dispose: () => {},
    };
    await chart.connect({ adapter: adapter as never, symbol: 'AAA', timeframe: '1h', historyLimit: 60 });
    return (b: OHLCBar, closed: boolean) => handlers.get('bar')?.({ data: { bar: b, closed } });
  }

  it('sends dataUpdate for a new bar that first comes forming', async () => {
    const send = await connected();
    const seen: unknown[] = [];
    chart.on('dataUpdate', (e) => seen.push(e.payload));
    send(bar(59, 101), false);
    send(bar(59, 102), true);
    send(bar(60, 103), false);
    send(bar(60, 104), false);
    expect(chart.getData()).toHaveLength(61);
    expect(seen).toEqual([{ kind: 'bars', length: 61 }]);
  });

  it('fires alerts on the close of a bar, as on its forming prices', async () => {
    const send = await connected();
    const fired = alertsFired();
    chart.addAlert(105, 'crossingUp', 'over 105');
    send(bar(60, 101), false);
    send(bar(60, 108), true);
    expect(fired).toEqual(['over 105']);
    expect(ordersPrice()).toBe(108);
  });
});

describe('getExchangeTimezone', () => {
  it("is the zone 'exchange' stands for: the symbol's, else a valid market's, else null", () => {
    expect(chart.getExchangeTimezone()).toBeNull();
    chart.setMarket(MARKET_HOSE);
    expect(chart.getExchangeTimezone()).toBe('Asia/Ho_Chi_Minh');
    chart.setSymbolInfo({ symbol: 'X', timezone: 'Not/AZone' });
    expect(chart.getExchangeTimezone()).toBe('Asia/Ho_Chi_Minh');
    chart.setSymbolInfo({ symbol: 'AAPL', timezone: 'America/New_York' });
    expect(chart.getExchangeTimezone()).toBe('America/New_York');
  });
});

describe('a stream, what it leaves out and when it tells', () => {
  async function connected() {
    const handlers = new Map<string, (e: { data: unknown }) => void>();
    const adapter = {
      name: 'fake',
      connect: () => {},
      disconnect: () => {},
      getConnectionState: () => 'connected',
      fetchHistory: async () => Array.from({ length: 60 }, (_, i) => bar(i, 100)),
      on: (type: string, cb: (e: { data: unknown }) => void) => { handlers.set(type, cb); },
      off: () => {},
      dispose: () => {},
    };
    await chart.connect({ adapter: adapter as never, symbol: 'AAA', timeframe: '1h', historyLimit: 60 });
    return (b: OHLCBar, closed: boolean) => handlers.get('bar')?.({ data: { bar: b, closed } });
  }

  it('sends a new bar once the indicators have it', async () => {
    const send = await connected();
    const sma = chart.addIndicator('sma', { period: 5 })!;
    const seen: number[][] = [];
    chart.on('dataUpdate', (e) => {
      if (e.payload.kind === 'bars') seen.push([chart.getData().length, chart.getIndicatorOutput(sma)!.series.length]);
    });
    send(bar(60, 101), false);
    expect(seen).toEqual([[61, 61]]);
  });

  it('leaves out a closed bar the chart turns down, price and all', async () => {
    const send = await connected();
    const fired = alertsFired();
    chart.addAlert(90, 'crossingDown', 'under 90');
    send({ ...bar(60, 80), high: 70, low: 90 }, true);
    expect(fired).toEqual([]);
    expect(chart.getData()).toHaveLength(60);
  });
});

describe('setData, what it tells', () => {
  it('counts and starts from the bars it kept', () => {
    const seen: unknown[] = [];
    chart.on('dataUpdate', (e) => seen.push(e.payload));
    const fired = alertsFired();
    chart.setData([...Array.from({ length: 5 }, (_, i) => bar(i, 100)), { ...bar(5, 50), high: 40, low: 60 }]);
    expect(seen).toEqual([{ kind: 'bars', length: 5 }]);
    chart.addAlert(95, 'crossingDown', 'under 95');
    // From the last bar kept (100), not the one left out (50).
    chart.updateLastBar(bar(4, 94));
    expect(fired).toEqual(['under 95']);
  });
});

describe('a tick the chart turns down', () => {
  it('moves nothing: a volume below zero', () => {
    const fired = alertsFired();
    chart.addAlert(90, 'crossingDown', 'under 90');
    chart.updateLastBarFromTick({ price: 80, volume: -1, time: T0 + 59 * HOUR });
    expect(fired).toEqual([]);
    expect(ordersPrice()).not.toBe(80);
  });
});
