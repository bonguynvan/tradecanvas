import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

export class CCIIndicator extends IndicatorBase {
  descriptor = {
    id: 'cci',
    name: 'Commodity Channel Index',
    placement: 'panel' as const,
    defaultConfig: { period: 20 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = config.params.period as number;
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    for (let i = period - 1; i < data.length; i++) {
      let sumTP = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sumTP += (data[j].high + data[j].low + data[j].close) / 3;
      }
      const meanTP = sumTP / period;
      let sumDev = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const tp = (data[j].high + data[j].low + data[j].close) / 3;
        sumDev += Math.abs(tp - meanTP);
      }
      const meanDev = sumDev / period;
      const tp = (data[i].high + data[i].low + data[i].close) / 3;
      const cci = meanDev === 0 ? 0 : (tp - meanTP) / (0.015 * meanDev);
      const val: IndicatorValue = { value: cci };
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

    // Levels at +100, 0, -100
    ctx.strokeStyle = style.colors[1] ?? '#787B86';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const level of [-100, 0, 100]) {
      if (level >= adjMin && level <= adjMax) {
        const y = toY(level);
        ctx.beginPath();
        ctx.moveTo(chartRect.x, y);
        ctx.lineTo(chartRect.x + chartRect.width, y);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

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
