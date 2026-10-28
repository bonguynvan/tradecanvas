---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

The indicators that read another symbol are not drawn on Renko, Kagi, line break, point & figure and range bars. A symbol compared on its own scale or in its own pane, a spread, a ratio and a correlation were still drawn there, read at the bricks' times, which only count the bricks: the other symbol's prices landed on the wrong bars. Like a percent compare, they are now left out on those types, and out of every scale; `getActiveIndicators()` gives them `shown: false` and the new `offChartType: true`, and ChartWidget dims their legend rows with "Not drawn on this chart type". Back on candles they come back.
