---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: swing / pivot markers

- Mark fractal swing highs and lows with small triangles (▼ above a confirmed
  pivot high, ▲ below a pivot low) — the market-structure points traders read.
  Strength is configurable (how many bars must be lower/higher on each side),
  with optional price labels. `setPivotMarkersVisible()` /
  `setPivotMarkersConfig()` + a settings-sheet toggle and strength slider.
- Pure, tested `findPivots(data, left, right)` exported from `@tradecanvas/core`
  (strict comparison so ties / plateaus don't register, unconfirmed tail pivots
  omitted).
