---
'@tradecanvas/commons': patch
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

A point & figure chart fills the view. Its automatic box was 1% of the average close, which on a stock that moved 7% made a single column of a few X's at the right edge. It is now a fiftieth of the range from the lowest low to the highest high (the bar still forming left out), rounded to 1, 2 or 5, so the columns span the scale. A chart with fewer columns than the view holds is fitted to it when the type, the box or the series changes. Boxes a few pixels high or less, from a box set small for the prices, are drawn as solid columns in the colour of their way instead of X's and O's too small to see.
