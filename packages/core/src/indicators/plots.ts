import type {
  IndicatorDescriptor,
  IndicatorFill,
  IndicatorLayer,
  IndicatorMarkerPosition,
  IndicatorMarkerShape,
  IndicatorOutput,
  IndicatorPlot,
  IndicatorPlotStyle,
  IndicatorValue,
  ResolvedIndicatorStyle,
  ViewportState,
} from '@tradecanvas/commons';
import { fadeBy, lineDash } from '@tradecanvas/commons';
import { barIndexToX, priceToYMapper } from '../viewport/ScaleMapping.js';
import { LinePen, fillDenseBand, isDenseSlots } from './linePen.js';
import { breaksBetween } from './periods.js';

/** Room left above and below the values in an auto-fitted pane, as a share of their span. */
const PANE_PADDING = 0.1;

/** Whether a plot marks bars (`kind: 'markers'`) instead of drawing a value through them. */
export function isMarkerPlot(plot: IndicatorPlot): boolean {
  return plot.kind === 'markers';
}

/** Whether a plot shades the pane behind its bars (`kind: 'background'`) instead of drawing a value. */
export function isBackgroundPlot(plot: IndicatorPlot): boolean {
  return plot.kind === 'background';
}

/** Whether an indicator has backgrounds, drawn behind the bars in a pass of their own. */
export function hasBackground(descriptor: Pick<IndicatorDescriptor, 'plots'>): boolean {
  return !!descriptor.plots?.some(isBackgroundPlot);
}

/** The plots that show values: every one but markers and backgrounds. Legends, axis tags, exports and line sources list these. */
export function valuePlots(plots: readonly IndicatorPlot[]): IndicatorPlot[] {
  return plots.filter((plot) => !isMarkerPlot(plot) && !isBackgroundPlot(plot));
}

/**
 * Where a markers plot's marks go: the top or the bottom of any pane; above
 * or below the bars on the price pane only, at the value in a pane of its
 * own (its scale is not prices).
 */
export function markerPosition(plot: IndicatorPlot, pricePane: boolean): IndicatorMarkerPosition {
  const position = plot.position ?? 'value';
  if (position === 'top' || position === 'bottom') return position;
  return pricePane ? position : 'value';
}

/**
 * The output fields an indicator draws on its scale; null = every field (no
 * `plots` declared). On the price pane, marks above or below the bars sit on
 * the bars, not on the scale, and are left out; in a pane they are at their
 * values and count.
 */
export function drawnKeys(descriptor: Pick<IndicatorDescriptor, 'plots'>, pricePane = true): readonly string[] | null {
  if (!descriptor.plots) return null;
  return descriptor.plots
    .filter((p) => !isBackgroundPlot(p) && (!isMarkerPlot(p) || markerPosition(p, pricePane) === 'value'))
    .map((p) => p.key);
}

/** Whether a two-tone plot is drawn in its up colour at `val`. */
export function isUpTone(plot: IndicatorPlot, val: IndicatorValue): boolean {
  if (!plot.tone) return true;
  if (plot.tone === 'sign') return (val[plot.key] ?? 0) >= 0;
  return val[plot.tone.field] === 1;
}

/** Whether `plot` is shown in `style` (a plot is hidden only when its style says so). */
export function plotShown(plot: IndicatorPlot, style: Pick<ResolvedIndicatorStyle, 'plots'>): boolean {
  return style.plots?.[plot.key]?.visible !== false;
}

/** The dashes an indicator's lines take when `dashed`. */
const PLOT_DASH = [6, 4];

/**
 * A plot's own look, for an indicator that draws it itself: whether it
 * shows, and its dashes at `width` (none when solid).
 */
export function plotLook(style: Pick<ResolvedIndicatorStyle, 'plots'>, key: string, width: number): { visible: boolean; dash: number[] } {
  const own = style.plots?.[key];
  return { visible: own?.visible !== false, dash: lineDash(own?.lineStyle ?? 'solid', PLOT_DASH, width) };
}

/** A plot or a fill that may be coloured bar by bar. */
export type BarColoring = Pick<IndicatorPlot, 'color' | 'colorBy' | 'paletteBy'>;

