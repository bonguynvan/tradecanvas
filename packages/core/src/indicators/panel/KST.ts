import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Know Sure Thing (Martin Pring) — a momentum oscillator built from four
 * smoothed rates of change, weighted 1:2:3:4 toward the longer cycles, plus an
 * SMA signal line. KST crossing its signal (and the zero line) flags momentum
 * shifts. Zero-centered, auto-scaled.
 */
export class KSTIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'kst',
    name: 'Know Sure Thing',
    placement: 'panel' as const,
    defaultConfig: { roc1: 10, roc2: 15, roc3: 20, roc4: 30, sma1: 10, sma2: 10, sma3: 10, sma4: 15, signal: 9, source: 'close' },
    shortName: 'KST',
    inputs: { source: { source: true } },
    plots: [
      { key: 'value', title: 'KST', color: 0 },
      { key: 'signal', title: 'Signal', color: 1 },
    ],
    levels: [0],
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

    const values = new IndicatorValueMap();
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
