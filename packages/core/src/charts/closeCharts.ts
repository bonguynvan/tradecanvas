import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { isDense, renderDenseBars } from './denseBars.js';
import { lttbVisibleIndices } from './downsample.js';
import { priceToYMapper } from '../viewport/ScaleMapping.js';

/** The x of a bar's centre and the y of a price, for the bars in view. */
function frame(viewport: ViewportState): { toX: (i: number) => number; toY: (price: number) => number } {
  const barUnit = viewport.barWidth + viewport.barSpacing;
  const offsetX = -viewport.offset + viewport.chartRect.x + viewport.barWidth / 2;
  return { toX: (i) => i * barUnit + offsetX, toY: priceToYMapper(viewport) };
}

/** Whether there is anything to draw: bars in view and a price range with height. */
function drawable(data: DataSeries, viewport: ViewportState): boolean {
  const { from, to } = viewport.visibleRange;
  return from <= to && data.length > 0 && viewport.priceRange.max !== viewport.priceRange.min;
}

/** A bar's colour by where it closed against the close before it (the first against its open). */
function closeColor(data: DataSeries, i: number, theme: Theme): string {
  const before = i > 0 ? data[i - 1].close : data[i].open;
  return data[i].close >= before ? theme.candleUp : theme.candleDown;
}

/**
 * Columns: a column from the scale's low edge up to each close, coloured by
 * the close against the one before. Zoomed far out, a pixel column each.
 */
export class ColumnsRenderer implements ChartRendererInterface {
  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    if (!drawable(data, viewport)) return;
    const { from, to } = viewport.visibleRange;
    const { toX, toY } = frame(viewport);
    // The columns stand on the low-price edge: the bottom, or the top when the scale is upside down.
    const baseY = toY(viewport.priceRange.min);
    const width = Math.max(1, Math.round(viewport.barWidth));
    // Zoomed far out there are more bars than pixels: the ones that keep the shape, a pixel column each.
    const indices = isDense(viewport) ? lttbVisibleIndices(from, to, data.length, viewport.chartRect.width, (i) => data[i].close) : null;
    const count = indices ? indices.length : Math.min(to, data.length - 1) - Math.max(0, from) + 1;
    for (let k = 0; k < count; k++) {
      const i = indices ? indices[k] : Math.max(0, from) + k;
      const y = toY(data[i].close);
      ctx.fillStyle = closeColor(data, i, theme);
      ctx.fillRect(Math.round(toX(i) - width / 2), Math.min(y, baseY), width, Math.max(1, Math.abs(baseY - y)));
    }
  }
}

/**
 * HLC bars: a stem from each low to its high and a tick at the close, with
 * no open, coloured by the close against the one before.
 */
export class HLCBarRenderer implements ChartRendererInterface {
  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    if (!drawable(data, viewport)) return;
    if (isDense(viewport)) {
      renderDenseBars(ctx, data, viewport, theme.candleUp, theme.candleDown);
      return;
    }
    const { from, to } = viewport.visibleRange;
    const { toX, toY } = frame(viewport);
    const tick = Math.max(2, Math.round(viewport.barWidth / 2));
    const stem = Math.max(1, Math.round(viewport.barWidth / 6));
    for (let i = Math.max(0, from); i <= to && i < data.length; i++) {
      const bar = data[i];
      const x = Math.round(toX(i) - stem / 2);
      const top = Math.min(toY(bar.high), toY(bar.low));
      const bottom = Math.max(toY(bar.high), toY(bar.low));
      ctx.fillStyle = closeColor(data, i, theme);
      ctx.fillRect(x, top, stem, Math.max(1, bottom - top));
      ctx.fillRect(x, Math.round(toY(bar.close) - stem / 2), stem + tick, stem);
    }
  }
}

