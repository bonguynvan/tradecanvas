import { describe, it, expect } from 'vitest';
import { FibChannelTool, fibChannelSegment, FIB_CHANNEL_LEVELS } from '../tools/FibChannel.js';
import { FibSpeedResistanceFanTool, speedFanTargets, SPEED_FAN_LEVELS } from '../tools/FibSpeedResistanceFan.js';
import { PitchforkTool, SchiffPitchforkTool, ModifiedSchiffPitchforkTool } from '../tools/Pitchfork.js';
import { withAlpha } from '@tradecanvas/commons';
import { FILL_ALPHA } from '../drawingLook.js';
import { defaultStyle, drawing, recordingCtx, unitViewport } from './fixtures.js';

describe('FibChannelTool', () => {
  const tool = new FibChannelTool();

  it('shifts the base line toward C by each level', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 100, y: 0 };
    const c = { x: 50, y: 20 };
    expect(fibChannelSegment(a, b, c, 1)).toEqual([{ x: 0, y: 20 }, { x: 100, y: 20 }]);
    expect(fibChannelSegment(a, b, c, 0.5)).toEqual([{ x: 0, y: 10 }, { x: 100, y: 10 }]);
    expect(fibChannelSegment(a, b, c, 0)).toEqual([a, b]);
  });

  // Base 80 → 80 over bars 0..20 (y=20), C at price 60 (y=40): width 20 px.
  const state = drawing('fibChannel', [
    { time: 0, price: 80 },
    { time: 20, price: 80 },
    { time: 10, price: 60 },
  ]);

  it('labels every level where they have room (a channel 160 px wide)', () => {
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, state, { ...unitViewport, chartRect: { x: 0, y: 0, width: 1000, height: 800 } }, false);
    // The 0 and 1 labels drawn first, then the others.
    expect([...texts].sort()).toEqual(FIB_CHANNEL_LEVELS.map(String).sort());
  });

  it('hits on a level line inside the channel', () => {
    expect(tool.hitTest({ x: 100, y: 30 }, state, unitViewport, 2)).toBe(true); // 0.5 level
    expect(tool.hitTest({ x: 100, y: 26.2 }, state, unitViewport, 1)).toBe(false); // between 0.236 (24.7) and 0.382 (27.6)
  });

  it('shows just the base line while C is still being placed', () => {
    const partial = drawing('fibChannel', state.anchors.slice(0, 2));
    const { ctx, texts, calls } = recordingCtx();
    tool.render(ctx, partial, unitViewport, false);
    expect(texts).toEqual([]);
    expect(calls.filter((c) => c.name === 'lineTo')).toHaveLength(1);
  });
});

describe('FibSpeedResistanceFanTool', () => {
  const tool = new FibSpeedResistanceFanTool();

  it('aims rays at price and time fractions plus the 1/1 diagonal', () => {
    const targets = speedFanTargets({ x: 0, y: 100 }, { x: 100, y: 0 });
    expect(targets).toHaveLength(1 + SPEED_FAN_LEVELS.length * 2);
    expect(targets).toContainEqual({ level: 0.5, kind: 'price', point: { x: 100, y: 50 } });
    expect(targets).toContainEqual({ level: 0.5, kind: 'time', point: { x: 50, y: 0 } });
  });

  // A at (5, 90), B at (105, 50).
  const state = drawing('fibSpeedResistanceFan', [{ time: 0, price: 10 }, { time: 10, price: 50 }]);

  it('labels the price levels', () => {
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, state, unitViewport, false);
    // Each level's price ray and its time ray.
    expect(texts).toEqual(SPEED_FAN_LEVELS.flatMap((v) => [String(v), String(v)]));
  });

  it('hits on a ray beyond B, since the rays extend', () => {
    // The diagonal continues from (105, 50) with slope -0.4: at x=155, y=30.
    expect(tool.hitTest({ x: 155, y: 30 }, state, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 5, y: 10 }, state, unitViewport, 2)).toBe(false);
  });
});

