---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

A position can be taken off in parts: `takeProfits` on an order's intent, an order and a position is a list of levels (`TakeProfitLevel`: a price and the quantity that closes there). `modifyPositionIntent({ positionId, takeProfits })` sets a position's levels, and `null` takes them off. The paper account closes a level's part when the price reaches it, a fill each with `reason: 'takeProfit'`, and `takeProfit` or the stop-loss closes what they leave. The chart draws a line and a tag for each level (TP1 is the nearest), the account panel writes the nearest level and how many more there are, and the widget's order ticket reaches a take-profit in one, two or three targets, an even part of the quantity at each.
