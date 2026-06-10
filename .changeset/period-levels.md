---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: prior-period levels (PDH / PDL / PDC)

- Draw the prior day's or week's high, low, and close — plus the current
  period's open — as labelled horizontal lines (PDH/PDL/PDC + Day Open, or the
  weekly PWH/PWL/PWC). The intraday support/resistance levels traders watch.
- **Chart**: `setPeriodLevelsVisible()` / `setPeriodLevelsPeriod('day'|'week')`,
  with a settings-sheet toggle + basis selector. Pure, tested
  `computePeriodLevels(bars, period)` exported from `@tradecanvas/core`.
