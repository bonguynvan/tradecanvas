import { describe, it, expect } from 'vitest';
import { DisjointChannelTool } from '../tools/DisjointChannel.js';
import { FlatTopBottomTool } from '../tools/FlatTopBottom.js';
import { RotatedRectangleTool } from '../tools/RotatedRectangle.js';
import { DrawingManager } from '../DrawingManager.js';
import { registerBuiltInDrawingTools } from '../tools/index.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

// In the unit viewport a time t is at x = t * 10 + 5 and a price p at y = 100 - p.
const A = { time: 10, price: 20 }; // (105, 80)
const B = { time: 30, price: 40 }; // (305, 60)

/** The segments a tool stroked: each `moveTo` with the `lineTo`s after it. */
function strokes(calls: { name: string; args: unknown[] }[]): number[][][] {
  const paths: number[][][] = [];
  for (const call of calls) {
    if (call.name === 'moveTo') paths.push([call.args as number[]]);
    else if (call.name === 'lineTo') paths.at(-1)?.push(call.args as number[]);
  }
  return paths;
}
const near = (got: number[][], want: number[][]) => {
  expect(got).toHaveLength(want.length);
  got.forEach((p, i) => {
    expect(p[0]).toBeCloseTo(want[i][0], 6);
    expect(p[1]).toBeCloseTo(want[i][1], 6);
  });
};

describe('a disjoint channel', () => {
  const tool = new DisjointChannelTool();
  // The second line is at 70 halfway along, and leans the other way: 80 at A, 60 at B.
  const state = drawing('disjointChannel', [A, B, { time: 25, price: 70 }]);

  it('draws its second line through the price of its third point halfway along, sloped the other way', () => {
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, state, unitViewport, false);
    const lines = strokes(calls).filter((p) => p.length === 2);
    near(lines[0], [[105, 80], [305, 60]]);
    near(lines[1], [[105, 20], [305, 40]]);
  });

  it('gives the prices of both lines at a time, for alerts', () => {
    expect(tool.priceAt(state, 20)).toEqual([30, 70]);
    expect(tool.priceAt(state, 10)).toEqual([20, 80]);
    expect(tool.priceAt(state, 40)).toBeNull();
    expect(tool.priceAt(drawing('disjointChannel', state.anchors, { options: { extendRight: true } }), 40)).toEqual([50, 50]);
    // Drawn right to left, the same two lines.
    expect(tool.priceAt(drawing('disjointChannel', [B, A, state.anchors[2]]), 10)).toEqual([20, 80]);
  });

  it('is picked on either line, not between them', () => {
    expect(tool.hitTest({ x: 205, y: 70 }, state, unitViewport, 3)).toBe(true);
    expect(tool.hitTest({ x: 205, y: 30 }, state, unitViewport, 3)).toBe(true);
    expect(tool.hitTest({ x: 205, y: 50 }, state, unitViewport, 3)).toBe(false);
  });

  it('holds its third handle on the second line, halfway along, where it sets its price', () => {
    expect(tool.hitTestAnchor({ x: 205, y: 30 }, state, unitViewport, 4)).toBe(2);
    // Lines that meet at the far end: its handle is still its own to take.
    const meeting = drawing('disjointChannel', [A, B, { time: 20, price: 50 }]);
    expect(tool.hitTestAnchor({ x: 305, y: 60 }, meeting, unitViewport, 4)).toBe(1);
    expect(tool.hitTestAnchor({ x: 205, y: 50 }, meeting, unitViewport, 4)).toBe(2);
  });

  it('is one line while its first line stands upright: nothing leans the other way', () => {
    const upright = drawing('disjointChannel', [A, { time: 10, price: 60 }, { time: 20, price: 80 }]);
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, upright, unitViewport, true);
    expect(strokes(calls).filter((p) => p.length === 2)).toHaveLength(1);
    expect(tool.priceAt(upright, 10)).toBeNull();
  });

  it('draws only its first line until the third point is placed', () => {
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, drawing('disjointChannel', [A, B]), unitViewport, false);
    expect(strokes(calls).filter((p) => p.length === 2)).toHaveLength(1);
  });
});

