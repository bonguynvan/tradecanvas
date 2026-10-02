import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class MACDIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'macd',
    name: 'MACD',
    placement: 'panel' as const,
    defaultConfig: { fast: 12, slow: 26, signal: 9 },
    shortName: 'MACD',
    plots: [
      { key: 'histogram', title: 'Histogram', color: 2, kind: 'histogram', tone: 'sign', downColor: 3 },
      { key: 'macd', title: 'MACD', color: 0 },
      { key: 'signal', title: 'Signal', color: 1 },
    ],
  };

  /** Fast/slow EMA per bar — `macd = fast - slow` can't be split back into the two. */
  private emas = new WeakMap<IndicatorOutput, { fast: number[]; slow: number[] }>();

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const fast = getIntParam(config, 'fast', 12, 1);
    const slow = getIntParam(config, 'slow', 26, 1);
    const signalPeriod = getIntParam(config, 'signal', 9, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const output: IndicatorOutput = { values, series };

    if (data.length < slow) return output;

    const fastMult = 2 / (fast + 1);
    const slowMult = 2 / (slow + 1);
    const signalMult = 2 / (signalPeriod + 1);
    const fastHist: number[] = new Array(data.length);
    const slowHist: number[] = new Array(data.length);

    let fastEma = data[0].close;
    let slowEma = data[0].close;
    let sig = 0;
    let sigStarted = false;

    for (let i = 0; i < data.length; i++) {
      const c = data[i].close;
      if (i === 0) { fastEma = c; slowEma = c; }
      else { fastEma = (c - fastEma) * fastMult + fastEma; slowEma = (c - slowEma) * slowMult + slowEma; }
      fastHist[i] = fastEma;
      slowHist[i] = slowEma;

      if (i >= slow - 1) {
        const macd = fastEma - slowEma;
        if (!sigStarted) { sig = macd; sigStarted = true; }
        else { sig = (macd - sig) * signalMult + sig; }
        const histogram = macd - sig;
        const val: IndicatorValue = { macd, signal: sig, histogram };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    this.emas.set(output, { fast: fastHist, slow: slowHist });
    return output;
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const fast = getIntParam(config, 'fast', 12, 1);
    const slow = getIntParam(config, 'slow', 26, 1);
    const signalPeriod = getIntParam(config, 'signal', 9, 1);
    const state = this.emas.get(prev);
    // Resuming needs a started signal line at from-1 (bar slow-1 onward).
    if (!state || from < slow || !this.canResume(data, prev, from)) return null;
    let fastEma = state.fast[from - 1];
    let slowEma = state.slow[from - 1];
    let sig = prev.series![from - 1]?.signal;
    if (fastEma === undefined || slowEma === undefined || sig === undefined) return null;

    const fastMult = 2 / (fast + 1);
    const slowMult = 2 / (slow + 1);
    const signalMult = 2 / (signalPeriod + 1);
    for (let i = from; i < data.length; i++) {
      const c = data[i].close;
      fastEma = (c - fastEma) * fastMult + fastEma;
      slowEma = (c - slowEma) * slowMult + slowEma;
      state.fast[i] = fastEma;
      state.slow[i] = slowEma;
      const macd = fastEma - slowEma;
      sig = (macd - sig) * signalMult + sig;
      this.writePoint(prev, data, i, { macd, signal: sig, histogram: macd - sig });
    }
    return prev;
  }
}
