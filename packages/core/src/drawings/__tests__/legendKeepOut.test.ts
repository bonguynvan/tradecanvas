import { describe, it, expect, afterEach } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { HorizontalLineTool } from '../tools/HorizontalLine.js';
import { HorizontalRayTool } from '../tools/HorizontalRay.js';
import { setDrawingKeepOut } from '../tools/labels.js';
import { DrawingRenderer } from '../DrawingRenderer.js';
import { DrawingManager } from '../DrawingManager.js';
import { drawing, textCtx, unitViewport, type DrawnText } from './fixtures.js';

// unitViewport: a plot 1000 × 100 at (0, 0); price p at y = 100 - p; bar N at x = N*10 + 5.
/** The OHLC rows: 300 px wide, 30 tall; the widget's indicator rows under them: 200 wide, 40 tall. */
const LEGEND = [{ x: 0, y: 0, width: 300, height: 30 }, { x: 0, y: 30, width: 200, height: 40 }];
/** A level label is 11 px tall (fillLevelLabel's size). */
const LABEL_SIZE = 11;

afterEach(() => setDrawingKeepOut([]));

/** The text's box, from its alignment and baseline as drawn. */
function box(t: DrawnText) {
  const top = t.baseline === 'bottom' ? t.y - LABEL_SIZE : t.baseline === 'top' ? t.y : t.y - LABEL_SIZE / 2;
  return { left: t.left, right: t.left + t.width, top, bottom: top + LABEL_SIZE };
}

function clearOfLegend(t: DrawnText): boolean {
  const b = box(t);
  return LEGEND.every((r) => b.right <= r.x || b.left >= r.x + r.width || b.bottom <= r.y || b.top >= r.y + r.height);
}

function lineLabel(price: number, viewport: ViewportState = unitViewport): DrawnText {
  const { ctx, drawn } = textCtx();
  new HorizontalLineTool().render(ctx, drawing('horizontalLine', [{ time: 0, price }]), viewport, false);
  return drawn[0];
}

describe('drawing labels keep clear of the legend', () => {
  it('leave a horizontal line’s label where it was with no legend', () => {
    const label = lineLabel(85);
    expect(label.align).toBe('left');
    expect(label.left).toBe(4);
  });

  it('move a horizontal line’s label to the plot’s right end when the legend covers its start', () => {
    setDrawingKeepOut(LEGEND);
    const label = lineLabel(85); // the line at y = 15, under the OHLC rows
    expect(clearOfLegend(label)).toBe(true);
    expect(label.left + label.width).toBeLessThanOrEqual(1000);
    expect(label.left).toBeGreaterThan(300);
    // Still on its line: just above it.
    expect(box(label).bottom).toBeLessThanOrEqual(15);
    expect(box(label).bottom).toBeGreaterThan(15 - 6);
  });

  it('put the label under the legend when the legend spans the plot, as on a phone', () => {
    setDrawingKeepOut([{ x: 0, y: 0, width: 1000, height: 30 }, LEGEND[1]]);
    const label = lineLabel(85);
    expect(clearOfLegend({ ...label })).toBe(true);
    expect(box(label).top).toBeGreaterThanOrEqual(30);
  });

  it('keep a label at the line’s start where it is clear of the legend', () => {
    setDrawingKeepOut(LEGEND);
    const label = lineLabel(10); // y = 90: the label above it starts at 76, under the rows' foot (70)
    expect(label.left).toBe(4);
  });

  it('move a horizontal ray’s label off the legend too', () => {
    setDrawingKeepOut(LEGEND);
    const { ctx, drawn } = textCtx();
    new HorizontalRayTool().render(ctx, drawing('horizontalRay', [{ time: 2, price: 50 }]), unitViewport, false);
    expect(clearOfLegend(drawn[0])).toBe(true);
  });

  it('are set for each pass by the drawing renderer, from what it is given', () => {
    const manager = new DrawingManager();
    manager.register(new HorizontalLineTool());
    manager.addDrawing(drawing('horizontalLine', [{ time: 0, price: 85 }], { id: 'h' }));
    const renderer = new DrawingRenderer(manager);
    renderer.setKeepOut(() => LEGEND);
    const { ctx, drawn } = textCtx();
    renderer.render(ctx, unitViewport);
    expect(clearOfLegend(drawn[0])).toBe(true);
  });
});
