import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Percentage Price Oscillator (PPO) — MACD expressed in percentage terms, so it
 * is comparable across instruments and across time regardless of price level.
 *
 * PPO = (EMA(fast) − EMA(slow)) / EMA(slow) · 100
 * Signal = EMA(PPO, signal);  Histogram = PPO − Signal.
 */
export class PercentagePriceOscillatorIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'ppo',
    name: 'Percentage Price Oscillator',
    placement: 'panel' as const,
    defaultConfig: { fast: 12, slow: 26, signal: 9, source: 'close' },
    shortName: 'PPO',
    inputs: { source: { source: true } },
    plots: [
      { key: 'hist', title: 'Histogram', color: 2, kind: 'histogram', tone: 'sign', downColor: 3 },
      { key: 'value', title: 'PPO', color: 0 },
      { key: 'signal', title: 'Signal', color: 1 },
    ],
    levels: [0],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const fastP = getIntParam(config, 'fast', 12, 1);
    const slowP = getIntParam(config, 'slow', 26, 1);
    const signalP = getIntParam(config, 'signal', 9, 1);
    const values = new IndicatorValueMap();
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
