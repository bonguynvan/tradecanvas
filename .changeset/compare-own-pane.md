---
'@tradecanvas/core': minor
'@tradecanvas/commons': patch
'@tradecanvas/chart': minor
---

A compare added in a pane of its own gets one. In ChartWidget, Compare's "Price, in a pane of its own" drew the other symbol's price on the main pane, as "on its own scale" without the scale: the line was an overlay, and an overlay can't open a pane. It now adds the new `compareSymbolPane` indicator, which reads the symbol as `compareSymbol` does and draws its close in a pane of its own, on that pane's scale; taking the comparison off takes the pane away. On a `Chart`, `chart.addIndicator('compareSymbolPane', { symbol: 'ETHUSDT' })` does the same; `compareSymbol` stays on the price pane (on the price scale, or `{ scale: 'left' }` for a scale of its own).
