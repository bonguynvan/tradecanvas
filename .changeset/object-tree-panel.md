---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: object tree panel (layers manager)

- **Layers button + object-tree panel** in `ChartWidget` — lists every active
  indicator and drawing on the chart. Indicators can be removed; drawings get
  per-item show/hide, lock/unlock, and delete, all reflected live. Refreshes on
  drawing/indicator add & remove. Default on; opt out with `objectTree: false`.
  Bottom-sheet on phones.
- **Per-drawing core API** — `DrawingManager.setDrawingVisible(id, v)` /
  `setDrawingLocked(id, v)` (single-item, alongside the existing bulk
  operations), surfaced on `Chart` as `setDrawingVisible` / `setDrawingLocked`.
