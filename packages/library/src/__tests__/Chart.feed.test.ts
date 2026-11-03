// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BarsRequest, DataFeed, FeedSubscriber, OHLCBar } from '@tradecanvas/commons';
import { ManualFeed } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const hourly = (start: number, n: number, close = 100): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({
    time: T0 + (start + i) * HOUR, open: close, high: close + 1, low: close - 1, close, volume: 1,
  }));

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

/** A feed with 1000 hourly bars per symbol, its requests and subscribers kept for the test. */
function pagedFeed() {
  const requests: BarsRequest[] = [];
  const subscribers: FeedSubscriber[] = [];
  const feed: DataFeed = {
    name: 'paged',
    getBars: async (request) => {
      requests.push(request);
      const end = request.before === undefined ? 2000 : (request.before - T0) / HOUR;
      const start = Math.max(1000, end - request.countBack);
      return end <= 1000 ? [] : hourly(start, end - start, request.symbol === 'BBB' ? 50 : 100);
    },
    subscribeBars: (_request, subscriber) => {
      subscribers.push(subscriber);
      return () => {};
    },
  };
  return { feed, requests, subscribers };
}

describe('Chart.connect with a feed', () => {
  it('loads the bars, follows the live ones and says it is connected', async () => {
    const feed = new ManualFeed();
    feed.setBars('AAA', '1h', hourly(0, 100));
    const states: string[] = [];
    chart.on('dataUpdate', (e) => {
      const p = e.payload as { kind: string; connection?: { state: string } };
      if (p.kind === 'connection' && p.connection) states.push(p.connection.state);
    });
    await chart.connect({ feed, symbol: 'AAA', timeframe: '1h' });
    expect(chart.getData()).toHaveLength(100);
    expect(states.at(-1)).toBe('connected');

    feed.pushBar('AAA', '1h', hourly(100, 1, 120)[0]);
    expect(chart.getData()).toHaveLength(101);
    expect(chart.getData().at(-1)?.close).toBe(120);
  });

  it('pages back through getBars with the time of the oldest bar', async () => {
    const { feed, requests } = pagedFeed();
    await chart.connect({ feed, symbol: 'AAA', timeframe: '1h', historyLimit: 200, historyPageSize: 150 });
    expect(chart.getData()).toHaveLength(200);
    expect(await chart.loadMoreHistory()).toBe(150);
    expect(requests.at(-1)).toMatchObject({ symbol: 'AAA', timeframe: '1h', countBack: 150, before: T0 + 1800 * HOUR });
  });

  it('subscribes again on a switch, and drops what the old subscription still sends', async () => {
    const { feed, subscribers } = pagedFeed();
    await chart.connect({ feed, symbol: 'AAA', timeframe: '1h', historyLimit: 50 });
    await chart.switchStream('BBB', '1h');
    expect(subscribers).toHaveLength(2);
    expect(chart.getData().at(-1)?.close).toBe(50);
    subscribers[0].bar(hourly(2000, 1, 999)[0], false); // AAA's socket, late
    expect(chart.getData().every((b) => b.close !== 999)).toBe(true);
  });

  it('refuses a connect with both an adapter and a feed', async () => {
    const { feed } = pagedFeed();
    const adapter = { name: 'x', connect() {}, disconnect() {}, getConnectionState: () => 'connected' as const, fetchHistory: async () => [], on() {}, off() {}, dispose() {} };
    await expect(chart.connect({ feed, adapter, symbol: 'AAA', timeframe: '1h' })).rejects.toThrow(/not both/);
  });
});
