---
'@tradecanvas/commons': patch
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

fix: review-pass hardening of click, alert, and bracket code

- **Spurious clicks**: resetting click-tracking state in `onMouseLeave` so a
  press that drifts out of the canvas and releases outside no longer fires a
  ghost `click` / `barClick` (and stray replay-seek).
- **Bar mapping**: the new click handler now uses the canonical `xToBarIndex`
  (accounts for chart-rect offset and bar centering) so the clicked bar matches
  the crosshair and drawings.
- **Bracket on touch**: touch events route to the trading manager, so the
  bracket handles (and order/position lines) are draggable on mobile.
- **Alert level conditions**: `greaterThan` / `lessThan` are now edge-triggered
  — they fire once on entering the condition (immediate fire preserved if
  already past the level) instead of every tick; repeating alerts re-arm once
  the value leaves the level.
- **Alert context switches**: `AlertManager.clearLastValues()` is called on
  `setData` so indicator-channel alerts don't cross against a stale previous
  value after a symbol/timeframe change.
- **Alert persistence**: `repeating` is now saved/restored, and price-0 alerts
  (e.g. oscillator `> 0`) are no longer dropped on load.
- **Bracket defaults**: stop distance is floored so a zero entry price can't
  collapse SL/TP onto entry.
- **Alert sources**: multi-output indicator lines (MACD, Stochastic) are
  discovered from the latest series point so all lines are offered.
