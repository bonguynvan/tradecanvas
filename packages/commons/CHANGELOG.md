# @tradecanvas/commons

## 1.10.0

## 1.9.0

### Minor Changes

- bdab23b: WebGL renderer (preview): `renderer: 'webgl'` (or `'auto'`, WebGL on a hardware GPU only) draws the grid, session shading and break lines, candles and volume with WebGL 2, on a canvas under the 2D scene. `chart.setRenderer(mode)` switches at runtime, `chart.getRenderer()` says what draws, and the `rendererChange` event reports each change and why (`'unsupported'`, `'contextLost'`). Canvas 2D stays the default and takes over wherever WebGL 2 is missing or its context is lost (a failure to load or compile is logged as a warning). The WebGL code loads on first use, as a chunk of its own, and a chart hands its GPU context back when destroyed. Session break labels now draw over the bars instead of under them, inside the plot; `SessionBreaks.renderLines()` draws the lines alone.

## 1.8.0

### Minor Changes

- 6fceef2: Sharper, calmer charts.

  - **Sharp at any screen scale**: candles, bars, volume and the drawings' horizontal and vertical lines land on whole device pixels. A one-pixel wick is one sharp pixel at 100%, 125% or 200% scaling; it used to spread over two at half strength.
  - **Volume as a backdrop**: the bars keep to the bottom 15% of the chart (20% before) in the theme's own `volumeUp` / `volumeDown`, which were ignored. A theme that only changes the candle colours (or the widget's settings) gets volume in those colours. `volumeColor(candleColor)` gives the matching shade.
  - **A calmer dark palette**: softer up and down colours and quieter axis labels.
  - **Drawings**:
    - Fibonacci levels each come in their own colour with soft bands between them, and their labels sit above the lines. The drawing's colour goes to its trend line; each level's is set in its levels.
    - Drawing text uses the theme's font, on a halo of the background so it reads over bars.
    - Lines turn corners round.
    - Long/Short labels are tags just outside their zones that never overlap.
  - **Price axis**: indicator value tags step around the last-price, high/low and order tags, and scale labels under any tag are hidden instead of showing half-covered.
  - **Dates**: on an intraday chart a bar at midnight is labelled with its day on the time axis and the crosshair, not with its year as if it were a daily bar. `barsAreDaily(bars)` tells which a series is.
  - **Lines on the pixel**: the crosshair, vertical lines and wicks share one device-pixel column, so a line drawn on a bar runs through its wick.
  - **Widget**: the drawing tools sit in sections with a divider between them: lines; Fibonacci, Gann and cycles; patterns and Elliott waves; forecasting and measuring; shapes, brushes and notes. The tools below are grouped too: modes, undo and redo, clear all.

  Looks different after the update: the dark theme's colours, the volume's height, new Fibonacci drawings' colours and the order of the drawing tool groups change without any change of yours. Set `candleUp` / `candleDown` on the theme to keep the old candle colours.

## 1.7.0

### Minor Changes

- da9cb37: **Alerts, replay in finer steps, markers and pane scales.**

  - **Alerts** take `AlertOptions` (`addAlert(…, options)`): `target` compares
    with another channel (the price crossing a moving average, one indicator
    line crossing another); `movesUp` / `movesDown` with `percent` and `bars`;
    `onBarClose` looks only at closed bars; `expiresAt` ends it (`expired`, the
    `alertExpired` event). Saved layouts and stored alerts keep them. The
    widget's alerts panel offers all of it. Alerts now also check on a
    connected feed's prices, take the lines they watch at the same moment
    (`AlertManager.checkChannels`), and keep watching the live market during
    a replay (alerts on indicator lines wait for it to end). Alert events say
    what an alert watches (`channel`, `label`, `target`, `drawingId`,
    `percent`, `bars`).
  - **Replay in finer steps**: `replayStart({ steps })` grows the forming bar
    from finer bars; `replaySeekToBar`, `getReplayBarIndex`. ChartWidget's
    replay bar has a Step menu (finer intervals from the feed or the bars
    loaded).
  - **Paper trading in a replay**: `ExecutionAdapter.setMarkPrice?(price,
time)`; the chart feeds it the replayed prices (each step's low, high
    and close, every step a jump passes) and times, and
    `PaperExecutionAdapter` stamps fills with them. It only goes forward
    (after a seek back it waits until the replay is past where it was), and
    goes back to the live price when the replay ends; a mark with no time
    stamps fills now.
  - **Signal markers** react to the pointer: `signalMarkerHover`,
    `signalMarkerClick`, `SignalMarkerManager.markerAt`; ChartWidget shows a
    note by the marker.
  - **Pane scales**: `setPaneScale(id, { log, invert })`, `getPaneScale` (log
    works for volume-like panes too: `paneLogRange`, `getPaneValueRange(…, log)`); kept
    in saved layouts; `chartContextMenu` says which pane (`pane`); ChartWidget's
    pane menu has the switches.

