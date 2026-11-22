// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DataAdapter, OHLCBar, TimeFrame, Trade } from '@tradecanvas/commons';
import { FOOTPRINT_TEXT_BAR_WIDTH, FootprintRenderer, footprintWidth } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const MIN = 60_000;
const T0 = Date.UTC(2025, 0, 6);
const bars = (n: number, close = 100): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * MIN, open: close, high: close + 1, low: close - 1, close, volume: 10 }));
const trade = (time: number, price: number, volume: number, side: Trade['side'] = 'buy'): Trade => ({ time, price, volume, side });

let host: HTMLDivElement;
let chart: Chart;

interface Inner {
  viewport: { getState(): { barWidth: number; barSpacing: number }; zoom(delta: number, x: number): void };
  chartRenderer: unknown;
}
const inner = () => chart as unknown as Inner;
const barWidth = () => inner().viewport.getState().barWidth;
/** How wide a bar's footprint is drawn. */
const drawnWidth = () => footprintWidth(inner().viewport.getState());

/** A feed with trades: what it was asked for, and a way to send live ones. */
function tradeFeed(recent: Trade[] = []) {
  const asked: { symbol: string; limit?: number }[] = [];
  const stops: ReturnType<typeof vi.fn>[] = [];
  let send: ((trades: Trade[]) => void) | null = null;
  const adapter: DataAdapter = {
    name: 'fake',
    connect: () => {},
    disconnect: () => {},
    getConnectionState: () => 'connected',
    fetchHistory: async (_s: string, _tf: TimeFrame) => bars(60),
    on: () => {},
    off: () => {},
    dispose: () => {},
    fetchTrades: async (symbol: string, limit?: number) => {
      asked.push({ symbol, limit });
      return recent;
    },
    subscribeTrades: (_symbol: string, onTrades: (trades: Trade[]) => void) => {
      send = onTrades;
      const stop = vi.fn(() => { send = null; });
      stops.push(stop);
      return stop;
    },
  };
  return { adapter, asked, stops, live: (trades: Trade[]) => send?.(trades), listening: () => send !== null };
}

/** Let the promises a connect leaves behind (the recent trades) land. */
const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

beforeEach(() => {
  installChartStubs();
  host = sizedHost(1200, 600);
  chart = new Chart(host, { chartType: 'candlestick' });
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart: the footprint chart type', () => {
  it('is drawn by its own renderer, and says so', () => {
    const seen: unknown[] = [];
    chart.on('chartTypeChange', (e) => seen.push(e.payload));
    chart.setData(bars(300));
    chart.setChartType('footprint');
    expect(inner().chartRenderer).toBeInstanceOf(FootprintRenderer);
    expect(chart.getChartType()).toBe('footprint');
    expect(seen).toEqual([{ type: 'footprint', previous: 'candlestick' }]);
  });

  it('zooms in to where the numbers read when it is chosen, and lets the bars get wider than candles do', () => {
    chart.setData(bars(300));
    expect(barWidth()).toBeLessThan(30);
    chart.setChartType('footprint');
    expect(drawnWidth()).toBeGreaterThanOrEqual(FOOTPRINT_TEXT_BAR_WIDTH);
    // The newest bar is still in view.
    expect(chart.getVisibleTimeRange()!.to).toBeGreaterThanOrEqual(T0 + 299 * MIN);
    // Back to candles: no wider than candles get.
    chart.setChartType('candlestick');
    expect(barWidth()).toBeLessThanOrEqual(30);
    // And zooming in gets them no wider.
    for (let i = 0; i < 50; i++) inner().viewport.zoom(0.5, 400);
    expect(barWidth()).toBeLessThanOrEqual(30);
  });

  it('opens zoomed in when the chart starts as a footprint and its bars come later', () => {
    chart.destroy();
    chart = new Chart(host, { chartType: 'footprint' });
    chart.setData(bars(300));
    expect(drawnWidth()).toBeGreaterThanOrEqual(FOOTPRINT_TEXT_BAR_WIDTH);
  });
});

