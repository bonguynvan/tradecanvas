---
'@tradecanvas/commons': patch
'@tradecanvas/chart': patch
---

A trade fed with `updateLastBarFromTick` keeps the forming bar at its own time. The bar's time moved to the trade's, so `getData()` showed it off its interval, a stream's next update for that bar was taken as an older bar and left out, and with the extended hours hidden the trade was lost when they were shown again. `mergeBar` keeps the bar's time the same way. A stream's bars that arrive during a replay are placed by their time, as they are outside one: a new forming bar no longer replaces the last bar, and a bar's close no longer adds it a second time, so `replayStop()` brings back the series as the feed sent it. With the extended hours hidden, a stream in milliseconds on a series in seconds no longer leaves its bars in milliseconds among the hidden ones, which mixed the two units once the hours were shown. `getIndicatorOutput` and `replayStart` say what they return and take (`series[i]` and its keys; `startIndex`, `interval`, `speed`).
