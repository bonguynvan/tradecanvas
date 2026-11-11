import { describe, it, expect, beforeEach } from 'vitest';
import type { DrawingDescriptor } from '@tradecanvas/commons';
import { drawingAxisSpan } from '../axisSpan.js';
import { DrawingManager } from '../DrawingManager.js';
import { TrendLineTool } from '../tools/TrendLine.js';
import { HorizontalLineTool } from '../tools/HorizontalLine.js';
import { VerticalLineTool } from '../tools/VerticalLine.js';
import { drawing, unitViewport } from './fixtures.js';

const trend: DrawingDescriptor = { type: 'trendLine', name: 'Trend Line', requiredAnchors: 2 };

describe('drawingAxisSpan', () => {
  it('spans a drawing’s lowest to highest price and first to last time', () => {
    const d = drawing('trendLine', [{ time: 50, price: 80 }, { time: 10, price: 20 }, { time: 30, price: 95 }]);
    expect(drawingAxisSpan(d, trend)).toEqual({ prices: [20, 95], times: [10, 50] });
  });

  it('gives one price and one time for a drawing of one point, or of points level and in line', () => {
    expect(drawingAxisSpan(drawing('trendLine', [{ time: 10, price: 40 }]), trend)).toEqual({ prices: [40], times: [10] });
    expect(drawingAxisSpan(drawing('trendLine', [{ time: 10, price: 40 }, { time: 10, price: 40 }]), trend)).toEqual({ prices: [40], times: [10] });
  });

  it('keeps to the axis a tool says it spans: a level only its price, a vertical line only its time', () => {
    const d = drawing('horizontalLine', [{ time: 10, price: 40 }]);
    expect(drawingAxisSpan(d, { ...trend, axisSpan: 'price' })).toEqual({ prices: [40], times: [] });
    expect(drawingAxisSpan(d, { ...trend, axisSpan: 'time' })).toEqual({ prices: [], times: [10] });
    expect(drawingAxisSpan(d, { ...trend, axisSpan: 'none' })).toBeNull();
  });

  it('has none for a drawing kept to a place on the screen, or with no usable point', () => {
    expect(drawingAxisSpan(drawing('trendLine', [{ time: 0.5, price: 0.5 }]), { ...trend, anchoring: 'screen' })).toBeNull();
    expect(drawingAxisSpan(drawing('trendLine', []), trend)).toBeNull();
    expect(drawingAxisSpan(drawing('trendLine', [{ time: Number.NaN, price: Number.NaN }]), trend)).toBeNull();
  });
});

describe('DrawingManager.axisSpans', () => {
  let manager: DrawingManager;

  beforeEach(() => {
    manager = new DrawingManager();
    manager.register(new TrendLineTool());
    manager.register(new HorizontalLineTool());
    manager.register(new VerticalLineTool());
  });

  it('has none while nothing is selected', () => {
    manager.setDrawings([drawing('trendLine', [{ time: 10, price: 20 }, { time: 50, price: 80 }], { id: 'a' })]);
    expect(manager.axisSpans(unitViewport)).toEqual([]);
  });

  it('spans the selected drawing, in its colour, on the viewport it is drawn on', () => {
    manager.setDrawings([drawing('trendLine', [{ time: 10, price: 20 }, { time: 50, price: 80 }], { id: 'a', style: { color: '#ff8800', lineWidth: 1, lineStyle: 'solid' } })]);
    manager.select('a');
    const [span] = manager.axisSpans(unitViewport);
    expect(span).toMatchObject({ prices: [20, 80], times: [10, 50], color: '#ff8800' });
    expect(span.viewport).toBe(unitViewport);
  });

  it('a level spans only its price, a vertical line only its time', () => {
    manager.setDrawings([
      drawing('horizontalLine', [{ time: 10, price: 30 }], { id: 'h' }),
      drawing('verticalLine', [{ time: 40, price: 30 }], { id: 'v' }),
    ]);
    manager.select('h');
    expect(manager.axisSpans(unitViewport)[0]).toMatchObject({ prices: [30], times: [] });
    manager.select('v');
    expect(manager.axisSpans(unitViewport)[0]).toMatchObject({ prices: [], times: [40] });
  });

  it('spans no hidden drawing', () => {
    manager.setDrawings([drawing('trendLine', [{ time: 10, price: 20 }, { time: 50, price: 80 }], { id: 'a', visible: false })]);
    manager.select('a');
    expect(manager.axisSpans(unitViewport)).toEqual([]);
  });

  it('spans the drawing being made, from its first point', () => {
    manager.setActiveTool('trendLine');
    manager.onPointerDown({ x: 105, y: 70 }, unitViewport);
    manager.onPointerMove({ x: 405, y: 20 }, unitViewport);
    const [span] = manager.axisSpans(unitViewport);
    expect(span.prices[0]).toBeCloseTo(30);
    expect(span.prices.at(-1)).toBeCloseTo(80);
    expect(span.times.length).toBe(2);
  });
});
