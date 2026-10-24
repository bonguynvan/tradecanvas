---
area: widget
max_turns: 30
---

Give the trading widget its dense, square look (the one called Terminal), with the toolbar floating over the chart and the chosen buttons shown as solid fills, on a light theme.

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[])` (oldest first, times in milliseconds; `host` already has a size) and return the widget showing the bars.
