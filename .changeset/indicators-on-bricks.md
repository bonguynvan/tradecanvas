---
'@tradecanvas/core': patch
'@tradecanvas/commons': minor
'@tradecanvas/chart': minor
---

Indicators on Renko, Kagi, line break, point & figure and range bars are worked out on the bricks, lines or columns drawn. They were worked out on the bars under them and drawn at the bricks' places, so an EMA stayed near 92,000 while the bricks climbed to 98,900, an RSI line had nothing to do with the value its legend gave, and the lines started a third of the way across the plot. Now a line sits on the bricks and reads their closes; `getIndicatorOutput(id).series` holds a point per brick, the legend and ChartWidget's data window read it at the brick under the pointer (the latest brick with none), an alert on an indicator line reads its last brick, and an export writes the bricks beside their values, dated as the axis dates them. The indicators that count days, VWAP, Session VWAP and the multi-timeframe moving average, are left off these types as the ones that read another symbol are (`offChartType: true`), and `getActiveIndicators()` now gives `scale: 'left'` for an overlay on a scale of its own. Back on candles everything is worked out on the bars again.
