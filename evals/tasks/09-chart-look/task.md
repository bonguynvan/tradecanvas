---
area: chart
max_turns: 30
---

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[])` (oldest first, times in milliseconds; `host` already has a size) and return the chart.

Our brand look: a light chart; rising candles `#0a8f5a` and falling candles `#d43c3c`, wicks included; no vertical grid lines; and prices written the German way (`1.234,56`).
