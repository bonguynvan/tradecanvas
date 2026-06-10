---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Know Sure Thing (KST) indicator

- New `kst` panel indicator (Martin Pring) — a momentum oscillator from four
  smoothed rates of change weighted 1:2:3:4 toward the longer cycles, plus an
  SMA signal line. KST crossing its signal (and the zero line) flags momentum
  shifts. Zero-centered, auto-scaled, fully configurable ROC/SMA/signal periods.
  Registered in the indicator menu; tested.
