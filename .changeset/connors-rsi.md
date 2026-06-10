---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Connors RSI indicator

- New `crsi` panel indicator (Larry Connors) — a composite mean-reversion
  oscillator averaging three 0–100 components: a short price RSI (3), an RSI of
  the up/down streak length (2), and the percent-rank of the 1-bar rate of
  change over a lookback (100). Extremes (< 10 / > 90) flag oversold /
  overbought. Configurable periods, reference lines at 10/90. Registered in the
  indicator menu; tested.
