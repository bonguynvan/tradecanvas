---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

A position's value before expiry, clicks on a box plot and a radar, and 3D charts turned from the keyboard. `PayoffChart` takes a `model` (`{ daysToExpiry, volatility, rate?, dividendYield? }`) and draws a second, dashed line: what the legs make or lose with that many days to go, each option priced as a European one by Black-Scholes; `positionValue` and `optionPrice` are the sums. `BoxPlotChart` has `onBoxClick(group, stats)` and `RadarChart` `onAxisClick({ axis, index, values })`. `SurfaceChart` and `Bar3DChart` are reached with Tab: the arrows turn and tilt them, Home goes back, and a screen reader is told where the chart is seen from (`describeView` for your words); a chart that turns is `role="application"`, one with `rotate: false` stays a picture.
