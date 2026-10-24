---
area: chart
max_turns: 30
---

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[], above: number, below: number, notify: (message: string) => void)` (bars oldest first, times in milliseconds; `host` already has a size). Return `{ chart, onPrice }`: my feed calls `onPrice(price)` with each new price, which moves the last bar's close.

Alert me when the price crosses up through `above`, and when it crosses down through `below`: call `notify` with a message each time one goes off. The alerts should show on the chart, where the user can see and move them.
