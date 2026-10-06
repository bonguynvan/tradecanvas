# @tradecanvas/vue

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
