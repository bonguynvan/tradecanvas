---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Schaff Trend Cycle indicator

- New `stc` panel indicator (Doug Schaff) — runs a MACD line through two passes
  of stochastic smoothing to produce a fast, cyclic 0–100 trend oscillator that
  turns earlier than MACD. Reference lines at 25 / 75; configurable
  `fast`/`slow`/`cycle` (23/50/10). Registered in the indicator menu; tested.
