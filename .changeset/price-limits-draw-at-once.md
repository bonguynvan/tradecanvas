---
'@tradecanvas/chart': patch
---

The ceiling, floor and reference lines show as soon as `setPriceLimits` gives the day's reference. After `setMarket` on a market with limits, they stayed off the chart until something else redrew it (a pan, a zoom, a new bar), and a new reference moved them only then. They are now drawn, or moved, at once.
