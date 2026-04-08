import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

export class AccumulationDistributionIndicator extends IndicatorBase {
  descriptor = {
    id: 'ad',
    name: 'Accumulation/Distribution',
    placement: 'panel' as const,
    defaultConfig: {},
  };

  calculate(data: DataSeries, _config: IndicatorConfig): IndicatorOutput {
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length === 0) return { values, series };

    let ad = 0;
    for (let i = 0; i < data.length; i++) {
      const hl = data[i].high - data[i].low;
      const mfm = hl === 0 ? 0 : ((data[i].close - data[i].low) - (data[i].high - data[i].close)) / hl;
      ad += mfm * data[i].volume;
      const val: IndicatorValue = { value: ad };
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
    const adjMin = minVal - pad, adjRange = (maxVal + pad) - adjMin;
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
