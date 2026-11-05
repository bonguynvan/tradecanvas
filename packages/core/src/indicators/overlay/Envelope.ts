import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam, getNumberParam } from '../params.js';

/** Moving Average Envelope — an SMA offset by a fixed percentage band above and below. */
export class EnvelopeIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'envelope',
    name: 'Moving Average Envelope',
    placement: 'overlay' as const,
    defaultConfig: { period: 20, percent: 2.5, source: 'close' },
    shortName: 'Env',
    inputs: { source: { source: true }, period: { kind: 'int', min: 1 }, percent: { kind: 'number', min: 0, step: 0.1 } },
    fills: [{ between: ['upper', 'lower'], color: 0, opacity: 0.08 }],
    plots: [
      { key: 'upper', title: 'Upper', color: 0 },
      { key: 'basis', title: 'Basis', color: 1 },
      { key: 'lower', title: 'Lower', color: 0 },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const pct = getNumberParam(config, 'percent', 2.5) / 100;
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i].close;
      if (i >= period) sum -= data[i - period].close;

      if (i >= period - 1) {
        const basis = sum / period;
        const val: IndicatorValue = {
          basis,
          upper: basis * (1 + pct),
          lower: basis * (1 - pct),
        };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    if (!this.canResume(data, prev, from)) return null;
    const period = getIntParam(config, 'period', 20, 1);
    const pct = getNumberParam(config, 'percent', 2.5) / 100;
    for (let i = from; i < data.length; i++) {
      if (i < period - 1) { this.writePoint(prev, data, i, null); continue; }
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
      const basis = sum / period;
      this.writePoint(prev, data, i, { basis, upper: basis * (1 + pct), lower: basis * (1 - pct) });
    }
    return prev;
  }
}
