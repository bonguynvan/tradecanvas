import type { DepthLevel, DepthSnapshot, DepthSurface, SurfaceChartOptions, SurfacePoint, Theme } from '@tradecanvas/commons';
import { withAlpha } from '@tradecanvas/commons';
import { CHART_PAD, axisFormat, canvasMeasure, decimalsFor, drawTooltip, extent, fixedFormat, niceScale, readoutFormat, type Measure, type NiceScale, type Rect } from './chartKit.js';
import { BAR_LABEL_SIZE, COLOR_BAR_ROOM, colorBarLabelWidth, drawRangeBar, rampColor, resolveColorRamp, type ResolvedRamp } from './colorScale.js';
import { BOX_SIZE, computeScene3D, drawScene3D, drawSceneLabels, faceLight, inQuad, sceneX, sceneY, type Axis3D, type Scene3D } from './scene3d.js';

/** No more points along an axis are drawn than this: a grid past it is thinned, both ends kept. */
export const MAX_SURFACE_POINTS = 120;
/**
 * An axis of this many points or fewer has a tick at each of them. Past it,
 * ticks are on round numbers, or on some of the points where the numbers
 * have a format of their own: a round number of milliseconds is no round time.
 */
const MAX_POINT_TICKS = 8;
const AXIS_TICKS = 5;
const VALUE_TICKS = 4;
/** Cells smaller than this, px, have no lines between them: the lines would be all of them. */
const MIN_MESH_CELL = 6;
const MESH_ALPHA = 0.35;
/** The colours' bar is no shorter than this, px, where the chart has the room. */
const BAR_WIDTH = 180;
const BAR_GAP = 8;
const MARKER_RADIUS = 4;
/** The prices `depthSurface` reads a book at, when its options do not say. */
const DEPTH_LEVELS = 48;

type SurfaceStyle = NonNullable<SurfaceChartOptions['style']>;

export interface SurfaceLayout {
  /** The box on the screen; null with nothing to draw. */
  scene: Scene3D | null;
  /** How the values are drawn: a single row is drawn as a slice, whatever was asked for. */
  style: SurfaceStyle;
  /** The points drawn along x and y, as indexes into the options' `x` and `y`, in the order drawn. */
  columns: number[];
  rows: number[];
  /** What the options have at those indexes. */
  xs: (number | string)[];
  ys: (number | string)[];
  /** Where each is along its axis, 0 to 1. */
  us: number[];
  vs: number[];
  /** Row by row, a row of `columns.length`: the values, how far up the scale each is (NaN for a hole), and where it is on the screen. */
  values: Float64Array;
  heights: Float64Array;
  sx: Float64Array;
  sy: Float64Array;
  zScale: NiceScale;
  ramp: ResolvedRamp;
  /** Whether the lines between cells are drawn. */
  mesh: boolean;
  /** The colours' bar. */
  bar: Rect | null;
  /** How a place along x, along y and a value are written, and a value on the values' axis and the colours' bar. */
  format: { x: (value: number | string) => string; y: (value: number | string) => string; value: (value: number) => string; tick: (value: number) => string };
}

/** A surface's point under the pointer, and where it is on the screen. */
export interface SurfaceHit {
  point: SurfacePoint;
  px: number;
  py: number;
}

interface PlacedAxis {
  /** Indexes into the options' array, in the order drawn. */
  order: number[];
  at: number[];
  axis: Axis3D;
  format: (value: number | string) => string;
}

/** `order` thinned to MAX_SURFACE_POINTS, evenly, its first and its last kept. */
function thin(order: number[]): number[] {
  if (order.length <= MAX_SURFACE_POINTS) return order;
  const kept: number[] = [];
  for (let k = 0; k < MAX_SURFACE_POINTS; k++) kept.push(order[Math.round((k * (order.length - 1)) / (MAX_SURFACE_POINTS - 1))]);
  return kept;
}

/** Names along an axis: evenly spaced in the order given, each a tick. */
function placeNames(names: readonly unknown[], title: string | undefined): PlacedAxis {
  const order = thin(names.map((_, i) => i));
  const at = order.map((_, k) => (order.length === 1 ? 0.5 : k / (order.length - 1)));
  return { order, at, axis: { title, ticks: order.map((index, k) => ({ at: at[k], text: String(names[index]) })) }, format: String };
}

