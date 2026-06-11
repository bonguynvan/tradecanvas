import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Schaff Trend Cycle (Doug Schaff) — runs a MACD line through two passes of
 * stochastic smoothing to produce a fast, cyclic 0–100 trend oscillator that
 * turns earlier than MACD. Above 75 and turning down = overbought; below 25 and
 * turning up = oversold. Reference lines at 25 / 75.
 */
export class SchaffTrendCycleIndicator extends IndicatorBase {
  descriptor = {
    id: 'stc',
    name: 'Schaff Trend Cycle',
    placement: 'panel' as const,
    defaultConfig: { fast: 23, slow: 50, cycle: 10 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const fast = getIntParam(config, 'fast', 23, 1);
    const slow = getIntParam(config, 'slow', 50, 1);
    const cycle = getIntParam(config, 'cycle', 10, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n === 0) return { values, series };

    const close = data.map((b) => b.close);

    // MACD line.
    const kf = 2 / (fast + 1);
    const ks = 2 / (slow + 1);
    let ef = close[0];
    let es = close[0];
    const macd = new Array(n);
    for (let i = 0; i < n; i++) {
      ef = i === 0 ? close[0] : close[i] * kf + ef * (1 - kf);
      es = i === 0 ? close[0] : close[i] * ks + es * (1 - ks);
      macd[i] = ef - es;
    }

    // First stochastic pass over MACD → smoothed %D (d1).
    const d1 = stochSmooth(macd, cycle);
    // Second stochastic pass over d1 → STC.
    const stc = stochSmooth(d1, cycle);

    for (let i = 0; i < n; i++) {
      const v = stc[i];
      if (v === undefined) continue;
      const val: IndicatorValue = { value: Math.max(0, Math.min(100, v)) };
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
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - v / 100);

    ctx.strokeStyle = style.colors[1] ?? '#787B86';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const level of [25, 75]) {
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

/**
 * One stochastic-smoothing pass: %K over a `cycle` window, then a 0.5-factor
 * recursive smoother. Input may be sparse (undefined); output is undefined
 * until a full window of defined inputs is available.
 */
function stochSmooth(src: (number | undefined)[], cycle: number): (number | undefined)[] {
  const n = src.length;
  const out: (number | undefined)[] = new Array(n).fill(undefined);
  let prev: number | undefined;
  for (let i = 0; i < n; i++) {
    if (i < cycle - 1) continue;
    let ll = Infinity;
    let hh = -Infinity;
    let ok = true;
    for (let j = i - cycle + 1; j <= i; j++) {
      const v = src[j];
      if (v === undefined) { ok = false; break; }
      if (v < ll) ll = v;
      if (v > hh) hh = v;
    }
    if (!ok || src[i] === undefined) continue;
    const k = hh - ll > 0 ? ((src[i]! - ll) / (hh - ll)) * 100 : 50;
    prev = prev === undefined ? k : prev + 0.5 * (k - prev);
    out[i] = prev;
  }
  return out;
}
