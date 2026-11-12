---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

A retry of a dropped connection sends `connectionChange` with `state: 'reconnecting'` once an attempt, with that attempt's number (it was sent twice, the first with the number before). A `disconnect()` or a switch of symbol or timeframe while a feed's first bars are still loading now aborts that `getBars` request through its `signal`, as it did for a series already streaming.
