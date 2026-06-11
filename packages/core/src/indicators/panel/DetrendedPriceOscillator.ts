import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Detrended Price Oscillator (DPO) — removes the longer trend to expose price
 * cycles by comparing a past close to a simple moving average:
 *   DPO[i] = close[i − (period/2 + 1)] − SMA(close, period)[i]
 * Not a momentum oscillator — it's a cycle/peak-trough tool. Zero-centered.
 */
export class DetrendedPriceOscillatorIndicator extends IndicatorBase {
  descriptor = {
    id: 'dpo',
    name: 'Detrended Price Oscillator',
    placement: 'panel' as const,
    defaultConfig: { period: 20 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 2);
    const shift = Math.floor(period / 2) + 1;
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < period) return { values, series };

    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += data[i].close;
      if (i >= period) sum -= data[i - period].close;
      if (i >= period - 1 && i - shift >= 0) {
        const sma = sum / period;
        const val: IndicatorValue = { value: data[i - shift].close - sma };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { chartRect } = viewport;
    const { from, to } = viewport.visibleRange;

    let absMax = 0;
    for (let i = from; i <= to && i < series.length; i++) {
      const v = series[i]?.value;
      if (v !== undefined && Math.abs(v) > absMax) absMax = Math.abs(v);
    }
    if (absMax === 0) return;
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v + absMax) / (2 * absMax));
    const zeroY = toY(0);
    const halfBar = viewport.barWidth / 2;

    ctx.strokeStyle = style.colors[2] ?? '#787B86';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(chartRect.x, zeroY);
    ctx.lineTo(chartRect.x + chartRect.width, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    const up = style.colors[0] ?? '#26A69A';
    const down = style.colors[1] ?? '#EF5350';
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.value === undefined) continue;
      const x = barIndexToX(i, viewport);
      const y = toY(val.value);
      ctx.fillStyle = val.value >= 0 ? up : down;
      ctx.fillRect(x - halfBar, Math.min(y, zeroY), viewport.barWidth, Math.max(1, Math.abs(y - zeroY)));
    }
  }
}
