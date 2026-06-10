---
'@tradecanvas/commons': patch
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: price scale modes (regular / log / percentage / indexed-to-100)

- **`chart.setScaleMode(mode)` / `getScaleMode()`** — switch the price axis
  between `regular`, `logarithmic`, `percentage`, and `indexedTo100`. Regular,
  percentage, and indexed share linear geometry; percentage labels show the %
  change from the first visible bar, indexed rebases that bar to 100. Logarithmic
  keeps the existing log geometry.
- **Settings panel** now offers a "Price Scale" selector (replacing the Log
  Scale toggle); the legacy `logScale` flag stays mirrored for persisted
  layouts, and `setLogScale()` / `isLogScale()` keep working.
- **`formatPriceScaleLabel()`** exported from `@tradecanvas/commons`, plus
  `PriceScaleMode` and `ViewportState.scaleMode` / `scaleBaseline`. The chart
  sets the baseline (first visible bar's close) each frame.
