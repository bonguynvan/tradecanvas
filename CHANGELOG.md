# Changelog

## 1.0.0 (2026-07-01)

First stable release — everything an open-source trading chart needs, batteries-included and zero-dependency. The public API is now semver-stable for the 1.x line. Cumulative since 0.9.0 (0.10–0.14 added 30+ indicators and several chart types); the headline additions:

### Data

- **Coinbase, Bybit, and Kraken adapters** (free, no API key) join the built-in Binance adapter.
- **Generic adapter bases** — `WebSocketAdapter` (live + REST history) and `PollingAdapter` (REST-only feeds) let any source plug in with ~20 lines: a URL and a parse function. The base handles the connection lifecycle, reconnect, decoding, and event emission.

### Trading

- **Live execution** — `chart.connectExecution(adapter)` turns the display-only trading overlay into a real trading surface. The chart routes its order/position intents into an `ExecutionAdapter` and renders the authoritative orders/positions it reports back (the adapter is the single source of truth). Ships a `PaperExecutionAdapter` sandbox; failures surface on a single `executionError` event.
- **Drag-to-create orders** — `chart.startOrderDraft(side)` drops a draggable order line; drag it to a level and `confirmOrderDraft()` places it (limit vs stop inferred from the level relative to the current price).

### Extensibility

- **Plugin SDK** — register custom **indicators**, **drawing tools**, **chart types**, and **overlays**: globally via `registerPlugin`, per-chart via `new Chart(el, { plugins })`, or imperatively via `chart.plugins.register`. Custom chart types and overlays render through the engine.

### Layout

- **Resizable panes** — drag the divider between the main chart and an indicator pane (or between panes) to resize it, with mouse or touch; each pane keeps an independent price scale.

### Performance

- **LTTB downsampling** — line and area charts downsample the visible range to ~2 points per pixel (Largest-Triangle-Three-Buckets) when the bar count far exceeds the pixel width, keeping 100k+ bar charts smooth. Visually identical, and a no-op at normal zoom.
- **Benchmark harness** — a new `pnpm bench` (vitest bench). Downsampling 100k points to 1,600 runs in ~0.32 ms.

### Frozen contracts

The `DataAdapter`, `ExecutionAdapter`, and Plugin SDK interfaces (`IndicatorPlugin` / `DrawingPlugin` / `ChartTypePlugin` / `OverlayPlugin`), plus the chart event names and payloads, are now semver-stable for the 1.x line.

### Breaking changes

- `chart.replay()` is renamed to `chart.replayStart()`, for consistency with `replayPause` / `replayResume` / `replayStop` / `replaySeek`.

### Notes

- The React / Vue / Svelte wrapper packages remain private and are deferred to 1.1.

## 0.9.0 (2026-06-02)

Major UX upgrade — TradingView-grade interaction across the board, with new
analytics depth and workflow features.

### Chart interaction

- **Axis-drag scaling**: drag the price axis vertically to compress / expand the price scale; drag the time axis to zoom. Double-click either axis to reset (auto-scale / fit-content).
- **Shift+drag measure ruler**: transient overlay showing bars × time × price Δ × % between two points. Tracks data through pan/zoom.
- **Alt+click pinned tooltip**: anchor an OHLC tooltip at a bar; the live crosshair tooltip then shows the price / % / bar-count delta to the pinned bar. `Esc` unpins.
- **Hover axis pills**: TradingView-style price (right) + time (bottom) pill badges follow the crosshair with a triangular notch pointing at the line. Inverted theme colors so they always pop.
- **Bar hover highlight**: subtle translucent column behind the crosshair marks which bar the cursor is on — disambiguates dense candle charts.
- **Cursor hints**: `ns-resize` over the price axis strip, `ew-resize` over the time axis strip.

### Widget

