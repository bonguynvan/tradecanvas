import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig, IndicatorDescriptor, IndicatorDrawing, IndicatorOutput, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { renderIndicatorDrawings } from '../indicatorDrawings.js';
import { IndicatorBase } from '../IndicatorBase.js';

interface Mark { op: 'stroke' | 'fill' | 'text'; color: string; points: { x: number; y: number }[]; rects: { x: number; y: number; w: number; h: number }[]; text?: string; at?: { x: number; y: number } }

/** Records each stroke, fill and text: its colour, the points and rectangles of its path. */
function recorder() {
  const marks: Mark[] = [];
  let points: Mark['points'] = [];
  let rects: Mark['rects'] = [];
  let fill = '';
  let stroke = '';
  const ctx = {
    set fillStyle(c: string) { fill = c; }, get fillStyle() { return fill; },
    set strokeStyle(c: string) { stroke = c; }, get strokeStyle() { return stroke; },
    lineWidth: 1, globalAlpha: 1, font: '', textAlign: 'left', textBaseline: 'top', lineCap: 'butt', lineJoin: 'miter',
    beginPath() { points = []; rects = []; },
    moveTo(x: number, y: number) { points.push({ x, y }); },
    lineTo(x: number, y: number) { points.push({ x, y }); },
    rect(x: number, y: number, w: number, h: number) { rects.push({ x, y, w, h }); },
    roundRect(x: number, y: number, w: number, h: number) { rects.push({ x, y, w, h }); },
    arc() {},
    closePath() {},
    fill() { marks.push({ op: 'fill', color: fill, points, rects }); },
    stroke() { marks.push({ op: 'stroke', color: stroke, points, rects }); },
    fillText(text: string, x: number, y: number) { marks.push({ op: 'text', color: fill, points: [], rects: [], text, at: { x, y } }); },
    measureText(text: string) { return { width: text.length * 6 }; },
    setLineDash() {},
    save() {}, restore() {},
  } as unknown as CanvasRenderingContext2D;
  return { ctx, marks };
}

// 10 px per bar from x 4 (bar 0's middle); values 0..100 over y 100..0; the pane 100 px wide.
const viewport = {
  visibleRange: { from: 0, to: 9 }, priceRange: { min: 0, max: 100 },
  barWidth: 8, barSpacing: 2, offset: 0, chartRect: { x: 0, y: 0, width: 100, height: 100 },
} as ViewportState;
const style = { colors: ['#first'], lineWidths: [1.5], opacity: 1 };
const draw = (drawings: IndicatorDrawing[]) => {
  const r = recorder();
  renderIndicatorDrawings(r.ctx, drawings, viewport, style, 11);
  return r.marks;
};

describe('lines an indicator draws', () => {
  it('runs between its two points, in its colour or the indicator\'s first', () => {
    const [mark] = draw([{ kind: 'line', from: { bar: 0, value: 50 }, to: { bar: 2, value: 70 }, color: '#line' }]);
    expect(mark).toMatchObject({ op: 'stroke', color: '#line' });
    expect(mark.points).toEqual([{ x: 4, y: 50 }, { x: 24, y: 30 }]);
    expect(draw([{ kind: 'line', from: { bar: 0, value: 50 }, to: { bar: 2, value: 70 } }])[0].color).toBe('#first');
  });

  it('carries on to the pane\'s edge on its own slope when extended', () => {
    const [mark] = draw([{ kind: 'line', from: { bar: 0, value: 50 }, to: { bar: 1, value: 51 }, extend: 'right' }]);
    const end = mark.points[mark.points.length - 1];
    expect(end.x).toBe(100);
    // One value up for every 10 px: 96 px past bar 0 is 9.6 up.
    expect(end.y).toBeCloseTo(100 - 59.6, 6);
  });

  it('is left out when it is off the bars in view, unless it reaches them', () => {
    const off = { kind: 'line' as const, from: { bar: -20, value: 50 }, to: { bar: -15, value: 50 } };
    expect(draw([off])).toEqual([]);
    expect(draw([{ ...off, extend: 'right' }])).toHaveLength(1);
  });
});

