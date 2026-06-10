---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Elder Ray Index (Bull / Bear Power)

- New `elderray` panel indicator (Alexander Elder) — Bull Power
  (`high − EMA(close, n)`) and Bear Power (`low − EMA(close, n)`) measure how far
  buyers/sellers push price beyond consensus value. Drawn as two zero-centered
  histograms. Configurable `period` (13). Registered in the indicator menu;
  tested.
