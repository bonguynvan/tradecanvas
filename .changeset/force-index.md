---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Elder Force Index indicator

- New `fi` panel indicator combines price direction, extent, and volume into a
  zero-centered oscillator — raw force = (close − prevClose) · volume,
  EMA-smoothed (configurable `period`, default 13). Above zero = bulls in
  control, below = bears; magnitude reflects conviction. Auto-scaled with a
  zero-line reference. Registered in the indicator menu; tested.
