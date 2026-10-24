---
area: chart
max_turns: 35
---

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[])` (oldest first, times in milliseconds; `host` already has a size) and return the chart.

On the candles, draw a trend line from the bar with the lowest low (at that low) to the bar with the highest high (at that high), and a horizontal line at the last close.

The user adds and moves drawings of their own, and they must survive a page reload: keep the chart's layout in `localStorage` under the key `my-layout`, saved as it changes. When `mount` finds a saved layout, show that instead of drawing the two lines again.
