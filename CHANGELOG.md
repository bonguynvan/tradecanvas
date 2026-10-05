# Changelog

## Unreleased

Collected on `main` for the next release. Not on npm yet.

### Indicators and languages: the rest of the gap

- **16 more indicators, 111 in all**: Average Price, Median Price and Typical Price; Moving Average Channel, Hamming, Double and Triple; Volatility Index (Wilder's stop and reverse on the average true range); Accumulative Swing Index, Advance/Decline, Majority Rule, Chop Zone, SMI Ergodic and Price Oscillator; Volatility O-H-L-C and Zero Trend Close-to-Close.
- **Correlation with another symbol**: Correlation Coefficient and Correlation Log (of returns), beside Compare and Spread/Ratio among the indicators that read a second symbol; the widget offers them when you compare with one.
- **Pivot Points in six kinds**: traditional (as before), Fibonacci, Woodie, classic, Camarilla and DeMark (`type`). Its name loses "(Classic)": its levels were the traditional ones all along.
- **MA Cross** takes a simple average against an exponential one (`type: 'sma-ema'`).
- **ChartWidget in 30 languages**: Italian, Dutch, Polish, Czech, Slovak, Hungarian, Romanian, Greek, Swedish, Danish, Norwegian Bokmål (also for `no` and `nn`), Estonian, Malay and Persian join the 16, Persian right to left.

### WebGL: back after a lost context, many charts, every browser

- **Back after a lost context**: when the browser hands a lost WebGL context back (after a GPU reset, say), the chart draws with WebGL again and says so: `rendererChange` with `{ renderer: 'webgl', reason: 'contextRestored' }`. Before, it stayed on Canvas 2D for good.
- **Many charts on a page**: Chrome and Safari keep about 16 WebGL contexts a page and drop the oldest past that, a live chart's or a map's, never to hand it back. At most 8 charts now draw with WebGL at once; one past that draws with Canvas 2D (`rendererChange` with `reason: 'limit'`) and takes WebGL as soon as another chart lets go of its context, as a chart whose context was lost does. `setMaxWebGLCharts(n)`, from the package, sets the limit (`Infinity` for none).
- **Every browser**: checked in Chrome, Firefox and WebKit (the engine of Safari): WebGL draws, loses and gets back its context, and keeps to the limit in all three, with the same pixels against Canvas 2D. Firefox no longer warns about the deprecated `WEBGL_debug_renderer_info`: the GPU's name comes from `RENDERER` where that gives one.
- **Baseline, Kagi and point & figure on the GPU** too. Their lines are drawn whole and round where they bend (baseline, Kagi) where they were drawn in pieces that left notches at each bend, and the two strokes of an X are drawn apart. Zoomed out on 200,000 bars at a pixel ratio of 2, a baseline chart takes 23.2 ms a frame instead of 27.6.
- **Point & figure boxes**: the chart drew every column in boxes of 1, whatever the box its columns were built with (1% of the average close unless set), so at a price of 30,000 a column was thousands of overlapping specks instead of a stack of Xs or Os. It draws them the size of the box now.

## 1.11.0 (2026-10-05)

### WebGL: the heatmap and profiles on the GPU

- **Under the bars, on the GPU**: with `renderer: 'webgl'`, the depth heatmap, the volume profile and the market profile draw with WebGL too, under the bars, with volume under a profile as in Canvas 2D. A market profile showing its stats readout or TPO letters stays with Canvas 2D: text can't go between the GPU's background and its bars. The 2D canvas under the GPU's is now only there for that, a watermark, or what the GPU can't take.
- **Faster**: panning on integrated graphics at a pixel ratio of 2, a depth heatmap of 240 snapshots by 80 levels takes 16.8 ms a frame instead of 25.5 (60 fps), and zoomed out on 1,000,000 bars with four indicators 16.7 instead of 34.5. Rectangles filled one by one, as heatmap cells are, are recorded straight to the GPU and drawn together.
- **Same pixels**: candles and volume land on the same device pixels with Canvas 2D and WebGL at any scaling. Bars exactly on half a device pixel (a round bar step such as 5.1 px at 200%) could land one pixel apart; rounding now turns up from a hair under the half on both.
- **Sharp volume candles**: wicks and bodies on whole device pixels, as candles are, the wick in the middle of a body as wide as the bar's volume.
- **Order books for older bars**: `chart.pushDepthSnapshot(book, time)` stamps a heatmap snapshot at `time`, to fill in books recorded earlier, oldest first; without `time` it takes the latest bar's, as before.
- **Feature Lab**: a liquidity heatmap scene, 240 order books of 80 levels each, with the Canvas 2D / WebGL switch.
- `pnpm bench:render` has two more scenes: zoomed out on 1,000,000 bars with four indicators, and a depth heatmap.

## 1.10.0 (2026-10-05)

Everything since 1.7.0 in one release (1.8.0 and 1.9.0 weren't published on their own).

### WebGL renderer (preview)

- **`renderer: 'webgl'`** draws the plot and indicator panes with WebGL 2, on a canvas under the 2D scene: the grid, session shading and break lines, candles and volume directly, and indicators, indicator panes, compare lines and most other chart types (line, area, bars, Heikin-Ashi, hollow candles, Renko, line break, range bars, HLC area, step line, line with markers, equivolume, high-low) through their Canvas 2D drawing, recorded as GPU strokes, fills and rectangles, antialiased at their edges as Canvas 2D is. Text, drawings, orders, axes and the crosshair stay on Canvas 2D. `'auto'` takes WebGL only on a hardware GPU; Canvas 2D stays the default.
- **Same look**: the GPU follows the 2D rules for whole device pixels and antialiased edges, so candles match Canvas 2D to within 2/255 at 100%, 125%, 150% and 200% scaling, and lines and fills differ only on a few edge pixels. Anything the GPU wouldn't draw the same (images, patterns, rotated or non-rectangular clips, sharp mitered corners, overlapping pieces of one path, shapes other than bands and areas) is left to Canvas 2D, in order, so the stacking doesn't change. Baseline, Kagi and point & figure charts stay on Canvas 2D for now.
- **Faster where it counts**: panning on integrated graphics at a pixel ratio of 2, 2,000 candles on a 1600×900 chart take 17.6 ms a frame instead of 23.3 (60 fps), 500 candles with four indicators 19.6 instead of 27.4, zoomed out on 200,000 bars with four indicators 20.2 instead of 34.5, six charts side by side 17.2 instead of 23.5, and a 2560×1400 chart with four indicators 29.1 instead of 114.5. At 150% scaling that chart pans at 60 fps (70.8 → 17.6 ms).
- **Safe to try**: `chart.setRenderer(mode)` switches at runtime and resolves to what draws, `chart.getRenderer()` says which, and `rendererChange` reports each change and why (`'unsupported'`, `'contextLost'`). Where WebGL 2 is missing, or its context is lost, the chart carries on with Canvas 2D; a failure to load or compile is logged as a warning. The WebGL code is a chunk of its own (about 17 KB gzipped), loaded on first use, and a destroyed chart hands its GPU context back at once. Screenshots include what the GPU drew.
- **Custom indicators come along**: a plugin's `render` draws on the recording context like on any other, and falls back to Canvas 2D by itself where it needs to. Its `render` may then run twice in a frame, so it should draw without side effects. Text it draws goes on the 2D canvas, over the lines of the indicators drawn with it.
- **Session break labels** now draw over the bars and indicators instead of under them, inside the plot, with Canvas 2D or WebGL. `SessionBreaks.render()` still draws lines and labels; `renderLines()` draws the lines alone.
- **Feature Lab**: the 200,000-bar scene has a Canvas 2D / WebGL switch, and times a short pan on each switch.
- `pnpm bench:render --renderer=webgl` (or `--renderer=auto`) measures the WebGL path.

### Faster when zoomed out

- **Faster when zoomed out**: once each bar takes less than a pixel, indicator lines, bands (Bollinger and the like) and histograms draw one span per pixel column instead of a stroke through thousands of points. Much the same look for a fraction of the raster work: zoomed out on 200,000 bars with Bollinger Bands, EMA, RSI and MACD, a frame went from about 54 ms to about 21 ms on integrated graphics (85 → 38 ms at 2x). Supertrend draws one line per colour instead of one stroke per bar.
- `pnpm bench:render` measures frames in headless Chrome on your own GPU, scene by scene.

### Sharper, calmer charts

- **Sharp at any screen scale**: candles, bars, volume and the drawings' horizontal and vertical lines land on whole device pixels. A one-pixel wick is one sharp pixel at 100%, 125% or 200% scaling; it used to spread over two at half strength.
- **Volume as a backdrop**: the bars keep to the bottom 15% of the chart (20% before) in the theme's own `volumeUp` / `volumeDown`, which were ignored. A theme that only changes the candle colours (or the widget's settings) gets volume in those colours. `volumeColor(candleColor)` gives the matching shade.
- **A calmer dark palette**: softer up and down colours and quieter axis labels.
- **Drawings**:
  - Fibonacci levels each come in their own colour with soft bands between them, and their labels sit above the lines. The drawing's colour goes to its trend line; each level's is set in its levels.
  - Drawing text uses the theme's font, on a halo of the background so it reads over bars.
  - Lines turn corners round.
  - Long/Short labels are tags just outside their zones that never overlap.
- **Price axis**: indicator value tags step around the last-price, high/low and order tags, and scale labels under any tag are hidden instead of showing half-covered.
- **Dates**: on an intraday chart a bar at midnight is labelled with its day on the time axis and the crosshair, not with its year as if it were a daily bar.
- **Lines on the pixel**: the crosshair, vertical lines and wicks share one device-pixel column, so a line drawn on a bar runs through its wick.
- **Widget**: the drawing tools sit in sections with a divider between them: lines; Fibonacci, Gann and cycles; patterns and Elliott waves; forecasting and measuring; shapes, brushes and notes. The tools below are grouped too: modes, undo and redo, clear all.
- **Looks different after the update**: the dark theme's colours, the volume's height, new Fibonacci drawings' colours and the order of the drawing tool groups change without any change of yours. Set `candleUp` / `candleDown` on the theme to keep the old candle colours.

### Fixes

- A position's stop-loss or take-profit priced outside the visible range no longer draws over the time axis or the panes below the chart, and can't be grabbed there by accident (nor can an order line off the plot); an entry scrolled out of view no longer leaves its price tag on the axis.
- The npm page shows the full README again (it had fallen behind the repository's), with screenshots; the demo's link previews now carry an image on every network.
- Panning by dragging no longer stops halfway with a "no drop" cursor: quick presses could leave text on the chart selected, and the next press then started the browser's own drag of it. The chart's text can't be selected now, and such drags are cancelled.

## 1.7.0 (2026-10-03)

Everything since 1.4.0 in one release (1.5.0 and 1.6.0 were never published): the drawing toolkit, trading and workspace, panes and undo, alerts and replay, scales and comparisons, the widget's look, and watchlists, symbol info, tick charts and access. Wrappers (`@tradecanvas/react` / `vue` / `svelte`) 1.0.10 pick up the new core.

The widget looks different after the update: Studio is the new default look (see *The widget's look* below); `ui: 'terminal'` is the closest to a square, ruled look.

### Workspace, markets and access

- **Watchlists**: several lists of symbols to switch between, create, rename and delete; add symbols from the search, remove them, drag them into order. Rows fill with live quotes from the feed (Binance sends them), from a quote source of yours, or from what you push.
- **Symbol info**: a panel with the symbol's price and move, whether its market is open and when that changes, the day's open, range and volume, its trading hours and news. The status bar shows when the market is closed.
- **Tick charts**: type `100T` for a bar per 100 trades, built from the feed's trades (Binance streams them).
- **Undo for settings**: Ctrl/Cmd+Z takes back settings and chart type changes too, with drawings and indicators; `recordUndo` adds changes of your own.
- **Zoom and scroll buttons** over the chart, shown while the mouse is on it.
- **For screen readers**: the chart says what it shows, what is on screen after the keys move it, and reads the bars one at a time (comma and period).
- **Arabic and Hebrew**, right to left: the widget in 16 languages.
- **Ten more indicators** (95 in all): Stochastic Momentum Index, Relative Volatility Index, Trend Strength Index, Linear Regression Slope, Standard Error and its bands, Guppy Multiple Moving Average, Moving Average Ribbon, Average Day Range and Net Volume.
- New events: the chart type, symbol or timeframe changed, the undo history changed, drawings were selected.
- A live bar that closes keeps its final values (it used to keep the ones before its last update).

### The widget's look

- **Three looks, and yours**: the widget's corners, sizes, type, borders, shadows and bars are a look apart from its colours. **Studio** is the new default (rounded controls, spaced groups, the interval buttons in a segmented track), **Terminal** is dense and square with capital labels, **Capsule** is all pills with the toolbar and drawing tools floating as islands. Start from one and change what you like with the `ui` option or `setUI`, on one chart or a whole grid.
- **The chart's price tags take the same corners**: square, rounded or pills, along with the axis and crosshair pills and the order badges (`chart.setShapes`).
- Every part of the widget follows the look's CSS variables; without `ui` they stay yours to set in CSS (the widget's stylesheet now goes first in the page, so your rules win a tie). Menus grow to fit their labels instead of wrapping them.
- **Looks different after the update**: Studio is the new default, so an existing widget changes look without any change of yours — slightly rounder corners, a taller toolbar, wider drawing tools, the interval buttons in a track, no rules between toolbar groups, labels as written rather than in capitals, rounded price tags. Use `ui: 'terminal'` for a square, ruled look, or set any token yourself.

### Scales, formats and comparisons

- **Price formats**: prices in your own format, or in fractions of a point (a bond in 32nds: `110'165`), on every label of the price scale — axis, crosshair, legend, tooltips, orders, alerts, drawings (`priceFormat`). Times your way too (`timeFormatter`).
- **Compare, spread and ratio**: another symbol on a price scale or pane of its own, or the spread or ratio to it, lined up with the chart by time; compare lines count in the auto scale and line up by time as well.
- **Percent panes**: a pane can read in percent of its first value on screen.
- **High-Low bars**, settings for Renko, Line Break, Kagi, Point & Figure and range bars, a hidden main series, lines at the visible high and low, and bid/ask lines.
- **Extended hours** on or off: bars outside a symbol's regular hours are kept aside while hidden.
- **Data export** with every indicator line in a column of its own (CSV or JSON); bars timed in seconds no longer export as 1970.
- **Replay across a grid**: replaying one chart takes the others along to the same time.

### Alerts, replay and panes

- **More kinds of alert**: a line crossing another line (the price and a moving average, MACD and its signal), a move of some percent within some bars, only on closed bars (no firing on a wick that comes back), and an expiry. All in the alerts panel and in `addAlert`'s options.
- **Replay in finer steps**: pick 5m under an hourly chart and watch each bar form, step by step (`replayStart({ steps })`).
- **Paper trading in a replay**: a paper account fills on the replayed prices (each step's high and low too), and its fills land on the replayed bars.
- **Alerts on a connected feed**: price alerts now check on every price a `connect()`ed feed sends, not only on `setCurrentPrice`.
- **Signal markers** say what they are when the pointer is on them, and report clicks (`signalMarkerHover`, `signalMarkerClick`).
- **Each pane can have its own logarithmic or inverted scale** (right-click the pane, or `setPaneScale`).

### Panes, templates and undo

- **Move an indicator to another pane** — into the pane above or below, a pane of its own, or back to the price pane — from the ⋯ button on its legend row, or `chart.moveIndicatorToPane`. The pane's other indicators stay, and those reading its lines follow it.
- **Fold, maximise and reorder panes** with buttons at each pane's top right (`setPaneCollapsed`, `setMaximizedPane`, `movePane`). Saved layouts keep each pane's size, order, fold and maximise.
- **Undo for indicators**: Ctrl/Cmd+Z takes back adding, removing, editing and moving indicators, in the same history as drawings. An indicator comes back under its own id, so alerts on its lines still match.
- **Indicator templates**: save the chart's indicators (inputs, style, levels, panes) under a name from the indicators menu and apply them in one go.
- **Type a number to change the interval** (`5`, `15m`, `1h`, `1D`, Enter), and **Alt+T / H / J / V / C / F** for the trend line, horizontal line and ray, vertical line, cross line and Fibonacci retracement.
- Prices offered by the chart's menus and the order ticket sit on the market's price grid (`chart.roundPrice`).

### Trading and workspace

- **Act on orders and positions from the chart**: × on an order line cancels it, × on a position closes it, ⇅ reverses it, × on a stop-loss or take-profit removes it. They raise the usual intents (a new `positionReverse` among them), so a connected adapter acts on them; an adapter without `reversePosition` gets a close and a market order the other way. Orders take a stop-loss, a take-profit and a time in force that carry over to the position. Adapter authors: `PositionModifyIntent.stopLoss` / `takeProfit` can now be `null`, meaning remove it (a missing field still means keep it).
- **Fills on the chart**: a mark on the bar of each fill, solid where it opened a position and hollow where it closed one. `executionFill` says why (order, close, reverse, stop-loss, take-profit) and the P&L realised.
- **Right-click menus that know where you clicked**: the plot, a pane, the price axis or the time axis, with the price and time there. A "+" by the price axis follows the crosshair. ChartWidget offers an alert, a buy and a sell at the price (a limit where it would wait, else a stop), an order ticket and a horizontal line on the plot, the scale switches on the price axis, and go to date on the time axis.
- **Order ticket and account panel** in ChartWidget: open positions with their P&L, working orders and the fills so far, each with close, reverse or cancel; an order ticket that checks the order as you fill it in and shows the reward:risk.
- **Named layouts**: save the chart under a name (symbol, interval, scale, chart type, indicators, drawings, alerts), open, rename, delete, auto-save the open one, Ctrl/Cmd+S. Kept in the browser, or on your server through a four-call `LayoutStorage`.
- **ChartWidgetGrid**: up to six charts side by side, linked by symbol, interval, crosshair, time or drawings as you choose, saved together as one layout.
- **Your own toolbar buttons and menu entries**: `widget.addToolbarButton()` and `chartMenuItems`.
- Fixed: `ChartGrid.connectAll` with one adapter object sent every chart the last symbol's bars (an adapter keeps one stream). It now takes a function that makes one per chart, as does `ChartWidgetGrid`'s `adapter` option.
- New events `ordersChange`, `positionsChange` and `stateChange`. With several widgets on a page, Ctrl/Cmd+K and +P now go to the one used last instead of all of them.

### Drawing toolkit

- **Each tool has its own settings**: Fibonacci levels (edit, hide, add, colour), prices and percentages, labels left or right, extending lines either way, backgrounds, a wave degree, an icon. Double-clicking a drawing in ChartWidget opens its settings (style, the tool's settings, its points in the chart's time zone); changes show as you make them and Cancel takes them back. "Save as default" keeps a tool's settings for the next drawing, and templates keep settings as well as style. API: `getDrawingOptions` / `setDrawingOptions`, `updateDrawing`, `beginDrawingEdit` / `endDrawingEdit`, `setDrawingToolDefaults`.
- **Long/Short Position works out the size** from the account and the risk (a percent or an amount): quantity, reward:risk, and each line's price, distance and profit or loss. The target's handle sets the ratio.
- **Alerts on drawings**: `addDrawingAlert(id, …)` fires when the price crosses a trend line, ray, horizontal line or a channel's lines where they are by then, as drawn on the chart (log scale included). The alert goes with its drawing and comes back with it on undo.
- **Order, groups and a right-click menu**: bring forward or send back (Ctrl+] / [), group drawings to select, hide and lock them together (Ctrl+G), and a menu on each drawing with settings, an alert, order, group, lock, hide, duplicate and delete. The object tree lists groups with their drawings.
- **29 new tools (69 in all)**: note, callout, flag, arrow mark and icons; brush, highlighter, path and polyline (a point per click, a double-click or Enter ends them), curve and arc; Fibonacci circles, spiral, speed resistance arcs and wedge, pitchfan, Gann square; Elliott impulse, correction, triangle and combination waves; three drives and cypher patterns; time cycles and sine line; forecast, projection and bars pattern.
- **An eraser, a zoom tool and a strong magnet**, in the API and the widget's sidebar. On a short screen the sidebar scrolls, and its menus open beside it and work from the keyboard.
- Fixed on the way: Anchored VWAP and Fixed Range Volume Profile drew nothing (they were never handed the bars); Ctrl+Shift+Z undid instead of redoing; dragging a drawing on a log scale bent it; drawing shortcuts fired inside dialogs.

### Data and time

- **Zoom out until every loaded bar fits.** Below the old 2 px bar + 2 px gap floor, the bar and its gap keep shrinking (down to a quarter pixel) as long as the loaded bars don't fit yet; a short series still stops at the old floor. Below a pixel per bar, candles, OHLC bars and volume merge per pixel column, so thousands of bars stay readable and cheap to draw. "All" and the 1Y / 5Y presets are no longer capped at about 200 bars.
- **Older bars load as you scroll back.** Adapters can implement `fetchHistoryBefore(symbol, timeframe, before, limit)`; Binance, Bybit and Mock do, and `WebSocketAdapter` / `PollingAdapter` take it as an option. A connected chart loads a page when less than a screen of bars is left of the view, one request at a time, keeping the same bars on screen; it backs off after failures, and a reconnect keeps the paged-in history. New `chart.prependBars()`, `setHistoryLoader()`, `loadMoreHistory()`, `hasMoreHistory()`, `isLoadingHistory()`, the `historyLoad` event and `StreamConfig.historyPageSize`. ChartWidget shows a small pill while older bars load.
- **Any interval.** `TimeFrame` takes any whole count of a unit (`'7m'`, `'90m'`, `'2d'`); `parseTimeframe` / `isTimeFrame` check one. Adapters list the timeframes their feed serves (`supportedTimeframes`), and the chart builds the others from the coarsest one that divides them: history, live bars and older pages alike (`ResamplingAdapter`, `withResampling`, `resampleBars`, `pickBaseTimeframe`). This also fixes Binance's 45m, 2d, 3M and other intervals it lacks, which used to fall back to 15m bars; a timeframe the feed cannot build is refused instead. `TimeFrame` now accepts any `${number}${unit}`: exhaustive switches over it should use `KnownTimeFrame`. ChartWidget's timeframe menu takes a typed interval (`7`, `90`, `2h`, `3D`), keeps it with a star and an × to remove it, and lists it in the command palette.
- **Time zones with daylight saving time**: `chart.setTimezone('America/New_York')` (or a fixed offset, or null for the browser's) and `ChartOptions.timeZone` set the zone for the time axis, crosshair, tooltip, day breaks, range presets and go-to-date. Day breaks used to follow the browser's zone whatever the chart showed. Session hours take a `timeZone` too. ChartWidget's settings list 28 zones by city with the offset in force. YTD now starts on the 1 January bar.
- **A left price scale**: an overlay can go on a scale of its own on the left (`addIndicator(…, { scale: 'left' })`, `setIndicatorScale`), fit to its values, so a volume-like line no longer squashes the candles; `setLeftPriceScaleVisible(true)` mirrors the price scale on both sides. ChartWidget has a switch in its settings and a choice in each overlay's Style tab.
- **Symbol search and symbol info**:
  - Adapters can implement `searchSymbols` and `resolveSymbol`. They return a symbol's name, exchange, price precision and step, exchange time zone and trading hours. Binance does.
  - A connected chart resolves its symbol by itself: prices take its precision, `setTimezone('exchange')` follows its exchange, and its hours feed the session shading.
  - ChartWidget's symbol search asks the feed as you type, with names and exchanges.
- **ChartWidget in 14 languages**: English, Vietnamese, Simplified and Traditional Chinese, Japanese, Korean, Spanish, Portuguese, French, German, Russian, Turkish, Indonesian and Thai. Every string the widget shows now goes through its translations; settings, drawing tools, alerts, dialogs and toasts used to stay English. Translations live in `@tradecanvas/chart/widget/locales` so a page loads only what it imports. Number formats for each language are in the settings.
- The replay bar sits above the time axis, so its dates stay readable.
- Pinch-zoom on touch screens follows the fingers: spreading them twice as far apart doubles the bar width. A pinch used to move the zoom by about a twentieth of that, so it seemed not to work. The chart also sets `touch-action: none` on its surface, so the page doesn't zoom instead.
- Dragging inside an indicator pane pans the chart. It used to zoom time as if the time axis had been dragged, and the whole pane showed the time-axis cursor.

### Indicators in depth

- **One scale per pane**: a pane's lines, levels, axis labels and crosshair share one value scale (RSI's 30 line used to read as 38). The price scale no longer stretches to fields that are not drawn.
- **Declared plots**: descriptors declare what they draw (`plots`), their pane `scale`, default `levels` and how `inputs` are edited; a custom indicator needs no rendering code.
- **Sources and indicators on indicators**: 38 indicators take a price source or another indicator's line (`indicatorSource(instanceId, key)`), e.g. an SMA of RSI in RSI's pane.
- **Shared panes**, **editable levels** and **value tags** on the axis, all kept in saved layouts.
- **15 new indicators (85 in all)**: DEMA, SMMA, ALMA, KAMA, LSMA, McGinley Dynamic, MA Cross, Williams Fractals, Chande Kroll Stop, Bollinger %B, Bollinger BandWidth, Momentum, Historical Volatility, Volume Oscillator, Ulcer Index.
- ChartWidget: an indicator settings dialog with Inputs, Style and Levels tabs; the legend colours each value as its line.

### Site and docs

- The site speaks 14 languages: the home page, menus and the Feature Lab, whose live charts switch to the same language. The docs and the README are in English, Vietnamese, Simplified Chinese, Japanese, Korean and Spanish; the other languages show the English docs with a note.
- Each language has its own address (`/ja/docs/api/`), with `hreflang` links and a sitemap covering every language.

### For AI coding tools

- `skills/tradecanvas`: an agent skill with entry points, rules, recipes and a generated indicator reference.
- `llms.txt` and `llms-full.txt` on the site; the indicator catalog on the docs site is generated from the registry, and CI checks that the generated files are current and that the skill's examples type-check.

## 1.4.0 (2026-10-02)

Layouts that come back whole, ranges and dates, scale options, indicators listed on the chart, an icon set and reworked bar replay. Wrappers (`@tradecanvas/react` / `vue` / `svelte`) 1.0.7 pick up the new core.

### Layouts, ranges and scales

- **Saved layouts restore indicators and alerts**: inputs, panes, colours, visibility; alerts keep their channel, repeat and label. Indicator changes trigger the auto-save.
- **Ranges and dates**: `setVisibleRangePreset('1D' … 'All')` and `goToTime()`; ChartWidget shows the presets under the chart with a go-to-date button (Alt+G).
- **Inverted price scale** (`setInvertScale`, Alt+I), and the log scale now applies to candles, axis and grid as well as drawings and indicators.
- **Timeframe favourites** in ChartWidget, and feature flags that used to do nothing now apply (`drawingMagnet`, `barCountdown`, `compareSymbols`, `dataExport`, `logScale`, `timeframes`).
- **Drawing**: stay-in-drawing mode, and Ctrl/⌘+C / Ctrl/⌘+V copy drawings, also between charts. ChartGrid links the crosshair by time.

### Indicators on the chart

- ChartWidget lists each indicator on the chart, under the OHLCV legend or at the top of its pane, with its value at the hovered bar and show/hide, settings and remove actions. Several instances of one indicator each get their own colour.

### Icons and tooltips

- Every drawing tool and chart type has its own icon; the interface icons share one grid. `createIcon`, `createToolIcon`, `createChartTypeIcon` and the icon maps are exported.
- Tooltips on the widget's controls replace the browser's.

### Replay

- Live data stays out of the replay and comes back with `replayStop()`; the replay ends paused on its last bar. ChartWidget asks for a start bar, offers a random bar, speeds in bars per second and "Back to realtime".

## 1.3.0 (2026-10-02)

Dragging that never sticks, a lighter two-canvas renderer, the TradeCanvas look by default, a redesigned gauge, crosshair tooltip and loader, and replay that follows its newest bar. Wrappers (`@tradecanvas/react` / `vue` / `svelte`) 1.0.6 pick up the new core.

### Dragging and panning

- **The press that selects a drawing also grabs it**: no second drag needed; locked drawings let the press pan the chart. Clicks that only select no longer move the drawing or add an undo step.
- **Drags are followed outside the chart** until the button is released (also axis scaling, pane resizing, drawings and trading lines); price drags are pinned to the plot's edge; a release outside the window is detected.
- **A sloppy horizontal drag keeps auto-scale on**: vertical panning needs a deliberate move (> 24 px and at least half the horizontal travel).
- **Momentum** is measured over the last 100 ms, ignored after a rest, capped and stopped by any new gesture.
- **Free panning** past the newest bar into empty future space, or past the oldest bar, down to `panLimits.minVisibleBars`; the time axis, grid, crosshair and drawings (magnet included) extend into the future. `freePan: false` keeps the old clamp. `setVisibleRange()` / `fitContent()` show exactly the requested range.
- **Context cursors**: crosshair, grabbing hand, hand over drawings, move over handles, resize arrows over axes, pane dividers and draggable lines.
- **Ctrl/⌘-drag selects drawings** in a box, Ctrl/⌘-click toggles one; the group moves, restyles and deletes together as one undo step.
- The right-click order menu is off by default (`features.tradingContextMenu: true` to opt in).

### Rendering

- **Two canvases instead of four**: a scene canvas and a thin top canvas for pointer-tied visuals. A hover repaints only the top canvas and the browser composites two surfaces instead of four. New `LayerType.Hover`.
- After the page or a scrolling container scrolls, the crosshair follows the pointer exactly (it used to stay offset until the next click).
- The price-axis tick label under the last-price tag is hidden instead of half-covered; Anchored VWAP caches its series.

### TradeCanvas look

- **Default palette**: `DARK_THEME` / `LIGHT_THEME`, indicators, orders, signal markers, drawing tools and the `ChartWidget` chrome share one palette — ink ground, mint/coral candles, amber accent. New `TC_PALETTE` and `TC_SERIES_COLORS`. Tests keep theme-neutral colours at 3:1 on both backgrounds and widget text at 4.5:1.
- Armed price alerts are blue, triggered ones amber; comparison lines no longer start with an orange that blends into the main line.
- **Gauge redesign**: a thin ring with rounded ends and zone gaps, bright up to the value and dimmed beyond it; a knob marks the value so the number is never crossed by a needle; the current zone's label shows above it; text fits small dials. `pointer: 'needle'` keeps the classic needle. New defaults: 240° sweep, `thickness` 0.14.

- **Crosshair tooltip redesign**: bar time and a change pill (vs the previous close), an aligned O/H/L/C grid with only the close coloured, and volume; the chart's precision (sub-cent prices no longer show `0.00`), locale, timezone and bar spacing; stays inside the plot. New `setLocale`, `setPricePrecision`, `setTimezoneOffset`, `CrosshairTooltipContext` and `formatTooltipTime`.
- **Loader redesign** (`ChartWidget`): a run of candles lit one after another over a sweeping accent line; the "Loading chart…" text is for screen readers only (shown under reduced motion and on failure).

### Replay

- **Replay follows the newest bar again**: the first step and every seek show the replay position; each new bar keeps the view at the latest bar while it rests there, and panning back into history pauses the follow.

### Site

- Redesigned demo and docs site with the new mark (a candle between code brackets), a dark terminal look with a designed light theme, and the library's default themes on every live chart.
- Landing page: smooth scrolling and scroll-driven reveals, count-ups and a parallax hero grid; charts keep the wheel for zooming; nothing moves under reduced motion.

## 1.2.0 (2026-10-01)

Advanced-charting parity and a performance pass measured in a live browser profiler. Wrappers (`@tradecanvas/react` / `vue` / `svelte`) 1.0.5 pick up the new core.

### Drawing tools — 26 → 40

- **New:** Info Line, Trend Angle, Cross Line, Fib Channel, Fib Speed Resistance Fan, Schiff and Modified Schiff Pitchforks, XABCD and ABCD patterns, Head and Shoulders, Circle, Date and Price Range (with volume traded), Cyclic Lines, Price Label. Earlier in this release: Horizontal Ray and Long/Short Position.
- **Widget toolbar regrouped by tool family** (Lines, Horizontal/Vertical, Channels, Fibonacci, Shapes, Gann & Pitchforks, Patterns, Measure, Annotation, Forecasting) — also surfaces Fib Time Zones, Anchored VWAP and Fixed Range Volume Profile, which were registered but missing from the toolbar.
- Measuring labels use a precision that fits the price level instead of a fixed 2 decimals.

### Indicators — 70

- **New:** VWMA, Envelope, TEMA, Weighted MA.
- **Incremental updates on live ticks** — new optional `IndicatorPlugin.update()`; built-ins recompute only the forming bar (a tick with 4 indicators at 100k bars: ~96 ms → ~0.001 ms).
- **`IndicatorValueMap`** — array-backed drop-in `Map` for indicator values; full recalculation on a symbol/timeframe switch is ~2.5–3.5× faster.

### Performance

- `Viewport.getState()` snapshots are cached instead of deep-cloned 8–10× per frame; indicator auto-scale scans only the visible range; `Intl` number/date formatters are cached (hover frames ~0.64 → ~0.23 ms).
- The price scale no longer jumps while live data streams in; new bars don't yank you out of history.

### Sub-cent prices

- Legend, crosshair pill and last-price tag follow the market's `pricePrecision` (or the axis's precision) in the configured `numberLocale` — PEPE-class prices no longer show "0.00".
- The price axis auto-widens to fit long labels instead of clipping them; ordinary prices keep the 70px default.

### Symbol / timeframe switching

- **Smooth loading** — fast switches swap in place with no flash; slow ones veil the previous chart with a loading card after 200 ms; failures say so and recover on retry.
- **Race-free** — superseded history responses are dropped (`StreamManager`, `ChartWidget`, `Chart.connect`); adapters detach every socket handler on disconnect.
- `setData` resets auto-scale so each switch fits the new data.

### Widget

- `locale` / `messages` i18n with built-in Vietnamese; `numberLocale` fixes; watchlist `refPrice` precedence.
- `widget.toggleReplay()` opens bar replay from code.
- The cursor-following OHLCV popup is off by default (the legend shows the same data); `chartOptions.features` no longer wipes the other feature defaults.

## 1.0.1 (2026-08-28)

Patch release for the core packages, plus the first public release of the framework wrappers.

### Fixes

- **`visibleRangeChange` now fires** — along with the sibling `priceRangeChange` and `zoomChange` events. All three were typed and documented but never emitted anywhere in `Chart`; they now fire on every pan, zoom, resize, and data update, but only when that slice of viewport state actually changed. `visibleRangeChange` payload is `{ from, to }` bar indices, `priceRangeChange` is `{ min, max }`, `zoomChange` is `{ barWidth }` CSS pixels per bar.
- **Sparse-series panning** — a chart whose loaded bars don't fill the pane (e.g. a Year view with a handful of candles) could not be panned at all; the offset was welded to a single value. The view still rests at the same right-aligned position by default, it's just no longer locked there. Dense series are unaffected.

### Framework wrappers

- **`@tradecanvas/react`, `@tradecanvas/vue`, and `@tradecanvas/svelte` are now public** (1.0.0) — thin reactive `<TradeCanvas>` components around `@tradecanvas/chart` with props for symbol / timeframe / theme / chart type / indicators / data / adapter / signal markers / trade zones, lifecycle cleanup, and access to the underlying `Chart` via `onReady` / ref / `bind:chart`. Pinned to `@tradecanvas/chart@^1`.

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

Major UX upgrade — pro-grade interaction across the board, with new
analytics depth and workflow features.

### Chart interaction

- **Axis-drag scaling**: drag the price axis vertically to compress / expand the price scale; drag the time axis to zoom. Double-click either axis to reset (auto-scale / fit-content).
- **Shift+drag measure ruler**: transient overlay showing bars × time × price Δ × % between two points. Tracks data through pan/zoom.
- **Alt+click pinned tooltip**: anchor an OHLC tooltip at a bar; the live crosshair tooltip then shows the price / % / bar-count delta to the pinned bar. `Esc` unpins.
- **Hover axis pills**: Price (right) + time (bottom) pill badges follow the crosshair with a triangular notch pointing at the line. Inverted theme colors so they always pop.
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
- **In-canvas axis polish**: price + time axes now render with subtle dividers, thin tick notches, and refined typography weight (dropped the heavy per-label background rectangles for a cleaner feel).

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

- **ChartWidget — built-in trading UI** — new `@tradecanvas/chart/widget` subpath export. One-line embed with complete toolbar, drawing sidebar, settings modal, and status bar. Zero framework dependencies, CSS scoped with `tcw-` prefix
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

- **Demo site** — Svelte 5 demo with a full trading UI (live chart, drawing sidebar, dropdowns, settings modal)
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
