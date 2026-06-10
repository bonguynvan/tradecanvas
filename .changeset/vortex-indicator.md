---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Vortex Indicator (VI+ / VI−)

- New `vortex` panel indicator plots VI+ and VI− from consecutive highs/lows
  normalised by true range (configurable `period`, default 14). VI+ crossing
  above VI− signals an up-trend (and vice-versa); a 1.0 reference line marks the
  pivot. Auto-scales to the visible range. Registered in the indicator menu;
  tested.