/** A dot at each close. Zoomed far out the dots thin to the ones that keep the line's shape. */
export class DotsRenderer implements ChartRendererInterface {
  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    if (!drawable(data, viewport)) return;
    const { from, to } = viewport.visibleRange;
    const { toX, toY } = frame(viewport);
    const indices = lttbVisibleIndices(from, to, data.length, viewport.chartRect.width, (i) => data[i].close);
    const radius = Math.min(DOT_MAX_RADIUS, Math.max(DOT_MIN_RADIUS, (viewport.barWidth + viewport.barSpacing) / 3));
    ctx.fillStyle = theme.lineColor;
    ctx.beginPath();
    for (const i of indices) {
      const x = toX(i);
      const y = toY(data[i].close);
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

const DOT_MIN_RADIUS = 1;
const DOT_MAX_RADIUS = 4;

/** The closes as steps, with the area under them filled: each close holds until the next bar. */
export class StepAreaRenderer implements ChartRendererInterface {
  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    if (!drawable(data, viewport)) return;
    const { from, to } = viewport.visibleRange;
    const { toX, toY } = frame(viewport);
    const first = Math.max(0, from);
    const last = Math.min(to, data.length - 1);
    if (first > last) return;
    const baseY = toY(viewport.priceRange.min);
    const steps = (start: 'move' | 'line') => {
      let prevY = toY(data[first].close);
      if (start === 'move') ctx.moveTo(toX(first), prevY);
      else ctx.lineTo(toX(first), prevY);
      for (let i = first + 1; i <= last; i++) {
        const x = toX(i);
        const y = toY(data[i].close);
        ctx.lineTo(x, prevY);
        ctx.lineTo(x, y);
        prevY = y;
      }
    };
    const gradient = ctx.createLinearGradient(0, toY(viewport.priceRange.max), 0, baseY);
    gradient.addColorStop(0, theme.areaTopColor);
    gradient.addColorStop(1, theme.areaBottomColor);
    ctx.beginPath();
    ctx.moveTo(toX(first), baseY);
    steps('line');
    ctx.lineTo(toX(last), baseY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = theme.lineColor;
    ctx.lineWidth = theme.style?.series.lineWidth ?? 2;
    ctx.lineJoin = 'miter';
    steps('move');
    ctx.stroke();
  }
}

/**
 * The slopes of a curve through `ys` (one a bar apart) that never passes a
 * value it does not reach: where the line turns the slope is flat, so the
 * curve has no peak above a high close or below a low one.
 */
export function monotoneSlopes(ys: readonly number[]): number[] {
  const n = ys.length;
  const slopes = new Array<number>(n).fill(0);
  if (n < 2) return slopes;
  const rise = (i: number) => ys[i + 1] - ys[i];
  slopes[0] = rise(0);
  slopes[n - 1] = rise(n - 2);
  for (let i = 1; i < n - 1; i++) {
    const before = rise(i - 1);
    const after = rise(i);
    // A turn, or a flat either side: flat here.
    slopes[i] = before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  }
  return slopes;
}

/** A smooth curve through the closes that keeps within them: it overshoots no high or low. */
export class SplineRenderer implements ChartRendererInterface {
  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    if (!drawable(data, viewport)) return;
    const { from, to } = viewport.visibleRange;
    const { toX, toY } = frame(viewport);
    const indices = lttbVisibleIndices(from, to, data.length, viewport.chartRect.width, (i) => data[i].close);
    if (indices.length === 0) return;
    const xs = indices.map(toX);
    const ys = indices.map((i) => toY(data[i].close));
    const slopes = monotoneSlopes(ys);
    ctx.beginPath();
    ctx.strokeStyle = theme.lineColor;
    ctx.lineWidth = theme.style?.series.lineWidth ?? 2;
    ctx.lineJoin = 'round';
    ctx.moveTo(xs[0], ys[0]);
    for (let k = 1; k < xs.length; k++) {
      // A third of the way along from each end, on that end's slope (slopes are by point, whatever the points' spacing).
      const third = (xs[k] - xs[k - 1]) / 3;
      ctx.bezierCurveTo(xs[k - 1] + third, ys[k - 1] + slopes[k - 1] / 3, xs[k] - third, ys[k] - slopes[k] / 3, xs[k], ys[k]);
    }
    ctx.stroke();
  }
}
