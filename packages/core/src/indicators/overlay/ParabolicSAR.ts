import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getNumberParam } from '../params.js';

export class ParabolicSARIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'psar',
    name: 'Parabolic SAR',
    placement: 'overlay' as const,
    defaultConfig: { step: 0.02, max: 0.2 },
    inputs: { step: { kind: 'number', min: 0.01, step: 0.01 }, max: { kind: 'number', min: 0.01, step: 0.01 } },
    shortName: 'SAR',
    plots: [{ key: 'value', title: 'SAR', color: 0, kind: 'dots', tone: { field: 'trend' }, downColor: 1 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const stepVal = getNumberParam(config, 'step', 0.02);
    const maxVal = getNumberParam(config, 'max', 0.2);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length < 2) return { values, series };

    let isUpTrend = data[1].close > data[0].close;
    let af = stepVal;
    let ep = isUpTrend ? data[0].high : data[0].low;
    let sar = isUpTrend ? data[0].low : data[0].high;

    const val0: IndicatorValue = { value: sar, trend: isUpTrend ? 1 : -1 };
    values.set(data[0].time, val0);
    series[0] = val0;

    for (let i = 1; i < data.length; i++) {
      const prevSar = sar;
      sar = prevSar + af * (ep - prevSar);

      if (isUpTrend) {
        sar = Math.min(sar, data[i - 1].low);
        if (i >= 2) sar = Math.min(sar, data[i - 2].low);

        if (data[i].low < sar) {
          isUpTrend = false;
          sar = ep;
          ep = data[i].low;
          af = stepVal;
        } else {
          if (data[i].high > ep) {
            ep = data[i].high;
            af = Math.min(af + stepVal, maxVal);
          }
        }
      } else {
        sar = Math.max(sar, data[i - 1].high);
        if (i >= 2) sar = Math.max(sar, data[i - 2].high);

        if (data[i].high > sar) {
          isUpTrend = true;
          sar = ep;
          ep = data[i].high;
          af = stepVal;
        } else {
          if (data[i].low < ep) {
            ep = data[i].low;
            af = Math.min(af + stepVal, maxVal);
          }
        }
      }

      const val: IndicatorValue = { value: sar, trend: isUpTrend ? 1 : -1 };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
