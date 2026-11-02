// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const T0 = Date.UTC(2025, 0, 1);
const bars: OHLCBar[] = Array.from({ length: 200 }, (_, i) => ({
  time: T0 + i * 3_600_000, open: 100, high: 101, low: 99, close: 100 + (i % 5), volume: 10,
}));

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** A horizontal line at value 70 on pane `paneId`. */
const levelOn = (paneId: string) => chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: T0 + 50 * 3_600_000, price: 70 }], paneId });
const paneOf = (id: string) => chart.getDrawings().find((d) => d.id === id)?.paneId;

describe('drawings on indicator panes', () => {
  it('keeps a drawing on the pane it was put on, shown while the pane is', () => {
    const rsi = chart.addIndicator('rsi')!;
    const id = levelOn(rsi);
    expect(paneOf(id)).toBe(rsi);
    expect(chart.isDrawingShown(id)).toBe(true);
  });

  it('sits inside its pane, not on the price pane', () => {
    const rsi = chart.addIndicator('rsi')!;
    const id = levelOn(rsi);
    const pane = chart.getIndicatorPanes().find((p) => p.instanceId === rsi)!.rect;
    const rect = chart.getDrawingRect(id)!;
    expect(rect.y).toBeGreaterThanOrEqual(pane.y);
    expect(rect.y + rect.height).toBeLessThanOrEqual(pane.y + pane.height);
  });

  it('follows its pane when another indicator in it takes the pane over, and comes back on undo', () => {
    const rsi = chart.addIndicator('rsi')!;
    const stoch = chart.addIndicator('stochastic', {}, 'bottom', { pane: rsi })!;
    const id = levelOn(rsi);
    chart.removeIndicator(rsi);
    expect(paneOf(id)).toBe(stoch);
    expect(chart.isDrawingShown(id)).toBe(true);
    chart.undo();
    expect(paneOf(id)).toBe(rsi);
    chart.redo();
    expect(paneOf(id)).toBe(stoch);
  });

  it('is kept but not shown once its pane is gone, and shows again when undo brings the pane back', () => {
    const rsi = chart.addIndicator('rsi')!;
    const id = levelOn(rsi);
    chart.removeIndicator(rsi);
    expect(paneOf(id)).toBe(rsi);
    expect(chart.isDrawingShown(id)).toBe(false);
    chart.undo();
    expect(chart.isDrawingShown(id)).toBe(true);
  });

  it('goes back on its pane when a layout is loaded, though the pane’s indicator gets a new id', () => {
    const rsi = chart.addIndicator('rsi')!;
    levelOn(rsi);
    const saved = chart.saveState()!;
    chart.loadState(saved);
    const [restored] = chart.getActiveIndicators();
    const [drawing] = chart.getDrawings();
    expect(drawing.paneId).toBe(restored.instanceId);
    expect(chart.isDrawingShown(drawing.id)).toBe(true);
  });

  it('drops, when a layout is loaded, a drawing whose pane is not in it', () => {
    const json = JSON.stringify({
      version: 2,
      drawings: [{ id: 'x', type: 'horizontalLine', anchors: [{ time: T0, price: 70 }], style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' }, visible: true, locked: false, paneId: 'nowhere' }],
    });
    chart.loadState(json);
    expect(chart.getDrawings()).toEqual([]);
  });

  it('saves no drawing of a pane that is gone, so a reload never puts it on another pane', () => {
    const rsi = chart.addIndicator('rsi')!;
    levelOn(rsi);
    chart.removeIndicator(rsi);
    const saved = JSON.parse(chart.saveState()!);
    expect(saved.drawings).toEqual([]);
  });

  it('keeps, saved again, the drawings of a pane whose indicator a layout could not restore', () => {
    const json = JSON.stringify({
      version: 2,
      indicators: [{ id: 'not-registered', instanceId: 'old_1', params: {} }],
      drawings: [{ id: 'x', type: 'horizontalLine', anchors: [{ time: T0, price: 70 }], style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' }, visible: true, locked: false, paneId: 'old_1' }],
    });
    chart.loadState(json);
    expect(chart.getDrawings()).toEqual([]);
    const saved = JSON.parse(chart.saveState()!);
    expect(saved.drawings.map((d: { id: string; paneId?: string }) => [d.id, d.paneId])).toEqual([['x', 'old_1']]);
  });

  it('puts a drawing on no pane the chart lacks, and no price-only tool on a pane', () => {
    const rsi = chart.addIndicator('rsi')!;
    expect(levelOn('nowhere')).toBeNull();
    expect(chart.addDrawing({ type: 'anchoredVWAP', anchors: [{ time: T0 + 50 * 3_600_000, price: 50 }], paneId: rsi })).toBeNull();
    expect(chart.getDrawings()).toEqual([]);
  });

  it('takes no price alert: its values are not prices', () => {
    const rsi = chart.addIndicator('rsi')!;
    const onPane = levelOn(rsi);
    const onPrice = chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: T0 + 50 * 3_600_000, price: 100 }] });
    expect(chart.canAddDrawingAlert(onPane)).toBe(false);
    expect(chart.canAddDrawingAlert(onPrice)).toBe(true);
  });
});
