---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
'@tradecanvas/mcp': minor
---

The price chart drawn with no page. `renderPriceChart(ctx, options, size)` draws the price chart on a 2D context of your own: a canvas made in Node (`@napi-rs/canvas`, `skia-canvas`) for a picture in an email, a report or a message from a bot, or an OffscreenCanvas in a worker. It is one frame, put together as `Chart` puts its own together, so the same bars at the same size give the same picture: the chart type, volume, both axes, the legend, the last price, a watermark, indicators on the price pane and in panes, drawings, and buy and sell marks. `options` are `Chart`'s where they say how the chart looks, with `data`, `symbol`, `timeframe`, `indicators` (as `chart.getIndicatorSetup()` gives them), `drawings`, `markers`, `visibleRange`, `pricePrecision`, `timeZone` and `plugins`. Node has no `Path2D`: give your canvas library's as `path2D`. It has no crosshair, orders, positions, alerts or compare lines. `ChartLegend.measure()` works out the legend's size without drawing it. The MCP server's `list_options` and `validate_options` take `renderPriceChart` as a target.
