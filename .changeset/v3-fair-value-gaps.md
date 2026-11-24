---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

Fair value gaps: `addIndicator('fvg')` draws a box over the prices three bars left traded by the middle one alone, to the right edge while the gap is open; `showFilled: 1` keeps the filled ones and `minPercent` leaves out the small ones. `detectFairValueGaps(bars)` gives them all with no chart.
