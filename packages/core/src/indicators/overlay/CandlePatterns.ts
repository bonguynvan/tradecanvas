import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';
import { Candles } from '../candles/candleShape.js';
import { CANDLE_PATTERNS, DEFAULT_TREND_PERIOD, patternDefinitions, patternsEndingAt } from '../candles/detect.js';
import type { PatternDef } from '../candles/patternDef.js';

interface Params {
  trendPeriod: number;
  defs: readonly PatternDef[];
}

const MARK = 6;
const GAP = 4;
/** Labels show once bars are this far apart, centre to centre, px. */
const LABEL_PITCH = 12;

/**
 * Candlestick patterns: a mark under the bar that ends a bullish pattern, over
 * one that ends a bearish one, a dot over indecision, with the pattern's short
 * name when the bars are wide enough. `reversal`, `continuation` and
 * `indecision` (1 or 0) choose the kinds; a bar ending several patterns shows
 * the longest. `detectCandlePatterns` gives them all, by name.
 */
export class CandlePatternsIndicator extends PointwiseIndicator<Params> {
  descriptor: IndicatorDescriptor = {
    id: 'candlepatterns',
    name: 'Candlestick Patterns',
    placement: 'overlay',
    defaultConfig: { trendPeriod: DEFAULT_TREND_PERIOD, reversal: 1, continuation: 1, indecision: 0 },
    shortName: 'Patterns',
    inputs: { trendPeriod: { min: 2 }, reversal: { min: 0, max: 1 }, continuation: { min: 0, max: 1 }, indecision: { min: 0, max: 1 } },
    plots: [
      { key: 'bull', title: 'Bullish', color: 3, kind: 'dots' },
      { key: 'bear', title: 'Bearish', color: 4, kind: 'dots' },
      { key: 'neutral', title: 'Indecision', color: 1, kind: 'dots' },
    ],
  };

  protected read(config: IndicatorConfig): Params {
    const kinds = new Set<string>();
    if (getIntParam(config, 'reversal', 1, 0) >= 1) kinds.add('reversal');
    if (getIntParam(config, 'continuation', 1, 0) >= 1) kinds.add('continuation');
    if (getIntParam(config, 'indecision', 0, 0) >= 1) kinds.add('indecision');
    return {
      trendPeriod: getIntParam(config, 'trendPeriod', DEFAULT_TREND_PERIOD, 2),
      defs: patternDefinitions().filter((d) => kinds.has(d.info.kind)),
    };
  }

  protected pointAt(data: DataSeries, i: number, { trendPeriod, defs }: Params): IndicatorValue | null {
    const found = patternsEndingAt(new Candles(data, trendPeriod), i, defs);
    if (found.length === 0) return null;
    // The longest pattern speaks for the bar; between equals, the later in the catalogue (the more specific).
    let top = found[0];
    for (const d of found) if (d.info.bars >= top.info.bars) top = d;
    const bar = data[i];
    const point: IndicatorValue = { code: CANDLE_PATTERNS.indexOf(top.info), count: found.length };
    if (top.info.direction === 'bullish') point.bull = bar.low;
    else if (top.info.direction === 'bearish') point.bear = bar.high;
    else point.neutral = bar.high;
    return point;
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const from = Math.max(0, Math.floor(viewport.visibleRange.from));
    const to = Math.min(series.length - 1, Math.ceil(viewport.visibleRange.to));
    const showLabels = viewport.barWidth + viewport.barSpacing >= LABEL_PITCH;
    const { chartRect } = viewport;
    const top = chartRect.y + 10;
    const bottom = chartRect.y + chartRect.height - 10;
    const shown = (key: string) => style.plots?.[key]?.visible !== false;
    ctx.save();
    ctx.globalAlpha = style.opacity;
    ctx.font = `10px sans-serif`;
    ctx.textAlign = 'center';
    let lastAbove = -Infinity;
    let lastBelow = -Infinity;
    for (let i = from; i <= to; i++) {
      const v = series[i];
      if (!v) continue;
      const x = barIndexToX(i, viewport);
      const label = CANDLE_PATTERNS[v.code ?? -1]?.short ?? '';
      if (v.bull !== undefined && shown('bull')) {
        const y = priceToY(v.bull, viewport) + GAP;
        ctx.fillStyle = style.colors[3] ?? style.colors[0];
        triangle(ctx, x, y, 'up');
        if (showLabels && label) lastBelow = drawLabel(ctx, label, x, Math.min(bottom, y + MARK + 2), 'top', lastBelow);
      } else if (v.bear !== undefined && shown('bear')) {
        const y = priceToY(v.bear, viewport) - GAP;
        ctx.fillStyle = style.colors[4] ?? style.colors[0];
        triangle(ctx, x, y, 'down');
        if (showLabels && label) lastAbove = drawLabel(ctx, label, x, Math.max(top, y - MARK - 2), 'bottom', lastAbove);
      } else if (v.neutral !== undefined && shown('neutral')) {
        const y = priceToY(v.neutral, viewport) - GAP - MARK / 2;
        ctx.fillStyle = style.colors[1] ?? style.colors[0];
        ctx.beginPath();
        ctx.arc(x, y, MARK / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
        if (showLabels && label) lastAbove = drawLabel(ctx, label, x, Math.max(top, y - MARK / 2 - 2), 'bottom', lastAbove);
      }
    }
    ctx.restore();
  }
}

function triangle(ctx: CanvasRenderingContext2D, x: number, y: number, points: 'up' | 'down'): void {
  const half = MARK / 2;
  ctx.beginPath();
  if (points === 'up') {
    ctx.moveTo(x, y);
    ctx.lineTo(x - half, y + MARK);
    ctx.lineTo(x + half, y + MARK);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x - half, y - MARK);
    ctx.lineTo(x + half, y - MARK);
  }
  ctx.closePath();
  ctx.fill();
}

/** A label centred at x unless it would run into the last one on its side; returns where that side's labels now end. */
function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, baseline: CanvasTextBaseline, lastEnd: number): number {
  const half = ctx.measureText(text).width / 2;
  if (x - half < lastEnd + 2) return lastEnd;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
  return x + half;
}
