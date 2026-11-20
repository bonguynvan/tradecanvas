---
'@tradecanvas/chart': minor
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
---

Williams Fractals draws its marks as triangles above a fractal high and below a fractal low, clear of the bar, instead of 3 px dots on the tips of the wicks, which were hard to see. As marks, they no longer show a value in the legend or a tag on the axis, and the widget no longer offers them as a line another indicator reads; `indicatorSource` still reads them.

A markers plot's style takes a `shape` (`triangleUp`, `triangleDown`, `arrowUp`, `arrowDown`, `dot`, `square`, `diamond`) and a `size` in pixels across, 2 to 40, or `'auto'` (as wide as the bars allow, 4 to 8 px): `chart.updateIndicatorStyle(id, { plots: { up: { shape: 'arrowUp', size: 14 } } })`. Saved layouts keep them, and the indicator settings' Style tab picks them for each mark.
