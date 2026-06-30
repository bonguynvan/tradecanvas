---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
"@tradecanvas/analytics": minor
---

Add the v1 extension contracts — the frozen foundation for a real trading surface and a plugin ecosystem.

- **`ExecutionAdapter`** — a strategy interface (mirroring `DataAdapter`) that turns the display-only trading overlay into a trading surface. The chart routes its emitted order/position intents into the adapter; the adapter is the single source of truth and emits authoritative `orders` / `positions` back for the chart to render. Fully backward-compatible: with no adapter connected, intents remain plain events.
- **`PaperExecutionAdapter`** — reference in-memory implementation: virtual fills, hedging-style positions, pending limit/stop triggering via `setMarkPrice`, and SL/TP auto-close. The safe sandbox for demos and tests.
- **Plugin SDK** — `PluginManager` is now a real registry over four plugin kinds (`IndicatorPlugin`, `DrawingPlugin`, plus new `ChartTypePlugin` and `OverlayPlugin`), unified by a `ChartPlugin` union. Adds a global `registerPlugin()` (inherited by every chart created afterward), a constructor `plugins: []` option, and `chart.plugins.register/unregister/list`. The legacy `registerIndicator` still works.

Also fixes `Chart.version`, which was hardcoded to a stale `0.7.0`; it is now injected from `package.json` at build time so it can never drift again.
