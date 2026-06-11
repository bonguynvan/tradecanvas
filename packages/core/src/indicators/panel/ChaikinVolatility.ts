import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { drawZeroCenteredLine } from './EaseOfMovement.js';

/**
 * Chaikin Volatility — the percent rate of change of an EMA of the high-low
 * range. Rising = the trading range is expanding (often near tops/breakouts);
 * falling = contracting (often near bottoms/consolidation). Zero-centered.
 *
 * CV = (EMA(range, n) − EMA(range, n)[i − roc]) / EMA(range, n)[i − roc] · 100
 */
export class ChaikinVolatilityIndicator extends IndicatorBase {
  descriptor = {
    id: 'chaikinvol',
    name: 'Chaikin Volatility',
    placement: 'panel' as const,
    defaultConfig: { ema: 10, roc: 10 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const emaP = getIntParam(config, 'ema', 10, 1);
    const rocP = getIntParam(config, 'roc', 10, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n <= rocP) return { values, series };

    const k = 2 / (emaP + 1);
    const ema = new Array(n);
    let prev = data[0].high - data[0].low;
    ema[0] = prev;
    for (let i = 1; i < n; i++) {
      const range = data[i].high - data[i].low;
      prev = range * k + prev * (1 - k);
      ema[i] = prev;
    }

    for (let i = emaP + rocP; i < n; i++) {
      const base = ema[i - rocP];
      const cv = base !== 0 ? ((ema[i] - base) / base) * 100 : 0;
      const val: IndicatorValue = { value: cv };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    drawZeroCenteredLine(ctx, output, viewport, style);
  }
}
