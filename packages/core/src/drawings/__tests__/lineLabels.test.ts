import { describe, it, expect } from 'vitest';
import type { DrawingPlugin, DrawingState, DrawingStyle, ViewportState } from '@tradecanvas/commons';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';
import { TrendLineTool } from '../tools/TrendLine.js';
import { RayTool } from '../tools/Ray.js';
import { ExtendedLineTool } from '../tools/ExtendedLine.js';
import { InfoLineTool } from '../tools/InfoLine.js';
import { TrendAngleTool } from '../tools/TrendAngle.js';
import { ArrowTool } from '../tools/Arrow.js';
import { HorizontalLineTool } from '../tools/HorizontalLine.js';
import { HorizontalRayTool } from '../tools/HorizontalRay.js';
import { VerticalLineTool } from '../tools/VerticalLine.js';
import { RectangleTool } from '../tools/Rectangle.js';
import { FibRetracementTool } from '../tools/FibRetracement.js';
import { FibExtensionTool } from '../tools/FibExtension.js';
import { setDrawingKeepOut } from '../tools/labels.js';

/** `unitViewport`: bar i at x = i·10 + 5, price p at y = 100 − p. */
const x = (bar: number) => bar * 10 + 5;
const y = (price: number) => 100 - price;

function draw(tool: DrawingPlugin, state: DrawingState, viewport: ViewportState = unitViewport, selected = false) {
  const rec = recordingCtx();
  tool.render(rec.ctx, state, viewport, selected);
  return rec;
}

/** Where the text was put: the translate before its fillText, and the fillText's own offset. */
function placed(rec: ReturnType<typeof recordingCtx>, text: string) {
  const at = rec.calls.findIndex((c) => c.name === 'fillText' && c.args[0] === text);
  if (at < 0) return null;
  const before = rec.calls.slice(0, at);
  const translate = [...before].reverse().find((c) => c.name === 'translate');
  const rotate = [...before].reverse().find((c) => c.name === 'rotate');
  return {
    x: Number(translate?.args[0] ?? 0),
    y: Number(translate?.args[1] ?? 0),
    angle: Number(rotate?.args[0] ?? 0),
    offset: Number(rec.calls[at].args[2]),
  };
}

const flat = (style: Partial<DrawingStyle> = {}) =>
  drawing('trendLine', [{ time: 10, price: 50 }, { time: 30, price: 50 }], { style: { color: '#4c8dff', lineWidth: 1, lineStyle: 'solid', ...style } });

describe('text on lines', () => {
  it('lets every line tool, and the box, take a text', () => {
    for (const tool of [new TrendLineTool(), new RayTool(), new ExtendedLineTool(), new InfoLineTool(), new TrendAngleTool(), new ArrowTool(),
      new HorizontalLineTool(), new HorizontalRayTool(), new VerticalLineTool(), new RectangleTool()]) {
      expect(tool.descriptor.text, tool.descriptor.type).toBe(true);
    }
  });

  it('writes nothing more without a text', () => {
    expect(draw(new TrendLineTool(), flat()).texts).toEqual([]);
  });

  it('writes the text above the middle of the line by default', () => {
    const at = placed(draw(new TrendLineTool(), flat({ text: 'Breakout' })), 'Breakout')!;
    expect(at.x).toBeCloseTo((x(10) + x(30)) / 2);
    expect(at.y).toBeCloseTo(y(50));
    expect(at.angle).toBeCloseTo(0);
    expect(at.offset).toBeLessThan(0);
  });

  it('puts it at either end, on the line or under it', () => {
    const left = placed(draw(new TrendLineTool(), flat({ text: 'A', textAlign: 'left', textVAlign: 'bottom' })), 'A')!;
    expect(left.x).toBeCloseTo(x(10));
    expect(left.offset).toBeGreaterThan(0);
    const right = placed(draw(new TrendLineTool(), flat({ text: 'B', textAlign: 'right', textVAlign: 'middle' })), 'B')!;
    expect(right.x).toBeCloseTo(x(30));
    expect(right.offset).toBe(0);
  });

  it('follows the line’s slope and never reads upside down', () => {
    const rising = drawing('trendLine', [{ time: 30, price: 50 }, { time: 10, price: 30 }], { style: { color: '#fff', lineWidth: 1, lineStyle: 'solid', text: 'Up' } });
    const at = placed(draw(new TrendLineTool(), rising), 'Up')!;
    // Left end lower on screen than the right: the text climbs, read left to right.
    expect(at.angle).toBeCloseTo(Math.atan2(y(50) - y(30), x(30) - x(10)));
    expect(Math.abs(at.angle)).toBeLessThanOrEqual(Math.PI / 2);
  });

  it('writes along a vertical line, upward', () => {
    const line = drawing('verticalLine', [{ time: 10, price: 50 }], { style: { color: '#fff', lineWidth: 1, lineStyle: 'solid', text: 'FOMC' } });
    const at = placed(draw(new VerticalLineTool(), line), 'FOMC')!;
    expect(at.x).toBeCloseTo(x(10));
    expect(at.angle).toBeCloseTo(-Math.PI / 2);
  });

  it('writes on a horizontal line across the plot', () => {
    const line = drawing('horizontalLine', [{ time: 10, price: 40 }], { style: { color: '#fff', lineWidth: 1, lineStyle: 'solid', text: 'Support', textAlign: 'right' } });
    const at = placed(draw(new HorizontalLineTool(), line), 'Support')!;
    expect(at.y).toBeCloseTo(y(40));
    expect(at.x).toBeGreaterThan(900);
  });
});

