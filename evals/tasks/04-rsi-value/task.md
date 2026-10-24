---
area: chart
max_turns: 30
---

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[])` (oldest first, times in milliseconds; `host` already has a size). Show the bars with a 14-period RSI under them, and return `{ chart, latestRsi }`: `latestRsi()` gives the RSI at the latest bar, as the chart shows it, or `null` before there is one. It must stay right when the latest bar changes later.
