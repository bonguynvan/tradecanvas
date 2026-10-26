---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

Session breaks are lines only: their dates no longer print along the top of the plot. Zoomed out on intraday bars (the All range on daily bars, say, then 4h), they wrote a row of Mondays and months that repeated the time axis and ran under the legend's OHLC line, and at the usual zoom a Monday or a month start near the left edge still landed under it. The time axis names the days, months and years at every zoom. `SessionBreaks.renderLabels` and `SessionBreaks.setLocale` stay for code that calls them, draw and change nothing, and are deprecated; they go in 2.0.
