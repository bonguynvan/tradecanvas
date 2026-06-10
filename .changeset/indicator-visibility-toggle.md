---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: show/hide indicators from the object tree

- Each indicator row in the object tree gains an eye toggle to hide/show it
  without removing it (parity with drawings) — handy for decluttering busy
  charts while keeping the indicator and its settings.
- Core: `IndicatorEngine.setVisible()` / `isVisible()`, `getActiveIndicators()`
  now reports `visible`; surfaced on `Chart` as `setIndicatorVisible()`.
