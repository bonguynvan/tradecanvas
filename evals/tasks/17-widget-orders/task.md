---
area: trading
max_turns: 35
---

Orders the user places in the trading widget (from its order ticket, the chart or the depth ladder) go to my broker. Call `submit(order)` with each one, and once the broker answers with the order's id (`submit` returns a `Promise<string>`), show it on the chart as a working order under that id, beside the ones already there.

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[], submit: (order: { side: 'buy' | 'sell'; type: string; price: number; quantity: number }) => Promise<string>)` (bars oldest first, times in milliseconds; `host` already has a size) and return the widget.
