import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

export class CMFIndicator extends IndicatorBase {
  descriptor = {
    id: 'cmf',
    name: 'Chaikin Money Flow',
    placement: 'panel' as const,
    defaultConfig: { period: 20 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = config.params.period as number;
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    for (let i = period - 1; i < data.length; i++) {
      let mfvSum = 0, volSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const hl = data[j].high - data[j].low;
        const mfm = hl === 0 ? 0 : ((data[j].close - data[j].low) - (data[j].high - data[j].close)) / hl;
        mfvSum += mfm * data[j].volume;
        volSum += data[j].volume;
      }
      const val: IndicatorValue = { value: volSum === 0 ? 0 : mfvSum / volSum };
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

    // Histogram bars
    const halfBar = viewport.barWidth / 2;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (val && val.value !== undefined) {
        const x = barIndexToX(i, viewport);
        const y = toY(val.value);
        const zeroY = toY(0);
        ctx.fillStyle = val.value >= 0 ? (style.colors[0]) : (style.colors[1] ?? '#EF5350');
        const top = Math.min(y, zeroY);
        ctx.fillRect(x - halfBar, top, viewport.barWidth, Math.max(Math.abs(y - zeroY), 1));
      }
    }
  }
}
