import { describe, it, expect } from 'vitest';
import { DARK_THEME, LIGHT_THEME, type Bar3DChartOptions, type SurfaceChartOptions } from '@tradecanvas/commons';
import { computeScene3D, resolveView, sceneDepth, sceneX, sceneY, type Axis3D, type Scene3D } from '../scene3d.js';
import { MAX_SURFACE_POINTS, computeSurfaceLayout, depthSurface, hitSurfacePoint, renderSurface, type SurfaceLayout } from '../SurfaceRenderer.js';
import { MAX_BAR3D_SIZE, computeBar3DLayout, hitBar3D, renderBar3D } from '../Bar3DRenderer.js';
import { rampColor, resolveColorRamp } from '../colorScale.js';

interface Shape {
  kind: 'fill' | 'stroke';
  points: number[];
  style: string;
  alpha: number;
}

/** A canvas stand-in that keeps the text, the paths and the rectangles drawn with it. */
function recorder(): { ctx: CanvasRenderingContext2D; texts: string[]; shapes: Shape[]; rects: number[][] } {
  const texts: string[] = [];
  const shapes: Shape[] = [];
  const rects: number[][] = [];
  let path: number[] = [];
  const state: Record<string | symbol, unknown> = { font: '10px sans-serif', fillStyle: '', strokeStyle: '', globalAlpha: 1 };
  const ctx = new Proxy(state, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return (t: string) => ({ width: String(t).length * 6 });
      return (...args: unknown[]) => {
        if (prop === 'beginPath') path = [];
        if (prop === 'moveTo' || prop === 'lineTo') path.push(Number(args[0]), Number(args[1]));
        if (prop === 'fill') shapes.push({ kind: 'fill', points: [...path], style: String(target.fillStyle), alpha: Number(target.globalAlpha) });
        if (prop === 'stroke') shapes.push({ kind: 'stroke', points: [...path], style: String(target.strokeStyle), alpha: Number(target.globalAlpha) });
        if (prop === 'fillRect') rects.push(args.map(Number));
        if (prop === 'fillText') texts.push(String(args[0]));
      };
    },
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts, shapes, rects };
}

/** As the stand-in measures: 6 px a character. */
const measure = (text: string) => text.length * 6;
const W = 480;
const H = 360;
const plain = (v: number) => String(Number(v.toFixed(4)));
const AREA = { x: 0, y: 0, width: W, height: H };

const ticks = (texts: string[]): Axis3D => ({ ticks: texts.map((text, i) => ({ at: texts.length === 1 ? 0.5 : i / (texts.length - 1), text })) });
const AXES = { x: { ...ticks(['90', '100', '110']), title: 'Strike' }, y: { ...ticks(['30', '60', '90']), title: 'Days' }, z: { ...ticks(['0.1', '0.2', '0.3']), title: 'IV' } };

/** The eight corners of the box, on the screen. */
function corners(scene: Scene3D): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (const u of [0, 1]) for (const v of [0, 1]) for (const h of [0, 1]) out.push({ x: sceneX(scene, u, v), y: sceneY(scene, u, v, h) });
  return out;
}

/** Whether two lists of points hold the same points, in any order. */
function samePoints(a: readonly number[], b: readonly number[]): boolean {
  const key = (p: readonly number[]) => Array.from({ length: p.length / 2 }, (_, i) => `${p[i * 2].toFixed(3)},${p[i * 2 + 1].toFixed(3)}`).sort().join(' ');
  return a.length === b.length && key(a) === key(b);
}

describe('where a 3D chart is seen from', () => {
  it('is a quarter turn off the corner and a little above the floor when nothing says', () => {
    expect(resolveView()).toEqual({ yaw: -35, pitch: 28 });
    expect(resolveView({ pitch: 40 })).toEqual({ yaw: -35, pitch: 40 });
  });

  it('holds the pitch between the floor and straight above, and the yaw to one turn', () => {
    expect(resolveView({ yaw: 0, pitch: -10 }).pitch).toBe(0);
    expect(resolveView({ yaw: 0, pitch: 120 }).pitch).toBe(90);
    expect(resolveView({ yaw: 370, pitch: 10 }).yaw).toBeCloseTo(10, 9);
    expect(resolveView({ yaw: -190, pitch: 10 }).yaw).toBeCloseTo(170, 9);
    expect(resolveView({ yaw: 180, pitch: 10 }).yaw).toBeCloseTo(180, 9);
  });

  it('takes an angle that is no number as its default', () => {
    expect(resolveView({ yaw: Number.NaN, pitch: Number.POSITIVE_INFINITY })).toEqual({ yaw: -35, pitch: 28 });
  });
});

