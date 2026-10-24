---
area: chart
max_turns: 30
---

My trade feed calls me for every trade with `{ time: number, price: number, size: number }` (`time` in milliseconds).

Export `mount(host: HTMLElement, history: { time: number; open: number; high: number; low: number; close: number; volume: number }[])`. It should show `history` (1-minute candles, oldest first, times in milliseconds) in `host`, a div that already has a size. It returns `{ chart, onTrade }`, where `onTrade(trade)` keeps the chart live: each trade goes into the candle of its minute, and a trade in a new minute starts a new candle. The feed is fast, so keep each update cheap.
