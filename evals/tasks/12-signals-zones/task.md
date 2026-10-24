---
area: chart
max_turns: 30
---

My strategy produced these trades: `{ id: string; side: 'long' | 'short'; entryTime: number; entryPrice: number; exitTime: number; exitPrice: number }[]` (times in milliseconds).

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[], trades)` (bars oldest first; `host` already has a size) and return the chart. Mark each trade's entry on the chart as a long or short signal at its entry price, and shade each trade on the chart from its entry to its exit.
