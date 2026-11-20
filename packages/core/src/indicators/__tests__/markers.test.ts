import { describe, it, expect } from 'vitest';
import type { IndicatorOutput, IndicatorPlot, IndicatorPlugin, IndicatorValue, ViewportState } from '@tradecanvas/commons';
import { drawnKeys, renderPlots, valuePlots } from '../plots.js';
import { IndicatorEngine } from '../IndicatorEngine.js';
import { WilliamsFractalsIndicator } from '../overlay/WilliamsFractals.js';

/** An output over `BARS`: its values by their times as well as by index. */
const out = (series: (IndicatorValue | null)[]): IndicatorOutput => ({
  values: new Map(series.flatMap((v, i) => (v ? [[i, v] as [number, IndicatorValue]] : []))),
  series,
});

/** Records the shapes drawn: each path's points and the colour it was filled in. */
function recorder() {
  const shapes: { points: { x: number; y: number }[]; color: string }[] = [];
  let current: { x: number; y: number }[] = [];
  let fill = '';
  const ctx = {
    set fillStyle(c: string) { fill = c; }, get fillStyle() { return fill; },
    strokeStyle: '', lineWidth: 1, globalAlpha: 1,
    beginPath() { current = []; },
    moveTo(x: number, y: number) { current.push({ x, y }); },
    lineTo(x: number, y: number) { current.push({ x, y }); },
    arc(x: number, y: number) { current.push({ x, y }); },
    closePath() {},
    fill() { shapes.push({ points: current, color: fill }); current = []; },
    stroke() {},
    setLineDash() {},
  } as unknown as CanvasRenderingContext2D;
  return { ctx, shapes };
}

// 10 px per bar; prices 0..100 over y 0..100 (100 at the top).
const BARS = [
  { time: 0, open: 50, high: 60, low: 40, close: 55, volume: 1 },
  { time: 1, open: 50, high: 70, low: 30, close: 45, volume: 1 },
  { time: 2, open: 50, high: 80, low: 20, close: 50, volume: 1 },
];
const viewport = {
  visibleRange: { from: 0, to: 2 }, priceRange: { min: 0, max: 100 },
  barWidth: 8, barSpacing: 2, offset: 0, chartRect: { x: 0, y: 0, width: 30, height: 100 }, data: BARS,
} as ViewportState;
const style = { colors: ['#up', '#down'], lineWidths: [1.5], opacity: 1 };

const centre = (points: { x: number; y: number }[]) => ({
  x: points.reduce((s, p) => s + p.x, 0) / points.length,
  y: points.reduce((s, p) => s + p.y, 0) / points.length,
});

