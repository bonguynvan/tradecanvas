import { describe, it, expect } from 'vitest';
import type { IndicatorOutput, IndicatorPlot, IndicatorValue, ViewportState } from '@tradecanvas/commons';
import { drawnKeys, plotColor, renderPlots, valuePlots } from '../plots.js';
import { defineIndicator } from '../defineIndicator.js';
import { IndicatorEngine } from '../IndicatorEngine.js';

const out = (series: (IndicatorValue | null)[]): IndicatorOutput => ({
  values: new Map(series.flatMap((v, i) => (v ? [[i, v] as [number, IndicatorValue]] : []))),
  series,
});

interface Shape { kind: 'fill' | 'stroke'; color: string; points: { x: number; y: number }[]; rects: { x: number; y: number; w: number; h: number }[] }

/** Records each fill and stroke: its colour, the points and the rectangles of its path. */
function recorder() {
  const shapes: Shape[] = [];
  let points: Shape['points'] = [];
  let rects: Shape['rects'] = [];
  let fill = '';
  let stroke = '';
  const ctx = {
    set fillStyle(c: string) { fill = c; }, get fillStyle() { return fill; },
    set strokeStyle(c: string) { stroke = c; }, get strokeStyle() { return stroke; },
    lineWidth: 1, globalAlpha: 1, lineCap: 'butt', lineJoin: 'miter',
    beginPath() { points = []; rects = []; },
    moveTo(x: number, y: number) { points.push({ x, y }); },
    lineTo(x: number, y: number) { points.push({ x, y }); },
    arc(x: number, y: number) { points.push({ x, y }); },
    rect(x: number, y: number, w: number, h: number) { rects.push({ x, y, w, h }); },
    fillRect(x: number, y: number, w: number, h: number) { shapes.push({ kind: 'fill', color: fill, points: [], rects: [{ x, y, w, h }] }); },
    closePath() {},
    fill() { shapes.push({ kind: 'fill', color: fill, points, rects }); points = []; rects = []; },
    stroke() { shapes.push({ kind: 'stroke', color: stroke, points, rects }); points = []; },
    setLineDash() {},
    save() {}, restore() {},
  } as unknown as CanvasRenderingContext2D;
  return { ctx, shapes };
}

// 10 px per bar; prices 0..100 over y 0..100; a pane 100 px high from y 0.
const BARS = [0, 1, 2, 3].map((time) => ({ time, open: 50, high: 60, low: 40, close: 55, volume: 1 }));
const viewport = {
  visibleRange: { from: 0, to: 3 }, priceRange: { min: 0, max: 100 },
  barWidth: 8, barSpacing: 2, offset: 0, chartRect: { x: 0, y: 0, width: 40, height: 100 }, data: BARS,
} as ViewportState;
const style = { colors: ['#base', '#red', '#green'], lineWidths: [1.5], opacity: 1 };

describe('a plot coloured bar by bar (colorBy)', () => {
  const plot: IndicatorPlot = { key: 'v', title: 'V', color: 0, kind: 'histogram', colorBy: 'vc' };

  it('draws each bar in the colour its field names, a bar without one in its own', () => {
    const { ctx, shapes } = recorder();
    renderPlots(ctx, out([{ v: 10, vc: 1 }, { v: 20, vc: 2 }, { v: 30 }, { v: 40, vc: 1 }]), viewport, style, [plot]);
    const barsIn = (color: string) => shapes.filter((s) => s.color === color).reduce((n, s) => n + s.rects.length, 0);
    expect(barsIn('#red')).toBe(2);
    expect(barsIn('#green')).toBe(1);
    expect(barsIn('#base')).toBe(1);
  });

  it('reads a field that names no colour as its own colour', () => {
    const { ctx, shapes } = recorder();
    renderPlots(ctx, out([{ v: 10, vc: 7 }, { v: 20, vc: -1 }, { v: 30, vc: 0.5 }, null]), viewport, style, [plot]);
    expect(new Set(shapes.filter((s) => s.rects.length > 0).map((s) => s.color))).toEqual(new Set(['#base']));
  });

  it('gives a line segment the colour of the bar it ends on', () => {
    const { ctx, shapes } = recorder();
    const line: IndicatorPlot = { key: 'v', title: 'V', color: 0, colorBy: 'vc' };
    renderPlots(ctx, out([{ v: 10 }, { v: 20, vc: 1 }, { v: 30, vc: 1 }, { v: 40, vc: 2 }]), viewport, style, [line]);
    const colors = shapes.filter((s) => s.kind === 'stroke' && s.points.length > 0).map((s) => s.color);
    expect(colors).toContain('#red');
    expect(colors).toContain('#green');
    expect(colors).not.toContain('#base');
  });

  it('names the colour of the bar asked for, for legends', () => {
    expect(plotColor(plot, style, { v: 1, vc: 2 })).toBe('#green');
    expect(plotColor(plot, style, { v: 1 })).toBe('#base');
    expect(plotColor(plot, style, null)).toBe('#base');
  });
});

