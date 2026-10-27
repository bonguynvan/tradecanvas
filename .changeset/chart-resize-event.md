---
'@tradecanvas/commons': patch
'@tradecanvas/chart': patch
---

The chart's `resize` event now also comes when its element changes size (a window resize, a phone rotation, a dock panel opening), not only from `chart.resize()`, so ChartWidget's replay bar fits and places itself again after one.
