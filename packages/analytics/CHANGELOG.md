# @tradecanvas/analytics

## 1.0.0

### Major Changes

- 96946ac: TradeCanvas 1.0 — first stable release. The public API is now semver-stable.

  Everything an open-source trading chart needs, batteries-included and zero-dependency:

  - **Charting** — 17 chart types, 60+ technical indicators, 24 drawing tools, multi-chart grid, and finance charts (sparkline, depth, equity, heatmap, waterfall, gauge).
  - **Data** — built-in Binance, Coinbase, Bybit, and Kraken adapters, plus generic `WebSocketAdapter` / `PollingAdapter` bases so any feed plugs in with ~20 lines.
  - **Trading** — a real execution surface: connect an `ExecutionAdapter` to route the chart's order/position intents to a broker/OMS and render the fills it reports; drag on the chart to create orders; ships a `PaperExecutionAdapter` sandbox.
  - **Extensibility** — a stable Plugin SDK for custom indicators, drawing tools, chart types, and overlays, registered globally or per-chart.
  - **Layout** — resizable indicator panes with independent price scales.
  - **Performance** — LTTB downsampling keeps 100k+ bar line charts smooth.

  **Frozen 1.0 contracts** (semver-stable for the 1.x line): `DataAdapter`, `ExecutionAdapter`, the Plugin SDK (`IndicatorPlugin` / `DrawingPlugin` / `ChartTypePlugin` / `OverlayPlugin`), and the chart event names + payloads.

  **Breaking from 0.x:** `chart.replay()` is renamed to `chart.replayStart()`, for consistency with `replayPause` / `replayResume` / `replayStop` / `replaySeek`.

### Patch Changes

- Updated dependencies [96946ac]
  - @tradecanvas/commons@1.0.0

## 0.15.0

### Minor Changes

- b06c803: Add the v1 extension contracts — the frozen foundation for a real trading surface and a plugin ecosystem.

  - **`ExecutionAdapter`** — a strategy interface (mirroring `DataAdapter`) that turns the display-only trading overlay into a trading surface. The chart routes its emitted order/position intents into the adapter; the adapter is the single source of truth and emits authoritative `orders` / `positions` back for the chart to render. Fully backward-compatible: with no adapter connected, intents remain plain events.
  - **`PaperExecutionAdapter`** — reference in-memory implementation: virtual fills, hedging-style positions, pending limit/stop triggering via `setMarkPrice`, and SL/TP auto-close. The safe sandbox for demos and tests.
  - **Plugin SDK** — `PluginManager` is now a real registry over four plugin kinds (`IndicatorPlugin`, `DrawingPlugin`, plus new `ChartTypePlugin` and `OverlayPlugin`), unified by a `ChartPlugin` union. Adds a global `registerPlugin()` (inherited by every chart created afterward), a constructor `plugins: []` option, and `chart.plugins.register/unregister/list`. The legacy `registerIndicator` still works.

  Also fixes `Chart.version`, which was hardcoded to a stale `0.7.0`; it is now injected from `package.json` at build time so it can never drift again.

### Patch Changes

- c79be24: Fix widget popups that could not be closed (Price Alerts panel, bracket bar). Their `display: flex` rule silently overrode the `hidden` attribute's `display: none`, so calling `el.hidden = true` left them on screen. Added a namespaced normalize rule that forces `hidden` to win for every `tcw-`-prefixed widget element, fixing the current cases and future-proofing the rest.

  Also fix the Price Alerts form overflowing the panel: its grid inputs/selects now get `width: 100%; min-width: 0; box-sizing: border-box` so they shrink to their column instead of spilling past the panel edge.

- Updated dependencies [b06c803]
- Updated dependencies [b06c803]
- Updated dependencies [c79be24]
  - @tradecanvas/commons@0.15.0

## 0.14.0

### Minor Changes

- 794b707: Indicator-depth release: 12 new panel indicators across four batches, bringing the built-in library to 66.

  - Volume flow: Ease of Movement (`emv`), Price Volume Trend (`pvt`), Williams A/D (`wad`)
  - Volatility & momentum: Chaikin Volatility (`chaikinvol`), Relative Vigor Index (`rvi`), Stochastic RSI (`stochrsi`)
  - Oscillators: Percentage Price Oscillator (`ppo`), Accelerator Oscillator (`ac`), Relative Momentum Index (`rmi`)
  - Deviation & sentiment: Disparity Index (`disparity`), Qstick (`qstick`), Pretty Good Oscillator (`pgo`)

  Also fixes an unused import in the Accelerator Oscillator that broke the type-declaration build.

