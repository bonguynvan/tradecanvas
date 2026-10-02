import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Vortex Indicator (VI+ / VI−). Captures trend direction and strength from the
 * relationship between consecutive highs/lows normalised by true range. VI+
 * crossing above VI− signals an up-trend (and vice-versa); the wider the gap,
 * the stronger the trend.
 */
export class VortexIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'vortex',
    name: 'Vortex Indicator',
    placement: 'panel' as const,
    defaultConfig: { period: 14 },
    shortName: 'VI',
    plots: [
      { key: 'viPlus', title: 'VI+', color: 0 },
      { key: 'viMinus', title: 'VI−', color: 1 },
    ],
    levels: [1],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length <= period) return { values, series };

    // Per-bar VM+ / VM- / TR (defined from index 1 onward).
    const vmPlus = new Array(data.length).fill(0);
    const vmMinus = new Array(data.length).fill(0);
    const tr = new Array(data.length).fill(0);
    for (let i = 1; i < data.length; i++) {
      vmPlus[i] = Math.abs(data[i].high - data[i - 1].low);
      vmMinus[i] = Math.abs(data[i].low - data[i - 1].high);
      const h = data[i].high;
      const l = data[i].low;
      const pc = data[i - 1].close;
      tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    }

    let sumVMp = 0;
    let sumVMm = 0;
    let sumTR = 0;
    for (let i = 1; i < data.length; i++) {
      sumVMp += vmPlus[i];
      sumVMm += vmMinus[i];
      sumTR += tr[i];
      if (i > period) {
        sumVMp -= vmPlus[i - period];
        sumVMm -= vmMinus[i - period];
        sumTR -= tr[i - period];
      }
      if (i >= period && sumTR > 0) {
        const val: IndicatorValue = { viPlus: sumVMp / sumTR, viMinus: sumVMm / sumTR };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }
}
