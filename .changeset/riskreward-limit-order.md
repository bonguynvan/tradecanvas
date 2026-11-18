---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

A Long/Short Position drawing can be placed as a bracket order: selected in the widget with trading on, its toolbar shows **Create limit order**, which opens the bracket draft filled from the drawing: its side, entry, stop-loss, take-profit and the quantity its risk works out. The draft is dragged and confirmed as any bracket is, so no order is one click away. `chart.startBracket(side, entry, { stopLoss, takeProfit, quantity })` starts the same draft from code, and `bracketPlace` carries the `quantity` when there is one.
