import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Chande Momentum Oscillator (Tushar Chande) — like RSI but uses net momentum
 * over the period without smoothing, swinging −100…+100. Above +50 / below −50
 * mark overbought / oversold; the slope and zero-cross gauge momentum.
 *
 * CMO = 100 · (ΣUp − ΣDown) / (ΣUp + ΣDown) over `period`.
 */
export class ChandeMomentumIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'cmo',
    name: 'Chande Momentum',
    placement: 'panel' as const,
    defaultConfig: { period: 9, source: 'close' },
    shortName: 'CMO',
    inputs: { source: { source: true } },
    plots: [{ key: 'value', title: 'CMO', color: 0 }],
    scale: { min: -100, max: 100 },
    levels: [-50, 0, 50],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 9, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n <= period) return { values, series };

    const up = new Array(n).fill(0);
    const down = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      const ch = data[i].close - data[i - 1].close;
      up[i] = ch > 0 ? ch : 0;
      down[i] = ch < 0 ? -ch : 0;
    }

    let sumUp = 0;
    let sumDown = 0;
    for (let i = 1; i < n; i++) {
      sumUp += up[i];
      sumDown += down[i];
      if (i > period) {
        sumUp -= up[i - period];
        sumDown -= down[i - period];
      }
      if (i >= period) {
        const denom = sumUp + sumDown;
        const cmo = denom > 0 ? (100 * (sumUp - sumDown)) / denom : 0;
        const val: IndicatorValue = { value: cmo };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }
}