describe('Chart: trades into the footprint', () => {
  it('counts each trade in the bar of its time and the row of its price', () => {
    chart.setData(bars(10));
    chart.setChartTypeOptions({ footprint: { rowSize: 0.5 } });
    chart.addTrades([trade(T0 + 5, 100.2, 3, 'buy'), trade(T0 + 9, 100.4, 2, 'sell'), trade(T0 + MIN + 1, 99.7, 4, 'sell')]);
    expect(chart.getFootprint(T0)).toEqual({ time: T0, levels: [{ price: 100, buy: 3, sell: 2 }] });
    expect(chart.getFootprint(T0 + MIN)).toEqual({ time: T0 + MIN, levels: [{ price: 99.5, buy: 0, sell: 4 }] });
    expect(chart.getFootprint(T0 + 2 * MIN)).toBeNull();
    expect(chart.getFootprint().map((bar) => bar.time)).toEqual([T0, T0 + MIN]);
  });

  it('picks a row of about a ten-thousandth of the price when none is set', () => {
    chart.setData(bars(10, 60_000));
    chart.addTrades([trade(T0 + 5, 60_003, 1), trade(T0 + 6, 60_004.9, 2), trade(T0 + 7, 60_005, 4)]);
    expect(chart.getFootprint(T0)!.levels).toEqual([{ price: 60_000, buy: 3, sell: 0 }, { price: 60_005, buy: 4, sell: 0 }]);
  });

  it('keeps a trade of a bar still to come until the bar is there', () => {
    chart.setData(bars(3));
    chart.setChartTypeOptions({ footprint: { rowSize: 1 } });
    chart.setDataTimeframe('1m');
    chart.addTrades([trade(T0 + 3 * MIN + 5, 100, 6)]);
    expect(chart.getFootprint()).toEqual([]);
    chart.appendBar({ time: T0 + 3 * MIN, open: 100, high: 101, low: 99, close: 100, volume: 6 });
    expect(chart.getFootprint(T0 + 3 * MIN)!.levels).toEqual([{ price: 100, buy: 6, sell: 0 }]);
  });

  it('takes rows given by hand, in rows of their own step when none is set', () => {
    chart.setData(bars(10));
    chart.setFootprint([{ time: T0, levels: [{ price: 100, buy: 1, sell: 2 }, { price: 100.5, buy: 3, sell: 4 }, { price: 101, buy: 5, sell: 6 }] }]);
    expect(chart.getFootprint(T0)!.levels.map((level) => level.price)).toEqual([100, 100.5, 101]);
    // Given again, a bar's rows replace the ones it had.
    chart.setFootprint([{ time: T0, levels: [{ price: 100, buy: 9, sell: 9 }] }]);
    expect(chart.getFootprint(T0)!.levels).toEqual([{ price: 100, buy: 9, sell: 9 }]);
    chart.clearFootprint();
    expect(chart.getFootprint()).toEqual([]);
  });

  it('starts again on another row size', () => {
    chart.setData(bars(10));
    chart.setChartTypeOptions({ footprint: { rowSize: 1 } });
    chart.addTrades([trade(T0 + 5, 100.2, 3)]);
    chart.setChartTypeOptions({ footprint: { rowSize: 1, cells: 'delta' } });
    expect(chart.getFootprint()).toHaveLength(1);
    chart.setChartTypeOptions({ footprint: { rowSize: 0.5 } });
    expect(chart.getFootprint()).toEqual([]);
    expect(chart.getChartTypeOptions().footprint).toEqual({ rowSize: 0.5 });
  });

  it('writes what each bar adds up to under it unless told not to, and takes that as a setting', () => {
    chart.setData(bars(300));
    chart.setChartType('footprint');
    const room = () => (inner().chartRenderer as FootprintRenderer).totalsRoom(inner().viewport.getState() as never, chart.getTheme());
    expect(room()).toBeGreaterThan(0);
    chart.setChartTypeOptions({ footprint: { totals: false } });
    expect(room()).toBe(0);
    expect(chart.getChartTypeOptions().footprint).toEqual({ totals: false });
    chart.setChartTypeOptions({ footprint: { totals: true } });
    expect(room()).toBeGreaterThan(0);
    // What is no switch is left out, and the totals stay on.
    chart.setChartTypeOptions({ footprint: { totals: 'yes' } as never });
    expect(chart.getChartTypeOptions().footprint).toEqual({});
    expect(room()).toBeGreaterThan(0);
    // A chart made as a footprint with them off has them off from the first.
    chart.destroy();
    chart = new Chart(host, { chartType: 'footprint', chartTypeOptions: { footprint: { totals: false } } });
    chart.setData(bars(300));
    expect(room()).toBe(0);
  });

  it('reads its settings: what a cell shows, the ratio that marks a row, and leaves out what it cannot use', () => {
    chart.setChartTypeOptions({ footprint: { cells: 'volume', imbalance: 4, rowSize: 'auto', collect: false } });
    expect(chart.getChartTypeOptions().footprint).toEqual({ cells: 'volume', imbalance: 4, rowSize: 'auto', collect: false });
    chart.setChartTypeOptions({ footprint: { cells: 'nope', imbalance: -1, rowSize: 0 } as never });
    expect(chart.getChartTypeOptions().footprint).toEqual({});
  });
});

