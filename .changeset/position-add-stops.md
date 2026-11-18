---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

A position with no stop-loss or no take-profit can be given one on the chart. Its entry's tag has an **SL** or a **TP** button: press it and drag the new line where you want it, or just click to set it where it starts. A stop starts 1% of the entry away and a target at twice the stop's distance, both at least 1% beyond the price now. Letting go sends `positionModify`, as dragging a stop does, so a connected execution adapter applies it. Before, a position opened without them, or whose stop was removed with its ×, could get one back only from code. `lineButtons: { addStops: false }` leaves the buttons out.
