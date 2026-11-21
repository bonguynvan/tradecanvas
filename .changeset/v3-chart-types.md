---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

Six more chart types, 24 in all: `columns` (a column up to each close), `hlcBars` (high, low and close, with no open), `stepArea` (the step line, filled), `spline` (a smooth curve through the closes that passes no high or low close), `dots` (a dot at each close) and `smoothedHeikinAshi` (Heikin-Ashi of prices averaged over `chartTypeOptions.smoothedHeikinAshi.period` bars first, 10). Columns, HLC bars and the candles take the candles' colours, the lines the line's; the widget's chart type menu lists them, in 30 languages.
