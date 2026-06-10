---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: regular-trading-hours session shading

- Dim bars outside the regular session (pre/post-market or the overnight break)
  with a translucent overlay so the cash session stands out. Defaults to US
  equity RTH (09:30–16:00 ET); the window is configurable in minutes-of-day plus
  a timezone offset and handles overnight sessions (end < start).
- **Chart**: `setSessionShadingVisible()` / `setSessionShadingConfig()`, with a
  settings-sheet toggle. Pure, tested `isRegularSession` / `minuteOfDay` helpers
  exported from `@tradecanvas/core`.
