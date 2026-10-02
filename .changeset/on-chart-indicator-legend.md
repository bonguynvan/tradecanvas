---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

**Indicators listed on the chart, not in the toolbar.**

- ChartWidget shows each indicator on the chart: price-pane ones stacked under
  the OHLCV legend, pane ones (RSI, MACD…) at the top of their pane. A row
  reads "EMA 50  135.29": the value at the hovered bar, also over a pane (the
  latest one off the chart, and always on Renko, Kagi, point & figure, line
  break and range bars), in the colour its line is drawn in there (several
  lines share a neutral colour). On hover or focus it offers show/hide,
  settings and remove; clicking the name opens the settings. Values follow
  live ticks and replay. A stack of two or more can be collapsed; it opens
  again when an indicator joins it. The toolbar keeps only the Indicators
  button with its count, so it no longer overflows. `indicatorLegend: false`
  turns the list off.
- Breaking for custom CSS: the toolbar chip classes `.tcw-indicator-chips`,
  `.tcw-indicator-chip` and `.tcw-chip-remove` are gone; the rows use
  `.tcw-ind-legend*`.
- Each further instance of an indicator takes a palette colour no other
  instance of it uses, so a second EMA no longer looks like the first.
- `crosshairMove` now also fires over indicator panes above and below the
  price pane (with the bar under the pointer); the crosshair and the OHLC
  tooltip stay on the price pane. Mouse moves and taps on HTML controls
  inside the chart no longer move the crosshair.
- New Chart API for labels of your own: `getLegendBottom()`,
  `getIndicatorPanes()`, `getIndicatorStyle(id)`, `formatPrice(price)`,
  `isTimeAligned()`, `setPaneTitlesVisible(false)` (the pane's own name and
  hovered values), and the `paneResize` and `indicatorUpdate` events.
