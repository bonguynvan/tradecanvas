---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

**Indicators in depth.**

- **One scale per pane.** A pane's lines, levels, axis labels and crosshair now
  share one value scale. Before, most pane indicators drew on a scale of their
  own, so the axis and crosshair could disagree with the lines (RSI's 30 line
  read as 38). The price scale no longer stretches to fit fields that are not
  drawn, such as PSAR's trend flag or Session VWAP's session key.
- **Declared plots.** Indicator descriptors can declare what they draw
  (`plots`: field, title, colour, line/histogram/dots/step, up/down tone), their
  pane `scale`, default `levels` and how `inputs` are edited. All built-ins do,
  and a contract test checks every one. `IndicatorBase.render` draws the
  declared plots, so a custom indicator needs no rendering code.
- **Sources.** 38 indicators that read the close take a `source`: a price
  (`close`, `open`, `high`, `low`, `hl2`, `hlc3`, `ohlc4`, `hlcc4`) or another
  indicator's line (`indicatorSource(instanceId, key)`). An indicator on a pane
  indicator (an SMA of RSI) is drawn in its pane, recomputed when it changes
  and removed with it.
- **Shared panes**: `addIndicator(id, params, position, { pane })`;
  `getIndicatorPanes()` lists each pane's `instanceIds`.
- **Levels** are drawn by the chart and editable per instance:
  `getIndicatorLevels`, `setIndicatorLevels`. They are kept in saved layouts,
  along with sources and shared panes.
- **Value tags.** Each line's latest value is tagged on its axis in its colour
  (`features.indicatorValueLabels`, `setIndicatorValueLabelsVisible`).
- **15 new indicators** (85 in all): DEMA, SMMA, ALMA, KAMA, LSMA, McGinley
  Dynamic, MA Cross, Williams Fractals, Chande Kroll Stop, Bollinger %B,
  Bollinger BandWidth, Momentum, Historical Volatility, Volume Oscillator, Ulcer
  Index.
- **New `indicatorChange` event** (`visible`, `style`, `levels`, `params`,
  `pane`); the widget's legend and object tree follow it.
- **`ChartOptions.chartType` is optional** and defaults to `'candlestick'`.
- **Widget changes.**
  - The indicator settings dialog has Inputs (with sources), Style (a colour
    per line, line width) and Levels tabs.
  - The legend colours every value as its line and uses short names.
  - Pane rows no longer cover the divider's grab zone.
  - New lines take a colour that no line in their pane already has.
  - The OHLC legend and bar-countdown toggles in Settings now take effect.
- **Fixes.** Volume Profile is drawn over the price pane; it never showed as a
  pane. AC uses the style's up and down colours.
- **Exports.** `PRICE_SOURCES`, `sourcePrice`, `indicatorSource`,
  `parseIndicatorSource` and the plot, scale and input types are exported from
  `@tradecanvas/chart`.
- **Faster live updates.** The new indicators and indicators read from another
  indicator's line follow live ticks incrementally.
- **Behaviour changes to note.**
  - Value tags are on by default; turn them off with
    `features.indicatorValueLabels: false`.
  - Built-in pane indicators draw with the viewport's value scale
    (`viewport.priceRange`) and no longer fit their own. Code that calls a
    plugin's `render` directly must pass the pane's viewport with its range
    (`getPaneValueRange`).
  - `new Chart(container, options)` keeps a copy of `options`; changing that
    object afterwards does not affect the chart.
  - A source that would make an indicator read from itself is ignored.
