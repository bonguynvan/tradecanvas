---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: chart click events + replay-from-clicked-bar

- The chart now emits `click` and `barClick` events for a plain left-click
  (press + release without dragging) — distinct from pan, draw, trade, and
  drag gestures. `barClick` carries `{ bar, barIndex, point }`.
- In the widget's replay mode, **clicking a revealed bar jumps the replay
  cursor** to it (pausing playback). Built on the new click event in
  `InteractionManager` (4px drag threshold so pans never register as clicks).
