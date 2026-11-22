---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

Orders that fill in parts. `new PaperExecutionAdapter({ fillSize })` fills no more than that of a limit order at one price: a larger one fills a part at each price that reaches its limit and works on for the rest. `TradingOrder.filledQuantity` says how far an order has got and `FillEvent.remaining` what a part left working. Of an `'ioc'` order what fills at once fills and the rest is dropped; a `'fok'` order larger than the size is refused; a market order and a stop fill whole. The chart writes what has filled on the order's tag and the widget's account panel in its row.
