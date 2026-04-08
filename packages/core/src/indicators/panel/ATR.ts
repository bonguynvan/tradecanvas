import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

export class ATRIndicator extends IndicatorBase {
  descriptor = {
    id: 'atr',
    name: 'Average True Range',
    placement: 'panel' as const,
    defaultConfig: { period: 14 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = config.params.period as number;
    const values = new Map<number, IndicatorValue>();

    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    if (data.length < 2) return { values, series };

    const trueRanges: number[] = [data[0].high - data[0].low];
    for (let i = 1; i < data.length; i++) {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close),
      );
      trueRanges.push(tr);
    }

    let atr = 0;
    for (let i = 0; i < period; i++) atr += trueRanges[i];
    atr /= period;
    const val0: IndicatorValue = { value: atr };
    values.set(data[period - 1].time, val0);
    series[period - 1] = val0;

    for (let i = period; i < data.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]) / period;
      const val: IndicatorValue = { value: atr };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { chartRect } = viewport;
    const { from, to } = viewport.visibleRange;

    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (val && val.value !== undefined) {
        minVal = Math.min(minVal, val.value);
        maxVal = Math.max(maxVal, val.value);
      }
    }
    if (minVal === Infinity) return;
    const range = maxVal - minVal || 1;
    const padding = range * 0.1;
    const adjMin = minVal - padding;
    const adjMax = maxVal + padding;
    const adjRange = adjMax - adjMin;

    const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v - adjMin) / adjRange);

    ctx.beginPath();
    ctx.strokeStyle = style.colors[0];
    ctx.lineWidth = style.lineWidths[0];
    ctx.lineJoin = 'round';

    let started = false;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (val && val.value !== undefined) {
        const x = barIndexToX(i, viewport);
        const y = toY(val.value);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
}