/** Whether `index` is a place in a list of `count`. */
const isIndex = (index: number | undefined, count: number): index is number =>
  index !== undefined && Number.isInteger(index) && index >= 0 && index < count;

/** Whether a plot or a fill is coloured bar by bar. */
export function isColoredByBar(item: BarColoring): boolean {
  return item.colorBy !== undefined || item.paletteBy !== undefined;
}

/**
 * The colour a plot or a fill is drawn in at `val`: the output's `palette`
 * colour its `paletteBy` field names, else the style colour its `colorBy`
 * names, else its own. A field naming no colour there is passed over.
 */
export function colorAtBar(item: BarColoring, style: Pick<ResolvedIndicatorStyle, 'colors'>, palette: readonly string[] | undefined, val: IndicatorValue | null | undefined): string {
  // A shorter colour list (one colour set by hand) falls back to its first colour.
  const own = style.colors[item.color] ?? style.colors[0];
  if (!val) return own;
  if (item.paletteBy !== undefined && palette) {
    const index = val[item.paletteBy];
    if (isIndex(index, palette.length)) return palette[index];
  }
  if (item.colorBy !== undefined) {
    const index = val[item.colorBy];
    if (isIndex(index, style.colors.length)) return style.colors[index];
  }
  return own;
}

/** The colour `plot` is drawn in at `val`: the one its `paletteBy` or `colorBy` names, or its down colour on a down bar of a two-tone plot. */
export function plotColor(plot: IndicatorPlot, style: ResolvedIndicatorStyle, val: IndicatorValue | null, palette?: readonly string[]): string {
  if (isColoredByBar(plot)) return colorAtBar(plot, style, palette, val);
  const up = style.colors[plot.color] ?? style.colors[0];
  if (!plot.tone || plot.downColor === undefined || !val || isUpTone(plot, val)) return up;
  return style.colors[plot.downColor] ?? up;
}

export interface PaneRangeOptions {
  /** Fields to scan; null = all. */
  keys: readonly string[] | null;
  /** Fixed bounds and zero. */
  scale?: IndicatorDescriptor['scale'];
  /** Reference levels kept in view. */
  levels?: readonly number[];
  /** Keep zero in view (histograms grow from it). */
  zero?: boolean;
}

/**
 * The value range of an indicator pane over bars `[from, to]`: its drawn
 * values, padded, then widened to its levels and zero and clamped to fixed
 * bounds. Null when nothing is visible and no bound is fixed.
 *
 * Walks `output.series` over the visible bars only: it runs every frame
 * while panning.
 */
export function paneValueRange(
  output: IndicatorOutput | null,
  from: number,
  to: number,
  options: PaneRangeOptions,
): { min: number; max: number } | null {
  let { lo, hi } = valueSpan(output, from, to, options.keys);
  const scale = options.scale;
  const fixedMin = scale?.min;
  const fixedMax = scale?.max;
  if (lo === Infinity) {
    if (fixedMin === undefined && fixedMax === undefined) return null;
    lo = fixedMin ?? 0;
    hi = fixedMax ?? lo + 1;
  } else {
    const span = hi - lo || Math.abs(hi) || 1;
    lo -= span * PANE_PADDING;
    hi += span * PANE_PADDING;
  }
  for (const level of options.levels ?? []) {
    if (level < lo) lo = level;
    if (level > hi) hi = level;
  }
  if (options.zero || scale?.zero) {
    if (lo > 0) lo = 0;
    if (hi < 0) hi = 0;
  }
  if (fixedMin !== undefined) lo = fixedMin;
  if (fixedMax !== undefined) hi = fixedMax;
  if (!(hi > lo)) hi = lo + 1;
  return { min: lo, max: hi };
}

/**
 * `paneValueRange` for a logarithmic scale: padded by ratio, without zero
 * and levels at or below it. Null when nothing is visible (and no positive
 * bounds are fixed); false when a value there is at or below zero, which a
 * log scale has no place for.
 */
