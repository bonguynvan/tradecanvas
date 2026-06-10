---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Chandelier Exit indicator

- New `chandelier` overlay (Chuck LeBeau) draws ATR-based trailing-stop levels:
  long exit = highest-high(n) − mult·ATR(n), short exit = lowest-low(n) +
  mult·ATR(n). Drawn as two dashed lines (green long stop, red short stop).
  Configurable `period` (22) and `multiplier` (3). Registered in the indicator
  menu; tested.
