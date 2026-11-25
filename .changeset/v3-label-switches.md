---
'@tradecanvas/core': patch
'@tradecanvas/chart': minor
---

An indicator's name in the legend, the chips, the Objects panel and the CSV no longer shows an on/off input as a bare 0 or 1: it is left out at its default and named away from it, on ("OB 5 5 Broken", "Vol Δ Cumulative") or off ("Patterns 10 Reversal off"), in the widget's language. `indicatorChipLabel` takes the indicator's `inputs` as a fifth argument.
