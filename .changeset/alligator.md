---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Williams Alligator indicator

- New `alligator` overlay (Bill Williams) — three forward-displaced smoothed
  moving averages of the median price: jaw SMMA(13)→8, teeth SMMA(8)→5, lips
  SMMA(5)→3. Intertwined lines = range ("sleeping"); fanned out in order =
  trend ("feeding"). Configurable periods and shifts. Registered in the
  indicator menu; tested.
