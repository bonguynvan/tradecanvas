---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

A stop-limit order shows its stop on the chart (a line of its own tagged STOP, its price on the axis). Dragging the order moves both; dragging its stop moves the stop alone, and `orderModify` carries `newStopPrice`. The widget's order ticket places one with a stop price and a limit price, and the account panel names it and writes both. A drag of an order that filled or was cancelled meanwhile is called off.
