---
area: widget
max_turns: 30
---

I want the full trading screen (toolbar, drawing tools, indicator legend, settings) for ACME on the 1-hour interval, with my own bars and no connection to any exchange. Dark, and the interface in Vietnamese.

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[])` (hourly bars, oldest first, times in milliseconds; `host` already has a size) and return the widget.
