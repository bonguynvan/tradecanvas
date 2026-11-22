// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DataAdapter, OHLCBar, TimeFrame, Trade } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const MIN = 60_000;
const T0 = Date.UTC(2025, 0, 6);
const bars = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * MIN, open: 100, high: 101, low: 99, close: 100, volume: 10 }));
const trade = (time: number, volume = 1, side: Trade['side'] = 'buy'): Trade => ({ time, price: 100.2, volume, side });
const END = T0 + 59 * MIN;

let host: HTMLDivElement;
let chart: Chart;
/** Every `trades` event the chart sent: the times it told, and whether they were the feed's recent ones. */
let told: { times: number[]; recent: boolean }[];

/** A feed with trades: what it was asked for, and a way to send live ones. */
function tradeFeed(recent: Trade[] = []) {
  const asked: string[] = [];
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
    fetchTrades: async (symbol: string) => {
      asked.push(symbol);
      return recent;
    },
    subscribeTrades: (_symbol: string, onTrades: (trades: Trade[]) => void) => {
      send = onTrades;
      const stop = vi.fn(() => { send = null; });
      stops.push(stop);
      return stop;
    },
  };
  return { adapter, asked, stops, recent, live: (trades: Trade[]) => send?.(trades), listening: () => send !== null };
}

/** Let the promises a connect leaves behind (the recent trades) land. */
const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

beforeEach(() => {
  installChartStubs();
  host = sizedHost(1200, 600);
  chart = new Chart(host, { chartType: 'candlestick' });
  told = [];
  chart.on('trades', (e) => told.push({ times: e.payload.trades.map((t) => t.time), recent: e.payload.recent }));
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart: following the feed’s trades', () => {
  it('asks a feed for no trades until someone follows them, then tells its recent ones and its live ones', async () => {
    const feed = tradeFeed([trade(END + 1), trade(END + 2)]);
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    await settle();
    expect(feed.asked).toEqual([]);
    expect(feed.listening()).toBe(false);
    const stop = chart.followTrades();
    await settle();
    expect(feed.asked).toEqual(['X']);
    expect(told).toEqual([{ times: [END + 1, END + 2], recent: true }]);
    feed.live([trade(END + 3)]);
    expect(told.at(-1)).toEqual({ times: [END + 3], recent: false });
    // No longer followed: the chart stops listening.
    stop();
    expect(feed.listening()).toBe(false);
    expect(feed.stops[0]).toHaveBeenCalledTimes(1);
  });

  it('follows before the connection, and starts when the bars are in', async () => {
    const feed = tradeFeed([trade(END + 1)]);
    chart.followTrades();
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    await settle();
    expect(feed.asked).toEqual(['X']);
    expect(told).toEqual([{ times: [END + 1], recent: true }]);
  });

  it('listens once for any number of followers, until the last of them lets go', async () => {
    const feed = tradeFeed();
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    const first = chart.followTrades();
    const second = chart.followTrades();
    await settle();
    expect(feed.stops).toHaveLength(1);
    first();
    // Let go twice: it counts once.
    first();
    expect(feed.listening()).toBe(true);
    second();
    expect(feed.listening()).toBe(false);
  });

  it('tells the live trades that come before the recent ones after them, none twice', async () => {
    let answer: (trades: Trade[]) => void = () => {};
    const feed = tradeFeed();
    feed.adapter.fetchTrades = () => new Promise<Trade[]>((resolve) => { answer = resolve; });
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    chart.followTrades();
    await settle();
    feed.live([trade(END + 5), trade(END + 6)]);
    expect(told).toEqual([]);
    answer([trade(END + 4), trade(END + 5)]);
    await settle();
    expect(told).toEqual([{ times: [END + 4, END + 5, END + 6], recent: true }]);
  });

  it('tells the trades given by hand, on any chart', () => {
    chart.setData(bars(60));
    chart.addTrades([trade(END + 1), trade(END + 2)]);
    expect(told).toEqual([{ times: [END + 1, END + 2], recent: false }]);
    // None given: nothing told.
    chart.addTrades([]);
    expect(told).toHaveLength(1);
  });

  it('tells no trade again on another timeframe of the symbol, and starts over on another symbol', async () => {
    const feed = tradeFeed([trade(END + 1), trade(END + 2)]);
    chart.followTrades();
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    await settle();
    expect(told).toHaveLength(1);
    feed.recent.push(trade(END + 3));
    await chart.switchStream('X', '5m');
    await settle();
    expect(feed.asked).toEqual(['X', 'X']);
    expect(told.at(-1)).toEqual({ times: [END + 3], recent: true });
    await chart.switchStream('Y', '5m');
    await settle();
    expect(feed.asked).toEqual(['X', 'X', 'Y']);
    // Another symbol's trades are all new.
    expect(told.at(-1)).toEqual({ times: [END + 1, END + 2, END + 3], recent: true });
  });

  it('keeps listening for a follower when the chart stops being a footprint, and for a footprint when the follower lets go', async () => {
    const feed = tradeFeed();
    chart.setChartType('footprint');
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    await settle();
    expect(feed.listening()).toBe(true);
    const stop = chart.followTrades();
    chart.setChartType('candlestick');
    expect(feed.listening()).toBe(true);
    expect(feed.stops).toHaveLength(1);
    chart.setChartType('footprint');
    stop();
    expect(feed.listening()).toBe(true);
    chart.setChartType('candlestick');
    expect(feed.listening()).toBe(false);
  });

  it('counts the trades it follows into the footprint, unless the host gives the rows', async () => {
    const feed = tradeFeed([trade(END + 1, 4)]);
    chart.setChartTypeOptions({ footprint: { rowSize: 1 } });
    chart.followTrades();
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    await settle();
    expect(chart.getFootprint(END)!.levels).toEqual([{ price: 100, buy: 4, sell: 0 }]);
    // What the feed is followed for changed: it is asked again, and tells nothing it told.
    chart.setChartTypeOptions({ footprint: { rowSize: 1, collect: false } });
    await settle();
    expect(told).toHaveLength(1);
    feed.live([trade(END + 2, 3)]);
    expect(told.at(-1)).toEqual({ times: [END + 2], recent: false });
    expect(chart.getFootprint(END)!.levels).toEqual([{ price: 100, buy: 4, sell: 0 }]);
  });

  it('tells only the trades it missed when the stream reconnects', async () => {
    const feed = tradeFeed([trade(END + 1)]);
    chart.followTrades();
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    await settle();
    feed.recent.push(trade(END + 2));
    (chart as unknown as { streamManager: { emit(type: string, bars: OHLCBar[]): void } }).streamManager.emit('snapshot', bars(60));
    await settle();
    expect(told.at(-1)).toEqual({ times: [END + 2], recent: true });
  });

  it('lets go of the feed when the chart goes away, whoever follows', async () => {
    const feed = tradeFeed();
    chart.followTrades();
    await chart.connect({ adapter: feed.adapter, symbol: 'X', timeframe: '1m' });
    await settle();
    chart.destroy();
    expect(feed.listening()).toBe(false);
    chart = new Chart(host, { chartType: 'candlestick' });
  });
});
