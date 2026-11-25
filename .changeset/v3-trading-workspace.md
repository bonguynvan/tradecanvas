---
'@tradecanvas/chart': minor
'@tradecanvas/commons': minor
---

`chart.getActivityLog()` gives what happened to the orders: each placed, moved, cancelled or filled, and what was refused with its reason, the latest 200, oldest first (`chart.clearActivityLog()` empties it). The widget's account panel shows it in a Log tab. While an execution adapter is connected, the widget also shows Sell and Buy under the chart's legend, each with the price it would trade at (the bid and the ask with their spread, else the last price); a press opens the order ticket on that side, and the `tradeButtons` switch turns them off. `executionChange` says when an adapter is connected or taken away, and `bidAskChange` when the bid and the ask marked on the chart change.
