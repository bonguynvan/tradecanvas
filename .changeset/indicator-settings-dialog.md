---
'@tradecanvas/chart': patch
---

feat: indicator settings dialog

- Each indicator row in the object tree gets a gear button that opens a
  parameter editor. The dialog introspects the indicator's default config to
  pick a control per field — number stepper, toggle, colour swatch, or text —
  and applies edits live through `chart.updateIndicator()` (recalculates in
  place; no remove-and-re-add). "Reset to defaults" restores the original
  config.
