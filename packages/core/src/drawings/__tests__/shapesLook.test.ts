import { describe, it, expect } from 'vitest';
import { EllipseTool } from '../tools/Ellipse.js';
import { BrushTool } from '../tools/freehand.js';
import { beginExtent, endExtent } from '../drawingLook.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

// `unitViewport`: bar i at x = i·10 + 5, price p at y = 100 − p.
const box = drawing('ellipse', [{ time: 10, price: 80 }, { time: 30, price: 20 }]);

describe('an ellipse’s handles', () => {
  it('sit on its curve, at its top, foot, left and right, not on the corners of its box', () => {
    const tool = new EllipseTool();
    // Centre (205, 50), half-width 100, half-height 30.
    expect(tool.hitTestAnchor({ x: 205, y: 20 }, box, unitViewport, 3)).toBeGreaterThanOrEqual(0);
    expect(tool.hitTestAnchor({ x: 205, y: 80 }, box, unitViewport, 3)).toBeGreaterThanOrEqual(0);
    expect(tool.hitTestAnchor({ x: 105, y: 50 }, box, unitViewport, 3)).toBeGreaterThanOrEqual(0);
    expect(tool.hitTestAnchor({ x: 305, y: 50 }, box, unitViewport, 3)).toBeGreaterThanOrEqual(0);
    expect(tool.hitTestAnchor({ x: 105, y: 20 }, box, unitViewport, 3)).toBe(-1);
  });

  it('each move one side: the top handle moves the top only', () => {
    const tool = new EllipseTool();
    const top = tool.hitTestAnchor({ x: 205, y: 20 }, box, unitViewport, 3);
    const moved = tool.moveHandle(box, top, { time: 99, price: 90 });
    const prices = moved.anchors.map((a) => a.price).sort((a, b) => a - b);
    const times = moved.anchors.map((a) => a.time).sort((a, b) => a - b);
    expect(prices).toEqual([20, 90]);
    expect(times).toEqual([10, 30]);
  });
});

describe('a freehand stroke, selected', () => {
  const stroke = drawing('brush', [{ time: 10, price: 30 }, { time: 20, price: 60 }, { time: 30, price: 40 }]);

  it('is framed as a text is: solid, not dashed', () => {
    const { ctx, calls } = recordingCtx();
    new BrushTool().render(ctx, stroke, unitViewport, true);
    const dashes = calls.filter((c) => c.name === 'setLineDash').map((c) => (c.args[0] as number[]).length);
    expect(dashes.every((n) => n === 0)).toBe(true);
    expect(calls.some((c) => c.name === 'roundRect' || c.name === 'rect')).toBe(true);
  });

  it('notes the frame’s room even unselected, so a toolbar placed as it is picked keeps clear', () => {
    const { ctx } = recordingCtx();
    beginExtent();
    new BrushTool().render(ctx, stroke, unitViewport, false);
    const covered = endExtent();
    expect(covered).not.toBeNull();
    expect(covered!.width).toBeGreaterThan(200);
  });
});
