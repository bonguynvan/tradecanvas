import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';

/** Volume against its average: (volume − SMA(volume, period)) / SMA × 100, as a histogram. */
export class VolumeVsAverageIndicator extends PointwiseIndicator<number> {
  descriptor: IndicatorDescriptor = {
    id: 'volpct',
    name: 'Volume vs Average',
    placement: 'panel',
    defaultConfig: { period: 20 },
    shortName: 'Vol %',
    plots: [{ key: 'value', title: 'Vol %', color: 0, kind: 'histogram', tone: 'sign', downColor: 1 }],
    scale: { zero: true },
    levels: [0],
  };

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 20, 1);
  }

  protected pointAt(data: DataSeries, i: number, period: number): IndicatorValue | null {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j].volume;
    const average = sum / period;
    const value = ((data[i].volume - average) / average) * 100;
    return average > 0 && Number.isFinite(value) ? { value } : null;
  }
}

/** Volume, each bar coloured by whether it traded at least as much as the bar before (`up`: 1) or less (0). */
export class VolumeChangeIndicator extends PointwiseIndicator<null> {
  descriptor: IndicatorDescriptor = {
    id: 'volchange',
    name: 'Volume Change',
    placement: 'panel',
    defaultConfig: {},
    shortName: 'Vol Δ',
    plots: [{ key: 'value', title: 'Volume', color: 0, kind: 'histogram', tone: { field: 'up' }, downColor: 1 }],
    scale: { zero: true },
  };

  protected read(_config: IndicatorConfig): null {
    return null;
  }

  protected pointAt(data: DataSeries, i: number): IndicatorValue | null {
    const { volume } = data[i];
    if (!Number.isFinite(volume)) return null;
    return { value: volume, up: i === 0 || volume >= data[i - 1].volume ? 1 : 0 };
  }
}

/**
 * Trade Value: an estimate of the money traded in each bar, close × volume,
 * coloured by whether the bar closed up from its open. Price boards show the
 * exchange's own figure; this is close to it on liquid symbols.
 */
export class TradeValueIndicator extends PointwiseIndicator<null> {
  descriptor: IndicatorDescriptor = {
    id: 'tradevalue',
    name: 'Trade Value',
    placement: 'panel',
    defaultConfig: {},
    shortName: 'Value',
    plots: [{ key: 'value', title: 'Value', color: 0, kind: 'histogram', tone: { field: 'up' }, downColor: 1 }],
    scale: { zero: true },
  };

  protected read(_config: IndicatorConfig): null {
    return null;
  }

  protected pointAt(data: DataSeries, i: number): IndicatorValue | null {
    const b = data[i];
    const value = b.close * b.volume;
    return Number.isFinite(value) ? { value, up: b.close >= b.open ? 1 : 0 } : null;
  }
}
