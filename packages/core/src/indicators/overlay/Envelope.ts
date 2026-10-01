import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam, getNumberParam } from '../params.js';
import { withAlpha } from '@tradecanvas/commons';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

/** Moving Average Envelope — an SMA offset by a fixed percentage band above and below. */
export class EnvelopeIndicator extends IndicatorBase {
  descriptor = {
    id: 'envelope',
    name: 'Moving Average Envelope',
    placement: 'overlay' as const,
    defaultConfig: { period: 20, percent: 2.5 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const pct = getNumberParam(config, 'percent', 2.5) / 100;
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i].close;
      if (i >= period) sum -= data[i - period].close;

      if (i >= period - 1) {
        const basis = sum / period;
        const val: IndicatorValue = {
          basis,
          upper: basis * (1 + pct),
          lower: basis * (1 - pct),
        };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    if (!this.canResume(data, prev, from)) return null;
    const period = getIntParam(config, 'period', 20, 1);
    const pct = getNumberParam(config, 'percent', 2.5) / 100;
    for (let i = from; i < data.length; i++) {
      if (i < period - 1) { this.writePoint(prev, data, i, null); continue; }
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
      const basis = sum / period;
      this.writePoint(prev, data, i, { basis, upper: basis * (1 + pct), lower: basis * (1 - pct) });
    }
    return prev;
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;

    const upper: { x: number; y: number }[] = [];
    const lower: { x: number; y: number }[] = [];
    const basis: { x: number; y: number }[] = [];
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.upper === undefined) continue;
      const x = barIndexToX(i, viewport);
      upper.push({ x, y: priceToY(val.upper!, viewport) });
      lower.push({ x, y: priceToY(val.lower!, viewport) });
      basis.push({ x, y: priceToY(val.basis!, viewport) });
    }

    this.drawBand(ctx, upper, lower, withAlpha(style.colors[0], 0.08));
    this.drawLine(ctx, upper, style.colors[0], style.lineWidths[0]);
    this.drawLine(ctx, lower, style.colors[0], style.lineWidths[0]);
    this.drawLine(ctx, basis, style.colors[1] ?? style.colors[0], style.lineWidths[0]);
  }
}
