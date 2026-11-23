---
'@tradecanvas/chart': minor
---

`ChartWidget` asks before a trade that one press would make: a position closed or reversed (the account panel, the buttons on the chart) and an order from the right-click menu or the depth ladder; `confirmOrders: false` is one-click trading, and `chart.setPositionGuard` holds a press on a position's button for a guard of your own. On the depth ladder a press on a bid places a buy limit at that price and a press on an ask a sell limit, and each cell says so before the press.
