import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Hull Moving Average — HMA(n) = WMA( 2*WMA(close, n/2) - WMA(close, n), sqrt(n) )
 * Designed to reduce lag while preserving smoothness.
 */
export class HullMAIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'hma',
    name: 'Hull Moving Average',
    placement: 'overlay' as const,
    defaultConfig: { period: 21, source: 'close' },
    shortName: 'HMA',
    inputs: { source: { source: true }, period: { kind: 'int', min: 2 } },
    plots: [{ key: 'value', title: 'HMA', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 21, 2);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length < period) return { values, series };

    const closes = data.map((b) => b.close);
    const halfPeriod = Math.max(2, Math.floor(period / 2));
    const sqrtPeriod = Math.max(2, Math.floor(Math.sqrt(period)));

    const wmaFull = wma(closes, period);
    const wmaHalf = wma(closes, halfPeriod);
    const diff = closes.map((_, i) =>
      wmaFull[i] === null || wmaHalf[i] === null ? null : 2 * (wmaHalf[i] as number) - (wmaFull[i] as number),
    );
    const hma = wmaNullable(diff, sqrtPeriod);

    for (let i = 0; i < data.length; i++) {
      if (hma[i] === null) continue;
      const val: IndicatorValue = { value: hma[i] as number };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}

function wma(data: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return out;
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let k = 0; k < period; k++) {
      sum += data[i - k] * (period - k);
    }
    out[i] = sum / denom;
  }
  return out;
}

function wmaNullable(data: (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(data.length).fill(null);
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    let ok = true;
    for (let k = 0; k < period; k++) {
      const v = data[i - k];
      if (v === null) {
        ok = false;
        break;
      }
      sum += v * (period - k);
    }
    if (ok) out[i] = sum / denom;
  }
  return out;
}
