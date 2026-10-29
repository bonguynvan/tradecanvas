# @tradecanvas/react

## 1.3.41

### Patch Changes

- Updated dependencies [5c96dc3]
  - @tradecanvas/chart@1.54.3

## 1.3.40

### Patch Changes

- @tradecanvas/chart@1.54.2

## 1.3.39

### Patch Changes

- Updated dependencies [656f663]
  - @tradecanvas/chart@1.54.1

## 1.3.38

### Patch Changes

- Updated dependencies [58ba934]
- Updated dependencies [bd09daf]
- Updated dependencies [2f662ea]
- Updated dependencies [4363ad6]
- Updated dependencies [8615681]
- Updated dependencies [9ea8298]
- Updated dependencies [e5cd6ea]
- Updated dependencies [2f6c431]
- Updated dependencies [b355fb9]
- Updated dependencies [0c75c8e]
- Updated dependencies [4363ad6]
- Updated dependencies [1cd314e]
- Updated dependencies [073c546]
- Updated dependencies [e88972b]
- Updated dependencies [243d105]
- Updated dependencies [ffa3154]
- Updated dependencies [e394049]
- Updated dependencies [4c475f7]
- Updated dependencies [e7fa6cf]
- Updated dependencies [e10507a]
- Updated dependencies [58aa1c8]
- Updated dependencies [d4ce838]
- Updated dependencies [be78a93]
- Updated dependencies [da8b971]
  - @tradecanvas/chart@1.54.0

## 1.3.37

### Patch Changes

- Updated dependencies [0073176]
  - @tradecanvas/chart@1.53.1

## 1.3.36

### Patch Changes

- Updated dependencies [5d0aa7c]
- Updated dependencies [0d4c66b]
- Updated dependencies [4e44074]
- Updated dependencies [9c18140]
  - @tradecanvas/chart@1.53.0

## 1.3.35

### Patch Changes

