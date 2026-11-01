---
'@tradecanvas/commons': minor
'@tradecanvas/chart': minor
'@tradecanvas/mcp': minor
---

`ReconnectManager` and `ReplayController` are exported from `@tradecanvas/chart`, as the realtime page imports them. Ten chart events carry typed payloads (`executionFill`, `ordersChange`, `positionsChange`, `positionReverse`, `chartContextMenu`, `priceAxisAdd`, `drawingUpdate`, `drawingDoubleClick`, `drawingContextMenu`, `toolModeChange`), so `e.payload` is no longer `unknown` in TypeScript; a cast of one to a shape it does not have no longer compiles. The MCP server's `list_options` finds options one level in by their path (`chartOptions.numberLocale`, `features.priceAxisAddButton`), and `validate_options` checks a `numberLocale` is a tag numbers can be written in.
