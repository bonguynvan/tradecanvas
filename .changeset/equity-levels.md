---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

`EquityCurveChart` draws levels and bands. `levels` are lines across the plot at fixed values, each with its value in a tag at the axis and an optional `label`, `color` and `dash`. `bands` are tinted stretches of values under the curve, with an optional `label` and `color`. The value scale widens to show them unless `fitLevels: false`, and `setOptions` changes them without making the chart again.
