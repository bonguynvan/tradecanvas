---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Choppiness Index indicator

- New `chop` panel indicator measures trend vs consolidation on a 0–100 scale
  (> 61.8 choppy/range, < 38.2 trending) from the ratio of summed true range to
  the n-bar high-low range. Reference lines at 38.2 / 61.8, configurable
  `period` (default 14). Registered in the indicator menu; tested.
