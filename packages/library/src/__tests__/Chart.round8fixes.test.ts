// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DataAdapter, OHLCBar, SymbolInfo, ViewportState } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { fakeContext, installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 0, 5);
const bars: OHLCBar[] = Array.from({ length: 60 }, (_, i) => {
  const p = 100 + Math.sin(i / 4) * 3;
  return { time: T0 + i * HOUR, open: p, high: p + 1, low: p - 1, close: p + 0.2, volume: 10 };
});

let host: HTMLDivElement;
let chart: Chart;
let texts: string[];

beforeEach(() => {
  installChartStubs();
  texts = [];
  // Record what is written on the canvases.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    const ctx = fakeContext(this) as unknown as Record<string, unknown>;
    ctx.fillText = (t: string) => texts.push(String(t));
    return ctx as never;
  });
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

type RenderContext = { chartRenderer: unknown; viewport: ViewportState };
const renderCtx = () => (chart as unknown as { engine: { renderCtx: RenderContext } }).engine.renderCtx;
const frame = () => new Promise((r) => setTimeout(r, 60));

describe('settings that show at once', () => {
  it('draws a new price format and a hidden main series in the next frame', () => {
    chart.setPriceFormat({ denominator: 32 });
    expect(renderCtx().viewport.formatPrice?.(100.5)).toBe("100'16");
    chart.setMainSeriesVisible(false);
    expect(renderCtx().chartRenderer).toBeNull();
  });

  it('writes a percent pane’s scale in percent', async () => {
    chart.setSymbolSeries('B', bars.map((b) => ({ ...b, close: b.close * 2 })));
    const spread = chart.addIndicator('spread', { symbol: 'B' })!;
    chart.setPaneScale(spread, { percent: true });
    texts.length = 0;
    chart.resize();
    await frame();
    expect(texts.some((t) => /^[+-]?\d+\.\d\d%$/.test(t))).toBe(true);
  });

  it('fits the auto scale to a compare line as soon as it is added', () => {
    chart.setCompareMode('absolute');
    chart.addCompareSymbol('b', 'B', bars.map((b) => ({ ...b, close: b.close + 500 })), '#f00');
    expect(renderCtx().viewport.priceRange.max).toBeGreaterThan(590);
  });
});

describe('extended hours and ticks', () => {
  it('keeps a tick’s change in the whole series', () => {
    const half = 30 * 60_000;
    const nyMidnight = Date.UTC(2026, 0, 5, 5);
    const day: OHLCBar[] = Array.from({ length: 48 }, (_, i) => ({ time: nyMidnight + i * half, open: 100, high: 101, low: 99, close: 100, volume: 1 }));
    const stock: SymbolInfo = { symbol: 'AAA', timezone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] };
    chart.setSymbolInfo(stock);
    chart.setData(day.slice(0, 26)); // up to 12:30
    chart.setExtendedHours(false);
    chart.updateLastBarFromTick({ price: 150, time: day[25].time });
    chart.setExtendedHours(true);
    expect(chart.getData()[25].close).toBe(150);
  });
});

describe('symbols asked for', () => {
  it('asks again for a symbol once nothing reads it and something does again', () => {
    const asked: string[] = [];
    chart.on('symbolSeriesRequest', (e) => asked.push(e.payload.symbol));
    const cmp = chart.addIndicator('compareSymbol', { symbol: 'B' })!;
    chart.removeIndicator(cmp);
    chart.addIndicator('compareSymbol', { symbol: 'B' });
    expect(asked).toEqual(['B', 'B']);
  });
});

describe('quotes', () => {
  it('keeps the other side when a tick carries one, and drops them for a new stream', async () => {
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
    await chart.connect({ adapter, symbol: 'AAA', timeframe: '1h', historyLimit: 60 });
    const tick = (data: Record<string, number>) => handlers.get('tick')?.({ data: { price: 100, volume: 1, time: T0 + 60 * HOUR, ...data } });
    tick({ bid: 99.9, ask: 100.1 });
    tick({ bid: 99.8 });
    expect(chart.getBidAsk()).toEqual({ bid: 99.8, ask: 100.1 });
    chart.disconnectStream();
    expect(chart.getBidAsk()).toBeNull();
  });
});

