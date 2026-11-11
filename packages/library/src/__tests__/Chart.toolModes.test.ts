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

describe('Chart cursor kinds', () => {
  /** The CSS cursor over the middle of the plot. */
  const cursorOverPlot = (): string => {
    const plot = state().chartRect;
    host.dispatchEvent(new MouseEvent('mousemove', { clientX: plot.x + plot.width / 2, clientY: plot.y + plot.height / 2, bubbles: true }));
    const shown = [host, ...host.querySelectorAll<HTMLElement>('*')].find((el) => el.style.cursor);
    return shown?.style.cursor ?? '';
  };

  it('starts with the cross', () => {
    expect(chart.getCrosshairCursor()).toBe('cross');
    expect(cursorOverPlot()).toBe('crosshair');
  });

  it('takes the kind from the options', () => {
    chart.destroy();
    chart = new Chart(host, { chartType: 'candlestick', crosshair: { mode: 'normal', cursor: 'arrow' } });
    chart.setData(hourly(300));
    expect(chart.getCrosshairCursor()).toBe('arrow');
    expect(cursorOverPlot()).toBe('default');
  });

  it('shows a dot in the crosshair’s colour, and follows a new crosshair colour', () => {
    chart.setCrosshairCursor('dot');
    expect(cursorOverPlot()).toMatch(/^url\("data:image\/svg\+xml,/);
    chart.applyOverrides({ 'crosshair.vertical.color': '#123456' });
    expect(decodeURIComponent(cursorOverPlot())).toContain("fill='#123456'");
  });

  it('says so when the kind changes, and not when it stays', () => {
    const changes: unknown[] = [];
    chart.on('crosshairCursorChange', (e) => changes.push(e.payload));
    chart.setCrosshairCursor('arrow');
    chart.setCrosshairCursor('arrow');
    expect(changes).toEqual([{ cursor: 'arrow' }]);
  });

  it('leaves an unknown kind alone', () => {
    chart.setCrosshairCursor('laser' as never);
    expect(chart.getCrosshairCursor()).toBe('cross');
  });
});

describe('Chart drawing spans on the axes', () => {
  const context = () => (chart as unknown as { engine: { renderCtx: { drawingAxisSpans?: boolean } } }).engine.renderCtx;

  it('are on by default, and the switch turns them off and on', () => {
    expect(chart.isDrawingAxisSpansVisible()).toBe(true);
    chart.setDrawingAxisSpansVisible(false);
    expect(chart.isDrawingAxisSpansVisible()).toBe(false);
    expect(context().drawingAxisSpans).toBe(false);
    chart.setDrawingAxisSpansVisible(true);
    expect(context().drawingAxisSpans).toBe(true);
  });

  it('follow features.drawingAxisSpans', () => {
    chart.destroy();
    chart = new Chart(host, { chartType: 'candlestick', features: { drawingAxisSpans: false } });
    expect(chart.isDrawingAxisSpansVisible()).toBe(false);
  });
});
