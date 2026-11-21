---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

Style keys for the price axis's tags, and a grid ruled at the starts of periods. `lastPrice.labelBackground` fills the last price's tag in one colour whatever the day's direction, and `lastPrice.labelTextColor` colours its text; unset, the tag is the up or the down colour as before, and the line keeps `upColor` and `downColor` either way. `axis.price.valueTagsOutlined` draws an indicator's value tags on the price axis outlined (the chart's background inside an edge of the line's colour, its text in that colour) instead of filled. `grid.vertical.periodsOnly` rules the vertical grid where a period begins, not at the axis's labels: each day's first bar on an intraday chart, each month's on a chart of days, each year's on a chart of weeks or months, and the next coarser period where those would be closer than 40 px. Each has a row in Chart Settings.
