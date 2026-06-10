---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: market-structure labels (HH / HL / LH / LL)

- Swing markers can now show market-structure labels — each pivot is tagged
  HH/LH (higher/lower high) or HL/LL (higher/lower low) against the prior
  same-type pivot, the read traders use to judge trend structure. Enable with
  `setPivotMarkersConfig({ structureLabels: true })` or the "Swing structure"
  settings toggle. Pure, tested `classifyPivots()` exported from
  `@tradecanvas/core`.