describe('a 3D chart’s box on the screen', () => {
  it('has x across and the values up when seen level from the front, the y axis end on', () => {
    const scene = computeScene3D(AREA, { yaw: 0, pitch: 0 }, AXES, measure);
    expect(sceneX(scene, 1, 0)).toBeGreaterThan(sceneX(scene, 0, 0));
    expect(sceneY(scene, 0, 0, 1)).toBeLessThan(sceneY(scene, 0, 0, 0));
    expect(sceneX(scene, 0.3, 1)).toBeCloseTo(sceneX(scene, 0.3, 0), 9);
    expect(sceneY(scene, 0.3, 1, 0.5)).toBeCloseTo(sceneY(scene, 0.3, 0, 0.5), 9);
  });

  it('has the y axis up the screen and the values end on when seen from straight above', () => {
    const scene = computeScene3D(AREA, { yaw: 0, pitch: 90 }, AXES, measure);
    expect(sceneY(scene, 0, 1, 0)).toBeLessThan(sceneY(scene, 0, 0, 0));
    expect(sceneY(scene, 0.5, 0.5, 1)).toBeCloseTo(sceneY(scene, 0.5, 0.5, 0), 9);
  });

  it('stays in its room at every turn and tilt, its labels with it', () => {
    for (let yaw = -180; yaw < 180; yaw += 15) {
      for (const pitch of [0, 15, 28, 60, 90]) {
        const scene = computeScene3D(AREA, { yaw, pitch }, AXES, measure);
        for (const corner of corners(scene)) {
          expect(corner.x).toBeGreaterThanOrEqual(-0.5);
          expect(corner.x).toBeLessThanOrEqual(W + 0.5);
          expect(corner.y).toBeGreaterThanOrEqual(-0.5);
          expect(corner.y).toBeLessThanOrEqual(H + 0.5);
        }
        for (const label of scene.labels) {
          const width = label.angle === 0 ? measure(label.text) : 0;
          const left = label.align === 'left' ? label.x : label.align === 'right' ? label.x - width : label.x - width / 2;
          expect(left, `${label.text} at yaw ${yaw}, pitch ${pitch}`).toBeGreaterThanOrEqual(-0.5);
          expect(left + width, `${label.text} at yaw ${yaw}, pitch ${pitch}`).toBeLessThanOrEqual(W + 0.5);
          expect(label.y).toBeGreaterThanOrEqual(0);
          expect(label.y).toBeLessThanOrEqual(H);
        }
      }
    }
  });

  it('is the same size at every turn, so it does not swell and shrink as it is turned', () => {
    const sizes = [-170, -35, 0, 45, 90, 133].map((yaw) => computeScene3D(AREA, { yaw, pitch: 28 }, AXES, measure).scale);
    for (const size of sizes) expect(size).toBeCloseTo(sizes[0], 9);
    expect(sizes[0]).toBeGreaterThan(100);
  });

  it('knows which sides are at the back: the ones its grid is drawn on', () => {
    const near = computeScene3D(AREA, { yaw: -35, pitch: 28 }, AXES, measure);
    // The corner where both axes start is the nearest of the floor's four.
    const depths = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([u, v]) => sceneDepth(near, u, v, 0));
    expect(Math.min(...depths)).toBe(depths[0]);
    expect([near.uBack, near.vBack]).toEqual([1, 1]);
    const turned = computeScene3D(AREA, { yaw: 145, pitch: 28 }, AXES, measure);
    expect([turned.uBack, turned.vBack]).toEqual([0, 0]);
    const side = computeScene3D(AREA, { yaw: 35, pitch: 28 }, AXES, measure);
    expect([side.uBack, side.vBack]).toEqual([0, 1]);
  });

  it('writes the values to the left of its left edge, and each floor axis outside the floor', () => {
    const scene = computeScene3D(AREA, { yaw: -35, pitch: 28 }, AXES, measure);
    const left = Math.min(...corners(scene).map((c) => c.x));
    const bottom = Math.max(...corners(scene).map((c) => c.y));
    const values = scene.labels.filter((l) => ['0.1', '0.2', '0.3'].includes(l.text));
    expect(values).toHaveLength(3);
    for (const label of values) {
      expect(label.align).toBe('right');
      expect(label.x).toBeLessThan(left);
    }
    // The higher a value, the higher its label.
    expect(values.find((l) => l.text === '0.3')!.y).toBeLessThan(values.find((l) => l.text === '0.1')!.y);
    // The floor's ticks are under the floor's front edges: lower than the box's middle, and never above its top.
    const middle = sceneY(scene, 0.5, 0.5, 0.5);
    for (const text of ['90', '110', '30', '90']) {
      const label = scene.labels.find((l) => l.text === text)!;
      expect(label.y).toBeGreaterThan(middle);
      expect(label.y).toBeLessThanOrEqual(bottom + 30);
    }
  });

  it('turns each axis title along its axis, never upside down', () => {
    for (const yaw of [-150, -35, 20, 110]) {
      const scene = computeScene3D(AREA, { yaw, pitch: 28 }, AXES, measure);
      const titles = scene.labels.filter((l) => l.title);
      expect(titles.map((l) => l.text).sort()).toEqual(['Days', 'IV', 'Strike']);
      for (const title of titles) {
        expect(title.angle).toBeGreaterThanOrEqual(-Math.PI / 2 - 1e-9);
        expect(title.angle).toBeLessThanOrEqual(Math.PI / 2 + 1e-9);
      }
      // The values' title runs up the left edge.
      expect(titles.find((l) => l.text === 'IV')!.angle).toBeCloseTo(-Math.PI / 2, 9);
    }
  });

  it('leaves out a label that would run into one before it, and an axis seen end on', () => {
    const many: Axis3D = { ticks: Array.from({ length: 60 }, (_, i) => ({ at: i / 59, text: `tick ${i}` })) };
    const crowded = computeScene3D(AREA, { yaw: -35, pitch: 28 }, { ...AXES, x: many }, measure);
    const written = crowded.labels.filter((l) => l.text.startsWith('tick'));
    expect(written.length).toBeGreaterThan(1);
    expect(written.length).toBeLessThan(20);
    // From straight above the values' axis is a point: none of its labels is written.
    const above = computeScene3D(AREA, { yaw: -35, pitch: 90 }, AXES, measure);
    expect(above.labels.some((l) => ['0.1', '0.2', '0.3', 'IV'].includes(l.text))).toBe(false);
  });

  it('writes a floor axis’s last tick a line lower where it meets the lowest value’s, and leaves neither out', () => {
    // Turned so that the x axis runs up the left side and ends at the foot of the values' axis.
    const scene = computeScene3D(AREA, { yaw: -107, pitch: 44 }, AXES, measure);
    const written = scene.labels.filter((l) => !l.title).map((l) => l.text).sort();
    expect(written).toEqual(['0.1', '0.2', '0.3', '100', '110', '30', '60', '90', '90']);
  });

  it('draws nothing it cannot place in a room of no size', () => {
    const scene = computeScene3D({ x: 0, y: 0, width: 0, height: 0 }, undefined, AXES, measure);
    expect(Number.isFinite(scene.scale)).toBe(true);
    for (const corner of corners(scene)) expect(Number.isFinite(corner.x) && Number.isFinite(corner.y)).toBe(true);
  });
});

