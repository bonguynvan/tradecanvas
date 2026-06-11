import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';
import { drawCumulativeLine } from './WilliamsAD.js';

/**
 * Price Volume Trend (PVT) — a cumulative volume line like OBV, but each bar's
 * volume is scaled by its percent price change, so big moves carry more weight.
 * Rising PVT confirms an uptrend; divergence from price warns of weakening.
 *
 * PVT[i] = PVT[i−1] + volume[i] · (close[i] − close[i−1]) / close[i−1].
 */
export class PriceVolumeTrendIndicator extends IndicatorBase {
  descriptor = {
    id: 'pvt',
    name: 'Price Volume Trend',
    placement: 'panel' as const,
    defaultConfig: {},
  };

  calculate(data: DataSeries, _config: IndicatorConfig): IndicatorOutput {
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n === 0) return { values, series };

    let pvt = 0;
    // First bar seeds at 0.
    values.set(data[0].time, { value: 0 });
    series[0] = { value: 0 };
    for (let i = 1; i < n; i++) {
      const prevClose = data[i - 1].close;
      if (prevClose !== 0) pvt += (data[i].volume * (data[i].close - prevClose)) / prevClose;
      const val: IndicatorValue = { value: pvt };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    drawCumulativeLine(ctx, output, viewport, style, barIndexToX);
  }
}
