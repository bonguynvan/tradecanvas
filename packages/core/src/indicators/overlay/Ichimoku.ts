import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { withAlpha } from '@chart-lib/commons';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

export class IchimokuIndicator extends IndicatorBase {
  descriptor = {
    id: 'ichimoku',
    name: 'Ichimoku Cloud',
    placement: 'overlay' as const,
    defaultConfig: { tenkan: 9, kijun: 26, senkou: 52, displacement: 26 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const tenkanPeriod = config.params.tenkan as number;
    const kijunPeriod = config.params.kijun as number;
    const senkouBPeriod = config.params.senkou as number;
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    // Precompute rolling high/low for each period using deque-style sliding window
    const rollingHL = (period: number): { highs: Float64Array; lows: Float64Array } => {
      const highs = new Float64Array(data.length);
      const lows = new Float64Array(data.length);
      for (let i = 0; i < data.length; i++) {
        let high = -Infinity;
        let low = Infinity;
        const start = Math.max(0, i - period + 1);
        for (let j = start; j <= i; j++) {
          if (data[j].high > high) high = data[j].high;
          if (data[j].low < low) low = data[j].low;
        }
        highs[i] = high;
        lows[i] = low;
      }
      return { highs, lows };
    };

    const tenkanHL = rollingHL(tenkanPeriod);
    const kijunHL = rollingHL(kijunPeriod);
    const senkouBHL = rollingHL(senkouBPeriod);

    for (let i = 0; i < data.length; i++) {
      const val: IndicatorValue = {};

      if (i >= tenkanPeriod - 1) {
        val.tenkan = (tenkanHL.highs[i] + tenkanHL.lows[i]) / 2;
      }
      if (i >= kijunPeriod - 1) {
        val.kijun = (kijunHL.highs[i] + kijunHL.lows[i]) / 2;
      }
      if (val.tenkan !== undefined && val.kijun !== undefined) {
        val.senkouA = (val.tenkan + val.kijun) / 2;
      }
      if (i >= senkouBPeriod - 1) {
        val.senkouB = (senkouBHL.highs[i] + senkouBHL.lows[i]) / 2;
      }
      if (i >= kijunPeriod - 1) {
        val.chikou = data[i].close;
      }

      if (val.tenkan !== undefined || val.kijun !== undefined || val.senkouA !== undefined || val.senkouB !== undefined) {
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;

    // Single pass to collect points using typed arrays
    const maxPts = to - from + 1;
    const tenkanXs = new Float64Array(maxPts); const tenkanYs = new Float64Array(maxPts); let tenkanN = 0;
    const kijunXs = new Float64Array(maxPts); const kijunYs = new Float64Array(maxPts); let kijunN = 0;
    const senkouAXs = new Float64Array(maxPts); const senkouAYs = new Float64Array(maxPts); let senkouAN = 0;
    const senkouBXs = new Float64Array(maxPts); const senkouBYs = new Float64Array(maxPts); let senkouBN = 0;

    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val) continue;
      const x = barIndexToX(i, viewport);
      if (val.tenkan !== undefined) { tenkanXs[tenkanN] = x; tenkanYs[tenkanN] = priceToY(val.tenkan, viewport); tenkanN++; }
      if (val.kijun !== undefined) { kijunXs[kijunN] = x; kijunYs[kijunN] = priceToY(val.kijun, viewport); kijunN++; }
      if (val.senkouA !== undefined) { senkouAXs[senkouAN] = x; senkouAYs[senkouAN] = priceToY(val.senkouA, viewport); senkouAN++; }
      if (val.senkouB !== undefined) { senkouBXs[senkouBN] = x; senkouBYs[senkouBN] = priceToY(val.senkouB, viewport); senkouBN++; }
    }

    // Cloud fill
    if (senkouAN > 1 && senkouBN > 1) {
      const n = Math.min(senkouAN, senkouBN);
      ctx.beginPath();
      ctx.moveTo(senkouAXs[0], senkouAYs[0]);
      for (let i = 1; i < n; i++) ctx.lineTo(senkouAXs[i], senkouAYs[i]);
      for (let i = n - 1; i >= 0; i--) ctx.lineTo(senkouBXs[i], senkouBYs[i]);
      ctx.closePath();
      ctx.fillStyle = withAlpha(style.colors[2] ?? '#26A69A', 0.15);
      ctx.fill();
    }

    // Lines — set state once per line
    const drawTypedLine = (xs: Float64Array, ys: Float64Array, n: number, color: string, lw: number) => {
      if (n < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineJoin = 'round';
      ctx.moveTo(xs[0], ys[0]);
      for (let i = 1; i < n; i++) ctx.lineTo(xs[i], ys[i]);
      ctx.stroke();
    };

    drawTypedLine(tenkanXs, tenkanYs, tenkanN, style.colors[0], style.lineWidths[0]);
    drawTypedLine(kijunXs, kijunYs, kijunN, style.colors[1] ?? '#FF9800', style.lineWidths[0]);
    drawTypedLine(senkouAXs, senkouAYs, senkouAN, style.colors[2] ?? '#26A69A', 1);
    drawTypedLine(senkouBXs, senkouBYs, senkouBN, style.colors[3] ?? '#EF5350', 1);
  }
}
