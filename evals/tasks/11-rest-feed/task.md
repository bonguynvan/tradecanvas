---
area: data
max_turns: 35
---

My REST endpoint `https://api.example.com/klines?symbol=SYMBOL&interval=INTERVAL&limit=N` returns candles as `[[openTimeMs, "open", "high", "low", "close", "volume"], …]`, the numbers as strings, oldest first. Intervals are written like `1m`, `1h`, `1d`.

Export `async mount(host: HTMLElement)` (`host` already has a size). Show ACME's 1-hour candles from that endpoint, kept live: the latest candle should refresh every few seconds. Resolve with the chart once its history is on it.
