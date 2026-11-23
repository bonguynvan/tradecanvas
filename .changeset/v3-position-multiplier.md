---
'@tradecanvas/commons': minor
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

A position keeps what its price was worth when it opened (`TradingPosition.multiplier`, set by the paper account): a chart shown another market or another symbol no longer revalues open positions, books their profit at the wrong scale or calls them for margin. `ExecutionAdapter.setMultiplier(multiplier, symbol?)` is told the symbol, and is for orders placed from then on. The account panel and the chart's tags count each position by its own multiplier.
