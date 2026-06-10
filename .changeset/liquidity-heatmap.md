---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: order-book liquidity heatmap

- Accumulate depth snapshots into a heatmap drawn behind the candles: each
  snapshot is a time-positioned strip where every price level's brightness
  scales (sqrt ramp) with resting size — bids green, asks red. Surfaces
  liquidity walls that persist over time, the classic crypto "heatmap".
- **Chart API**: `setDepthHeatmapVisible()` / `setDepthHeatmapConfig({ opacity,
  capacity })` / `pushDepthSnapshot()` / `clearDepthHeatmap()`. The widget's
  `setDepth()` records a snapshot on every book update; a "Liquidity heatmap"
  settings toggle controls it.
- Core: `DepthHeatmapRenderer` + a pure, tested `DepthHeatmapBuffer`
  (fixed-capacity ring, same-timestamp replace, max-volume scaling).
