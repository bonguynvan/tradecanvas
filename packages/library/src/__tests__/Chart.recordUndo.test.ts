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

describe('Chart.recordUndo', () => {
  it('puts a change of yours in the chart’s history, between its own steps', () => {
    let color = 'red';
    const rsi = chart.addIndicator('rsi')!;
    color = 'blue';
    chart.recordUndo({ undo: () => { color = 'red'; }, redo: () => { color = 'blue'; } });
    expect(chart.getUndoRedoState()).toMatchObject({ canUndo: true, canRedo: false });

    expect(chart.undo()).toBe(true);
    expect(color).toBe('red');
    expect(chart.getActiveIndicators().map((i) => i.instanceId)).toEqual([rsi]);
    chart.undo(); // the indicator
    expect(chart.getActiveIndicators()).toEqual([]);
    chart.redo();
    chart.redo();
    expect(color).toBe('blue');
    expect(chart.getUndoRedoState().canRedo).toBe(false);
  });

  it('merges a burst of changes to the same thing into one step', () => {
    const values: number[] = [];
    let value = 0;
    for (const next of [1, 2, 3]) {
      const prev = value;
      value = next;
      chart.recordUndo({ subject: 'opacity', undo: () => { value = prev; values.push(prev); }, redo: () => { value = next; values.push(next); } });
    }
    chart.undo();
    expect(value).toBe(0); // all three at once
    expect(chart.getUndoRedoState().canUndo).toBe(false);
    chart.redo();
    expect(value).toBe(3);
  });

  it('keeps changes to different things, or far apart, as steps of their own', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    let a = 0;
    chart.recordUndo({ subject: 'a', undo: () => { a = 0; }, redo: () => { a = 1; } });
    now.mockReturnValue(10_000);
    chart.recordUndo({ subject: 'a', undo: () => { a = 1; }, redo: () => { a = 2; } });
    chart.recordUndo({ subject: 'b', undo: () => { a = 2; }, redo: () => { a = 3; } });
    chart.undo();
    expect(a).toBe(2);
    chart.undo();
    expect(a).toBe(1);
  });

  it('does nothing when the chart keeps no history', () => {
    chart.destroy();
    chart = new Chart(host, { features: { drawingUndoRedo: false } });
    const undo = vi.fn();
    chart.recordUndo({ undo, redo: () => {} });
    expect(chart.undo()).toBe(false);
    expect(undo).not.toHaveBeenCalled();
  });
});