describe('a markers plot', () => {
  it('marks only the bars that have a value, at the value by default, as dots', () => {
    const { ctx, shapes } = recorder();
    renderPlots(ctx, out([null, { turn: 45 }, null]), viewport, style, [{ key: 'turn', title: 'Turn', color: 0, kind: 'markers' }]);
    const dots = shapes.flatMap((s) => s.points);
    // One mark: the dot's start and its centre, on the bar with a value.
    expect(shapes).toHaveLength(1);
    expect(dots.every((p) => Math.abs(p.y - 55) < 1e-9)).toBe(true);
  });

  it('puts a mark above the high or below the low of its bar, clear of it', () => {
    const above = recorder();
    renderPlots(above.ctx, out([{ up: 1 }, null, null]), viewport, style, [{ key: 'up', title: 'Up', color: 0, kind: 'markers', shape: 'triangleDown', position: 'aboveBar' }]);
    expect(above.shapes).toHaveLength(1);
    // The bar's high is at y 40: the mark is above it.
    expect(Math.max(...above.shapes[0].points.map((p) => p.y))).toBeLessThan(40);

    const below = recorder();
    renderPlots(below.ctx, out([null, null, { down: 1 }]), viewport, style, [{ key: 'down', title: 'Down', color: 0, kind: 'markers', shape: 'triangleUp', position: 'belowBar' }]);
    // The bar's low is at y 80: the mark is below it.
    expect(Math.min(...below.shapes[0].points.map((p) => p.y))).toBeGreaterThan(80);
  });

  it('marks at its value in a pane, where the scale is not prices, and counts there on the scale', () => {
    const plot: IndicatorPlot = { key: 'top', title: 'Top', color: 0, kind: 'markers', position: 'aboveBar' };
    const { ctx, shapes } = recorder();
    renderPlots(ctx, out([{ top: 50 }, null, null]), viewport, style, [plot], [], false);
    expect(centre(shapes[0].points).y).toBeCloseTo(50);
    expect(drawnKeys({ plots: [plot] }, false)).toEqual(['top']);
    expect(drawnKeys({ plots: [plot] }, true)).toEqual([]);
  });

  it('marks at its value when the viewport carries no bars, or not the bar its value is for', () => {
    const plot: IndicatorPlot = { key: 'top', title: 'Top', color: 0, kind: 'markers', position: 'aboveBar' };
    const bare = recorder();
    renderPlots(bare.ctx, out([{ top: 50 }, null, null]), { ...viewport, data: undefined }, style, [plot]);
    expect(centre(bare.shapes[0].points).y).toBeCloseTo(50);
    const other = recorder();
    const shifted: IndicatorOutput = { values: new Map([[99, { top: 50 }]]), series: [{ top: 50 }, null, null] };
    renderPlots(other.ctx, shifted, viewport, style, [plot]);
    expect(centre(other.shapes[0].points).y).toBeCloseTo(50);
  });

  it('keeps above above on an inverted scale', () => {
    const plot: IndicatorPlot = { key: 'top', title: 'Top', color: 0, kind: 'markers', position: 'aboveBar' };
    const { ctx, shapes } = recorder();
    // Inverted, the high of 60 is drawn at y 60 and the low under it on screen is above: the mark goes past the high, downward.
    renderPlots(ctx, out([{ top: 1 }, null, null]), { ...viewport, invertScale: true }, style, [plot]);
    expect(Math.min(...shapes[0].points.map((p) => p.y))).toBeGreaterThan(60);
  });

  it('draws its marks of one colour in one fill', () => {
    const { ctx, shapes } = recorder();
    renderPlots(ctx, out([{ v: 10 }, { v: 20 }, { v: 30 }]), viewport, style, [{ key: 'v', title: 'V', color: 0, kind: 'markers', shape: 'triangleUp' }]);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].points).toHaveLength(9);
  });

  it('points a triangle the way its shape says', () => {
    const up = recorder();
    renderPlots(up.ctx, out([{ v: 50 }, null, null]), viewport, style, [{ key: 'v', title: 'V', color: 0, kind: 'markers', shape: 'triangleUp' }]);
    const pts = up.shapes[0].points;
    // The tip of an up triangle is its highest point (the smallest y), alone.
    const top = Math.min(...pts.map((p) => p.y));
    expect(pts.filter((p) => p.y === top)).toHaveLength(1);
    const down = recorder();
    renderPlots(down.ctx, out([{ v: 50 }, null, null]), viewport, style, [{ key: 'v', title: 'V', color: 0, kind: 'markers', shape: 'triangleDown' }]);
    const bottom = Math.max(...down.shapes[0].points.map((p) => p.y));
    expect(down.shapes[0].points.filter((p) => p.y === bottom)).toHaveLength(1);
  });

  it('takes its down colour on a two-tone plot', () => {
    const { ctx, shapes } = recorder();
    const plot: IndicatorPlot = { key: 'turn', title: 'Turn', color: 0, kind: 'markers', tone: { field: 'dir' }, downColor: 1 };
    renderPlots(ctx, out([{ turn: 40, dir: 1 }, { turn: 60, dir: 0 }, null]), viewport, style, [plot]);
    expect(shapes.map((s) => s.color).sort()).toEqual(['#down', '#up']);
  });

  it('is left out of the values: scale, tags and lists, unless drawn at its value', () => {
    const plots: IndicatorPlot[] = [
      { key: 'value', title: 'MACD', color: 0 },
      { key: 'turn', title: 'Turn', color: 1, kind: 'markers' },
      { key: 'top', title: 'Top', color: 1, kind: 'markers', position: 'aboveBar' },
    ];
    expect(drawnKeys({ plots })).toEqual(['value', 'turn']);
    expect(valuePlots(plots).map((p) => p.key)).toEqual(['value']);
  });
});

