// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DataAdapter, OHLCBar, ReplayStepsLoadPayload, TimeFrame } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const MIN = 60_000;
const HOUR = 3_600_000;
const FRAME = 16;
const END = Date.UTC(2026, 9, 26); // the newest bar ends here

/**
 * Minute m of each hour: up to 1019 by minute 19, down to 979 by 39, up to
 * 1019 again. The hour rises, but its minutes go up first, where the bar's
 * own path would dip first.
 */
function minutePrice(t: number): number {
  const m = (t % HOUR) / MIN;
  if (m < 20) return 1000 + m;
  if (m < 40) return 1019 - (m - 19) * 2;
  return 979 + (m - 39) * 2;
}

const minute = (t: number): OHLCBar => {
  const p = minutePrice(t);
  return { time: t, open: p, high: p + 0.5, low: p - 0.5, close: p, volume: 1 };
};

/** The hour that opens at `t`, built from its minutes. */
function hourBar(t: number): OHLCBar {
  const ms = Array.from({ length: 60 }, (_, i) => minute(t + i * MIN));
  return {
    time: t, open: ms[0].open, close: ms[59].close, volume: 60,
    high: Math.max(...ms.map((b) => b.high)), low: Math.min(...ms.map((b) => b.low)),
  };
}

/** `limit` bars of `tf` ending before `before`. */
function barsBefore(tf: TimeFrame, before: number, limit: number): OHLCBar[] {
  const ms = tf === '1h' ? HOUR : MIN;
  const last = Math.ceil(before / ms) * ms - ms;
  return Array.from({ length: limit }, (_, i) => {
    const t = last - (limit - 1 - i) * ms;
    return tf === '1h' ? hourBar(t) : minute(t);
  });
}

function venue(paging = true) {
  const feed = {
    name: 'venue',
    supportedTimeframes: ['1m', '1h'] as TimeFrame[],
    connect: () => {}, disconnect: () => {}, getConnectionState: () => 'connected',
    on: () => {}, off: () => {}, dispose: () => {},
    subscribe: () => {}, unsubscribe: () => {},
    fetchHistory: vi.fn(async (_s: string, tf: TimeFrame, limit = 500) => barsBefore(tf, END, limit)),
    // No hours older than the first page: the chart's own paging stays out of the way.
    ...(paging ? { fetchHistoryBefore: vi.fn(async (_s: string, tf: TimeFrame, before: number, limit: number) => (tf === '1h' ? [] : barsBefore(tf, before, Math.min(limit, 1000)))) } : {}),
  };
  return feed as unknown as DataAdapter & { fetchHistory: ReturnType<typeof vi.fn>; fetchHistoryBefore: ReturnType<typeof vi.fn> };
}

/** The requests for finer bars (the chart pages its own hours through the same call). */
const minuteAsks = (adapter: ReturnType<typeof venue>) => adapter.fetchHistoryBefore.mock.calls.filter((c) => c[1] !== '1h');

let host: HTMLDivElement;
let chart: Chart;
const last = () => chart.getData()[chart.getData().length - 1];
const play = (ms: number) => vi.advanceTimersByTimeAsync(Math.round(ms / FRAME) * FRAME);
const start = (extra: Record<string, unknown> = {}) =>
  chart.replayStart({ step: '1m', animate: true, startIndex: 100, paused: true, interval: 1000, speed: 1, ...extra });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function connected(adapter = venue()) {
  await chart.connect({ adapter, symbol: 'X', timeframe: '1h', historyLimit: 500 });
  return adapter;
}

describe('a replay fetches the finer bars of the bars it is about to play', () => {
  it('asks for the minutes after the start, backward from their end, once it plays', async () => {
    const adapter = await connected();
    const bars = chart.getData();
    start();
    await play(100);
    expect(minuteAsks(adapter)).toEqual([]); // paused: nothing is seen
    chart.replayResume();
    await play(100);
    // A page is 16 hours of minutes (960): bars 101..116, before bar 117 opens.
    expect(adapter.fetchHistoryBefore).toHaveBeenCalledWith('X', '1m', bars[117].time, 960);
    expect(adapter.fetchHistory.mock.calls.some((c) => c[1] === '1m')).toBe(false);
    expect(minuteAsks(adapter)).toHaveLength(1);
  });

  it('forms the next bars along their minutes, the bar already forming keeping its own path', async () => {
    await connected();
    const loads: string[] = [];
    chart.on('replayStepsLoad', (e) => loads.push((e.payload as ReplayStepsLoadPayload).state));
    start();
    chart.replayResume();
    await play(208);
    expect(loads).toEqual(['loading', 'loaded']);
    expect(last().low).toBeLessThan(last().open); // bar 101 started before its minutes came: it dips first
    await play(800 + 250); // a quarter into bar 102
    expect(chart.getReplayBarIndex()).toBe(102);
    expect(last().close).toBeGreaterThan(last().open + 5); // up first, with its minutes
    expect(last().low).toBeGreaterThan(last().open - 1);
  });

  it('ends each bar as the series has it', async () => {
    await connected();
    const bars = chart.getData();
    start();
    chart.replayResume();
    await play(3008);
    expect(chart.getData()[102]).toEqual(bars[102]);
  });

  it('keeps the indices and the total when a page lands', async () => {
    await connected();
    start();
    chart.replayResume();
    await play(500);
    expect(chart.getReplayProgress().total).toBe(500);
    expect(chart.getReplayBarIndex()).toBe(101);
  });

  it('drops a page that lands after the replay stopped', async () => {
    const adapter = venue();
    let release: () => void = () => {};
    adapter.fetchHistoryBefore.mockImplementationOnce((_s: string, tf: TimeFrame, before: number, limit: number) =>
      new Promise((r) => { release = () => r(barsBefore(tf, before, limit)); }));
    await connected(adapter);
    start();
    chart.replayResume();
    await play(100);
    expect(minuteAsks(adapter)).toHaveLength(1);
    chart.replayStop();
    release();
    await play(100);
    expect(chart.isReplayActive()).toBe(false);
    expect(chart.getData()).toHaveLength(500);
  });

  it('fetches nothing while bars come quicker than three frames', async () => {
    const adapter = await connected();
    start({ speed: 25 });
    chart.replayResume();
    await play(500);
    expect(minuteAsks(adapter)).toEqual([]);
  });

  it('forms bars from their own prices, and says so, when the feed cannot page back', async () => {
    await connected(venue(false));
    const loads: ReplayStepsLoadPayload[] = [];
    chart.on('replayStepsLoad', (e) => loads.push(e.payload as ReplayStepsLoadPayload));
    start();
    chart.replayResume();
    await play(500);
    expect(loads.at(-1)?.state).toBe('end');
    expect(chart.getReplayBarIndex()).toBe(101);
  });

  it('picks the finest step the feed serves with at most 60 to a bar for step auto', async () => {
    const adapter = await connected();
    start({ step: 'auto' });
    chart.replayResume();
    await play(100);
    expect(minuteAsks(adapter)[0]?.[1]).toBe('1m');
  });
});