export function paneLogRange(
  output: IndicatorOutput | null,
  from: number,
  to: number,
  options: PaneRangeOptions,
): { min: number; max: number } | null | false {
  let { lo, hi } = valueSpan(output, from, to, options.keys);
  const positive = (v: number | undefined): v is number => v !== undefined && v > 0;
  const fixedMin = positive(options.scale?.min) ? options.scale?.min : undefined;
  const fixedMax = positive(options.scale?.max) ? options.scale?.max : undefined;
  if (lo === Infinity) {
    if (fixedMin === undefined || fixedMax === undefined) return null;
    lo = fixedMin;
    hi = fixedMax;
  } else {
    if (!(lo > 0)) return false;
    // The same padding as a linear pane, on the log of the values.
    const pad = Math.exp((Math.log(hi / lo) || Math.LN2 / 4) * PANE_PADDING);
    lo /= pad;
    hi *= pad;
  }
  for (const level of options.levels ?? []) {
    if (!(level > 0)) continue;
    if (level < lo) lo = level;
    if (level > hi) hi = level;
  }
  if (fixedMin !== undefined) lo = fixedMin;
  if (fixedMax !== undefined) hi = fixedMax;
  return hi > lo ? { min: lo, max: hi } : null;
}

/** The lowest and highest drawn value over bars `[from, to]` (Infinity / -Infinity when none). */
function valueSpan(output: IndicatorOutput | null, from: number, to: number, keys: readonly string[] | null): { lo: number; hi: number } {
  let lo = Infinity;
  let hi = -Infinity;
  const take = (v: number | undefined): void => {
    if (v === undefined || !Number.isFinite(v)) return;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  };
  const scan = (val: IndicatorValue | null | undefined): void => {
    if (!val) return;
    if (keys) {
      for (let k = 0; k < keys.length; k++) take(val[keys[k]]);
      return;
    }
    for (const key in val) take(val[key]);
  };
  const series = output?.series;
  if (series) {
    const end = Math.min(to, series.length - 1);
    for (let i = Math.max(0, from); i <= end; i++) scan(series[i]);
  } else if (output) {
    // A plugin without `series`: its values in bar order stand for bars 0…n-1.
    let i = 0;
    for (const val of output.values.values()) {
      if (i > to) break;
      if (i >= from) scan(val);
      i++;
    }
  }
  return { lo, hi };
}

/** Whether a plot list has a histogram (its pane then keeps zero in view). */
export function hasHistogram(plots: readonly IndicatorPlot[] | undefined): boolean {
  return !!plots?.some((p) => p.kind === 'histogram');
}

/**
 * Draw `plots` from `output` with the viewport's value scale, so the lines
 * sit where the axis, crosshair and labels say they are. Gaps (bars with no
 * value) break lines, and so do changes of a plot's `breakOn` field. Plot
 * `n` uses a width the style sets for its place after the first, else its
 * own `width`, else the first width. `fills` are shaded first, under the
 * plots.
 */
