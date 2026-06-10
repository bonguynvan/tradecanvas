import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Elder Ray Index (Alexander Elder) — Bull Power and Bear Power measure how far
 * buyers/sellers can push price beyond consensus value (an EMA of close).
 *   bull = high − EMA(close, n);  bear = low − EMA(close, n)
 * Bull Power above zero with rising bears (toward zero) favours longs in an
 * uptrend, and vice-versa. Drawn as two zero-centered histograms.
 */
export class ElderRayIndicator extends IndicatorBase {
  descriptor = {
    id: 'elderray',
    name: 'Elder Ray',
    placement: 'panel' as const,
    defaultConfig: { period: 13 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 13, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n === 0) return { values, series };

    const k = 2 / (period + 1);
    let ema: number | undefined;
    for (let i = 0; i < n; i++) {
      ema = ema === undefined ? data[i].close : data[i].close * k + ema * (1 - k);
      if (i >= period - 1) {
        const val: IndicatorValue = { bull: data[i].high - ema, bear: data[i].low - ema };
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
      const v = series[i];
      if (!v) continue;
      for (const k of ['bull', 'bear'] as const) {
        const x = v[k];
        if (x !== undefined && Math.abs(x) > absMax) absMax = Math.abs(x);
      }
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

    const bull = style.colors[0] ?? '#26A69A';
    const bear = style.colors[1] ?? '#EF5350';
    // Bull power as thin bars from zero; bear power overlaid (usually opposite sign).
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val) continue;
      const x = barIndexToX(i, viewport);
      if (val.bull !== undefined) {
        const y = toY(val.bull);
        ctx.fillStyle = bull;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x - halfBar, Math.min(y, zeroY), Math.max(1, halfBar), Math.abs(y - zeroY));
      }
      if (val.bear !== undefined) {
        const y = toY(val.bear);
        ctx.fillStyle = bear;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x, Math.min(y, zeroY), Math.max(1, halfBar), Math.abs(y - zeroY));
      }
    }
    ctx.globalAlpha = 1;
  }
}