- c063f30: **Drawing toolkit.**

  - **Each tool has its own settings.**
    - A tool's descriptor can list settings (`DrawingDescriptor.options`):
      switches, numbers, choices, text and level lists. A drawing keeps its
      values in `DrawingState.options`; saved layouts and pasted drawings keep
      them, cleaned by `sanitizeDrawingOptions` (at most 48 levels, numbers kept
      within their range).
    - Fibonacci retracement and extension: edit, hide or add levels, show
      prices and percentages, labels left or right, reverse, extend left or
      right, background. Fib channel, speed-resistance fan and time zones edit
      their levels too.
    - Trend lines and parallel channels extend left, right or both; a channel
      can hide its middle line.
    - New `chart.getDrawingOptions(id)`, `setDrawingOptions(id, options)`,
      `getDrawingOptionDefs(type)` and `getDrawingToolDescriptor(type)`;
      `addDrawing` takes `options`.
    - Each tool's starting settings: `setDrawingToolDefaults(type, options)` /
      `getDrawingToolDefaults(type)`.
    - `updateDrawing(id, { style, options, anchors })` changes a drawing in one
      undo step. `beginDrawingEdit(id)` / `endDrawingEdit(id, { cancel })`
      gather a dialog's changes into one undo step, or put the drawing back.
    - New events: `drawingUpdate`, `drawingDoubleClick`, `drawingContextMenu`.
  - **Long/Short position works out the size.** It takes an account size and
    the risk, as a percent of the account or an amount, and shows the
    quantity, the reward:risk ratio and each line's price, distance and P&L.
    The target handle sits on the target line and sets the ratio.
    A plugin can move handles that are not anchors (`DrawingPlugin.moveHandle`).
  - **Alerts on drawings.** `chart.addDrawingAlert(id, { condition, message,
repeating, label })` fires when the price crosses a trend line, ray,
    extended or horizontal line, or a channel's lines, wherever the line is by
    then, as drawn: straight across bars and, on a log scale, in log price.
    `canAddDrawingAlert(id)` tells which drawings take one now
    (`DrawingPlugin.priceAt(state, time, viewport?)`); a trend line that ends
    before the last bar takes none. The alert goes with its drawing, comes
    back with it on undo, and is kept in saved layouts; alerts left without
    their drawing are dropped.
  - **Checked input.** Layouts and templates have every style field checked
    (new `sanitizeDrawingStyle`), group names are capped, and level values and
    money amounts are kept within range.
  - **Order and groups.**
    - `moveDrawing(id, 'front' | 'forward' | 'backward' | 'back')`; undo puts a
      deleted drawing back where it was. Ctrl+] / Ctrl+[ move the selected
      drawing a step, with Shift to the top or bottom.
    - `groupDrawings(ids, name?)`, `ungroupDrawings`, `renameDrawingGroup`,
      `setDrawingGroupVisible`, `setDrawingGroupLocked`, `getDrawingGroups`.
      Clicking one drawing of a group selects the group. Ctrl+G groups the
      selection, Ctrl+Shift+G ungroups it.
    - `removeDrawings(ids)`, `setDrawingsVisible(ids, visible)` and
      `setDrawingsLocked(ids, locked)` change several drawings as one undo
      step; `getSelectedDrawingIds()` lists the selection.
    - Hiding and locking are undoable now, and a hidden drawing leaves the
      selection. New drawings and groups never reuse an id from a loaded
      layout.
  - **Undo, redo and events.** Undo and redo report drawings that come and go
    (`drawingCreate`, `drawingRemove`) and change (`drawingUpdate`), so
    listeners and alerts follow them. `drawingCreate` always carries `id` and
    `type`. Ctrl+Shift+Z redoes, as the hotkey sheet says; it used to undo.
    Drawing shortcuts no longer fire while a dialog or menu has focus.
  - **29 new drawing tools** (69 in all):
    - Notes and marks: Note (a pin with its text), Callout, Flag Mark, Arrow
      Mark (up, down, left, right, with a label) and Icon (star, heart, tick,
      cross, circle, triangles, bolt).
    - Brush and Highlighter, drawn freehand; Path (with an arrow at the end)
      and Polyline, a point per click until a double-click or Enter; Curve and
      Arc through three points.
    - Fib Circles, Fib Spiral, Fib Speed Resistance Arcs, Fib Wedge, Pitchfan
      and Gann Square, each with editable levels.
    - Elliott Impulse, Correction, Triangle, Double Combo and Triple Combo
      waves, with the wave degree's label style (①, (1), 1, i); the Elliott
      Wave tool takes the degree too.
    - Three Drives and Cypher patterns with their ratios; Time Cycles and Sine
      Line.
    - Forecast (green once the price reaches the target, red when its time
      runs out first), Projection (a move carried over from a third point) and
      Bars Pattern (a copy of some bars, as bars, a line or high-low, mirrored
      or flipped).
    - A tool says how it is drawn (`DrawingDescriptor.creation`: 'clicks',
      'freehand' or 'path', with `maxAnchors`); a tool drawn from the bars gets
      them through `DrawingPlugin.setDataGetter`. This also fixes Anchored
      VWAP and Fixed Range Volume Profile, which were never handed the bars
      and drew nothing.
  - **Eraser, zoom area and a strong magnet.** `chart.setEraserMode(true)`:
    each click on a drawing removes it, until Escape or a tool is picked.
    `chart.setZoomAreaMode(true)`: the next drag zooms to the bars in its box.
    Both report `toolModeChange`. `setDrawingMagnetMode('off' | 'weak' |
'strong')`: the strong magnet always snaps to the bar's open, high, low or
    close.
  - **ChartWidget.**
    - Double-clicking a drawing (or its settings button in the object tree)
      opens its settings: Style, the tool's own settings, and Coordinates in
      the chart's time zone. Changes show as you make them; Cancel or Escape
      takes them back. "Save as default" keeps a tool's settings for the next
      drawing; templates keep settings as well as style.
    - Right-clicking a drawing opens its menu: settings, add an alert, order,
      group or ungroup, lock, hide, duplicate and delete. It works from the
      keyboard and stays on screen.
    - The object tree lists each group with its drawings under it, and can
      hide, lock, rename or ungroup it.
    - The sidebar has the new tools in their groups (new Brushes, Cycles and
      Elliott Waves groups), an eraser and a zoom button, and a magnet button
      that goes off, weak, strong. On a short screen the sidebar scrolls and
      its menus open beside it.
    - The alerts panel lists alerts on drawings; the hotkey sheet lists the new
      shortcuts. All of it is in the widget's 14 languages.

- e2516f1: **Panes, indicator templates and undo.**

  - **Move indicators between panes**: `chart.moveIndicatorToPane(id, target)`
    into another indicator's pane, a pane of its own (`'new'`) or the price
    pane (`'price'`); `canMoveIndicatorToPane`. A pane's other indicators stay
    (one takes the pane over) or follow when they read its lines. ChartWidget:
    a ⋯ button on each legend row.
  - **Fold, maximise and reorder panes**: `setPaneCollapsed`, `setMaximizedPane`,
    `movePane`, the `paneChange` event; ChartWidget puts buttons at each pane's
    top right. Saved layouts keep each pane's size, order, fold and maximise
    (`SnapshotIndicator.paneSize`, `paneOrder`, `paneCollapsed`, `paneMaximized`).
  - **Undo for indicators**: adding, removing, editing and moving indicators are
    steps in the drawings' history; an undone indicator comes back under its own
    id; a burst of edits to one indicator is one step; a loaded layout starts a
    fresh history. `UndoableAction` has an `'indicators'` type.
  - **Indicator templates** in ChartWidget (`indicatorTemplates`, on by default),
    built on `chart.getIndicatorSetup()` / `applyIndicatorSetup()`.
  - **Type an interval**: a number typed on the chart opens a field (`5`, `15m`,
    `1h`, `1D`, Enter) — `intervalTyping`, on by default. **Alt+T / H / J / V /
    C / F** pick the trend line, horizontal line and ray, vertical line, cross
    line and Fibonacci retracement.
  - `chart.roundPrice(price)` puts a price on the market's grid (`minTick`);
    ChartWidget's menus and order ticket use it.

- 6b9a936: **Scales, formats and comparisons.**

  - **Price and time formats**: `ChartOptions.priceFormat` (a function, or
    `{ denominator, subDenominator }` fractions: `formatFraction`,
    `fractionTick`, `priceFormatterFor`), `setPriceFormat`,
    `getPriceFormatter`; `timeFormatter` / `setTimeFormatter` (told whether a
    label is a date, a new day, a time or the crosshair's). The format rides
    on `ViewportState.formatPrice` / `priceUnit` to every price label of the
    price scale; indicator panes keep their own numbers. The crosshair pill
    reads in percent on a percent scale.
  - **Chart types**: `'hiLo'`; `ChartTypeOptions` (`chartTypeOptions`,
    `setChartTypeOptions`, `getChartTypeOptions`, `readChartTypeOptions`),
    kept in saved states; Renko's ATR measures the latest bars; `toKagi` takes
    a price reversal. `setMainSeriesVisible`, `setHighLowLines` /
    `highLowLines`, `setBidAsk` (and `RawTick.bid` / `ask` through
    StreamManager's `quote`). ChartWidget offers all 18 types and their
    settings.
  - **Compare**: `compareSymbol` and `spread` indicators on other symbols'
    bars (`SymbolSeriesStore`), `setSymbolSeries`, `getSymbolSeries`,
    `getRequiredSymbols`, the `symbolSeriesRequest` event; compare overlays
    line up by time and count in the auto scale (`CompareRenderer.getPriceRange`);
    `setPaneScale(id, { percent })`. ChartWidget asks how to compare (percent,
    own scale, own pane, spread, ratio) and fetches the bars.
  - **Extended hours**: `setExtendedHours`, `isExtendedHoursVisible`,
    `ChartOptions.extendedHours` (from `SymbolInfo.sessions`).
  - **Export**: `getExportData`, `getExportText`; `exportAllData` /
    `exportVisibleData` take `{ indicators }`; `DataExporter` columns
    (`ExportColumn`), CSV cells safe from formulas.
  - **Replay**: `replayStep` and `replayState` events, `replaySeekToTime`;
    `ChartWidgetGrid` sync `replay`.

- e4fa579: **Trading and workspace.**

  - **Act on orders and positions from the chart.**
    - Order and position lines carry buttons: × cancels an order or closes a
      position, ⇅ reverses a position, × on a stop-loss or take-profit removes
      it (`TradingConfig.lineButtons`).
    - New `positionReverse` intent and `ExecutionAdapter.reversePosition`;
      without it the chart closes and sends a market order the other way.
      `chart.cancelOrderIntent`, `closePositionIntent`, `reversePositionIntent`,
      `modifyPositionIntent` (a `null` stop removes it).
    - **Adapters:** `PositionModifyIntent.stopLoss` / `takeProfit` may now be
      `null`, meaning remove it; a missing field still means keep it. An
      adapter written as `intent.stopLoss ?? position.stopLoss` would keep a
      stop the user removed.
    - Orders take `stopLoss`, `takeProfit` and `timeInForce` (`'gtc'` |
      `'day'`), carried to the position they open. `PaperExecutionAdapter`
      fills stops and targets and reverses.
  - **Fills on the chart**: a mark per fill on its bar (solid opening, hollow
    closing; `TradingConfig.fillMarks`). `FillEvent` has `reason`
    (`order`, `close`, `reverse`, `stopLoss`, `takeProfit`), `pnl` and
    `positionId`; the chart emits `executionFill` and keeps the latest 1000
    (`getFills`, `addFill`, `clearFills`; `getRealisedPnl` sums them all).
  - The buttons on the lines act on release over them; a press that slides off
    does nothing.
  - **Right-click areas and a "+" by the price axis**: `chartContextMenu`
    says which part was clicked (plot, pane, price axis, time axis) with the
    price and time there; `features.priceAxisAddButton` shows a "+" level with
    the crosshair that emits `priceAxisAdd`.
  - **Events**: `ordersChange`, `positionsChange`, and `stateChange` when
    something a saved layout holds may have changed. `setChartType` and
    `setTheme` now schedule an auto-save too.
  - **ChartWidget menus**: the plot offers an alert, a buy and a sell at the
    price (a limit where it would wait, else a stop), an order ticket, a
    horizontal line, reset view and the drawings; the price axis its scale
    switches; the time axis reset view and go to date. `chartMenuItems` adds
    the host's own entries.
  - **Order ticket and account panel** (`accountPanel`, on with trading):
    positions with their P&L, working orders and fills with close, reverse and
    cancel; a ticket with side, type, quantity, price, stop-loss, take-profit
    and time in force, checked as it is filled in, with the reward:risk.
  - **Named layouts** (`layouts`, on by default): save the chart under a name,
    open, rename and delete, auto-save the one open, Ctrl/Cmd+S. Storage is
    pluggable (`LayoutStorage`: `localStorageLayouts`, `memoryLayouts`, or the
    host's server); `LayoutSession` runs it. `widget.getLayoutContent()` /
    `applyLayoutContent()` give the content alone.
  - **ChartWidgetGrid**: up to six chart widgets side by side with a bar to pick
    the arrangement, link symbol, interval, crosshair, time and drawings, and
    save the whole grid as a named layout. `adapter: () => …` gives each chart
    its own feed, `onChartAdd` sees each chart made, and charts the grid shrinks
    from come back as they were.
  - **`ChartGrid.connectAll`** takes a function that makes an adapter per chart:
    an adapter keeps one stream, so one adapter object shared by every chart
    sent each of them the last symbol's bars.
  - Layouts record their `kind` (`'chart'` or `'grid'`), so both can share one
    storage; saving, opening and auto-saving run one at a time.
  - `widget.toggleAccountPanel()`, `getSymbol()`, `getTimeframe()`.
  - **`widget.addToolbarButton()`** for the host's own toolbar buttons (icon or
    element, text, a switch).
  - With several widgets on a page, Ctrl/Cmd+K and +P go to the one used last.

- b92e2fc: **A built-in UI system for the widget.**

  - `ChartWidgetOptions.ui`, `ChartWidget.setUI` / `getUI` and
    `ChartWidgetGrid.setUI`: the widget's look as tokens — a corner scale and
    each kind of part's corners, sizes and density, type, borders and
    separators, shadows, frosted surfaces, how a chosen button shows (`tint`,
    `solid`, `underline`), a docked or floating toolbar and drawing sidebar,
    and plain or segmented interval buttons. Three presets: `studio` (the
    default), `terminal` and `capsule`; a theme of yours lays over one.
    `resolveWidgetUI`, `widgetUIVariables`, `applyWidgetUI` and
    `WIDGET_UI_PRESETS` are exported with their types.
  - The stylesheet reads the look's CSS variables everywhere (new:
    `--tcw-control-radius`, `--tcw-menu-radius`, `--tcw-dialog-radius`,
    `--tcw-toolbar-h`, `--tcw-control-h`, `--tcw-font`, `--tcw-font-size`,
    `--tcw-weight`, `--tcw-sep-w`, `--tcw-menu-shadow`, … ), with Studio's
    values as its defaults; the existing variables stay. Without `ui` they
    are left to the stylesheet, so host CSS can still set them.
  - The chart's tags take a shape: `Theme.shape.tagRadius`,
    `ChartOptions.shapes`, `chart.setShapes` / `getShapes`, and `fillTag` in
    core. Price tags, axis pills, the crosshair's pills, order, position and
    bracket tags and period-level tags are square, rounded or pills. A shape
    in `chartOptions.shapes` stays until `setUI` is called.
  - `ChartWidgetGrid.getUI`. Panels sit below the toolbar and beside the
    drawing tools as the look sizes them; on phones the look keeps 40 px tap
    targets.
  - The widget's stylesheet now goes first in `<head>`, so the page's own CSS
    wins a tie of specificity.
  - Dropdowns grow to fit their labels instead of wrapping them.

  **The default look changes.** Studio is the new default, so an existing
  widget looks different without any change of yours: corners 5/7/11/16 px
  (were 4/6/10/14), a 46 px toolbar and 48 px drawing tools (were 44 and 40),
  30 px controls (were 32), interval buttons in a segmented track, no rules
  between toolbar groups, small labels as written (were capitals), dialog tabs
  as chips, the replay bar, toasts and badges rounded rather than pills, and
  price tags on the chart rounded 4 px. `ui: 'terminal'` is the closest to a
  square, ruled look; any token can be set with `setUI` or in CSS.

- 6d844ad: **Workspace, markets and access.**

  - **Quotes**: `Quote`, `QuoteSource`, `readQuote`; `DataAdapter.subscribeQuotes`
    (BinanceAdapter: a 24 h snapshot, then the mini-ticker stream; MockAdapter
    made-up quotes).
  - **Watchlists**: `watchlist` takes `{ lists, activeList, persist, storageKey,
quotes, onChange }`; lists to switch, create, rename and delete; symbols
    added from the symbol search, removed and reordered (drag, Alt+↑/↓).
    `getWatchlists`, `setWatchlists`, `setActiveWatchlist`, `addToWatchlist`,
    `removeFromWatchlist`, `setQuotes`, `getQuote`; `readWatchlists`.
  - **Symbol info**: a panel with price and move, the market's status, the
    day's numbers, hours and news (`symbolInfo`, `news`, `toggleSymbolInfo`);
    `marketStatus`, `SymbolSession.days`, `NewsItem`, `readNews`,
    `DataAdapter.fetchNews`. The status bar shows the market's status.
  - **Undo**: `Chart.recordUndo` for changes of your own; the widget's settings
    and chart type are undone with drawings and indicators.
  - **Events**: `chartTypeChange`, `symbolChange`, `timeframeChange`,
    `historyChange`, `drawingSelect`; `Chart.selectDrawing`, `Chart.scrollBars`.
  - **Navigation** buttons over the chart (`navigation`).
  - **Accessibility**: charts are announced with a summary, the view after a
    key moves it, and the bars one at a time (comma and period);
    `ChartOptions.a11y`.
  - **Right to left**: `dir` (auto for Arabic, Hebrew, Persian, Urdu); logical
    CSS; Arabic and Hebrew widget strings (16 languages).
  - **Tick charts**: `'100T'` timeframes from a feed's trades (`Trade`,
    `DataAdapter.fetchTrades` / `subscribeTrades`, `tickBarCount`,
    `TickBarBuilder`, `TickBarAdapter`, `withTickBars`); Binance aggregate
    trades.
  - **Stream bars land by their time**: a bar again replaces the last one, a
    later one is added, an older one is left out — so a closed bar keeps its
    final values (it used to keep the ones before its last update).
  - **Indicators**: SMI, Relative Volatility Index, Trend Strength Index,
    Linear Regression Slope, Standard Error, Standard Error Bands, GMMA, MA
    Ribbon, Average Day Range, Net Volume (95 in all).

## 1.6.0

### Minor Changes

- f7a5202: **Data and time.**

  - **Zoom out until every loaded bar fits.** Below the old 2px bar + 2px gap
    floor the slot keeps shrinking, bar and gap together, down to
    `MIN_BAR_UNIT` (0.25px), as long as the loaded bars do not fit yet. A short
    series still stops at the old floor. Below a pixel per bar, candles, OHLC
    bars, volume candles and volume draw one column per pixel
    (`forEachPixelColumn`, `renderDenseBars`). The 1Y, 5Y and All presets are no
    longer capped at about 200 bars.
  - **Older bars load as you scroll back.** - New optional `DataAdapter.fetchHistoryBefore(symbol, timeframe, before,
limit)`. Binance, Bybit and Mock implement it; `WebSocketAdapter` and
    `PollingAdapter` take it as an option. - A connected chart loads a page (`StreamConfig.historyPageSize`, default 500) when less than a screen of bars is left of the view. - It runs one request at a time and keeps the same bars on screen. - It stops at the start of the history. - After a failed request it waits 5 s before asking again, doubling each
    time; after 5 failures in a row only `loadMore()` retries. - Chart types that reshape the bars (Renko, Kagi…) only page on
    `loadMore()`. - A loader set with `setHistoryLoader` wins over the stream's. - A reconnect keeps the paged-in bars and the view when its bars reach
    back over them. After a longer outage the chart starts over instead of
    joining the two across a gap; a host's `setData` also ends the merging. - New `chart.prependBars()`, `setHistoryLoader()`, `loadMoreHistory()`,
    `hasMoreHistory()`, `isLoadingHistory()` and the `historyLoad` event. - ChartWidget shows a small pill while older bars load (`historyPageSize`
    widget option).
  - **Any interval.**
    - `TimeFrame` accepts any whole count of a unit (`'7m'`, `'90m'`, `'2d'`,
      `'5w'`) besides the listed ones; `parseTimeframe` and `isTimeFrame` check a
      string. `timeframeToMs` and `timeframeBucketStart` handle them all.
    - New optional `DataAdapter.supportedTimeframes`. Binance, Bybit, Kraken and
      Coinbase list theirs; `WebSocketAdapter` and `PollingAdapter` take them as
      an option.
    - The stream builds a timeframe the feed lacks from the coarsest one it has
      that divides it (7m from 1m, 90m from 30m, a quarter from months). This
      covers history (paging back when one request holds too few bars), live
      bars and older pages: `ResamplingAdapter`, `withResampling`,
      `resampleBars`, `pickBaseTimeframe`.
    - Before, Binance quietly sent 15m bars for intervals it lacks (45m, 2d, 3M…).
    - A timeframe the feed cannot build (30s from minutes, or more than 1440 of
      its bars per bar) is refused: `connect` and `setTimeframe` throw a
      RangeError, and the widget rejects it in the menu. New `servesTimeframe`.
    - One history call makes at most 10 requests to the feed, and stops when the
      adapter disconnects.
    - Live bars of a built timeframe hold up when a feed never flags a bar
      closed or repeats a frame. The forming bar starts from the bars history
      served, so a reconnect no longer leaves a partial candle.
    - **Type change.** `TimeFrame` now also accepts any `` `${number}${unit}` ``.
      Code that switches exhaustively over `TimeFrame`, or reads a
      `Record<TimeFrame, X>` as if every key were present, should use
      `KnownTimeFrame` or a fallback.
    - ChartWidget: the timeframe menu takes a typed interval (`7`, `90`, `2h`,
      `3D`, `1W`, `2M`). It is added, pinned, remembered and removable with an
      ×; `customTimeframes: false` hides the field. New `parseTimeframeInput`.
  - **Time zones with daylight saving time.**
    - New `chart.setTimezone(tz)` / `getTimezone()` and `ChartOptions.timeZone`.
      `tz` is an IANA zone (`'America/New_York'`), a fixed offset in minutes,
      or null for the browser's zone. An unknown zone throws a RangeError.
      `setTimezoneOffset` still works.
    - The zone applies to the time axis and its `UTC-4` tag, the crosshair pill,
      the tooltip, day/week/month breaks, the range presets and go-to-date.
      Before, day breaks always followed the browser's zone.
    - Session hours take `timeZone`, so NYSE's 09:30–16:00 holds through
      daylight-saving changes. `DEFAULT_SESSION_HOURS` now uses
      `'America/New_York'`, and `SessionHoursConfig.tzOffsetMinutes` is
      optional. A `tzOffsetMinutes` given without `timeZone` replaces a zone set
      before (new `mergeSessionHours`).
    - The Alt-click pinned tooltip shows the time in the chart's zone too.
    - Zone offsets are cached per week, so a zone costs about what the browser's
      own zone does, and UTC costs nothing. A bar whose time is not a finite
      number is dropped.
    - New commons helpers: `TimeZoneSetting`, `isValidTimeZone`,
      `zoneOffsetMinutes`, `offsetAt`, `wallToUtc`, `zonedDateFormatter`.
      `timeParts` and `tzLabel` accept a zone.
    - ChartWidget's timezone setting lists 28 zones by city, each with the offset
      in force (older fixed-offset settings still apply).
    - YTD now starts on the bar at 1 January 00:00 instead of the one after it.
  - **A left price scale.**
    - `addIndicator(id, params, position, { scale: 'left' })` or
      `chart.setIndicatorScale(id, 'left')` put an overlay on a scale of its own
      on the left, fit to its values over the visible bars. A volume-like line
      over price no longer squashes the candles.
    - The scale shows by itself while an overlay is on it.
      `setLeftPriceScaleVisible(true)` (or `ChartOptions.leftPriceScale`)
      shows it anyway, mirroring the price scale.
    - New `isLeftPriceScaleShown()`, `getLeftPriceRange()` and
      `getIndicatorScale()`; `indicatorChange` reports `'scale'`.
    - The scale is kept in saved layouts. Its overlays get value tags on it.
    - Its strip never starts a drawing or a pan. While it mirrors the price
      scale, dragging it scales prices and a double-click resets them.
    - ChartWidget: a "Left price scale" switch in the settings, and a price
      scale choice in an overlay's Style tab.
  - **Symbol search and symbol info.**
    - New optional `DataAdapter.searchSymbols(query, { limit, signal })` and
      `resolveSymbol(symbol)` that return `SymbolInfo`: description, exchange,
      type, price precision and step, exchange time zone, trading sessions and
      currency.
    - Binance implements both. Its symbol list loads once, on the first search,
      and loads again after a failure. Mock (a `symbols` option) and the
      WebSocket/Polling adapters (options) implement them too.
    - A connected chart asks `resolveSymbol` about its symbol and drops a late
      answer about a symbol it left. A failed lookup is logged with
      `console.warn` and is not a feed error; no answer keeps what the host set.
    - New `chart.setSymbolInfo` / `getSymbolInfo` and the `symbolInfoChange`
      event. The symbol's precision applies unless `setMarket` set one, and its
      sessions feed the session shading. A symbol without sessions goes back to
      the host's hours, and `setSessionShadingConfig` wins until the next
      symbol brings its own.
    - `setTimezone('exchange')` (`EXCHANGE_TIMEZONE`) follows the symbol's zone;
      `getEffectiveTimezone()` returns the resolved zone.
    - ChartWidget's symbol search asks the feed (or a `searchSymbols` option) as
      you type. It debounces, cancels a superseded query, and shows names and
      exchanges.
    - The symbol button shows the name; the settings offer the exchange's zone.
    - New `rankSymbols` and `stepDecimals`.
  - **ChartWidget in 14 languages.**
    - Languages: English, Vietnamese, Simplified and Traditional Chinese,
      Japanese, Korean, Spanish, Portuguese, French, German, Russian, Turkish,
      Indonesian and Thai.
    - Every string the widget shows now goes through its translations: settings,
      drawing tools and their groups, alerts, the object tree, the data window,
      the depth ladder, the symbol search, the command palette, the hotkey sheet,
      the replay bar and toasts. Several of these were English in Vietnamese
      too.
    - The new entry `@tradecanvas/chart/widget/locales` holds the translations,
      so a page loads only what it imports: pass one as `messages`, or call
      `registerWidgetLocales()`. English and Vietnamese stay built in.
    - A locale falls back to its language (`ja-JP` → `ja`); Chinese regions fall
      back to their script (`zh-TW` → `zh-Hant`).
    - New `registerWidgetLocale`, `findWidgetLocale`, `WIDGET_LANGUAGES`, and the
      `MessageKey` / `WidgetMessages` types.
    - The settings offer number formats for these languages.
  - The widget's replay bar sits above the time axis.
  - Pinch-zoom follows the fingers (new `ZoomHandler.onPinch`): spreading them
    twice as far apart doubles the bar width. It used to move about a twentieth
    of that. The chart's surface gets `touch-action: none` while attached.
  - Dragging inside an indicator pane pans the chart. It used to zoom time as if
    the time axis had been dragged (the time strip started at the bottom of the
    price pane, not below the panes). The axis strip beside a pane takes no
    drawing or pan.

## 1.5.0

### Minor Changes

- ad695c2: **Indicators in depth.**

  - **One scale per pane.** A pane's lines, levels, axis labels and crosshair now
    share one value scale. Before, most pane indicators drew on a scale of their
    own, so the axis and crosshair could disagree with the lines (RSI's 30 line
    read as 38). The price scale no longer stretches to fit fields that are not
    drawn, such as PSAR's trend flag or Session VWAP's session key.
  - **Declared plots.** Indicator descriptors can declare what they draw
    (`plots`: field, title, colour, line/histogram/dots/step, up/down tone), their
    pane `scale`, default `levels` and how `inputs` are edited. All built-ins do,
    and a contract test checks every one. `IndicatorBase.render` draws the
    declared plots, so a custom indicator needs no rendering code.
  - **Sources.** 38 indicators that read the close take a `source`: a price
    (`close`, `open`, `high`, `low`, `hl2`, `hlc3`, `ohlc4`, `hlcc4`) or another
    indicator's line (`indicatorSource(instanceId, key)`). An indicator on a pane
    indicator (an SMA of RSI) is drawn in its pane, recomputed when it changes
    and removed with it.
  - **Shared panes**: `addIndicator(id, params, position, { pane })`;
    `getIndicatorPanes()` lists each pane's `instanceIds`.
  - **Levels** are drawn by the chart and editable per instance:
    `getIndicatorLevels`, `setIndicatorLevels`. They are kept in saved layouts,
    along with sources and shared panes.
  - **Value tags.** Each line's latest value is tagged on its axis in its colour
    (`features.indicatorValueLabels`, `setIndicatorValueLabelsVisible`).
  - **15 new indicators** (85 in all): DEMA, SMMA, ALMA, KAMA, LSMA, McGinley
    Dynamic, MA Cross, Williams Fractals, Chande Kroll Stop, Bollinger %B,
    Bollinger BandWidth, Momentum, Historical Volatility, Volume Oscillator, Ulcer
    Index.
  - **New `indicatorChange` event** (`visible`, `style`, `levels`, `params`,
    `pane`); the widget's legend and object tree follow it.
  - **`ChartOptions.chartType` is optional** and defaults to `'candlestick'`.
  - **Widget changes.**
    - The indicator settings dialog has Inputs (with sources), Style (a colour
      per line, line width) and Levels tabs.
    - The legend colours every value as its line and uses short names.
    - Pane rows no longer cover the divider's grab zone.
    - New lines take a colour that no line in their pane already has.
    - The OHLC legend and bar-countdown toggles in Settings now take effect.
  - **Fixes.** Volume Profile is drawn over the price pane; it never showed as a
    pane. AC uses the style's up and down colours.
  - **Exports.** `PRICE_SOURCES`, `sourcePrice`, `indicatorSource`,
    `parseIndicatorSource` and the plot, scale and input types are exported from
    `@tradecanvas/chart`.
  - **Faster live updates.** The new indicators and indicators read from another
    indicator's line follow live ticks incrementally.
  - **Behaviour changes to note.**
    - Value tags are on by default; turn them off with
      `features.indicatorValueLabels: false`.
    - Built-in pane indicators draw with the viewport's value scale
      (`viewport.priceRange`) and no longer fit their own. Code that calls a
      plugin's `render` directly must pass the pane's viewport with its range
      (`getPaneValueRange`).
    - `new Chart(container, options)` keeps a copy of `options`; changing that
      object afterwards does not affect the chart.
    - A source that would make an indicator read from itself is ignored.

## 1.4.0

### Minor Changes

- 0149807: **Layouts that come back whole, ranges and dates, scale options, faster drawing.**

  - **Saved layouts restore indicators and alerts.** `saveState` / `loadState`
    (and `downloadState`, `setAutoSave`) now keep every indicator's inputs, pane,
    colours and visibility, and alerts keep their channel, repeat and label —
    alerts on indicator lines follow the indicator to its new id. Indicator
    changes trigger the auto-save. Snapshots are version 2; loading a version-1
    save (or one without an indicator list) leaves the chart's current
    indicators alone. An indicator the chart cannot add — say, from a plugin not
    registered yet — is skipped with a warning and kept in the layout when it is
    saved again; one-shot alerts that already fired stay fired.
  - **Several instances of one indicator in ChartWidget**: picking EMA twice
    gives two EMAs, each with its own chip ("EMA 20", "EMA 50"); the chips
    follow indicators added or removed through the chart API too.
  - **ChartGrid links the crosshair by time**, so charts on different symbols or
    timeframes show a vertical line on the matching bar, and it clears when the
    pointer leaves. Cells added by `setLayout` are linked too. New
    `chart.setCrosshairTime(time | null)` and a `crosshairLeave` event;
    `setCrosshairPosition(null)` now clears the crosshair.
  - **Feature flags that did nothing now apply**: `drawingMagnet`,
    `barCountdown`, `compareSymbols`, `dataExport`, `logScale` and `timeframes`
    (a whitelist for `setTimeframe`; `chart.isTimeframeAllowed`).
    ChartWidget leaves out the controls of switched-off features.
  - **Timeframe favourites in ChartWidget**: the toolbar shows pinned timeframes
    (plus the current one); a menu lists them all with a star to pin or unpin,
    remembered across visits. `features.defaultTimeframeFavorites` sets the
    starting set; the menu offers 1m–1M unless `timeframes` narrows it.
  - **Ranges and dates**: `chart.setVisibleRangePreset('1D' | '5D' | '1M' | '3M'
| '6M' | 'YTD' | '1Y' | '5Y' | 'All')` and `chart.goToTime(time)`. ChartWidget
    shows the presets under the chart with a "go to date" button (Alt+G);
    `rangeBar: false` hides them.
  - **Inverted price scale**: `chart.setInvertScale(true)`, in the widget's
    settings or Alt+I. Everything on the price pane follows it — candles, lines,
    axis, grid, profiles, drawings, alerts, orders; indicator panes stay upright.
    Indicator panes no longer pick up the log scale either.
  - **Log scale fix**: candles, bars, lines, areas, the price axis and grid were
    still drawn on a linear scale with the log scale on, while drawings and
    indicators used the log one. They now share one mapping.
  - **Drawing**: stay-in-drawing mode keeps the tool after each drawing
    (`chart.setStayInDrawingMode`, a sidebar toggle in the widget; Esc ends it),
    and Ctrl/⌘+C / Ctrl/⌘+V copy and paste the selected drawings, also into
    another chart on the page (`chart.copyDrawings()` / `chart.pasteDrawings()`).
    New `drawingToolChange` event. With several charts on a page, drawing
    shortcuts (copy/paste, undo/redo, delete) act on the chart used last, and
    never while typing in a text field; undo/redo keeps a picked tool ready.
  - **Fullscreen button** in the widget toolbar (`fullscreen: false` hides it).
  - **Widget dialogs** (settings, symbol search, command palette, shortcuts) now
    carry the widget's theme — the settings panel had lost its background — and
    open inside the widget while it is fullscreen.

- debf905: **Indicators listed on the chart, not in the toolbar.**

  - ChartWidget shows each indicator on the chart: price-pane ones stacked under
    the OHLCV legend, pane ones (RSI, MACD…) at the top of their pane. A row
    reads "EMA 50 135.29": the value at the hovered bar, also over a pane (the
    latest one off the chart, and always on Renko, Kagi, point & figure, line
    break and range bars), in the colour its line is drawn in there (several
    lines share a neutral colour). On hover or focus it offers show/hide,
    settings and remove; clicking the name opens the settings. Values follow
    live ticks and replay. A stack of two or more can be collapsed; it opens
    again when an indicator joins it. The toolbar keeps only the Indicators
    button with its count, so it no longer overflows. `indicatorLegend: false`
    turns the list off.
  - Breaking for custom CSS: the toolbar chip classes `.tcw-indicator-chips`,
    `.tcw-indicator-chip` and `.tcw-chip-remove` are gone; the rows use
    `.tcw-ind-legend*`.
  - Each further instance of an indicator takes a palette colour no other
    instance of it uses, so a second EMA no longer looks like the first.
  - `crosshairMove` now also fires over indicator panes above and below the
    price pane (with the bar under the pointer); the crosshair and the OHLC
    tooltip stay on the price pane. Mouse moves and taps on HTML controls
    inside the chart no longer move the crosshair.
  - New Chart API for labels of your own: `getLegendBottom()`,
    `getIndicatorPanes()`, `getIndicatorStyle(id)`, `formatPrice(price)`,
    `isTimeAligned()`, `setPaneTitlesVisible(false)` (the pane's own name and
    hovered values), and the `paneResize` and `indicatorUpdate` events.

## 1.3.0

### Minor Changes

- 03c0581: Drag/pan audit — the chart no longer feels stuck while dragging — plus free
  panning into the future, context cursors, Ctrl/⌘-drag multi-selection and a
  lighter two-canvas renderer.

  **Why dragging felt stuck (fixed):**

  - **Pressing on a drawing swallowed the drag.** The first press on an
    unselected drawing only selected it — the chart neither panned nor moved
    the drawing until a second drag. Now the press that selects a drawing also
    grabs it; a locked drawing is selected and the press pans the chart.
    Clicks that only select (or wobble a pixel or two) no longer move the
    drawing or add an undo step.
  - **A sloppy horizontal drag switched auto-scale off.** 6 px of net vertical
    drift was enough, after which the price scale stopped following the bars
    and wobbled with the hand. Vertical panning now needs a deliberate move
    (more than 24 px, and at least half the horizontal travel); with auto-scale
    already off the price scale still pans freely.
  - **Leaving the chart ended the drag.** Moving past the edge (a fast flick,
    over the toolbar or a side panel) dropped the gesture, and coming back did
    nothing. Drags are now followed on the document until the button is
    released — also for drawings, axis scaling, pane resizing and trading
    lines — and a release outside the window is detected. Price-based drags
    (order / SL / TP lines, alerts, brackets) are pinned to the plot's edge
    instead of taking an off-scale price; page text is no longer selected.
  - **Momentum fired after the pointer had stopped.** Release velocity came from
    the last sample alone, so holding still and letting go flung the chart.
    It is now measured over the last 100 ms, ignored if the pointer rested
    before release, capped, and stopped by any new gesture.
  - **The newest bar was a wall** — see free panning.
  - Right-button presses no longer start a pan under the context menu, and
    presses on HTML controls inside the chart (e.g. the replay scrubber) no
    longer start chart gestures.

  **Free panning.** Drag past the newest bar into empty future space, or past
  the oldest bar, until `panLimits.minVisibleBars` (3) bars remain. The time
  axis and grid continue into the future, the crosshair shows future times, and
  drawings can be placed there — magnet included (times beyond the data are
  extrapolated: `barTimeStep`, `barIndexToTime`; `timestampToBarIndex` and
  `xToTime` no longer clamp to the data). A new bar only scrolls the view when
  it rests at the end; zooming at the live edge keeps the newest bar pinned;
  `fitContent()` rests at the live edge with the usual right margin. New
  `ChartOptions.freePan` (default `true`; `false` restores the old clamp),
  `ChartOptions.panLimits`, `chart.setPanLimits()`, `Viewport.zoomToBarRange()`.
  `setVisibleRange()` now puts the requested range edge to edge (it used to
  only change the bar width around the centre). Trade zones and signal markers
  in the forming bar or beyond are no longer culled.

  **Cursors.** Crosshair over the chart (default cursor when the crosshair is
  hidden), a grabbing hand while panning or moving a drawing, a hand over
  drawings, a move cursor over the selected drawing's handles, resize arrows
  over axes, pane dividers, alert/order/SL/TP lines.

  **Multi-selection.** Ctrl/⌘-drag draws a selection box and selects every
  drawing with an anchor inside it; Ctrl/⌘-click adds or removes one. Dragging
  any selected drawing moves the whole group, Delete removes it, restyling
  applies to all of them — each as a single undo step (new `drawingBatch`
  undo action). `DrawingManager.getSelectedDrawingIds()`, `selectInRect()`,
  `toggleSelectionAt()`.

  **Right-click order menu is now off by default** (`ChartWidget` and `Chart`).
  Opt in with `features.tradingContextMenu: true`.

  **Two canvases instead of four.** The chart used to stack four full-size
  canvases (background, series, overlay, UI); moving the mouse repainted two of
  them, including every drawing, order line and axis. It now paints a scene
  canvas (grid, series, indicators, panes, chart objects, axes) and a thin top
  canvas for what follows the pointer (crosshair and its axis pills, legend,
  bar countdown, measure ruler, selection box). A hover repaints only the top
  canvas, and the browser composites two surfaces instead of four — less GPU
  memory and work, most noticeable on large high-DPI screens. New
  `LayerType.Hover` for `requestRender()`; every other `LayerType` repaints the
  scene, and `LayerManager.getLayer()` returns the scene canvas for every type
  but `Hover`. Overlay plugins behave as before: `main` draws with the series,
  `overlay` and `ui` above the crosshair, repainting as the pointer moves. The
  measure ruler's box stays inside the plot (its info pill may overhang). Also
  fixed: after the page or a scrolling container scrolled, the crosshair
  followed the pointer at an offset until the next click.

  **Price axis:** the tick label the last-price tag would cover is hidden instead
  of showing half-hidden behind it. Anchored VWAP drawings cache their series, so
  hovering over the chart no longer recomputes it on every mouse move.

- a8b6e4f: **TradeCanvas look by default.** `DARK_THEME` and `LIGHT_THEME` use the
  TradeCanvas palette: an ink ground with mint/coral candles and an amber
  series line in dark, crisp white with deeper greens/reds and a deep amber
  line in light. Indicators, orders, signal markers, drawing tools and the
  `ChartWidget` chrome (accent, surfaces, focus ring, settings defaults) follow
  the same palette. Auto-coloured indicators cycle through `TC_SERIES_COLORS`;
  comparison lines no longer start with an orange that blended into the amber
  main line; armed price alerts are blue and triggered ones amber (they were
  gold vs orange). The palette is exported as `TC_PALETTE` for building
  matching custom themes. Tests keep every theme-neutral colour at 3:1 on both
  the dark and the light background, and the widget's accent, green, red and
  muted text at 4.5:1. Charts that pass their own `Theme` are unaffected.

  **Gauge redesign.** `GaugeChart` now draws a thin ring with rounded ends:
  zones are separated by small gaps, bright up to the value and dimmed beyond
  it, and the track shows wherever no zone reaches. A knob on the ring marks
  the value, so the number in the centre is never crossed by a needle; the
  current zone's label shows above the number, with fine ticks inside the
  ring. Text shrinks to fit (or is left out) on small dials. The dial fits its
  container for any start/end angle; odd input is normalised (an end before the
  start wraps once, more than a full turn is a full turn, sweeps narrower than
  90° are widened), a collapsed `min`/`max` range and a missing value (shown as
  "—") no longer produce NaN. Changed defaults: a 240° sweep (`startAngle` 150,
  `endAngle` 390); `thickness` is relative to the ring's centre line and
  defaults to 0.14 (was 0.25 of the outer radius); `showZoneLabels` places
  labels outside the ring, with room reserved for them. The classic needle is
  available with `pointer: 'needle'` (the number moves below the hub).
  `renderGauge` restores the canvas state it changes.

## 1.2.0

### Minor Changes

- Sub-cent prices (e.g. PEPE at 0.0000043) no longer read "0.00". The OHLC
  legend, the crosshair price pill and the last-price tag now use the
  market's `pricePrecision` when `setMarket()` sets one, and otherwise the
  price axis's own precision (new `autoPricePrecision()` in commons), always
  in the configured `numberLocale`. The last-price tag is now the chart's own
  — locale-aware, and set by `setMarket()` even without a stream adapter.
  The price axis widens to fit its longest label (tick labels, last-price
  tag, crosshair pill) like an auto-sized price scale, instead of
  clipping at a fixed 70px; it shrinks back with some slack so panning
  doesn't make it twitch. `ViewportState.priceAxisWidth` exposes the width to
  renderers and plugins.

- 14 new drawing tools (26 → 40), the next step toward
  advanced drawing-tool parity:

  - **Lines:** `infoLine` (trend line with a stats box: price change and %,
    bars and time spanned, angle), `trendAngle` (shows its angle in degrees),
    `crossLine` (horizontal + vertical line through one point, single click).
  - **Fibonacci:** `fibChannel` (A→B base, C sets the width; parallels at
    Fibonacci fractions), `fibSpeedResistanceFan` (rays through Fibonacci
    fractions of the move in both price and time).
  - **Pitchforks:** `schiffPitchfork` and `modifiedSchiffPitchfork` alongside
    Andrews' `pitchfork` (which gains a protected `origin()` hook the variants
    override).
  - **Patterns:** `xabcdPattern` (harmonic XABCD with XB / AC / BD / XD ratios),
    `abcdPattern` (BC/AB, CD/BC ratios), `headAndShoulders` (seven pivots with
    the neckline through both neck points).
  - **Shapes / measuring / cycles / annotation:** `circle`,
    `dateAndPriceRange` (price change, bars, time and volume traded in one box),
    `cyclicLines` (vertical lines repeating at the A→B interval), `priceLabel`
    (callout showing a point's price, or `style.text`).

  Measuring labels format prices at the precision of the instrument's price
  level (2 decimals for most, 4 for FX-range prices, significant digits for
  prices under 1) instead of a fixed 2 decimals.

  `ChartWidget` (and the demo) drawing toolbar is regrouped by tool family
  into Lines, Horizontal/Vertical, Channels, Fibonacci, Shapes,
  Gann & Pitchforks, Patterns (new), Measure, Annotation and Forecasting — which
  also exposes three tools that were registered but missing from the toolbar:
  Fib Time Zones, Anchored VWAP and Fixed Range Volume Profile.

  `ChartWidget`'s status bar no longer reads "Connecting..." forever when it
  shows static data without an adapter.

- 43b4ff5: Performance audit, round 2 — measured in a live browser profiler before and
  after each change.

  **Incremental indicators on live ticks (new API).** A live tick only changes
  the forming bar, but every tick re-ran every indicator over the whole
  history: ~30 ms per tick at 20k bars, ~150 ms at 100k, plus megabytes of
  garbage — a main-thread freeze on every websocket update. New optional
  `IndicatorPlugin.update(data, config, prev, from)` recomputes only bars from
  `from` onward; `IndicatorEngine.recalculateFrom(data, from)` uses it and
  falls back to `calculate()` when a plugin doesn't implement it or declines.
  Implemented for SMA, EMA, WMA, VWMA, Bollinger Bands, Envelope, RSI, MACD,
  ATR, OBV and Stochastic, each verified equal to a full recalculation across
  ticks, bar closes and multi-bar appends. Ticks, `appendBar(s)`, stream bar
  closes and replay steps now use it: a tick with 4 indicators at 100k bars
  went from ~96 ms to ~0.001 ms (`pnpm bench`). Note: outputs returned by
  `getIndicatorOutput()` are now updated in place on ticks rather than
  replaced. `IndicatorBase` gains `canResume()` / `writePoint()` helpers.

  **Price scale no longer jumps while live data streams in.** The live-tick
  render path fit the price range to candles only, while the pan/zoom path
  also included overlay indicators (Bollinger, Keltner, Ichimoku…) — so the
  scale snapped back and forth by several percent every second. Both now share
  one auto-scale routine.

  **Switching symbol/timeframe while scrolled into history fits the new data.**
  Auto-scale was computed before scrolling to the end, i.e. over the old
  window, leaving every bar of the new series off-screen.

  **New bars no longer yank you out of history.** `appendBar` and stream bar
  closes now follow the live edge only if the view is already there (as
  `appendBars` already did), and scroll after the viewport knows the new
  length.

  **Cheaper per-frame text.** `formatPrice` (axes, legend, crosshair pills,
  current-price tag, panel axes) and session-break date labels used
  `toLocaleString`/`toLocaleDateString`, which build a new `Intl` formatter on
  every call (~20–40 µs each). Formatters are now cached per locale/precision
  (~0.4 µs). Hover frames dropped from ~0.64 ms to ~0.23 ms.

  **Other fixes found along the way:** `SessionBreaks` rescanned every bar on
  every frame for series with no day boundary; `ATR` threw on series shorter
  than its period; stream bar closes didn't invalidate the display cache (so
  Heikin-Ashi etc. missed the new bar); `replayStart()` rendered the stale
  pre-replay series and stacked a new step listener on every restart.