describe('colours from the lowest value to the highest', () => {
  it('are one hue by default, from near the ground to its strongest, over the values’ range', () => {
    for (const theme of [DARK_THEME, LIGHT_THEME]) {
      const ramp = resolveColorRamp([3, 1, Number.NaN, 5], theme);
      expect([ramp.min, ramp.max]).toEqual([1, 5]);
      expect(ramp.colors.length).toBeGreaterThanOrEqual(2);
      expect(rampColor(1, ramp)).not.toBe(rampColor(5, ramp));
      expect(rampColor(3, ramp)).not.toBe(rampColor(5, ramp));
    }
  });

  it('blend between the colours given, and keep the end colours past the ends', () => {
    const ramp = resolveColorRamp([0, 10], DARK_THEME, { colors: ['#000000', '#ffffff'] });
    expect(rampColor(0, ramp)).toBe('rgb(0,0,0)');
    expect(rampColor(5, ramp)).toBe('rgb(128,128,128)');
    expect(rampColor(10, ramp)).toBe('rgb(255,255,255)');
    expect(rampColor(-4, ramp)).toBe('rgb(0,0,0)');
    expect(rampColor(99, ramp)).toBe('rgb(255,255,255)');
    const three = resolveColorRamp([0, 10], DARK_THEME, { colors: ['#ff0000', '#000000', '#0000ff'] });
    expect(rampColor(5, three)).toBe('rgb(0,0,0)');
    expect(rampColor(7.5, three)).toBe('rgb(0,0,128)');
  });

  it('take a range of their own, and ignore one that is no number', () => {
    expect(resolveColorRamp([2, 4], DARK_THEME, { min: 0, max: 10 })).toMatchObject({ min: 0, max: 10 });
    expect(resolveColorRamp([2, 4], DARK_THEME, { min: Number.NaN, max: Number.POSITIVE_INFINITY })).toMatchObject({ min: 2, max: 4 });
    expect(resolveColorRamp([], DARK_THEME)).toMatchObject({ min: 0, max: 1 });
  });

  it('are darker or lighter by how a face is lit', () => {
    const ramp = resolveColorRamp([0, 10], DARK_THEME, { colors: ['#646464', '#646464'] });
    expect(rampColor(5, ramp, 1)).toBe('rgb(100,100,100)');
    expect(rampColor(5, ramp, 0.5)).toBe('rgb(50,50,50)');
    // Past full light a colour goes towards white, never past it.
    expect(rampColor(5, ramp, 1.2)).toBe('rgb(131,131,131)');
  });

  it('change in steps between colours that cannot be read, one colour where one is given', () => {
    const named = resolveColorRamp([0, 10], DARK_THEME, { colors: ['red', 'blue'] });
    expect(rampColor(2, named)).toBe('red');
    expect(rampColor(8, named)).toBe('blue');
    const one = resolveColorRamp([0, 10], DARK_THEME, { colors: ['#102030'] });
    expect(rampColor(0, one)).toBe('rgb(16,32,48)');
    expect(rampColor(10, one)).toBe('rgb(16,32,48)');
    const flat = resolveColorRamp([4, 4], DARK_THEME, { colors: ['#000000', '#ffffff'] });
    expect(rampColor(4, flat)).toBe('rgb(128,128,128)');
  });
});

const SMILE: SurfaceChartOptions = {
  x: [90, 100, 110],
  y: [30, 60, 90],
  values: [
    [0.3, 0.2, 0.26],
    [0.28, 0.21, 0.25],
    [0.27, 0.22, 0.24],
  ],
  valueFormat: plain,
};

/** The corners of the cell whose first point is (column, row), on the screen. */
function cell(layout: SurfaceLayout, column: number, row: number): number[] {
  const n = layout.columns.length;
  const at = (c: number, r: number) => [layout.sx[r * n + c], layout.sy[r * n + c]];
  return [...at(column, row), ...at(column + 1, row), ...at(column + 1, row + 1), ...at(column, row + 1)];
}

describe('a surface chart’s layout', () => {
  it('places numbers by their value, and the values on a scale of round steps', () => {
    const layout = computeSurfaceLayout({ ...SMILE, x: [90, 95, 110] }, W, H, DARK_THEME, measure);
    expect(layout.columns).toEqual([0, 1, 2]);
    expect(layout.rows).toEqual([0, 1, 2]);
    expect(layout.us).toEqual([0, 0.25, 1]);
    expect(layout.vs).toEqual([0, 0.5, 1]);
    expect(layout.zScale.min).toBeLessThanOrEqual(0.2);
    expect(layout.zScale.max).toBeGreaterThanOrEqual(0.3);
    // The first row's first value, as a share of the scale.
    expect(layout.heights[0]).toBeCloseTo((0.3 - layout.zScale.min) / (layout.zScale.max - layout.zScale.min), 9);
    expect(layout.values[4]).toBe(0.21);
  });

  it('draws numbers by rising value, whatever order they came in', () => {
    const layout = computeSurfaceLayout({ ...SMILE, x: [110, 90, 100], y: [90, 30, 60] }, W, H, DARK_THEME, measure);
    expect(layout.columns).toEqual([1, 2, 0]);
    expect(layout.rows).toEqual([1, 2, 0]);
    expect(layout.xs).toEqual([90, 100, 110]);
    // values[1][1] is the point at x 90, y 30: the first drawn.
    expect(layout.values[0]).toBe(0.21);
  });

  it('spaces names evenly in the order given, and writes them along their axis', () => {
    const layout = computeSurfaceLayout({ ...SMILE, y: ['1W', '1M', '3M'] }, W, H, DARK_THEME, measure);
    expect(layout.vs).toEqual([0, 0.5, 1]);
    expect(layout.ys).toEqual(['1W', '1M', '3M']);
    expect(layout.scene!.labels.map((l) => l.text)).toEqual(expect.arrayContaining(['1W', '1M', '3M']));
  });

  it('leaves out a place along an axis that is no number, and holds a hole for a value that is none', () => {
    const layout = computeSurfaceLayout({ x: [90, Number.NaN, 110, 120], y: [30, 60], values: [[1, 9, 2, 3], [4, 9, Number.NaN]] }, W, H, DARK_THEME, measure);
    expect(layout.columns).toEqual([0, 2, 3]);
    expect([...layout.values]).toEqual([1, 2, 3, 4, Number.NaN, Number.NaN]);
    expect(Number.isNaN(layout.heights[4])).toBe(true);
  });

  it('thins a grid past what it can draw, keeping both ends', () => {
    const x = Array.from({ length: 500 }, (_, i) => i);
    const y = Array.from({ length: 300 }, (_, i) => i);
    const values = y.map((r) => x.map((c) => Math.sin(c / 40) + r / 300));
    const layout = computeSurfaceLayout({ x, y, values }, W, H, DARK_THEME, measure);
    expect(layout.columns.length).toBeLessThanOrEqual(MAX_SURFACE_POINTS);
    expect(layout.rows.length).toBeLessThanOrEqual(MAX_SURFACE_POINTS);
    expect(layout.columns.length).toBeGreaterThan(MAX_SURFACE_POINTS / 2);
    expect([layout.columns[0], layout.columns.at(-1)]).toEqual([0, 499]);
    expect([layout.rows[0], layout.rows.at(-1)]).toEqual([0, 299]);
  });

  it('takes a great many values without running out of stack', () => {
    const x = Array.from({ length: 2000 }, (_, i) => i);
    const y = Array.from({ length: 400 }, (_, i) => i);
    const values = y.map((r) => x.map((c) => (c * r) % 97));
    expect(() => computeSurfaceLayout({ x, y, values }, W, H, DARK_THEME, measure)).not.toThrow();
  });

  it('opens a scale around values that are all the same', () => {
    const layout = computeSurfaceLayout({ x: [1, 2], y: [1, 2], values: [[5, 5], [5, 5]] }, W, H, DARK_THEME, measure);
    expect(layout.zScale.max).toBeGreaterThan(layout.zScale.min);
    expect(layout.heights[0]).toBeGreaterThan(0);
    expect(layout.heights[0]).toBeLessThan(1);
  });

  it('has nothing to draw without two places along x, a place along y, or a value', () => {
    const none = [
      { x: [], y: [], values: [] },
      { x: [90], y: [30, 60], values: [[1], [2]] },
      { x: [90, 100], y: [], values: [] },
      { x: [90, 100], y: [30, 60], values: [[Number.NaN, Number.NaN], []] },
    ];
    for (const options of none) {
      const layout = computeSurfaceLayout(options, W, H, DARK_THEME, measure);
      expect(layout.scene).toBeNull();
      const { ctx, texts, shapes, rects } = recorder();
      renderSurface(ctx, W, H, options, DARK_THEME, { x: 200, y: 150 }, layout);
      expect(texts).toEqual([]);
      expect(shapes).toEqual([]);
      expect(rects).toEqual([[0, 0, W, H]]);
    }
  });

  it('takes the view it is given, and the colours’ range', () => {
    const layout = computeSurfaceLayout({ ...SMILE, view: { yaw: 20, pitch: 50 }, colorRamp: { min: 0, max: 1 } }, W, H, DARK_THEME, measure);
    expect(layout.scene!.view).toEqual({ yaw: 20, pitch: 50 });
    expect(layout.ramp).toMatchObject({ min: 0, max: 1 });
    expect(computeSurfaceLayout(SMILE, W, H, DARK_THEME, measure).ramp).toMatchObject({ min: 0.2, max: 0.3 });
  });
});

