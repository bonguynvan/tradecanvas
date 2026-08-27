---
"@tradecanvas/core": patch
---

Fix: a chart whose loaded bars don't fill the pane (e.g. a Year view with only a few candles) could
not be panned at all — `Viewport.clampOffset` locked the offset to a single value whenever the data
plus right margin didn't overflow the viewport. The view still rests at the same right-aligned
position by default; it's just no longer welded there. Dense series (data already wider than the
pane) are unaffected — this only changes the previously-locked "short data" branch.
