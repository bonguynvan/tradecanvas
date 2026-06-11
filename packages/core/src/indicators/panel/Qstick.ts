import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { drawZeroCenteredLine } from './EaseOfMovement.js';

/**
 * Qstick (Tushar Chande) — a moving average of the (close − open) body,
 * quantifying candlestick sentiment. Sustained positive readings mean buyers
 * keep closing bars above their open (and vice-versa); zero crossings mark
 * sentiment flips. Zero-centered.
 *
 * Qstick = SMA(close − open, n)
 */
export class QstickIndicator extends IndicatorBase {
  descriptor = {
    id: 'qstick',
    name: 'Qstick',
    placement: 'panel' as const,
    defaultConfig: { period: 8 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 8, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < period) return { values, series };

    let sum = 0;
    for (let i = 0; i < n; i++) {
      const body = data[i].close - data[i].open;
      sum += body;
      if (i >= period) sum -= data[i - period].close - data[i - period].open;
      if (i >= period - 1) {
        const val: IndicatorValue = { value: sum / period };
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
