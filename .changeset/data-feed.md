---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
'@tradecanvas/react': minor
'@tradecanvas/vue': minor
'@tradecanvas/svelte': minor
---

A data source of your own can be a `DataFeed`: two Promise-based methods, `getBars({ symbol, timeframe, countBack, before, signal })` and `subscribeBars(request, subscriber)`, which returns its unsubscribe. The chart pages back, reconnects, builds the timeframes the feed lacks and subscribes again on a switch; the feed only answers, and what a subscription sends after its unsubscribe is dropped. Pass it as `feed` where an adapter goes: `chart.connect({ feed, symbol, timeframe })`, the widget's `feed` option, `ChartGrid.connectAll(feed, …)` and the React, Vue and Svelte components' `feed` prop. One feed serves any number of charts, so a `ChartWidgetGrid` takes one in its shared `widget` options. `ManualFeed` keeps the bars you give it (`setBars`) and sends the ones you push (`pushBar`) to the charts subscribed to that series. `feedFromAdapter` and `adapterFromFeed` convert between feeds and adapters. A feed with only the newest bars sets `pagesBack: false`; the chart does not take a quiet feed for a dead one, so a feed reports a dropped connection itself. Adapters work as before; `StreamConfig.adapter` is now optional (give it or `feed`), so code that reads `config.adapter` from a config of its own may need a check.
