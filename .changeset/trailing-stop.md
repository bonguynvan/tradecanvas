---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

A trailing stop: a position's `trailingStop` is the distance its stop-loss keeps behind the best price, never moving back. The stop's tag reads TSL and has a button that starts a trail at its distance from the price now, or ends one (`lineButtons.trailStop`); `modifyPositionIntent({ positionId, trailingStop })` does the same from code, and `PaperExecutionAdapter` moves the stop on each price.