/** Numbers along an axis: by rising value, each where its value falls between the lowest and the highest. */
function placeNumbers(numbers: readonly number[], title: string | undefined, given: ((value: number) => string) | undefined, locale: string | undefined): PlacedAxis {
  const order = thin(numbers.map((_, i) => i).filter((i) => Number.isFinite(numbers[i])).sort((a, b) => numbers[a] - numbers[b]));
  if (order.length === 0) return { order, at: [], axis: { ticks: [], title }, format: String };
  const min = numbers[order[0]];
  const max = numbers[order[order.length - 1]];
  const share = (value: number) => (max > min ? (value - min) / (max - min) : 0.5);
  const exact = fixedFormat(locale, decimalsFor(order.map((index) => numbers[index])));
  const format = (value: number | string) => (typeof value === 'number' ? (given ?? exact)(value) : String(value));
  let ticks: Axis3D['ticks'];
  if (order.length <= MAX_POINT_TICKS || !(max > min)) {
    ticks = order.map((index) => ({ at: share(numbers[index]), text: format(numbers[index]) }));
  } else if (given) {
    // Evenly through the points, the first and the last among them.
    ticks = Array.from({ length: AXIS_TICKS + 1 }, (_, k) => numbers[order[Math.round((k * (order.length - 1)) / AXIS_TICKS)]]).map((value) => ({ at: share(value), text: given(value) }));
  } else {
    const scale = niceScale(min, max, AXIS_TICKS);
    const round = given ?? axisFormat(scale, locale);
    ticks = scale.ticks.filter((tick) => tick >= min && tick <= max).map((tick) => ({ at: share(tick), text: round(tick) }));
  }
  return { order, at: order.map((index) => share(numbers[index])), axis: { title, ticks }, format };
}

function placeAxis(points: readonly (number | string)[], title: string | undefined, given: ((value: number) => string) | undefined, locale: string | undefined): PlacedAxis {
  const numbers = points.length > 0 && points.every((point) => typeof point === 'number');
  return numbers ? placeNumbers(points as readonly number[], title, given, locale) : placeNames(points, title);
}

function emptyLayout(options: SurfaceChartOptions, theme: Theme): SurfaceLayout {
  const none = new Float64Array(0);
  return {
    scene: null,
    style: options.style ?? 'surface',
    columns: [],
    rows: [],
    xs: [],
    ys: [],
    us: [],
    vs: [],
    values: none,
    heights: none,
    sx: none,
    sy: none,
    zScale: niceScale(0, 1),
    ramp: resolveColorRamp([], theme, options.colorRamp),
    mesh: false,
    bar: null,
    format: { x: String, y: String, value: String, tick: String },
  };
}

/** A grid of values as a sheet in a box, for a chart `width` × `height`. */
export function computeSurfaceLayout(options: SurfaceChartOptions, width: number, height: number, theme: Theme, measure: Measure): SurfaceLayout {
  const x = placeAxis(options.x ?? [], options.xLabel, options.xFormat, options.locale);
  const y = placeAxis(options.y ?? [], options.yLabel, options.yFormat, options.locale);
  const n = x.order.length;
  const m = y.order.length;
  if (n < 2 || m < 1 || width <= 0 || height <= 0) return emptyLayout(options, theme);

  const values = new Float64Array(n * m);
  for (let r = 0; r < m; r++) {
    const row = options.values?.[y.order[r]];
    for (let c = 0; c < n; c++) {
      const value = row?.[x.order[c]];
      values[r * n + c] = typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN;
    }
  }
  const drawn: number[] = [];
  for (const value of values) if (value === value) drawn.push(value);
  const range = extent(drawn);
  if (!range) return emptyLayout(options, theme);

  const zScale = niceScale(range.min, range.max, VALUE_TICKS);
  const ramp = resolveColorRamp(drawn, theme, options.colorRamp);
  const valueText = options.valueFormat ?? axisFormat(zScale, options.locale);
  const span = zScale.max - zScale.min;
  const z: Axis3D = { title: options.valueLabel, ticks: zScale.ticks.map((tick) => ({ at: (tick - zScale.min) / span, text: valueText(tick) })) };

  const legendRoom = options.legend === false ? 0 : COLOR_BAR_ROOM;
  const area = { x: CHART_PAD, y: CHART_PAD, width: Math.max(1, width - CHART_PAD * 2), height: Math.max(1, height - CHART_PAD * 2 - legendRoom) };
  const scene = computeScene3D(area, options.view, { x: x.axis, y: y.axis, z }, measure);

  const heights = new Float64Array(n * m);
  const sx = new Float64Array(n * m);
  const sy = new Float64Array(n * m);
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      const k = r * n + c;
      heights[k] = (values[k] - zScale.min) / span;
      sx[k] = sceneX(scene, x.at[c], y.at[r]);
      sy[k] = sceneY(scene, x.at[c], y.at[r], heights[k]);
    }
  }

  let bar: Rect | null = null;
  if (legendRoom > 0) {
    const labels = colorBarLabelWidth(ramp, valueText, (text) => measure(text, BAR_LABEL_SIZE));
    const barWidth = Math.min(area.width, Math.max(BAR_WIDTH, labels));
    bar = { x: area.x + (area.width - barWidth) / 2, y: area.y + area.height + BAR_GAP, width: barWidth, height: legendRoom - BAR_GAP };
  }
  return {
    scene,
    style: m < 2 ? 'slices' : options.style ?? 'surface',
    columns: x.order,
    rows: y.order,
    xs: x.order.map((index) => options.x[index]),
    ys: y.order.map((index) => options.y[index]),
    us: x.at,
    vs: y.at,
    values,
    heights,
    sx,
    sy,
    zScale,
    ramp,
    mesh: options.mesh !== false && scene.scale / Math.max(1, n - 1, m - 1) >= MIN_MESH_CELL,
    bar,
    format: { x: x.format, y: y.format, value: options.valueFormat ?? readoutFormat(zScale, options.locale), tick: valueText },
  };
}

