---
'@tradecanvas/chart': patch
---

Fix: switching symbol or timeframe no longer gets stuck on the previous
symbol's price range after a manual price-axis drag or vertical pan.

`setData()` is always a full series replace (live ticks go through
`appendBar`/`updateLastBar` instead), so it now restores the chart's
configured `autoScale` default the same way it already resets the X-axis
scroll position — matching TradingView, which always fits a freshly
loaded symbol/timeframe regardless of how the previous one was scaled.
An explicit `chart.setAutoScale(false)` still sticks across `setData()`
calls, same as a constructor-time `autoScale: false`.

Also wires the newly-added indicators (`vwma`, `envelope`, `tema`) and
drawing tools (`horizontalRay`, `riskReward`) into `ChartWidget`'s own
indicator/drawing-tool catalogs (`widgetConfig.ts`) — they were only
reachable through the headless API before, not the widget's pickers,
which is what the demo site actually runs.
