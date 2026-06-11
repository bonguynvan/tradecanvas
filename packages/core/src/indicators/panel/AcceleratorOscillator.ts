import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Accelerator Oscillator (Bill Williams) — measures the acceleration or
 * deceleration of the current market driving force. It leads the Awesome
 * Oscillator: a change in momentum shows here before price reacts.
 *
 * AO = SMA(median, 5) − SMA(median, 34),  median = (high + low) / 2
 * AC = AO − SMA(AO, 5)
 *
 * Drawn as a histogram: green when the bar is higher than the previous one
 * (accelerating up), red when lower (accelerating down).
 */
export class AcceleratorOscillatorIndicator extends IndicatorBase {
  descriptor = {
    id: 'ac',
    name: 'Accelerator Oscillator',
    placement: 'panel' as const,
    defaultConfig: {},
  };

  calculate(data: DataSeries): IndicatorOutput {
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < 38) return { values, series };

    const median = data.map((b) => (b.high + b.low) / 2);
    const ao: (number | undefined)[] = new Array(n).fill(undefined);
    for (let i = 33; i < n; i++) {
      ao[i] = sma(median, i, 5) - sma(median, i, 34);
    }

    for (let i = 33 + 4; i < n; i++) {
      let s = 0;
      for (let j = i - 4; j <= i; j++) s += ao[j]!;
      const ac = ao[i]! - s / 5;
      const val: IndicatorValue = { value: ac };
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

    const barW = Math.max(1, (chartRect.width / (to - from + 1)) * 0.6);
    let prev: number | undefined;
    for (let i = from; i <= to && i < series.length; i++) {
      const v = series[i]?.value;
      if (v === undefined) { prev = undefined; continue; }
      const x = barIndexToX(i, viewport);
      const y = toY(v);
      const rising = prev === undefined ? v >= 0 : v >= prev;
      ctx.fillStyle = rising ? 'rgba(38,166,154,0.85)' : 'rgba(239,83,80,0.85)';
      const top = Math.min(y, zeroY);
      ctx.fillRect(x - barW / 2, top, barW, Math.max(1, Math.abs(y - zeroY)));
      prev = v;
    }
  }
}

/** SMA of `src` ending at index `i`, window `period` (caller guarantees i ≥ period − 1). */
function sma(src: number[], i: number, period: number): number {
  let sum = 0;
  for (let j = i - period + 1; j <= i; j++) sum += src[j];
  return sum / period;
}
