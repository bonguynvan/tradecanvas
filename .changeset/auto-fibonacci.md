---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: auto Fibonacci + programmatic drawing append

- **`chart.autoFib()`** draws a Fibonacci retracement over the dominant swing
  (extreme high and low) in the visible range, anchored low→high for an up-swing
  and high→low for a down-swing. Exposed as an "Auto Fibonacci" command-palette
  action. Pure, tested `findDominantSwing(data, from, to)` in `@tradecanvas/core`.
- **`chart.addDrawing({ type, anchors, … })`** appends a drawing
  programmatically (id auto-assigned, active style applied, undo-tracked), built
  on a new `DrawingManager.addDrawing()`.
