---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
---

`defineIndicator({ id, name, inputs, plots, calculate })` makes an indicator of your own from one function, with no class: `calculate({ bars, inputs, ta })` reads the bars as columns and returns its lines by key, each a value a bar (`true` marks a bar for a markers plot). The chart draws them, lists them and gives each input a field in the settings dialog; with no `plots`, every line returned is drawn as a line. `ta` has the sums indicators are made of (`sma`, `ema`, `wma`, `rma`, `stdev`, `highest`, `lowest`, `change`, `rsi`, `macd`, `atr`, `bollinger`, `crossover`, `crossunder`), with the built-in indicators' values, and is exported on its own.
