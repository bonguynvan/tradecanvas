// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { PaperExecutionAdapter } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const STEP = 15 * 60_000;
const T0 = Date.UTC(2026, 0, 1);

/** Four 15-minute steps per hour: prices 100 + h*10 + q (q = 0..3). */
const steps: OHLCBar[] = Array.from({ length: 40 }, (_, i) => {
  const p = 100 + Math.floor(i / 4) * 10 + (i % 4);
  return { time: T0 + i * STEP, open: p, high: p + 0.5, low: p - 0.5, close: p, volume: 1 };
});
/** The hourly bars those steps make. */
const hours: OHLCBar[] = Array.from({ length: 10 }, (_, h) => {
  const q = steps.slice(h * 4, h * 4 + 4);
  return {
    time: T0 + h * HOUR,
    open: q[0].open,
    high: Math.max(...q.map((b) => b.high)),
    low: Math.min(...q.map((b) => b.low)),
    close: q[3].close,
    volume: 4,
  };
});

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(hours);
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const last = () => chart.getData()[chart.getData().length - 1];

describe('replay in finer steps', () => {
  it('starts with the start bar whole, then grows the next one step by step', () => {
    chart.replayStart({ steps, startIndex: 2, paused: true, interval: 100 });
    expect(chart.getData()).toHaveLength(3);
    expect(last()).toEqual(hours[2]);
    expect(chart.getReplayBarIndex()).toBe(2);

    chart.replaySeek(chart.getReplayProgress().current + 1); // the first 15 minutes of hour 3
    expect(chart.getData()).toHaveLength(4);
    expect(last()).toMatchObject({ time: hours[3].time, open: 130, close: 130 });
    chart.replaySeek(chart.getReplayProgress().current + 2);
    expect(last()).toMatchObject({ time: hours[3].time, open: 130, high: 132.5, close: 132 });
  });

  it('closes a bar as it is in the series when the next one starts', () => {
    chart.replayStart({ steps, startIndex: 2, paused: true, interval: 1000, speed: 1 });
    chart.replayResume();
    vi.advanceTimersByTime(5_000); // five steps, one a second: hour 3 whole, then one step into hour 4
    expect(chart.getData()[3]).toEqual(hours[3]);
    expect(last()).toMatchObject({ time: hours[4].time, close: 140 });
  });

  it('jumps to the end of a bar clicked on', () => {
    chart.replayStart({ steps, startIndex: 1, paused: true });
    chart.replaySeekToBar(6);
    expect(chart.getData()).toHaveLength(7);
    expect(last()).toMatchObject({ time: hours[6].time, close: hours[6].close });
    chart.replayStop();
    expect(chart.getData()).toHaveLength(10);
  });
});

describe('paper trading in a replay', () => {
  it('fills on the replayed price and stamps fills with the replayed time', async () => {
    const paper = new PaperExecutionAdapter({ markPrice: 500 });
    chart.connectExecution(paper);
    const fills: number[] = [];
    chart.on('executionFill', (e) => fills.push((e.payload as { time: number }).time));
    chart.replayStart({ steps, startIndex: 2, paused: true });
    await paper.placeOrder({ side: 'buy', type: 'limit', price: 131, quantity: 1 });
    // The live price elsewhere doesn't fill it during the replay.
    chart.setCurrentPrice(10);
    expect(fills).toEqual([]);
    chart.replaySeek(chart.getReplayProgress().current + 1); // 130 at hour 3
    expect(fills).toEqual([steps[12].time]);
  });
});

describe('replay steps that cover part of the series', () => {
  it('starts on the bar asked for when the finer bars cover only the end', () => {
    const tail = steps.slice(24); // hours 6 to 9
    chart.replayStart({ steps: tail, startIndex: 2, paused: true });
    expect(chart.getData()).toHaveLength(3);
    expect(last()).toEqual(hours[2]);
    expect(chart.getReplayBarIndex()).toBe(2);
    // Six whole hours, then the sixteen steps.
    expect(chart.getReplayProgress().total).toBe(22);
    chart.replaySeek(chart.getReplayProgress().current + 4); // hour 6, from its first step
    expect(chart.getData()).toHaveLength(7);
    expect(last()).toMatchObject({ time: hours[6].time, open: 160, close: 160 });
  });

  it('leaves out finer bars past the end of the last bar, and broken ones', () => {
    const extra: OHLCBar[] = [
      ...steps,
      { time: T0 + 10 * HOUR, open: 1, high: 1, low: 1, close: 1, volume: 1 },
      { time: T0 + 10 * HOUR + STEP, open: Number.NaN, high: 1, low: 1, close: 1, volume: 1 },
    ];
    chart.replayStart({ steps: extra, startIndex: 9, paused: true });
    expect(chart.getReplayProgress().total).toBe(40);
    expect(last()).toEqual(hours[9]);
  });
});

describe('paper trading through a replay', () => {
  let paper: PaperExecutionAdapter;
  let fills: { time: number; price: number }[];

  beforeEach(() => {
    paper = new PaperExecutionAdapter({ markPrice: 500 });
    chart.connectExecution(paper);
    fills = [];
    chart.on('executionFill', (e) => fills.push(e.payload as { time: number; price: number }));
  });

  it('passes every price on the way when the replay jumps ahead', async () => {
    chart.replayStart({ steps, startIndex: 2, paused: true });
    // Only the low of the first 15 minutes of hour 3 (129.5) reaches it.
    await paper.placeOrder({ side: 'buy', type: 'limit', price: 129.6, quantity: 1 });
    chart.replaySeek(chart.getReplayProgress().current + 4);
    expect(fills.map((f) => f.time)).toEqual([steps[12].time]);
  });

  it('gives it nothing on a seek back', async () => {
    chart.replayStart({ steps, startIndex: 2, paused: true });
    await paper.placeOrder({ side: 'buy', type: 'limit', price: 104, quantity: 1 });
    chart.replaySeek(3); // 103, earlier
    expect(fills).toEqual([]);
    chart.replaySeek(4); // on from there: 110
    expect(fills).toEqual([]);
  });

  it('goes back to the live price and the clock when the replay ends', async () => {
    chart.replayStart({ steps, startIndex: 2, paused: true });
    await paper.placeOrder({ side: 'buy', type: 'market', quantity: 1 });
    expect(fills[0]).toMatchObject({ time: steps[11].time, price: 123 });
    chart.replayStop();
    await paper.placeOrder({ side: 'buy', type: 'market', quantity: 1 });
    expect(fills[1]).toMatchObject({ time: Date.now(), price: hours[9].close });
  });
});

describe('alerts during a replay', () => {
  it('keep watching the live price, and indicator lines wait for the replay to end', () => {
    const sma = chart.addIndicator('sma', { period: 2 })!;
    const fired: string[] = [];
    chart.on('alertTriggered', (e) => fired.push(e.payload.message ?? ''));
    chart.addAlert(150, 'crossingUp', 'live up');
    chart.addAlert(1, 'greaterThan', 'sma', `${sma}:value`, 'SMA');
    chart.replayStart({ startIndex: 2, paused: true });
    chart.setCurrentPrice(140);
    chart.setCurrentPrice(160);
    expect(fired).toEqual(['live up']);
    chart.replayStop();
    chart.setCurrentPrice(161);
    chart.setCurrentPrice(162);
    expect(fired).toEqual(['live up', 'sma']);
  });
});

