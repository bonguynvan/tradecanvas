---
area: chart
max_turns: 30
---

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[])` (daily bars, oldest first, times in milliseconds; `host` already has a size). Show the bars as candles with a 21-period and a 50-period EMA on the price, a 14-period RSI in a pane below, and MACD (12, 26, 9) in a pane of its own under the RSI. Return the chart.
