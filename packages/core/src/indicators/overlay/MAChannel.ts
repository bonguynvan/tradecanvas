import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { withAlpha } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { outputOf, smaOf } from '../math.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';
import { plotLook } from '../plots.js';

/** How far a line may be shifted, either way. */
const MAX_OFFSET = 500;

/**
 * Moving Average Channel: the average of the highs over `upperLength` bars
 * and of the lows over `lowerLength`, each shifted by its own offset (later
 * by a positive one, earlier by a negative one), with the channel shaded.
 */
export class MAChannelIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'machannel',
    name: 'Moving Average Channel',
    placement: 'overlay',
    defaultConfig: { upperLength: 20, lowerLength: 20, upperOffset: 0, lowerOffset: 0 },
    shortName: 'MA Channel',
    inputs: {
      upperLength: { min: 1 },
      lowerLength: { min: 1 },
      upperOffset: { min: -MAX_OFFSET, max: MAX_OFFSET },
      lowerOffset: { min: -MAX_OFFSET, max: MAX_OFFSET },
    },
    plots: [
      { key: 'upper', title: 'Upper', color: 0 },
      { key: 'lower', title: 'Lower', color: 1 },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const upper = shifted(smaOf(data.map((b) => b.high), getIntParam(config, 'upperLength', 20, 1)), offsetOf(config, 'upperOffset'));
    const lower = shifted(smaOf(data.map((b) => b.low), getIntParam(config, 'lowerLength', 20, 1)), offsetOf(config, 'lowerOffset'));
    const points: (IndicatorValue | null)[] = upper.map((u, i) => {
      const l = lower[i];
      if (u === undefined && l === undefined) return null;
      return { ...(u !== undefined ? { upper: u } : {}), ...(l !== undefined ? { lower: l } : {}) };
    });
    return outputOf(data, points);
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;
    const upper: { x: number; y: number }[] = [];
    const lower: { x: number; y: number }[] = [];
    // Shaded only where both lines are: offsets can leave one without the other.
    const bandUpper: { x: number; y: number }[] = [];
    const bandLower: { x: number; y: number }[] = [];
    for (let i = from; i <= to && i < series.length; i++) {
      const v = series[i];
      if (!v) continue;
      const x = barIndexToX(i, viewport);
      const u = v.upper !== undefined ? { x, y: priceToY(v.upper, viewport) } : null;
      const l = v.lower !== undefined ? { x, y: priceToY(v.lower, viewport) } : null;
      if (u) upper.push(u);
      if (l) lower.push(l);
      if (u && l) {
        bandUpper.push(u);
        bandLower.push(l);
      }
    }
    this.drawBand(ctx, bandUpper, bandLower, withAlpha(style.colors[0], 0.08));
    this.drawLine(ctx, upper, style.colors[0], style.lineWidths[0], plotLook(style, 'upper', style.lineWidths[0]));
    this.drawLine(ctx, lower, style.colors[1] ?? style.colors[0], style.lineWidths[1] ?? style.lineWidths[0], plotLook(style, 'lower', style.lineWidths[1] ?? style.lineWidths[0]));
  }
}

function offsetOf(config: IndicatorConfig, key: string): number {
  const v = Number(config.params[key] ?? 0);
  return Number.isFinite(v) ? Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, Math.round(v))) : 0;
}

/** `src` moved `offset` bars later (earlier when negative). */
function shifted(src: readonly (number | undefined)[], offset: number): (number | undefined)[] {
  return src.map((_, i) => src[i - offset]);
}
