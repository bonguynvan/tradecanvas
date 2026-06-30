---
"@tradecanvas/chart": minor
---

Custom chart-type plugins now render. A registered `ChartTypePlugin` is consulted when the chart resolves its renderer and display transform, so `chart.setChartType('myCustomType')` draws via the plugin's `createRenderer()` (and optional `transform()`). `setChartType` accepts custom type strings while preserving autocomplete for built-ins. The resolution is exposed as pure, testable `resolveRenderer` / `resolveDisplayData` helpers.

`OverlayPlugin` render-time consumption is tracked separately — it needs a core engine render hook.
