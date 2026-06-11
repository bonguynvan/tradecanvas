---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Mass Index, Chande Momentum, and TRIX indicators

- `massindex` — Mass Index (Donald Dorsey): sums the ratio of a single to a
  double EMA of the high-low range to flag "reversal bulges" (rise above 27,
  fall below 26.5). Reference lines at 26.5 / 27.
- `cmo` — Chande Momentum Oscillator: net momentum over the period swinging
  −100…+100 (no smoothing), with ±50 reference bands.
- `trix` — TRIX: percent rate of change of a triple-smoothed EMA of close, with
  an EMA signal line. Zero-centered.

All three registered in the indicator menu and unit-tested.
