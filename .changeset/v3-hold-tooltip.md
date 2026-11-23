---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

`features.crosshairTooltip` takes `'hold'`: the floating OHLCV tooltip shows only while a mouse press is held still on the plot, follows the pointer until the button is let go, and the chart does not pan meanwhile. `ChartWidget` starts on it (it had no popup under the mouse); `Chart` keeps the popup under a pointer that hovers.
