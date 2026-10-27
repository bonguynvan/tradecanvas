// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar, SymbolInfo } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const MIN = 60_000;
const HALF_HOUR = 30 * MIN;
const QUARTER = 15 * MIN;
// Monday 5 January 2026, 00:00 in New York (UTC-5).
const NY_MIDNIGHT = Date.UTC(2026, 0, 5, 5);
const stock: SymbolInfo = { symbol: 'AAA', timezone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] };

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

describe('finer steps from hidden hours', () => {
  it('never put after-hours prices into the last regular bar', () => {
    // Half-hour bars around the clock for two days; regular hours trade at 100, after hours at 500.
    const inHours = (t: number) => {
      const m = ((t - NY_MIDNIGHT) / MIN) % (24 * 60);
      return m >= 9 * 60 + 30 && m < 16 * 60;
    };
    const bar = (time: number, span: number): OHLCBar => {
      const p = inHours(time) ? 100 : 500;
      return { time, open: p, high: p + 1, low: p - 1, close: p, volume: span / QUARTER };
    };
    const halves = Array.from({ length: 96 }, (_, i) => bar(NY_MIDNIGHT + i * HALF_HOUR, HALF_HOUR));
    const quarters = Array.from({ length: 192 }, (_, i) => bar(NY_MIDNIGHT + i * QUARTER, QUARTER));
    chart.setSymbolInfo(stock);
    chart.setData(halves);
    chart.setExtendedHours(false);
    const regular = chart.getData();
    expect(regular).toHaveLength(26);
    // Replay day one's last regular bar (15:30) and on into day two.
    chart.replayStart({ steps: quarters, startIndex: 10, paused: true });
    const highs: number[] = [];
    for (let i = 0; i < 40; i++) {
      chart.replaySeek(chart.getReplayProgress().current + 1);
      const shown = chart.getData();
      highs.push(Math.max(...shown.map((b) => b.high)));
    }
    // Every bar shown is a regular-hours bar: none ever reaches 501.
    expect(Math.max(...highs)).toBe(101);
  });
});

describe('finer steps that disagree with the bar they form', () => {
  it('ends the bar as the series has it, so it does not jump when the next bar opens', () => {
    const HOUR = 60 * MIN;
    const T0 = Date.UTC(2026, 0, 1);
    // The hourly bars say volume 100 and a settlement close of 105; the 15-minute bars
    // (a venue's minutes leave out block trades) add up to 80 and end at 104.
    const hours: OHLCBar[] = Array.from({ length: 20 }, (_, h) => ({
      time: T0 + h * HOUR, open: 100, high: 106, low: 99, close: 105, volume: 100,
    }));
    const steps: OHLCBar[] = hours.flatMap((b) => [0, 1, 2, 3].map((q) => ({
      time: b.time + q * QUARTER, open: 100 + q, high: 101 + q + (q === 3 ? 1 : 0), low: q === 0 ? 99 : 99 + q, close: 101 + q, volume: 20,
    })));
    chart.setData(hours);
    chart.replayStart({ steps, startIndex: 5, paused: true });
    // To the last step of bar 6: the bar has formed in full.
    chart.replaySeekToBar(6);
    const formed = chart.getData()[6];
    // One more step: bar 7 opens, and bar 6 is replaced by the series' bar.
    chart.replaySeek(chart.getReplayProgress().current + 1);
    const closed = chart.getData()[6];
    expect(closed).toEqual(hours[6]);
    expect(formed).toEqual(closed); // today: volume 80 then 100, close 104 then 105
  });
});
