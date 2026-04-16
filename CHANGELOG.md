# Changelog

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