describe('a flat top or bottom', () => {
  const tool = new FlatTopBottomTool();
  const state = drawing('flatTopBottom', [A, B, { time: 50, price: 70 }]);

  it('draws a sloping line and a level one at the price of its third point, over the same bars', () => {
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, state, unitViewport, false);
    const lines = strokes(calls).filter((p) => p.length === 2);
    near(lines[0], [[105, 80], [305, 60]]);
    near(lines[1], [[105, 30], [305, 30]]);
  });

  it('gives the price of the sloping line and of the level at a time', () => {
    expect(tool.priceAt(state, 20)).toEqual([30, 70]);
    expect(tool.priceAt(state, 5)).toBeNull();
    // Drawn right to left, the same two lines.
    expect(tool.priceAt(drawing('flatTopBottom', [B, A, state.anchors[2]]), 20)).toEqual([30, 70]);
  });

  it('is picked on either line, and holds its third handle on the level, halfway along', () => {
    expect(tool.hitTest({ x: 200, y: 30 }, state, unitViewport, 3)).toBe(true);
    expect(tool.hitTest({ x: 205, y: 70 }, state, unitViewport, 3)).toBe(true);
    expect(tool.hitTest({ x: 200, y: 50 }, state, unitViewport, 3)).toBe(false);
    expect(tool.hitTestAnchor({ x: 205, y: 30 }, state, unitViewport, 4)).toBe(2);
  });
});

describe('a rotated rectangle', () => {
  const tool = new RotatedRectangleTool();
  // A side lying level from (105, 50) to (305, 50); the third point 40 px above it.
  const level = drawing('rotatedRectangle', [{ time: 10, price: 50 }, { time: 30, price: 50 }, { time: 17, price: 90 }]);
  const outline = (anchors: typeof level.anchors) => {
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, drawing('rotatedRectangle', anchors), unitViewport, false);
    return strokes(calls).find((p) => p.length === 4)!;
  };

  it('draws a rectangle on its first side, as deep as the third point is far from it', () => {
    near(outline(level.anchors), [[105, 50], [305, 50], [305, 10], [105, 10]]);
  });

  it('is the same rectangle with its first side drawn the other way, or its third point on the other side', () => {
    near(outline([level.anchors[1], level.anchors[0], level.anchors[2]]), [[305, 50], [105, 50], [105, 10], [305, 10]]);
    near(outline([level.anchors[0], level.anchors[1], { time: 17, price: 30 }]), [[105, 50], [305, 50], [305, 70], [105, 70]]);
  });

  it('keeps its corners square on a sloping side', () => {
    // A side from (105, 80) to (305, 60), and a point off it.
    const [a, b, c, d] = outline([A, B, { time: 20, price: 60 }]);
    const dot = (p: number[], q: number[], r: number[]) => (q[0] - p[0]) * (r[0] - q[0]) + (q[1] - p[1]) * (r[1] - q[1]);
    expect(dot(a, b, c)).toBeCloseTo(0, 6);
    expect(dot(b, c, d)).toBeCloseTo(0, 6);
    // The far side goes through the third point, (205, 40).
    const cross = (c[0] - d[0]) * (40 - d[1]) - (c[1] - d[1]) * (205 - d[0]);
    expect(cross).toBeCloseTo(0, 6);
  });

  it('is picked on its edges, and inside only when filled', () => {
    expect(tool.hitTest({ x: 200, y: 10 }, level, unitViewport, 3)).toBe(true);
    expect(tool.hitTest({ x: 305, y: 30 }, level, unitViewport, 3)).toBe(true);
    expect(tool.hitTest({ x: 200, y: 30 }, level, unitViewport, 3)).toBe(false);
    const filled = drawing('rotatedRectangle', level.anchors, { style: { color: '#fff', lineWidth: 1, lineStyle: 'solid', fillColor: '#4c8dff' } });
    expect(tool.hitTest({ x: 200, y: 30 }, filled, unitViewport, 3)).toBe(true);
    expect(tool.hitTest({ x: 200, y: 70 }, filled, unitViewport, 3)).toBe(false);
  });

  it('holds its third handle in the middle of the far side', () => {
    expect(tool.hitTestAnchor({ x: 205, y: 10 }, level, unitViewport, 4)).toBe(2);
  });

  it('draws nothing it cannot: two points on one spot', () => {
    const { ctx } = recordingCtx();
    const dot = drawing('rotatedRectangle', [A, A, B]);
    expect(() => tool.render(ctx, dot, unitViewport, true)).not.toThrow();
    expect(tool.hitTest({ x: 105, y: 80 }, dot, unitViewport, 3)).toBe(false);
  });
});

describe('the three tools', () => {
  it('are among the built-in ones, each taking three points and a fill', () => {
    const manager = new DrawingManager();
    registerBuiltInDrawingTools(manager);
    for (const type of ['disjointChannel', 'flatTopBottom', 'rotatedRectangle'] as const) {
      const descriptor = manager.getDescriptor(type);
      expect(descriptor?.requiredAnchors).toBe(3);
      expect(descriptor?.fill).toBe(true);
    }
  });
});
