---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

Style keys for the price axis's tags, and a grid ruled at the starts of periods. `lastPrice.labelBackground` fills the last price's tag in one colour whatever the day's direction, and `lastPrice.labelTextColor` colours its text; unset, the tag is the up or the down colour as before, and the line keeps `upColor` and `downColor` either way. `axis.price.valueTagsOutlined` draws an indicator's value tags on the price axis outlined (the chart's background, an edge and its text in the line's colour) instead of filled. `grid.vertical.periodsOnly` keeps the vertical grid lines where a period begins: months on a chart of days, years among months, days on an intraday chart. Each has a row in Chart Settings.
