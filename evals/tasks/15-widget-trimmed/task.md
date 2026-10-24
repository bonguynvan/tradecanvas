---
area: widget
max_turns: 30
---

Our users only need part of the trading widget: no drawing-tools sidebar, no replay button, no compare button, and only the 1m, 5m, 15m and 1h intervals to pick from. Everything else stays as it is.

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[])` (1-minute bars, oldest first, times in milliseconds; `host` already has a size) and return the widget showing them.
