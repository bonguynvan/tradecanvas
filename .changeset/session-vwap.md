---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Session VWAP indicator

- New `svwap` overlay — a volume-weighted average price that resets at the
  start of each calendar day (UTC), the way intraday traders read VWAP.
  Distinct from the cumulative `vwap` (never resets) and `avwap` (manual
  anchor); the line breaks cleanly at each session boundary. Registered in the
  indicator menu; tested.
