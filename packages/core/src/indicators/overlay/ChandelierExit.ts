import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getNumberParam, getIntParam } from '../params.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

/**
 * Chandelier Exit (Chuck LeBeau) — ATR-based trailing stop levels.
 *   long exit  = highest high(n) − mult · ATR(n)
 *   short exit = lowest low(n)  + mult · ATR(n)
 * A long position trails the long-exit line; a short trails the short-exit
 * line. Drawn as two lines (green long stop, red short stop).
 */
export class ChandelierExitIndicator extends IndicatorBase {
  descriptor = {
    id: 'chandelier',
    name: 'Chandelier Exit',
    placement: 'overlay' as const,
    defaultConfig: { period: 22, multiplier: 3 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 22, 1);
    const mult = getNumberParam(config, 'multiplier', 3);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n <= period) return { values, series };

    // Wilder ATR.
    const tr = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      const pc = data[i - 1].close;
      tr[i] = Math.max(data[i].high - data[i].low, Math.abs(data[i].high - pc), Math.abs(data[i].low - pc));
    }
    let atr = 0;
    for (let i = 1; i <= period; i++) atr += tr[i];
    atr /= period;

    for (let i = period; i < n; i++) {
      if (i > period) atr = (atr * (period - 1) + tr[i]) / period;
      let hh = -Infinity;
      let ll = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (data[j].high > hh) hh = data[j].high;
        if (data[j].low < ll) ll = data[j].low;
      }
      const val: IndicatorValue = { long: hh - mult * atr, short: ll + mult * atr };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;

    const drawLine = (key: 'long' | 'short', color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = style.lineWidths[0];
      ctx.lineJoin = 'round';
      ctx.setLineDash([5, 3]);
      let started = false;
      for (let i = from; i <= to && i < series.length; i++) {
        const val = series[i];
        if (!val || val[key] === undefined) { started = false; continue; }
        const x = barIndexToX(i, viewport);
        const y = priceToY(val[key]!, viewport);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawLine('long', style.colors[0] ?? '#26A69A');
    drawLine('short', style.colors[1] ?? '#EF5350');
  }
}
