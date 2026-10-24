---
area: chart
max_turns: 30
---

Under the candles, show a 14-period RSI, and in the same pane a 9-period simple moving average of the RSI line (not of the price), so I can see the RSI cross its own average.

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[])` (oldest first, times in milliseconds; `host` already has a size) and return the chart.
