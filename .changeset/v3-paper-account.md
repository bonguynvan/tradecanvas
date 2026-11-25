---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

A paper account with money: `new PaperExecutionAdapter({ balance, leverage, multiplier, commission })` keeps a balance, holds margin for open positions, charges each fill (`commission` on the fill, a rate of its value and an amount a unit, with a least), and refuses an order its free margin cannot carry; a waiting order whose money has gone when its price comes is cancelled. `chart.getAccount()` and the `accountChange` event give the connected adapter's `AccountSummary` (balance, equity, margin used and free, what trading cost), and the widget's account panel heads its totals with the balance, the equity and the free margin. An execution adapter of your own gives its account with `getAccount()` and an `account` event.