export function renderPlots(
  ctx: CanvasRenderingContext2D,
  output: IndicatorOutput,
  viewport: ViewportState,
  style: ResolvedIndicatorStyle,
  plots: readonly IndicatorPlot[],
  fills: readonly IndicatorFill[] = [],
  /** Drawn on the price pane: marks above and below the bars read their highs and lows. Default true. */
  pricePane = true,
  /** Only the backgrounds, or all but them (fills included); unset: all. */
  layer?: IndicatorLayer,
): void {
  const series = output.series;
  if (!series) return;
  const from = Math.max(0, viewport.visibleRange.from);
  const to = Math.min(viewport.visibleRange.to, series.length - 1);
  if (to < from) return;
  const toY = priceToYMapper(viewport);
  // Fills are in front, under the plots there.
  for (const fill of layer === 'background' ? [] : fills) {
    // A colour see-through of its own stays so, times the fill's strength.
    const shade = (color: string) => fadeBy(color, fill.opacity ?? FILL_OPACITY);
    if (!isColoredByBar(fill)) {
      drawFill(ctx, series, fill.between, from, to, viewport, toY, shade(colorAtBar(fill, style, undefined, null)), null);
      continue;
    }
    const colorAt = (i: number) => colorAtBar(fill, style, output.palette, series[i]);
    for (const color of colorsIn(from, to, colorAt)) {
      drawFill(ctx, series, fill.between, from, to, viewport, toY, shade(color), (i) => colorAt(i) === color);
    }
  }
  for (let n = 0; n < plots.length; n++) {
    const plot = plots[n];
    if (!plotShown(plot, style)) continue;
    if (layer !== undefined && isBackgroundPlot(plot) !== (layer === 'background')) continue;
    // The first width is the indicator's own; a plot with a width of its own keeps to that.
    const width = (n > 0 ? style.lineWidths[n] : undefined) ?? plot.width ?? style.lineWidths[0] ?? 1.5;
    const dash = lineDash(style.plots?.[plot.key]?.lineStyle ?? plot.lineStyle ?? 'solid', PLOT_DASH, width);
    const kind = plot.kind ?? 'line';
    const field = plot.breakOn;
    const breaks = field === undefined ? null : (a: number, b: number) => breaksBetween(series, a, b, field);
    const alpha = ctx.globalAlpha;
    const background = kind === 'background';
    // A background's strength is in its colour (below), not on top of it.
    if (plot.opacity !== undefined && !background) ctx.globalAlpha = alpha * plot.opacity;
    try {
      for (const { color, take } of plotPasses(plot, style, output.palette, series, from, to)) {
        const every = take ?? EVERY;
        if (kind === 'histogram') drawHistogram(ctx, series, plot.key, from, to, viewport, toY, color, every);
        else if (kind === 'dots') drawDots(ctx, series, plot.key, from, to, viewport, toY, color, every);
        else if (kind === 'markers') drawMarkers(ctx, output, series, plot, style.plots?.[plot.key], from, to, viewport, toY, color, every, pricePane);
        else if (background) drawBackground(ctx, series, plot.key, from, to, viewport, fadeBy(color, plot.opacity ?? BACKGROUND_OPACITY), every);
        else drawPath(ctx, series, plot.key, from, to, viewport, toY, color, width, kind === 'step', take, dash, breaks);
      }
    } finally {
      // The chart draws the next indicator on the same context.
      ctx.globalAlpha = alpha;
    }
  }
}

/** A fill's strength when its descriptor gives none. */
const FILL_OPACITY = 0.1;
/** A background's strength when its plot gives none: a plain colour is a shade, not a wall over the grid. */
const BACKGROUND_OPACITY = 0.1;

type Series = readonly (IndicatorValue | null)[];
type Take = (val: IndicatorValue) => boolean;

const EVERY: Take = () => true;

/**
 * The colours `colorAt` gives the bars from `from` to `to`, each once; a bar
 * it gives none (nothing to draw there) is passed over. Each is a pass over
 * the bars in view: a few dozen colours cost little, a gradient of hundreds
 * that many passes.
 */
function colorsIn(from: number, to: number, colorAt: (i: number) => string | null): string[] {
  const seen = new Set<string>();
  for (let i = from; i <= to; i++) {
    const color = colorAt(i);
    if (color !== null) seen.add(color);
  }
  return [...seen];
}

/**
 * The colours a plot is drawn in, each with the bars it takes (null: all):
 * one pass a colour its `colorBy` gives the bars in view, an up and a down
 * pass for a two-tone plot, else one pass.
 */
function plotPasses(
  plot: IndicatorPlot, style: ResolvedIndicatorStyle, palette: readonly string[] | undefined, series: Series, from: number, to: number,
): { color: string; take: Take | null }[] {
  // A shorter colour list (one colour set by hand) falls back to its first colour.
  const own = style.colors[plot.color] ?? style.colors[0];
  if (isColoredByBar(plot)) {
    const colorOf = (val: IndicatorValue | null | undefined) => colorAtBar(plot, style, palette, val);
    const colorAt = (i: number) => (finite(series[i], plot.key) === undefined ? null : colorOf(series[i]));
    return colorsIn(from, to, colorAt).map((color) => ({ color, take: (val: IndicatorValue) => colorOf(val) === color }));
  }
  if (plot.tone && plot.downColor !== undefined) {
    const down = style.colors[plot.downColor] ?? own;
    return [
      { color: own, take: (val: IndicatorValue) => isUpTone(plot, val) },
      { color: down, take: (val: IndicatorValue) => !isUpTone(plot, val) },
    ];
  }
  return [{ color: own, take: null }];
}

