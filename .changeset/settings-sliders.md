---
'@tradecanvas/chart': patch
---

feat: tuning sliders in the settings sheet

- The chart-settings sheet gains range sliders to tune the profile/heatmap
  overlays live: **Market Profile buckets** (8–200) and **opacity**, and
  **liquidity heatmap opacity** — no code needed. Built on a new reusable
  `rangeRow` settings control with a live value readout.