describe('a fill coloured bar by bar', () => {
  it('shades each stretch between two bars in the colour of the bar it ends on', () => {
    const { ctx, shapes } = recorder();
    const plots: IndicatorPlot[] = [{ key: 'a', title: 'A', color: 0 }, { key: 'b', title: 'B', color: 0 }];
    const series = out([{ a: 60, b: 40 }, { a: 60, b: 40, fc: 1 }, { a: 60, b: 40, fc: 2 }, { a: 60, b: 40, fc: 2 }]);
    renderPlots(ctx, series, viewport, style, plots, [{ between: ['a', 'b'], color: 0, colorBy: 'fc', opacity: 1 }]);
    const fills = shapes.filter((s) => s.kind === 'fill' && s.points.length > 0);
    const red = fills.filter((s) => s.color.startsWith('#red') || s.color.includes('red'));
    const green = fills.filter((s) => s.color.includes('green'));
    expect(red).toHaveLength(1);
    expect(green).toHaveLength(1);
    // Red covers bars 0 to 1, green bars 1 to 3: they meet at bar 1, no gap between.
    const xs = (s: Shape) => s.points.map((p) => p.x);
    expect(Math.max(...xs(red[0]))).toBe(Math.min(...xs(green[0])));
  });
});

describe('a background plot', () => {
  const plot: IndicatorPlot = { key: 'bg', title: 'Background', color: 0, kind: 'background', colorBy: 'bgc' };

  it('shades the whole height of the pane behind each bar with a value', () => {
    const { ctx, shapes } = recorder();
    renderPlots(ctx, out([{ bg: 1, bgc: 1 }, null, { bg: 1, bgc: 2 }, { bg: 1, bgc: 2 }]), viewport, style, [plot]);
    const rects = shapes.flatMap((s) => s.rects.map((r) => ({ ...r, color: s.color })));
    expect(rects).toHaveLength(3);
    expect(rects.every((r) => r.y === 0 && r.h === 100)).toBe(true);
    // Each bar's whole slot, so neighbours meet.
    expect(rects.every((r) => r.w === 10)).toBe(true);
    expect(rects.filter((r) => r.color === '#red')).toHaveLength(1);
  });

  it('is no value: not on the scale, not in the legend', () => {
    expect(drawnKeys({ plots: [plot, { key: 'v', title: 'V', color: 0 }] })).toEqual(['v']);
    expect(valuePlots([plot]).map((p) => p.key)).toEqual([]);
  });
});

describe('marks at the top or the bottom of a pane', () => {
  it('sit at the pane\'s edge, in a pane of its own as on the prices, and are not on the scale', () => {
    const top: IndicatorPlot = { key: 't', title: 'T', color: 0, kind: 'markers', position: 'top', shape: 'square' };
    const bottom: IndicatorPlot = { key: 'b', title: 'B', color: 0, kind: 'markers', position: 'bottom', shape: 'square' };
    for (const pricePane of [true, false]) {
      const { ctx, shapes } = recorder();
      renderPlots(ctx, out([{ t: 1, b: 1 }, null, null, null]), viewport, style, [top, bottom], [], pricePane);
      const ys = shapes.map((s) => s.points.reduce((sum, p) => sum + p.y, 0) / s.points.length);
      expect(ys[0]).toBeLessThan(15);
      expect(ys[1]).toBeGreaterThan(85);
      expect(drawnKeys({ plots: [top, bottom] }, pricePane)).toEqual([]);
    }
  });

  it('take true from defineIndicator in a pane of its own', () => {
    const plugin = defineIndicator({
      id: 'edges',
      name: 'Edges',
      plots: [{ key: 'x', title: 'X', color: 0, kind: 'markers', position: 'top' }],
      calculate: ({ bars }) => ({ x: bars.close.map((_, i) => i % 2 === 0) }),
    });
    const output = plugin.calculate(BARS, { id: 'edges', instanceId: 'e', params: {} });
    expect(output.series?.[0]?.x).toBe(1);
    expect(output.series?.[1]).toBeNull();
  });
});

describe('a fill in a colour that is see-through of its own', () => {
  it('keeps that colour\'s strength, times the fill\'s', () => {
    const { ctx, shapes } = recorder();
    const plots: IndicatorPlot[] = [{ key: 'a', title: 'A', color: 0 }, { key: 'b', title: 'B', color: 0 }];
    const series = out([{ a: 60, b: 40 }, { a: 60, b: 40 }, null, null]);
    renderPlots(ctx, series, viewport, { ...style, colors: ['#ff000080'] }, plots, [{ between: ['a', 'b'], color: 0, opacity: 0.5 }]);
    const fill = shapes.find((s) => s.kind === 'fill' && s.points.length > 0);
    expect(fill?.color).toBe('rgba(255, 0, 0, 0.251)');
  });
});