describe('Chart: a footprint from the feed', () => {
  it('asks a feed with trades for its recent ones and follows its live ones, while it shows a footprint', async () => {
    const feed = tradeFeed([trade(T0 + 58 * MIN + 1, 100.2, 5), trade(T0 + 59 * MIN + 1, 100.2, 2, 'sell')]);
    chart.setChartTypeOptions({ footprint: { rowSize: 1 } });
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    await settle();
    // A candle chart asks for none.
    expect(feed.asked).toEqual([]);
    expect(feed.listening()).toBe(false);
    chart.setChartType('footprint');
    await settle();
    expect(feed.asked).toHaveLength(1);
    expect(feed.asked[0].symbol).toBe('X');
    expect(chart.getFootprint(T0 + 58 * MIN)!.levels).toEqual([{ price: 100, buy: 5, sell: 0 }]);
    feed.live([trade(T0 + 59 * MIN + 30, 100.9, 3)]);
    expect(chart.getFootprint(T0 + 59 * MIN)!.levels).toEqual([{ price: 100, buy: 3, sell: 2 }]);
    // Another chart type: it stops listening, and keeps what it has.
    chart.setChartType('candlestick');
    expect(feed.listening()).toBe(false);
    expect(feed.stops[0]).toHaveBeenCalledTimes(1);
    expect(chart.getFootprint()).toHaveLength(2);
  });

  it('starts with the connection when the chart is a footprint already', async () => {
    const feed = tradeFeed([trade(T0 + 59 * MIN + 1, 100.2, 2)]);
    chart.setChartType('footprint');
    chart.setChartTypeOptions({ footprint: { rowSize: 1 } });
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    await settle();
    expect(feed.asked).toHaveLength(1);
    expect(feed.listening()).toBe(true);
    expect(chart.getFootprint(T0 + 59 * MIN)).not.toBeNull();
  });

  it('starts again for another symbol or timeframe, and stops with the stream', async () => {
    const feed = tradeFeed([trade(T0 + 59 * MIN + 1, 100.2, 2)]);
    chart.setChartType('footprint');
    chart.setChartTypeOptions({ footprint: { rowSize: 1 } });
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    await settle();
    expect(chart.getFootprint()).toHaveLength(1);
    await chart.switchStream('Y', '1m');
    // The other symbol's rows are gone at once; its own come when the feed answers.
    expect(feed.stops[0]).toHaveBeenCalledTimes(1);
    await settle();
    expect(feed.asked.map((a) => a.symbol)).toEqual(['X', 'Y']);
    expect(feed.listening()).toBe(true);
    chart.disconnectStream();
    expect(feed.listening()).toBe(false);
  });

  it('asks the feed for nothing when told the host gives the rows', async () => {
    const feed = tradeFeed([trade(T0 + 59 * MIN + 1, 100.2, 2)]);
    chart.setChartType('footprint');
    chart.setChartTypeOptions({ footprint: { rowSize: 1, collect: false } });
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    await settle();
    expect(feed.asked).toEqual([]);
    expect(feed.listening()).toBe(false);
    // Switched on, it starts.
    chart.setChartTypeOptions({ footprint: { rowSize: 1 } });
    await settle();
    expect(feed.asked).toHaveLength(1);
  });

  it('counts the live trades from the first when the feed cannot give its recent ones, and says so', async () => {
    const feed = tradeFeed();
    feed.adapter.fetchTrades = async () => { throw new Error('no trades here'); };
    const updates: { kind: string; error?: string }[] = [];
    chart.on('dataUpdate', (e) => updates.push(e.payload as { kind: string; error?: string }));
    chart.setChartType('footprint');
    chart.setChartTypeOptions({ footprint: { rowSize: 1 } });
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    await settle();
    feed.live([trade(T0 + 59 * MIN + 30, 100.9, 3)]);
    expect(chart.getFootprint(T0 + 59 * MIN)!.levels).toEqual([{ price: 100, buy: 3, sell: 0 }]);
    expect(updates.some((u) => u.kind === 'error' && u.error === 'no trades here')).toBe(true);
  });

  it('stops listening when the chart goes away', async () => {
    const feed = tradeFeed();
    chart.setChartType('footprint');
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    await settle();
    expect(feed.listening()).toBe(true);
    chart.destroy();
    expect(feed.listening()).toBe(false);
    chart = new Chart(host, { chartType: 'candlestick' });
  });
});