### Patch Changes

- 69b45d8: Add three more panel indicators: Chaikin Volatility (`chaikinvol`), Relative Vigor Index (`rvi`), and Stochastic RSI (`stochrsi`).
- 54cf6fd: Add three more panel indicators: Percentage Price Oscillator (`ppo`), Accelerator Oscillator (`ac`), and Relative Momentum Index (`rmi`).
- Updated dependencies [69b45d8]
- Updated dependencies [794b707]
- Updated dependencies [54cf6fd]
  - @tradecanvas/commons@0.14.0

## 0.13.0

### Minor Changes

- d904d59: feat: Fisher Transform, Detrended Price Oscillator, and Balance of Power indicators

  - `fisher` — Fisher Transform (John Ehlers): Gaussian-normalizes price so
    turning points appear as sharp peaks, plotted with a one-bar lagged trigger
    line (the log singularity is clamped). Zero-centered.
  - `dpo` — Detrended Price Oscillator: removes the longer trend
    (`close[i − period/2 − 1] − SMA(close, period)`) to expose price cycles.
  - `bop` — Balance of Power: per-bar buyer/seller strength
    `(close − open)/(high − low)`, SMA-smoothed, bounded to [−1, 1].

  All three registered in the indicator menu and unit-tested.

### Patch Changes

- Updated dependencies [d904d59]
  - @tradecanvas/commons@0.13.0

## 0.12.0

### Minor Changes

- f3072ed: feat: more indicators — Know Sure Thing, Elder Ray, Schaff Trend Cycle, Klinger Oscillator, Williams Alligator

  Know Sure Thing (KST)

  - New `kst` panel indicator (Martin Pring) — a momentum oscillator from four
    smoothed rates of change weighted 1:2:3:4 toward the longer cycles, plus an
    SMA signal line. KST crossing its signal (and the zero line) flags momentum
    shifts. Zero-centered, auto-scaled, fully configurable ROC/SMA/signal periods.
    Registered in the indicator menu; tested.

### Patch Changes

- Updated dependencies [f3072ed]
  - @tradecanvas/commons@0.12.0

## 0.11.0

### Minor Changes

- a2279b6: feat: indicator expansion — Vortex, Choppiness, Ultimate Oscillator, Force Index, Connors RSI, Coppock, Chandelier Exit, Session VWAP bands

  Vortex Indicator (VI+ / VI−)

  - New `vortex` panel indicator plots VI+ and VI− from consecutive highs/lows
    normalised by true range (configurable `period`, default 14). VI+ crossing
    above VI− signals an up-trend (and vice-versa); a 1.0 reference line marks the
    pivot. Auto-scales to the visible range. Registered in the indicator menu;
    tested.

### Patch Changes

- Updated dependencies [a2279b6]
  - @tradecanvas/commons@0.11.0

## 0.10.0

### Minor Changes

- d7d777f: feat: draggable bracket order entry

  - **Place an entry + stop-loss + take-profit bracket by dragging.**
    `chart.startBracket('buy' | 'sell', entry?)` opens a live preview — an entry
    line plus shaded red (risk) and green (reward) zones with price and R:R
    labels. Drag any of the three lines to retune (entry translates the whole
    bracket; SL/TP clamp to the correct side). Confirm with <kbd>Enter</kbd> /
    `confirmBracket()`, cancel with <kbd>Esc</kbd> / `cancelBracket()`.
  - Emits a single typed **`bracketPlace`** event
    (`{ side, entry, stopLoss, takeProfit, riskReward }`) — the chart never places
    orders itself, matching the host-owned trading model.
  - Widget: green/red **Long/Short toolbar buttons** start a bracket at the
    latest price; a floating **Place / Cancel** bar appears while placing.
  - Core: new `BracketTool` with pure, tested helpers (`computeBracketDefaults`,
    `bracketRiskReward`) housed in the `TradingManager` pointer/render pipeline;
    `InteractionManager` gains an Enter-to-confirm hook.

### Patch Changes

