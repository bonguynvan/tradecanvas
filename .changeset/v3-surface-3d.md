---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
'@tradecanvas/mcp': minor
---

Charts in three dimensions, twenty-two finance charts in all. `SurfaceChart` draws values over two axes as a sheet in a box (implied volatility by strike and expiry, a profit by price and day): a shaded surface, a wireframe, or with `style: 'slices'` a filled line for each `y`. `Bar3DChart` stands a column on each value in rows a series deep. A drag turns them (a mouse turns and tilts, a finger turns only, so a page still scrolls under them), a double click goes back to the `view` given, and `getView`, `setView`, `onViewChange` and `rotate` are there for it. `depthSurface` turns a run of order books into a surface: depth over time. Values are coloured by `colorRamp`. Both read out under the pointer, take a click, and are in the MCP server's `list_finance_charts`.