describe('Chart: what the review of the footprint turned up', () => {
  it('keeps trades given before the bars, with no row size set, and counts them once the bars are there', () => {
    chart.setChartType('footprint');
    chart.addTrades([trade(T0 + 5, 100.2, 3), trade(T0 + MIN + 5, 100.2, 4)]);
    expect(chart.getFootprint()).toEqual([]);
    chart.setData(bars(10));
    expect(chart.getFootprint().map((bar) => bar.time)).toEqual([T0, T0 + MIN]);
    expect(chart.getFootprint(T0)!.levels).toEqual([{ price: 100.2, buy: 3, sell: 0 }]);
  });

  it('gives its rows as a copy: a host that changes what it read changes nothing on the chart', () => {
    chart.setData(bars(10));
    chart.setChartTypeOptions({ footprint: { rowSize: 1 } });
    chart.addTrades([trade(T0 + 5, 100.2, 3)]);
    const read = chart.getFootprint(T0)!;
    read.levels[0].buy = 999;
    read.levels.push({ price: 5, buy: 1, sell: 1 });
    chart.getFootprint()[0].levels.length = 0;
    expect(chart.getFootprint(T0)!.levels).toEqual([{ price: 100, buy: 3, sell: 0 }]);
  });

  it('keeps a trade made after a daily bar ended for the next day’s bar', () => {
    const DAY = 24 * 60 * MIN;
    const days = Array.from({ length: 3 }, (_, i) => ({ time: T0 + i * DAY, open: 100, high: 101, low: 99, close: 100, volume: 10 }));
    chart.setData(days);
    chart.setDataTimeframe('1d');
    chart.setChartTypeOptions({ footprint: { rowSize: 1 } });
    chart.addTrades([trade(T0 + 2 * DAY + 60_000, 100, 2), trade(T0 + 3 * DAY + 60_000, 100, 7)]);
    expect(chart.getFootprint().map((bar) => bar.time)).toEqual([T0 + 2 * DAY]);
    chart.appendBar({ time: T0 + 3 * DAY, open: 100, high: 101, low: 99, close: 100, volume: 7 });
    expect(chart.getFootprint(T0 + 3 * DAY)!.levels).toEqual([{ price: 100, buy: 7, sell: 0 }]);
  });

  it('asks for the recent trades again when the stream reconnects, and counts only the ones it missed', async () => {
    const recent = [trade(T0 + 59 * MIN + 1, 100.2, 2)];
    const feed = tradeFeed(recent);
    chart.setChartType('footprint');
    chart.setChartTypeOptions({ footprint: { rowSize: 1 } });
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    await settle();
    expect(feed.asked).toHaveLength(1);
    // While the connection was down the feed went on trading.
    recent.push(trade(T0 + 59 * MIN + 500, 100.2, 5));
    (chart as unknown as { streamManager: { emit(type: string, bars: OHLCBar[]): void } }).streamManager.emit('snapshot', bars(60));
    await settle();
    expect(feed.asked).toHaveLength(2);
    expect(feed.stops[0]).not.toHaveBeenCalled();
    expect(chart.getFootprint(T0 + 59 * MIN)!.levels).toEqual([{ price: 100, buy: 7, sell: 0 }]);
  });

  it('hides, in a replay, the cells of the bars not shown yet, whatever unit the bars’ times are in', () => {
    const inSeconds = bars(20).map((bar) => ({ ...bar, time: bar.time / 1000 }));
    chart.setData(inSeconds);
    chart.setChartType('footprint');
    chart.replayStart({ startIndex: 10, paused: true });
    const shown = (inner().chartRenderer as unknown as { shownUntil: number | null }).shownUntil;
    // Up to the eleventh bar's end, in milliseconds as the footprint's bars are.
    expect(shown).toBe(T0 + 11 * MIN);
    chart.replayStop();
    expect((inner().chartRenderer as unknown as { shownUntil: number | null }).shownUntil).toBeNull();
  });
});

