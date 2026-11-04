import { describe, it, expect } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { drawingPaneAt, drawingPaneViewport, takesDrawing, MIN_DRAWING_PANE_HEIGHT } from '../DrawingPanes.js';

const rect = (y: number, height: number) => ({ x: 0, y, width: 700, height });
const view = (y: number, height: number) => ({ chartRect: rect(y, height) }) as unknown as ViewportState;

describe('drawingPaneAt', () => {
  const panels = [{ id: 'rsi' }, { id: 'macd' }];
  const viewports: Record<string, ViewportState | null> = { rsi: view(320, 80), macd: null };

  it('is the price pane on its plot', () => {
    expect(drawingPaneAt({ x: 10, y: 10 }, rect(0, 300), panels, (id) => viewports[id])).toBeUndefined();
  });

  it('is a pane on its plot', () => {
    expect(drawingPaneAt({ x: 10, y: 350 }, rect(0, 300), panels, (id) => viewports[id])).toBe('rsi');
  });

  it('is no pane between plots (a header), or on a pane that takes none', () => {
    expect(drawingPaneAt({ x: 10, y: 310 }, rect(0, 300), panels, (id) => viewports[id])).toBeNull();
    expect(drawingPaneAt({ x: 10, y: 500 }, rect(0, 300), panels, (id) => viewports[id])).toBeNull();
  });
});

describe('drawingPaneViewport', () => {
  const bars = [{ time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 }];
  const data = () => bars;

  it('is the pane\'s viewport with the bars', () => {
    const vp = drawingPaneViewport({ position: 'bottom' }, false, () => view(0, 80), data);
    expect(vp?.chartRect.height).toBe(80);
    expect(vp?.data).toBe(bars);
  });

  it('is null for a pane on a side, folded, unknown or too short', () => {
    let read = 0;
    const of = () => (read++, view(0, 80));
    const counted = () => (read++, bars);
    expect(drawingPaneViewport({ position: 'left' }, false, of, counted)).toBeNull();
    expect(drawingPaneViewport({ position: 'top' }, true, of, counted)).toBeNull();
    expect(drawingPaneViewport(undefined, false, of, counted)).toBeNull();
    // A pane that can't take drawings isn't laid out for them, nor are the bars read.
    expect(read).toBe(0);
    expect(drawingPaneViewport({ position: 'top' }, false, () => view(0, MIN_DRAWING_PANE_HEIGHT - 1), counted)).toBeNull();
    expect(drawingPaneViewport({ position: 'top' }, false, () => undefined, counted)).toBeNull();
    expect(read).toBe(0);
  });
});

describe('takesDrawing', () => {
  it('takes a drawing on a pane on the chart, not a price-only tool', () => {
    expect(takesDrawing([{ id: 'rsi' }], 'rsi', false)).toBe(true);
    expect(takesDrawing([{ id: 'rsi' }], 'rsi', true)).toBe(false);
    expect(takesDrawing([{ id: 'rsi' }], 'macd', false)).toBe(false);
  });
});
