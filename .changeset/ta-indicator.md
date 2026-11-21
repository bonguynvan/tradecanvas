---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
---

`ta.indicator(id, input, params)` runs any built-in indicator and returns its lines by key, typed by the id: `ta.indicator('stochastic', bars, { kPeriod: 14 }).k`. Its input is the bars, or a value a bar that the indicator reads as its prices. `ta.rsi`, `ta.macd`, `ta.atr` and `ta.bollinger` now run the built-in indicators themselves, so their values are the chart's by construction.
