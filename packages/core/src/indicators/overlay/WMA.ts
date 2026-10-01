import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

/**
 * Weighted Moving Average — each bar in the window is weighted linearly by
 * recency (the newest bar gets weight `period`, the oldest gets weight 1),
 * so it reacts faster than an SMA without EMA's unbounded tail. Computed
 * incrementally in O(1) per bar (not O(period)): maintains a running
 * weighted sum and total, nudging both forward one bar at a time.
 */
export class WMAIndicator extends IndicatorBase {
  descriptor = {
    id: 'wma',
    name: 'Weighted Moving Average',
    placement: 'overlay' as const,
    defaultConfig: { period: 20 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const denom = (period * (period + 1)) / 2;

    let total = 0;
    let numerator = 0;

    for (let i = 0; i < data.length; i++) {
      const price = data[i].close;
      numerator += price * period - total;
      total += price;
      if (i >= period) total -= data[i - period].close;

      if (i >= period - 1) {
        const val: IndicatorValue = { value: numerator / denom };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;

    ctx.beginPath();
    ctx.strokeStyle = style.colors[0];
    ctx.lineWidth = style.lineWidths[0];
    ctx.lineJoin = 'round';

    let started = false;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.value === undefined) continue;
      const x = barIndexToX(i, viewport);
      const y = priceToY(val.value, viewport);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
