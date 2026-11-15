---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
'@tradecanvas/mcp': minor
---

Moving an app from another charting library without changing its backend. `feedFromJsApi(datafeed)` turns a datafeed written for the callback-style JS API (`onReady`, `resolveSymbol`, `getBars`, `subscribeBars`, and `searchSymbols`, `getQuotes`, `subscribeQuotes` when it has them) into a `DataFeed`: it resolves each symbol once, turns timeframes into resolutions and the chart's requests into `from`/`to` in seconds, and loads the series again when the datafeed resets its cache. `udfFeed({ url })` reads a UDF server, asking again every `updateFrequency` ms for live bars and quotes. `resolutionToTimeframe` and `timeframeToResolution` convert intervals. The MCP server gains `migration_plan`, `migration_lookup` and `convert_widget_options`, which map the old library's options, featuresets, overrides, studies, drawings, methods, datafeed and broker members to TradeCanvas's, and say what has no equivalent.
