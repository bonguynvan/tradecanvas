---
area: data
max_turns: 35
---

We are moving our app off TradingView's charting library. `src/datafeed.ts` is the datafeed we wrote for it (its JS API: `onReady`, `resolveSymbol`, `getBars`, `subscribeBars`…), and our backend behind it stays as it is.

Export `async mount(host: HTMLElement)` (`host` already has a size) that shows ACME on the 1-hour interval in TradeCanvas's full trading widget, getting its bars through that datafeed, unchanged. Users switch to the 4-hour interval too, which our backend doesn't serve. Resolve with the widget once ACME's history is on it.
