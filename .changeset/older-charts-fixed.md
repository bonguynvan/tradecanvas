---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

Fixes in the older finance charts. A waterfall keeps its running total through a step of 0 (it was read as a subtotal) and through a value that is no number, and its turned labels are drawn in place on screens with a pixel ratio other than 1. `setOptions` now applies `theme` on `DepthChart`, `EquityCurveChart`, `WaterfallChart`, `SparklineChart`, `GaugeChart` and `HeatmapChart`, `crosshair` on the four with a readout and `onCellClick` on a heatmap made without one; `ariaLabel` labels all of them. Colours given as `#rgb`, with an alpha or as `rgb()` fade correctly under a sparkline, an equity curve and a depth chart. An equity curve reads its benchmark at the pointed time, draws flat data with its value labels, and keeps a longer benchmark inside the plot. A depth chart draws a book of one level, as a shelf out to the plot's edge, and marks no middle price or spread on a book with one side; a heatmap gives a `NaN` value the scale's `zero` colour and no value text, and a `NaN` weight no room. With no data, an equity curve, a depth chart and a waterfall draw their background.