describe('replay states', () => {
  it('reports no stop when a replay restarts', () => {
    const states: string[] = [];
    chart.on('replayState', (e) => states.push(e.payload.state));
    chart.replayStart({ startIndex: 10, paused: true });
    chart.replayStart({ startIndex: 20, paused: true });
    expect(states).not.toContain('stopped');
    chart.replayStop();
    expect(states.at(-1)).toBe('stopped');
  });
});

describe('price format edge cases and export', () => {
  it('rounds normally with a fraction it can’t print', () => {
    chart.setPriceFormat({ denominator: 0 });
    expect(chart.roundPrice(101.23)).toBe(101.23);
  });

  it('numbers export columns that would have the same name', () => {
    chart.addIndicator('sma', { period: 20 });
    chart.addIndicator('sma', { period: 20 });
    const names = chart.getExportData().columns.map((c) => c.name);
    expect(names).toEqual(['SMA 20', 'SMA 20 (2)']);
  });
});

describe('second review', () => {
  it('asks again only for the indicator that reads the symbol', () => {
    const asked: string[] = [];
    chart.on('symbolSeriesRequest', (e) => asked.push(e.payload.symbol));
    const cmp = chart.addIndicator('compareSymbol', { symbol: 'B' })!;
    chart.setSymbolSeries('B', null); // the fetch failed: nothing more to wait for
    const sma = chart.addIndicator('sma', { period: 10 })!;
    chart.updateIndicator(sma, { period: 12 });
    expect(asked).toEqual(['B']);
    chart.updateIndicator(cmp, { symbol: 'B' });
    expect(asked).toEqual(['B', 'B']);
  });

  it('finds bars given under a symbol with spaces around it', () => {
    const cmp = chart.addIndicator('compareSymbol', { symbol: 'B' })!;
    chart.setSymbolSeries(' B ', bars);
    expect(chart.getIndicatorOutput(cmp)?.series?.[5]?.value).toBe(bars[5].close);
  });

  it('starts hiding extended hours once live bars tell the interval', () => {
    const half = 30 * 60_000;
    const nyMidnight = Date.UTC(2026, 0, 6, 5);
    const at = (i: number): OHLCBar => ({ time: nyMidnight + i * half, open: 100, high: 101, low: 99, close: 100, volume: 1 });
    chart.setSymbolInfo({ symbol: 'AAA', timezone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] });
    chart.setData([]);
    chart.setExtendedHours(false);
    chart.appendBar(at(14)); // 07:00
    chart.appendBar(at(15)); // 07:30
    chart.appendBar(at(19)); // 09:30
    expect(chart.getData().map((b) => b.time)).toEqual([at(19).time]);
    chart.setExtendedHours(true);
    expect(chart.getData()).toHaveLength(3);
  });

  it('takes older pages into the whole series sorted and once each', () => {
    const half = 30 * 60_000;
    const nyMidnight = Date.UTC(2026, 0, 6, 5);
    const at = (i: number): OHLCBar => ({ time: nyMidnight + i * half, open: 100, high: 101, low: 99, close: 100, volume: 1 });
    chart.setSymbolInfo({ symbol: 'AAA', timezone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] });
    chart.setData([at(20), at(21), at(22)]);
    chart.setExtendedHours(false);
    chart.prependBars([at(19), at(15), at(19), at(18)]);
    chart.setExtendedHours(true);
    expect(chart.getData().map((b) => b.time)).toEqual([at(15), at(18), at(19), at(20), at(21), at(22)].map((b) => b.time));
  });

  it('prints its high/low tags in the chart’s precision from the start', () => {
    chart.setHighLowLines(true);
    const lines = (chart as unknown as { priceLines: { priceText: ((p: number) => string) | null } }).priceLines;
    expect(lines.priceText?.(1.23456)).toBe(chart.formatPrice(1.23456));
  });
});

