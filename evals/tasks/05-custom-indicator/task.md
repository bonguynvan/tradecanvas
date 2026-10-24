---
area: chart
max_turns: 35
---

Add my own indicator, "Range %": for each bar, (high − low) / close × 100. It should be drawn in a pane of its own under the candles, and be an indicator the chart knows by name, so it can be added again like the built-in ones.

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[])` (oldest first, times in milliseconds; `host` already has a size) that shows the bars with the indicator, and return the chart.
