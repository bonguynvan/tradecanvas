---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

Fix a real performance bug behind reports of panning/zooming feeling janky
with indicators active: both `IndicatorEngine.getOverlayPriceRange` (overlay
indicators auto-scaling the main pane) and `computeIndicatorPriceRange`
(panel indicators auto-scaling their own pane) ran on **every autoScale
render frame** — i.e. every pan/zoom/resize, while any indicator is active —
but walked the indicator's *entire* `values` Map and discarded everything
outside the visible range, instead of only visiting the visible bars. That's
O(dataset length) wasted work per indicator per frame instead of O(visible
range); with more history loaded or more active indicators, panning did
proportionally more pointless work on every single frame. Both now walk
`output.series` (the array already indexed by bar position, maintained
specifically for this kind of fast lookup) directly over `[from, to]`.

Also adds the `wma` (Weighted Moving Average) indicator — linear
recency-weighted, computed incrementally in O(1) per bar. Registry now at 70.
