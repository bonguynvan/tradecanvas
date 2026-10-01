import { describe, it, expect } from 'vitest';
import { XABCDPatternTool, ABCDPatternTool, HeadAndShouldersTool } from '../tools/patterns.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

describe('XABCDPatternTool', () => {
  const tool = new XABCDPatternTool();
  // X 10, A 60, B 40, C 50, D 20.
  const anchors = [
    { time: 0, price: 10 },
    { time: 10, price: 60 },
    { time: 20, price: 40 },
    { time: 30, price: 50 },
    { time: 40, price: 20 },
  ];

  it('labels the points and the four harmonic ratios', () => {
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, drawing('xabcdPattern', anchors), unitViewport, false);
    for (const label of ['X', 'A', 'B', 'C', 'D']) expect(texts).toContain(label);
    expect(texts).toContain('0.400'); // XB = AB / XA = 20 / 50
    expect(texts).toContain('0.500'); // AC = BC / AB = 10 / 20
    expect(texts).toContain('3.000'); // BD = CD / BC = 30 / 10
    expect(texts).toContain('0.800'); // XD = AD / XA = 40 / 50
  });

  it('shows only the ratios whose points exist while being drawn', () => {
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, drawing('xabcdPattern', anchors.slice(0, 3)), unitViewport, false);
    expect(texts).toContain('0.400');
    expect(texts).not.toContain('0.500');
  });

  it('fills the XAB and BCD triangles once complete', () => {
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, drawing('xabcdPattern', anchors), unitViewport, false);
    expect(calls.filter((c) => c.name === 'fill')).toHaveLength(2);
  });

  it('hits on a leg, not off it', () => {
    const state = drawing('xabcdPattern', anchors);
    // X (5, 90) → A (105, 40): midpoint (55, 65).
    expect(tool.hitTest({ x: 55, y: 65 }, state, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 55, y: 20 }, state, unitViewport, 2)).toBe(false);
  });
});

describe('ABCDPatternTool', () => {
  it('shows the BC/AB and CD/BC ratios', () => {
    const tool = new ABCDPatternTool();
    const state = drawing('abcdPattern', [
      { time: 0, price: 20 },
      { time: 10, price: 60 },
      { time: 20, price: 35 },
      { time: 30, price: 75 },
    ]);
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, state, unitViewport, false);
    expect(texts).toContain('0.625'); // 25 / 40
    expect(texts).toContain('1.600'); // 40 / 25
  });

  it('reports a dash for a flat leg instead of dividing by zero', () => {
    const tool = new ABCDPatternTool();
    const state = drawing('abcdPattern', [
      { time: 0, price: 50 },
      { time: 10, price: 50 },
      { time: 20, price: 35 },
      { time: 30, price: 75 },
    ]);
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, state, unitViewport, false);
    expect(texts).toContain('—');
  });
});

describe('HeadAndShouldersTool', () => {
  const tool = new HeadAndShouldersTool();
  const anchors = [
    { time: 0, price: 30 },
    { time: 10, price: 60 }, // left shoulder
    { time: 20, price: 40 }, // neck
    { time: 30, price: 80 }, // head
    { time: 40, price: 42 }, // neck
    { time: 50, price: 62 }, // right shoulder
    { time: 60, price: 30 },
  ];

  it('needs seven pivots and names the shoulders and head', () => {
    expect(tool.descriptor.requiredAnchors).toBe(7);
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, drawing('headAndShoulders', anchors), unitViewport, false);
    expect(texts).toEqual(expect.arrayContaining(['Left Shoulder', 'Head', 'Right Shoulder']));
  });

  it('draws a dashed neckline through both neck points across the pattern', () => {
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, drawing('headAndShoulders', anchors), unitViewport, false);
    const dashIdx = calls.findIndex((c) => c.name === 'setLineDash' && (c.args[0] as number[])[0] === 6);
    expect(dashIdx).toBeGreaterThan(-1);
    const [move, line] = calls.slice(dashIdx).filter((c) => c.name === 'moveTo' || c.name === 'lineTo');
    // Neck points (205, 60) and (405, 58): slope -0.01 px/px.
    expect(move.args[0]).toBe(5);
    expect(move.args[1]).toBeCloseTo(62);
    expect(line.args[0]).toBe(605);
    expect(line.args[1]).toBeCloseTo(56);
  });
});
