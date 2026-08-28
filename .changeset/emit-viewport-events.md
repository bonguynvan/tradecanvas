---
"@tradecanvas/chart": patch
---

Fix: `visibleRangeChange` never fired — along with the sibling `priceRangeChange` and `zoomChange`
events. All three were documented and typed but never emitted anywhere in `Chart`. They now fire from
`updateViewportAndRender` (and price-axis drag-scaling) whenever the corresponding viewport state
actually changes, so panning, zooming, resizing, and data updates surface to `chart.on(...)`
consumers. `visibleRangeChange` payload is `{ from, to }` bar indices, `priceRangeChange` is
`{ min, max }`, `zoomChange` is `{ barWidth }` pixels-per-bar.
