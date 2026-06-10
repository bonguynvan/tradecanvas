---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Coppock Curve indicator

- New `coppock` panel indicator (Edwin Coppock) — a long-term momentum
  oscillator: a weighted moving average of the sum of two rates of change
  (long 14 + short 11, WMA 10). Turning up from below zero is its classic
  major-bottom signal. Zero-centered, auto-scaled, configurable periods.
  Registered in the indicator menu; tested.
