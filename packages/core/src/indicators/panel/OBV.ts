import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

export class OBVIndicator extends IndicatorBase {
  descriptor = {
    id: 'obv',
    name: 'On Balance Volume',
    placement: 'panel' as const,
    defaultConfig: {},
  };

  calculate(data: DataSeries, _config: IndicatorConfig): IndicatorOutput {
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length === 0) return { values, series };

    let obv = 0;
    const val0: IndicatorValue = { value: obv };
    values.set(data[0].time, val0);
    series[0] = val0;

    for (let i = 1; i < data.length; i++) {
      if (data[i].close > data[i - 1].close) obv += data[i].volume;
      else if (data[i].close < data[i - 1].close) obv -= data[i].volume;
      const val: IndicatorValue = { value: obv };
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
    const adjRange = (maxVal + padding) - adjMin;

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
