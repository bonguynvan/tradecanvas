import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Choppiness Index — measures whether the market is trending or consolidating
 * on a 0–100 scale. High (> 61.8) = choppy/range; low (< 38.2) = trending. It
 * does not indicate direction, only the degree of trendiness.
 *
 * CHOP = 100 · log10( Σ TR(n) / (maxHigh(n) − minLow(n)) ) / log10(n)
 */
export class ChoppinessIndexIndicator extends IndicatorBase {
  descriptor = {
    id: 'chop',
    name: 'Choppiness Index',
    placement: 'panel' as const,
    defaultConfig: { period: 14 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 2);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length <= period) return { values, series };

    const tr = new Array(data.length).fill(0);
    for (let i = 1; i < data.length; i++) {
      const h = data[i].high;
      const l = data[i].low;
      const pc = data[i - 1].close;
      tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    }

    const logN = Math.log10(period);
    let sumTR = 0;
    for (let i = 1; i < data.length; i++) {
      sumTR += tr[i];
      if (i > period) sumTR -= tr[i - period];

      if (i >= period) {
        let hh = -Infinity;
        let ll = Infinity;
        for (let j = i - period + 1; j <= i; j++) {
          if (data[j].high > hh) hh = data[j].high;
          if (data[j].low < ll) ll = data[j].low;
        }
        const range = hh - ll;
        if (range > 0 && sumTR > 0) {
          const chop = Math.max(0, Math.min(100, (100 * Math.log10(sumTR / range)) / logN));
          const val: IndicatorValue = { value: chop };
          values.set(data[i].time, val);
          series[i] = val;
        }
      }
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { chartRect } = viewport;
    const { from, to } = viewport.visibleRange;
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - v / 100);

    ctx.strokeStyle = style.colors[1] ?? '#787B86';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const level of [38.2, 61.8]) {
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
