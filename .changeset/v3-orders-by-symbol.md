---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

Orders, positions and fills can name their `symbol`, and the chart draws those of the symbol it shows (`chart.getSymbol()`, and `chart.setSymbol(symbol)` for bars set by hand), keeping the others in `getOrders()`, `getPositions()` and `getFills()`: a position opened on one symbol is no longer drawn, or valued, on the next. An order the chart asks for names the symbol shown; `PaperExecutionAdapter` keeps it on the order, its position and its fills, and `setMarkPrice(price, time, symbol)` works and values that symbol alone. The widget's account panel names each row's symbol once one is of another, the depth ladder marks the orders of its own symbol, and the fill history stays when the symbol changes.
