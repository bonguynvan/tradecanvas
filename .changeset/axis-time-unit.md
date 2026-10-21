---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

Dates stay right when scrolling back through history: a series' time unit (milliseconds or seconds) is decided once from its newest bar (`barTimeUnit`), so millisecond bars before September 2001 are no longer read as seconds and dated around the year 32,000 (time axis, crosshair, tooltips, measure, session breaks, export, CSV import); a bar or tick in the other unit is stored in the series' unit. The time axis leaves the space before the oldest bar unlabelled and shows the date wherever the date changes; times before the oldest bar follow the spacing of the first bars, weekends included. `setVisibleRange` and `fitContent` work on Renko, Kagi, Point & Figure and Line Break bricks, the crosshair reads the brick under it (`crosshairMove` gives the brick and its index in the series drawn on those types), and the legend's change on hover is from the bar before the hovered one.
