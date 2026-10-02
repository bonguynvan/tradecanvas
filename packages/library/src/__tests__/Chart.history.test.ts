// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DataAdapter, HistoryLoadPayload, OHLCBar, TimeFrame } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
/** `n` hourly bars starting `start` hours after T0. */
const hourly = (start: number, n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({
    time: T0 + (start + i) * HOUR, open: 100 + i, high: 101 + i, low: 99 + i, close: 100 + i, volume: 1,
  }));

type Probe = {
  viewport: { getState(): { barWidth: number; barSpacing: number; offset: number; chartRect: { width: number } } };
};

let host: HTMLDivElement;
let chart: Chart;
const vs = () => (chart as unknown as Probe).viewport.getState();
/** Time of the bar at the centre of the plot. */
const centreTime = () => {
  const s = vs();
  const i = Math.round((s.chartRect.width / 2 - s.barWidth / 2 + s.offset) / (s.barWidth + s.barSpacing));
  return chart.getData()[i].time;
};

/** Older bars ending right before `before`. */
const pageBefore = (before: number, limit: number) => hourly((before - T0) / HOUR - limit, limit);

function fakeAdapter(withPaging: boolean): DataAdapter & { fetchHistoryBefore?: ReturnType<typeof vi.fn> } {
  const adapter: DataAdapter = {
    name: 'fake',
    connect: () => {},
    disconnect: () => {},
    getConnectionState: () => 'connected',
    fetchHistory: async (_s: string, _tf: TimeFrame, limit?: number) => hourly(1000, limit ?? 500),
    on: () => {},
    off: () => {},
    dispose: () => {},
  };
  if (withPaging) {
    adapter.fetchHistoryBefore = vi.fn(async (_s: string, _tf: TimeFrame, before: number, limit: number) =>
      before <= T0 ? [] : pageBefore(before, Math.min(limit, (before - T0) / HOUR)));
  }
  return adapter as DataAdapter & { fetchHistoryBefore?: ReturnType<typeof vi.fn> };
}

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

describe('Chart.prependBars', () => {
  it('adds older bars and keeps the same bars on screen', () => {
    chart.setData(hourly(1000, 500));
    chart.goToTime(T0 + 1200 * HOUR);
    const before = centreTime();

    expect(chart.prependBars(hourly(800, 200))).toBe(200);
    expect(chart.getData()).toHaveLength(700);
    expect(chart.getData()[0].time).toBe(T0 + 800 * HOUR);
    expect(centreTime()).toBe(before);
  });

  it('recomputes indicators over the longer series', () => {
    chart.setData(hourly(1000, 100));
    const id = chart.addIndicator('sma', { period: 20 });
    expect(chart.getIndicatorOutput(id)?.series?.[0]).toBeFalsy();

    chart.prependBars(hourly(900, 100));
    // The bar that used to be first now has 19 bars before it.
    const value = chart.getIndicatorOutput(id)?.series?.[100]?.value;
    expect(value).toBeTypeOf('number');
  });

  it('ignores bars that are not older than the first loaded bar', () => {
    chart.setData(hourly(1000, 50));
    expect(chart.prependBars(hourly(1000, 10))).toBe(0);
    expect(chart.getData()).toHaveLength(50);
  });

  it('leaves a replay alone', () => {
    chart.setData(hourly(1000, 50));
    chart.replayStart({ startIndex: 10 });
    expect(chart.prependBars(hourly(900, 10))).toBe(0);
    chart.replayStop();
    expect(chart.getData()).toHaveLength(50);
  });
});

describe('Chart history paging', () => {
  it('loads a page when the view reaches the oldest bars', async () => {
    const events: HistoryLoadPayload[] = [];
    chart.on('historyLoad', (e) => events.push(e.payload as HistoryLoadPayload));
    chart.setData(hourly(1000, 500));
    const loader = vi.fn(async (before: number, limit: number) => pageBefore(before, limit));
    chart.setHistoryLoader(loader, { pageSize: 300 });
    expect(loader).not.toHaveBeenCalled(); // the view rests at the newest bars

    chart.scrollTo(T0 + 1000 * HOUR);
    await vi.waitFor(() => expect(loader).toHaveBeenCalledWith(T0 + 1000 * HOUR, 300));
    await vi.waitFor(() => expect(chart.getData()).toHaveLength(800));
    expect(events.map((e) => e.state)).toEqual(['loading', 'loaded']);
    expect(events[1].count).toBe(300);
  });

  it('fills a short series at once, and reports the end of the history', async () => {
    chart.setData(hourly(10, 50)); // fewer bars than fit on screen
    chart.setHistoryLoader(async (before, limit) =>
      before <= T0 ? [] : pageBefore(before, Math.min(limit, (before - T0) / HOUR)));
    await vi.waitFor(() => expect(chart.getData()).toHaveLength(60));
    expect(await chart.loadMoreHistory()).toBe(0);
    expect(chart.hasMoreHistory()).toBe(false);

    chart.setData(hourly(500, 50)); // a new series pages again
    expect(chart.hasMoreHistory()).toBe(true);
  });

  it('pages through the adapter of a connected stream', async () => {
    const adapter = fakeAdapter(true);
    await chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1h', historyLimit: 200, historyPageSize: 150 });
    expect(chart.getData()).toHaveLength(200);

    chart.scrollTo(T0 + 1000 * HOUR);
    await vi.waitFor(() => expect(adapter.fetchHistoryBefore).toHaveBeenCalledWith('BTCUSDT', '1h', T0 + 1000 * HOUR, 150));
    await vi.waitFor(() => expect(chart.getData()).toHaveLength(350));
  });

  it('does not page when the adapter cannot', async () => {
    await chart.connect({ adapter: fakeAdapter(false), symbol: 'BTCUSDT', timeframe: '1h', historyLimit: 200 });
    chart.scrollTo(T0 + 1000 * HOUR);
    expect(await chart.loadMoreHistory()).toBe(0);
    expect(chart.getData()).toHaveLength(200);
  });

  it('stops paging the stream after a disconnect', async () => {
    const adapter = fakeAdapter(true);
    await chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1h', historyLimit: 200 });
    chart.disconnectStream();
    expect(await chart.loadMoreHistory()).toBe(0);
    expect(adapter.fetchHistoryBefore).not.toHaveBeenCalled();
  });
});

