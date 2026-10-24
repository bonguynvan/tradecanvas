---
area: trading
max_turns: 35
---

Show the order book as a depth ladder beside the chart in the trading widget, open from the start. It's fed by `book` (`{ bids: { price: number; volume: number }[]; asks: { price: number; volume: number }[] }`), and later updates come through `onBook(book)`.

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[], book)` (bars oldest first, times in milliseconds; `host` already has a size) and return `{ widget, onBook }`.