/** The pane's whole height behind each bar with a value, a bar's slot wide, so neighbours meet. */
function drawBackground(
  ctx: CanvasRenderingContext2D, series: Series, key: string, from: number, to: number,
  viewport: ViewportState, color: string, take: Take,
): void {
  const slot = viewport.barWidth + viewport.barSpacing;
  const { y, height } = viewport.chartRect;
  ctx.beginPath();
  ctx.fillStyle = color;
  for (let i = from; i <= to; i++) {
    const val = series[i];
    if (finite(val, key) === undefined || !take(val!)) continue;
    ctx.rect(barIndexToX(i, viewport) - slot / 2, y, slot, height);
  }
  ctx.fill();
}

/**
 * The area between two fields, one piece per run of bars that have both.
 * Zoomed out below a pixel per bar, it is filled a pixel column at a time.
 */
function drawFill(
  ctx: CanvasRenderingContext2D, series: Series, between: readonly [string, string], from: number, to: number,
  viewport: ViewportState, toY: (v: number) => number, color: string,
  /** The stretches it shades, by the bar each ends on; null: all. */
  takeEnd: ((i: number) => boolean) | null,
): void {
  // One more than the bars in view: a stretch may start on the bar before the first.
  const size = to - from + 2;
  const xs = new Float64Array(size);
  const tops = new Float64Array(size);
  const bottoms = new Float64Array(size);
  const dense = isDenseSlots(viewport);
  let count = 0;
  const flush = () => {
    if (count >= 2) {
      if (dense) fillDenseBand(ctx, xs, tops, bottoms, color, count);
      else fillPolygon(ctx, xs, tops, bottoms, color, count);
    }
    count = 0;
  };
  const add = (i: number) => {
    xs[count] = barIndexToX(i, viewport);
    tops[count] = toY(finite(series[i], between[0])!);
    bottoms[count] = toY(finite(series[i], between[1])!);
    count++;
  };
  const hasBoth = (i: number) => finite(series[i], between[0]) !== undefined && finite(series[i], between[1]) !== undefined;
  // The stretch that ends on the first bar in view starts on the one before it, off the left edge.
  let prev = from > 0 && hasBoth(from - 1) ? from - 1 : -1;
  for (let i = from; i <= to; i++) {
    const a = finite(series[i], between[0]);
    const b = finite(series[i], between[1]);
    if (a === undefined || b === undefined) {
      flush();
      prev = -1;
      continue;
    }
    if (!takeEnd) {
      add(i);
    } else if (prev >= 0 && takeEnd(i)) {
      // A stretch starts at the bar before the one it ends on.
      if (count === 0) add(prev);
      add(i);
    } else {
      flush();
    }
    prev = i;
  }
  flush();
}

