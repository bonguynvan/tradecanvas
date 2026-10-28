---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

Renko, Kagi, line break and range bars with fewer bricks than the view holds fill it, as point & figure does: on daily data they sat in the plot's right part with about 300 px empty on the left. A point & figure column's volume is now the volume of the bars it was made of; it was the reversing bar's alone, and 0 for the column still forming, so the legend read `Vol 0` beside volume bars. Their time axis keeps the two coarsest kinds of label on view, so a lone day (`Jul, 31, Oct`) no longer shows among the months.