- a160c43: feat: mobile / touch pass

  - **Long-press tooltip pin** — press-and-hold (~500 ms with < 8px movement) on
    the chart pins an OHLC tooltip at the bar under your finger, the mobile
    equivalent of Alt+click on desktop. Cancelled by movement, by a second
    finger landing, or by `Esc`.
  - **Touch axis-drag scaling** — single-finger drag inside the price-axis
    strip (right) or time-axis strip (bottom) scales that axis exactly like
    the desktop mouse-drag gesture. No more "I can only zoom with pinch."
  - **Bottom-sheet modals** — under 640 px viewports, settings / hotkey sheet /
    command palette / symbol search slide up from the bottom with a grab handle
    and `env(safe-area-inset-bottom)` padding for the iPhone home indicator.
    Hotkey sheet collapses to a single column. Sheet width is full-viewport,
    border-radius only on the top corners.
  - **Bigger touch targets** under 768 px — toolbar height 40→44 px, buttons
    pad up to 40 px square. Apple HIG-compliant.
  - **Hotkey sheet** now documents the touch gestures alongside keyboard
    shortcuts.

- Updated dependencies [6646fa0]
- Updated dependencies [053ef97]
- Updated dependencies [d7d777f]
- Updated dependencies [a160c43]
- Updated dependencies [bf54565]
- Updated dependencies [226e12c]
- Updated dependencies [a160c43]
- Updated dependencies [8f69419]
  - @tradecanvas/commons@0.10.0

## 0.9.0

### Minor Changes

- feat: axis-drag scaling, measure tool, symbol search + premium CSS

  - **Axis-drag scaling**: drag the price axis vertically to compress/expand the
    price scale (disables auto-scale); drag the time axis horizontally to zoom.
    Double-click the price axis to re-enable auto-scale; double-click the time
    axis to fit all data. Cursor changes to `ns-resize` / `ew-resize` over the
    respective strips.
  - **In-canvas axis polish**: price + time axes now render with subtle dividers,
    thin tick notches, and refined typography weight — drops the heavy per-label
    background rectangles for a TradingView-like feel.
  - **Widget CSS refresh**: new design tokens (typography, motion, elevation,
    shape), Inter + JetBrains Mono stacks, smooth cubic-bezier transitions,
    refined hover/active/focus states, subtle gradient toolbar/sidebar surfaces,
    larger radii on modals/command palette, animated `connected` status pulse,
    refined scrollbars, reduced-motion support.
  - New `Viewport.scalePriceRange(factor)` and `AxisDragHandler` exports for
    consumers building custom axis interactions.
  - **Measure tool**: hold <kbd>Shift</kbd> and drag on the chart to draw a
    transient ruler showing bar count, time span, price Δ, and %. Exported as
    `MeasureOverlay` from `@tradecanvas/core` (lives next to the existing
    click-anchored `MeasureTool` drawing — they coexist).
  - **Symbol search modal**: clicking the toolbar symbol (or pressing
    <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>P</kbd>) opens a fuzzy-search picker over
    the configured `symbols[]`. Replaces the previous click-to-cycle behavior,
    which broke down past 3-4 symbols. New `widget.setSymbols(string[])` API
    updates the catalog at runtime.
  - **Strategy library**: four reference strategies under
    `@tradecanvas/analytics` — `smaCrossStrategy`, `rsiReversionStrategy`,
    `donchianBreakoutStrategy`, `bollingerReversionStrategy`. All return a
    `StrategyFn` ready to feed `Backtester.run()`.
  - **Hotkey sheet**: press <kbd>?</kbd> in the widget to open a categorized
    keyboard-shortcut reference (search, chart manipulation, drawing, keyboard
    navigation).
  - **Replay scrubber UI**: toolbar play button toggles a floating bottom
    scrubber bar with play/pause, step-back/step-forward, draggable progress
    scrubber, and a speed select (0.5×–100× bars/sec). Drives the existing
    `chart.replay*()` API and restores the original data series on exit.
    `ReplayManager.seekTo` now emits a synchronous `bar` event so seeking while
    paused immediately repaints the chart slice.
  - **Monte Carlo simulation** (`runMonteCarlo`): shuffles realised trade order
    N times to expose path-dependence. Returns per-step P5/P25/P50/P75/P95
    equity bands, final-equity percentiles, probability-of-profit, and
    worst-case max drawdown across the runs. Deterministic with a seed.
  - **Saved layouts**: opt-in widget option `persistLayouts: true` snapshots
    per-symbol chart type + indicators + drawings + alerts into localStorage
    and re-applies them when the user switches back. `widget.clearSavedLayout()`
    resets a saved entry. Default key prefix `tcw:layout:{symbol}`.
  - **Pinned tooltip**: Alt/Option-click the chart to anchor an OHLC tooltip
    at the hovered bar. The live crosshair tooltip then shows the price / %
    / bar-count delta to the pinned bar. Esc unpins. New `PinnedTooltip`
    export from `@tradecanvas/core`.
  - **Hover axis labels**: TradingView-style pill badges follow the crosshair
    on the right axis (current price under cursor) and the bottom axis
    (current time). Rendered with inverted theme colors + a triangular notch
    pointing at the crosshair line. Painted on the UI layer so they always
    sit on top of the static axis labels.
  - **Bar hover highlight**: a subtle translucent column behind the crosshair
    marks which bar the cursor is on — much easier to read in dense candle
    charts.
  - **Volume Profile**: optional horizontal histogram of traded volume
    bucketed by price over the visible range, with point-of-control
    highlighting. Toggleable via the new `chart.setVolumeProfileVisible()`
    API and the widget settings sheet (off by default).
  - **CSV / JSON drag-and-drop**: drop an OHLCV file onto the chart and it
    loads instantly. Parser auto-detects delimiter (`,` `;` tab `|`), header
    vs. headerless, ISO timestamps vs. unix s/ms, object-of-rows vs.
    array-of-arrays JSON, sorts ascending, and de-dups same-timestamp rows.
    Exported as `parseOHLCV` + `DragDropImporter` from `@tradecanvas/chart`.
    Enabled by default in the widget — opt out with `dragDropImport: false`.
  - **Watchlist sidebar**: opt-in right-side panel listing the widget's
    symbols with last price, % change, and a mini sparkline. Click a row to
    switch symbol. Active symbol updates from the live stream; other rows
    can be fed from your own WebSocket via `widget.setWatchlistEntry()`.
    Enable with `watchlist: true`.
  - **Day-separator dividers**: time-axis-area faint vertical lines at day
    boundaries, heavier at week/month/year boundaries with inline date
    labels. Auto-suppressed on daily-or-coarser timeframes so weekly charts
    don't paint a wall of lines.
  - **Toasts**: widget now has a `toast(msg, kind?)` helper for transient
    feedback (used by the drag-drop importer; available to apps).

