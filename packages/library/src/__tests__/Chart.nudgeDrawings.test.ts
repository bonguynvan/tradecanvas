// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const T0 = Date.UTC(2025, 0, 1);
const STEP = 60_000;
const bars: OHLCBar[] = Array.from({ length: 120 }, (_, i) => ({
  time: T0 + i * STEP, open: 100, high: 101, low: 99, close: 100, volume: 5,
}));

let host: HTMLDivElement;
let chart: Chart;
let id: string;

const press = (key: string, init: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  window.dispatchEvent(e);
  return e;
};
const anchor = () => chart.getDrawings().find((d) => d.id === id)!.anchors[0];

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
  id = chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: bars[100].time, price: 100 }] });
  host.focus();
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('arrow keys on selected drawings', () => {
  it('move the selection a bar across, ten with Shift, and leave the chart where it is', () => {
    chart.selectDrawing(id);
    const range = chart.getVisibleTimeRange();
    expect(press('ArrowRight').defaultPrevented).toBe(true);
    press('ArrowLeft', { shiftKey: true });
    expect(anchor().time).toBe(bars[91].time);
    expect(chart.getVisibleTimeRange()).toEqual(range);
  });

  it('move it up and down in price', () => {
    chart.selectDrawing(id);
    press('ArrowUp');
    expect(anchor().price).toBeGreaterThan(100);
  });

  it('scroll the chart as before when nothing is selected', () => {
    press('ArrowRight');
    expect(anchor()).toEqual({ time: bars[100].time, price: 100 });
  });
});
