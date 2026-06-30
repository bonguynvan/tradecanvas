# @tradecanvas/chart

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

### Minor Changes

- 1b346bd: Custom chart-type plugins now render. A registered `ChartTypePlugin` is consulted when the chart resolves its renderer and display transform, so `chart.setChartType('myCustomType')` draws via the plugin's `createRenderer()` (and optional `transform()`). `setChartType` accepts custom type strings while preserving autocomplete for built-ins. The resolution is exposed as pure, testable `resolveRenderer` / `resolveDisplayData` helpers.

  `OverlayPlugin` render-time consumption is tracked separately — it needs a core engine render hook.

- b06c803: Add `chart.connectExecution(adapter)` — wire an `ExecutionAdapter` into the chart to make the trading overlay live. The chart routes its emitted order/position intents (`orderPlace`, `orderModify`, `orderCancel`, `positionModify`, `positionClose`) into the adapter's commands, and renders the authoritative `orders` / `positions` the adapter emits back. The adapter is the single source of truth. `disconnectExecution()` and `getExecutionAdapter()` round out the API.

  - Failures — adapter-reported or a failed command — surface on a single new `executionError` chart event: `chart.on('executionError', (e) => …)`.
  - Fully backward-compatible: with no execution adapter connected, the intents remain plain events as before.
  - `OrderModifyIntent.previousPrice` is now optional, so the chart's `orderModify` event payload routes straight into an adapter.

  Pair with `PaperExecutionAdapter` for a zero-setup live trading sandbox.

- 9a4cc2b: Add drag-to-create orders. `chart.startOrderDraft(side, price?)` begins a draggable single-order line at a price level (default: the latest close); drag it to a level and `confirmOrderDraft()` emits an `orderPlace` intent — which a connected `ExecutionAdapter` then fills. The order type (limit vs stop) is inferred from the level relative to the current price. `cancelOrderDraft()` and `isOrderDraftActive()` round out the API.

  The geometry and state live in a pure, testable `OrderDraftTool` (mirrors `BracketTool`), exported from `@tradecanvas/core` along with `inferOrderType`.

- b06c803: Add built-in Coinbase, Bybit, and Kraken data adapters (no API key required), built on the new generic adapter base classes:

  - **`CoinbaseAdapter`** — Coinbase Exchange REST candle polling, covering all supported granularities (the WS candles channel does not). Product ids use the `BTC-USD` format.
  - **`BybitAdapter`** — Bybit v5 `kline` WebSocket stream + REST history. Symbols use the `BTCUSDT` format; `spot` / `linear` / `inverse` categories.
  - **`KrakenAdapter`** — Kraken WebSocket v2 `ohlc` channel + REST history. WS symbols use the `BTC/USD` format; the REST pair is derived by stripping the slash.

  Each was implemented against the exchange's official API docs — candle field order, interval encoding, and ms-vs-seconds time units verified — with parser unit tests over documented sample payloads.

- b06c803: Add the v1 extension contracts — the frozen foundation for a real trading surface and a plugin ecosystem.

  - **`ExecutionAdapter`** — a strategy interface (mirroring `DataAdapter`) that turns the display-only trading overlay into a trading surface. The chart routes its emitted order/position intents into the adapter; the adapter is the single source of truth and emits authoritative `orders` / `positions` back for the chart to render. Fully backward-compatible: with no adapter connected, intents remain plain events.
  - **`PaperExecutionAdapter`** — reference in-memory implementation: virtual fills, hedging-style positions, pending limit/stop triggering via `setMarkPrice`, and SL/TP auto-close. The safe sandbox for demos and tests.
  - **Plugin SDK** — `PluginManager` is now a real registry over four plugin kinds (`IndicatorPlugin`, `DrawingPlugin`, plus new `ChartTypePlugin` and `OverlayPlugin`), unified by a `ChartPlugin` union. Adds a global `registerPlugin()` (inherited by every chart created afterward), a constructor `plugins: []` option, and `chart.plugins.register/unregister/list`. The legacy `registerIndicator` still works.

  Also fixes `Chart.version`, which was hardcoded to a stale `0.7.0`; it is now injected from `package.json` at build time so it can never drift again.

- b06c803: Add generic data-adapter base classes so any feed plugs in with ~20 lines instead of a full `DataAdapter` implementation:

  - **`WebSocketAdapter`** — configurable WebSocket adapter: supply a `wsUrl`, a `parseMessage` that returns a bar/tick, an optional `subscribeMessage`, and a REST `fetchHistory`. The base handles the connection lifecycle, frame decoding, subscribe/unsubscribe, tick synthesis, and event emission, with an injectable socket factory for testing. Reconnection stays orchestrated by `StreamManager`, matching `BinanceAdapter`.
  - **`PollingAdapter`** — REST-polling adapter for feeds without a WebSocket (most stock / FX APIs): supply `fetchBars` + an interval. Emits the latest bar as forming and the prior bar as closed on bucket rollover.

  These are the foundation for the upcoming Coinbase / Bybit / Kraken adapters.

- e9ca1a0: Performance: LTTB downsampling for line/area charts, plus a benchmark harness.

  - **LTTB downsampling** — `LineRenderer` and `AreaRenderer` automatically downsample the visible range to ~2 points per pixel using Largest-Triangle-Three-Buckets when the bar count far exceeds the pixel width, keeping 100k+ bar line charts smooth. Visually identical, and a no-op at normal zoom. The pure `lttbDownsample` / `lttbVisibleIndices` utilities are exported.
  - **Benchmark** — a `pnpm bench` script (vitest bench). Downsampling 100k points to 1,600 runs in ~0.32 ms (3,100/s); 1M in ~2.6 ms — well inside a 16.6 ms frame budget.

