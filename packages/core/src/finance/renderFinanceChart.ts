import type { FinanceChartKind, FinanceChartOptionsMap, Theme } from '@tradecanvas/commons';
import { financeTheme } from './BaseFinanceChart.js';
import { renderBarChart } from './BarChartRenderer.js';
import { renderDonut } from './DonutRenderer.js';
import { renderScatter } from './ScatterRenderer.js';
import { renderHistogram } from './HistogramRenderer.js';
import { renderCalendar } from './CalendarRenderer.js';
import { renderMatrix } from './MatrixRenderer.js';
import { renderHeatmap } from './HeatmapRenderer.js';
import { computeHeatmapLayout } from './HeatmapLayout.js';
import { renderCounterClock } from './CounterClockRenderer.js';
import { renderDepthChart } from './DepthChartRenderer.js';
import { renderEquityCurve } from './EquityCurveRenderer.js';
import { renderWaterfall } from './WaterfallRenderer.js';
import { renderGauge } from './GaugeRenderer.js';
import { renderSparkline } from './SparklineRenderer.js';
import { renderPayoff } from './PayoffRenderer.js';
import { renderCurve } from './CurveRenderer.js';
import { renderBoxPlot } from './BoxPlotRenderer.js';
import { renderRadar } from './RadarRenderer.js';
import { renderSunburst } from './SunburstRenderer.js';
import { renderStackedArea } from './StackedAreaRenderer.js';
import { renderSurface } from './SurfaceRenderer.js';
import { renderBar3D } from './Bar3DRenderer.js';

type Draw<O> = (ctx: CanvasRenderingContext2D, width: number, height: number, options: O, theme: Theme) => void;

/** Each chart's drawing, with no pointer over it. */
const DRAW: { [K in FinanceChartKind]: Draw<FinanceChartOptionsMap[K]> } = {
  bar: (c, w, h, o, t) => void renderBarChart(c, w, h, o, t, null),
  donut: (c, w, h, o, t) => void renderDonut(c, w, h, o, t, null),
  scatter: (c, w, h, o, t) => void renderScatter(c, w, h, o, t, null),
  histogram: (c, w, h, o, t) => void renderHistogram(c, w, h, o, t, null),
  calendar: (c, w, h, o, t) => void renderCalendar(c, w, h, o, t, null),
  matrix: (c, w, h, o, t) => void renderMatrix(c, w, h, o, t, null),
  heatmap: (c, w, h, o, t) => {
    const { rects, groups } = computeHeatmapLayout(o, w, h);
    renderHeatmap(c, w, h, o.data, rects, o, t, null, groups);
  },
  counterClock: (c, w, h, o, t) => void renderCounterClock(c, w, h, o, t, null),
  depth: (c, w, h, o, t) => renderDepthChart(c, w, h, o, t, null),
  equityCurve: (c, w, h, o, t) => renderEquityCurve(c, w, h, o, t, null),
  waterfall: (c, w, h, o, t) => void renderWaterfall(c, w, h, o, t, null),
  // A gauge on a page runs up to its value; a picture of one is at it.
  gauge: (c, w, h, o, t) => renderGauge(c, w, h, o, t, o.value),
  sparkline: (c, w, h, o, t) => renderSparkline(c, w, h, o, t),
  payoff: (c, w, h, o, t) => void renderPayoff(c, w, h, o, t, null),
  curve: (c, w, h, o, t) => void renderCurve(c, w, h, o, t, null),
  boxPlot: (c, w, h, o, t) => void renderBoxPlot(c, w, h, o, t, null),
  radar: (c, w, h, o, t) => void renderRadar(c, w, h, o, t, null),
  sunburst: (c, w, h, o, t) => void renderSunburst(c, w, h, o, t, null),
  stackedArea: (c, w, h, o, t) => void renderStackedArea(c, w, h, o, t, null),
  surface: (c, w, h, o, t) => void renderSurface(c, w, h, o, t, null),
  bar3d: (c, w, h, o, t) => void renderBar3D(c, w, h, o, t, null),
};

/** The names `renderFinanceChart` knows a chart by. */
export const FINANCE_CHART_KINDS = Object.keys(DRAW) as FinanceChartKind[];

/**
 * Draws a finance chart on a 2D context of your own, with no page: a canvas
 * made in Node (`@napi-rs/canvas`, `canvas`, `skia-canvas`) for a picture in
 * an email, a report or a message from a bot, or an OffscreenCanvas in a
 * worker. `kind` names the chart (`'bar'`, `'payoff'`, `'surface'`…) and
 * `options` are that chart's own, `theme`, `font` and `locale` among them.
 *
 * It draws `size.width` × `size.height` in the context's own units, over the
 * theme's ground (a sparkline has none, and lies on yours): scale the
 * context first for a picture of more pixels, `ctx.scale(2, 2)` for twice
 * as many each way. Nothing follows a pointer, and nothing moves: a gauge is
 * at its value. The context needs what a browser's has (paths, text and its
 * measuring, `getTransform`); the text is in the theme's font, which the
 * canvas has to have. Throws a RangeError for a `kind` it does not know.
 */
export function renderFinanceChart<K extends FinanceChartKind>(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  kind: K,
  options: FinanceChartOptionsMap[K],
  size: { width: number; height: number },
): void {
  const draw = DRAW[kind] as Draw<FinanceChartOptionsMap[K]> | undefined;
  if (!draw) throw new RangeError(`renderFinanceChart: no chart is called '${String(kind)}'. The charts are: ${FINANCE_CHART_KINDS.join(', ')}`);
  if (!(size.width > 0) || !(size.height > 0)) return;
  // An OffscreenCanvas's context draws as a canvas's does; only what ties a canvas to its page is missing from it.
  draw(ctx as CanvasRenderingContext2D, size.width, size.height, options, financeTheme(options.theme, options.font));
}
