---
area: analytics
packages: [analytics]
max_turns: 35
---

Backtest a long-only SMA crossover on my daily bars, starting with $10,000 and trading 10 units: buy at the next bar's open after the 10-period SMA of the closes crosses above the 30-period one, and sell at the next bar's open after it crosses back below. No shorts, no costs.

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[])` (oldest first, times in milliseconds; `host` already has a size). Show the bars with each closed trade shaded on the chart from entry to exit, and return `{ chart, report }` where `report` is `{ trades: number; returnPct: number }`: the number of closed trades, and their total profit as a percent of the $10,000 (`2.5` means +2.5%).
