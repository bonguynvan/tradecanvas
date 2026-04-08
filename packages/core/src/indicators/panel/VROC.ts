import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

export class VROCIndicator extends IndicatorBase {
  descriptor = {
    id: 'vroc',
    name: 'Volume Rate of Change',
    placement: 'panel' as const,
    defaultConfig: { period: 14 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = config.params.period as number;
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    for (let i = period; i < data.length; i++) {
      const prev = data[i - period].volume;
      const vroc = prev === 0 ? 0 : ((data[i].volume - prev) / prev) * 100;
      const val: IndicatorValue = { value: vroc };
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

    let minVal = Infinity, maxVal = -Infinity;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (val && val.value !== undefined) {
        minVal = Math.min(minVal, val.value);
        maxVal = Math.max(maxVal, val.value);
      }
    }
    if (minVal === Infinity) return;
    const range = maxVal - minVal || 1;
    const pad = range * 0.1;
    const adjMin = minVal - pad, adjMax = maxVal + pad, adjRange = adjMax - adjMin;
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v - adjMin) / adjRange);

    // Zero line
    if (0 >= adjMin && 0 <= adjMax) {
      ctx.strokeStyle = '#787B86';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(chartRect.x, toY(0));
      ctx.lineTo(chartRect.x + chartRect.width, toY(0));
      ctx.stroke();
      ctx.setLineDash([]);
    }

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
