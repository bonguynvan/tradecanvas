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
const modes: unknown[] = [];

beforeEach(() => {
  installChartStubs();
  host = sizedHost(800, 500);
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(hourly(300));
  modes.length = 0;
  chart.on('toolModeChange', (e) => modes.push(e.payload));
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart zoom-area tool', () => {
  it('zooms to the bars under the box dragged, then turns itself off', () => {
    const plot = state().chartRect;
    const before = state().visibleRange;
    chart.setZoomAreaMode(true);
    const y = plot.y + plot.height / 2;
    mouse('mousedown', plot.x + plot.width * 0.4, y);
    mouse('mousemove', plot.x + plot.width * 0.6, y + 40);
    mouse('mouseup', plot.x + plot.width * 0.6, y + 40);
    const after = state().visibleRange;
    expect(after.to - after.from).toBeLessThan((before.to - before.from) * 0.4);
    expect(chart.isZoomAreaMode()).toBe(false);
    expect(modes).toEqual([{ zoomArea: true }, { zoomArea: false }]);
  });

  it('pans as usual once a tool is picked instead', () => {
    chart.setZoomAreaMode(true);
    chart.setDrawingTool('trendLine');
    expect(chart.isZoomAreaMode()).toBe(false);
  });

  it('is put away by the eraser, and the eraser by it', () => {
    chart.setZoomAreaMode(true);
    chart.setEraserMode(true);
    expect([chart.isZoomAreaMode(), chart.isEraserMode()]).toEqual([false, true]);
    chart.setZoomAreaMode(true);
    expect([chart.isZoomAreaMode(), chart.isEraserMode()]).toEqual([true, false]);
  });
});

describe('Chart magnet modes', () => {
  it('switches between off, weak and strong', () => {
    chart.setDrawingMagnetMode('strong');
    expect(chart.getDrawingMagnetMode()).toBe('strong');
    expect(chart.getDrawingMagnet()).toBe(true);
    chart.setDrawingMagnet(false);
    expect(chart.getDrawingMagnetMode()).toBe('off');
    chart.setDrawingMagnet(true);
    expect(chart.getDrawingMagnetMode()).toBe('weak');
  });
});