describe('the price on a horizontal line, the time on a vertical one', () => {
  it('hides a horizontal line’s price when asked', () => {
    const shown = drawing('horizontalLine', [{ time: 10, price: 40 }]);
    expect(draw(new HorizontalLineTool(), shown).texts.length).toBe(1);
    const hidden = drawing('horizontalLine', [{ time: 10, price: 40 }], { options: { showPrice: false } });
    expect(draw(new HorizontalLineTool(), hidden).texts).toEqual([]);
    const ray = drawing('horizontalRay', [{ time: 10, price: 40 }], { options: { showPrice: false } });
    expect(draw(new HorizontalRayTool(), ray).texts).toEqual([]);
  });

  it('shows a vertical line’s time, in the chart’s words, when asked', () => {
    const viewport = { ...unitViewport, formatTime: (t: number) => `bar ${t}` };
    const off = drawing('verticalLine', [{ time: 12, price: 40 }]);
    expect(draw(new VerticalLineTool(), off, viewport).texts).toEqual([]);
    const on = drawing('verticalLine', [{ time: 12, price: 40 }], { options: { showTime: true } });
    expect(draw(new VerticalLineTool(), on, viewport).texts).toEqual(['bar 12']);
  });
});

describe('the box', () => {
  const box = (style: Partial<DrawingStyle> = {}) =>
    drawing('rectangle', [{ time: 10, price: 80 }, { time: 30, price: 40 }], { style: { color: '#fff', lineWidth: 1, lineStyle: 'solid', ...style } });

  it('writes its text inside, at the top in the middle by default', () => {
    const rec = recordingCtx();
    new RectangleTool().render(rec.ctx, box({ text: 'Range' }), unitViewport, false);
    const call = rec.calls.find((c) => c.name === 'fillText' && c.args[0] === 'Range')!;
    expect(Number(call.args[1])).toBeCloseTo((x(10) + x(30)) / 2);
    expect(Number(call.args[2])).toBeGreaterThan(y(80));
    expect(Number(call.args[2])).toBeLessThan((y(80) + y(40)) / 2);
  });

  it('has a handle at each corner and on each side', () => {
    const tool = new RectangleTool();
    const state = box();
    const mid = { x: (x(10) + x(30)) / 2, y: (y(80) + y(40)) / 2 };
    const at = (px: number, py: number) => tool.hitTestAnchor({ x: px, y: py }, state, unitViewport, 4);
    expect([at(x(10), y(80)), at(x(30), y(40)), at(x(10), y(40)), at(x(30), y(80))]).toEqual([0, 1, 2, 3]);
    expect([at(mid.x, y(80)), at(mid.x, y(40)), at(x(10), mid.y), at(x(30), mid.y)]).toEqual([4, 5, 6, 7]);
    // Each handle a ring.
    const drawn = draw(tool, state, unitViewport, true).calls.filter((c) => c.name === 'arc');
    expect(drawn).toHaveLength(8);
  });

  it('moves one side from its handle, and two from a corner', () => {
    const tool = new RectangleTool();
    const top = tool.moveHandle!(box(), 4, { time: 99, price: 90 });
    expect(top.anchors).toEqual([{ time: 10, price: 90 }, { time: 30, price: 40 }]);
    const right = tool.moveHandle!(box(), 7, { time: 35, price: 0 });
    expect(right.anchors).toEqual([{ time: 10, price: 80 }, { time: 35, price: 40 }]);
    const corner = tool.moveHandle!(box(), 2, { time: 8, price: 35 });
    expect(corner.anchors).toEqual([{ time: 8, price: 80 }, { time: 30, price: 35 }]);
  });
});

