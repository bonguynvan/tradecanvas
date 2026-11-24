---
'@tradecanvas/commons': minor
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

Where an execution adapter gives a position its `markPrice`, the account panel's row and the chart's tag on the position count its profit at that price, for a position of the chart's own symbol too, so the rows agree with the account's Open P&L when the broker's mark is not the chart's last trade. `positionMark(position)` reads it. Without a `markPrice`, the chart's latest price as before. An adapter that gives a `markPrice` keeps it current: one that stamped it once on a position of the chart's symbol now shows a row that stands still.
