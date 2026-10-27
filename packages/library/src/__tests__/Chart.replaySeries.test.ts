// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DataAdapter, HistoryLoadPayload, OHLCBar, ReplayStepPayload, TimeFrame } from '@tradecanvas/commons';
import { PaperExecutionAdapter } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const END = Date.UTC(2026, 9, 26);
const TF_MS: Record<string, number> = { '1h': HOUR, '1d': DAY };
const COUNT: Record<string, number> = { '1h': 5000, '1d': 401 };

/** `n` bars of `tfMs` ending at `end`, a price that depends only on the time. */
function series(tfMs: number, n: number, end = END, base = 100): OHLCBar[] {
  return Array.from({ length: n }, (_, i) => {
    const time = end - (n - 1 - i) * tfMs;
    const p = base + Math.sin(time / DAY) * 5;
    return { time, open: p, high: p + 1, low: p - 1, close: p + 0.5, volume: 10 };
  });
}

/** A venue that answers each history request after `delay[tf]` ms. */
function slowAdapter(delay: Record<string, number>): DataAdapter {
  return {
    name: 'slow',
    connect: () => {},
    disconnect: () => {},
    getConnectionState: () => 'connected',
    fetchHistory: (_s: string, tf: TimeFrame) =>
      new Promise((r) => setTimeout(() => r(series(TF_MS[tf], COUNT[tf])), delay[tf] ?? 700)),
    on: () => {},
    off: () => {},
    dispose: () => {},
  };
}

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  vi.useFakeTimers();
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

const spacing = (bars: readonly OHLCBar[]) => (bars.length > 1 ? bars[bars.length - 1].time - bars[bars.length - 2].time : 0);
const lastShown = () => chart.getData()[chart.getData().length - 1];
function stepsOf(c: Chart): ReplayStepPayload[] {
  const out: ReplayStepPayload[] = [];
  c.on('replayStep', (e) => out.push(e.payload as ReplayStepPayload));
  return out;
}
function statesOf(c: Chart): string[] {
  const out: string[] = [];
  c.on('replayState', (e) => out.push((e.payload as { state: string }).state));
  return out;
}

