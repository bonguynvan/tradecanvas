---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

Add three new built-in indicators toward TradingView Advanced Charts parity:

- `vwma` — Volume Weighted Moving Average
- `envelope` — Moving Average Envelope (SMA ± a fixed % band)
- `tema` — Triple EMA (`3×EMA1 − 3×EMA2 + EMA3`, less lag than a plain EMA)

Also corrects the long-stale "33 indicators" marketing figure across the
READMEs and demo docs — the registry actually has 69 registered indicators
(69 after this change); the count had drifted out of sync for a while.
