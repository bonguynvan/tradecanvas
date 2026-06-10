import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

/**
 * Ultimate Oscillator (Larry Williams) — a 0–100 momentum oscillator that
 * blends three timeframes of buying pressure to reduce the false divergences
 * single-period oscillators produce. Weighted 4:2:1 toward the fastest period.
 * Reference lines at 30 / 70.
 *
 * BP = close − min(low, prevClose); TR = max(high, prevClose) − min(low, prevClose).
 */
export class UltimateOscillatorIndicator extends IndicatorBase {
  descriptor = {
    id: 'uo',
    name: 'Ultimate Oscillator',
    placement: 'panel' as const,
    defaultConfig: { fast: 7, mid: 14, slow: 28 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const fast = getIntParam(config, 'fast', 7, 1);
    const mid = getIntParam(config, 'mid', 14, 1);
    const slow = getIntParam(config, 'slow', 28, 1);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length <= slow) return { values, series };

    const bp = new Array(data.length).fill(0);
    const tr = new Array(data.length).fill(0);
    for (let i = 1; i < data.length; i++) {
      const pc = data[i - 1].close;
      const low = Math.min(data[i].low, pc);
      const high = Math.max(data[i].high, pc);
      bp[i] = data[i].close - low;
      tr[i] = high - low;
    }

    const rolling = (arr: number[], i: number, n: number): number => {
      let s = 0;
      for (let j = i - n + 1; j <= i; j++) s += arr[j];
      return s;
    };

    for (let i = slow; i < data.length; i++) {
      const avgFast = safeDiv(rolling(bp, i, fast), rolling(tr, i, fast));
      const avgMid = safeDiv(rolling(bp, i, mid), rolling(tr, i, mid));
      const avgSlow = safeDiv(rolling(bp, i, slow), rolling(tr, i, slow));
      const uo = (100 * (4 * avgFast + 2 * avgMid + avgSlow)) / 7;
      const val: IndicatorValue = { value: uo };
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
    for (const level of [30, 70]) {
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

function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}