describe('Fibonacci extras', () => {
  const near = (value: unknown, to: number) => Math.abs(Number(value) - to) < 1e-6;
  const fib = (type: 'fibRetracement' | 'fibExtension', options = {}) =>
    drawing(type, type === 'fibRetracement'
      ? [{ time: 10, price: 20 }, { time: 30, price: 80 }]
      : [{ time: 10, price: 20 }, { time: 20, price: 80 }, { time: 30, price: 50 }], { options });
  const lineBetween = (rec: ReturnType<typeof recordingCtx>, from: { x: number; y: number }, to: { x: number; y: number }) =>
    rec.calls.some((c, i) => c.name === 'moveTo' && near(c.args[0], from.x) && near(c.args[1], from.y)
      && rec.calls[i + 1]?.name === 'lineTo' && near(rec.calls[i + 1].args[0], to.x) && near(rec.calls[i + 1].args[1], to.y));

  it('draws the trend line between its points unless turned off', () => {
    const a = { x: x(10), y: y(20) };
    const b = { x: x(30), y: y(80) };
    expect(lineBetween(draw(new FibRetracementTool(), fib('fibRetracement')), a, b)).toBe(true);
    expect(lineBetween(draw(new FibRetracementTool(), fib('fibRetracement', { trendLine: false })), a, b)).toBe(false);
    expect(lineBetween(draw(new FibExtensionTool(), fib('fibExtension')), a, { x: x(20), y: y(80) })).toBe(true);
  });

  it('draws every level in the drawing’s colour with one colour on', () => {
    const colours = (options = {}) => {
      const seen = new Set<string>();
      const { ctx } = recordingCtx();
      const spy = new Proxy(ctx, {
        set(target, key, value) {
          if (key === 'strokeStyle') seen.add(String(value));
          return Reflect.set(target, key, value);
        },
      });
      new FibRetracementTool().render(spy, fib('fibRetracement', { background: false, showLevels: false, showPrices: false, ...options }), unitViewport, false);
      return seen;
    };
    expect(colours().size).toBeGreaterThan(2);
    expect([...colours({ oneColor: true })]).toEqual(['#4c8dff']);
  });
});

describe('text kept where it reads', () => {
  it('writes a ray’s and an extended line’s text along what is drawn on the plot', () => {
    const ray = drawing('ray', [{ time: 10, price: 50 }, { time: 20, price: 50 }], { style: { color: '#fff', lineWidth: 1, lineStyle: 'solid', text: 'R', textAlign: 'right' } });
    expect(placed(draw(new RayTool(), ray), 'R')!.x).toBeCloseTo(1000);
    const ext = drawing('extendedLine', [{ time: 10, price: 50 }, { time: 20, price: 50 }], { style: { color: '#fff', lineWidth: 1, lineStyle: 'solid', text: 'E', textAlign: 'left' } });
    expect(placed(draw(new ExtendedLineTool(), ext), 'E')!.x).toBeCloseTo(0);
  });

  it('keeps a trend line’s text on screen when its points are off it', () => {
    const line = drawing('trendLine', [{ time: -50, price: 50 }, { time: 200, price: 50 }], { style: { color: '#fff', lineWidth: 1, lineStyle: 'solid', text: 'T' } });
    expect(placed(draw(new TrendLineTool(), line), 'T')!.x).toBeCloseTo(500);
  });

  it('reads bottom to top along a line a hair off upright, either way', () => {
    for (const dx of [0.2, -0.2]) {
      const near = drawing('trendLine', [{ time: 10, price: 80 }, { time: 10 + dx / 10, price: 20 }], { style: { color: '#fff', lineWidth: 1, lineStyle: 'solid', text: 'V' } });
      expect(placed(draw(new TrendLineTool(), near), 'V')!.angle).toBeLessThan(0);
    }
  });

  it('moves a horizontal line’s price out of its text’s way', () => {
    const line = drawing('horizontalLine', [{ time: 10, price: 40 }], { style: { color: '#fff', lineWidth: 1, lineStyle: 'solid', text: 'Support', textAlign: 'left' } });
    const rec = recordingCtx();
    setDrawingKeepOut([]);
    new HorizontalLineTool().render(rec.ctx, line, unitViewport, false);
    setDrawingKeepOut(null);
    const price = rec.calls.find((c) => c.name === 'fillText' && c.args[0] !== 'Support')!;
    // The text sits at the line's start, above it: the price goes elsewhere.
    expect(!(Number(price.args[1]) < 60 && Number(price.args[2]) <= y(40))).toBe(true);
  });

  it('starts a vertical line’s text above its time tag', () => {
    const viewport = { ...unitViewport, chartRect: { x: 0, y: 0, width: 1000, height: 400 }, formatTime: () => '12:00' };
    const line = drawing('verticalLine', [{ time: 10, price: 50 }], { options: { showTime: true }, style: { color: '#fff', lineWidth: 1, lineStyle: 'solid', text: 'L', textAlign: 'left' } });
    expect(placed(draw(new VerticalLineTool(), line, viewport), 'L')!.y).toBeLessThan(400 - 18);
  });

  it('skips a vertical line’s time when the time format fails', () => {
    const viewport = { ...unitViewport, formatTime: () => { throw new Error('bad'); } };
    const line = drawing('verticalLine', [{ time: 10, price: 50 }], { options: { showTime: true } });
    expect(() => draw(new VerticalLineTool(), line, viewport)).not.toThrow();
  });

  it('gives a small box’s side handle to the side, not the corner', () => {
    const small = drawing('rectangle', [{ time: 10, price: 52 }, { time: 11, price: 48 }]);
    // 10 px wide, 4 px tall: the right side's middle is nearer than any corner.
    expect(new RectangleTool().hitTestAnchor({ x: x(11), y: y(50) }, small, unitViewport, 8)).toBe(7);
  });
});
