---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Volume Delta panel indicator

- New `voldelta` panel indicator approximates directional volume from OHLCV:
  bars closing up contribute positive volume, down bars negative.
  `mode: 0` renders the per-bar delta histogram (green/red), `mode: 1` the
  cumulative delta. Registered in the indicator menu; tested. (A true
  tick-by-tick delta needs per-trade bid/ask data, out of scope for OHLCV.)
