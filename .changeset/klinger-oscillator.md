---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Klinger Volume Oscillator

- New `kvo` panel indicator (Stephen Klinger) — compares volume flow to price
  movement via a cumulative "volume force", then KVO = EMA(VF, fast) −
  EMA(VF, slow) with an EMA signal line. Crossing the signal/zero line flags
  money-flow shifts. Zero-centered, auto-scaled, configurable
  `fast`/`slow`/`signal` (34/55/13). Registered in the indicator menu; tested.
