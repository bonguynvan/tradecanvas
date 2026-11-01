---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

Tags on the price axis no longer cover one another. The last price's tag stays on its line, and the other tags (bid and ask, high and low, the day's limits, orders and positions) move up or down only as far as they must. It is on by default: `features.alignAxisLabels`, `chart.setAxisLabelsAligned(false)` to keep every tag on its line. ChartWidget lists it as "No overlapping labels" in the price scale menu and in Settings, in all 30 languages.
