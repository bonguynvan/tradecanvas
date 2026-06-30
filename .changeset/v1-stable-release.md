---
"@tradecanvas/commons": major
"@tradecanvas/core": major
"@tradecanvas/chart": major
"@tradecanvas/analytics": major
---

TradeCanvas 1.0 — first stable release. The public API is now semver-stable.

Everything an open-source trading chart needs, batteries-included and zero-dependency:

- **Charting** — 17 chart types, 60+ technical indicators, 24 drawing tools, multi-chart grid, and finance charts (sparkline, depth, equity, heatmap, waterfall, gauge).
- **Data** — built-in Binance, Coinbase, Bybit, and Kraken adapters, plus generic `WebSocketAdapter` / `PollingAdapter` bases so any feed plugs in with ~20 lines.
- **Trading** — a real execution surface: connect an `ExecutionAdapter` to route the chart's order/position intents to a broker/OMS and render the fills it reports; drag on the chart to create orders; ships a `PaperExecutionAdapter` sandbox.
- **Extensibility** — a stable Plugin SDK for custom indicators, drawing tools, chart types, and overlays, registered globally or per-chart.
- **Layout** — resizable indicator panes with independent price scales.
- **Performance** — LTTB downsampling keeps 100k+ bar line charts smooth.

**Frozen 1.0 contracts** (semver-stable for the 1.x line): `DataAdapter`, `ExecutionAdapter`, the Plugin SDK (`IndicatorPlugin` / `DrawingPlugin` / `ChartTypePlugin` / `OverlayPlugin`), and the chart event names + payloads.