describe('boxes an indicator draws', () => {
  it('fills and borders the rectangle between its corners, whichever way they are given', () => {
    const marks = draw([{ kind: 'box', from: { bar: 3, value: 20 }, to: { bar: 1, value: 60 }, color: '#edge', fill: '#inside' }]);
    const inside = marks.find((m) => m.op === 'fill')!;
    const edge = marks.find((m) => m.op === 'stroke')!;
    expect(inside.color).toBe('#inside');
    expect(edge.color).toBe('#edge');
    expect(inside.rects[0]).toEqual({ x: 14, y: 40, w: 20, h: 40 });
  });

  it('writes its text inside it', () => {
    const marks = draw([{ kind: 'box', from: { bar: 1, value: 20 }, to: { bar: 6, value: 60 }, text: 'Zone' }]);
    const text = marks.find((m) => m.op === 'text')!;
    expect(text.text).toBe('Zone');
    expect(text.at!.x).toBeGreaterThan(14);
    expect(text.at!.y).toBeGreaterThan(40);
    expect(text.at!.y).toBeLessThan(80);
  });
});

describe('labels an indicator draws', () => {
  it('puts a bubble above its point, pointing down at it, with its text in it', () => {
    const marks = draw([{ kind: 'label', at: { bar: 5, value: 50 }, text: 'PH', color: '#bubble' }]);
    const text = marks.find((m) => m.op === 'text')!;
    expect(text.text).toBe('PH');
    expect(text.at!.y).toBeLessThan(50);
    const bubble = marks.filter((m) => m.op === 'fill' && m.color === '#bubble');
    // The box and its pointer, whose tip is the point.
    const tip = bubble.flatMap((m) => m.points).reduce((low, p) => (p.y > low.y ? p : low), { x: 0, y: -Infinity });
    expect(tip).toEqual({ x: 54, y: 50 });
  });

  it('puts it below when asked, pointing up', () => {
    const marks = draw([{ kind: 'label', at: { bar: 5, value: 50 }, text: 'PL', position: 'below' }]);
    expect(marks.find((m) => m.op === 'text')!.at!.y).toBeGreaterThan(50);
  });

  it('writes the text alone in its style "text", in its colour', () => {
    const marks = draw([{ kind: 'label', at: { bar: 5, value: 50 }, text: 'note', style: 'text', textColor: '#ink' }]);
    expect(marks.filter((m) => m.op === 'fill')).toEqual([]);
    expect(marks.find((m) => m.op === 'text')).toMatchObject({ color: '#ink', text: 'note' });
  });
});

describe('an indicator\'s drawings, drawn with it', () => {
  class Drawn extends IndicatorBase {
    descriptor: IndicatorDescriptor = { id: 'drawn', name: 'Drawn', placement: 'overlay', defaultConfig: {}, plots: [{ key: 'v', title: 'V', color: 0 }] };
    calculate(_data: DataSeries, _config: IndicatorConfig): IndicatorOutput {
      return { values: new Map(), series: [] };
    }
  }
  const output: IndicatorOutput = { values: new Map(), series: [], drawings: [{ kind: 'line', from: { bar: 0, value: 10 }, to: { bar: 1, value: 20 } }] };

  it('in front of the bars, not with the backgrounds behind them', () => {
    const plugin = new Drawn();
    const front = recorder();
    plugin.render(front.ctx, output, viewport, style, { theme: DARK_THEME });
    expect(front.marks.filter((m) => m.op === 'stroke' && m.points.length > 0)).toHaveLength(1);
    const behind = recorder();
    plugin.render(behind.ctx, output, viewport, style, { theme: DARK_THEME, layer: 'background' });
    expect(behind.marks).toEqual([]);
  });
});