- **Symbol search modal**: clicking the toolbar symbol (or pressing `Ctrl/⌘+P`) opens a fuzzy-search picker over the configured `symbols[]`. Replaces the previous click-to-cycle behaviour.
- **Hotkey sheet** (`?`): categorized keyboard-shortcut reference.
- **Replay scrubber UI**: toolbar play button toggles a floating bottom scrubber bar — play/pause, step-back/step-forward, draggable progress, speed select (0.5×–100× bars/sec). Drives the existing `chart.replay*()` API.
- **Watchlist sidebar** (`watchlist: true`): right-side panel listing the widget's symbols with last price, % change, and a mini sparkline. Click a row to switch chart.
- **Saved layouts** (`persistLayouts: true`): per-symbol indicator stack, drawings, alerts, and chart type persist to localStorage. Switch symbol → state is auto-saved; switch back → state is restored. `widget.clearSavedLayout(symbol?)` resets.
- **Drag-and-drop CSV / JSON** (`dragDropImport: true`, default): drop an OHLCV file onto the chart and it loads instantly. Toast feedback for success / failure. New `parseOHLCV` exported for programmatic use.
- **Toast helper**: `widget.toast(msg, kind?)` for transient feedback.
- **Premium CSS refresh**: new design tokens (motion, elevation, shape), Inter + JetBrains Mono stacks, smoother cubic-bezier transitions, refined hover/active/focus states, gradient toolbar/sidebar surfaces, larger radii on modals/palette, animated `connected` status pulse, refined scrollbars, reduced-motion support.

### Chart visuals

- **Volume Profile**: optional horizontal histogram of traded volume bucketed by price over the visible range, with point-of-control highlighting. `chart.setVolumeProfileVisible(true)`.
- **Day-separator dividers**: faint vertical lines at day boundaries on intraday data, heavier at week/month/year with inline date labels (`Mar 4`, `Apr '26`, `2027`). Auto-suppressed on daily-or-coarser timeframes.
- **In-canvas axis polish**: price + time axes now render with subtle dividers, thin tick notches, and refined typography weight (dropped the heavy per-label background rectangles for a TradingView-like feel).

### Analytics

- **Strategy library**: four reference strategies under `@tradecanvas/analytics` — `smaCrossStrategy`, `rsiReversionStrategy`, `donchianBreakoutStrategy`, `bollingerReversionStrategy`. All return a `StrategyFn` ready to feed `Backtester.run()`.
- **Monte Carlo simulation**: `runMonteCarlo(initialCash, trades, opts)` shuffles realised trade order N times to expose path-dependence. Returns per-step P5/P25/P50/P75/P95 equity bands, final-equity percentiles, probability-of-profit, and worst-case max drawdown. Deterministic with a seed.

### Internals & exports

- New `Viewport.scalePriceRange(factor)` and `AxisDragHandler` for custom axis interactions.
- New `MeasureOverlay` and `PinnedTooltip` exports from `@tradecanvas/core`.
- New `VolumeProfileRenderer` export from `@tradecanvas/core`.
- New `parseOHLCV`, `DragDropImporter` exports from `@tradecanvas/chart`.
- `ReplayManager.seekTo` now emits a synchronous `bar` event so seeking while paused immediately repaints the chart slice.

### Behavioural notes

- Toolbar symbol-click now opens the search modal (was: cycle through symbols). Hold the same prop name in your code; behaviour upgrades.
- `dragDropImport` is enabled by default in the widget — pass `false` if a parent surface already handles drops.
- `SessionBreaks` auto-suppresses its lines on daily-or-coarser timeframes so weekly charts don't paint a wall of separators.

## 0.8.1 (2026-05-26)

### Bug fixes

- **`features.tradingContextMenu` flag is now wired through to the right-click handler.** Previously the flag existed in `FeaturesConfig` but `InteractionManager` always called `preventDefault()` and routed to the trading manager regardless of whether the custom menu would render. The result: projects setting `tradingContextMenu: false` (or any config that kept trading on but the menu off) suppressed the native browser context menu without showing a replacement, leaving users with no right-click affordance at all
- `Chart.ts` now passes `features.tradingContextMenu` into the `TradingManager` config (`contextMenu.enabled`)
- `InteractionManager.onContextMenu` only calls `preventDefault()` when the trading context menu actually opens

