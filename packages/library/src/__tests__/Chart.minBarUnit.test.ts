// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const DAY = 86_400_000;
const daily = (n: number): OHLCBar[] => Array.from({ length: n }, (_, i) => ({ time: Date.UTC(2000, 0, 3) + i * DAY, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 }));

let host: HTMLDivElement;
beforeEach(() => { installChartStubs(); host = sizedHost(1000, 500); });
afterEach(() => { host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const range = (chart: Chart) => (chart as unknown as { viewport: { getState(): { visibleRange: { from: number; to: number } } } }).viewport.getState().visibleRange;

describe('Chart minBarUnit', () => {
  it('shows only the newest bars on All by default when they don’t fit', () => {
    const chart = new Chart(host, {});
    chart.setData(daily(9000));
    chart.setVisibleRangePreset('All');
    expect(range(chart).from).toBeGreaterThan(1000);
    chart.destroy();
  });

  it('fits them all with a narrower floor, from the option or later', () => {
    const chart = new Chart(host, { minBarUnit: 0.05 });
    chart.setData(daily(9000));
    chart.setVisibleRangePreset('All');
    expect(range(chart).from).toBeLessThanOrEqual(0);
    expect(chart.getMinBarUnit()).toBe(0.05);
    chart.setMinBarUnit(0.25);
    chart.setVisibleRangePreset('All');
    expect(range(chart).from).toBeGreaterThan(1000);
    chart.destroy();
  });
});
