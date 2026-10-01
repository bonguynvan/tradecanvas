import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

/** Volume Weighted Moving Average — close price weighted by volume over the period. */
export class VWMAIndicator extends IndicatorBase {
  descriptor = {
    id: 'vwma',
    name: 'Volume Weighted Moving Average',
    placement: 'overlay' as const,
    defaultConfig: { period: 20 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    let pvSum = 0;
    let volSum = 0;
    for (let i = 0; i < data.length; i++) {
      const pv = data[i].close * data[i].volume;
      pvSum += pv;
      volSum += data[i].volume;

      if (i >= period) {
        const old = data[i - period];
        pvSum -= old.close * old.volume;
        volSum -= old.volume;
      }

      if (i >= period - 1 && volSum > 0) {
        const val: IndicatorValue = { value: pvSum / volSum };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    if (!this.canResume(data, prev, from)) return null;
    const period = getIntParam(config, 'period', 20, 1);
    for (let i = from; i < data.length; i++) {
      if (i < period - 1) { this.writePoint(prev, data, i, null); continue; }
      let pvSum = 0;
      let volSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        pvSum += data[j].close * data[j].volume;
        volSum += data[j].volume;
      }
      this.writePoint(prev, data, i, volSum > 0 ? { value: pvSum / volSum } : null);
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