- eb38de1: **A bar already on the chart can be corrected.** `chart.updateBar(bar)` replaces the loaded bar with the same `time`, wherever it is in the series, and returns `true`. The indicators are computed again from that bar on, Heikin-Ashi, Renko and the other types built from the bars follow, and the view stays where it is, so a feed that learns a closed bar was off no longer needs `setData`, which scrolled to the newest bar, ended a replay and computed everything again. Several corrections before the next frame are computed once, from the earliest. It returns `false`, and changes nothing, when no loaded bar has that time (a new bar is still `appendBar`'s, older ones `prependBars`') or the chart can't take the bar. A correction is no live price: orders and alerts don't follow it and no alert fires on it; alerts on indicator lines aren't checked against the corrected values. A corrected last bar moves the price line, measured from the bar before it, and is where the next price's alert crossing counts from, as after `setData`. During a replay it corrects the live series, shown when the replay ends; a bar in the extended hours while they are hidden shows when they are shown. The bar loaded sent again computes nothing, also without volume or with a high under its close, so a feed that sends its last closed bars on every poll costs nothing for those that didn't change; a missing volume is 0, as with `setData`. The shown array is changed in place, as `updateLastBar` does, so an array you kept from `getData()` sees the new bar. With the WebGL renderer the corrected candle is drawn too.

  `dataUpdate` has a new kind, `{ kind: 'correction', time, index }`, sent after the indicators have the corrected bar (none for a hidden bar, during a replay, or for a bar sent again unchanged). In TypeScript, an exhaustive `switch` over `DataUpdatePayload` needs a `'correction'` case. The legend, the crosshair tooltip, the pinned tooltip, the widget's data window and your `crosshairMove` listeners show the corrected values while the pointer rests on that bar or the one after it. In ChartWidget, `widget.getChart().updateBar(bar)` corrects a connected feed's bars; bars given to the widget with `setData` are a copy it builds its timeframes from, so a correction to them lasts until the next timeframe switch (a widget method for these is to come).

  **A connected feed corrects a bar by sending it again, closed.** A closed bar (`{ bar, closed: true }`) older than the newest the stream has seen is now the feed's last word on that bar, a venue's final that came after the next bar's first frame or a revision, and goes in as `updateBar`; until now it was dropped. A feed that re-sends outdated closed bars would now apply them. A forming frame older than the newest is still left out, and no longer moves the price line, the orders' P&L or the alerts: a stale frame closing at 90 fired an alert at 95 while every bar stayed at 100. The built-in adapters made a tick from every bar frame's close, a late final's and a stale frame's too, so those moved the price as a live price would: `BinanceAdapter` and `WebSocketAdapter` (`BybitAdapter`, `KrakenAdapter` and your adapters built on it) now make one only from a frame of the newest bar, of those they have sent on the connection and the last of the history they served for its symbol and timeframe (a feed that sends its last closed bar again on subscribing made a tick from it after every reconnect), and none from that last bar sent closed at the close it was served at, until a frame of it comes forming, while its final at another close, the bar having been served still forming, makes one; `PollingAdapter` (`CoinbaseAdapter`) leaves out an answer older than one it already sent or than the last bar of the history it served, a slow request overtaken by the next or a cached page, and sends that last bar closed, with its final values, when the next bar started before the first poll. A `DataAdapter` of your own that makes ticks from its bars should leave older bars out too. On a timeframe built from a finer one, a corrected base bar builds its bar again for the last two built bars before the forming one (`KEPT_BUCKETS`); a correction further back, or to a bar whose base bars were never seen, is left out.

  With `aggregateTicks`, the history's last bar is now the one the trades build on: the first trade after connecting kept only itself, so the forming bar lost its open, high, low and volume. A reconnect (the page coming back, a retry, a heartbeat timeout) whose history ends on the bar before the forming one keeps the forming bar's trades; one whose history holds the forming bar takes the history's, which has the trades missed while away. Such a reconnect also set the price line, the orders' P&L and the alerts back to the history's last close, and the chart left out the forming bar until the next trade: with trades at 96 and the history ending at 100, an alert at 98 fired, and the next trade's crossing back over 98 didn't. The forming bar now stays on the chart and the price on its close, for a feed's own bars without `aggregateTicks` too. Its price tag keeps its colour: it showed a fall as a rise until the next trade, as it did whenever a feed sent a frame at an unchanged price (`CurrentPriceLine.setPrice` given no close to measure from keeps the one it has when the price is the same), and a bar you add with `appendBar` or `appendBars` is measured from the close before it, as a stream's new bar is, so one opening at the last close is level. A trade for a bar already past, delivered late, is left out, where it closed the forming bar early and started it again, and a closed bar for the bar before the forming one corrects it, the forming bar keeping its trades. A trade from after the newest bar starts goes in that bar even when the buckets start it earlier, as for a daily history stamped at another hour than the buckets' midnight (05:00 UTC, a browser's midnight five hours west) or a symbol whose zone comes after the first trade, so the price, the orders and the alerts follow every trade.

  `TickAggregator` and `StreamManager`, exported from `@tradecanvas/core` and `@tradecanvas/chart`, change with this. `TickAggregator` keeps the newest bar time it has seen: `processBar` sends a closed bar older than it as the new `correction` event (not `barClose`) and leaves out a forming one, and `processTick` leaves out a trade from before that bar starts and puts a later one whose bucket starts before it in that bar. `seed(time)` starts it from a history's last bar and doesn't move the newest back, unless the trades built the newer bar on buckets they no longer start on (the exchange's zone came after them, or a reconnect's history starts its 4h bars at the zone's midnight where the first connect had none), a bar it then lets go so that the next trades aren't left out as late until the next bucket; `resume(bar)` makes the history's last bar, still forming, the one the next trades build on unless it is older than the newest, and `reset()` and `setTimeframe()` forget the newest. `StreamManager` seeds it on every connect and switch, puts the bar it was building on top of a reconnect's `snapshot` whose history ends before that bar, with no `priceChange` for the history's last close, sends a correction as the new `barCorrection` event with no `priceChange`, and moves the previous close a price's change is measured from when the corrected bar is the last closed one. It sends `priceChange` at an unchanged price too when that previous close moved, as when a new bar opens at the last close, which is level with it. `GpuFrame` has an optional `seriesRevision`, which moves when a bar of the same array was replaced in place; a GPU renderer of your own that keeps the bars should write them all again then. The Anchored VWAP drawing kept its line by the array, its length and the last bar, so it drew the old line after a correction further back; it now follows the corrected bar. `DrawingPlugin.setDataGetter(getter, revision?)` hands a drawing tool of your own the same revision beside the bars, for what it keeps computed from them.

  The React, Vue and Svelte components take a change to one of the last three bars before the forming one (`CORRECTABLE_BARS`), its time the same, as a correction (`updateBar`), not a new series: the view stays. In Vue and Svelte that holds for a bar changed in place too, which the components didn't see before. A change further back is still a new series. `BarFeedHost` has an optional `updateBar`; without it, or when the chart refuses a correction, the bars are given as a new series, once.

- Updated dependencies [eb38de1]
- Updated dependencies [ba9aba9]
- Updated dependencies [6bdd5b8]
- Updated dependencies [7b01fb7]
- Updated dependencies [84a263b]
- Updated dependencies [5f656bf]
- Updated dependencies [41bbc39]
- Updated dependencies [d9920d2]
- Updated dependencies [26f9fc2]
- Updated dependencies [3b0b576]
- Updated dependencies [a2ad447]
- Updated dependencies [f7ac032]
  - @tradecanvas/chart@1.52.0

## 1.3.34

### Patch Changes

- Updated dependencies [9193d11]
- Updated dependencies [1a69ed4]
- Updated dependencies [3399aef]
- Updated dependencies [514b21c]
- Updated dependencies [ad385ed]
- Updated dependencies [51c0651]
- Updated dependencies [d4ca85b]
- Updated dependencies [dc82145]
  - @tradecanvas/chart@1.51.0

## 1.3.33

### Patch Changes

- Updated dependencies [0c72b8d]
  - @tradecanvas/chart@1.50.0

## 1.3.32

### Patch Changes

- Updated dependencies [9764d44]
  - @tradecanvas/chart@1.49.1

## 1.3.31

### Patch Changes

- Updated dependencies [b890f07]
  - @tradecanvas/chart@1.49.0

## 1.3.30

### Patch Changes

- 439834d: The components' `data` takes bars that go on from the last as live ticks, in React too: a new array with its last bar changed, or bars added after it (`setBars((bars) => [...bars, next])`), goes in through `updateLastBar` / `appendBar` / `appendBars`, so the view isn't reset, only the end is computed again, and alerts follow the price. React took each new array as a new series, the view back to the newest bar. Vue and Svelte take a new array the same way, as they took a push onto the same one; several bars pushed between two renders go in together, and the bar before a new one is no longer sent again when it is as it was. Any other bars are a new series: an older bar changed, bars taken away, a bar the chart can't take, and the next bars after a stream or the chart itself gave it bars of its own or after `data` was taken away. The chart gets plain copies of the bars' six fields, so frozen state is left alone. Ticks go on as a stream's do: a replay goes on, a price range the user dragged stays, and bars added together go in as `appendBars` takes them (the alerts check their last close). `feedBars(chart, bars, prev)`, the rule the three share, is exported from `@tradecanvas/chart`. `appendBars` keeps a view that `setAutoScroll(false)` stopped from following new bars, as `appendBar` does; it scrolled to them.
- Updated dependencies [439834d]
  - @tradecanvas/chart@1.48.0

## 1.3.29

### Patch Changes

- Updated dependencies [5f9b252]
  - @tradecanvas/chart@1.47.0

## 1.3.28

### Patch Changes

- 3fd2a36: The widget's `onReady` runs once the widget is built, in a microtask after `new ChartWidget()` returns, and gets the widget as well as its chart: `onReady: () => widget.openPanel('watchlist')` works (it threw, the widget's name not yet set). For code written to the old order: the statements right after the constructor now run before it (a `setData` there comes first; a variable `onReady` sets isn't set yet, so use `widget.getChart()`), a view shared in the URL is still put back after it, and an error it throws is reported as uncaught rather than by the constructor. It no longer runs for a widget destroyed first. A shared link cut short (`#tcw=` that isn't a URI component) is left alone instead of making the constructor throw. The docs say what agents had to read the compiled code for: the `watchlist` option is a panel of the dock that starts shut (`widget.openPanel('watchlist')`), a widget without `adapter` connects nowhere and shows the bars you give `setData`, `isFeatureOn` answers for one switch as set (with `replay: false`, `isFeatureOn('toolbar.replay')` is still `true`), `saveState` / `setAutoSave` / `loadState` / `loadStateFromStorage` say what a layout holds and when it is written, and the React component says which props follow their changes, what a new `data` array does, and what unmounting does.
- Updated dependencies [3fd2a36]
  - @tradecanvas/chart@1.46.0

## 1.3.27

### Patch Changes

- Updated dependencies [5afd866]
  - @tradecanvas/chart@1.45.0

## 1.3.26

### Patch Changes

- Updated dependencies [c4d41fa]
  - @tradecanvas/chart@1.44.0

## 1.3.25

### Patch Changes

- Updated dependencies [c05d85b]
  - @tradecanvas/chart@1.43.0

## 1.3.24

### Patch Changes

- Updated dependencies [b1b49f5]
  - @tradecanvas/chart@1.42.0

## 1.3.23

### Patch Changes

- Updated dependencies [59678e0]
  - @tradecanvas/chart@1.41.0

## 1.3.22

### Patch Changes

- Updated dependencies [ce7bc71]
  - @tradecanvas/chart@1.40.0

## 1.3.21

### Patch Changes

- Updated dependencies [fa57671]
  - @tradecanvas/chart@1.39.0

## 1.3.20

### Patch Changes

- Updated dependencies [126328a]
  - @tradecanvas/chart@1.38.0

## 1.3.19

### Patch Changes

- Updated dependencies [362b0b2]
  - @tradecanvas/chart@1.37.0

## 1.3.18

### Patch Changes

- Updated dependencies [53d2ff2]
  - @tradecanvas/chart@1.36.0

## 1.3.17

### Patch Changes

- Updated dependencies [1a49be6]
- Updated dependencies [30ad5b8]
  - @tradecanvas/chart@1.35.0

## 1.3.16

### Patch Changes

- Updated dependencies [9a3f221]
  - @tradecanvas/chart@1.34.0

## 1.3.15

### Patch Changes

- Updated dependencies [08724a2]
  - @tradecanvas/chart@1.33.0

## 1.3.14

### Patch Changes

- @tradecanvas/chart@1.32.0

## 1.3.13

### Patch Changes

- Updated dependencies [df2fcc9]
  - @tradecanvas/chart@1.31.0

## 1.3.12

### Patch Changes

- Updated dependencies [1fea5b8]
  - @tradecanvas/chart@1.30.0

## 1.3.11

### Patch Changes

- Updated dependencies [951d365]
  - @tradecanvas/chart@1.29.0

## 1.3.10

### Patch Changes

- 29acbdb: Lighter on phones: the chart draws at a pixel ratio of 2 at most (`maxPixelRatio`, `setMaxPixelRatio`) and follows a ratio change with the size unchanged; it stops drawing, and refitting on live ticks, off screen and on a hidden page (`pauseWhenHidden`, `suspend()` / `resume()` / `isSuspended()`), and draws before a screenshot; a live feed recalculates indicators once before the next read instead of on every tick (`IndicatorEngine.deferRecalculateFrom`); a stream silent too long reconnects when the page or the network comes back (`StreamManager.wake`), and a dropped connection schedules one retry, not two; destroyed charts give their canvas memory back at once; momentum keeps time on 120 Hz screens and stops for reduced motion. The widget skips its timers on a hidden page, keeps sheets above the on-screen keyboard, uses 16 px inputs on touch screens and dynamic viewport units. React no longer adds a crosshair listener on every render. Vue and Svelte feed a bar pushed onto the same array, or a change to its last bar, as a live tick instead of reloading the series (the view stays put); Vue no longer walks every bar, Svelte sees bars pushed onto `$state` data, and both pass plain bars.
- Updated dependencies [29acbdb]
  - @tradecanvas/chart@1.28.0

## 1.3.9

### Patch Changes

- Updated dependencies [49d0da6]
- Updated dependencies [e429018]
  - @tradecanvas/chart@1.27.0

## 1.3.8

### Patch Changes

- Updated dependencies [05c304f]
  - @tradecanvas/chart@1.26.0

## 1.3.7

### Patch Changes

- Updated dependencies [f7357c1]
  - @tradecanvas/chart@1.25.0

## 1.3.6

### Patch Changes

- Updated dependencies [caef172]
  - @tradecanvas/chart@1.24.0

## 1.3.5

### Patch Changes

- Updated dependencies [f020b7a]
  - @tradecanvas/chart@1.23.0

## 1.3.4

### Patch Changes

- Updated dependencies [e0886bf]
  - @tradecanvas/chart@1.22.0

## 1.3.3

### Patch Changes

- Updated dependencies [9e03ead]
  - @tradecanvas/chart@1.21.0

## 1.3.2

### Patch Changes

- Updated dependencies [db15f5e]
  - @tradecanvas/chart@1.20.0

## 1.3.1

### Patch Changes

- db48daa: Package metadata only; no change to the code.
- Updated dependencies [db48daa]
  - @tradecanvas/chart@1.19.1

## 1.3.0

### Minor Changes

- 36e43f8: An `options` prop: chart options the props don't cover (`maxBarSpacing`, `rightMargin`, `renderer`…), merged over the component's defaults at mount.

### Patch Changes

- Updated dependencies [16baf3a]
  - @tradecanvas/chart@1.19.0

## 1.2.6

### Patch Changes

- Updated dependencies [d163d46]
  - @tradecanvas/chart@1.18.1

## 1.2.5

### Patch Changes

- Updated dependencies [a77354c]
  - @tradecanvas/chart@1.18.0

## 1.2.4

### Patch Changes

- Updated dependencies [5fc5782]
  - @tradecanvas/chart@1.17.0

## 1.2.3

### Patch Changes

- Updated dependencies [53ef946]
  - @tradecanvas/chart@1.16.1

## 1.2.2

### Patch Changes

- Updated dependencies [16f3507]
  - @tradecanvas/chart@1.16.0

## 1.2.1

### Patch Changes

- Updated dependencies [ccc6b17]
  - @tradecanvas/chart@1.15.0

## 1.2.0

### Minor Changes

- becff24: Replay for apps. During `chart.replayStart()` signal markers and trade zones show as the replay reaches them (a trade drawn open until its exit; `revealMarks: false` shows them all). `startTime` starts at a time, `hideHistory` leaves the bars before the start out until `replayStop()`, and `duration` plays to the end in about that long however many bars: a replay quicker than a bar a frame runs on animation frames, several bars a frame, and a late frame slows it rather than skip ahead. New `replayComplete` event; `replayStep` gives the `total`. The widget's replay reveals them too (`replayRevealMarks: false` shows them all). The React, Vue and Svelte components take `indicators` as `{ id, params, position }` too (`syncIndicators` is exported), open no stream with `data` at mount or `stream={false}`, and follow `features` after mount.

### Patch Changes

- Updated dependencies [becff24]
  - @tradecanvas/chart@1.14.0

## 1.1.0

### Minor Changes

- 23c001e: Style overrides: any part of the chart's look by key, apart from the theme. `chart.applyOverrides({ 'grid.vertical.visible': false, 'series.candlestick.upColor': '#26a69a' })` styles the grid's lines each way, the crosshair, the axes, the panes, the legend, the last price, the volume, the session breaks and the main series as each of the 18 chart types draws it — 89 keys, listed in `CHART_STYLE_KEYS` and checked by TypeScript. Also `setOverrides`, `resetOverrides`, `getOverrides`, `getStyle`, `getStyleValue`, the `overrides` option and the `styleChange` event. Overrides come in two layers: the host's (kept through theme switches, never saved) and the user's (kept with the theme they were made on, saved with `saveState`, snapshot version 3). The widget's Settings write the user's layer. `ChartWidgetGrid.applyOverrides` styles every chart; the React, Vue and Svelte components take an `overrides` prop. Indicators: each plot's dash and visibility (`updateIndicatorStyle(id, { plots })`; a hidden plot stretches no scale), `setIndicatorDefaults(id, style)`, and a pane's own background and separator (`setPaneStyle`), saved with its indicator. The grid and crosshair options (`grid.hLineColor`, `crosshair.vLine.style`…) now work: they are shorthand for their keys. `getTheme()` returns the theme as set. Fixes: the widget's theme toggle brings back the host's own theme instead of a built-in one; the Settings' Reset puts back the current theme's colours instead of the dark theme's; a baseline chart's fills work with `rgb()` colours; a save naming a theme of its own no longer breaks the theme when loaded.

### Patch Changes

- Updated dependencies [23c001e]
- Updated dependencies [acd799c]
  - @tradecanvas/chart@1.13.0

## 1.0.15

### Patch Changes

- Updated dependencies [f84f4c5]
- Updated dependencies [f914d01]
  - @tradecanvas/chart@1.12.0

## 1.0.14

### Patch Changes

- Updated dependencies [0a3ad0f]
  - @tradecanvas/chart@1.11.0

## 1.0.13

### Patch Changes

- Updated dependencies [7924b5a]
  - @tradecanvas/chart@1.10.0

## 1.0.12

### Patch Changes

- Updated dependencies [6b396e7]
- Updated dependencies [bdab23b]
- Updated dependencies [5588767]
  - @tradecanvas/chart@1.9.0

## 1.0.11

### Patch Changes

- Updated dependencies [133bd38]
- Updated dependencies [6fceef2]
  - @tradecanvas/chart@1.8.0

## 1.0.10

### Patch Changes

- Updated dependencies [da9cb37]
- Updated dependencies [c063f30]
- Updated dependencies [e2516f1]
- Updated dependencies [6b9a936]
- Updated dependencies [e4fa579]
- Updated dependencies [b92e2fc]
- Updated dependencies [6d844ad]
  - @tradecanvas/chart@1.7.0

## 1.0.9

### Patch Changes

- Updated dependencies [f7a5202]
  - @tradecanvas/chart@1.6.0

## 1.0.8

### Patch Changes

- Updated dependencies [ad695c2]
  - @tradecanvas/chart@1.5.0

## 1.0.7

### Patch Changes

- Updated dependencies [75a9d23]
- Updated dependencies [173787a]
- Updated dependencies [0149807]
- Updated dependencies [debf905]
- Updated dependencies [378e945]
- Updated dependencies [7d0a743]
  - @tradecanvas/chart@1.4.0

## 1.0.6

### Patch Changes

- Updated dependencies [03c0581]
- Updated dependencies [a8b6e4f]
  - @tradecanvas/chart@1.3.0

## 1.0.5

### Patch Changes

- Updated dependencies [2b58ddf]
- Updated dependencies
- Updated dependencies [2846b8a]
- Updated dependencies [43b4ff5]
- Updated dependencies [2ccf273]
- Updated dependencies [021ea2e]
- Updated dependencies [6cf12af]
- Updated dependencies [edbdb56]
- Updated dependencies [1edf5a2]
- Updated dependencies [999f7fe]
  - @tradecanvas/chart@1.2.0

## 1.0.4

### Patch Changes

- Updated dependencies [24b1bed]
  - @tradecanvas/chart@1.1.1

## 1.0.3

### Patch Changes

- Updated dependencies [d2aecb0]
  - @tradecanvas/chart@1.1.0

## 1.0.2

### Patch Changes

- @tradecanvas/chart@1.0.3

## 1.0.1

### Patch Changes

- Updated dependencies [885485d]
  - @tradecanvas/chart@1.0.2

## 1.0.0

### Major Changes

- e433cc5: First public release of the framework wrapper components.

  `@tradecanvas/react`, `@tradecanvas/vue`, and `@tradecanvas/svelte` are no longer private — thin, reactive `<TradeCanvas>` components around `@tradecanvas/chart` with props for symbol / timeframe / theme / chart type / indicators / data / adapter / signal markers / trade zones, proper lifecycle cleanup, and access to the underlying `Chart` (for drawings, trading, execution adapters, plugins, resizable panes) via `onReady` / ref / `bind:chart`. Pinned to `@tradecanvas/chart@^1`.

### Patch Changes

- Updated dependencies [d0c938d]
  - @tradecanvas/chart@1.0.1

## 0.7.12

### Patch Changes

- Updated dependencies [96946ac]
  - @tradecanvas/chart@1.0.0

## 0.7.11

### Patch Changes

- Updated dependencies [1b346bd]
- Updated dependencies [b06c803]
- Updated dependencies [9a4cc2b]
- Updated dependencies [b06c803]
- Updated dependencies [b06c803]
- Updated dependencies [c79be24]
- Updated dependencies [b06c803]
- Updated dependencies [e9ca1a0]
- Updated dependencies [3930b56]
- Updated dependencies [09dc432]
  - @tradecanvas/chart@0.15.0

## 0.7.10

### Patch Changes

- Updated dependencies [69b45d8]
- Updated dependencies [794b707]
- Updated dependencies [54cf6fd]
- Updated dependencies [132e170]
  - @tradecanvas/chart@0.14.0

## 0.7.9

### Patch Changes

- Updated dependencies [d904d59]
- Updated dependencies [5fe7fbf]
  - @tradecanvas/chart@0.13.0

## 0.7.8

### Patch Changes

- Updated dependencies [ff9b8a5]
- Updated dependencies [18fdff3]
- Updated dependencies [314b98c]
- Updated dependencies [f3072ed]
- Updated dependencies [888dfac]
  - @tradecanvas/chart@0.12.0

## 0.7.7

### Patch Changes

- Updated dependencies [db5a55e]
- Updated dependencies [4a50854]
- Updated dependencies [13dad45]
- Updated dependencies [af69e8b]
- Updated dependencies [ecf0ba4]
- Updated dependencies [a509df3]
- Updated dependencies [a2279b6]
  - @tradecanvas/chart@0.11.0

## 0.7.6

### Patch Changes

- Updated dependencies [9c4613f]
- Updated dependencies [6646fa0]
- Updated dependencies [51b6552]
- Updated dependencies [ae46413]
- Updated dependencies [09e74f3]
- Updated dependencies [6c5a4c4]
- Updated dependencies [0123a7f]
- Updated dependencies [9815242]
- Updated dependencies [053ef97]
- Updated dependencies [d7d777f]
- Updated dependencies [1370f1a]
- Updated dependencies [c97c785]
- Updated dependencies [358e636]
- Updated dependencies [e3e7641]
- Updated dependencies [1d2b9bc]
- Updated dependencies [7991e7c]
- Updated dependencies [a313aaa]
- Updated dependencies [1022caf]
- Updated dependencies [0f5ea5c]
- Updated dependencies [17cfd53]
- Updated dependencies [a160c43]
- Updated dependencies [e1a0b47]
- Updated dependencies [5994fe4]
- Updated dependencies [a160c43]
- Updated dependencies [3ee8efb]
- Updated dependencies [bf54565]
- Updated dependencies [226e12c]
- Updated dependencies [dcacc5b]
- Updated dependencies [16ecd48]
- Updated dependencies [a3de054]
- Updated dependencies [de4457c]
- Updated dependencies [5e9ab8c]
- Updated dependencies [a160c43]
- Updated dependencies [8f69419]
- Updated dependencies [d9b3ed8]
  - @tradecanvas/chart@0.10.0

## 0.7.5

### Patch Changes

- Updated dependencies
  - @tradecanvas/chart@0.9.0

## 0.7.4

### Patch Changes

- @tradecanvas/chart@0.8.2

## 0.7.3

### Patch Changes

- Updated dependencies
  - @tradecanvas/chart@0.8.1

## 0.7.2

### Patch Changes

- Updated dependencies [1a9fce1]
  - @tradecanvas/chart@0.8.0

## 0.7.1

### Patch Changes

- Updated dependencies
  - @tradecanvas/chart@0.7.1
