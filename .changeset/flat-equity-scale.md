---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

A finance chart whose values are too near each other to scale (an `EquityCurveChart` with a flat curve beside a benchmark flat at nearly the same value) no longer throws "Invalid array length" and holds the page: such a range is drawn as one value with room above and below.
