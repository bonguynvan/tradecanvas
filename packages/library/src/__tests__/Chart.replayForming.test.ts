// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { PaperExecutionAdapter } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 0, 1);
const FRAME = 16;

/** Rising hourly bars: open 100+h, low 98+h, high 103+h, close 101+h. Bar 101: 201 -> 199 -> 204 -> 202. */
const hours: OHLCBar[] = Array.from({ length: 200 }, (_, h) => ({
  time: T0 + h * HOUR, open: 100 + h, high: 103 + h, low: 98 + h, close: 101 + h, volume: 90,
}));

let host: HTMLDivElement;
let chart: Chart;
const last = () => chart.getData()[chart.getData().length - 1];
const priceLine = () => (chart as unknown as { currentPriceLine: { getPrice(): number | null } }).currentPriceLine.getPrice();
/** Play `ms` of frames. */
const play = (ms: number) => vi.advanceTimersByTime(Math.round(ms / FRAME) * FRAME);
const start = (extra: Record<string, unknown> = {}) =>
  chart.replayStart({ startIndex: 100, paused: true, interval: 1000, speed: 1, animate: true, ...extra }); 

beforeEach(() => {
  // The frame clock reads performance.now(): fake it with the timers.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
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

describe('a bar forming in a replay', () => {
  it('shows the next bar at its open as soon as Play is pressed', () => {
    start();
    chart.replayResume();
    expect(chart.getData()).toHaveLength(102);
    expect(last()).toEqual({ time: hours[101].time, open: 201, high: 201, low: 201, close: 201, volume: 0 });
  });

  it('grows it along open, low, high, close over the step, then shows it whole', () => {
    start();
    chart.replayResume();
    play(496); // about halfway: down to the low, and back up past the open
    expect(last()).toMatchObject({ time: hours[101].time, open: 201, low: 199 });
    expect(last().close).toBeGreaterThan(201);
    expect(last().high).toBe(last().close);
    play(512);
    expect(chart.getData()[101]).toEqual(hours[101]);
    expect(last().time).toBe(hours[102].time);
  });

  it('forms every bar after the first, not only the first one', () => {
    start();
    chart.replayResume();
    play(1008 + 496); // bar 101 whole, bar 102 about halfway
    expect(chart.getData()[101]).toEqual(hours[101]);
    expect(last()).toMatchObject({ time: hours[102].time, open: 202, low: 200 });
    expect(last().close).toBeLessThan(hours[102].close);
    expect(last().high).toBeLessThan(hours[102].high);
    play(512 + 496);
    expect(last()).toMatchObject({ time: hours[103].time, open: 203 });
    expect(last().high).toBeLessThan(hours[103].high);
  });

  it('closes the bar that was forming when a seek jumps past it', () => {
    start();
    chart.replayResume();
    play(496);
    const forming = chart.getReplayBarIndex();
    chart.replayPause();
    chart.replaySeek(forming + 3);
    expect(chart.getData()[forming]).toEqual(hours[forming]);
  });

  it('holds where it is on a pause, and goes on from there on Play', () => {
    start();
    chart.replayResume();
    play(496);
    chart.replayPause();
    const held = last();
    play(3000);
    expect(last()).toEqual(held);
    chart.replayResume();
    play(FRAME);
    expect(last().close).toBeGreaterThan(held.close);
    expect(last().close - held.close).toBeLessThan(0.2);
  });

  it('shows whole bars after a seek or a step, none forming', () => {
    start();
    chart.replayResume();
    play(496);
    chart.replayPause();
    chart.replaySeek(chart.getReplayProgress().current + 1);
    expect(chart.getData()).toHaveLength(102);
    expect(last()).toEqual(hours[101]);
    chart.replaySeek(90);
    expect(chart.getData()).toHaveLength(91);
    expect(last()).toEqual(hours[90]);
  });

  it('moves the price line and the indicators with it', () => {
    const sma = chart.addIndicator('sma', { period: 2 })!;
    start();
    chart.replayResume();
    play(496);
    const close = last().close;
    expect(priceLine()).toBe(close);
    const value = (chart.getIndicatorOutput(sma)?.series.at(-1) as { value?: number } | undefined)?.value;
    expect(value).toBeCloseTo((hours[100].close + close) / 2);
  });

  it('is the bar the replay is on, and tells its step once it is whole', () => {
    const steps: number[] = [];
    start();
    chart.on('replayStep', (e) => steps.push((e.payload as { barIndex: number }).barIndex));
    chart.replayResume();
    play(496);
    expect(chart.getReplayBarIndex()).toBe(101);
    expect(steps).toEqual([]);
    play(512);
    expect(steps).toEqual([101]);
  });

  it('comes whole, as before, without animate', () => {
    start({ animate: false });
    chart.replayResume();
    play(496);
    expect(chart.getData()).toHaveLength(101);
  });

  it('steps from one price of its path to the next when the system asks for less motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} }));
    start();
    chart.replayResume();
    play(96);
    expect(last()).toMatchObject({ open: 201, close: 201 }); // not yet at the low: still at the open
    play(400);
    expect(last()).toMatchObject({ low: 199, close: 199, high: 201 }); // at the low, not on the way up
    play(400);
    expect(last()).toMatchObject({ high: 204, close: 204 });
  });

  it('leaves the bar alone when a step is shorter than three frames', () => {
    start({ speed: 25 });
    chart.replayResume();
    play(96);
    const shown = chart.getData();
    expect(shown.at(-1)).toEqual(hours[shown.length - 1]);
  });
});

describe('what a forming bar leaves alone', () => {
  it('sets off no price alert: alerts watch the live market', () => {
    const fired: string[] = [];
    chart.on('alertTriggered', (e) => fired.push(e.payload.message ?? ''));
    chart.addAlert(199.5, 'crossingDown', 'down');
    start();
    chart.replayResume();
    play(1008);
    expect(fired).toEqual([]);
  });

  it('fills a paper order as the drawn price reaches it, at the bar’s time, once', async () => {
    const paper = new PaperExecutionAdapter({ markPrice: 500 });
    chart.connectExecution(paper);
    const fills: { time: number; price: number }[] = [];
    chart.on('executionFill', (e) => fills.push(e.payload as { time: number; price: number }));
    start();
    await paper.placeOrder({ side: 'buy', type: 'limit', price: 199.5, quantity: 1 });
    chart.replayResume();
    play(96); // 201 -> 200.1: not yet
    expect(fills).toEqual([]);
    play(112); // past 199.5 on the way to the low
    expect(fills).toHaveLength(1);
    expect(fills[0]).toMatchObject({ price: 199.5, time: hours[101].time });
    play(1000);
    expect(fills).toHaveLength(1);
  });

  it('feeds a paper account each price once, in the order drawn, through a seek back', () => {
    const paper = new PaperExecutionAdapter({ markPrice: 500 });
    chart.connectExecution(paper);
    start();
    const spy = vi.spyOn(paper, 'setMarkPrice');
    chart.replayResume();
    play(1008); // bar 101 whole: the low before the high
    const prices = spy.mock.calls.map((c) => c[0]);
    expect(prices.indexOf(199)).toBeLessThan(prices.indexOf(204));
    expect(prices.filter((p) => p === 199)).toHaveLength(1);
    chart.replayPause();
    chart.replaySeek(100);
    spy.mockClear();
    chart.replayResume();
    play(1008); // bar 101 again: given before, nothing new
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('a replay over finer bars the host gives', () => {
  const STEP = 15 * 60_000;
  const quarters: OHLCBar[] = hours.slice(0, 10).flatMap((h) =>
    [0, 1, 2, 3].map((q) => ({ time: h.time + q * STEP, open: h.open, high: h.high, low: h.low, close: h.close, volume: 1 })));

  it('plays a bar a second at speed 1 with animate, the finer bars only shaping it', () => {
    chart.setData(hours.slice(0, 10));
    chart.replayStart({ steps: quarters, startIndex: 2, paused: true, interval: 1000, speed: 1, animate: true });
    chart.replayResume();
    play(1008); // bar 3 whole, bar 4 forming
    expect(chart.getReplayBarIndex()).toBe(4);
    expect(chart.getReplayProgress().current).toBe(3);
    play(1008);
    expect(chart.getReplayBarIndex()).toBe(5);
    expect(chart.getReplayProgress().total).toBe(10);
  });

  it('forms a bar along its finer bars', () => {
    // Bar 3 rose, but its quarters went up first: the bar's own path would dip first.
    const bar = { time: hours[3].time, open: 100, high: 110, low: 95, close: 105, volume: 4 };
    const data = [...hours.slice(0, 3), bar, ...hours.slice(4, 10)];
    const q = (i: number, open: number, high: number, low: number, close: number) =>
      ({ time: bar.time + i * STEP, open, high, low, close, volume: 1 });
    const steps = [...quarters.filter((s) => s.time < bar.time || s.time >= bar.time + 4 * STEP),
      q(0, 100, 110, 100, 110), q(1, 110, 110, 95, 95), q(2, 95, 100, 95, 100), q(3, 100, 105, 100, 105)];
    chart.setData(data);
    chart.replayStart({ steps, startIndex: 2, paused: true, interval: 1000, speed: 1, animate: true });
    chart.replayResume();
    play(208);
    expect(last().time).toBe(bar.time);
    expect(last().close).toBeGreaterThan(100);
    expect(last().low).toBe(100);
  });
});
