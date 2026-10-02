import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
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
  descriptor: IndicatorDescriptor = {
    id: 'wma',
    name: 'Weighted Moving Average',
    placement: 'overlay' as const,
    defaultConfig: { period: 20, source: 'close' },
    shortName: 'WMA',
    inputs: { source: { source: true } },
    plots: [{ key: 'value', title: 'WMA', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const values = new IndicatorValueMap();
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

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    if (!this.canResume(data, prev, from)) return null;
    const period = getIntParam(config, 'period', 20, 1);
    const denom = (period * (period + 1)) / 2;
    for (let i = from; i < data.length; i++) {
      if (i < period - 1) { this.writePoint(prev, data, i, null); continue; }
      let numerator = 0;
      const start = i - period + 1;
      for (let j = 0; j < period; j++) numerator += data[start + j].close * (j + 1);
      this.writePoint(prev, data, i, { value: numerator / denom });
    }
    return prev;
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
