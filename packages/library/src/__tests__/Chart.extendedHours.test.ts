// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar, SymbolInfo } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HALF_HOUR = 30 * 60_000;
// Monday 5 January 2026, 00:00 in New York (UTC−5).
const NY_MIDNIGHT = Date.UTC(2026, 0, 5, 5);
/** Half-hour bars around the clock for two days. */
const bars: OHLCBar[] = Array.from({ length: 96 }, (_, i) => ({
  time: NY_MIDNIGHT + i * HALF_HOUR, open: 100, high: 101, low: 99, close: 100 + i / 100, volume: 1,
}));
const stock: SymbolInfo = { symbol: 'AAA', timezone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] };
/** Regular hours: 09:30 to 16:00, 13 half hours a day. */
const REGULAR_PER_DAY = 13;

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, {});
  chart.setSymbolInfo(stock);
  chart.setData(bars);
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('extended hours', () => {
  it('hides the bars outside regular hours, and brings them back', () => {
    expect(chart.isExtendedHoursVisible()).toBe(true);
    chart.setExtendedHours(false);
    expect(chart.getData()).toHaveLength(2 * REGULAR_PER_DAY);
    expect(chart.getData()[0].time).toBe(NY_MIDNIGHT + 19 * HALF_HOUR); // 09:30
    chart.setExtendedHours(true);
    expect(chart.getData()).toHaveLength(96);
  });

  it('keeps new bars outside the session aside while they are hidden', () => {
    chart.setExtendedHours(false);
    const evening = { time: NY_MIDNIGHT + 96 * HALF_HOUR, open: 1, high: 1, low: 1, close: 1, volume: 1 }; // Wednesday 00:00
    chart.appendBar(evening);
    chart.updateLastBar({ ...evening, close: 2 });
    expect(chart.getData()).toHaveLength(2 * REGULAR_PER_DAY);
    const morning = { ...evening, time: NY_MIDNIGHT + (96 + 19) * HALF_HOUR }; // Wednesday 09:30
    chart.appendBar(morning);
    expect(chart.getData()).toHaveLength(2 * REGULAR_PER_DAY + 1);
    chart.setExtendedHours(true);
    expect(chart.getData()).toHaveLength(98);
    expect(chart.getData()[96].close).toBe(2);
  });

  it('applies to new data and to a symbol’s new hours', () => {
    chart.setExtendedHours(false);
    chart.setData(bars.slice(0, 48));
    expect(chart.getData()).toHaveLength(REGULAR_PER_DAY);
    chart.setSymbolInfo({ ...stock, sessions: [{ start: '09:30', end: '12:00' }] });
    expect(chart.getData()).toHaveLength(5);
  });

  it('leaves daily bars, and symbols without hours, alone', () => {
    chart.setExtendedHours(false);
    chart.setSymbolInfo({ symbol: 'BTC' });
    expect(chart.getData()).toHaveLength(96);
    chart.setSymbolInfo(stock);
    const daily = Array.from({ length: 20 }, (_, i) => ({ ...bars[0], time: Date.UTC(2026, 0, 1 + i) }));
    chart.setData(daily);
    expect(chart.getData()).toHaveLength(20);
  });

  it('can start with them hidden', () => {
    const other = new Chart(sizedHost(), { extendedHours: false });
    other.setSymbolInfo(stock);
    other.setData(bars);
    expect(other.getData()).toHaveLength(2 * REGULAR_PER_DAY);
    other.destroy();
  });
});