## 1.1.1

## 1.1.0

## 1.0.3

## 1.0.2

## 1.0.1

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

## 0.15.0

### Minor Changes

- b06c803: Add `chart.connectExecution(adapter)` — wire an `ExecutionAdapter` into the chart to make the trading overlay live. The chart routes its emitted order/position intents (`orderPlace`, `orderModify`, `orderCancel`, `positionModify`, `positionClose`) into the adapter's commands, and renders the authoritative `orders` / `positions` the adapter emits back. The adapter is the single source of truth. `disconnectExecution()` and `getExecutionAdapter()` round out the API.

  - Failures — adapter-reported or a failed command — surface on a single new `executionError` chart event: `chart.on('executionError', (e) => …)`.
  - Fully backward-compatible: with no execution adapter connected, the intents remain plain events as before.
  - `OrderModifyIntent.previousPrice` is now optional, so the chart's `orderModify` event payload routes straight into an adapter.

  Pair with `PaperExecutionAdapter` for a zero-setup live trading sandbox.

- b06c803: Add the v1 extension contracts — the frozen foundation for a real trading surface and a plugin ecosystem.

  - **`ExecutionAdapter`** — a strategy interface (mirroring `DataAdapter`) that turns the display-only trading overlay into a trading surface. The chart routes its emitted order/position intents into the adapter; the adapter is the single source of truth and emits authoritative `orders` / `positions` back for the chart to render. Fully backward-compatible: with no adapter connected, intents remain plain events.
  - **`PaperExecutionAdapter`** — reference in-memory implementation: virtual fills, hedging-style positions, pending limit/stop triggering via `setMarkPrice`, and SL/TP auto-close. The safe sandbox for demos and tests.
  - **Plugin SDK** — `PluginManager` is now a real registry over four plugin kinds (`IndicatorPlugin`, `DrawingPlugin`, plus new `ChartTypePlugin` and `OverlayPlugin`), unified by a `ChartPlugin` union. Adds a global `registerPlugin()` (inherited by every chart created afterward), a constructor `plugins: []` option, and `chart.plugins.register/unregister/list`. The legacy `registerIndicator` still works.

  Also fixes `Chart.version`, which was hardcoded to a stale `0.7.0`; it is now injected from `package.json` at build time so it can never drift again.