describe('the axis tags of an indicator with markers', () => {
  it('tag its lines only', () => {
    const plugin: IndicatorPlugin = {
      descriptor: {
        id: 'turns', name: 'Turns', placement: 'panel', defaultConfig: {},
        plots: [{ key: 'value', title: 'Value', color: 0 }, { key: 'turn', title: 'Turn', color: 1, kind: 'markers' }],
      },
      calculate(data) {
        const values = new Map<number, IndicatorValue>();
        const series = data.map((bar) => {
          const v = { value: bar.close, turn: bar.close };
          values.set(bar.time, v);
          return v;
        });
        return { values, series };
      },
      render() {},
    };
    const engine = new IndicatorEngine();
    engine.register(plugin);
    const id = engine.addIndicator('turns', {}, BARS);
    expect(engine.getLatestValues(id).map((tag) => tag.value)).toEqual([BARS[2].close]);
  });
});

/** The box a mark's points fill. */
const bounds = (points: { x: number; y: number }[]) => {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys), top: Math.min(...ys), bottom: Math.max(...ys) };
};

describe('Williams Fractals', () => {
  const plots = new WilliamsFractalsIndicator().descriptor.plots!;

  it('marks a high with a triangle above its bar and a low with one below, clear of the wicks', () => {
    const up = recorder();
    // The bar's high of 70 is at y 30; its low of 30 at y 70.
    renderPlots(up.ctx, out([null, { up: 70 }, null]), viewport, style, plots);
    const drawn = (shapes: { points: { x: number; y: number }[] }[]) => shapes.filter((s) => s.points.length > 0);
    expect(drawn(up.shapes)).toHaveLength(1);
    expect(bounds(drawn(up.shapes)[0].points).bottom).toBeLessThan(30);
    const down = recorder();
    renderPlots(down.ctx, out([null, { down: 30 }, null]), viewport, style, plots);
    expect(bounds(drawn(down.shapes)[0].points).top).toBeGreaterThan(70);
  });

  it('draws marks as wide as the bars allow, not dots inside the wick', () => {
    const { ctx, shapes } = recorder();
    renderPlots(ctx, out([null, { up: 70 }, null]), viewport, style, plots);
    expect(bounds(shapes[0].points).width).toBeGreaterThanOrEqual(8);
  });
});

describe('a markers plot styled on its own', () => {
  const plot: IndicatorPlot = { key: 'v', title: 'V', color: 0, kind: 'markers', shape: 'triangleUp' };
  const draw = (own: { shape?: 'dot' | 'triangleUp' | 'triangleDown' | 'arrowUp' | 'arrowDown' | 'square' | 'diamond'; size?: number | 'auto' }) => {
    const { ctx, shapes } = recorder();
    renderPlots(ctx, out([null, { v: 50 }, null]), viewport, { ...style, plots: { v: own } }, [plot]);
    return shapes[0].points;
  };

  it('takes the size it is given, in pixels across, whatever the bars', () => {
    expect(bounds(draw({ size: 16 })).width).toBeCloseTo(16);
    expect(bounds(draw({ size: 'auto' })).width).toBeCloseTo(bounds(draw({})).width);
  });

  it('keeps a size it is given within reason', () => {
    expect(bounds(draw({ size: 500 })).width).toBeLessThanOrEqual(40);
    expect(bounds(draw({ size: 0.5 })).width).toBeGreaterThanOrEqual(2);
  });

  it('draws the shape its style picks over the one it declares, each within its size', () => {
    for (const shape of ['dot', 'triangleUp', 'triangleDown', 'arrowUp', 'arrowDown', 'square', 'diamond'] as const) {
      const box = bounds(draw({ shape, size: 20 }));
      // A dot is recorded by its start and centre only.
      if (shape === 'dot') continue;
      expect(box.width, shape).toBeLessThanOrEqual(20 + 1e-9);
      expect(box.height, shape).toBeLessThanOrEqual(20 + 1e-9);
      expect(Math.max(box.width, box.height), shape).toBeGreaterThanOrEqual(14);
    }
    // An arrow is not a triangle: its shaft adds points.
    expect(draw({ shape: 'arrowUp', size: 20 }).length).toBeGreaterThan(draw({ shape: 'triangleUp', size: 20 }).length);
    // Up points up: its single highest point is the tip.
    const arrow = draw({ shape: 'arrowUp', size: 20 });
    const top = Math.min(...arrow.map((p) => p.y));
    expect(arrow.filter((p) => p.y === top)).toHaveLength(1);
  });
});