describe('Chart: the footprint after a dropped connection', () => {
  it('counts the trades it missed though a live trade came in before they were asked for again', async () => {
    const recent = [trade(T0 + 58 * MIN + 1, 100.2, 2)];
    const feed = tradeFeed(recent);
    chart.setChartType('footprint');
    chart.setChartTypeOptions({ footprint: { rowSize: 1 } });
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    await settle();
    // While it was down: 5 bought in the bar before the last, 4 in the last. The trades come back first.
    recent.push(trade(T0 + 58 * MIN + 500, 100.2, 5), trade(T0 + 59 * MIN + 10, 100.2, 4), trade(T0 + 59 * MIN + 20, 100.2, 1));
    feed.live([trade(T0 + 59 * MIN + 20, 100.2, 1)]);
    (chart as unknown as { streamManager: { emit(type: string, bars: OHLCBar[]): void } }).streamManager.emit('snapshot', bars(60));
    await settle();
    expect(chart.getFootprint(T0 + 58 * MIN)!.levels).toEqual([{ price: 100, buy: 7, sell: 0 }]);
    expect(chart.getFootprint(T0 + 59 * MIN)!.levels).toEqual([{ price: 100, buy: 5, sell: 0 }]);
  });

  it('counts the feed’s recent trades again after the footprint was started over, though they were told before', async () => {
    const feed = tradeFeed([trade(T0 + 59 * MIN + 1, 100.2, 2)]);
    chart.setChartType('footprint');
    chart.setChartTypeOptions({ footprint: { rowSize: 1 } });
    const told: number[] = [];
    chart.on('trades', (e) => told.push(...e.payload.trades.map((t) => t.time)));
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    await settle();
    expect(told).toEqual([T0 + 59 * MIN + 1]);
    // Another row size starts the footprint again: the trades are counted anew, and told no second time.
    chart.setChartTypeOptions({ footprint: { rowSize: 0.5 } });
    await settle();
    expect(chart.getFootprint(T0 + 59 * MIN)!.levels).toEqual([{ price: 100, buy: 2, sell: 0 }]);
    expect(told).toEqual([T0 + 59 * MIN + 1]);
  });
});
