import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam, getNumberParam } from '../params.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';
import { detectFairValueGaps, type FairValueGap } from './detectFairValueGaps.js';

/** How strongly a gap's box is filled with its colour, and its edge drawn. */
const FILL_ALPHA = 0.16;
const EDGE_ALPHA = 0.55;
/** A filled gap is history: fainter than one still open. */
const FILLED_FADE = 0.45;

/**
 * Fair value gaps: a box over the prices three bars left traded by the
 * middle one alone, from that bar to the right edge while the gap is open,
 * to the bar that filled it once it is. Gaps going up are in the bullish
 * colour, gaps going down in the bearish one; each price of a gap is a
 * plot, hidden on its own. `minPercent` leaves out the
 * small ones; `showFilled` (1 or 0) keeps the filled ones on the chart.
 * At the bar a gap formed on, `bull`/`bullLow` or `bear`/`bearLow` give its
 * top and bottom. `detectFairValueGaps` gives them all, with where each was
 * filled.
 */
export class FairValueGapsIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'fvg',
    name: 'Fair Value Gaps',
    placement: 'overlay',
    defaultConfig: { minPercent: 0, showFilled: 0 },
    shortName: 'FVG',
    inputs: { minPercent: { kind: 'number', min: 0, step: 0.05 }, showFilled: { kind: 'int', min: 0, max: 1 } },
    plots: [
      { key: 'bull', title: 'Bullish top', color: 3 },
      { key: 'bullLow', title: 'Bullish bottom', color: 3 },
      { key: 'bear', title: 'Bearish top', color: 4 },
      { key: 'bearLow', title: 'Bearish bottom', color: 4 },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const gaps = detectFairValueGaps(data, { minPercent: getNumberParam(config, 'minPercent', 0) });
    const showFilled = getIntParam(config, 'showFilled', 0, 0) >= 1;
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    for (const gap of gaps) {
      const point: IndicatorValue = gap.direction === 'up' ? { bull: gap.top, bullLow: gap.bottom } : { bear: gap.top, bearLow: gap.bottom };
      values.set(data[gap.formed].time, point);
      series[gap.formed] = point;
    }
    return { values, series, meta: { gaps, showFilled } };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const gaps = output.meta?.gaps as readonly FairValueGap[] | undefined;
    if (!gaps || gaps.length === 0) return;
    const showFilled = output.meta?.showFilled === true;
    const { chartRect } = viewport;
    const right = chartRect.x + chartRect.width;
    const half = viewport.barWidth / 2;
    const shown = (key: string) => style.plots?.[key]?.visible !== false;
    const bottomEdge = chartRect.y + chartRect.height;
    ctx.save();
    for (const gap of gaps) {
      const filled = gap.filledAt !== null;
      if (filled && !showFilled) continue;
      const up = gap.direction === 'up';
      const topKey = up ? 'bull' : 'bear';
      const bottomKey = up ? 'bullLow' : 'bearLow';
      // A gap with both its prices hidden is not drawn; with one hidden, its box and the other stay.
      if (!shown(topKey) && !shown(bottomKey)) continue;
      // From the middle bar's left edge; to the bar that filled it, or the plot's edge while it is open.
      const start = barIndexToX(gap.index, viewport) - half;
      // Gaps are in the order they formed: none after this one starts in view either.
      if (start >= right) break;
      const x0 = Math.max(chartRect.x, start);
      const x1 = filled ? Math.min(right, barIndexToX(gap.filledAt as number, viewport) + half) : right;
      if (x1 <= chartRect.x || x1 <= x0) continue;
      // On a scale turned over the gap's top price is the lower edge on screen.
      const yA = priceToY(gap.top, viewport);
      const yB = priceToY(gap.bottom, viewport);
      const yTop = Math.min(yA, yB);
      const yBottom = Math.max(yA, yB);
      if (yBottom < chartRect.y || yTop > bottomEdge) continue;
      const color = style.colors[up ? 3 : 4] ?? style.colors[0];
      const fade = style.opacity * (filled ? FILLED_FADE : 1);
      ctx.fillStyle = color;
      ctx.globalAlpha = FILL_ALPHA * fade;
      ctx.fillRect(x0, yTop, x1 - x0, yBottom - yTop);
      // Its two prices as lines: the levels a trader watches.
      ctx.globalAlpha = EDGE_ALPHA * fade;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (shown(topKey)) {
        ctx.moveTo(x0, Math.round(yA) + 0.5);
        ctx.lineTo(x1, Math.round(yA) + 0.5);
      }
      if (shown(bottomKey)) {
        ctx.moveTo(x0, Math.round(yB) + 0.5);
        ctx.lineTo(x1, Math.round(yB) + 0.5);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}
