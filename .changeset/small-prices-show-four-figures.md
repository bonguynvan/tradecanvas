---
'@tradecanvas/chart': patch
'@tradecanvas/core': patch
'@tradecanvas/commons': patch
---

With no decimals set by the symbol or the market, a price under 1 shows at least four significant figures of itself on the legend, the crosshair and the tags beside the axis (0.000004349 where it read 0.00000435): the price scale's step alone left a sub-cent coin two or three. `autoPricePrecision`, `chart.roundPrice` and `chart.getPriceStep` follow.