/** The first index and the step that take an axis of `count` places from the back to the front. */
function backToFront(back: 0 | 1, count: number): { from: number; step: number } {
  return back === 1 ? { from: count - 1, step: -1 } : { from: 0, step: 1 };
}

/**
 * The sheet, a cell at a time from the back to the front, so that what is
 * near covers what is far: with no perspective and one height at a place,
 * that order is right at every turn.
 */
function drawSheet(ctx: CanvasRenderingContext2D, layout: SurfaceLayout, scene: Scene3D, theme: Theme): void {
  const { values, heights, sx, sy, us, vs, ramp } = layout;
  const n = layout.columns.length;
  const m = layout.rows.length;
  const wire = layout.style === 'wireframe';
  const across = backToFront(scene.uBack, n - 1);
  const back = backToFront(scene.vBack, m - 1);
  const meshColor = withAlpha(theme.background, MESH_ALPHA);
  ctx.lineWidth = 1;
  for (let row = back.from, rows = 0; rows < m - 1; rows++, row += back.step) {
    for (let column = across.from, columns = 0; columns < n - 1; columns++, column += across.step) {
      const a = row * n + column;
      const b = a + 1;
      const d = a + n;
      const c = d + 1;
      // A hole at a corner: no cell.
      if (heights[a] !== heights[a] || heights[b] !== heights[b] || heights[c] !== heights[c] || heights[d] !== heights[d]) continue;
      const mean = (values[a] + values[b] + values[c] + values[d]) / 4;
      ctx.beginPath();
      ctx.moveTo(sx[a], sy[a]);
      ctx.lineTo(sx[b], sy[b]);
      ctx.lineTo(sx[c], sy[c]);
      ctx.lineTo(sx[d], sy[d]);
      ctx.closePath();
      if (wire) {
        ctx.fillStyle = theme.background;
        ctx.strokeStyle = rampColor(mean, ramp);
      } else {
        // The way the cell faces, from its two diagonals: across, up, back.
        const du = (us[column + 1] - us[column]) * BOX_SIZE.width;
        const dv = (vs[row + 1] - vs[row]) * BOX_SIZE.depth;
        const one = (heights[c] - heights[a]) * BOX_SIZE.height;
        const other = (heights[d] - heights[b]) * BOX_SIZE.height;
        const fill = rampColor(mean, ramp, faceLight(scene, dv * (other - one), 2 * du * dv, -du * (one + other)));
        ctx.fillStyle = fill;
        // Its own colour where there is no mesh: two fills side by side leave a hair of the ground between them.
        ctx.strokeStyle = layout.mesh ? meshColor : fill;
      }
      ctx.fill();
      ctx.stroke();
    }
  }
}

