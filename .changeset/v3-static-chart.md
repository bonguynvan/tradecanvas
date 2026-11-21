---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
'@tradecanvas/mcp': minor
---

The price chart drawn with no page. `renderPriceChart(ctx, options, size)` draws the price chart on a 2D context of your own: a canvas made in Node (`@napi-rs/canvas`, `skia-canvas`) for a picture in an email, a report or a message from a bot, or an OffscreenCanvas in a worker. It is one frame, put together as `Chart` puts its own together: at the same size it is the picture a chart on a page gives of the same bars after `fitContent()`, with the chart type, volume, both axes, the legend, the last price, a watermark, indicators on the price pane and in panes, drawings, and buy and sell marks. `options` are `Chart`'s where they say how the chart looks, with `data`, `symbol`, `timeframe`, `indicators` (as `chart.getIndicatorSetup()` gives them), `drawings`, `markers`, `visibleRange`, `pricePrecision`, `timeZone`, `symbolSeries` and `plugins`. Node has no `Path2D`: give your canvas library's as `path2D`. An option that is wrong throws before anything is drawn, by its name. It has no crosshair, orders, positions, alerts or compare lines. `ChartLegend.measure()` works out the legend's size without drawing it. The MCP server's `list_options` and `validate_options` take `renderPriceChart` as a target.

Fixed: a chart beside a left price scale keeps its fit when its container reports its size. With bars fitted closer than a slot usually gets, a size report widened the slots as if the left scale were not there, and the oldest bars went off view.
