---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

The time axis of Renko, Kagi, line break, point & figure and range bars reads real dates. It wrote one label across the whole axis (`00:00:00`, or the minutes of 1970), from times that only count the bricks. A brick, line or column is now dated by the bar it was finished on, on the axis and on the crosshair's time label, so the axis reads the years, months and days the chart spans; bricks finished on one bar share its label. Their own `time` values are as before. The new `axisTimes(series)` gives those dates for a series built by `toRenko`, `toKagi`, `toLineBreak`, `toPointAndFigure` or `toRangeBars`.
