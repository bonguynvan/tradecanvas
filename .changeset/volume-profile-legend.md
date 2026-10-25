---
'@tradecanvas/core': patch
---

The Volume Profile indicator (`volumeProfile`) draws see-through rows. They were solid blocks over the left of the price pane, so the legend under them (the open, high, low and close, the volume and the other indicators' values) and the candles at the left could not be read. The rows stay where they were, now at the strength of the chart's own volume profile, with the busiest rows marked by their colour only; price bands nobody traded at draw nothing. The indicator also follows its style's `opacity`, so `chart.updateIndicatorStyle(id, { opacity: 0.5 })` fades it further.
