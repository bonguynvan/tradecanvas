---
'@tradecanvas/core': minor
---

`@tradecanvas/core/patterns` exports `detectCandlePatterns` and `CANDLE_PATTERNS` on their own, without the engine: a page that finds patterns and draws no chart loads a few kB in a chunk of its own instead of the chart's. The main entry exports them as before.
