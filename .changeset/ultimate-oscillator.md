---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Ultimate Oscillator indicator

- New `uo` panel indicator (Larry Williams) blends three timeframes of buying
  pressure (weighted 4:2:1) into a 0–100 momentum oscillator that's less prone
  to false divergences than single-period oscillators. Configurable
  `fast`/`mid`/`slow` (7/14/28), reference lines at 30/70. Registered in the
  indicator menu; tested.