describe('Chart history paging on a timeframe the feed lacks', () => {
  it('pages bars of the chart’s timeframe, built from the feed’s', async () => {
    const MIN = 60_000;
    const end = T0 + 10_000 * MIN;
    const minutes = (before: number, limit: number): OHLCBar[] => {
      const out: OHLCBar[] = [];
      for (let t = before - MIN; t >= T0 && out.length < limit; t -= MIN) {
        out.push({ time: t, open: 1, high: 1, low: 1, close: 1, volume: 1 });
      }
      return out.reverse();
    };
    const adapter = {
      ...fakeAdapter(false),
      supportedTimeframes: ['1m'] as TimeFrame[],
      fetchHistory: vi.fn(async (_s: string, _tf: TimeFrame, limit?: number) => minutes(end, limit ?? 500)),
      fetchHistoryBefore: vi.fn(async (_s: string, _tf: TimeFrame, before: number, limit: number) => minutes(before, limit)),
    };
    await chart.connect({ adapter, symbol: 'X', timeframe: '7m', historyLimit: 400, historyPageSize: 50 });
    expect(adapter.fetchHistory.mock.calls[0][1]).toBe('1m');
    expect(chart.getData()).toHaveLength(400);

    expect(await chart.loadMoreHistory()).toBe(50);
    const data = chart.getData();
    expect(data).toHaveLength(450);
    expect(data.every((b, i) => i === 0 || b.time - data[i - 1].time === 7 * MIN)).toBe(true);
    expect(adapter.fetchHistoryBefore.mock.calls.every((c) => c[1] === '1m')).toBe(true);
  });
});

describe('Chart history paging, edge cases', () => {
  it('does not page on its own for chart types that reshape the bars', () => {
    chart.setData(hourly(1000, 500));
    chart.setChartType('kagi');
    const loader = vi.fn(async (before: number, limit: number) => pageBefore(before, limit));
    chart.setHistoryLoader(loader);
    chart.scrollTo(T0 + 1000 * HOUR);
    chart.fitContent();
    expect(loader).not.toHaveBeenCalled();
  });

  it('stops a loader of its own when destroyed', async () => {
    chart.setData(hourly(10, 50)); // short: pages right away
    const loader = vi.fn(async (before: number, limit: number) => pageBefore(before, Math.min(limit, 5)));
    chart.setHistoryLoader(loader);
    chart.destroy();
    await new Promise((r) => setTimeout(r, 20));
    const calls = loader.mock.calls.length;
    await new Promise((r) => setTimeout(r, 20));
    expect(loader.mock.calls.length).toBe(calls);
    expect(calls).toBeLessThanOrEqual(1);
    chart = new Chart(host, { chartType: 'candlestick' }); // for afterEach
  });

  it('keeps a loader of the host over the stream’s', async () => {
    const own = vi.fn(async () => [] as OHLCBar[]);
    chart.setHistoryLoader(own);
    const adapter = fakeAdapter(true);
    await chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1h', historyLimit: 30 });
    await vi.waitFor(() => expect(own).toHaveBeenCalled());
    expect(adapter.fetchHistoryBefore).not.toHaveBeenCalled();
  });

  it('keeps paged history and the view when the stream reconnects', async () => {
    const adapter = fakeAdapter(true);
    await chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1h', historyLimit: 200, historyPageSize: 150 });
    chart.scrollTo(T0 + 1000 * HOUR);
    await vi.waitFor(() => expect(chart.getData()).toHaveLength(350));
    const shown = centreTime();
    // A reconnect re-sends the newest bars.
    (chart as unknown as { streamManager: { emit(type: string, bars: OHLCBar[]): void } })
      .streamManager.emit('snapshot', hourly(1000, 200));
    expect(chart.getData()).toHaveLength(350);
    expect(centreTime()).toBe(shown);
  });

  it('unpins a pinned tooltip when older bars arrive', () => {
    chart.setData(hourly(1000, 500));
    const pinned = (chart as unknown as { pinnedTooltip: { pin(bar: OHLCBar, i: number, theme: unknown): void; isPinned(): boolean } }).pinnedTooltip;
    pinned.pin(chart.getData()[250], 250, chart.getTheme());
    chart.prependBars(hourly(900, 100));
    expect(pinned.isPinned()).toBe(false);
  });

  it('refuses a timeframe the feed cannot build', async () => {
    const adapter = { ...fakeAdapter(false), supportedTimeframes: ['1m', '1h'] as TimeFrame[] };
    await expect(chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '30s' })).rejects.toThrow(/30s/);
  });
});
