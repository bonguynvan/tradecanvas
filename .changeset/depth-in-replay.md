---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

The order book during a replay: `pushDepthSnapshot` without a time stamps a live book at the live series' last bar, not at the bar the replay is on; the liquidity heatmap draws only the books of the bars the replay has shown, and all of them again after it; the depth overlay, the live market's book, is not drawn beside a replay's price and comes back when it ends. `DepthHeatmapRenderer.setShownUntil(time)` draws only the books stamped before `time` (null draws them all).
