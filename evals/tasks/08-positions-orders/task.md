---
area: trading
max_turns: 30
---

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[], save: (stopLoss: number | null, takeProfit: number | null) => void)` (bars oldest first, times in milliseconds; `host` already has a size) and return the chart.

Show my open position and my working order on the chart: a long position `p1` of 2 at an entry of 100, with a stop-loss at 95 and a take-profit at 110; and a sell limit order `o1` for 1 at 112. The user can drag the position's stop and target on the chart: when they do, call `save` with the new stop-loss and take-profit, and keep the chart showing them.