### Usage

Projects that don't use trading can now opt out cleanly:

```ts
new Chart(host, { features: { trading: false } })            // no trading at all
new Chart(host, { features: { tradingContextMenu: false } }) // keep orders/positions, drop the menu
```

In both cases, native browser right-click works on the chart as expected.

## 0.8.0 (2026-05-26)

### Features

- **Strategy backtester** — new `@tradecanvas/analytics` package with a bar-by-bar `Backtester`. Strategy fn runs at close of each bar; orders placed on bar N fill on bar N+1 (market → next-bar open, limit/stop → when the next bar trades through the trigger). Returns fills, closed trades, equity curve, and summary metrics
- **Portfolio tracking** — `Portfolio` class tracks cash, one net position, realized P&L, and the equity curve. Supports partial closes and position flips with correct realized-PnL accounting
- **Risk metrics** — `computeRiskMetrics()` returns Sharpe, Sortino, Calmar, CAGR, max drawdown, win rate, profit factor, expectancy, average win/loss. Periods per year auto-detected from equity-curve timestamps; configurable risk-free rate
- **Commission & slippage models** — `FixedCommission`, `PercentCommission`, `PerShareCommission`, `NO_SLIPPAGE`, `PercentSlippage`, `RangeBasedSlippage`. Pluggable via `Backtester` constructor
- **Replay mode** — new `ReplayController` in `@tradecanvas/core`. Decoupled from `Chart` so it can drive both UI playback and headless backtests. Supports `start` / `pause` / `resume` / `step(n)` / `seek(index)` / `setSpeed(barsPerSecond)` with typed `bar` / `finished` / `stateChange` events
- **Equivolume chart type** — full-range boxes with width proportional to volume share; color tracks close vs prior close (Richard Arms style). Switch via `chart.setChartType('equivolume')`
- **Fibonacci Time Zones drawing** — `fibTimeZones` tool draws vertical Fibonacci-interval lines (1, 2, 3, 5, 8, 13, 21, 34, 55) projected from a two-anchor time span. Useful for forecasting future swing points based on prior cycle duration
- **Multi-page SvelteKit docs site** — replaced single-page demo with 18 prerendered routes (`/`, `/docs/*`, `/examples`, `/playground`, `/changelog`, `/embed`) using `@sveltejs/adapter-static`. SEO-friendly per-page metadata, sitemap, robots.txt
- **Live backtest demo** — `/docs/analytics` includes a runnable backtest panel (SMA(10/30) cross on 365 days of deterministic synthetic data) with equity-curve canvas, drawdown shading, play/pause/scrub controls, and 8 live metric tiles

### API additions

- New package `@tradecanvas/analytics` exporting `Backtester`, `Portfolio`, `computeRiskMetrics`, `FixedCommission`, `PercentCommission`, `PerShareCommission`, `ZERO_COMMISSION`, `NO_SLIPPAGE`, `PercentSlippage`, `RangeBasedSlippage`, plus `StrategyContext`, `StrategyFn`, `BacktestResult`, `RiskMetrics`, `Fill`, `ClosedTrade`, `PortfolioPosition`, `EquityPoint`, `Side`, `OrderType`, `OrderStatus`, `TimeInForce`
- `ReplayController` exported from `@tradecanvas/core` and `@tradecanvas/chart` along with `ReplayBarEvent`, `ReplayEventMap`, `ReplayOptions`, `ReplayStateChangeEvent`, `ReplayStatus`
- `EquivolumeRenderer` exported from `@tradecanvas/core`
- `FibTimeZonesTool` exported and auto-registered by `registerBuiltInDrawingTools`
- `'equivolume'` added to `ChartType`; `'fibTimeZones'` added to `DrawingToolType`
- Widget catalog (`CHART_TYPES`) lists Equivolume

### Test coverage

