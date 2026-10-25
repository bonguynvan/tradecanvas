---
'@tradecanvas/chart': minor
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
---

The chart's methods and types spell the time zone `timeZone`, as the `timeZone` option and `Intl.DateTimeFormat` do: `chart.setTimeZone`, `getTimeZone`, `getEffectiveTimeZone`, `getExchangeTimeZone`, `EXCHANGE_TIME_ZONE`, and `SymbolInfo.timeZone` for the zone a symbol keeps its hours in. The older names still work and are marked deprecated: `setTimezone`, `getTimezone`, `getEffectiveTimezone`, `getExchangeTimezone`, `setTimezoneOffset` (an offset is `setTimeZone(minutes)`), `EXCHANGE_TIMEZONE` and `SymbolInfo.timezone`. A symbol's zone, given either way, reads back both ways from `getSymbolInfo()`, and `timeZone` comes first when both are given (`{ ...chart.getSymbolInfo(), timezone }` still changes it). `marketStatus`, a feed's update and the new `symbolTimeZone(info)` read either; `BinanceAdapter`'s symbols carry both.
