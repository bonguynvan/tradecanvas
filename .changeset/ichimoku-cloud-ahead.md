---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

Ichimoku's cloud runs the displacement (26 bars by default) ahead of the price, as it should, and is drawn past the latest bar; the values ahead of it are in the output's `meta.ahead`, from bar `meta.aheadFrom`, and the price scale makes room for them. Lead A and Lead B at a bar, in the legend, the data window and an export, are now the values drawn there, worked out the displacement before. The cloud is filled only where both lead lines are, and the label names all four inputs, the displacement among them.