### Patch Changes

- Updated dependencies
  - @tradecanvas/commons@0.9.0

## 0.8.2

### Patch Changes

- 7e5c9e1: Fix: `allowShort: false` no longer blocks closing or partially closing an existing long position.

  Previously the Backtester rejected **any** sell-side order when `allowShort` was disabled, including the sell that flattens a long. This made `ctx.close()` throw `Error: shorting is disabled` for long-only strategies — exactly the case `allowShort: false` is supposed to support.

  The semantics now match expectation: `allowShort: false` means _don't go net short_. A sell order is allowed when:

  - The current position is long, AND
  - The sell quantity ≤ the long quantity

  Sells that would flip net short (e.g. selling 10 when the position is +5) still throw.

  ```ts
  const bt = new Backtester({ initialCash: 10_000, allowShort: false });

  bt.run(bars, (ctx) => {
    if (!ctx.position)
      ctx.placeOrder({ side: "long", type: "market", quantity: 5 });
    else ctx.close(); // ← now works
  });
  ```

  - @tradecanvas/commons@0.8.2

## 0.8.1

### Patch Changes

- @tradecanvas/commons@0.8.1

## 0.8.0

### Minor Changes

- 1a9fce1: Strategy & pro charting release.

  **New package**: `@tradecanvas/analytics` (private, source-only for now) — `Backtester`, `Portfolio`, `computeRiskMetrics`, plus configurable `Commission` and `Slippage` models. Bar-by-bar execution model where strategies place orders on bar N that fill on bar N+1; emits a typed `BacktestResult` with fills, closed trades, an equity curve, and summary metrics (Sharpe, Sortino, Calmar, CAGR, max drawdown, win rate, profit factor, expectancy).

  **Replay mode**: new `ReplayController` in `@tradecanvas/core` plays a historical `DataSeries` forward at controlled speed with start / pause / resume / step / seek / setSpeed. Decoupled from `Chart` so it can drive both UI replay and headless backtests.

  **Pro charting**:

  - New `equivolume` chart type (full-range boxes with width proportional to volume share, colored by close vs prior close).
  - New `fibTimeZones` drawing tool (vertical Fibonacci interval projections from a two-anchor time span).

  **API additions**:

  - `ReplayController(opts)` with `ReplayEventMap` (`bar`, `finished`, `stateChange`)
  - `EquivolumeRenderer` exported from `@tradecanvas/core`
  - `FibTimeZonesTool` exported and registered by `registerBuiltInDrawingTools`
  - `'equivolume'` added to `ChartType`; `'fibTimeZones'` added to `DrawingToolType`
  - Widget catalog (`CHART_TYPES`) lists Equivolume

### Patch Changes

- Updated dependencies [1a9fce1]
  - @tradecanvas/commons@0.8.0
