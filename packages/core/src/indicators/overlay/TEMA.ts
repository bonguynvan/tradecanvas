import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

/** EMA of a dense (gap-free) value array — null for the first `period - 1` entries. */
function emaArray(values: number[], period: number): (number | null)[] {
  const multiplier = 2 / (period + 1);
  const out: (number | null)[] = new Array(values.length).fill(null);
  let ema = 0;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      sum += values[i];
      continue;
    }
    if (i === period - 1) {
      ema = (sum + values[i]) / period;
    } else {
      ema = (values[i] - ema) * multiplier + ema;
    }
    out[i] = ema;
  }
  return out;
}

/** Re-index an EMA pass's compacted output back onto the original bar indices. */
function expand(compact: (number | null)[], originalIndex: number[], length: number): (number | null)[] {
  const out: (number | null)[] = new Array(length).fill(null);
  for (let i = 0; i < compact.length; i++) {
    if (compact[i] !== null) out[originalIndex[i]] = compact[i];
  }
  return out;
}

/** Drop nulls from a value array, keeping a parallel array of their original indices. */
function compact(values: (number | null)[]): { values: number[]; indices: number[] } {
  const out: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null) {
      out.push(values[i] as number);
      indices.push(i);
    }
  }
  return { values: out, indices };
}

/**
 * Triple Exponential Moving Average — `3*EMA1 - 3*EMA2 + EMA3`, where each
 * pass is the EMA of the previous pass's output. Reacts faster than a plain
 * EMA with far less lag than its name suggests (the triple-smoothing formula
 * cancels most of the lag a naive EMA-of-EMA-of-EMA would add).
 */
export class TEMAIndicator extends IndicatorBase {
  descriptor = {
    id: 'tema',
    name: 'Triple EMA',
    placement: 'overlay' as const,
    defaultConfig: { period: 20 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    const closes = data.map((b) => b.close);
    const ema1 = emaArray(closes, period);

    const pass2 = compact(ema1);
    const ema2 = expand(emaArray(pass2.values, period), pass2.indices, data.length);

    const pass3 = compact(ema2);
    const ema3 = expand(emaArray(pass3.values, period), pass3.indices, data.length);

    for (let i = 0; i < data.length; i++) {
      const e1 = ema1[i];
      const e2 = ema2[i];
      const e3 = ema3[i];
      if (e1 === null || e2 === null || e3 === null) continue;
      const val: IndicatorValue = { value: 3 * e1 - 3 * e2 + e3 };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;

    ctx.beginPath();
    ctx.strokeStyle = style.colors[0];
    ctx.lineWidth = style.lineWidths[0];
    ctx.lineJoin = 'round';

    let started = false;
    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val || val.value === undefined) continue;
      const x = barIndexToX(i, viewport);
      const y = priceToY(val.value, viewport);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