describe('colours an output names by itself (paletteBy)', () => {
  it('draw each bar in the palette colour its field names, over colorBy, else as colorBy says', () => {
    const { ctx, shapes } = recorder();
    const plot: IndicatorPlot = { key: 'v', title: 'V', color: 0, kind: 'histogram', colorBy: 'vc', paletteBy: 'vp' };
    const series = out([{ v: 1, vp: 0, vc: 1 }, { v: 2, vp: 1 }, { v: 3, vp: 9, vc: 2 }, { v: 4 }]);
    renderPlots(ctx, { ...series, palette: ['#00ffaa', '#aa00ff'] }, viewport, style, [plot]);
    const barsIn = (color: string) => shapes.filter((s) => s.color === color).reduce((n, s) => n + s.rects.length, 0);
    expect(barsIn('#00ffaa')).toBe(1);
    expect(barsIn('#aa00ff')).toBe(1);
    expect(barsIn('#green')).toBe(1);
    expect(barsIn('#base')).toBe(1);
    expect(plotColor(plot, style, { v: 1, vp: 1 }, ['#00ffaa', '#aa00ff'])).toBe('#aa00ff');
    expect(plotColor(plot, style, { v: 1, vp: 1 })).toBe('#base');
  });
});

describe('backgrounds are drawn behind', () => {
  const shaded = (id: string, placement: 'overlay' | 'panel') => defineIndicator({
    id,
    name: id,
    placement,
    plots: [
      { key: 'bg', title: 'Background', color: 1, kind: 'background' },
      { key: 'v', title: 'V', color: 0 },
    ],
    calculate: ({ bars }) => ({ bg: bars.close.map(() => 1), v: bars.close }),
  });

  it('on the prices: the backgrounds in a pass of their own, the rest without them', () => {
    const engine = new IndicatorEngine();
    engine.register(shaded('over', 'overlay'));
    engine.addIndicator('over', {}, BARS);
    const behind = recorder();
    for (const draw of engine.overlayDraws(viewport, undefined, 'background')) draw(behind.ctx);
    expect(behind.shapes.some((s) => s.rects.length > 0)).toBe(true);
    expect(behind.shapes.some((s) => s.kind === 'stroke' && s.points.length > 0)).toBe(false);
    const front = recorder();
    for (const draw of engine.overlayDraws(viewport)) draw(front.ctx);
    expect(front.shapes.some((s) => s.rects.length > 0)).toBe(false);
    expect(front.shapes.some((s) => s.kind === 'stroke' && s.points.length > 0)).toBe(true);
  });

  it('in a pane: the backgrounds asked for apart', () => {
    const engine = new IndicatorEngine();
    engine.register(shaded('pane', 'panel'));
    const id = engine.addIndicator('pane', {}, BARS);
    const behind = recorder();
    engine.renderPanel(behind.ctx, id, viewport, 'background');
    expect(behind.shapes.some((s) => s.rects.length > 0)).toBe(true);
    expect(behind.shapes.some((s) => s.kind === 'stroke' && s.points.length > 0)).toBe(false);
    const front = recorder();
    engine.renderPanel(front.ctx, id, viewport);
    expect(front.shapes.some((s) => s.rects.length > 0)).toBe(false);
  });

  it('an indicator with no background is drawn whole in the front pass, and not in the one behind', () => {
    const engine = new IndicatorEngine();
    engine.register(defineIndicator({ id: 'plain', name: 'Plain', placement: 'overlay', plots: [{ key: 'v', title: 'V', color: 0 }], calculate: ({ bars }) => ({ v: bars.close }) }));
    engine.addIndicator('plain', {}, BARS);
    expect(engine.overlayDraws(viewport, undefined, 'background')).toHaveLength(0);
    expect(engine.overlayDraws(viewport)).toHaveLength(1);
  });
});


describe('a fill coloured bar by bar, panned', () => {
  it('shades the stretch that ends on the first bar in view, from the bar before it', () => {
    const { ctx, shapes } = recorder();
    const plots: IndicatorPlot[] = [{ key: 'a', title: 'A', color: 0 }, { key: 'b', title: 'B', color: 0 }];
    const series = out([{ a: 60, b: 40, fc: 1 }, { a: 60, b: 40, fc: 1 }, { a: 60, b: 40, fc: 1 }, { a: 60, b: 40, fc: 1 }]);
    const panned = { ...viewport, visibleRange: { from: 1, to: 3 } } as ViewportState;
    renderPlots(ctx, series, panned, style, plots, [{ between: ['a', 'b'], color: 0, colorBy: 'fc', opacity: 1 }]);
    const fill = shapes.find((s) => s.kind === 'fill' && s.points.length > 0)!;
    // Its left edge is bar 0's x, off the view's left: no gap at the edge.
    expect(Math.min(...fill.points.map((p) => p.x))).toBe(4);
  });
});
