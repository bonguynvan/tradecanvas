import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * TRIX (Jack Hutson) — the percent rate of change of a triple-smoothed EMA of
 * close. Triple smoothing filters out cycles shorter than the period, leaving a
 * clean momentum line that oscillates around zero; a signal EMA of TRIX gives
 * crossover entries.
 */
export class TRIXIndicator extends IndicatorBase {
  descriptor = {
    id: 'trix',
    name: 'TRIX',
    placement: 'panel' as const,
    defaultConfig: { period: 15, signal: 9 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 15, 1);
    const signalP = getIntParam(config, 'signal', 9, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < 2) return { values, series };

    const close = data.map((b) => b.close);
    const e1 = ema(close, period);
    const e2 = ema(e1, period);
    const e3 = ema(e2, period);

    const trix = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      trix[i] = e3[i - 1] !== 0 ? ((e3[i] - e3[i - 1]) / e3[i - 1]) * 100 : 0;
    }
    const sig = ema(trix, signalP);

    // Skip the first 3·period bars where the triple EMA hasn't settled.
    const warm = 3 * period;
    for (let i = warm; i < n; i++) {
      const val: IndicatorValue = { value: trix[i], signal: sig[i] };
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
      const v = series[i];
      if (!v) continue;
      for (const k of ['value', 'signal'] as const) {
        const x = v[k];
        if (x !== undefined && Math.abs(x) > absMax) absMax = Math.abs(x);
      }
    }
    if (absMax === 0) return;
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v + absMax) / (2 * absMax));

    const zeroY = toY(0);
    ctx.strokeStyle = style.colors[2] ?? '#787B86';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(chartRect.x, zeroY);
    ctx.lineTo(chartRect.x + chartRect.width, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    const drawLine = (key: 'value' | 'signal', color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = style.lineWidths[0];
      ctx.lineJoin = 'round';
      let started = false;
      for (let i = from; i <= to && i < series.length; i++) {
        const val = series[i];
        if (!val || val[key] === undefined) { started = false; continue; }
        const x = barIndexToX(i, viewport);
        const y = toY(val[key]!);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawLine('value', style.colors[0] ?? '#2962FF');
    drawLine('signal', style.colors[1] ?? '#FF9800');
  }
}

function ema(src: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out = new Array(src.length).fill(0);
  let prev = src[0] ?? 0;
  out[0] = prev;
  for (let i = 1; i < src.length; i++) {
    prev = src[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}
