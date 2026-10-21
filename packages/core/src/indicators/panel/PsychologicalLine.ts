import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';

/**
 * Psychological Line: the share of the last `period` bars that closed higher
 * than the bar before, in percent. Above 75 the crowd is too keen, below 25
 * too gloomy.
 */
export class PsychologicalLineIndicator extends PointwiseIndicator<number> {
  descriptor: IndicatorDescriptor = {
    id: 'psy',
    name: 'Psychological Line',
    placement: 'panel',
    defaultConfig: { period: 10 },
    shortName: 'PSY',
    plots: [{ key: 'value', title: 'PSY', color: 0 }],
    scale: { min: 0, max: 100 },
    levels: [25, 75],
  };

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 10, 1);
  }

  protected pointAt(data: DataSeries, i: number, period: number): IndicatorValue | null {
    if (i < period) return null;
    let ups = 0;
    for (let j = i - period + 1; j <= i; j++) if (data[j].close > data[j - 1].close) ups++;
    return { value: (ups / period) * 100 };
  }
}

/**
 * New Psychological Line: the Psychological Line weighed by how far prices
 * moved. Over `period` bars, (rises × total of the rises − falls × total of the
 * falls) / (total of all moves × period) × 100, from −100 to 100; 0 when
 * nothing moved.
 */
export class NewPsychologicalLineIndicator extends PointwiseIndicator<number> {
  descriptor: IndicatorDescriptor = {
    id: 'newpsy',
    name: 'New Psychological Line',
    placement: 'panel',
    defaultConfig: { period: 10 },
    shortName: 'New PSY',
    plots: [{ key: 'value', title: 'New PSY', color: 0 }],
    scale: { min: -100, max: 100 },
    levels: [-50, 0, 50],
  };

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 10, 1);
  }

  protected pointAt(data: DataSeries, i: number, period: number): IndicatorValue | null {
    if (i < period) return null;
    let ups = 0;
    let downs = 0;
    let rise = 0;
    let fall = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = data[j].close - data[j - 1].close;
      if (d > 0) { ups++; rise += d; } else if (d < 0) { downs++; fall -= d; }
    }
    const moved = rise + fall;
    return { value: moved === 0 ? 0 : ((ups * rise - downs * fall) / (moved * period)) * 100 };
  }
}
