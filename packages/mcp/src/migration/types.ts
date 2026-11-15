/**
 * What a name of another chart library's API becomes in TradeCanvas. The
 * tables are written by hand from that library's public docs; a test checks
 * that every TradeCanvas name in them is a real one (an indicator id, a
 * drawing type, a feature switch, a style key, an option).
 */

/** How a value given to the source becomes the value TradeCanvas takes. */
export type ValueTransform =
  /** Taken as it is. */
  | 'same'
  /** Lower case: `'Dark'` → `'dark'`. */
  | 'lowercase'
  /** A resolution (`'60'`, `'1D'`, `'W'`) → a timeframe (`'1h'`, `'1d'`, `'1w'`). */
  | 'resolution'
  /** A list of resolutions → a list of timeframes. */
  | 'resolutions'
  /** A time in seconds → milliseconds. */
  | 'seconds';

/** One place a source name lands in TradeCanvas. */
export type MigrationTarget =
  /**
   * A switch of ChartWidget's `features`. Its value is the source feature's
   * state, on or off (the other way round with `invert`).
   */
  | { feature: string; invert?: boolean }
  /**
   * An option, by its path from the entry point: `'ChartWidget.locale'`,
   * `'ChartWidget.chartOptions.rightMargin'`. With `on`/`off`, a source switch
   * sets that value when on or off; else the source's value goes through
   * `transform` (default `'same'`).
   */
  | { option: string; transform?: ValueTransform; on?: unknown; off?: unknown }
  /** A style key, for `overrides` / `chart.applyOverrides()`; a colour or width carries over as it is. */
  | { styleKey: string }
  /**
   * A built-in indicator: its id, and which of its params each of the
   * source's inputs sets (source input name → param name).
   */
  | { indicator: string; params?: Record<string, string> }
  /** A built-in drawing tool, by its type. */
  | { drawing: string }
  /** A TradeCanvas call or member that does the same: `'chart.setSymbol(symbol)'`, `'DataFeed.getBars'`. */
  | { api: string };

/** The kinds of names a source has. */
export type MigrationKind =
  /** An option of the widget's constructor. */
  | 'option'
  /** A featureset (`disabled_features` / `enabled_features`). */
  | 'featureset'
  /** An override key (`overrides`, `applyOverrides`). */
  | 'override'
  /** A built-in study (indicator), by the name `createStudy` takes. */
  | 'study'
  /** A drawing, by the shape name `createShape` / `createMultipointShape` take. */
  | 'drawing'
  /** A method of the widget or a chart (and its subscriptions). */
  | 'method'
  /** A member of the datafeed the chart pulls from. */
  | 'datafeed'
  /** A member of the broker (trading) API. */
  | 'broker';

export interface MigrationEntry {
  kind: MigrationKind;
  /** The name as the source spells it. */
  name: string;
  /** Where it lands; empty when TradeCanvas has nothing like it (`note` says what to do instead). */
  to: MigrationTarget[];
  /** What differs, or what to do instead. */
  note?: string;
}

/** The names of one source, and where they were read. */
export interface MigrationTable {
  /** `'tradingview'` (Advanced Charts, Trading Platform) or `'lightweight-charts'`. */
  source: string;
  /** The docs the table was written from, and when. */
  docs: string;
  entries: MigrationEntry[];
}
