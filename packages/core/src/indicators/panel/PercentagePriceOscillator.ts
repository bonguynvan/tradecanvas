import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Percentage Price Oscillator (PPO) — MACD expressed in percentage terms, so it
 * is comparable across instruments and across time regardless of price level.
 *
 * PPO = (EMA(fast) − EMA(slow)) / EMA(slow) · 100
 * Signal = EMA(PPO, signal);  Histogram = PPO − Signal.
 */
export class PercentagePriceOscillatorIndicator extends IndicatorBase {
  descriptor = {
    id: 'ppo',
    name: 'Percentage Price Oscillator',
    placement: 'panel' as const,
    defaultConfig: { fast: 12, slow: 26, signal: 9 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const fastP = getIntParam(config, 'fast', 12, 1);
    const slowP = getIntParam(config, 'slow', 26, 1);
    const signalP = getIntParam(config, 'signal', 9, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n <= slowP) return { values, series };

    const closes = data.map((b) => b.close);
    const emaFast = ema(closes, fastP);
    const emaSlow = ema(closes, slowP);

    const ppo: (number | undefined)[] = new Array(n).fill(undefined);
    for (let i = 0; i < n; i++) {
      if (emaFast[i] === undefined || emaSlow[i] === undefined || emaSlow[i] === 0) continue;
      ppo[i] = ((emaFast[i]! - emaSlow[i]!) / emaSlow[i]!) * 100;
    }

    const signal = ema(ppo, signalP);

    for (let i = 0; i < n; i++) {
      if (ppo[i] === undefined) continue;
      const val: IndicatorValue = { value: ppo[i] };
      if (signal[i] !== undefined) {
        val.signal = signal[i];
        val.hist = ppo[i]! - signal[i]!;
      }
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
      for (const k of ['value', 'signal', 'hist'] as const) {
        const x = v[k];
        if (x !== undefined && Math.abs(x) > absMax) absMax = Math.abs(x);
      }
    }
    if (absMax === 0) return;
    const toY = (v: number) => chartRect.y + chartRect.height * (1 - (v + absMax) / (2 * absMax));

    const zeroY = toY(0);
    const barW = Math.max(1, (chartRect.width / (to - from + 1)) * 0.6);
    for (let i = from; i <= to && i < series.length; i++) {
      const h = series[i]?.hist;
      if (h === undefined) continue;
      const x = barIndexToX(i, viewport);
      const y = toY(h);
      ctx.fillStyle = h >= 0 ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)';
      const top = Math.min(y, zeroY);
      ctx.fillRect(x - barW / 2, top, barW, Math.max(1, Math.abs(y - zeroY)));
    }

    ctx.strokeStyle = style.colors[2] ?? '#787B86';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(chartRect.x, zeroY);
    ctx.lineTo(chartRect.x + chartRect.width, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    const line = (key: 'value' | 'signal', color: string) => {
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

    line('value', style.colors[0] ?? '#2962FF');
    line('signal', style.colors[1] ?? '#FF9800');
  }
}

function ema(src: (number | undefined)[], period: number): (number | undefined)[] {
  const n = src.length;
  const out: (number | undefined)[] = new Array(n).fill(undefined);
  const k = 2 / (period + 1);
  let prev: number | undefined;
  let seedSum = 0;
  let seedCount = 0;
  for (let i = 0; i < n; i++) {
    const v = src[i];
    if (v === undefined) continue;
    if (prev === undefined) {
      seedSum += v;
      seedCount++;
      if (seedCount === period) {
        prev = seedSum / period;
        out[i] = prev;
      }
    } else {
      prev = v * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}
