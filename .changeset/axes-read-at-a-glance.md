---
'@tradecanvas/chart': patch
'@tradecanvas/core': patch
'@tradecanvas/commons': patch
---

The two axes read at a glance. The price scale takes the largest round step whose labels sit no farther apart than 56 px (it left a laptop six labels where sixteen fit). The last price's line is dotted, the crosshair's tags are quieter than the last price's, a date on a tag names its month (`Nov 12 23:05`, never `11/12`), a new day is in the heavier weight on the time axis, and the dark theme's grid is a step lighter. `lastPrice.style`, `crosshair.labelBackground` and `crosshair.labelTextColor` set the old looks back.
