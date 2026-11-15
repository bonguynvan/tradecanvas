---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

The colour bar under `MatrixChart` and `CalendarChart` is as wide as its labels need when the chart is narrower, so a one-column matrix no longer prints `-10.0%`, `0.0%` and `+10.0%` over each other. The bar measures its labels: the middle one is left out when it would touch an end, and the ends too when even they cannot stand apart.
