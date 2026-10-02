import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Stochastic RSI (Chande & Kroll) — applies the stochastic oscillator to RSI
 * rather than price, producing a far more sensitive 0–100 overbought/oversold
 * reading. %K and %D lines; reference bands at 20 / 80.
 */
export class StochasticRSIIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'stochrsi',
    name: 'Stochastic RSI',
    placement: 'panel' as const,
    defaultConfig: { rsiPeriod: 14, stochPeriod: 14, k: 3, d: 3, source: 'close' },
    shortName: 'Stoch RSI',
    inputs: { source: { source: true } },
    plots: [
      { key: 'k', title: '%K', color: 0 },
      { key: 'd', title: '%D', color: 1 },
    ],
    scale: { min: 0, max: 100 },
    levels: [20, 80],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const rsiPeriod = getIntParam(config, 'rsiPeriod', 14, 1);
    const stochPeriod = getIntParam(config, 'stochPeriod', 14, 1);
    const kSmooth = getIntParam(config, 'k', 3, 1);
    const dSmooth = getIntParam(config, 'd', 3, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n <= rsiPeriod + stochPeriod) return { values, series };

    const rsi = wilderRSI(data.map((b) => b.close), rsiPeriod);

    const stoch: (number | undefined)[] = new Array(n).fill(undefined);
    for (let i = 0; i < n; i++) {
      if (rsi[i] === undefined) continue;
      let ll = Infinity;
      let hh = -Infinity;
      let ok = true;
      for (let j = i - stochPeriod + 1; j <= i; j++) {
        if (j < 0 || rsi[j] === undefined) { ok = false; break; }
        if (rsi[j]! < ll) ll = rsi[j]!;
        if (rsi[j]! > hh) hh = rsi[j]!;
      }
      if (!ok) continue;
      stoch[i] = hh - ll > 0 ? ((rsi[i]! - ll) / (hh - ll)) * 100 : 0;
    }

    const k = sma(stoch, kSmooth);
    const d = sma(k, dSmooth);

    for (let i = 0; i < n; i++) {
      if (k[i] === undefined) continue;
      const val: IndicatorValue = { k: k[i] };
      if (d[i] !== undefined) val.d = d[i];
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}

function wilderRSI(vals: number[], period: number): (number | undefined)[] {
  const n = vals.length;
  const out: (number | undefined)[] = new Array(n).fill(undefined);
  if (n <= period) return out;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = vals[i] - vals[i - 1];
    if (ch >= 0) avgGain += ch;
    else avgLoss -= ch;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < n; i++) {
    const ch = vals[i] - vals[i - 1];
    avgGain = (avgGain * (period - 1) + (ch > 0 ? ch : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (ch < 0 ? -ch : 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function sma(src: (number | undefined)[], period: number): (number | undefined)[] {
  const out: (number | undefined)[] = new Array(src.length).fill(undefined);
  for (let i = period - 1; i < src.length; i++) {
    let sum = 0;
    let ok = true;
    for (let j = i - period + 1; j <= i; j++) {
      if (src[j] === undefined) { ok = false; break; }
      sum += src[j]!;
    }
    if (ok) out[i] = sum / period;
  }
  return out;
}
