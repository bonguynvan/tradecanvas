import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Klinger Volume Oscillator (Stephen Klinger) — compares volume flowing in/out
 * of an instrument to price movement to spot longer-term money-flow trends
 * while staying sensitive to short-term reversals. KVO crossing its signal line
 * (and the zero line) flags shifts. Zero-centered, auto-scaled.
 *
 * Volume Force = volume · |2·(dm/cm − 1)| · trend · 100, where dm = high − low,
 * cm accumulates dm while the trend persists; KVO = EMA(VF, fast) − EMA(VF, slow).
 */
export class KlingerIndicator extends IndicatorBase {
  descriptor = {
    id: 'kvo',
    name: 'Klinger Oscillator',
    placement: 'panel' as const,
    defaultConfig: { fast: 34, slow: 55, signal: 13 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const fast = getIntParam(config, 'fast', 34, 1);
    const slow = getIntParam(config, 'slow', 55, 1);
    const signalP = getIntParam(config, 'signal', 13, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < 2) return { values, series };

    const kFast = 2 / (fast + 1);
    const kSlow = 2 / (slow + 1);
    const kSig = 2 / (signalP + 1);

    let prevHLC: number | undefined;
    let prevTrend = 1;
    let prevDM = 0;
    let cm = 0;
    let emaFast: number | undefined;
    let emaSlow: number | undefined;
    let emaSig: number | undefined;

    for (let i = 0; i < n; i++) {
      const bar = data[i];
      const hlc = bar.high + bar.low + bar.close;
      const trend = prevHLC === undefined ? 1 : hlc > prevHLC ? 1 : -1;
      const dm = bar.high - bar.low;
      if (prevHLC === undefined) cm = dm;
      else cm = trend === prevTrend ? cm + dm : prevDM + dm;
      const vf = cm !== 0 ? bar.volume * Math.abs(2 * (dm / cm - 1)) * trend * 100 : 0;

      emaFast = emaFast === undefined ? vf : vf * kFast + emaFast * (1 - kFast);
      emaSlow = emaSlow === undefined ? vf : vf * kSlow + emaSlow * (1 - kSlow);
      const kvo = emaFast - emaSlow;
      emaSig = emaSig === undefined ? kvo : kvo * kSig + emaSig * (1 - kSig);

      prevHLC = hlc;
      prevTrend = trend;
      prevDM = dm;

      if (i >= slow) {
        const val: IndicatorValue = { value: kvo, signal: emaSig };
        values.set(bar.time, val);
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