- New `@tradecanvas/analytics` package ships with 22 unit tests across `Backtester`, `Portfolio`, and `RiskMetrics`
- New `ReplayController` test suite (8 tests) covering step, seek, start/pause/resume, fake-timer playback, and startIndex
- Total project tests: 273 passing across 41 test files

## 0.7.1 (2026-05-20)

### Bug fixes

- **Drawings persist correctly across timeframe / symbol switch** — drawing manager state was being cleared when the live stream reconnected. Drawings now survive timeframe and symbol changes when `persistDrawings` is enabled

## 0.7.0 (2026-05-14)

### Features

- **Multi-Chart Grid** — new `ChartGrid` class for 2/4/6 synchronized charts with linked crosshairs and shared time axis. Layouts: `'1x2'`, `'2x2'`, `'2x3'` and more. `connectAll()` for bulk data source binding
- **4 new chart types** — Volume Candles (width proportional to volume), HLC Area (high-low-close band), Step Line (staircase pattern), Line with Markers (dots at data points). Total: 16 chart types
- **Command Palette** — `Ctrl+K` / `Cmd+K` quick search inside ChartWidget for indicators, chart types, drawing tools, timeframes, and actions (screenshot, theme toggle, settings). Keyboard navigation with arrow keys and Enter
- **Visual Price Alerts** — `AlertManager.render()` now wired into the overlay layer. Alert lines show bell icon, price label, and triggered/pending color states on the live chart
- **Signal Markers API** — `chart.addSignalMarker()` renders directional arrows on the overlay with confidence-based sizing, per-source color coding, and labels. Designed for bot/signal trading integrations
- **Trade Zones** — `chart.addTradeZone()` visualizes entry→exit rectangles with P&L coloring, direction badges, and exit labels. Supports active (open) and closed trades with `updateTradeZone()`

### API additions

- `chart.getData()` — public access to raw OHLC data series
- `chart.setCrosshairPosition(point)` — programmatic crosshair placement for cross-chart sync
- `ChartGrid.connectAll(adapter, symbols, timeframe)` — bulk connect all grid cells to live data
- `ChartGrid.setLayout(layout)` — dynamically switch grid layout, adding/removing charts as needed
- `chart.addSignalMarker(marker)` / `setSignalMarkers()` / `clearSignalMarkers()` / `setSignalMarkerStyle()`
- `chart.addTradeZone(zone)` / `updateTradeZone()` / `setTradeZones()` / `clearTradeZones()` / `setTradeZoneStyle()`
- New event types: `signalMarkerAdd`, `signalMarkerRemove`, `tradeZoneAdd`, `tradeZoneRemove`
- New types: `SignalMarker`, `SignalDirection`, `SignalMarkerStyle`, `TradeZone`, `TradeZoneDirection`, `TradeZoneStyle`

## 0.6.0 (2026-04-28)

### Features

- **7 new indicators**
  - **Hull MA** (overlay) — low-lag WMA-of-WMA-diff smoothing
  - **Pivot Points (Classic)** (overlay) — S3/S2/S1/PP/R1/R2/R3 with configurable lookback window
  - **Anchored VWAP** (overlay) — VWAP that resets at a chosen `anchorTime`
  - **ZigZag** (overlay) — swing-pivot connector with percentage-deviation threshold
  - **Linear Regression Channel** (overlay) — least-squares fit + std-dev bands
  - **Awesome Oscillator** (panel) — fast/slow median histogram with up/down coloring
  - **Chaikin Oscillator** (panel) — EMA(ADL, fast) − EMA(ADL, slow), exposes cumulative ADL
