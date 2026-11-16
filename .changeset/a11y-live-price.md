---
'@tradecanvas/chart': patch
---

The chart's screen-reader summary follows the last bar: its "Last price" is said again, at most once a second, when a feed's `bar` updates (forming or closed), `updateLastBar`, `updateLastBarFromTick`, or a replay's steps and forming bar change the last bar's close, not only when the series grows.
