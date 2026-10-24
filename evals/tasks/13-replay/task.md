---
area: chart
max_turns: 30
---

Practice mode. Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[])` (oldest first, times in milliseconds; `host` already has a size) and return the chart.

Replay the bars from the 61st bar (`bars[60]`): the chart shows the bars up to it, the later ones stay hidden until the replay reaches them, and it plays forward by itself at about four bars a second.