- 3930b56: Overlay plugins now render, and the plugin registration surface is complete.

  - **`OverlayPlugin` render-time consumption** — registered overlays draw each frame on their chosen layer (`main` / `overlay` / `ui`) via a new engine render hook, receiving the live `{ viewport, data, theme }`.
  - **Per-chart plugin registration** — `new Chart(el, { plugins: [...] })` and a `chart.plugins` accessor (`register` / `unregister` / `list`) join the existing global `registerPlugin`, completing the global + constructor + instance model.

  Docs + demo updated: new Plugins docs page; the realtime page's `DataAdapter` / `ReconnectManager` examples corrected and the new adapters added; the trading page gains live-execution + drag-to-create sections.

- 09dc432: First-class resizable panes. Drag the divider between the main chart and an indicator pane (or between panes) to resize it — `ns-resize` cursor on hover, working with both mouse and touch. Each pane keeps its own independent price scale. The geometry lives in a pure, testable `PaneResizeHandler`.

  Also fixes `chart.setPanelSize()`, which previously only requested a render without re-resolving the layout (so the pane didn't actually resize); it now performs a full relayout.

### Patch Changes

- c79be24: Fix widget popups that could not be closed (Price Alerts panel, bracket bar). Their `display: flex` rule silently overrode the `hidden` attribute's `display: none`, so calling `el.hidden = true` left them on screen. Added a namespaced normalize rule that forces `hidden` to win for every `tcw-`-prefixed widget element, fixing the current cases and future-proofing the rest.

  Also fix the Price Alerts form overflowing the panel: its grid inputs/selects now get `width: 100%; min-width: 0; box-sizing: border-box` so they shrink to their column instead of spilling past the panel edge.

- Updated dependencies [b06c803]
- Updated dependencies [9a4cc2b]
- Updated dependencies [b06c803]
- Updated dependencies [b06c803]
- Updated dependencies [c79be24]
- Updated dependencies [b06c803]
- Updated dependencies [e9ca1a0]
- Updated dependencies [3930b56]
- Updated dependencies [09dc432]
- Updated dependencies [96946ac]
  - @tradecanvas/commons@1.0.0
  - @tradecanvas/core@1.0.0

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
- 132e170: feat: Ease of Movement, Price Volume Trend, and Williams A/D indicators

  - `emv` — Ease of Movement (Richard Arms): the bar's midpoint move per unit of
    volume, SMA-smoothed; high = price moving easily, zero-centered.
  - `pvt` — Price Volume Trend: a cumulative volume line where each bar's volume
    is weighted by its percent price change (a momentum-aware OBV).
  - `wad` — Williams Accumulation/Distribution: cumulative line adding the move
    from the true-range low on up-closes and from the true-range high on
    down-closes; divergence from price flags accumulation/distribution.

  All three registered in the indicator menu and unit-tested.

- Updated dependencies [69b45d8]
- Updated dependencies [794b707]
- Updated dependencies [54cf6fd]
- Updated dependencies [132e170]
  - @tradecanvas/commons@0.14.0
  - @tradecanvas/core@0.14.0

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

- 5fe7fbf: feat: Mass Index, Chande Momentum, and TRIX indicators

  - `massindex` — Mass Index (Donald Dorsey): sums the ratio of a single to a
    double EMA of the high-low range to flag "reversal bulges" (rise above 27,
    fall below 26.5). Reference lines at 26.5 / 27.
  - `cmo` — Chande Momentum Oscillator: net momentum over the period swinging
    −100…+100 (no smoothing), with ±50 reference bands.
  - `trix` — TRIX: percent rate of change of a triple-smoothed EMA of close, with
    an EMA signal line. Zero-centered.

  All three registered in the indicator menu and unit-tested.

- Updated dependencies [d904d59]
- Updated dependencies [5fe7fbf]
  - @tradecanvas/commons@0.13.0
  - @tradecanvas/core@0.13.0

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

- ff9b8a5: feat: Williams Alligator indicator

  - New `alligator` overlay (Bill Williams) — three forward-displaced smoothed
    moving averages of the median price: jaw SMMA(13)→8, teeth SMMA(8)→5, lips
    SMMA(5)→3. Intertwined lines = range ("sleeping"); fanned out in order =
    trend ("feeding"). Configurable periods and shifts. Registered in the
    indicator menu; tested.

- 18fdff3: feat: Elder Ray Index (Bull / Bear Power)

  - New `elderray` panel indicator (Alexander Elder) — Bull Power
    (`high − EMA(close, n)`) and Bear Power (`low − EMA(close, n)`) measure how far
    buyers/sellers push price beyond consensus value. Drawn as two zero-centered
    histograms. Configurable `period` (13). Registered in the indicator menu;
    tested.

- 314b98c: feat: Klinger Volume Oscillator

  - New `kvo` panel indicator (Stephen Klinger) — compares volume flow to price
    movement via a cumulative "volume force", then KVO = EMA(VF, fast) −
    EMA(VF, slow) with an EMA signal line. Crossing the signal/zero line flags
    money-flow shifts. Zero-centered, auto-scaled, configurable
    `fast`/`slow`/`signal` (34/55/13). Registered in the indicator menu; tested.

- 888dfac: feat: Schaff Trend Cycle indicator

  - New `stc` panel indicator (Doug Schaff) — runs a MACD line through two passes
    of stochastic smoothing to produce a fast, cyclic 0–100 trend oscillator that
    turns earlier than MACD. Reference lines at 25 / 75; configurable
    `fast`/`slow`/`cycle` (23/50/10). Registered in the indicator menu; tested.

- Updated dependencies [ff9b8a5]
- Updated dependencies [18fdff3]
- Updated dependencies [314b98c]
- Updated dependencies [f3072ed]
- Updated dependencies [888dfac]
  - @tradecanvas/core@0.12.0
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

- db5a55e: feat: Chandelier Exit indicator

  - New `chandelier` overlay (Chuck LeBeau) draws ATR-based trailing-stop levels:
    long exit = highest-high(n) − mult·ATR(n), short exit = lowest-low(n) +
    mult·ATR(n). Drawn as two dashed lines (green long stop, red short stop).
    Configurable `period` (22) and `multiplier` (3). Registered in the indicator
    menu; tested.

- 4a50854: feat: Choppiness Index indicator

  - New `chop` panel indicator measures trend vs consolidation on a 0–100 scale
    (> 61.8 choppy/range, < 38.2 trending) from the ratio of summed true range to
    the n-bar high-low range. Reference lines at 38.2 / 61.8, configurable
    `period` (default 14). Registered in the indicator menu; tested.

- 13dad45: feat: Connors RSI indicator

  - New `crsi` panel indicator (Larry Connors) — a composite mean-reversion
    oscillator averaging three 0–100 components: a short price RSI (3), an RSI of
    the up/down streak length (2), and the percent-rank of the 1-bar rate of
    change over a lookback (100). Extremes (< 10 / > 90) flag oversold /
    overbought. Configurable periods, reference lines at 10/90. Registered in the
    indicator menu; tested.

- af69e8b: feat: Coppock Curve indicator

  - New `coppock` panel indicator (Edwin Coppock) — a long-term momentum
    oscillator: a weighted moving average of the sum of two rates of change
    (long 14 + short 11, WMA 10). Turning up from below zero is its classic
    major-bottom signal. Zero-centered, auto-scaled, configurable periods.
    Registered in the indicator menu; tested.

- ecf0ba4: feat: Elder Force Index indicator

  - New `fi` panel indicator combines price direction, extent, and volume into a
    zero-centered oscillator — raw force = (close − prevClose) · volume,
    EMA-smoothed (configurable `period`, default 13). Above zero = bulls in
    control, below = bears; magnitude reflects conviction. Auto-scaled with a
    zero-line reference. Registered in the indicator menu; tested.

- a509df3: feat: Ultimate Oscillator indicator

  - New `uo` panel indicator (Larry Williams) blends three timeframes of buying
    pressure (weighted 4:2:1) into a 0–100 momentum oscillator that's less prone
    to false divergences than single-period oscillators. Configurable
    `fast`/`mid`/`slow` (7/14/28), reference lines at 30/70. Registered in the
    indicator menu; tested.

- Updated dependencies [db5a55e]
- Updated dependencies [4a50854]
- Updated dependencies [13dad45]
- Updated dependencies [af69e8b]
- Updated dependencies [ecf0ba4]
- Updated dependencies [a509df3]
- Updated dependencies [a2279b6]
- Updated dependencies [9ce6081]
  - @tradecanvas/core@0.11.0
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

- 9c4613f: feat: alert sound + desktop notifications

  - New `alertNotifications` widget option fires a sound and/or a desktop
    notification when a price alert triggers (both off by default).
    `sound: true` plays a built-in two-tone Web Audio beep — no asset needed —
    or pass a URL for a custom sound; `desktop: true` uses the Notification API
    and requests permission on first use. Every entry point degrades to a no-op
    in SSR, unsupported browsers, or when permission is denied.

- 6646fa0: feat: price alerts UI panel

  - **Bell button + floating alerts panel** in `ChartWidget` — add, list, and
    delete price alerts from the toolbar without touching the API. The add form
    prefills the current price and offers all five conditions (crossing,
    crossing up/down, greater/less than) plus an optional note. Triggered alerts
    surface a toast and are flagged in the list. Default on; opt out with
    `alerts: false`. Bottom-sheet on phones (< 640 px).
  - **Proper alert events** — the chart now emits typed `alertAdd`,
    `alertRemove`, and `alertTriggered` events (with an `AlertPayload`) instead
    of only piggybacking on `dataUpdate`. Subscribe via
    `chart.on('alertTriggered', e => …)`. The legacy `dataUpdate` alert signal is
    still emitted for back-compat.

- 51b6552: feat: auto Fibonacci + programmatic drawing append

  - **`chart.autoFib()`** draws a Fibonacci retracement over the dominant swing
    (extreme high and low) in the visible range, anchored low→high for an up-swing
    and high→low for a down-swing. Exposed as an "Auto Fibonacci" command-palette
    action. Pure, tested `findDominantSwing(data, from, to)` in `@tradecanvas/core`.
  - **`chart.addDrawing({ type, anchors, … })`** appends a drawing
    programmatically (id auto-assigned, active style applied, undo-tracked), built
    on a new `DrawingManager.addDrawing()`.

- ae46413: feat: chart click events + replay-from-clicked-bar

  - The chart now emits `click` and `barClick` events for a plain left-click
    (press + release without dragging) — distinct from pan, draw, trade, and
    drag gestures. `barClick` carries `{ bar, barIndex, point }`.
  - In the widget's replay mode, **clicking a revealed bar jumps the replay
    cursor** to it (pausing playback). Built on the new click event in
    `InteractionManager` (4px drag threshold so pans never register as clicks).

- 09e74f3: feat: multi-symbol compare overlays UI

  - The object tree gains a **Compare** section. With a live adapter, its +
    button opens the symbol picker, fetches the chosen symbol's history via
    `adapter.fetchHistory`, and overlays it as a normalized line (percent mode by
    default so mixed-price symbols share one axis). Each comparison shows a colour
    dot and a remove button; overlays auto-refetch on timeframe change and drop
    themselves if they become the active symbol.
  - New `widget.addCompareSymbol(symbol)` (async, adapter-backed). The symbol
    picker now accepts a one-shot pick override so it can route to comparison
    instead of switching the main symbol. Surfaces the existing core
    `CompareRenderer` that previously had no widget UI.

- 6c5a4c4: feat: copy chart image to clipboard

  - New `chart.copyScreenshot()` writes the composited chart PNG to the clipboard
    (gracefully returns false where the async Clipboard image API is
    unavailable). Exposed in the widget as a "Copy Chart Image" command-palette
    action with a toast.

- 0123a7f: feat: Data Window (per-bar OHLCV + indicator values)

  - A floating Data Window shows the exact open/high/low/close/volume, bar change
    (absolute + %), and every active indicator's value at the hovered bar,
    updating live from `crosshairMove`. Toggle via the command palette
    ("Toggle Data Window"). Reads indicator values straight from
    `chart.getIndicatorOutput().series[index]` — no new core surface.

- 9815242: feat: trade-from-depth ladder (DOM)

  - A toolbar ladder button opens a depth-of-market panel rendering the order
    book as price rows with bid/ask size columns and depth bars. **Click an ask
    cell to buy, a bid cell to sell** at that price — each click emits an
    `orderPlace` intent (the chart never trades itself, matching the host-owned
    model). Opt in with `depthLadder: true`; feed the book via the new
    `widget.setDepth(data)`, which also drives the on-chart depth overlay.
  - New `chart.placeOrderIntent()` to emit an order intent programmatically, and
    a pure, tested `buildLadderRows()` that merges bids/asks into a high→low
    ladder model with mid-price and bar scaling.

- 053ef97: feat: draggable price-alert lines

  - Grab an alert line on the chart and drag it to a new price — the cursor
    switches to a resize affordance on hover, and moving an alert re-arms a
    triggered one. Scale-aware (works in log / percentage / indexed modes).
  - New `AlertDragHandler` (core) wired into `InteractionManager`; hit-tested
    after trading/drawing so it only claims the gesture right on a line.
  - `AlertManager.getAlertAtPoint()` / `updateAlertPrice()` added; the chart
    emits a typed `alertUpdate` event on drag, and the alerts panel refreshes.

- 1370f1a: feat: drawing favorites strip

  - Pin frequently-used drawing tools to a strip at the top of the sidebar.
    Right-click any tool (in a group flyout or the strip) to pin/unpin it; the
    set persists to localStorage. Seed the initial pins with the new
    `drawingFavorites` widget option. The strip is always available and hides
    while empty.
  - New `DrawingFavoritesStore` (injectable storage, dedup, corruption-tolerant)
    with full unit coverage.

- c97c785: feat: drawing style popover + saved templates

  - A palette button on the drawing sidebar opens a style popover: colour
    swatches + picker, line width, and line style, applied to the next drawing
    **and** the currently selected one. Save named **style templates** (persisted
    to localStorage) for one-click reuse; apply or delete them inline.
  - Core: `DrawingManager.getActiveStyle()` and `setSelectedDrawingStyle()`
    (records an undo entry), surfaced on `Chart` as `getDrawingStyle()`,
    `setSelectedDrawingStyle()`, and `getSelectedDrawingId()`.
  - New `DrawingTemplateStore` (injectable storage, upsert-by-name, corruption-
    tolerant) with full unit coverage.

- 358e636: feat: indicator-value alerts

  - Alerts can now fire on an **indicator line** crossing a level, not just price
    (e.g. "RSI crossing up 70", "MACD histogram crossing 0"). The `AlertManager`
    generalised to per-channel evaluation (`checkChannel`), each alert carrying a
    `channel` (`'price'` or `<instanceId>:<key>`) and a source `label`.
    Indicator-channel alerts don't render as price lines and aren't price-drag
    targets.
  - **Chart**: `addAlert(price, condition, message, channel?, label?)`; latest
    indicator values are fed to matching alerts on every update.
  - **Widget**: the alerts panel's add-form gains a **source dropdown** listing
    price plus every active indicator line, prefilling the threshold with that
    source's current value; alert rows show the source label.

- e3e7641: feat: indicator settings dialog

  - Each indicator row in the object tree gets a gear button that opens a
    parameter editor. The dialog introspects the indicator's default config to
    pick a control per field — number stepper, toggle, colour swatch, or text —
    and applies edits live through `chart.updateIndicator()` (recalculates in
    place; no remove-and-re-add). "Reset to defaults" restores the original
    config.

- 1d2b9bc: feat: show/hide indicators from the object tree

  - Each indicator row in the object tree gains an eye toggle to hide/show it
    without removing it (parity with drawings) — handy for decluttering busy
    charts while keeping the indicator and its settings.
  - Core: `IndicatorEngine.setVisible()` / `isVisible()`, `getActiveIndicators()`
    now reports `visible`; surfaced on `Chart` as `setIndicatorVisible()`.

- 7991e7c: feat: order-book liquidity heatmap

  - Accumulate depth snapshots into a heatmap drawn behind the candles: each
    snapshot is a time-positioned strip where every price level's brightness
    scales (sqrt ramp) with resting size — bids green, asks red. Surfaces
    liquidity walls that persist over time, the classic crypto "heatmap".
  - **Chart API**: `setDepthHeatmapVisible()` / `setDepthHeatmapConfig({ opacity,
capacity })` / `pushDepthSnapshot()` / `clearDepthHeatmap()`. The widget's
    `setDepth()` records a snapshot on every book update; a "Liquidity heatmap"
    settings toggle controls it.
  - Core: `DepthHeatmapRenderer` + a pure, tested `DepthHeatmapBuffer`
    (fixed-capacity ring, same-timestamp replace, max-volume scaling).

- a313aaa: feat: TPO letters for the session-split Market Profile

  - **`setMarketProfileConfig({ splitBySession: true, letters: true })`** renders
    the classic TPO letter columns (A, B, C…) per session instead of solid
    histogram bars — each bracket is a letter placed in every price bucket it
    traded. Value-area rows use the accent colour; the renderer auto-falls back
    to bars when bucket rows are too short to print legible glyphs.
  - Pure, tested helpers exported from `@tradecanvas/core`: `tpoLetter(index)`
    (A–Z then a–z, wrapping) and `assignSessionLetters(bars, min, max, buckets)`.
    Settings sheet gains an "MP letters (TPO)" toggle.

- 1022caf: feat: session-segmented Market Profile (split mode)

  - **`computeSessionProfiles(bars, priceMin, priceMax, opts)`** (core, pure) —
    splits bars into calendar-day sessions and returns a TPO profile per session,
    all sharing the same price window so they align on a common axis. Fully
    tested.
  - **Split rendering**: `setMarketProfileConfig({ splitBySession: true })` draws
    one mini-histogram per session anchored under its bars (each with its own
    value area and POC line) instead of a single merged profile — the classic
    split-profile view. Toggle from the settings sheet ("MP split by session").

- 0f5ea5c: feat: Market Profile (TPO)

  - **`computeMarketProfile(bars, priceMin, priceMax, opts)`** (core, pure) — a
    time-at-price histogram where each bar contributes one TPO to every price
    bucket its [low, high] range touched. Returns the Point of Control (busiest
    price) and the value area (the smallest band, grown out from the POC by the
    heavier neighbour, holding `valueAreaPct` — default 70% — of all TPOs).
  - **`MarketProfileRenderer`** draws it as a left-pinned histogram (so it can sit
    alongside the right-pinned Volume Profile), value-area rows highlighted, a
    dashed POC line. Rebins against the visible range on pan/zoom.
  - **Stats readout**: a compact POC / VAH / VAL label, dotted value-area
    boundary lines, and `chart.getMarketProfileStats()` returning the live
    `{ poc, vah, val, valueAreaPct }`. Toggle the label with
    `setMarketProfileConfig({ showStats: false })`.
  - **Chart API**: `setMarketProfileVisible()` / `isMarketProfileVisible()` /
    `setMarketProfileConfig()` / `getMarketProfileStats()`, plus a
    "Market Profile (TPO)" toggle in the widget settings sheet. (Footprint charts
    need per-trade bid/ask data and are out of scope for an OHLCV library.)

- 17cfd53: feat: market-structure labels (HH / HL / LH / LL)

  - Swing markers can now show market-structure labels — each pivot is tagged
    HH/LH (higher/lower high) or HL/LL (higher/lower low) against the prior
    same-type pivot, the read traders use to judge trend structure. Enable with
    `setPivotMarkersConfig({ structureLabels: true })` or the "Swing structure"
    settings toggle. Pure, tested `classifyPivots()` exported from
    `@tradecanvas/core`.

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

- e1a0b47: feat: multi-timeframe moving average indicator

  - New `mtfma` overlay indicator plots a moving average from a higher timeframe
    on the current chart (e.g. the daily 50-MA while viewing 1h bars). Base bars
    are grouped into higher-timeframe buckets and only _completed_ HTF closes are
    averaged, so the line steps at each boundary and **never repaints**.
    Configurable `period` and `timeframe` (editable from the indicator settings
    dialog). Registered in the indicator menu and tested.

- 5994fe4: feat: object tree panel (layers manager)

  - **Layers button + object-tree panel** in `ChartWidget` — lists every active
    indicator and drawing on the chart. Indicators can be removed; drawings get
    per-item show/hide, lock/unlock, and delete, all reflected live. Refreshes on
    drawing/indicator add & remove. Default on; opt out with `objectTree: false`.
    Bottom-sheet on phones.
  - **Per-drawing core API** — `DrawingManager.setDrawingVisible(id, v)` /
    `setDrawingLocked(id, v)` (single-item, alongside the existing bulk
    operations), surfaced on `Chart` as `setDrawingVisible` / `setDrawingLocked`.

- a160c43: feat: strategy performance dashboard

  - **`PerformanceDashboard`** — a composed, themed dashboard rendered from a
    backtest result (structurally any `{ equityCurve, metrics }`, e.g. the
    output of `@tradecanvas/analytics` `Backtester.run()`). One call builds a
    headline stats strip (total return, CAGR, Sharpe, Sortino, max drawdown,
    win rate, profit factor, trades), an equity curve, an underwater drawdown
    panel, and a calendar monthly-returns heatmap. Responsive grid, light/dark
    aware, `update()` / `setTheme()` / `destroy()`.
  - **Pure derivations exported** for custom layouts: `computeMonthlyReturns`,
    `computeDrawdownCurve`, `toEquityPoints`, `selectKeyStats`. Monthly returns
    are chained off the prior month's close so the heatmap reads as sequential
    monthly performance.

- 3ee8efb: feat: prior-period levels (PDH / PDL / PDC)

  - Draw the prior day's or week's high, low, and close — plus the current
    period's open — as labelled horizontal lines (PDH/PDL/PDC + Day Open, or the
    weekly PWH/PWL/PWC). The intraday support/resistance levels traders watch.
  - **Chart**: `setPeriodLevelsVisible()` / `setPeriodLevelsPeriod('day'|'week')`,
    with a settings-sheet toggle + basis selector. Pure, tested
    `computePeriodLevels(bars, period)` exported from `@tradecanvas/core`.

