---
'@tradecanvas/core': patch
'@tradecanvas/chart': minor
---

An indicator's name in the legend, the chips, the Objects panel and the CSV no longer shows an on/off input as a bare 0 or 1: it is left out at its default and named when turned on ("OB 5 5 Broken", "Vol Δ Cumulative"). `indicatorChipLabel` takes the indicator's `inputs` as a fifth argument.