describe('Pitchfork variants', () => {
  // A (5, 50), B (105, 30), C (105, 70): median through (105, 50).
  const anchors = [
    { time: 0, price: 50 },
    { time: 10, price: 70 },
    { time: 10, price: 30 },
  ];

  it("Andrews' median starts at A", () => {
    const tool = new PitchforkTool();
    const state = drawing('pitchfork', anchors);
    expect(tool.hitTest({ x: 55, y: 50 }, state, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 55, y: 45 }, state, unitViewport, 2)).toBe(false);
  });

  it('Schiff starts the median halfway in price from A to B, at A’s time', () => {
    const tool = new SchiffPitchforkTool();
    const state = drawing('schiffPitchfork', anchors);
    // Origin (5, 40) → (105, 50): at x=55, y=45.
    expect(tool.descriptor.type).toBe('schiffPitchfork');
    expect(tool.hitTest({ x: 55, y: 45 }, state, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 55, y: 50 }, state, unitViewport, 1)).toBe(false);
  });

  it('Modified Schiff starts the median at the A–B midpoint', () => {
    const tool = new ModifiedSchiffPitchforkTool();
    const state = drawing('modifiedSchiffPitchfork', anchors);
    // Origin (55, 40) → (105, 50): at x=80, y=45.
    expect(tool.descriptor.type).toBe('modifiedSchiffPitchfork');
    expect(tool.hitTest({ x: 80, y: 45 }, state, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 80, y: 50 }, state, unitViewport, 1)).toBe(false);
  });

  it('draws a dashed connector from A to the shifted origin', () => {
    const { ctx, calls } = recordingCtx();
    new SchiffPitchforkTool().render(ctx, drawing('schiffPitchfork', anchors), unitViewport, false);
    expect(calls.find((c) => c.name === 'setLineDash')?.args[0]).toEqual([3, 3]);
    const { ctx: ctx2, calls: calls2 } = recordingCtx();
    new PitchforkTool().render(ctx2, drawing('pitchfork', anchors), unitViewport, false);
    expect(calls2.some((c) => c.name === 'setLineDash' && (c.args[0] as number[])[0] === 3)).toBe(false);
  });

  const tools = [
    ['pitchfork', new PitchforkTool()],
    ['schiffPitchfork', new SchiffPitchforkTool()],
    ['modifiedSchiffPitchfork', new ModifiedSchiffPitchforkTool()],
  ] as const;

  it.each(tools)('%s joins B and C with a line, so the fork reads as one shape', (type, tool) => {
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, drawing(type, anchors), unitViewport, false);
    const at = (args: unknown[], x: number, y: number) => {
      const [px, py] = args as number[];
      return Math.abs(px - x) < 1e-6 && Math.abs(py - y) < 1e-6;
    };
    // Stroked, not just the edge of the shade.
    const joined = calls.some((c, i) =>
      c.name === 'moveTo' && at(c.args, 105, 30) &&
      calls[i + 1]?.name === 'lineTo' && at(calls[i + 1].args, 105, 70) &&
      calls[i + 2]?.name === 'stroke');
    expect(joined).toBe(true);
  });

  it.each(tools)('%s shades between its tines in the line colour, under the lines', (type, tool) => {
    const { ctx, calls } = recordingCtx();
    const state = drawing(type, anchors);
    tool.render(ctx, state, unitViewport, false);
    const fill = calls.findIndex((c) => c.name === 'fill');
    const firstStroke = calls.findIndex((c) => c.name === 'stroke');
    expect(fill).toBeGreaterThanOrEqual(0);
    expect(fill).toBeLessThan(firstStroke);
    expect(ctx.fillStyle).toBe(withAlpha(state.style.color, FILL_ALPHA));
    expect(tool.descriptor.fill).toBe(true);
  });

  it('fills with a fill colour set by hand', () => {
    const { ctx } = recordingCtx();
    const state = drawing('pitchfork', anchors, { style: { ...defaultStyle, fillColor: 'rgba(255, 0, 0, 0.3)' } });
    new PitchforkTool().render(ctx, state, unitViewport, false);
    expect(ctx.fillStyle).toBe('rgba(255, 0, 0, 0.3)');
  });

  it('stops its lines at the edge of the plot', () => {
    const { ctx, calls } = recordingCtx();
    new PitchforkTool().render(ctx, drawing('pitchfork', anchors), unitViewport, false);
    const { width, height } = unitViewport.chartRect;
    for (const c of calls.filter((call) => call.name === 'lineTo')) {
      const [x, y] = c.args as number[];
      expect(x).toBeLessThanOrEqual(width + 1e-6);
      expect(y).toBeGreaterThanOrEqual(-1e-6);
      expect(y).toBeLessThanOrEqual(height + 1e-6);
    }
  });

  it('draws the handles after the fill and the lines', () => {
    const { ctx, calls } = recordingCtx();
    new SchiffPitchforkTool().render(ctx, drawing('schiffPitchfork', anchors), unitViewport, true);
    const firstArc = calls.findIndex((c) => c.name === 'arc');
    const lastLine = calls.map((c) => c.name).lastIndexOf('lineTo');
    expect(firstArc).toBeGreaterThan(calls.findIndex((c) => c.name === 'fill'));
    expect(firstArc).toBeGreaterThan(lastLine);
  });
});

describe('Pitchfork hit test follows what is drawn', () => {
  const state = drawing('pitchfork', [{ time: 10, price: 50 }, { time: 30, price: 80 }, { time: 40, price: 30 }]);
  it('a press on the B–C line picks the fork', () => {
    // A quarter of the way from B (305, 20) to C (405, 70): clear of the median and the tines.
    expect(new PitchforkTool().hitTest({ x: 330, y: 32.5 }, state, unitViewport, 4)).toBe(true);
  });
  it('a press past the plot, on where the median would run on, does not', () => {
    // The median from A (105, 50) through B–C's middle (355, 45), carried on past the plot's right edge.
    const k = (1100 - 105) / 250;
    expect(new PitchforkTool().hitTest({ x: 1100, y: 50 - 5 * k }, state, unitViewport, 4)).toBe(false);
  });
});