- **Range Bars chart type** (`'rangeBars'`) — fixed price-range bars (each bar's high − low equals a configured range), with `toRangeBars` transform
- **Trading overlay customization** (additive, no breaking changes)
  - `TradingPosition.closedQuantity` — partial-close visualization as a left-edge dim band proportional to closed fraction
  - `TradingConfig.pnlThresholds: PnLThreshold[]` — multi-stop color gradient driven by live P&L
  - `TradingConfig.positionLabel: string | (ctx) => string` — token templating (`{side}`, `{qty}`, `{openQty}`, `{closedQty}`, `{entry}`, `{price}`, `{pnl}`, `{pnlPct}`, `{pnlSign}`)
- **Web Worker indicator pipeline** — new `IndicatorWorkerHost` and bundled `indicator.worker.js` register all 33 built-in indicators. Promise-based `host.calculate(...)` offloads heavy compute off the render loop. Pass `null` for the worker to use the synchronous fallback (SSR, tests, safety net). Per-request timeout, `ping()` health check, `terminate()` cleans up pending work

### Type safety

- New `getNumberParam` / `getIntParam` helpers exported from `@tradecanvas/core`
- All 25 existing indicators migrated to the helpers — invalid params (NaN, Infinity, missing keys, non-numeric strings) now fall back to documented defaults instead of silently propagating to calculations
- `BinanceAdapter` REST and WS payloads now flow through typed `parseRestKline` / `parseWsKline` validators; `any[]` and `any` casts are gone
- `TextAnnotationTool` text resolution moved to a pure `resolveAnnotationText` helper (no more `as string` cast)
- `ChartStateManager.deserialize` validates the parsed shape — malformed drawings/orders/positions/indicators are filtered, missing or wrong-typed viewport fields fall back to defaults

### Internal refactor

- `WidgetStyles.ts` (764 LOC of CSS-in-string) extracted into a sibling `WidgetStyles.css` file, imported via Vite's `?raw` query and inlined at build time. The TS shim is now 31 LOC; CSS is editable as CSS (syntax highlighting, linting). Public API (`injectWidgetStyles` / `removeWidgetStyles`) unchanged.
- Chart-type dispatch (`createChartRenderer` and `getDisplayData`) extracted from `Chart.ts` into a new `ChartTypeStrategy` module with `createRendererFor`, `transformDisplayData`, and `isTransformedChartType` helpers
- Auto-save debounce extracted into `AutoSaveScheduler` (testable state machine, owner injects the save callback)
- Indicator panel scaling math extracted into `computeIndicatorPriceRange` (now correctly skips NaN/Infinity values)
- Removed duplicate `timeframeToMs` private method from `Chart.ts`; uses the shared helper from `@tradecanvas/commons`
- `Chart.ts`: 1632 → 1536 LOC

### Test coverage

- 267 tests across 40 files (Vitest scaffolded in `@tradecanvas/core` and `@tradecanvas/chart`)
- 25/33 indicators with direct test coverage
- New tests for: indicator math (Hull MA, Pivot Points, Anchored VWAP, ZigZag, LRC, Awesome / Chaikin Oscillator, BB, ATR, Stochastic, OBV, VWAP, Ichimoku, Supertrend, Keltner, Donchian, ADX, CCI, MFI, Williams %R, Parabolic SAR), range-bar transform, trading position formatting, drawing-tool hit-test geometry, `DrawingManager` CRUD, Binance kline parsers, `ReconnectManager` backoff/cap/give-up, `TickAggregator` (tick + pre-formed-bar paths, ring buffer eviction), `ChartState` JSON + localStorage round-trip + validator, `IndicatorWorkerHost` (worker + fallback), `ChartTypeStrategy`, `AutoSaveScheduler`, `IndicatorPriceRange`
- GitHub Actions CI workflow added under `.github/workflows/test.yml` (Node 20.19, pnpm 9.15, builds commons, runs `pnpm test`)
- Root `pnpm test` runs both packages

### Demo

- Chart-types dropdown extended with Renko, Kagi, Line Break, Point & Figure, **Range Bars**
- Indicator picker extended with Hull MA, Anchored VWAP, Pivot Points, ZigZag, Linear Regression Channel, Awesome Oscillator, Chaikin Oscillator (all 33 indicators selectable)

## 0.5.0 (2026-04-16)

### Features

- **ChartWidget — built-in TradingView-like UI** — new `@tradecanvas/chart/widget` subpath export. One-line embed with complete toolbar, drawing sidebar, settings modal, and status bar. Zero framework dependencies, CSS scoped with `tcw-` prefix
- **Typed event payloads** — `chart.on('orderModify', e => e.payload.orderId)` infers payload type via `ChartEventMap`. Includes `OrderModifyPayload`, `PositionModifyPayload`, `OrderPlacePayload`, and 10 more typed payloads
- **Timestamp normalization** — `normalizeBar({ t, o, h, l, c, v })` converts wire format to OHLCBar. `normalizeBarTime()` auto-detects seconds vs milliseconds
- **`chart.setTimeframe(tf)`** — switch timeframes on active stream without destroy/rebuild
- **`chart.appendBars(bars)`** — bulk append for reconnect catch-up (single indicator recalculate)
- **`chart.setStatusText(text)`** — display status in chart legend area (e.g. "LIVE · 8ms")
- **`chart.setCurrentPrice(price, pulseColor?)`** — optional pulse color
- **`DARK_TERMINAL` theme** — fintech terminal palette (#0E0E0E bg, #00FF87/#FF3B4D candles, monospace font)
- **`DataAdapterEventType` exported** — adapters can `implements DataAdapter` with full type safety

### Documentation

- JSDoc on `DataAdapter` interface clarifying observer pattern (reconnect to switch)
- `OHLCBar.time` documented as milliseconds
- All event payload types exported from main index

## 0.4.0 (2026-04-16)

### Features

- **Locale-aware number formatting** — new `numberLocale` option on Chart (BCP 47 format like `'en-US'`, `'de-DE'`, `'vi-VN'`)
  - `'en-US'` → `65,234.00`
  - `'de-DE'` → `65.234,00`
  - `'vi-VN'` → `65.234,00`
  - Runtime change: `chart.setNumberLocale('de-DE')`
  - Affects price axis, crosshair tooltip, indicator legend, trading overlay

### Bug Fixes

- **Keyboard shortcuts were broken** — `KeyboardHandler` was constructed then discarded with `void new`. Arrow keys, +/-, Home/End, and Space did nothing. Now properly wired to window with focus-aware handling (ignores keystrokes in inputs/textareas)
- **Streaming indicators froze until bar close** — `updateLastBar()` and `updateLastBarFromTick()` now recalculate indicators on every tick. Moving averages, Bollinger Bands, RSI, etc. now update in real-time
- **StreamManager listener leak** — adapter listeners accumulated on reconnect because unsubscribers weren't tracked. Now properly cleaned up across connect/disconnect cycles
- **Price formatting without thousand separators** — `formatPrice()` now uses `toLocaleString` for readability (`65,234.00` vs `65234.00`)

### Performance

- **`getBoundingClientRect` cached** in InteractionManager — was called on every mousemove. Now invalidated only on pointerdown, resize, and scroll. Major reduction in layout flushes during pan/crosshair
- **`structuredClone` replaced** in drag/resize hot paths with hand-rolled shallow clone (5-10x faster for `DrawingState` shape)

## 0.3.0 (2026-04-16)

### Features

- **WaterfallChart** — Running cumulative visualization with positive/negative/total bar types. Perfect for P&L attribution, revenue bridges, cash flow analysis
  - Auto-detects bar type from value sign (explicit `type` always wins)
  - Dashed/solid/none connector lines between bars
  - Value labels, category labels, crosshair tooltip with cumulative total
- **GaugeChart** — Speedometer-style gauge for KPIs, risk scores, sentiment
  - Colored zones for value ranges
  - Smooth `setValue()` animation with easeOutCubic
  - Configurable arc angles and thickness
  - Center value label + optional subtitle

### Performance

- Batched path operations grouped by color (single fill per color group)
- Integer pixel rounding for crisp 1px lines
- Cached trig calculations in gauge rendering
- rAF-coalesced animation (safe on rapid `setValue` calls)
- No per-element `beginPath+stroke` loops

## 0.2.0 (2026-04-16)

### Features

- **Finance Chart Components** — 4 new standalone chart types:
  - `SparklineChart` — tiny inline line/area chart for dashboards and KPI cards
  - `DepthChart` — bid/ask order book visualization with cumulative volume areas
  - `EquityCurveChart` — portfolio equity with drawdown shading and benchmark comparison
  - `HeatmapChart` — colored cell grid with treemap layout (weighted by market cap)
- **Client-side order matching engine** — auto-fills limit/stop orders with configurable spread and commission
- **Trade history** — tracks fills, SL/TP triggers, manual closes with win rate and PnL stats
- **Toast notifications** — animated alerts for order fills and SL/TP triggers
- **StackBlitz sandboxes** — "Open in StackBlitz" for Vanilla JS, React, Svelte, Vue
- **Finance charts demo section** — live sparklines, equity curve, depth chart, heatmap on demo page

### Bug Fixes

- Sparkline container bindings in Svelte 5 — use plain array for `bind:this` in `{#each}`
- BaseFinanceChart re-measures dimensions if 0 on first render (initial mount race)
- Rename `version` and `release` scripts (npm reserved lifecycle names)

## 0.1.3 (2026-04-15)

### Bug Fixes

- **Panel indicators not rendering until chart interaction** — `addIndicator()` now calls `updateViewportAndRender()` for panel indicators so they appear immediately
- **Stop orders showing LIMIT label** — context menu orders now preserve the correct type (LIMIT, STOP, STOP LIMIT)
- **npm publish with workspace:\* deps** — previous versions were published via `npm publish` which doesn't convert `workspace:*`. Now using `pnpm publish` for proper version resolution

### Features

- **Auto-scale includes overlay indicator values** — main chart Y-axis expands to fit Bollinger Bands, Ichimoku, Keltner, etc. instead of clipping them
- **TC prefix on all generated IDs** — indicator instances (`tc_sma_1`), drawings (`tc_drawing_1`), alerts (`tc_alert_1`) to prevent collisions
- **Trade-on-chart via built-in context menu** — right-click to place Buy Limit, Sell Limit, Buy Stop, Sell Stop at clicked price
- **`Viewport.setPriceRange()`** — new public method for direct price range control
- **`IndicatorEngine.getOverlayPriceRange()`** — compute min/max of visible overlay indicator values

## 0.1.2 (2026-04-15)

### Features

- **Demo site** — Svelte 5 demo with TradingView-style UI (live chart, drawing sidebar, dropdowns, settings modal)
- **Developer documentation** — 11 guide sections: Getting Started, Data, Adapter, Themes, Indicators, Drawings, Trading, Features, Events, State, API Reference
- **StackBlitz sandboxes** — interactive "Open in StackBlitz" for Vanilla JS, React, Svelte, Vue
- **Paper trading panel** — fake buy/sell with balance, PnL, localStorage persistence
- **Replay button** — play/pause/stop in toolbar header
- **Package manager switcher** — npm/pnpm/yarn tabs on install command

### Examples

- Updated examples/basic and examples/vanilla-static with modern UI
- Added examples/svelte (Svelte 5 + Vite)
- Added examples/vue (Vue 3 + Composition API)
- Updated examples/react with toggle buttons and chart type dropdown

### Documentation

- README with Svelte and Vue framework integration examples
- Per-package READMEs for npm pages (@tradecanvas/commons, @tradecanvas/core, @tradecanvas/chart)

## 0.1.1 (2026-04-15)

### Bug Fixes

- Fix repository URLs pointing to wrong GitHub repo
- Fix all TypeScript declaration errors (unused imports, missing index signatures, missing TimeFrame entries)
- Fix volume type mismatch in DataManager sanitizeBar
- Add `publishConfig.access: "public"` for scoped packages
- Add `prepublishOnly` build scripts

## 0.1.0 (2026-04-09)

- Initial release of `@tradecanvas/chart`, `@tradecanvas/core`, and `@tradecanvas/commons`.
