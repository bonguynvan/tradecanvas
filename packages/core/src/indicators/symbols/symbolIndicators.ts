import type { DataSeries, IndicatorConfig, IndicatorDescriptor, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import type { SymbolSeriesStore } from './SymbolSeriesStore.js';

interface SymbolParams {
  symbol: string;
}

interface SpreadParams extends SymbolParams {
  ratio: boolean;
}

const symbolOf = (config: IndicatorConfig): string =>
  typeof config.params.symbol === 'string' ? config.params.symbol.trim() : '';

/**
 * Another symbol's close on the chart's bars, by time (its bar at or before
 * each one): compare it on its own scale (`scale: 'left'`) or in a pane of
 * its own. Its bars come from the chart's `setSymbolSeries`.
 */
export class CompareSymbolIndicator extends PointwiseIndicator<SymbolParams> {
  descriptor: IndicatorDescriptor = {
    id: 'compareSymbol',
    name: 'Compare Symbol',
    placement: 'overlay',
    defaultConfig: { symbol: '' },
    shortName: 'Compare',
    plots: [{ key: 'value', title: 'Close', color: 0 }],
  };

  constructor(private readonly store: SymbolSeriesStore) {
    super();
  }

  protected read(config: IndicatorConfig): SymbolParams {
    return { symbol: symbolOf(config) };
  }

  protected pointAt(data: DataSeries, i: number, { symbol }: SymbolParams): IndicatorValue | null {
    if (!symbol) return null;
    const value = this.store.closeAt(symbol, data[i].time);
    return value === undefined ? null : { value };
  }
}

/**
 * The chart's close against another symbol's, bar by bar: their difference
 * (`mode` 'spread') or their ratio ('ratio').
 */
export class SpreadIndicator extends PointwiseIndicator<SpreadParams> {
  descriptor: IndicatorDescriptor = {
    id: 'spread',
    name: 'Spread / Ratio',
    placement: 'panel',
    defaultConfig: { symbol: '', mode: 'spread' },
    shortName: 'Spread',
    plots: [{ key: 'value', title: 'Spread', color: 0 }],
    inputs: { mode: { options: ['spread', 'ratio'] } },
  };

  constructor(private readonly store: SymbolSeriesStore) {
    super();
  }

  protected read(config: IndicatorConfig): SpreadParams {
    return { symbol: symbolOf(config), ratio: config.params.mode === 'ratio' };
  }

  protected pointAt(data: DataSeries, i: number, { symbol, ratio }: SpreadParams): IndicatorValue | null {
    if (!symbol) return null;
    const other = this.store.closeAt(symbol, data[i].time);
    if (other === undefined) return null;
    if (!ratio) return { value: data[i].close - other };
    return other === 0 ? null : { value: data[i].close / other };
  }
}
