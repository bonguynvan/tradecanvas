---
'@tradecanvas/mcp': minor
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

The MCP server's `custom_indicator` tool gives the guide to writing an indicator of your own: the descriptor, `calculate`, the incremental `update` and `revisesBefore`, drawing with the theme, colours by theme, registering it before a saved layout is read, and what the chart reads off the descriptor, with code type-checked against the packages. `IndicatorBase.render` takes the render context, so an override can pass it on, and `IndicatorRenderContext` is exported from `@tradecanvas/chart`.
