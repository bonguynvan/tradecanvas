---
area: widget
max_turns: 30
---

Add a "Screenshot" button to the trading widget's toolbar that calls `onShot()`, and give it the keyboard shortcut Alt+S, which does the same and is listed with the widget's other shortcuts.

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[], onShot: () => void)` (bars oldest first, times in milliseconds; `host` already has a size) and return the widget showing the bars.
