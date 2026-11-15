---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

The order book can be drawn on a chart that only shows prices: `features: { depth: true }` needs no orders and works with `trading: false`. `chart.setDepthOverlay` (and the `depthOverlay` option) take a `mode` (`'cumulative'`, the default, or `'level'`, each price's own size), `markBest` (a line at the best bid and ask) and the bars' `maxWidth` and colours. Books are read in any order and bad levels are ignored.
