import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

export class ParabolicSARIndicator extends IndicatorBase {
  descriptor = {
    id: 'psar',
    name: 'Parabolic SAR',
    placement: 'overlay' as const,
    defaultConfig: { step: 0.02, max: 0.2 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const stepVal = config.params.step as number;
    const maxVal = config.params.max as number;
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length < 2) return { values, series };

    let isUpTrend = data[1].close > data[0].close;
    let af = stepVal;
    let ep = isUpTrend ? data[0].high : data[0].low;
    let sar = isUpTrend ? data[0].low : data[0].high;

    const val0: IndicatorValue = { value: sar, trend: isUpTrend ? 1 : -1 };
    values.set(data[0].time, val0);
    series[0] = val0;

    for (let i = 1; i < data.length; i++) {
      const prevSar = sar;
      sar = prevSar + af * (ep - prevSar);

      if (isUpTrend) {
        sar = Math.min(sar, data[i - 1].low);
        if (i >= 2) sar = Math.min(sar, data[i - 2].low);

        if (data[i].low < sar) {
          isUpTrend = false;
          sar = ep;
          ep = data[i].low;
          af = stepVal;
        } else {
          if (data[i].high > ep) {
            ep = data[i].high;
            af = Math.min(af + stepVal, maxVal);
          }
        }
      } else {
        sar = Math.max(sar, data[i - 1].high);
        if (i >= 2) sar = Math.max(sar, data[i - 2].high);

        if (data[i].high > sar) {
          isUpTrend = true;
          sar = ep;
          ep = data[i].high;
          af = stepVal;
        } else {
          if (data[i].low < ep) {
            ep = data[i].low;
            af = Math.min(af + stepVal, maxVal);
          }
        }
      }

      const val: IndicatorValue = { value: sar, trend: isUpTrend ? 1 : -1 };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;
    const dotRadius = Math.max(1.5, viewport.barWidth * 0.15);

    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.value === undefined) continue;
      const x = barIndexToX(i, viewport);
      const y = priceToY(val.value, viewport);
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = val.trend === 1 ? (style.colors[0]) : (style.colors[1] ?? '#EF5350');
      ctx.fill();
    }
  }
}
