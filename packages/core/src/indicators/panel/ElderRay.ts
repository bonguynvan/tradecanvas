import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';
import { barIndexToX, priceToYMapper } from '../../viewport/ScaleMapping.js';

/**
 * Elder Ray Index (Alexander Elder) — Bull Power and Bear Power measure how far
 * buyers/sellers can push price beyond consensus value (an EMA of close).
 *   bull = high − EMA(close, n);  bear = low − EMA(close, n)
 * Bull Power above zero with rising bears (toward zero) favours longs in an
 * uptrend, and vice-versa. Drawn as two zero-centered histograms.
 */
export class ElderRayIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'elderray',
    name: 'Elder Ray',
    placement: 'panel' as const,
    defaultConfig: { period: 13 },
    shortName: 'Elder Ray',
    plots: [
      { key: 'bull', title: 'Bull', color: 0, kind: 'histogram' },
      { key: 'bear', title: 'Bear', color: 1, kind: 'histogram' },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 13, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n === 0) return { values, series };

    const k = 2 / (period + 1);
    let ema: number | undefined;
    for (let i = 0; i < n; i++) {
      ema = ema === undefined ? data[i].close : data[i].close * k + ema * (1 - k);
      if (i >= period - 1) {
        const val: IndicatorValue = { bull: data[i].high - ema, bear: data[i].low - ema };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }

  /** Bull and bear power side by side in each bar's slot, from zero, on the pane's scale. */
  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const from = Math.max(0, viewport.visibleRange.from);
    const to = Math.min(viewport.visibleRange.to, series.length - 1);
    const toY = priceToYMapper(viewport);
    const zeroY = toY(0);
    const half = Math.max(1, viewport.barWidth / 2);
    const sides = [['bull', style.colors[0], -half], ['bear', style.colors[1] ?? style.colors[0], 0]] as const;
    for (const [key, color, offset] of sides) {
      ctx.beginPath();
      ctx.fillStyle = color;
      for (let i = from; i <= to; i++) {
        const v = series[i]?.[key];
        if (v === undefined || !Number.isFinite(v)) continue;
        const y = toY(v);
        ctx.rect(barIndexToX(i, viewport) + offset, Math.min(y, zeroY), half, Math.max(1, Math.abs(y - zeroY)));
      }
      ctx.fill();
    }
  }

}
