import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Elder's Force Index — combines price direction, extent, and volume into a
 * single oscillator around zero. Raw force = (close − prevClose) · volume,
 * then EMA-smoothed (default 13). Above zero = bulls in control, below = bears;
 * the magnitude reflects conviction. Zero-line reference, auto-scaled.
 */
export class ForceIndexIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'fi',
    name: 'Force Index',
    placement: 'panel' as const,
    defaultConfig: { period: 13 },
    shortName: 'EFI',
    plots: [{ key: 'value', title: 'EFI', color: 0 }],
    levels: [0],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 13, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length < 2) return { values, series };

    const k = 2 / (period + 1);
    let ema: number | undefined;
    for (let i = 1; i < data.length; i++) {
      const raw = (data[i].close - data[i - 1].close) * data[i].volume;
      ema = ema === undefined ? raw : raw * k + ema * (1 - k);
      // Let the EMA seed over `period` bars before emitting.
      if (i >= period) {
        const val: IndicatorValue = { value: ema };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }
}