describe('a surface chart’s drawing', () => {
  it('fills each cell from the back to the front, so that what is near covers what is far', () => {
    const layout = computeSurfaceLayout(SMILE, W, H, DARK_THEME, measure);
    const { ctx, shapes } = recorder();
    renderSurface(ctx, W, H, SMILE, DARK_THEME, null, layout);
    const fills = shapes.filter((s) => s.kind === 'fill');
    const order = [[1, 1], [0, 1], [1, 0], [0, 0]].map(([c, r]) => fills.findIndex((s) => samePoints(s.points, cell(layout, c, r))));
    expect(order.every((i) => i >= 0)).toBe(true);
    // At the default view the corner where the axes start is nearest: its cell is the last.
    expect(order[0]).toBeLessThan(order[3]);
    expect(Math.max(...order)).toBe(order[3]);
    expect(Math.min(...order)).toBe(order[0]);
    // Turned half way round, the other corner is.
    const turned = computeSurfaceLayout({ ...SMILE, view: { yaw: 145, pitch: 28 } }, W, H, DARK_THEME, measure);
    const back = recorder();
    renderSurface(back.ctx, W, H, SMILE, DARK_THEME, null, turned);
    const turnedFills = back.shapes.filter((s) => s.kind === 'fill');
    const first = turnedFills.findIndex((s) => samePoints(s.points, cell(turned, 0, 0)));
    const last = turnedFills.findIndex((s) => samePoints(s.points, cell(turned, 1, 1)));
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(last);
  });

  it('colours a cell by its values, the highest in the last colour', () => {
    const options: SurfaceChartOptions = { x: [0, 1, 2], y: [0, 1], values: [[0, 0, 10], [0, 0, 10]], colorRamp: { colors: ['#000000', '#ffffff'] }, view: { yaw: 0, pitch: 90 } };
    const layout = computeSurfaceLayout(options, W, H, DARK_THEME, measure);
    const { ctx, shapes } = recorder();
    renderSurface(ctx, W, H, options, DARK_THEME, null, layout);
    const fills = shapes.filter((s) => s.kind === 'fill');
    const low = fills.find((s) => samePoints(s.points, cell(layout, 0, 0)))!;
    const high = fills.find((s) => samePoints(s.points, cell(layout, 1, 0)))!;
    const brightness = (style: string) => Number(style.match(/\d+/)![0]);
    expect(brightness(high.style)).toBeGreaterThan(brightness(low.style) + 60);
  });

  it('draws a sheet’s underside in its own shade, where it is seen from below', () => {
    // A wall that falls away from the eye: seen level it shows its underside, seen from above its top.
    const wall = { x: [0, 1], y: [0, 1], values: [[1, 1], [0, 0]], colorRamp: { colors: ['#808080', '#808080'] } };
    const brightness = (pitch: number) => {
      const options: SurfaceChartOptions = { ...wall, view: { yaw: 0, pitch } };
      const layout = computeSurfaceLayout(options, W, H, DARK_THEME, measure);
      const { ctx, shapes } = recorder();
      renderSurface(ctx, W, H, options, DARK_THEME, null, layout);
      return Number(shapes.find((s) => s.kind === 'fill' && samePoints(s.points, cell(layout, 0, 0)))!.style.match(/\d+/)![0]);
    };
    expect(brightness(10)).toBeLessThan(brightness(80) - 20);
  });

  it('puts an axis’s ticks on points of the data where its numbers have a format of their own', () => {
    // Times: a round number of milliseconds is no round time.
    const times = Array.from({ length: 24 }, (_, i) => 1_767_225_600_000 + i * 60_000);
    const clock = (ms: number) => new Date(ms).toISOString().slice(11, 16);
    const options: SurfaceChartOptions = { x: [1, 2, 3], y: times, values: times.map((_, r) => [r, r + 1, r + 2]), yFormat: clock };
    const layout = computeSurfaceLayout(options, W, H, DARK_THEME, measure);
    const written = layout.scene!.labels.map((l) => l.text).filter((text) => text.includes(':'));
    expect(written.length).toBeGreaterThan(2);
    expect(written).toEqual(expect.arrayContaining(['00:00', '00:23']));
    for (const text of written) expect(times.map(clock)).toContain(text);
    // Plain numbers keep to round ones.
    const plainAxis = computeSurfaceLayout({ ...options, yFormat: undefined, y: times.map((_, i) => i * 7) }, W, H, DARK_THEME, measure);
    expect(plainAxis.scene!.labels.map((l) => l.text)).toEqual(expect.arrayContaining(['50', '100', '150']));
  });

  it('writes the ends of the colours’ bar as the values’ axis writes its ticks', () => {
    const options: SurfaceChartOptions = { x: [1, 2], y: [1, 2], values: [[0.20353, 0.25], [0.26, 0.28647]] };
    const { ctx, texts } = recorder();
    renderSurface(ctx, W, H, { ...options, locale: 'en' }, DARK_THEME, null);
    expect(texts).toEqual(expect.arrayContaining(['0.204', '0.286']));
    expect(texts.some((t) => t.length > 5)).toBe(false);
  });

  it('draws no cell that has a hole at a corner', () => {
    const whole = recorder();
    renderSurface(whole.ctx, W, H, SMILE, DARK_THEME, null);
    const holed = recorder();
    const values = SMILE.values.map((row) => [...row]);
    values[1][1] = Number.NaN;
    renderSurface(holed.ctx, W, H, { ...SMILE, values }, DARK_THEME, null);
    // The middle point is a corner of all four cells.
    expect(whole.shapes.filter((s) => s.kind === 'fill').length - holed.shapes.filter((s) => s.kind === 'fill').length).toBe(4);
  });

  it('draws a wireframe’s cells in the chart’s ground, their lines in the values’ colours', () => {
    const options: SurfaceChartOptions = { ...SMILE, style: 'wireframe' };
    const layout = computeSurfaceLayout(options, W, H, DARK_THEME, measure);
    const { ctx, shapes } = recorder();
    renderSurface(ctx, W, H, options, DARK_THEME, null, layout);
    const index = shapes.findIndex((s) => s.kind === 'fill' && samePoints(s.points, cell(layout, 0, 0)));
    expect(shapes[index].style).toBe(DARK_THEME.background);
    expect(shapes[index + 1].kind).toBe('stroke');
    expect(shapes[index + 1].style).toMatch(/^rgb\(/);
  });

  it('draws slices one behind another, each filled down to the floor', () => {
    const options: SurfaceChartOptions = { ...SMILE, style: 'slices' };
    const layout = computeSurfaceLayout(options, W, H, DARK_THEME, measure);
    const { ctx, shapes } = recorder();
    renderSurface(ctx, W, H, options, DARK_THEME, null, layout);
    const scene = layout.scene!;
    const n = layout.columns.length;
    /** The part of row `r` between columns `c` and `c + 1`: its two points and the floor under them. */
    const part = (c: number, r: number) => [
      layout.sx[r * n + c], layout.sy[r * n + c],
      layout.sx[r * n + c + 1], layout.sy[r * n + c + 1],
      sceneX(scene, layout.us[c + 1], layout.vs[r]), sceneY(scene, layout.us[c + 1], layout.vs[r], 0),
      sceneX(scene, layout.us[c], layout.vs[r]), sceneY(scene, layout.us[c], layout.vs[r], 0),
    ];
    const fills = shapes.filter((s) => s.kind === 'fill');
    const rowsDrawn = [2, 1, 0].map((r) => fills.findIndex((s) => samePoints(s.points, part(0, r))));
    expect(rowsDrawn.every((i) => i >= 0)).toBe(true);
    // The first y is nearest at the default view: its slice is drawn last.
    expect(rowsDrawn[0]).toBeLessThan(rowsDrawn[1]);
    expect(rowsDrawn[1]).toBeLessThan(rowsDrawn[2]);
    // A slice has a line along its top: every point of its row, in one path.
    expect(shapes.some((s) => s.kind === 'stroke' && s.points.length === n * 2 && s.points[0] === layout.sx[0] && s.points[1] === layout.sy[0])).toBe(true);
  });

  it('draws one row as a slice: a sheet needs two', () => {
    const options: SurfaceChartOptions = { x: [1, 2, 3], y: [1], values: [[1, 3, 2]] };
    const layout = computeSurfaceLayout(options, W, H, DARK_THEME, measure);
    expect(layout.style).toBe('slices');
    const { ctx, shapes } = recorder();
    renderSurface(ctx, W, H, options, DARK_THEME, null, layout);
    expect(shapes.some((s) => s.kind === 'stroke' && s.points.length === 6)).toBe(true);
  });

  it('leaves the lines between cells out where the cells are too small for them', () => {
    const big = recorder();
    const coarse = computeSurfaceLayout(SMILE, W, H, DARK_THEME, measure);
    renderSurface(big.ctx, W, H, SMILE, DARK_THEME, null, coarse);
    const at = big.shapes.findIndex((s) => s.kind === 'fill' && samePoints(s.points, cell(coarse, 0, 0)));
    // A line of the mesh is not the cell's own colour.
    expect(big.shapes[at + 1].kind).toBe('stroke');
    expect(big.shapes[at + 1].style).not.toBe(big.shapes[at].style);

    const x = Array.from({ length: 120 }, (_, i) => i);
    const fine: SurfaceChartOptions = { x, y: x, values: x.map((r) => x.map((c) => Math.sin(c / 9) * Math.cos(r / 9))) };
    const layout = computeSurfaceLayout(fine, 240, 180, DARK_THEME, measure);
    const small = recorder();
    renderSurface(small.ctx, 240, 180, fine, DARK_THEME, null, layout);
    const cellAt = small.shapes.findIndex((s) => s.kind === 'fill' && samePoints(s.points, cell(layout, 0, 0)));
    expect(small.shapes[cellAt + 1].style).toBe(small.shapes[cellAt].style);
    // And with the mesh turned off.
    const off = recorder();
    const plainSheet = renderSurface(off.ctx, W, H, { ...SMILE, mesh: false }, DARK_THEME, null);
    const offAt = off.shapes.findIndex((s) => s.kind === 'fill' && samePoints(s.points, cell(plainSheet, 0, 0)));
    expect(off.shapes[offAt + 1].style).toBe(off.shapes[offAt].style);
  });

  it('draws the colours’ bar under the chart, unless it is turned off', () => {
    const on = recorder();
    const layout = renderSurface(on.ctx, W, H, SMILE, DARK_THEME, null);
    expect(layout.bar).not.toBeNull();
    // The ground, then the bar's steps.
    expect(on.rects.length).toBeGreaterThan(20);
    expect(on.texts).toEqual(expect.arrayContaining(['0.2', '0.3']));
    const off = recorder();
    const without = renderSurface(off.ctx, W, H, { ...SMILE, legend: false }, DARK_THEME, null);
    expect(without.bar).toBeNull();
    expect(off.rects).toEqual([[0, 0, W, H]]);
    // The chart has the room the bar took.
    expect(without.scene!.scale).toBeGreaterThan(layout.scene!.scale);
  });

  it('writes the axes’ names, and its numbers as the formats say', () => {
    const { ctx, texts } = recorder();
    renderSurface(ctx, W, H, { ...SMILE, xLabel: 'Strike', yLabel: 'Days', valueLabel: 'IV', xFormat: (v) => `K${v}`, yFormat: (v) => `${v}d`, valueFormat: (v) => `${Math.round(v * 100)}%` }, DARK_THEME, null);
    expect(texts).toEqual(expect.arrayContaining(['Strike', 'Days', 'IV', 'K90', 'K110', '30d', '90d']));
    expect(texts.some((t) => t.endsWith('%'))).toBe(true);
  });
});

describe('what the pointer is on, on a surface', () => {
  it('is the cell’s nearest point, with its place and its value', () => {
    // From straight above no cell covers another.
    const layout = computeSurfaceLayout({ ...SMILE, view: { yaw: -35, pitch: 90 } }, W, H, DARK_THEME, measure);
    const n = layout.columns.length;
    const middle = n + 1;
    for (const [c, r] of [[0, 0], [2, 0], [1, 1], [2, 2]]) {
      const k = r * n + c;
      // A little inside the surface from each point: on a cell that has it as a corner.
      const x = k === middle ? layout.sx[k] + 1.5 : layout.sx[k] + (layout.sx[middle] - layout.sx[k]) * 0.1;
      const y = k === middle ? layout.sy[k] + 1 : layout.sy[k] + (layout.sy[middle] - layout.sy[k]) * 0.1;
      const hit = hitSurfacePoint(layout, x, y);
      expect(hit?.point, `column ${c}, row ${r}`).toEqual({ x: SMILE.x[c], y: SMILE.y[r], value: SMILE.values[r][c], xIndex: c, yIndex: r });
      expect(hit!.px).toBe(layout.sx[k]);
      expect(hit!.py).toBe(layout.sy[k]);
    }
  });

  it('gives the indexes the options have, for an axis drawn in another order', () => {
    const layout = computeSurfaceLayout({ ...SMILE, x: [110, 90, 100] }, W, H, DARK_THEME, measure);
    // The nearest corner is the lowest point on the screen: the surface is straight above it.
    const hit = hitSurfacePoint(layout, layout.sx[0], layout.sy[0] - 4);
    expect(hit?.point).toMatchObject({ x: 90, xIndex: 1, value: 0.2 });
  });

  it('is nothing off the surface', () => {
    const layout = computeSurfaceLayout(SMILE, W, H, DARK_THEME, measure);
    expect(hitSurfacePoint(layout, 2, 2)).toBeNull();
    expect(hitSurfacePoint(layout, Number.NaN, 10)).toBeNull();
    expect(hitSurfacePoint(computeSurfaceLayout({ x: [], y: [], values: [] }, W, H, DARK_THEME, measure), 100, 100)).toBeNull();
  });

  it('is what is in front, where a ridge hides the points behind it', () => {
    // Seen from the front and low: the first row is a wall, the rows behind it lie on the floor.
    const options: SurfaceChartOptions = { x: [0, 1, 2], y: [0, 1, 2], values: [[1, 1, 1], [0, 0, 0], [0, 0, 0]], view: { yaw: 0, pitch: 10 } };
    const layout = computeSurfaceLayout(options, W, H, DARK_THEME, measure);
    const n = layout.columns.length;
    const behind = 2 * n + 1;
    const hit = hitSurfacePoint(layout, layout.sx[behind] + 2, layout.sy[behind]);
    expect(hit).not.toBeNull();
    expect(hit!.point.yIndex).not.toBe(2);
  });

  it('reads a slice by its filled part, the nearest slice first', () => {
    const options: SurfaceChartOptions = { ...SMILE, style: 'slices' };
    const layout = computeSurfaceLayout(options, W, H, DARK_THEME, measure);
    // Just under the top of the nearest slice's first point, which is its highest.
    const hit = hitSurfacePoint(layout, layout.sx[0] + 2, layout.sy[0] + 6);
    expect(hit?.point).toMatchObject({ xIndex: 0, yIndex: 0, value: 0.3 });
    // The slices behind are found where the nearest does not cover them.
    const n = layout.columns.length;
    const behind = hitSurfacePoint(layout, layout.sx[2 * n] + 2, layout.sy[2 * n] + 2);
    expect(behind?.point.yIndex).toBe(2);
  });

  it('is written out by the pointer: the place along each axis under its name, and the value', () => {
    const options: SurfaceChartOptions = { ...SMILE, xLabel: 'Strike', yLabel: 'Days', valueLabel: 'IV', xFormat: plain, yFormat: (v) => `${v}d` };
    const layout = computeSurfaceLayout(options, W, H, DARK_THEME, measure);
    const quiet = recorder();
    renderSurface(quiet.ctx, W, H, options, DARK_THEME, null, layout);
    const { ctx, texts } = recorder();
    const n = layout.columns.length;
    renderSurface(ctx, W, H, options, DARK_THEME, { x: layout.sx[n + 1] + 2, y: layout.sy[n + 1] - 2 }, layout);
    expect(texts.slice(quiet.texts.length)).toEqual(['IV: 0.21', 'Strike: 100', 'Days: 60d']);
    // With the readout off, nothing more than the chart.
    const off = recorder();
    renderSurface(off.ctx, W, H, { ...options, crosshair: false }, DARK_THEME, { x: layout.sx[n + 1] + 2, y: layout.sy[n + 1] - 2 }, layout);
    expect(off.texts).toEqual(quiet.texts);
  });

  it('names an axis that has no name by its letter', () => {
    const layout = computeSurfaceLayout(SMILE, W, H, DARK_THEME, measure);
    const { ctx, texts } = recorder();
    const n = layout.columns.length;
    renderSurface(ctx, W, H, SMILE, DARK_THEME, { x: layout.sx[n + 1] + 2, y: layout.sy[n + 1] - 2 }, layout);
    expect(texts.slice(-3)).toEqual(['0.21', 'x: 100', 'y: 60']);
  });
});

describe('an order book’s depth over time, as a surface', () => {
  const book = { time: 1000, bids: [{ price: 100, volume: 2 }, { price: 99, volume: 3 }], asks: [{ price: 101, volume: 1 }, { price: 102, volume: 4 }] };

  it('is the volume waiting from the best price out to each price', () => {
    expect(depthSurface([book], { levels: 4 })).toEqual({ x: [99, 100, 101, 102], y: [1000], values: [[5, 2, 1, 5]] });
  });

  it('is nothing between the best bid and the best ask', () => {
    const surface = depthSurface([book], { levels: 7 });
    expect(surface.x).toEqual([99, 99.5, 100, 100.5, 101, 101.5, 102]);
    expect(surface.values[0]).toEqual([5, 2, 2, 0, 1, 1, 5]);
  });

  it('reads a book whose levels are in any order, and passes over a level that is no number or has no volume', () => {
    const messy = {
      time: 1,
      bids: [{ price: 99, volume: 3 }, { price: 100, volume: 2 }, { price: Number.NaN, volume: 9 }, { price: 98.5, volume: -4 }],
      asks: [{ price: 102, volume: 4 }, { price: 101, volume: 1 }, { price: 101.5, volume: Number.NaN }],
    };
    expect(depthSurface([messy], { levels: 4 }).values).toEqual([[5, 2, 1, 5]]);
  });

  it('has one row of prices for every book: the widest of them', () => {
    const later = { time: 2000, bids: [{ price: 98, volume: 1 }], asks: [{ price: 104, volume: 2 }] };
    const surface = depthSurface([book, later], { levels: 7 });
    expect(surface.x).toEqual([98, 99, 100, 101, 102, 103, 104]);
    expect(surface.y).toEqual([1000, 2000]);
    expect(surface.values).toEqual([[5, 5, 2, 1, 5, 5, 5], [1, 0, 0, 0, 0, 0, 2]]);
  });

  it('keeps to the prices asked for, with at least two', () => {
    const surface = depthSurface([book], { levels: 3, from: 100, to: 102 });
    expect(surface.x).toEqual([100, 101, 102]);
    expect(surface.values).toEqual([[2, 1, 5]]);
    expect(depthSurface([book], { levels: 0 }).x).toHaveLength(2);
    expect(depthSurface([book], { levels: Number.NaN }).x.length).toBeGreaterThan(2);
  });

  it('is empty with no book, and all zeros for a book with no levels', () => {
    expect(depthSurface([])).toEqual({ x: [], y: [], values: [] });
    expect(depthSurface([{ time: 1, bids: [], asks: [] }])).toEqual({ x: [], y: [], values: [] });
    const surface = depthSurface([book, { time: 2, bids: [], asks: [] }], { levels: 4 });
    expect(surface.values[1]).toEqual([0, 0, 0, 0]);
  });

  it('draws as a surface chart’s slices', () => {
    const surface = depthSurface([book, { ...book, time: 2000 }], { levels: 12 });
    const { ctx, shapes } = recorder();
    renderSurface(ctx, W, H, { ...surface, style: 'slices' }, DARK_THEME, null);
    expect(shapes.filter((s) => s.kind === 'fill').length).toBeGreaterThan(20);
  });
});

const BARS: Bar3DChartOptions = {
  categories: ['Q1', 'Q2', 'Q3'],
  series: [
    { name: 'Stocks', values: [4, 6, 5] },
    { name: 'Bonds', values: [2, 3, 1] },
  ],
  valueFormat: plain,
};

describe('a chart of columns in 3D', () => {
  it('has a column for each value, drawn from the back to the front', () => {
    const layout = computeBar3DLayout(BARS, W, H, DARK_THEME, measure);
    expect(layout.bars).toHaveLength(6);
    // At the default view the first series' first column is nearest: the last drawn.
    expect(layout.bars.at(-1)!.hit).toEqual({ category: 'Q1', series: 'Stocks', value: 4, index: 0 });
    expect(layout.bars[0].hit).toEqual({ category: 'Q3', series: 'Bonds', value: 1, index: 2 });
    const turned = computeBar3DLayout({ ...BARS, view: { yaw: 145, pitch: 28 } }, W, H, DARK_THEME, measure);
    expect(turned.bars[0].hit).toMatchObject({ category: 'Q1', series: 'Stocks' });
  });

  it('gives a column its top and the two sides that face the eye, the sides darker than the top', () => {
    const layout = computeBar3DLayout(BARS, W, H, DARK_THEME, measure);
    for (const bar of layout.bars) {
      expect(bar.faces).toHaveLength(3);
      for (const face of bar.faces) expect(face.points).toHaveLength(8);
    }
    const { ctx, shapes } = recorder();
    renderBar3D(ctx, W, H, BARS, DARK_THEME, null, layout);
    const front = layout.bars.at(-1)!;
    const drawn = front.faces.map((face) => shapes.find((s) => s.kind === 'fill' && samePoints(s.points, face.points))!);
    expect(drawn.every(Boolean)).toBe(true);
    const top = drawn[2];
    expect(drawn[0].style).not.toBe(top.style);
    expect(drawn[1].style).not.toBe(top.style);
  });

  it('starts every column at zero, one under zero hanging from it', () => {
    const layout = computeBar3DLayout({ categories: ['a', 'b'], series: [{ name: 's', values: [5, -5] }] }, W, H, DARK_THEME, measure);
    expect(layout.zScale.min).toBeLessThanOrEqual(-5);
    expect(layout.zScale.max).toBeGreaterThanOrEqual(5);
    const [up, down] = ['a', 'b'].map((c) => layout.bars.find((b) => b.hit.category === c)!);
    // Their tops: the one above zero higher on the screen than the one hanging from zero.
    const topY = (bar: typeof up) => Math.min(...bar.faces[2].points.filter((_, i) => i % 2 === 1));
    expect(topY(up)).toBeLessThan(topY(down));
    // All positive: the scale still starts at zero.
    expect(computeBar3DLayout(BARS, W, H, DARK_THEME, measure).zScale.min).toBe(0);
  });

  it('draws the level of zero between the columns under it and the columns over it', () => {
    const options: Bar3DChartOptions = { categories: ['a', 'b', 'c'], series: [{ name: 's', values: [5, -5, 3] }] };
    const layout = computeBar3DLayout(options, W, H, DARK_THEME, measure);
    expect(layout.zero).toHaveLength(8);
    // The columns under zero are drawn first, whatever is nearest.
    expect(layout.bars.map((b) => b.hit.category)).toEqual(['b', 'c', 'a']);
    expect(layout.under).toBe(1);
    const { ctx, shapes } = recorder();
    renderBar3D(ctx, W, H, options, DARK_THEME, null, layout);
    const fills = shapes.filter((s) => s.kind === 'fill');
    const at = (points: number[]) => fills.findIndex((s) => samePoints(s.points, points));
    const level = at(layout.zero!);
    expect(level).toBeGreaterThan(at(layout.bars[0].faces[2].points));
    expect(level).toBeLessThan(at(layout.bars[1].faces[0].points));
    // With nothing under zero the floor is zero: no level of its own.
    const allUp = computeBar3DLayout(BARS, W, H, DARK_THEME, measure);
    expect(allUp.zero).toBeNull();
    expect(allUp.under).toBe(0);
  });

  it('shades a side whose colour it cannot read by drawing the shade over it', () => {
    const options: Bar3DChartOptions = { categories: ['a'], series: [{ name: 's', values: [5], color: 'teal' }] };
    const layout = computeBar3DLayout(options, W, H, DARK_THEME, measure);
    const { ctx, shapes } = recorder();
    renderBar3D(ctx, W, H, options, DARK_THEME, null, layout);
    const drawn = layout.bars[0].faces.map((face) => shapes.filter((s) => s.kind === 'fill' && samePoints(s.points, face.points)).map((s) => s.style));
    expect(drawn[0][0]).toBe('teal');
    expect(drawn[0][1]).toMatch(/^rgba\(0, ?0, ?0, ?0\.\d+\)$/);
    expect(drawn[1]).toHaveLength(2);
    // The top is fully lit: nothing over it.
    expect(drawn[2]).toEqual(['teal']);
  });

  it('has no column for a value that is none, and nothing to draw with no value at all', () => {
    const holed = computeBar3DLayout({ categories: ['a', 'b'], series: [{ name: 's', values: [1, Number.NaN] }, { name: 't', values: [2] }] }, W, H, DARK_THEME, measure);
    expect(holed.bars).toHaveLength(2);
    for (const options of [{ categories: [], series: [] }, { categories: ['a'], series: [] }, { categories: ['a'], series: [{ name: 's', values: [Number.NaN] }] }]) {
      const layout = computeBar3DLayout(options, W, H, DARK_THEME, measure);
      expect(layout.scene).toBeNull();
      const { ctx, texts, shapes, rects } = recorder();
      renderBar3D(ctx, W, H, options, DARK_THEME, { x: 200, y: 150 }, layout);
      expect(texts).toEqual([]);
      expect(shapes).toEqual([]);
      expect(rects).toEqual([[0, 0, W, H]]);
    }
  });

  it('draws no more columns along an axis than it has room for', () => {
    const categories = Array.from({ length: 300 }, (_, i) => `c${i}`);
    const layout = computeBar3DLayout({ categories, series: [{ name: 's', values: categories.map((_, i) => i + 1) }] }, W, H, DARK_THEME, measure);
    expect(layout.bars).toHaveLength(MAX_BAR3D_SIZE);
  });

  it('tells the column under the pointer, the one in front where two overlap', () => {
    const layout = computeBar3DLayout(BARS, W, H, DARK_THEME, measure);
    for (const bar of layout.bars) {
      // The middle of a column's top is its own unless a nearer column covers it.
      const hit = hitBar3D(layout, bar.top.x, bar.top.y);
      expect(hit).not.toBeNull();
      expect(layout.bars.indexOf(hit!)).toBeGreaterThanOrEqual(layout.bars.indexOf(bar));
    }
    const front = layout.bars.at(-1)!;
    expect(hitBar3D(layout, front.top.x, front.top.y)).toBe(front);
    expect(hitBar3D(layout, 1, 1)).toBeNull();
  });

  it('writes the column’s value by the pointer, and the series’ names over the chart', () => {
    const layout = computeBar3DLayout(BARS, W, H, DARK_THEME, measure);
    const quiet = recorder();
    renderBar3D(quiet.ctx, W, H, BARS, DARK_THEME, null, layout);
    expect(quiet.texts).toEqual(expect.arrayContaining(['Stocks', 'Bonds', 'Q1', 'Q3']));
    const front = layout.bars.at(-1)!;
    const { ctx, texts } = recorder();
    renderBar3D(ctx, W, H, BARS, DARK_THEME, front.top, layout);
    expect(texts.slice(quiet.texts.length)).toEqual(['Q1', 'Stocks: 4']);
    // One series needs no names over the chart.
    const one = recorder();
    renderBar3D(one.ctx, W, H, { ...BARS, series: [BARS.series[0]] }, DARK_THEME, null);
    expect(one.texts).not.toContain('Stocks');
    const off = recorder();
    renderBar3D(off.ctx, W, H, { ...BARS, crosshair: false }, DARK_THEME, front.top, layout);
    expect(off.texts).toEqual(quiet.texts);
  });

  it('colours a series by its own colour, or the palette’s in turn', () => {
    const layout = computeBar3DLayout({ ...BARS, series: [{ ...BARS.series[0], color: '#ff0000' }, BARS.series[1]] }, W, H, DARK_THEME, measure);
    expect(layout.bars.find((b) => b.hit.series === 'Stocks')!.color).toBe('#ff0000');
    expect(layout.bars.find((b) => b.hit.series === 'Bonds')!.color).not.toBe('#ff0000');
  });
});
