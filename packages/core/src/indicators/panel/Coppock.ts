import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Coppock Curve (Edwin Coppock) — a long-term momentum oscillator: a weighted
 * moving average of the sum of two rates of change. Designed to flag major
 * bottoms when it turns up from below zero. Zero-centered, auto-scaled.
 *
 * Coppock = WMA(wma, ROC(longRoc) + ROC(shortRoc))
 */
export class CoppockIndicator extends IndicatorBase {
  descriptor = {
    id: 'coppock',
    name: 'Coppock Curve',
    placement: 'panel' as const,
    defaultConfig: { longRoc: 14, shortRoc: 11, wma: 10 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const longRoc = getIntParam(config, 'longRoc', 14, 1);
    const shortRoc = getIntParam(config, 'shortRoc', 11, 1);
    const wmaPeriod = getIntParam(config, 'wma', 10, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    const maxRoc = Math.max(longRoc, shortRoc);
    if (n <= maxRoc + wmaPeriod) return { values, series };

    const close = data.map((b) => b.close);
    const roc = (i: number, p: number): number => (close[i - p] !== 0 ? ((close[i] - close[i - p]) / close[i - p]) * 100 : 0);

    // Combined ROC sum, defined from index maxRoc.
    const sum: (number | undefined)[] = new Array(n).fill(undefined);
    for (let i = maxRoc; i < n; i++) sum[i] = roc(i, longRoc) + roc(i, shortRoc);

    // Weighted MA (weights 1..wmaPeriod, newest heaviest) of the sum.
    const denom = (wmaPeriod * (wmaPeriod + 1)) / 2;
    for (let i = maxRoc + wmaPeriod - 1; i < n; i++) {
      let acc = 0;
      let ok = true;
      for (let w = 0; w < wmaPeriod; w++) {
        const s = sum[i - w];
        if (s === undefined) { ok = false; break; }
        acc += s * (wmaPeriod - w);
      }
      if (!ok) continue;
      const val: IndicatorValue = { value: acc / denom };
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

    let absMax = 0;
    for (let i = from; i <= to && i < series.length; i++) {
      const v = series[i]?.value;
      if (v !== undefined && Math.abs(v) > absMax) absMax = Math.abs(v);
    }
    if (absMax === 0) return;
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v + absMax) / (2 * absMax));

    const zeroY = toY(0);
    ctx.strokeStyle = style.colors[1] ?? '#787B86';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(chartRect.x, zeroY);
    ctx.lineTo(chartRect.x + chartRect.width, zeroY);
    ctx.stroke();
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
