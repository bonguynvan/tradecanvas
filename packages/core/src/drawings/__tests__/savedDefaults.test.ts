import { describe, it, expect } from 'vitest';
import type { DrawingState } from '@tradecanvas/commons';
import { DrawingManager } from '../DrawingManager.js';
import { FibRetracementTool } from '../tools/FibRetracement.js';
import { HorizontalLineTool } from '../tools/HorizontalLine.js';
import { ParallelChannelTool } from '../tools/ParallelChannel.js';
import { TrendLineTool } from '../tools/TrendLine.js';
import { VerticalLineTool } from '../tools/VerticalLine.js';

/** A manager with the tools these tests draw. */
function managerWithTools(): DrawingManager {
  const manager = new DrawingManager();
  for (const tool of [new FibRetracementTool(), new ParallelChannelTool(), new TrendLineTool(), new HorizontalLineTool(), new VerticalLineTool()]) manager.register(tool);
  return manager;
}

const STYLE = { color: '#4c8dff', lineWidth: 1, lineStyle: 'solid' as const };
const A = { time: 1_700_000_000_000, price: 100 };
const B = { time: 1_700_000_600_000, price: 200 };
const C = { time: 1_700_000_000_000, price: 120 };

const saved = (type: DrawingState['type'], anchors: DrawingState['anchors'], options?: DrawingState['options']): DrawingState =>
  ({ id: `saved-${type}`, type, anchors, style: STYLE, visible: true, locked: false, ...(options ? { options } : {}) });

describe('a default that changed, and the drawings saved before it', () => {
  it('draws a new retracement 0 at its end and between its points, and says so in what it saves', () => {
    const manager = managerWithTools();
    const id = manager.addDrawing({ type: 'fibRetracement', anchors: [A, B] });
    const drawing = manager.getDrawings().find((d) => d.id === id)!;
    expect(manager.getDrawingOptions(id)).toMatchObject({ reversed: false, extendLeft: false, extendRight: false });
    // Written out, so loading it back is not taken for a drawing from before.
    expect(drawing.options).toMatchObject({ reversed: false, extendLeft: false, extendRight: false });
    manager.setDrawings(JSON.parse(JSON.stringify(manager.getDrawings())));
    expect(manager.getDrawingOptions(id)).toMatchObject({ reversed: false, extendLeft: false, extendRight: false });
  });

  it('keeps a retracement saved with no options as it was drawn: 0 at its start, across the chart', () => {
    const manager = managerWithTools();
    manager.setDrawings([saved('fibRetracement', [A, B])]);
    expect(manager.getDrawingOptions('saved-fibRetracement')).toMatchObject({ reversed: true, extendLeft: true, extendRight: true });
  });

  it('reads the earlier `reverse`, which meant the opposite, from a saved drawing and from a call', () => {
    const manager = managerWithTools();
    manager.setDrawings([saved('fibRetracement', [A, B], { reverse: true, extendRight: false })]);
    expect(manager.getDrawingOptions('saved-fibRetracement')).toMatchObject({ reversed: false, extendLeft: true, extendRight: false });
    const id = manager.addDrawing({ type: 'fibRetracement', anchors: [A, B], options: { reverse: false } });
    expect(manager.getDrawingOptions(id)).toMatchObject({ reversed: true });
    expect(manager.getDrawings().find((d) => d.id === id)!.options).not.toHaveProperty('reverse');
  });

  it('gives a new channel its middle line and keeps a saved one without', () => {
    const manager = managerWithTools();
    const id = manager.addDrawing({ type: 'parallelChannel', anchors: [A, B, C] });
    expect(manager.getDrawingOptions(id)).toMatchObject({ middleLine: true });
    manager.setDrawings([saved('parallelChannel', [A, B, C])]);
    expect(manager.getDrawingOptions('saved-parallelChannel')).toMatchObject({ middleLine: false });
  });

  it('leaves a tool whose defaults never changed with no options written', () => {
    const manager = managerWithTools();
    const id = manager.addDrawing({ type: 'trendLine', anchors: [A, B] });
    expect(manager.getDrawings().find((d) => d.id === id)!.options).toBeUndefined();
    manager.setDrawings([saved('trendLine', [A, B])]);
    expect(manager.getDrawings()[0].options).toBeUndefined();
  });
});

describe('a level line on the axes', () => {
  it('tags a horizontal line on the price axis and a vertical one on the time axis with nothing selected', () => {
    const manager = managerWithTools();
    manager.addDrawing({ type: 'horizontalLine', anchors: [A], style: { color: '#f5a524' } });
    manager.addDrawing({ type: 'verticalLine', anchors: [B] });
    manager.addDrawing({ type: 'trendLine', anchors: [A, B] });
    const viewport = { chartRect: { x: 0, y: 0, width: 800, height: 400 }, priceRange: { min: 0, max: 300 } } as never;
    const spans = manager.axisSpans(viewport);
    expect(spans.map((s) => [s.prices, s.times])).toEqual([[[100], []], [[], [B.time]]]);
    expect(spans[0].color).toBe('#f5a524');
  });

  it('leaves a line whose price is turned off untagged, until it is selected', () => {
    const manager = managerWithTools();
    const id = manager.addDrawing({ type: 'horizontalLine', anchors: [A], options: { showPrice: false } });
    const viewport = { chartRect: { x: 0, y: 0, width: 800, height: 400 }, priceRange: { min: 0, max: 300 } } as never;
    expect(manager.axisSpans(viewport)).toEqual([]);
    manager.select(id);
    expect(manager.axisSpans(viewport)).toHaveLength(1);
  });

  it('leaves a hidden one untagged', () => {
    const manager = managerWithTools();
    const id = manager.addDrawing({ type: 'horizontalLine', anchors: [A], visible: false });
    const viewport = { chartRect: { x: 0, y: 0, width: 800, height: 400 }, priceRange: { min: 0, max: 300 } } as never;
    expect(manager.axisSpans(viewport)).toEqual([]);
    expect(id).toBeTruthy();
  });
});
