/** What a screen reader hears from the chart; `{name}` placeholders are filled in. */
export interface ChartA11yLabels {
  /** What the chart is called (`aria-roledescription`). */
  role: string;
  /** `{what}`: symbol, type and timeframe; `{close}`: the last price. */
  summary: string;
  /** With no bars. */
  empty: string;
  /** After the keys move the view: `{count}`, `{from}`, `{to}`, `{high}`, `{low}`. */
  view: string;
  /** One bar: `{time}`, `{open}`, `{high}`, `{low}`, `{close}`, `{volume}`. */
  bar: string;
  /** How to use the keys (read with the chart). */
  keys: string;
  /** A chart type's name; its id when left out. */
  typeName?: (type: string) => string;
}
