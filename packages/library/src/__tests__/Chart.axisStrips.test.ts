// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const hourly = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * HOUR, open: 100, high: 101 + (i % 7), low: 99, close: 100, volume: 1 }));

let host: HTMLDivElement;
let chart: Chart;
const state = () => (chart as unknown as { viewport: { getState(): ViewportState } }).viewport.getState();
const mouse = (type: string, x: number, y: number) =>
  host.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button: 0, buttons: type === 'mouseup' ? 0 : 1, bubbles: true }));

beforeEach(() => {
  installChartStubs();
  host = sizedHost(800, 500);
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(hourly(300));
  chart.addIndicator('rsi', {}, 'bottom');
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart axis strips with a pane below the price pane', () => {
  it('pans when dragged inside the pane, rather than zooming time', () => {
    const pane = chart.getIndicatorPanes()[0].rect;
    const y = pane.y + pane.height / 2;
    const before = state();
    mouse('mousedown', 400, y);
    mouse('mousemove', 300, y);
    mouse('mouseup', 300, y);
    expect(state().barWidth).toBe(before.barWidth);
    expect(state().offset).not.toBe(before.offset);
  });

  it('shows the time-axis cursor only below the last pane', () => {
    const pane = chart.getIndicatorPanes()[0].rect;
    mouse('mousemove', 300, pane.y + pane.height / 2);
    expect(host.style.cursor).not.toBe('ew-resize');
    mouse('mousemove', 300, pane.y + pane.height + 5);
    expect(host.style.cursor).toBe('ew-resize');
  });

  it('leaves the price range alone when the strip beside the pane is dragged', () => {
    const pane = chart.getIndicatorPanes()[0].rect;
    const x = pane.x + pane.width + 10;
    const y = pane.y + pane.height / 2;
    const before = state();
    mouse('mousedown', x, y);
    mouse('mousemove', x, y + 40);
    mouse('mouseup', x, y + 40);
    expect(state().priceRange).toEqual(before.priceRange);
    expect(state().barWidth).toBe(before.barWidth);
    expect(chart.isAutoScale()).toBe(true);
  });
});
