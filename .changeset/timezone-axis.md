---
'@tradecanvas/commons': patch
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: timezone-aware time axis + crosshair

- Time-axis labels, the timezone badge, and the crosshair time pill can now
  render in a fixed UTC offset instead of only the browser-local zone — handy
  for trading a market in its exchange time. `chart.setTimezoneOffset(minutes |
  null)` (e.g. -300 for EST, 330 for IST, null for local), with a Timezone
  selector in the settings sheet.
- Pure, tested `timeParts(timeMs, tzOffsetMinutes)` and `tzLabel()` helpers in
  `@tradecanvas/commons` (handles negative offsets that wrap the day and
  fractional offsets like +5:30).