/** Each row as a filled line of its own, the furthest first. */
function drawSlices(ctx: CanvasRenderingContext2D, layout: SurfaceLayout, scene: Scene3D, theme: Theme): void {
  const { values, heights, sx, sy, us, vs, ramp } = layout;
  const n = layout.columns.length;
  const m = layout.rows.length;
  const back = backToFront(scene.vBack, m);
  for (let row = back.from, rows = 0; rows < m; rows++, row += back.step) {
    const start = row * n;
    ctx.lineWidth = 1;
    for (let column = 0; column < n - 1; column++) {
      const a = start + column;
      const b = a + 1;
      if (heights[a] !== heights[a] || heights[b] !== heights[b]) continue;
      const fill = rampColor((values[a] + values[b]) / 2, ramp);
      ctx.fillStyle = fill;
      ctx.strokeStyle = fill;
      ctx.beginPath();
      ctx.moveTo(sx[a], sy[a]);
      ctx.lineTo(sx[b], sy[b]);
      ctx.lineTo(sceneX(scene, us[column + 1], vs[row]), sceneY(scene, us[column + 1], vs[row], 0));
      ctx.lineTo(sceneX(scene, us[column], vs[row]), sceneY(scene, us[column], vs[row], 0));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // The line along its top, in the chart's ground: what parts one slice from the one behind it.
    ctx.strokeStyle = theme.background;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let open = false;
    for (let column = 0; column < n; column++) {
      const k = start + column;
      if (heights[k] !== heights[k]) {
        open = false;
        continue;
      }
      if (open) ctx.lineTo(sx[k], sy[k]);
      else ctx.moveTo(sx[k], sy[k]);
      open = true;
    }
    ctx.stroke();
  }
}

function hitOf(layout: SurfaceLayout, column: number, row: number): SurfaceHit {
  const k = row * layout.columns.length + column;
  return {
    point: { x: layout.xs[column], y: layout.ys[row], value: layout.values[k], xIndex: layout.columns[column], yIndex: layout.rows[row] },
    px: layout.sx[k],
    py: layout.sy[k],
  };
}

function hitSheet(layout: SurfaceLayout, scene: Scene3D, x: number, y: number): SurfaceHit | null {
  const { heights, sx, sy } = layout;
  const n = layout.columns.length;
  const m = layout.rows.length;
  // From the front to the back: the first cell found is the one seen.
  const across = backToFront(scene.uBack === 1 ? 0 : 1, n - 1);
  const front = backToFront(scene.vBack === 1 ? 0 : 1, m - 1);
  for (let row = front.from, rows = 0; rows < m - 1; rows++, row += front.step) {
    for (let column = across.from, columns = 0; columns < n - 1; columns++, column += across.step) {
      const a = row * n + column;
      const b = a + 1;
      const d = a + n;
      const c = d + 1;
      if (heights[a] !== heights[a] || heights[b] !== heights[b] || heights[c] !== heights[c] || heights[d] !== heights[d]) continue;
      if (!inQuad(x, y, sx[a], sy[a], sx[b], sy[b], sx[c], sy[c], sx[d], sy[d])) continue;
      // The corner nearest the pointer.
      let best = a;
      for (const k of [b, c, d]) if (Math.hypot(sx[k] - x, sy[k] - y) < Math.hypot(sx[best] - x, sy[best] - y)) best = k;
      return hitOf(layout, best % n, Math.floor(best / n));
    }
  }
  return null;
}

function hitSlices(layout: SurfaceLayout, scene: Scene3D, x: number, y: number): SurfaceHit | null {
  const { heights, sx, sy, us, vs } = layout;
  const n = layout.columns.length;
  const m = layout.rows.length;
  const front = backToFront(scene.vBack === 1 ? 0 : 1, m);
  for (let row = front.from, rows = 0; rows < m; rows++, row += front.step) {
    for (let column = 0; column < n - 1; column++) {
      const a = row * n + column;
      const b = a + 1;
      if (heights[a] !== heights[a] || heights[b] !== heights[b]) continue;
      const fx = sceneX(scene, us[column], vs[row]);
      const fy = sceneY(scene, us[column], vs[row], 0);
      const gx = sceneX(scene, us[column + 1], vs[row]);
      const gy = sceneY(scene, us[column + 1], vs[row], 0);
      if (!inQuad(x, y, sx[a], sy[a], sx[b], sy[b], gx, gy, fx, fy)) continue;
      return hitOf(layout, Math.abs(sx[a] - x) <= Math.abs(sx[b] - x) ? column : column + 1, row);
    }
  }
  return null;
}

/** The point of the surface under (x, y): the nearest corner of the cell seen there. */
export function hitSurfacePoint(layout: SurfaceLayout, x: number, y: number): SurfaceHit | null {
  const { scene } = layout;
  if (!scene || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return layout.style === 'slices' ? hitSlices(layout, scene, x, y) : hitSheet(layout, scene, x, y);
}

export function renderSurface(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: SurfaceChartOptions,
  theme: Theme,
  pointer: { x: number; y: number } | null,
  layout: SurfaceLayout = computeSurfaceLayout(options, width, height, theme, canvasMeasure(ctx, theme)),
): SurfaceLayout {
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  const { scene, ramp } = layout;
  if (!scene) return layout;

  drawScene3D(ctx, scene, theme);
  ctx.save();
  ctx.lineJoin = 'round';
  if (layout.style === 'slices') drawSlices(ctx, layout, scene, theme);
  else drawSheet(ctx, layout, scene, theme);
  ctx.restore();
  drawSceneLabels(ctx, scene, theme);
  if (layout.bar) drawRangeBar(ctx, layout.bar, ramp, (value) => rampColor(value, ramp), layout.format.tick, theme);

  const hit = pointer && options.crosshair !== false ? hitSurfacePoint(layout, pointer.x, pointer.y) : null;
  if (hit && pointer) {
    const { point } = hit;
    const color = rampColor(point.value, ramp);
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hit.px, hit.py, MARKER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const value = layout.format.value(point.value);
    drawTooltip(ctx, [
      { text: options.valueLabel ? `${options.valueLabel}: ${value}` : value, bold: true, color },
      { text: `${options.xLabel ?? 'x'}: ${layout.format.x(point.x)}` },
      { text: `${options.yLabel ?? 'y'}: ${layout.format.y(point.y)}` },
    ], pointer, { x: 0, y: 0, width, height }, theme);
  }
  return layout;
}

/** A side of a book as `depthSurface` reads it: the levels that have a price and a volume, the best first. */
function side(levels: readonly DepthLevel[] | undefined, best: 'highest' | 'lowest'): DepthLevel[] {
  const usable = (levels ?? []).filter((level) => Number.isFinite(level.price) && Number.isFinite(level.volume) && level.volume > 0);
  return usable.sort((a, b) => (best === 'highest' ? b.price - a.price : a.price - b.price));
}

/**
 * A run of order books as a surface chart's `x`, `y` and `values`: prices
 * across (the same ones for every book, evenly spaced over the widest of
 * them), the books' times back, and at each the volume waiting from the best
 * price out to that price, as a depth chart has it. Between the best bid
 * and the best ask there is none. Draw it with `style: 'slices'`.
 */
export function depthSurface(snapshots: readonly DepthSnapshot[], options: { levels?: number; from?: number; to?: number } = {}): DepthSurface {
  const books = snapshots.map((snapshot) => ({ time: snapshot.time, bids: side(snapshot.bids, 'highest'), asks: side(snapshot.asks, 'lowest') }));
  const prices: number[] = [];
  for (const book of books) for (const level of [...book.bids, ...book.asks]) prices.push(level.price);
  const range = extent(prices);
  if (!range) return { x: [], y: [], values: [] };
  let lo = options.from !== undefined && Number.isFinite(options.from) ? options.from : range.min;
  let hi = options.to !== undefined && Number.isFinite(options.to) ? options.to : range.max;
  if (!(hi > lo)) {
    // One price: a little room either side of it.
    const room = Math.abs(lo) / 2 || 0.5;
    hi = lo + room;
    lo -= room;
  }
  const count = options.levels !== undefined && Number.isFinite(options.levels) ? Math.max(2, Math.floor(options.levels)) : DEPTH_LEVELS;
  const x = Array.from({ length: count }, (_, i) => lo + ((hi - lo) * i) / (count - 1));
  // A price a hair off a level's, by the sums that made it, still counts that level.
  const slack = (hi - lo) * 1e-9;
  const values = books.map((book) => {
    const row = new Array<number>(count).fill(0);
    // Bids from the highest price down, asks from the lowest up: each sum only grows.
    let sum = 0;
    let next = 0;
    for (let i = count - 1; i >= 0; i--) {
      if (book.bids.length === 0 || x[i] > book.bids[0].price + slack) continue;
      while (next < book.bids.length && book.bids[next].price >= x[i] - slack) sum += book.bids[next++].volume;
      row[i] = sum;
    }
    sum = 0;
    next = 0;
    for (let i = 0; i < count; i++) {
      if (book.asks.length === 0 || x[i] < book.asks[0].price - slack || row[i] > 0) continue;
      while (next < book.asks.length && book.asks[next].price <= x[i] + slack) sum += book.asks[next++].volume;
      row[i] = sum;
    }
    return row;
  });
  return { x, y: books.map((book) => book.time), values };
}
