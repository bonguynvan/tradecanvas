---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Fisher Transform, Detrended Price Oscillator, and Balance of Power indicators

- `fisher` — Fisher Transform (John Ehlers): Gaussian-normalizes price so
  turning points appear as sharp peaks, plotted with a one-bar lagged trigger
  line (the log singularity is clamped). Zero-centered.
- `dpo` — Detrended Price Oscillator: removes the longer trend
  (`close[i − period/2 − 1] − SMA(close, period)`) to expose price cycles.
- `bop` — Balance of Power: per-bar buyer/seller strength
  `(close − open)/(high − low)`, SMA-smoothed, bounded to [−1, 1].

All three registered in the indicator menu and unit-tested.
