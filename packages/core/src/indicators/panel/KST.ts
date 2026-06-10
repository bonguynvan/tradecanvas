import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Know Sure Thing (Martin Pring) — a momentum oscillator built from four
 * smoothed rates of change, weighted 1:2:3:4 toward the longer cycles, plus an
 * SMA signal line. KST crossing its signal (and the zero line) flags momentum
 * shifts. Zero-centered, auto-scaled.
 */
export class KSTIndicator extends IndicatorBase {
  descriptor = {
    id: 'kst',
    name: 'Know Sure Thing',
    placement: 'panel' as const,
    defaultConfig: { roc1: 10, roc2: 15, roc3: 20, roc4: 30, sma1: 10, sma2: 10, sma3: 10, sma4: 15, signal: 9 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const roc1 = getIntParam(config, 'roc1', 10, 1);
    const roc2 = getIntParam(config, 'roc2', 15, 1);
    const roc3 = getIntParam(config, 'roc3', 20, 1);
    const roc4 = getIntParam(config, 'roc4', 30, 1);
    const sma1 = getIntParam(config, 'sma1', 10, 1);
    const sma2 = getIntParam(config, 'sma2', 10, 1);
    const sma3 = getIntParam(config, 'sma3', 10, 1);
    const sma4 = getIntParam(config, 'sma4', 15, 1);
    const signalP = getIntParam(config, 'signal', 9, 1);

    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < 2) return { values, series };

    const close = data.map((b) => b.close);
    const rcma1 = smaOf(rocOf(close, roc1), sma1);
    const rcma2 = smaOf(rocOf(close, roc2), sma2);
    const rcma3 = smaOf(rocOf(close, roc3), sma3);
    const rcma4 = smaOf(rocOf(close, roc4), sma4);

    const kst: (number | undefined)[] = new Array(n).fill(undefined);
    for (let i = 0; i < n; i++) {
      if (rcma1[i] === undefined || rcma2[i] === undefined || rcma3[i] === undefined || rcma4[i] === undefined) continue;
      kst[i] = rcma1[i]! * 1 + rcma2[i]! * 2 + rcma3[i]! * 3 + rcma4[i]! * 4;
    }
    const signal = smaOf(kst, signalP);

    for (let i = 0; i < n; i++) {
      if (kst[i] === undefined) continue;
      const val: IndicatorValue = { value: kst[i] };
      if (signal[i] !== undefined) val.signal = signal[i];
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

/** Rate of change (%) over `n`; undefined before index `n`. */
function rocOf(close: number[], n: number): (number | undefined)[] {
  const out: (number | undefined)[] = new Array(close.length).fill(undefined);
  for (let i = n; i < close.length; i++) {
    out[i] = close[i - n] !== 0 ? ((close[i] - close[i - n]) / close[i - n]) * 100 : 0;
  }
  return out;
}

/** Simple MA over a (possibly sparse) series; emits once a full window is defined. */
function smaOf(src: (number | undefined)[], period: number): (number | undefined)[] {
  const out: (number | undefined)[] = new Array(src.length).fill(undefined);
  for (let i = period - 1; i < src.length; i++) {
    let sum = 0;
    let ok = true;
    for (let j = i - period + 1; j <= i; j++) {
      const v = src[j];
      if (v === undefined) { ok = false; break; }
      sum += v;
    }
    if (ok) out[i] = sum / period;
  }
  return out;
}
