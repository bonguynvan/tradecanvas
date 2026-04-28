---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

Expand indicators, chart types, trading overlay customization, and harden type safety.

**New indicators (7)**
- `HullMAIndicator` (overlay) — low-lag WMA-of-WMA-diff
- `PivotPointsIndicator` (overlay) — Classic S3/S2/S1/PP/R1/R2/R3, configurable lookback
- `AnchoredVWAPIndicator` (overlay) — VWAP that resets at a chosen `anchorTime`
- `ZigZagIndicator` (overlay) — swing-pivot connector with deviation threshold
- `LinearRegressionChannelIndicator` (overlay) — least-squares fit + std-dev bands
- `AwesomeOscillatorIndicator` (panel) — momentum histogram with up/down coloring
- `ChaikinOscillatorIndicator` (panel) — EMA(ADL, fast) − EMA(ADL, slow), exposes ADL

**New chart type**
- `'rangeBars'` and `toRangeBars` transform — fixed price-range bars (each bar's high − low equals a configured range)

**Trading overlay customization (additive, no breaking changes)**
- `TradingPosition.closedQuantity` — partial-close visualization on the position zone
- `TradingConfig.pnlThresholds: PnLThreshold[]` — multi-stop color gradient driven by live P&L
- `TradingConfig.positionLabel: string | (ctx) => string` — token templating (`{side}`, `{qty}`, `{openQty}`, `{closedQty}`, `{entry}`, `{price}`, `{pnl}`, `{pnlPct}`, `{pnlSign}`)

**Web Worker indicator pipeline**
- New `IndicatorWorkerHost` (main-thread façade) + bundled `indicator.worker.js` entry that registers all 33 built-in indicators
- Promise-based `host.calculate(indicatorId, config, data)` offloads heavy compute off the render loop
- Pass `null` instead of a worker for the synchronous fallback path (SSR, tests, safety net)
- Per-request timeout, `ping()` health check, `terminate()` rejects pending requests cleanly

**Type safety**
- New `getNumberParam` / `getIntParam` helpers exported from `@tradecanvas/core`
- All 25 existing indicators migrated to the helpers — invalid params (NaN, Infinity, missing keys, non-numeric strings) now fall back to documented defaults instead of silently propagating to calculations
- `BinanceAdapter` REST and WS payloads now flow through typed `parseRestKline` / `parseWsKline` validators; `any[]` and `any` casts are gone
- `TextAnnotationTool` text resolution moved to a pure `resolveAnnotationText` helper (no more `as string` cast)
- `ChartStateManager.deserialize` validates the parsed shape — malformed drawings/orders/positions/indicators are filtered, missing or wrong-typed viewport fields fall back to defaults

**Internal refactor**
- `WidgetStyles.ts` (764 LOC of CSS-in-string) extracted into a sibling `WidgetStyles.css` file, imported via Vite's `?raw` query and inlined at build time. The TS shim is now 31 LOC; CSS is editable as CSS (syntax highlighting, linting). Public API (`injectWidgetStyles` / `removeWidgetStyles`) unchanged.
- Chart-type dispatch (`createChartRenderer` and `getDisplayData`) extracted from `Chart.ts` into a new `ChartTypeStrategy` module with `createRendererFor`, `transformDisplayData`, and `isTransformedChartType` helpers. `Chart.ts` shrinks by ~60 LOC; adding a new chart type now means editing one focused module.
- Removed duplicate `timeframeToMs` private method from `Chart.ts`; uses the shared helper from `@tradecanvas/commons`.

**Test coverage**
- 141 tests across 21 files (Vitest scaffolded in `@tradecanvas/core`)
- New coverage for: 9 indicators, range-bar transform, trading position formatting, drawing-tool hit-test geometry, `DrawingManager` CRUD, Binance kline parsers, `ReconnectManager` backoff/cap/give-up, `TickAggregator` (tick + pre-formed-bar paths, ring buffer), `ChartState` JSON + localStorage round-trip
- CI workflow added under `.github/workflows/test.yml` (Node 20.19, pnpm 9.15, builds commons, runs `pnpm test`)