### Patch Changes

- c79be24: Fix widget popups that could not be closed (Price Alerts panel, bracket bar). Their `display: flex` rule silently overrode the `hidden` attribute's `display: none`, so calling `el.hidden = true` left them on screen. Added a namespaced normalize rule that forces `hidden` to win for every `tcw-`-prefixed widget element, fixing the current cases and future-proofing the rest.

  Also fix the Price Alerts form overflowing the panel: its grid inputs/selects now get `width: 100%; min-width: 0; box-sizing: border-box` so they shrink to their column instead of spilling past the panel edge.

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

## 0.12.0

### Minor Changes

- f3072ed: feat: more indicators — Know Sure Thing, Elder Ray, Schaff Trend Cycle, Klinger Oscillator, Williams Alligator

  Know Sure Thing (KST)

  - New `kst` panel indicator (Martin Pring) — a momentum oscillator from four
    smoothed rates of change weighted 1:2:3:4 toward the longer cycles, plus an
    SMA signal line. KST crossing its signal (and the zero line) flags momentum
    shifts. Zero-centered, auto-scaled, fully configurable ROC/SMA/signal periods.
    Registered in the indicator menu; tested.

## 0.11.0

### Minor Changes

- a2279b6: feat: indicator expansion — Vortex, Choppiness, Ultimate Oscillator, Force Index, Connors RSI, Coppock, Chandelier Exit, Session VWAP bands

  Vortex Indicator (VI+ / VI−)

  - New `vortex` panel indicator plots VI+ and VI− from consecutive highs/lows
    normalised by true range (configurable `period`, default 14). VI+ crossing
    above VI− signals an up-trend (and vice-versa); a 1.0 reference line marks the
    pivot. Auto-scales to the visible range. Registered in the indicator menu;
    tested.

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

- 053ef97: feat: draggable price-alert lines

  - Grab an alert line on the chart and drag it to a new price — the cursor
    switches to a resize affordance on hover, and moving an alert re-arms a
    triggered one. Scale-aware (works in log / percentage / indexed modes).
  - New `AlertDragHandler` (core) wired into `InteractionManager`; hit-tested
    after trading/drawing so it only claims the gesture right on a line.
  - `AlertManager.getAlertAtPoint()` / `updateAlertPrice()` added; the chart
    emits a typed `alertUpdate` event on drag, and the alerts panel refreshes.

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
    background rectangles for a cleaner feel.
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
  - **Hover axis labels**: Pill badges follow the crosshair
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

## 0.8.2

## 0.8.1

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

## 0.7.1

### Patch Changes

- Fix: drawings drift after timeframe / symbol switch

  Drawings now store anchors as real timestamps instead of fragile bar indices,
  so they keep pointing at the same wall-clock time when the bar series changes
  (timeframe switch, symbol switch, etc.) — the behaviour traders expect.

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
