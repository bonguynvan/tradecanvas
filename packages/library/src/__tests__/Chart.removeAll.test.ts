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

const line = (price: number) => ({ type: 'horizontalLine' as const, anchors: [{ time: T0 + 50 * 3_600_000, price }] });
const drawingIds = () => chart.getDrawings().map((d) => d.id);
const indicatorIds = () => chart.getActiveIndicators().map((i) => i.instanceId);

describe('Chart.removeAll', () => {
  it('removes the drawings and the indicators, and says how many of each went', () => {
    chart.addDrawing(line(100));
    chart.addDrawing(line(101));
    chart.addIndicator('rsi');
    chart.addIndicator('ema');
    expect(chart.removeAll()).toEqual({ drawings: 2, indicators: 2 });
    expect(drawingIds()).toEqual([]);
    expect(indicatorIds()).toEqual([]);
  });

  it('brings both back with one undo, and takes them again with one redo', () => {
    const a = chart.addDrawing(line(100));
    const rsi = chart.addIndicator('rsi')!;
    chart.removeAll();
    expect(chart.undo()).toBe(true);
    expect(drawingIds()).toEqual([a]);
    expect(indicatorIds()).toEqual([rsi]);
    expect(chart.redo()).toBe(true);
    expect(drawingIds()).toEqual([]);
    expect(indicatorIds()).toEqual([]);
    // The step before it is still there.
    chart.undo();
    chart.undo();
    expect(indicatorIds()).toEqual([]);
    expect(drawingIds()).toEqual([a]);
  });

  it('says what came and went on undo and redo, as single removals do', () => {
    const a = chart.addDrawing(line(100));
    chart.addIndicator('rsi');
    const created: string[] = [];
    const removed: string[] = [];
    chart.on('drawingCreate', (e) => created.push((e.payload as { id: string }).id));
    chart.on('drawingRemove', (e) => removed.push((e.payload as { id: string }).id));
    chart.removeAll();
    chart.undo();
    chart.redo();
    expect(removed).toEqual([a, a]);
    expect(created).toEqual([a]);
  });

  it('takes an indicator computed from another with it, and brings both back', () => {
    const rsi = chart.addIndicator('rsi')!;
    chart.addIndicator('sma', { period: 9, source: `${rsi}:value` });
    expect(indicatorIds()).toHaveLength(2);
    chart.removeAll('indicators');
    expect(indicatorIds()).toEqual([]);
    chart.undo();
    expect(indicatorIds()).toHaveLength(2);
  });

  it('removes only the drawings or only the indicators when asked', () => {
    const a = chart.addDrawing(line(100));
    const rsi = chart.addIndicator('rsi')!;
    expect(chart.removeAll('drawings')).toEqual({ drawings: 1, indicators: 0 });
    expect(indicatorIds()).toEqual([rsi]);
    chart.undo();
    expect(drawingIds()).toEqual([a]);
    expect(chart.removeAll('indicators')).toEqual({ drawings: 0, indicators: 1 });
    expect(drawingIds()).toEqual([a]);
  });

  it('keeps locked drawings, as removing a selection does', () => {
    const kept = chart.addDrawing({ ...line(100), locked: true });
    chart.addDrawing(line(101));
    expect(chart.removeAll('drawings').drawings).toBe(1);
    expect(drawingIds()).toEqual([kept]);
  });

  it('adds no step when there is nothing to remove', () => {
    expect(chart.removeAll()).toEqual({ drawings: 0, indicators: 0 });
    expect(chart.getUndoRedoState().canUndo).toBe(false);
  });
});