describe('a replay over a series that changes', () => {
  it('started while the next timeframe loads, moves onto its bars at the same time', async () => {
    const adapter = slowAdapter({ '1d': 700, '1h': 1400 });
    const first = chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1d' });
    await vi.advanceTimersByTimeAsync(700);
    await first;
    const daily = chart.getData().slice();
    const steps = stepsOf(chart);

    const second = chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1h' });
    await vi.advanceTimersByTimeAsync(65);
    chart.replayStart({ startIndex: 354, paused: true });
    const until = steps.at(-1)!.until;
    expect(until).toBe(daily[355].time);

    await vi.advanceTimersByTimeAsync(2000);
    await second;
    expect(chart.isReplayActive()).toBe(true);
    expect(chart.getReplayProgress().total).toBe(5000);
    expect(spacing(chart.getData())).toBe(HOUR);
    expect(lastShown().time).toBe(until - HOUR);
    expect(steps.at(-1)).toMatchObject({ total: 5000, until, cause: 'series' });
    expect(chart.getReplayProgress()).toMatchObject({ until, time: until - HOUR });
  });

  it('holds a playing replay while the next timeframe loads, then plays on from that time', async () => {
    const adapter = slowAdapter({ '1d': 700, '1h': 1400 });
    const first = chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1d' });
    await vi.advanceTimersByTimeAsync(700);
    await first;
    const steps = stepsOf(chart);
    const states = statesOf(chart);
    chart.replayStart({ startIndex: 300, interval: 200, speed: 1, paused: true });
    chart.replayResume();
    await vi.advanceTimersByTimeAsync(400);
    const atClick = steps.at(-1)!.until;
    const count = steps.length;

    const second = chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1h' });
    await vi.advanceTimersByTimeAsync(1399);
    expect(steps).toHaveLength(count); // held: no step on the old bars
    expect(chart.getReplayState()).toBe('playing');
    await vi.advanceTimersByTimeAsync(1);
    await second;
    expect(lastShown().time + HOUR).toBe(atClick);
    expect(chart.getReplayState()).toBe('playing');
    await vi.advanceTimersByTimeAsync(200);
    expect(lastShown().time).toBe(atClick);
    expect(states).toEqual(['paused', 'playing']);
  });

  it('carries over a setData at the same time, and says nothing on replayState for it', () => {
    chart.setData(series(DAY, 401));
    const steps = stepsOf(chart);
    chart.replayStart({ startIndex: 300, paused: true });
    const until = steps.at(-1)!.until;
    const states = statesOf(chart);
    chart.setData(series(HOUR, 5000));
    expect(chart.isReplayActive()).toBe(true);
    expect(chart.getReplayState()).toBe('paused');
    expect(lastShown().time + HOUR).toBe(until);
    expect(chart.getReplayProgress().total).toBe(5000);
    expect(states).toEqual([]);
    chart.replayStop();
    expect(chart.getData()).toHaveLength(5000);
  });

  it('keeps a playing replay playing across a setData', async () => {
    chart.setData(series(DAY, 401));
    chart.replayStart({ startIndex: 300, interval: 100, speed: 1 });
    await vi.advanceTimersByTimeAsync(150);
    const states = statesOf(chart);
    chart.setData(series(HOUR, 5000));
    expect(chart.getReplayState()).toBe('playing');
    const at = lastShown().time;
    await vi.advanceTimersByTimeAsync(100);
    expect(lastShown().time).toBe(at + HOUR);
    expect(states).toEqual([]);
  });

  it('keeps the remaining time of a duration across a new series', () => {
    chart.setData(series(DAY, 401));
    const clock = (chart as unknown as { replayManager: { remainingMs(): number | null } }).replayManager;
    chart.replayStart({ startIndex: 300, duration: 4000, paused: true });
    chart.replaySeek(350); // half way: 2 s left
    expect(clock.remainingMs()).toBeCloseTo(2000, 0);
    chart.setData(series(HOUR, 5000));
    expect(clock.remainingMs()).toBeCloseTo(2000, 0);
  });

  it('going to a coarser series never shows a bar that closes after the position', () => {
    const hourly = series(HOUR, 5000);
    chart.setData(hourly);
    const steps = stepsOf(chart);
    // 15:00 of a day well inside both series.
    const day = END - 100 * DAY;
    chart.replayStart({ startTime: day + 14 * HOUR, paused: true });
    expect(steps.at(-1)!.until).toBe(day + 15 * HOUR);
    chart.setData(series(DAY, 401));
    expect(lastShown().time).toBe(day - DAY); // the day before, closed
    expect(steps.at(-1)!.until).toBe(day);
  });

  it('a seek by time on a coarser chart never shows a bar whole that closes after it', () => {
    const daily = series(DAY, 401);
    chart.setData(daily);
    chart.replayStart({ startIndex: 300, paused: true });
    chart.replaySeekToTime(daily[350].time + 15 * HOUR);
    expect(lastShown().time).toBe(daily[349].time);
  });

  it('pages back by time when the position is older than the new series', async () => {
    chart.setData(series(DAY, 401));
    const steps = stepsOf(chart);
    chart.replayStart({ startIndex: 60, paused: true });
    const until = steps.at(-1)!.until;
    const hourly = series(HOUR, 5000);
    chart.setHistoryLoader((before, limit) => Promise.resolve(series(HOUR, limit, before - HOUR)), { pageSize: 2000 });
    chart.setData(hourly);
    await vi.advanceTimersByTimeAsync(10);
    expect(lastShown().time + HOUR).toBe(until);
    expect(spacing(chart.getData())).toBe(HOUR);
  });

  it('pages back through the stream’s own history after a switch to a finer timeframe', async () => {
    const adapter: DataAdapter = {
      ...slowAdapter({ '1d': 10, '1h': 10 }),
      fetchHistory: async (_s: string, tf: TimeFrame) => (tf === '1d' ? series(DAY, 401) : series(HOUR, 500)),
      fetchHistoryBefore: async (_s: string, _tf: TimeFrame, before: number, limit?: number) => series(HOUR, limit ?? 500, before - HOUR),
    };
    await chart.connect({ adapter, symbol: 'X', timeframe: '1d' });
    await vi.advanceTimersByTimeAsync(10);
    const steps = stepsOf(chart);
    chart.replayStart({ startIndex: 300, paused: true });
    const until = steps.at(-1)!.until;
    await chart.switchStream('X', '1h');
    await vi.advanceTimersByTimeAsync(50);
    expect(spacing(chart.getData())).toBe(HOUR);
    expect(lastShown().time + HOUR).toBe(until);
  });

  it('takes older bars into the replay: the count, the same time, and all of them after', () => {
    const hourly = series(HOUR, 300);
    chart.setData(hourly);
    const steps = stepsOf(chart);
    chart.replayStart({ startIndex: 200, paused: true });
    const until = steps.at(-1)!.until;
    expect(chart.prependBars(series(HOUR, 100, hourly[0].time - HOUR))).toBe(100);
    expect(chart.getReplayProgress().total).toBe(400);
    expect(lastShown().time + HOUR).toBe(until);
    chart.replayStop();
    expect(chart.getData()).toHaveLength(400);
  });

  it('pages history in during a replay', async () => {
    chart.setData(series(HOUR, 60));
    chart.replayStart({ startIndex: 40, paused: true });
    const loader = vi.fn((before: number, limit: number) => Promise.resolve(series(HOUR, limit, before - HOUR)));
    chart.setHistoryLoader(loader, { pageSize: 100 });
    await vi.advanceTimersByTimeAsync(10);
    expect(loader).toHaveBeenCalled();
    expect(loader.mock.calls[0][0]).toBe(series(HOUR, 60)[0].time);
    expect(chart.getReplayProgress().total).toBeGreaterThan(60);
  });

  it('a page on its way when a replay starts does not leave historyLoad at loading', async () => {
    chart.setData(series(HOUR, 60));
    const events: string[] = [];
    chart.on('historyLoad', (e) => events.push((e.payload as HistoryLoadPayload).state));
    chart.setHistoryLoader((before, limit) => new Promise((r) => setTimeout(() => r(series(HOUR, limit, before - HOUR)), 700)));
    await vi.advanceTimersByTimeAsync(20);
    chart.replayStart({ startIndex: 40, paused: true });
    chart.setHistoryLoader(null);
    await vi.advanceTimersByTimeAsync(3000);
    expect(events.at(-1)).not.toBe('loading');
  });

  it('a reconnect snapshot during a replay keeps the older bars paged in before it', async () => {
    const adapter: DataAdapter = {
      name: 'paged',
      connect: () => {},
      disconnect: () => {},
      getConnectionState: () => 'connected',
      fetchHistory: () => Promise.resolve(series(HOUR, 500)),
      fetchHistoryBefore: (_s: string, _tf: TimeFrame, before: number, limit: number) => Promise.resolve(series(HOUR, limit, before - HOUR)),
      on: () => {},
      off: () => {},
      dispose: () => {},
    };
    await chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1h' });
    await vi.advanceTimersByTimeAsync(10);
    await chart.loadMoreHistory();
    const paged = chart.getData().length;
    expect(paged).toBeGreaterThan(500);
    chart.replayStart({ startIndex: paged - 100, paused: true });
    (chart as unknown as { streamManager: { emit(e: string, p: unknown): void } }).streamManager.emit('snapshot', series(HOUR, 500));
    expect(chart.isReplayActive()).toBe(true);
    chart.replayStop();
    expect(chart.getData()).toHaveLength(paged);
  });

  it('shows a correction before the position in the replayed bars', () => {
    const hourly = series(HOUR, 300);
    chart.setData(hourly);
    chart.replayStart({ startIndex: 200, paused: true });
    expect(chart.updateBar({ ...hourly[150], close: 999, high: 999 })).toBe(true);
    expect(chart.getData()[150].close).toBe(999);
    chart.updateBar({ ...hourly[250], close: 888, high: 888 });
    expect(chart.getData()).toHaveLength(201);
    chart.replayStop();
    expect(chart.getData()[250].close).toBe(888);
  });

  it('a new series does not reuse finer steps that are not its own', () => {
    const btc15 = series(15 * MIN, 2400, END + 45 * MIN, 100);
    chart.setData(series(HOUR, 600, END, 100));
    chart.replayStart({ startIndex: 500, paused: true, steps: btc15 });
    chart.setData(series(HOUR, 600, END, 3000));
    expect(lastShown().close).toBeGreaterThan(2900);
  });

  it('ends the replay when a paper account trades it and the symbol changes', async () => {
    const adapter = slowAdapter({ '1h': 10 });
    const first = chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1h' });
    await vi.advanceTimersByTimeAsync(10);
    await first;
    chart.connectExecution(new PaperExecutionAdapter({ markPrice: 100 }));
    chart.replayStart({ startIndex: 4000, paused: true });
    const states = statesOf(chart);
    const second = chart.connect({ adapter, symbol: 'ETHUSDT', timeframe: '1h' });
    expect(chart.isReplayActive()).toBe(false);
    expect(states).toEqual(['stopped']);
    await vi.advanceTimersByTimeAsync(10);
    await second;
  });

  it('a stop while the next series loads brings back the live series', async () => {
    const adapter = slowAdapter({ '1d': 10, '1h': 1400 });
    const first = chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1d' });
    await vi.advanceTimersByTimeAsync(10);
    await first;
    chart.replayStart({ startIndex: 300, paused: true });
    const second = chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1h' });
    chart.replayStop();
    expect(chart.getData()).toHaveLength(401);
    await vi.advanceTimersByTimeAsync(1400);
    await second;
    expect(chart.getData()).toHaveLength(5000);
  });
});
