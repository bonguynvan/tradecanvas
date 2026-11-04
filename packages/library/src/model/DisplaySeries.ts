import type { ChartTypeOptions, DataSeries } from '@tradecanvas/commons';
import { ReshapeMemo } from '@tradecanvas/core';
import { pointAndFigureDisplay, rangeBarsStep, resolveDisplayData, type ChartTypeLookup } from '../charts/ChartTypeStrategy.js';

/** What the series a chart type draws is made of, read each time it is asked for. */
export interface DisplaySources {
  /** The bars shown. */
  bars(): DataSeries;
  /** Moves on every write to them, in place or not (`SeriesStore.version`). */
  version(): number;
  chartType(): string;
  /** Replaced, never changed in place, when the options change. */
  chartTypeOptions(): ChartTypeOptions;
  /** A chart type of a plugin's, which draws its own series. */
  lookup: ChartTypeLookup;
  /** The market's price step at a price: range bars are built on it. */
  stepAt(price: number): number | undefined;
  /** The box the built-in point & figure columns were made on, for its renderer. */
  onBoxSize(box: number): void;
}

/**
 * The series the chart type draws (Heikin-Ashi candles, Renko bricks, Kagi
 * lines…), made from the bars when something it is made of changed and
 * kept between frames otherwise. It sees every change itself: a write to
 * the bars moves their version, so no writer has to remember to drop it.
 * No DOM.
 */
export class DisplaySeries {
  private series: DataSeries | null = null;
  private madeAt: { version: number; type: string; options: ChartTypeOptions; step: number | undefined; epoch: number } | null = null;
  /** Moves on `invalidate`, for a change the sources don't show. */
  private epoch = 0;
  /** What Renko, Kagi and point & figure keep from one build to the next, to make the end again only. */
  private readonly memo = new ReshapeMemo();

  constructor(private readonly sources: DisplaySources) {}

  get(): DataSeries {
    const raw = this.sources.bars();
    if (raw.length === 0) return raw;
    const type = this.sources.chartType();
    const options = this.sources.chartTypeOptions();
    // Range bars go on the market's own grid, not the decimals the axis shows, which follow the view: the
    // coarsest step of the bars their range is measured on, so a last price over a band edge rebuilds nothing.
    const step = type === 'rangeBars' ? rangeBarsStep(raw, (price) => this.sources.stepAt(price)) : undefined;
    const version = this.sources.version();
    const at = this.madeAt;
    if (this.series && at && at.version === version && at.type === type && at.options === options && at.step === step && at.epoch === this.epoch) {
      return this.series;
    }
    this.series = this.make(type, raw, options, step);
    this.madeAt = { version, type, options, step, epoch: this.epoch };
    return this.series;
  }

  /** Made again on the next `get`: something it is made of changed where the sources don't show it. */
  invalidate(): void {
    this.epoch++;
  }

  /**
   * A new series, a new chart type or new hours shown: nothing kept from the
   * last build is of use, the end made again included.
   */
  reset(): void {
    this.invalidate();
    this.memo.clear();
  }

  /**
   * The built-in point & figure's columns come with the box they were built
   * on, which its renderer draws them at, in the one walk (a plugin's chart
   * type keeps its own).
   */
  private make(type: string, raw: DataSeries, options: ChartTypeOptions, step: number | undefined): DataSeries {
    const { lookup } = this.sources;
    if (type !== 'pointAndFigure' || lookup(type)) return resolveDisplayData(type, raw, lookup, options, step, this.memo);
    const { columns, boxSize } = pointAndFigureDisplay(raw, options, this.memo);
    this.sources.onBoxSize(boxSize);
    return columns;
  }
}
