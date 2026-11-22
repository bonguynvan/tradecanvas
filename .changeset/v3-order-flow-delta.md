---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

Who took the trades: a true volume delta. A bar may carry `buyVolume`, the part of its volume the buyers took, and a trade its `side`. `barDelta(bar)` is bought less sold. The Volume Delta indicator (`voldelta`) draws the true delta and its running sum from bars that say, and its estimate from the close for those that do not; a new `anchor` input starts the running sum again with each session, week or month. `BinanceAdapter` fills both in. The chart carries `buyVolume` through resampling, tick bars, replay, and the CSV and JSON export and import.
