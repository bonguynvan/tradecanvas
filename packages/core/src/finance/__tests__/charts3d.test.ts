import { describe, it, expect } from 'vitest';
import { DARK_THEME, type Bar3DChartOptions, type SurfaceChartOptions } from '@tradecanvas/commons';
import { sceneDepth, sceneX, sceneY } from '../scene3d.js';
import { MAX_DEPTH_LEVELS, MAX_SURFACE_POINTS, TURNING_SURFACE_POINTS, computeSurfaceLayout, depthSurface, hitSurfacePoint, renderSurface, type SurfaceLayout } from '../SurfaceRenderer.js';
import { MAX_BAR3D_SIZE, computeBar3DLayout, hitBar3D, renderBar3D } from '../Bar3DRenderer.js';
import { H, W, measure, plain, recorder, redOf, samePoints } from './charts3dKit.js';

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

/**
 * Whether something `columns` and `rows` on from another is behind it as the
 * eye sees them: further along an axis without being nearer along the other.
 * `stepU` and `stepV` are how much further a step along each axis is; along
 * an axis seen from the side (no step), only what is in the same place can
 * be in front or behind. Drawn later, it would paint over what covers it.
 */
function isBehind(columns: number, rows: number, stepU: number, stepV: number): boolean {
  const along = (places: number, step: number) => (Math.abs(step) < 1e-9 ? (places === 0 ? 0 : Number.NaN) : places * step);
  const u = along(columns, stepU);
  const v = along(rows, stepV);
  return u >= 0 && v >= 0 && u + v > 0;
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

  it('thins a grid further where it is asked to, for a chart that is being turned', () => {
    const x = Array.from({ length: 500 }, (_, i) => i);
    const y = Array.from({ length: 90 }, (_, i) => i);
    const values = y.map((r) => x.map((c) => c + r));
    const layout = computeSurfaceLayout({ x, y, values }, W, H, DARK_THEME, measure, TURNING_SURFACE_POINTS);
    expect(layout.columns).toHaveLength(TURNING_SURFACE_POINTS);
    expect(layout.rows).toHaveLength(TURNING_SURFACE_POINTS);
    expect([layout.columns[0], layout.columns.at(-1), layout.rows[0], layout.rows.at(-1)]).toEqual([0, 499, 0, 89]);
    expect(TURNING_SURFACE_POINTS).toBeLessThan(MAX_SURFACE_POINTS);
    // A grid already that small is drawn whole.
    expect(computeSurfaceLayout(SMILE, W, H, DARK_THEME, measure, TURNING_SURFACE_POINTS).columns).toEqual([0, 1, 2]);
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

  it('has nothing to draw in a room whose size is no number, and nothing under the pointer there', () => {
    for (const [width, height] of [[Number.NaN, H], [W, Number.NaN], [-5, H], [W, 0]]) {
      const layout = computeSurfaceLayout(SMILE, width, height, DARK_THEME, measure);
      expect(layout.scene, `${width} × ${height}`).toBeNull();
      expect(hitSurfacePoint(layout, 10, 10)).toBeNull();
    }
  });

  it('places values as far apart as numbers go, and draws them', () => {
    const options: SurfaceChartOptions = { x: [0, 1], y: [0, 1], values: [[1e308, -1e308], [3, 4]] };
    const layout = computeSurfaceLayout(options, W, H, DARK_THEME, measure);
    expect([...layout.heights].every((h) => h >= 0 && h <= 1)).toBe(true);
    expect(layout.heights[0]).toBeGreaterThan(layout.heights[1]);
    const { ctx, shapes } = recorder();
    renderSurface(ctx, W, H, options, DARK_THEME, null, layout);
    expect(shapes.some((s) => s.kind === 'fill' && samePoints(s.points, cell(layout, 0, 0)))).toBe(true);
  });

  it('writes a place along an axis with two decimals more than its round steps have, however many it has', () => {
    // Evenly spaced by a sum: 100.02127659574468…
    const x = Array.from({ length: 48 }, (_, i) => 100 + i / 47);
    const layout = computeSurfaceLayout({ x, y: [1, 2], values: [x, x], locale: 'en' }, W, H, DARK_THEME, measure);
    expect(layout.format.x(x[1])).toBe('100.021');
    // A few points with long numbers, each of them a tick.
    const few = computeSurfaceLayout({ x: [100, 100 + 1 / 3, 100 + 2 / 3, 101], y: [1, 2], values: [[1, 2, 3, 4], [1, 2, 3, 4]], locale: 'en' }, W, H, DARK_THEME, measure);
    expect(few.scene!.labels.map((l) => l.text)).toEqual(expect.arrayContaining(['100.000', '100.333', '101.000']));
    // Numbers that are whole stay whole.
    expect(computeSurfaceLayout({ ...SMILE, locale: 'en' }, W, H, DARK_THEME, measure).format.x(90)).toBe('90');
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

  it('fills no cell after one that could cover it, at any turn or tilt', () => {
    const points = [0, 1, 2, 3];
    const bumpy: SurfaceChartOptions = { x: points, y: points, values: points.map((r) => points.map((c) => Math.sin(c * 1.7) * Math.cos(r * 1.3) + (c * r) / 9)) };
    for (const yaw of [-145, -90, -35, 0, 35, 90, 145, 180]) {
      for (const pitch of [0, 28, 60]) {
        const options = { ...bumpy, view: { yaw, pitch } };
        const layout = computeSurfaceLayout(options, W, H, DARK_THEME, measure);
        const scene = layout.scene!;
        const { ctx, shapes } = recorder();
        renderSurface(ctx, W, H, options, DARK_THEME, null, layout);
        const fills = shapes.filter((s) => s.kind === 'fill' && s.points.length === 8);
        const cells: [number, number][] = [];
        for (const fill of fills) {
          for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (samePoints(fill.points, cell(layout, c, r))) cells.push([c, r]);
        }
        expect(cells, `yaw ${yaw}, pitch ${pitch}`).toHaveLength(9);
        // How much further from the eye a step along each axis takes a cell.
        const stepU = sceneDepth(scene, 1, 0, 0) - sceneDepth(scene, 0, 0, 0);
        const stepV = sceneDepth(scene, 0, 1, 0) - sceneDepth(scene, 0, 0, 0);
        for (let late = 1; late < cells.length; late++) {
          for (let early = 0; early < late; early++) {
            const behind = isBehind(cells[late][0] - cells[early][0], cells[late][1] - cells[early][1], stepU, stepV);
            expect(behind, `yaw ${yaw}, pitch ${pitch}: cell ${cells[late]} after ${cells[early]}`).toBe(false);
          }
        }
      }
    }
  });

  it('draws slices from the furthest to the nearest at any turn', () => {
    const options: SurfaceChartOptions = { ...SMILE, style: 'slices' };
    for (const yaw of [-145, -90, -35, 0, 35, 90, 145, 180]) {
      const layout = computeSurfaceLayout({ ...options, view: { yaw, pitch: 28 } }, W, H, DARK_THEME, measure);
      const scene = layout.scene!;
      const { ctx, shapes } = recorder();
      renderSurface(ctx, W, H, options, DARK_THEME, null, layout);
      const n = layout.columns.length;
      // A slice's line along its top starts at its first point.
      const tops = shapes.filter((s) => s.kind === 'stroke' && s.points.length === n * 2);
      const rows = tops.map((top) => [0, 1, 2].find((r) => top.points[0] === layout.sx[r * n] && top.points[1] === layout.sy[r * n])!);
      expect([...rows].sort(), `yaw ${yaw}`).toEqual([0, 1, 2]);
      const depths = rows.map((r) => sceneDepth(scene, 0, layout.vs[r], 0));
      for (let i = 1; i < depths.length; i++) expect(depths[i], `yaw ${yaw}`).toBeLessThanOrEqual(depths[i - 1] + 1e-9);
    }
  });

  it('colours a cell by its values, the highest in the last colour', () => {
    const options: SurfaceChartOptions = { x: [0, 1, 2], y: [0, 1], values: [[0, 0, 10], [0, 0, 10]], colorRamp: { colors: ['#000000', '#ffffff'] }, view: { yaw: 0, pitch: 90 } };
    const layout = computeSurfaceLayout(options, W, H, DARK_THEME, measure);
    const { ctx, shapes } = recorder();
    renderSurface(ctx, W, H, options, DARK_THEME, null, layout);
    const fills = shapes.filter((s) => s.kind === 'fill');
    const low = fills.find((s) => samePoints(s.points, cell(layout, 0, 0)))!;
    const high = fills.find((s) => samePoints(s.points, cell(layout, 1, 0)))!;
    expect(redOf(high.style)).toBeGreaterThan(redOf(low.style) + 60);
  });

  it('draws a sheet’s underside in its own shade, where it is seen from below', () => {
    // A wall that falls away from the eye: seen level it shows its underside, seen from above its top.
    const wall = { x: [0, 1], y: [0, 1], values: [[1, 1], [0, 0]], colorRamp: { colors: ['#808080', '#808080'] } };
    const brightness = (pitch: number) => {
      const options: SurfaceChartOptions = { ...wall, view: { yaw: 0, pitch } };
      const layout = computeSurfaceLayout(options, W, H, DARK_THEME, measure);
      const { ctx, shapes } = recorder();
      renderSurface(ctx, W, H, options, DARK_THEME, null, layout);
      return redOf(shapes.find((s) => s.kind === 'fill' && samePoints(s.points, cell(layout, 0, 0)))!.style);
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

  it('reads no more prices than MAX_DEPTH_LEVELS, however many are asked for', () => {
    const surface = depthSurface([book], { levels: 1e9 });
    expect(surface.x).toHaveLength(MAX_DEPTH_LEVELS);
    expect(surface.values[0]).toHaveLength(MAX_DEPTH_LEVELS);
    expect([surface.x[0], surface.x.at(-1)]).toEqual([99, 102]);
  });

  it('takes a window given the wrong way round in order', () => {
    const surface = depthSurface([book], { levels: 3, from: 102, to: 100 });
    expect(surface.x).toEqual([100, 101, 102]);
    expect(surface.values).toEqual([[2, 1, 5]]);
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
    // The top is fully lit, a side less: by its light, and so by the colour it is drawn in.
    for (const bar of layout.bars) {
      expect(bar.faces[2].light).toBe(1);
      expect(bar.faces[0].light).toBeLessThan(1);
      expect(bar.faces[1].light).toBeLessThan(1);
    }
    expect(redOf(drawn[0].style)).toBeLessThan(redOf(top.style));
    expect(redOf(drawn[1].style)).toBeLessThan(redOf(top.style));
  });

  it('draws no column after one that could cover it, and finds the nearest first, at any turn', () => {
    const options: Bar3DChartOptions = { categories: ['a', 'b', 'c', 'd'], series: ['s', 't', 'u'].map((name, j) => ({ name, values: [1, 2, 3, 4].map((v) => v + j) })) };
    for (const yaw of [-145, -90, -35, 0, 35, 90, 145, 180]) {
      const layout = computeBar3DLayout({ ...options, view: { yaw, pitch: 28 } }, W, H, DARK_THEME, measure);
      const scene = layout.scene!;
      expect(layout.bars).toHaveLength(12);
      const stepU = sceneDepth(scene, 1, 0, 0) - sceneDepth(scene, 0, 0, 0);
      const stepV = sceneDepth(scene, 0, 1, 0) - sceneDepth(scene, 0, 0, 0);
      const place = (bar: (typeof layout.bars)[number]) => [bar.hit.index, ['s', 't', 'u'].indexOf(bar.hit.series)];
      for (let late = 1; late < layout.bars.length; late++) {
        for (let early = 0; early < late; early++) {
          const behind = isBehind(place(layout.bars[late])[0] - place(layout.bars[early])[0], place(layout.bars[late])[1] - place(layout.bars[early])[1], stepU, stepV);
          expect(behind, `yaw ${yaw}: ${layout.bars[late].hit.category}/${layout.bars[late].hit.series} after ${layout.bars[early].hit.category}/${layout.bars[early].hit.series}`).toBe(false);
        }
      }
      // The last drawn is on top where two overlap: the one a pointer on its own top finds.
      const nearest = layout.bars.at(-1)!;
      expect(hitBar3D(layout, nearest.top.x, nearest.top.y)).toBe(nearest);
    }
  });

  it('has nothing to draw in a room whose size is no number, and stands columns on values as far apart as numbers go', () => {
    expect(computeBar3DLayout(BARS, Number.NaN, H, DARK_THEME, measure).scene).toBeNull();
    expect(computeBar3DLayout(BARS, W, Number.NaN, DARK_THEME, measure).scene).toBeNull();
    const wide = computeBar3DLayout({ categories: ['a', 'b'], series: [{ name: 's', values: [1e308, -1e308] }] }, W, H, DARK_THEME, measure);
    expect(wide.bars).toHaveLength(2);
    for (const bar of wide.bars) for (const face of bar.faces) expect(face.points.every(Number.isFinite)).toBe(true);
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
