---
'@tradecanvas/core': patch
---

The Volume Profile indicator (`volumeProfile`) draws see-through rows. They were solid blocks at the left of the price pane: they hid the candles under them and took the contrast from the legend drawn over them (the open, high, low and close, the volume and the other indicators' values), which could not be read. The rows stay where they were, now at the strength of the chart's own volume profile, so the legend over them and the candles under them stay readable; the busiest rows are marked by their colour only, and price bands nobody traded at draw nothing. The indicator also follows its style's `opacity`, so `chart.updateIndicatorStyle(id, { opacity: 0.5 })` fades it further; an opacity above 1 counts as 1, and one that is no number leaves the rows at their usual strength.
