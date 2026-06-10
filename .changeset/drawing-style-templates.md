---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: drawing style popover + saved templates

- A palette button on the drawing sidebar opens a style popover: colour
  swatches + picker, line width, and line style, applied to the next drawing
  **and** the currently selected one. Save named **style templates** (persisted
  to localStorage) for one-click reuse; apply or delete them inline.
- Core: `DrawingManager.getActiveStyle()` and `setSelectedDrawingStyle()`
  (records an undo entry), surfaced on `Chart` as `getDrawingStyle()`,
  `setSelectedDrawingStyle()`, and `getSelectedDrawingId()`.
- New `DrawingTemplateStore` (injectable storage, upsert-by-name, corruption-
  tolerant) with full unit coverage.