/** One edge left to right, the other back: a band's outline, filled. */
function fillPolygon(
  ctx: CanvasRenderingContext2D, xs: Float64Array, tops: Float64Array, bottoms: Float64Array, color: string, count: number,
): void {
  ctx.beginPath();
  ctx.moveTo(xs[0], tops[0]);
  for (let i = 1; i < count; i++) ctx.lineTo(xs[i], tops[i]);
  for (let i = count - 1; i >= 0; i--) ctx.lineTo(xs[i], bottoms[i]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function finite(val: IndicatorValue | null, key: string): number | undefined {
  const v = val?.[key];
  return v !== undefined && Number.isFinite(v) ? v : undefined;
}

/**
 * A line (or steps). Two-tone: each segment takes the colour of the bar it
 * ends on. Zoomed out below a pixel per bar, the pen fills a span per pixel
 * column instead of stroking thousands of segments. `breaks` says where the
 * line stops between two bars that both have a value.
 */
function drawPath(
  ctx: CanvasRenderingContext2D, series: Series, key: string, from: number, to: number,
  viewport: ViewportState, toY: (v: number) => number, color: string, width: number,
  step: boolean, take: Take | null, dash: readonly number[] = [],
  breaks: ((a: number, b: number) => boolean) | null = null,
): void {
  const pen = new LinePen(ctx, color, width, isDenseSlots(viewport), dash);
  let prevX = 0;
  let prevY = 0;
  let hasPrev = false;
  let prevIndex = -1;
  for (let i = from; i <= to; i++) {
    const val = series[i];
    const v = finite(val, key);
    if (v === undefined) {
      hasPrev = false;
      pen.gap();
      continue;
    }
    if (hasPrev && breaks?.(prevIndex, i)) {
      hasPrev = false;
      pen.gap();
    }
    prevIndex = i;
    const x = barIndexToX(i, viewport);
    const y = toY(v);
    if (!take) {
      // One colour: one continuous line, so joins are rounded.
      if (hasPrev && step) pen.add(x, prevY);
      pen.add(x, y);
    } else if (hasPrev && take(val!)) {
      if (step) {
        pen.segment(prevX, prevY, x, prevY);
        pen.add(x, y);
      } else {
        pen.segment(prevX, prevY, x, y);
      }
    }
    prevX = x;
    prevY = y;
    hasPrev = true;
  }
  pen.finish();
}

/** A mark's size across, in CSS pixels, before it is fitted to the bars. */
const MARKER_SIZE = 8;
/** The smallest a mark gets when bars are close together. */
const MIN_MARKER_SIZE = 4;
/** The room between a mark and the bar it sits above or below. */
const MARKER_GAP = 3;
/** The sizes a mark's own size is kept within, px across. */
const MARKER_SIZE_RANGE = [2, 40] as const;
/** A square's side and an arrow's shaft, against the mark's size: they look as heavy as a triangle. */
const SQUARE_SIDE = 0.8;
const SHAFT_WIDTH = 0.4;

/** A mark's size: its style's, kept within reason, else as wide as the bars allow. */
function markerSize(own: IndicatorPlotStyle | undefined, viewport: ViewportState): number {
  const set = own?.size;
  if (typeof set === 'number' && Number.isFinite(set)) return Math.min(MARKER_SIZE_RANGE[1], Math.max(MARKER_SIZE_RANGE[0], set));
  return Math.max(MIN_MARKER_SIZE, Math.min(MARKER_SIZE, viewport.barWidth + viewport.barSpacing));
}

/** One mark's outline, centred at (x, y), `half` its half size, added to the path. */
function traceMark(ctx: CanvasRenderingContext2D, shape: IndicatorMarkerShape, x: number, y: number, half: number): void {
  if (shape === 'dot') {
    ctx.moveTo(x + half, y);
    ctx.arc(x, y, half, 0, Math.PI * 2);
    return;
  }
  if (shape === 'square') {
    const s = half * SQUARE_SIDE;
    ctx.moveTo(x - s, y - s);
    ctx.lineTo(x + s, y - s);
    ctx.lineTo(x + s, y + s);
    ctx.lineTo(x - s, y + s);
  } else if (shape === 'diamond') {
    ctx.moveTo(x, y - half);
    ctx.lineTo(x + half, y);
    ctx.lineTo(x, y + half);
    ctx.lineTo(x - half, y);
  } else if (shape === 'arrowUp' || shape === 'arrowDown') {
    // A head over the near half, a shaft down the far one.
    const dir = shape === 'arrowUp' ? -1 : 1;
    const shaft = half * SHAFT_WIDTH;
    ctx.moveTo(x, y + dir * half);
    ctx.lineTo(x + half, y);
    ctx.lineTo(x + shaft, y);
    ctx.lineTo(x + shaft, y - dir * half);
    ctx.lineTo(x - shaft, y - dir * half);
    ctx.lineTo(x - shaft, y);
    ctx.lineTo(x - half, y);
  } else {
    const tip = shape === 'triangleUp' ? -half : half;
    ctx.moveTo(x, y + tip);
    ctx.lineTo(x + half, y - tip);
    ctx.lineTo(x - half, y - tip);
  }
  ctx.closePath();
}

type MarkerBar = { time: number; high?: number; low?: number };

/**
 * A shape on each bar with a value, all of one colour in one path: at the
 * value, or above the bar's high or below its low. Those read the bars the
 * viewport carries (`viewport.data`), which the chart gives the price pane
 * only, and only a bar the output has a value at (same time) is read; any
 * other mark is at its value. Zoomed out, one per pixel column.
 */
function drawMarkers(
  ctx: CanvasRenderingContext2D, output: IndicatorOutput, series: Series, plot: IndicatorPlot, own: IndicatorPlotStyle | undefined,
  from: number, to: number, viewport: ViewportState, toY: (v: number) => number, color: string, take: Take, pricePane: boolean,
): void {
  const half = markerSize(own, viewport) / 2;
  const shape = own?.shape ?? plot.shape ?? 'dot';
  const position = markerPosition(plot, pricePane);
  const bars = viewport.data as readonly MarkerBar[] | undefined;
  // On an inverted scale a bar's high is drawn below its low: above and below follow the screen.
  const away = viewport.invertScale ? -1 : 1;
  const dense = isDenseSlots(viewport);
  let lastCol = NaN;
  ctx.beginPath();
  ctx.fillStyle = color;
  for (let i = from; i <= to; i++) {
    const val = series[i];
    const v = finite(val, plot.key);
    if (v === undefined || !take(val!)) continue;
    const x = barIndexToX(i, viewport);
    if (dense) {
      const col = Math.floor(x);
      if (col === lastCol) continue;
      lastCol = col;
    }
    const bar = bars?.[i];
    const aligned = bar !== undefined && output.values.has(bar.time);
    let y = toY(v);
    if (position === 'top') y = viewport.chartRect.y + MARKER_GAP + half;
    else if (position === 'bottom') y = viewport.chartRect.y + viewport.chartRect.height - MARKER_GAP - half;
    else if (aligned && position === 'aboveBar' && bar.high !== undefined) y = toY(bar.high) - away * (MARKER_GAP + half);
    else if (aligned && position === 'belowBar' && bar.low !== undefined) y = toY(bar.low) + away * (MARKER_GAP + half);
    traceMark(ctx, shape, x, y, half);
  }
  ctx.fill();
}

/** Dots; zoomed out, one per pixel column (the first there). */
function drawDots(
  ctx: CanvasRenderingContext2D, series: Series, key: string, from: number, to: number,
  viewport: ViewportState, toY: (v: number) => number, color: string, take: Take,
): void {
  const r = Math.max(1.5, viewport.barWidth * 0.15);
  const dense = isDenseSlots(viewport);
  let lastCol = NaN;
  ctx.beginPath();
  ctx.fillStyle = color;
  for (let i = from; i <= to; i++) {
    const val = series[i];
    const v = finite(val, key);
    if (v === undefined || !take(val!)) continue;
    const x = barIndexToX(i, viewport);
    if (dense) {
      const col = Math.floor(x);
      if (col === lastCol) continue;
      lastCol = col;
    }
    const y = toY(v);
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
}

/** Columns from zero; zoomed out, one per pixel column (its largest). */
function drawHistogram(
  ctx: CanvasRenderingContext2D, series: Series, key: string, from: number, to: number,
  viewport: ViewportState, toY: (v: number) => number, color: string, take: Take,
): void {
  const base = toY(0);
  ctx.beginPath();
  ctx.fillStyle = color;
  if (isDenseSlots(viewport)) {
    let col = NaN;
    let extreme = 0;
    const flush = () => {
      if (Number.isNaN(col)) return;
      const y = toY(extreme);
      ctx.rect(col, Math.min(y, base), 1, Math.max(1, Math.abs(y - base)));
    };
    for (let i = from; i <= to; i++) {
      const val = series[i];
      const v = finite(val, key);
      if (v === undefined || !take(val!)) continue;
      const c = Math.floor(barIndexToX(i, viewport));
      if (c !== col) {
        flush();
        col = c;
        extreme = v;
      } else if (Math.abs(v) > Math.abs(extreme)) {
        extreme = v;
      }
    }
    flush();
    ctx.fill();
    return;
  }
  const w = Math.max(1, viewport.barWidth);
  for (let i = from; i <= to; i++) {
    const val = series[i];
    const v = finite(val, key);
    if (v === undefined || !take(val!)) continue;
    const x = barIndexToX(i, viewport);
    const y = toY(v);
    ctx.rect(x - w / 2, Math.min(y, base), w, Math.max(1, Math.abs(y - base)));
  }
  ctx.fill();
}
