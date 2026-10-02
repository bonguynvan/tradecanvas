---
'@tradecanvas/chart': patch
---

**ChartWidget polish.**

- **Drawing tool menus no longer close on the way to them.** The gap between
  a sidebar button and its menu now counts as part of the menu, and a menu
  waits a moment before closing, so a diagonal move to an item doesn't lose it.
- **The loader never shows "Loading chart…"** and keeps moving with reduced
  motion: the candles glow in turn (opacity only, nothing slides). Page-wide
  reduced-motion resets that zero animation delays no longer flatten it.
