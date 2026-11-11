import type {
  IndicatorConfig,
  IndicatorDescriptor,
  IndicatorIntervals,
  IndicatorOutput,
  IndicatorPlugin,
  OHLCBar,
  ResolvedIndicatorStyle,
} from '@tradecanvas/commons';

/** An indicator on the chart, as the engine keeps it. */
export interface IndicatorInstance {
  plugin: IndicatorPlugin;
  config: IndicatorConfig;
  output: IndicatorOutput | null;
  style: ResolvedIndicatorStyle;
  /** Bars with `close` replaced by the price source, kept for incremental updates. */
  sourceBars?: OHLCBar[];
  /** What an indicator read from another's line was computed on, kept for incremental updates. */
  lineInput?: LineInput;
  /**
   * The first bar whose values the last computation may have changed: what
   * indicators read from this one must recompute from. 0 after a full
   * computation.
   */
  changedFrom: number;
  /** Not shown on the chart's interval (its `intervals` leave it out). */
  offInterval: boolean;
  /** Not shown on the chart's type: it reads another symbol by time, and the bars drawn carry none. */
  offChartType: boolean;
}

export interface LineInput {
  sourceId: string;
  key: string;
  /** Index in the chart's bars of the line's first value. */
  start: number;
  /** Bars made of the line, from `start` on. */
  bars: OHLCBar[];
  /** The plugin's own output over `bars`. */
  raw: IndicatorOutput;
  /** `raw` re-indexed to the chart's bars: the instance's output. */
  aligned: IndicatorOutput;
}

/** An active indicator instance as listed by `getActiveIndicators`. */
export interface ActiveIndicatorInfo {
  instanceId: string;
  id: string;
  params: Record<string, unknown>;
  descriptor: IndicatorDescriptor;
  visible: boolean;
  /** Whether it is drawn now: visible, on the chart's interval, and on its type. */
  shown: boolean;
  /**
   * True while the chart's type draws bars with no time of their own (Renko,
   * Kagi, line break, point & figure, range bars) and the indicator reads
   * another symbol by time (a compare on its own scale or in a pane, a
   * spread, a ratio, a correlation) or counts days (VWAP and the others
   * whose descriptor says `readsExchangeTimeZone`): it is not drawn there.
   */
  offChartType?: true;
  /** The intervals it shows on, when not all. */
  intervals?: IndicatorIntervals;
  /** The instance whose pane it is drawn in, when not its own. */
  pane?: string;
  /** `'left'`: an overlay on a price scale of its own on the left, not the chart's prices. */
  scale?: 'left';
}
