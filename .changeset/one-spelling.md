---
'@tradecanvas/chart': major
'@tradecanvas/core': major
'@tradecanvas/commons': major
---

The names deprecated in 1.x are removed.

| Removed | Use |
|---|---|
| `chart.setTimezone(tz)` | `chart.setTimeZone(tz)` |
| `chart.getTimezone()` | `chart.getTimeZone()` |
| `chart.getEffectiveTimezone()` | `chart.getEffectiveTimeZone()` |
| `chart.getExchangeTimezone()` | `chart.getExchangeTimeZone()` |
| `chart.setTimezoneOffset(minutes)` | `chart.setTimeZone(minutes)` |
| `EXCHANGE_TIMEZONE` | `EXCHANGE_TIME_ZONE` |
| `SymbolInfo.timezone` | `SymbolInfo.timeZone` |
| `TimeFormatContext.kind` `'date'` | `'year'`, `'month'`, `'day'` (the axis gave no `'date'` since 1.x) |
| `SessionBreaks.setLocale()`, `renderLabels()` (`@tradecanvas/core`) | nothing: both did nothing |
| the widget string `replay.barsPerSecond` | nothing: unused; the speed reads `replay.rate` |

**`SymbolInfo.timezone` is no longer read.** A symbol that gives only `timezone` (from `symbols`, `resolveSymbol`, a feed or an adapter) has no zone of its own now: `setTimeZone('exchange')` and the dates of daily bars fall back to the market's zone or UTC, its own `sessions` are not shaded, and its status reads as a market that trades around the clock. A `timezone` still passed is carried along in `getSymbolInfo()` and nothing reads it. Rename the field where you build symbols.

Not changed: the widget's setting is still `timezone` (`widget.setSettings({ timezone: 'exchange' })`), and so are the string keys `settings.timezone` and `menu.chart.timezone`.

The docs have a page for the move from 1.x: Moving to 2.0.