describe('the symbol’s precision on the price scale', () => {
  const dong: OHLCBar[] = Array.from({ length: 60 }, (_, i) => {
    const p = 21_500 + Math.round(Math.sin(i / 4) * 30) * 10;
    return { time: T0 + i * HOUR, open: p, high: p + 100, low: p - 100, close: p + 50, volume: 1000 };
  });
  /** The price scale's labels: numbers in the 20 thousands, as the axis writes them. */
  const scaleLabels = () => texts.filter((t) => /^2\d,\d{3}(\.\d+)?$/.test(t));

  it('writes the scale in the symbol’s decimals, as the legend and tags are', async () => {
    chart.setData(dong);
    chart.setSymbolInfo({ symbol: 'VND1', pricePrecision: 0, minTick: 10 });
    texts.length = 0;
    chart.resize();
    await frame();
    expect(scaleLabels().length).toBeGreaterThan(0);
    expect(scaleLabels().filter((t) => t.includes('.'))).toEqual([]);
  });

  /** A feed whose events the test sends; with trades, the stream wraps it for tick charts. */
  function feed(handlers: Map<string, (e: { data: unknown }) => void>, extra: Partial<DataAdapter> = {}): DataAdapter {
    return {
      name: 'feed',
      connect: () => {},
      disconnect: () => {},
      getConnectionState: () => 'connected',
      fetchHistory: async () => dong,
      on: ((type: string, cb: (e: { data: unknown }) => void) => { handlers.set(type, cb); }) as DataAdapter['on'],
      off: () => {},
      dispose: () => {},
      ...extra,
    };
  }

  it('takes it from a feed with trades too', async () => {
    const handlers = new Map<string, (e: { data: unknown }) => void>();
    const adapter = feed(handlers, { fetchTrades: async () => [], subscribeTrades: () => () => {} });
    await chart.connect({ adapter, symbol: 'VND1', timeframe: '1h', historyLimit: 60 });
    handlers.get('symbolInfo')?.({ data: { symbol: 'VND1', pricePrecision: 0 } });
    expect(chart.getSymbolInfo()?.pricePrecision).toBe(0);
  });

  it('adds what the feed learns to what is known, any case, and ignores the same again', async () => {
    const handlers = new Map<string, (e: { data: unknown }) => void>();
    await chart.connect({ adapter: feed(handlers), symbol: 'VND1', timeframe: '1h', historyLimit: 60 });
    chart.setSymbolInfo({ symbol: 'VND1', timezone: 'Asia/Ho_Chi_Minh', sessions: [{ start: '09:00', end: '15:00' }] });
    const changes: unknown[] = [];
    chart.on('symbolInfoChange', (e) => changes.push(e.payload));
    handlers.get('symbolInfo')?.({ data: { symbol: 'vnd1', pricePrecision: 0 } });
    handlers.get('symbolInfo')?.({ data: { symbol: 'vnd1', pricePrecision: 0 } });
    expect(chart.getSymbolInfo()).toMatchObject({ timezone: 'Asia/Ho_Chi_Minh', pricePrecision: 0 });
    expect(changes).toHaveLength(1);
  });

  it('drops the last symbol’s details on a switch, though the feed can’t be asked', async () => {
    chart.setSymbolInfo({ symbol: 'VND1', pricePrecision: 0, minTick: 10 });
    await chart.connect({ adapter: feed(new Map()), symbol: 'BTCUSDT', timeframe: '1h', historyLimit: 60 });
    expect(chart.getSymbolInfo()).toBeNull();
  });

  it('takes what the feed learns about the symbol after it connected', async () => {
    const handlers = new Map<string, (e: { data: unknown }) => void>();
    const adapter: DataAdapter = {
      name: 'late-info',
      connect: () => {},
      disconnect: () => {},
      getConnectionState: () => 'connected',
      fetchHistory: async () => dong,
      // Not known yet when the chart asks.
      resolveSymbol: async () => null,
      on: ((type: string, cb: (e: { data: unknown }) => void) => { handlers.set(type, cb); }) as DataAdapter['on'],
      off: () => {},
      dispose: () => {},
    };
    await chart.connect({ adapter, symbol: 'VND1', timeframe: '1h', historyLimit: 60 });
    handlers.get('symbolInfo')?.({ data: { symbol: 'VND1', pricePrecision: 0, minTick: 10, currency: 'VND' } });
    expect(chart.getSymbolInfo()).toMatchObject({ symbol: 'VND1', pricePrecision: 0, minTick: 10 });
    // About another symbol: not this chart's.
    handlers.get('symbolInfo')?.({ data: { symbol: 'OTHER', pricePrecision: 4 } });
    expect(chart.getSymbolInfo()?.symbol).toBe('VND1');
    texts.length = 0;
    chart.resize();
    await frame();
    expect(scaleLabels().filter((t) => t.includes('.'))).toEqual([]);
  });
});
