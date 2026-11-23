---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

`setDepthHeatmapConfig({ bidColor, askColor })` and `setMarketProfileConfig({ valueAreaColor, color })` give the liquidity heatmap and the market profile colours of their own, so a chart that hides or recolours its candles keeps them; the profile's POC, VAH and VAL are written under the legend, not over it.
