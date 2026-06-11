import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { drawZeroCenteredLine } from './EaseOfMovement.js';

/**
 * Disparity Index (Steve Nison) — the percentage distance of the close from its
 * moving average. Positive = price stretched above the MA, negative = below;
 * divergences and zero crossings flag momentum shifts. Zero-centered.
 *
 * Disparity = (close − SMA(close, n)) / SMA(close, n) · 100
 */
export class DisparityIndexIndicator extends IndicatorBase {
  descriptor = {
    id: 'disparity',
    name: 'Disparity Index',
    placement: 'panel' as const,
    defaultConfig: { period: 14 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < period) return { values, series };

    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += data[i].close;
      if (i >= period) sum -= data[i - period].close;
      if (i >= period - 1) {
        const ma = sum / period;
        const disp = ma !== 0 ? ((data[i].close - ma) / ma) * 100 : 0;
        const val: IndicatorValue = { value: disp };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    drawZeroCenteredLine(ctx, output, viewport, style);
  }
}