describe('drawings, at the edges', () => {
  it('leave the context as found: the next indicator draws on it', () => {
    const r = recorder();
    let depth = 0;
    let deepest = 0;
    Object.assign(r.ctx, { save: () => { depth++; deepest = Math.max(deepest, depth); }, restore: () => { depth--; } });
    renderIndicatorDrawings(r.ctx, [{ kind: 'label', at: { bar: 5, value: 50 }, text: 'x' }, { kind: 'line', from: { bar: 0, value: 1 }, to: { bar: 1, value: 2 } }], viewport, style, 11);
    expect(deepest).toBe(1);
    expect(depth).toBe(0);
  });

  it('carry a line both ways, and from a point after its other', () => {
    const [both] = draw([{ kind: 'line', from: { bar: 4, value: 50 }, to: { bar: 5, value: 50 }, extend: 'both' }]);
    expect(both.points.map((p) => p.x)).toEqual([0, 100]);
    const [backwards] = draw([{ kind: 'line', from: { bar: 5, value: 50 }, to: { bar: 4, value: 60 }, extend: 'right' }]);
    // Carried on past `to`, which is to the left of `from`: to the pane's left edge.
    expect(backwards.points.at(-1)!.x).toBe(0);
  });

  it('turn a label under its point when there is no room above it', () => {
    const marks = draw([{ kind: 'label', at: { bar: 5, value: 98 }, text: 'top' }]);
    expect(marks.find((m) => m.op === 'text')!.at!.y).toBeGreaterThan(2);
  });

  it('keep a label a bar or two off the left edge, its bubble still in view', () => {
    const panned = { ...viewport, visibleRange: { from: 3, to: 9 }, offset: 30 } as ViewportState;
    const r = recorder();
    renderIndicatorDrawings(r.ctx, [{ kind: 'label', at: { bar: 1, value: 50 }, text: 'wide label' }], panned, style, 11);
    expect(r.marks.some((m) => m.op === 'text')).toBe(true);
  });

  it('keep a label at the right edge inside the pane, its pointer still on its point', () => {
    const marks = draw([{ kind: 'label', at: { bar: 9, value: 50 }, text: 'a long label' }]);
    const text = marks.find((m) => m.op === 'text')!;
    // 12 letters of 6 px and 10 px of room: 82 px wide, so its middle is 59 px from the right edge at most.
    expect(text.at!.x).toBeLessThanOrEqual(100 - 41);
    const tip = marks.flatMap((m) => m.points).reduce((low, p) => (p.y > low.y ? p : low), { x: 0, y: -Infinity });
    expect(tip).toEqual({ x: 94, y: 50 });
  });

  it('fade with the indicator', () => {
    const r = recorder();
    let alpha = 1;
    Object.defineProperty(r.ctx, 'globalAlpha', { get: () => alpha, set: (a: number) => { alpha = a; } });
    const seen: number[] = [];
    const stroke = r.ctx.stroke.bind(r.ctx);
    Object.assign(r.ctx, { stroke: () => { seen.push(alpha); stroke(); } });
    renderIndicatorDrawings(r.ctx, [{ kind: 'line', from: { bar: 0, value: 1 }, to: { bar: 1, value: 2 } }], viewport, { ...style, opacity: 0.5 }, 11);
    expect(seen).toEqual([0.5]);
  });

  it('pass over a shape that lacks a point, drawing the rest', () => {
    const broken = [{ kind: 'line', from: { bar: 0, value: 50 } }, { kind: 'label', text: 'no point' }] as unknown as IndicatorDrawing[];
    const marks = draw([...broken, { kind: 'line', from: { bar: 0, value: 50 }, to: { bar: 2, value: 70 } }]);
    expect(marks.filter((m) => m.op === 'stroke')).toHaveLength(1);
  });

  it('write a wide box\'s text in the part of it in view', () => {
    const marks = draw([{ kind: 'box', from: { bar: -50, value: 20 }, to: { bar: 4, value: 60 }, text: 'Zone' }]);
    const text = marks.find((m) => m.op === 'text')!;
    expect(text.at!.x).toBeGreaterThanOrEqual(0);
    expect(text.at!.x).toBeLessThanOrEqual(44);
  });
});
