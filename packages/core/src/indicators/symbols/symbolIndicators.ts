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

interface CorrelationParams extends SymbolParams {
  length: number;
}

const readCorrelation = (config: IndicatorConfig): CorrelationParams => {
  const length = Math.round(Number(config.params.length ?? 20));
  return { symbol: symbolOf(config), length: Number.isFinite(length) ? Math.max(2, length) : 20 };
};

/** The Pearson correlation of two runs of numbers, or null when either holds still. */
function correlationOf(xs: readonly number[], ys: readonly number[]): number | null {
  // Exactly, before any rounding: a held price (a halted symbol, a daily close
  // carried over hourly bars) leaves a gap, not a correlation of noise.
  if (xs.every((v) => v === xs[0]) || ys.every((v) => v === ys[0])) return null;
  const n = xs.length;
  let mx = 0;
  let my = 0;
  for (let k = 0; k < n; k++) {
    mx += xs[k];
    my += ys[k];
  }
  mx /= n;
  my /= n;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let k = 0; k < n; k++) {
    const dx = xs[k] - mx;
    const dy = ys[k] - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  return vx > 0 && vy > 0 ? Math.max(-1, Math.min(1, cov / Math.sqrt(vx * vy))) : null;
}

const CORRELATION_DESCRIPTOR = {
  placement: 'panel',
  defaultConfig: { symbol: '', length: 20 },
  inputs: { length: { min: 2 } },
  plots: [{ key: 'value', title: 'Correlation', color: 0 }],
  scale: { min: -1, max: 1 },
  levels: [0],
} as const;

/**
 * Correlation Coefficient: how closely the chart's closes and another
 * symbol's (its bar at or before each one) move together over the last
 * `length` bars, from −1 (opposite) to 1 (in step).
 */
export class CorrelationCoefficientIndicator extends PointwiseIndicator<CorrelationParams> {
  descriptor: IndicatorDescriptor = { ...CORRELATION_DESCRIPTOR, id: 'correlation', name: 'Correlation Coefficient', shortName: 'Correlation' };

  constructor(private readonly store: SymbolSeriesStore) {
    super();
  }

  protected read(config: IndicatorConfig): CorrelationParams {
    return readCorrelation(config);
  }

  protected pointAt(data: DataSeries, i: number, { symbol, length }: CorrelationParams): IndicatorValue | null {
    if (!symbol || i < length - 1) return null;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let j = i - length + 1; j <= i; j++) {
      const other = this.store.closeAt(symbol, data[j].time);
      if (other === undefined) return null;
      xs.push(data[j].close);
      ys.push(other);
    }
    const value = correlationOf(xs, ys);
    return value === null ? null : { value };
  }
}

/**
 * Correlation Log: the correlation of the two symbols' bar-to-bar log returns
 * over the last `length` bars. Prices that trend together correlate whatever
 * their day-to-day moves; returns tell whether they move together bar by bar.
 */
export class CorrelationLogIndicator extends PointwiseIndicator<CorrelationParams> {
  descriptor: IndicatorDescriptor = { ...CORRELATION_DESCRIPTOR, id: 'correlationlog', name: 'Correlation Log', shortName: 'Correlation Log' };

  constructor(private readonly store: SymbolSeriesStore) {
    super();
  }

  protected read(config: IndicatorConfig): CorrelationParams {
    return readCorrelation(config);
  }

  protected pointAt(data: DataSeries, i: number, { symbol, length }: CorrelationParams): IndicatorValue | null {
    if (!symbol || i < length) return null;
    const xs: number[] = [];
    const ys: number[] = [];
    let before = this.store.closeAt(symbol, data[i - length].time);
    for (let j = i - length + 1; j <= i; j++) {
      const other = this.store.closeAt(symbol, data[j].time);
      const a = data[j - 1].close;
      const b = data[j].close;
      if (other === undefined || before === undefined || !(a > 0 && b > 0 && other > 0 && before > 0)) return null;
      xs.push(Math.log(b / a));
      ys.push(Math.log(other / before));
      before = other;
    }
    const value = correlationOf(xs, ys);
    return value === null ? null : { value };
  }
}