- bf54565: feat: price scale modes (regular / log / percentage / indexed-to-100)

  - **`chart.setScaleMode(mode)` / `getScaleMode()`** — switch the price axis
    between `regular`, `logarithmic`, `percentage`, and `indexedTo100`. Regular,
    percentage, and indexed share linear geometry; percentage labels show the %
    change from the first visible bar, indexed rebases that bar to 100. Logarithmic
    keeps the existing log geometry.
  - **Settings panel** now offers a "Price Scale" selector (replacing the Log
    Scale toggle); the legacy `logScale` flag stays mirrored for persisted
    layouts, and `setLogScale()` / `isLogScale()` keep working.
  - **`formatPriceScaleLabel()`** exported from `@tradecanvas/commons`, plus
    `PriceScaleMode` and `ViewportState.scaleMode` / `scaleBaseline`. The chart
    sets the baseline (first visible bar's close) each frame.

- 226e12c: fix: review-pass hardening of click, alert, and bracket code

  - **Spurious clicks**: resetting click-tracking state in `onMouseLeave` so a
    press that drifts out of the canvas and releases outside no longer fires a
    ghost `click` / `barClick` (and stray replay-seek).
  - **Bar mapping**: the new click handler now uses the canonical `xToBarIndex`
    (accounts for chart-rect offset and bar centering) so the clicked bar matches
    the crosshair and drawings.
  - **Bracket on touch**: touch events route to the trading manager, so the
    bracket handles (and order/position lines) are draggable on mobile.
  - **Alert level conditions**: `greaterThan` / `lessThan` are now edge-triggered
    — they fire once on entering the condition (immediate fire preserved if
    already past the level) instead of every tick; repeating alerts re-arm once
    the value leaves the level.
  - **Alert context switches**: `AlertManager.clearLastValues()` is called on
    `setData` so indicator-channel alerts don't cross against a stale previous
    value after a symbol/timeframe change.
  - **Alert persistence**: `repeating` is now saved/restored, and price-0 alerts
    (e.g. oscillator `> 0`) are no longer dropped on load.
  - **Bracket defaults**: stop distance is floored so a zero entry price can't
    collapse SL/TP onto entry.
  - **Alert sources**: multi-output indicator lines (MACD, Stochastic) are
    discovered from the latest series point so all lines are offered.

- dcacc5b: feat: regular-trading-hours session shading

  - Dim bars outside the regular session (pre/post-market or the overnight break)
    with a translucent overlay so the cash session stands out. Defaults to US
    equity RTH (09:30–16:00 ET); the window is configurable in minutes-of-day plus
    a timezone offset and handles overnight sessions (end < start).
  - **Chart**: `setSessionShadingVisible()` / `setSessionShadingConfig()`, with a
    settings-sheet toggle. Pure, tested `isRegularSession` / `minuteOfDay` helpers
    exported from `@tradecanvas/core`.

- 16ecd48: feat: Session VWAP indicator

  - New `svwap` overlay — a volume-weighted average price that resets at the
    start of each calendar day (UTC), the way intraday traders read VWAP.
    Distinct from the cumulative `vwap` (never resets) and `avwap` (manual
    anchor); the line breaks cleanly at each session boundary. Registered in the
    indicator menu; tested.

- a3de054: feat: tuning sliders in the settings sheet

  - The chart-settings sheet gains range sliders to tune the profile/heatmap
    overlays live: **Market Profile buckets** (8–200) and **opacity**, and
    **liquidity heatmap opacity** — no code needed. Built on a new reusable
    `rangeRow` settings control with a live value readout.

- de4457c: feat: shareable view deep-links

  - Encode the full widget view — symbol, timeframe, chart type, price-scale
    mode, indicators (with params), and drawings — into a compact, URL-safe
    token. New `widget.exportState()` / `importState()` / `copyShareLink()`, and a
    "Share View (copy link)" command-palette action. With the new `shareUrl: true`
    option the widget restores a `#tcw=<token>` URL hash on load.
  - Pure, tested codec (`encodeWidgetState` / `decodeWidgetState`, base64url +
    versioning, unicode-safe, null on malformed) plus `readShareHash` /
    `buildShareUrl` helpers.

- 5e9ab8c: feat: swing / pivot markers

  - Mark fractal swing highs and lows with small triangles (▼ above a confirmed
    pivot high, ▲ below a pivot low) — the market-structure points traders read.
    Strength is configurable (how many bars must be lower/higher on each side),
    with optional price labels. `setPivotMarkersVisible()` /
    `setPivotMarkersConfig()` + a settings-sheet toggle and strength slider.
  - Pure, tested `findPivots(data, left, right)` exported from `@tradecanvas/core`
    (strict comparison so ties / plateaus don't register, unconfirmed tail pivots
    omitted).

- a160c43: feat: client-side timeframe resampling

  - **`resampleOHLCV(bars, target)`** — aggregate a finer OHLCV series into any
    coarser timeframe (1m → 5m / 15m / 1h / 4h / 1D / 1W / 1M …). Open = first,
    high/low = extremes, close = last, volume = sum. Calendar-aware bucketing:
    intraday and daily frames anchor to UTC epoch boundaries, weeks to Monday
    (configurable via `weekStartsOn`), months/quarters/years to calendar
    boundaries. Input bars are never mutated.
  - **`inferTimeframeMs(bars)`** — detect the source bar spacing from the median
    gap, robust to weekend/halt gaps.
  - **`canResample(sourceMs, target)`** — guard against accidental upsampling.
  - **`timeframeBucketStart(time, tf, weekStartsOn?)`** exported from
    `@tradecanvas/commons` — the calendar-aware bucket anchor used by resampling.
  - **Widget integration** — `ChartWidget` now resamples locally when the
    timeframe buttons are clicked and no live adapter is attached: one loaded
    dataset drives every resolution, no refetch. New `widget.setData(bars)`
    registers the finest-resolution base series; opt out with
    `resampleTimeframes: false`. New `weekStartsOn` widget option.

- 8f69419: feat: timezone-aware time axis + crosshair

  - Time-axis labels, the timezone badge, and the crosshair time pill can now
    render in a fixed UTC offset instead of only the browser-local zone — handy
    for trading a market in its exchange time. `chart.setTimezoneOffset(minutes |
null)` (e.g. -300 for EST, 330 for IST, null for local), with a Timezone
    selector in the settings sheet.
  - Pure, tested `timeParts(timeMs, tzOffsetMinutes)` and `tzLabel()` helpers in
    `@tradecanvas/commons` (handles negative offsets that wrap the day and
    fractional offsets like +5:30).

- d9b3ed8: feat: Volume Delta panel indicator

  - New `voldelta` panel indicator approximates directional volume from OHLCV:
    bars closing up contribute positive volume, down bars negative.
    `mode: 0` renders the per-bar delta histogram (green/red), `mode: 1` the
    cumulative delta. Registered in the indicator menu; tested. (A true
    tick-by-tick delta needs per-trade bid/ask data, out of scope for OHLCV.)

- Updated dependencies [6646fa0]
- Updated dependencies [51b6552]
- Updated dependencies [ae46413]
- Updated dependencies [053ef97]
- Updated dependencies [d7d777f]
- Updated dependencies [c97c785]
- Updated dependencies [358e636]
- Updated dependencies [1d2b9bc]
- Updated dependencies [7991e7c]
- Updated dependencies [a313aaa]
- Updated dependencies [1022caf]
- Updated dependencies [0f5ea5c]
- Updated dependencies [17cfd53]
- Updated dependencies [a160c43]
- Updated dependencies [e1a0b47]
- Updated dependencies [5994fe4]
- Updated dependencies [3ee8efb]
- Updated dependencies [bf54565]
- Updated dependencies [226e12c]
- Updated dependencies [dcacc5b]
- Updated dependencies [16ecd48]
- Updated dependencies [5e9ab8c]
- Updated dependencies [a160c43]
- Updated dependencies [8f69419]
- Updated dependencies [d9b3ed8]
  - @tradecanvas/commons@0.10.0
  - @tradecanvas/core@0.10.0

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
  - @tradecanvas/core@0.9.0

## 0.8.2

### Patch Changes

- @tradecanvas/commons@0.8.2
- @tradecanvas/core@0.8.2

## 0.8.1

### Patch Changes

- Fix: `features.tradingContextMenu` flag is now wired through to the actual contextmenu handler.

  Previously the flag existed in `FeaturesConfig` but the right-click handler in `InteractionManager` always called `preventDefault()` and routed to the trading manager, regardless of whether the custom menu would render. The result: setting `tradingContextMenu: false` (or any config that keeps the trading subsystem on but the menu off) suppressed the native browser context menu without showing a replacement, leaving users with no right-click affordance at all.

  The fix:

  - `Chart.ts` now passes `features.tradingContextMenu` into the `TradingManager` config (`contextMenu.enabled`).
  - `InteractionManager.onContextMenu` only calls `preventDefault()` when the trading context menu actually opens.

  Projects that don't use trading can now opt out cleanly:

  ```ts
  new Chart(host, { features: { trading: false } }); // no trading at all
  new Chart(host, { features: { tradingContextMenu: false } }); // keep orders/positions, drop the menu
  ```

  In both cases, native browser right-click works on the chart as expected.

- Updated dependencies
  - @tradecanvas/core@0.8.1
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
  - @tradecanvas/core@0.8.0

## 0.7.1

### Patch Changes

- Fix: drawings drift after timeframe / symbol switch

  Drawings now store anchors as real timestamps instead of fragile bar indices,
  so they keep pointing at the same wall-clock time when the bar series changes
  (timeframe switch, symbol switch, etc.) — matching TradingView behavior.

  **Implementation**

  - `ViewportState` gained an optional `data?: ReadonlyArray<{ time: number }>`
    field. When set, `anchor.time` is interpreted as a real timestamp; otherwise
    it falls back to bar-index semantics for backward compatibility with custom
    callers / plugins that don't inject data.
  - New helpers in `@tradecanvas/core`: `timeToX`, `xToTime`, `resolveBarIndex`.
    Drawing base + tools use these instead of the raw `barIndexToX` / `xToBarIndex`.
  - `Chart` injects `data` into the viewport for both render and interaction
    paths (drawing creation, drag, resize, hit-test), so all flows agree on the
    same anchor format.
  - `DrawingManager.setDrawings()` auto-migrates legacy bar-index anchors to
    timestamps on load (heuristic: `time < 1e9` → bar index, upgraded via
    `data[idx].time`). Existing persisted drawings keep working.
  - `duplicateDrawing()` offsets by 3 × median bar interval (in time units)
    instead of `+3` literal — copies remain visually distinct on any timeframe.
  - `Measure` and `DateRange` tools compute the "X bars" label via resolved
    bar indices so the count reflects the active timeframe.

  **No public API breaks** — the change is additive (new optional field, new
  helpers). Custom drawing plugins that read `state.anchors[i].time` directly
  should call `resolveBarIndex(time, viewport)` to convert to a bar index.

- Updated dependencies
  - @tradecanvas/core@0.7.1
  - @tradecanvas/commons@0.7.1

## 0.6.0

### Minor Changes

- 1333b7d: Expand indicators, chart types, trading overlay customization, and harden type safety.

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

### Patch Changes

- Updated dependencies [1333b7d]
  - @tradecanvas/commons@0.6.0
  - @tradecanvas/core@0.6.0

## 0.5.0

### Minor Changes

- Broker integration API improvements — typed events, timestamp normalization, setTimeframe, DARK_TERMINAL theme.

  ## Features

  **Typed event payloads** — `chart.on('orderModify', e => e.payload.orderId)` now infers the correct payload type via `ChartEventMap`. No more runtime guards or `as any` casts.

  **Timestamp normalization** — `normalizeBar()` converts wire format `{ t, o, h, l, c, v }` to `OHLCBar`. `normalizeBarTime()` auto-detects seconds vs milliseconds (`time > 1e12`).

  **`chart.setTimeframe(tf)`** — switch timeframes on an active stream without destroy/rebuild. Internally delegates to `switchStream()` with the stored symbol.

  **`chart.appendBars(bars)`** — bulk-append for reconnect catch-up. Recalculates indicators once instead of per-bar.

  **`chart.setStatusText("LIVE · 8ms")`** — display custom status in the chart legend area.

  **`chart.setCurrentPrice(price, pulseColor?)`** — optional pulse color parameter.

  **`DARK_TERMINAL` theme** — fintech terminal palette (#0E0E0E bg, #00FF87 bull, #FF3B4D bear, monospace font).

  **`DataAdapterEventType` exported** — adapters can now `implements DataAdapter` against the real contract.

  ## Documentation

  - JSDoc on `DataAdapter` interface clarifying observer pattern
  - `OHLCBar.time` documented as milliseconds

### Patch Changes

- Updated dependencies
  - @tradecanvas/commons@0.5.0
  - @tradecanvas/core@0.5.0

## 0.4.0

### Minor Changes

- Locale-aware number formatting + 4 critical bug fixes + 2 performance optimizations.

  ## Features

  **Locale-aware number formatting** — new `numberLocale` option on Chart (BCP 47 format):

  ```typescript
  const chart = new Chart(el, {
    chartType: "candlestick",
    numberLocale: "de-DE", // 65.234,00 instead of 65,234.00
  });

  // Change at runtime
  chart.setNumberLocale("vi-VN");
  ```

  Affects price axis, crosshair tooltip, indicator legend, and trading overlay values. Supports any valid BCP 47 locale (`en-US`, `de-DE`, `fr-FR`, `vi-VN`, `en-IN`, `ja-JP`, etc.).

  ## Bug Fixes

  - **Keyboard shortcuts were broken** — `KeyboardHandler` was constructed then discarded, so arrow keys, +/-, Home/End, and Space did nothing. Now properly wired to `window` with focus-aware handling (ignores input/textarea/contentEditable elements).
  - **Streaming indicators froze until bar close** — Moving averages, Bollinger Bands, RSI, etc. now update in real-time on every tick instead of only at bar close.
  - **StreamManager listener leak** — Adapter listeners accumulated across connect/disconnect cycles because unsubscribers weren't tracked. Now properly cleaned up.
  - **Price formatting lacked thousand separators** — `formatPrice()` now uses `toLocaleString` for readability (`65,234.00` vs `65234.00`).

  ## Performance

  - **Cached `getBoundingClientRect`** in `InteractionManager` — was called on every mousemove event. Now invalidated only on pointerdown, resize, and scroll. Significant reduction in layout flushes during pan and crosshair movement.
  - **Replaced `structuredClone`** in drag/resize hot paths with hand-rolled shallow clone (5-10x faster for the `DrawingState` shape).

### Patch Changes

- Updated dependencies
  - @tradecanvas/commons@0.4.0
  - @tradecanvas/core@0.4.0

## 0.3.0

### Minor Changes

- Add WaterfallChart and GaugeChart — two new finance-specific chart components.

  **WaterfallChart** — Visualize running totals with positive/negative contributions. Perfect for P&L attribution, revenue bridges, and cash flow analysis.

  ```typescript
  import { WaterfallChart } from "@tradecanvas/chart";

  new WaterfallChart(container, {
    data: [
      { label: "Start", value: 10000, type: "total" },
      { label: "Gain", value: 1850 },
      { label: "Loss", value: -620 },
      { label: "End", value: 11230, type: "total" },
    ],
    showValues: true,
    crosshair: true,
  });
  ```

  **GaugeChart** — Speedometer-style gauge for KPIs, risk scores, and sentiment indicators with colored zones and smooth value animation.

  ```typescript
  import { GaugeChart } from "@tradecanvas/chart";

  const gauge = new GaugeChart(container, {
    value: 72,
    min: 0,
    max: 100,
    label: "Fear & Greed",
    zones: [
      { from: 0, to: 25, color: "#ef4444" },
      { from: 75, to: 100, color: "#10b981" },
    ],
    animate: true,
  });

  gauge.setValue(85); // smooth animation to new value
  ```

  Both charts share the performant `BaseFinanceChart` infrastructure: DPR-aware canvas, auto-resize, theme switching, and batched path operations for efficient rendering.

### Patch Changes

- Updated dependencies
  - @tradecanvas/commons@0.3.0
  - @tradecanvas/core@0.3.0

## 0.2.0

### Minor Changes

- Add 4 finance chart components (SparklineChart, DepthChart, EquityCurveChart, HeatmapChart), client-side order matching engine with trade history, and comprehensive developer documentation.

  Features:

  - SparklineChart: tiny inline line/area chart for dashboards
  - DepthChart: bid/ask order book visualization with crosshair
  - EquityCurveChart: portfolio equity with drawdown shading and benchmark
  - HeatmapChart: colored cell grid with treemap layout
  - Order matching engine: auto-fills limit/stop orders with spread and commission
  - Trade history with win rate and PnL stats
  - Toast notifications for order fills and SL/TP triggers
  - Trade-on-chart via built-in right-click context menu
  - TC prefix on all generated IDs
  - Auto-scale includes overlay indicator values
  - StackBlitz interactive sandboxes (Vanilla JS, React, Svelte, Vue)
  - Panel indicators now render immediately (no interaction needed)

  Bug fixes:

  - Stop orders show correct STOP label
  - Fix workspace:\* deps in published packages

### Patch Changes

- Updated dependencies
  - @tradecanvas/commons@0.2.0
  - @tradecanvas/core@0.2.0
