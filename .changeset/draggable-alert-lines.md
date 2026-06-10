---
'@tradecanvas/commons': patch
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: draggable price-alert lines

- Grab an alert line on the chart and drag it to a new price — the cursor
  switches to a resize affordance on hover, and moving an alert re-arms a
  triggered one. Scale-aware (works in log / percentage / indexed modes).
- New `AlertDragHandler` (core) wired into `InteractionManager`; hit-tested
  after trading/drawing so it only claims the gesture right on a line.
- `AlertManager.getAlertAtPoint()` / `updateAlertPrice()` added; the chart
  emits a typed `alertUpdate` event on drag, and the alerts panel refreshes.
