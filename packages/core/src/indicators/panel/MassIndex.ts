import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Mass Index (Donald Dorsey) — flags reversals by watching the high-low range
 * widen and contract. A "reversal bulge" forms when the index rises above 27
 * then falls back below 26.5. MI = Σ(EMA(range) / EMA(EMA(range))) over 25 bars.
 */
export class MassIndexIndicator extends IndicatorBase {
  descriptor = {
    id: 'massindex',
    name: 'Mass Index',
    placement: 'panel' as const,
    defaultConfig: { ema: 9, sum: 25 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const emaP = getIntParam(config, 'ema', 9, 1);
    const sumP = getIntParam(config, 'sum', 25, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < sumP) return { values, series };

    const k = 2 / (emaP + 1);
    let ema1: number | undefined;
    let ema2: number | undefined;
    const ratio = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const range = data[i].high - data[i].low;
      ema1 = ema1 === undefined ? range : range * k + ema1 * (1 - k);
      ema2 = ema2 === undefined ? ema1 : ema1 * k + ema2 * (1 - k);
      ratio[i] = ema2 !== 0 ? ema1 / ema2 : 1;
    }

    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += ratio[i];
      if (i >= sumP) sum -= ratio[i - sumP];
      if (i >= emaP + sumP) {
        const val: IndicatorValue = { value: sum };
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

    let min = Infinity;
    let max = -Infinity;
    for (let i = from; i <= to && i < series.length; i++) {
      const v = series[i]?.value;
      if (v === undefined) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (min === Infinity) return;
    min = Math.min(min, 26);
    max = Math.max(max, 27.5);
    const span = max - min || 1;
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v - min) / span);

    ctx.strokeStyle = style.colors[1] ?? '#787B86';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const level of [26.5, 27]) {
      const y = toY(level);
      ctx.beginPath();
      ctx.moveTo(chartRect.x, y);
      ctx.lineTo(chartRect.x + chartRect.width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.strokeStyle = style.colors[0];
    ctx.lineWidth = style.lineWidths[0];
    ctx.lineJoin = 'round';
    let started = false;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.value === undefined) continue;
      const x = barIndexToX(i, viewport);
      const y = toY(val.value);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
