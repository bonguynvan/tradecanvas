import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

export class EMAIndicator extends IndicatorBase {
  descriptor = {
    id: 'ema',
    name: 'Exponential Moving Average',
    placement: 'overlay' as const,
    defaultConfig: { period: 20 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = config.params.period as number;
    const multiplier = 2 / (period + 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    let ema = 0;
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        ema += data[i].close;
        continue;
      }
      if (i === period - 1) {
        ema = (ema + data[i].close) / period;
      } else {
        ema = (data[i].close - ema) * multiplier + ema;
      }
      const val: IndicatorValue = { value: ema };
      values.set(data[i].time, val);
      series[i] = val;
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
