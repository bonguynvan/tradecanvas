---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

The "+" by the price axis takes the click when a drawing's body lies under it. A position's zone (or any filled drawing) that reached the price axis swallowed the click, though the "+" was drawn over it, so no alert or order could be added at a price inside the zone. Only the selected drawing's handle still comes first there; away from the "+" the drawing takes the click as before.
