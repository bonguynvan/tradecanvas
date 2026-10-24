---
area: widget
max_turns: 35
---

The trading widget with a watchlist of BTCUSDT, ETHUSDT and SOLUSDT, open beside the chart, starting on BTCUSDT. My bars come from `load(symbol)`, which returns them for that symbol (no exchange connection). When the user picks another symbol in the watchlist, show that symbol's bars.

Export `mount(host: HTMLElement, load: (symbol: string) => { time: number; open: number; high: number; low: number; close: number; volume: number }[])` (bars oldest first, times in milliseconds; `host` already has a size) and return the widget.
