---
name: tradecanvas
description: Build trading and financial charts with TradeCanvas (@tradecanvas/chart) — candlesticks and 17 other chart types, 111 indicators, drawing tools, live exchange data, orders and positions on the chart, signals and trade zones, alerts, replay, a full trading widget. Use when a project imports @tradecanvas/*, or when asked to add a price, candlestick or trading chart to a web app (vanilla TS/JS, React, Vue, Svelte).
---

# TradeCanvas

TradeCanvas draws trading charts in TypeScript, with no runtime dependencies:
on Canvas 2D by default, or with the series, indicators and panes on WebGL 2
(`renderer: 'webgl'`, or `'auto'` where the GPU is a real one). One package,
`@tradecanvas/chart`, holds both the chart engine and a complete trading UI
around it.

## Pick the entry point

| You need | Use |
|---|---|
| A full trading UI: toolbar, drawing sidebar, indicator legend, settings, status bar | `ChartWidget` from `@tradecanvas/chart/widget` |
| A chart inside your own UI | `Chart` from `@tradecanvas/chart` |
| React, Vue or Svelte components | `@tradecanvas/react`, `@tradecanvas/vue`, `@tradecanvas/svelte` |
| Strategy backtests and risk metrics | `@tradecanvas/analytics` |

`widget.getChart()` returns the `Chart` inside a widget, so everything below
also works on a widget.

## Rules that avoid most bugs

1. **Give the container a size** (width and height) before creating the chart.
   The chart follows later size changes by itself.
2. **Browser only.** In SSR frameworks (Next, Nuxt, SvelteKit) create the chart
   in `useEffect` / `onMounted` / `onMount`, importing it there with
   `await import('@tradecanvas/chart')` if the module is also loaded on the server.
3. **Call `destroy()`** when the element goes away (component unmount).
4. **Bars** are `{ time, open, high, low, close, volume }`, ascending by time.
   `time` may be milliseconds or seconds (values up to 1e12 are read as seconds).
   Keep one unit per series.
5. **Indicator ids are short** — `'rsi'`, `'bb'`, `'psar'`, `'stochastic'` — see
   [references/indicators.md](references/indicators.md). `addIndicator` returns
   an instance id (`null` if the feature or id is turned off); later calls take
   that instance id, not the indicator id.
6. **Live updates:** `appendBar` for a new bar, `updateLastBar` for the forming
   one. Never `setData` on every tick: it resets the view and recomputes
   everything.
7. Read values with `chart.getIndicatorOutput(instanceId)?.series[i]` (an object
   keyed by the indicator's line keys), not by guessing from the drawing.

## Quick start: the widget with live data

```ts
import { ChartWidget } from '@tradecanvas/chart/widget';
import { BinanceAdapter } from '@tradecanvas/chart';

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  locale: 'en', // 'vi' too; 28 more from '@tradecanvas/chart/widget/locales' (`messages`)
  onReady: (chart) => {
    chart.addIndicator('ema', { period: 50 });
    chart.addIndicator('rsi', { period: 14 });
  },
});

// Later, when the page goes away:
widget.destroy();
```

## Quick start: a chart with your own data

```ts
import { Chart, type OHLCBar } from '@tradecanvas/chart';

const chart = new Chart(document.getElementById('chart')!, {
  chartType: 'candlestick',
  theme: 'dark',
  features: { indicators: true, drawings: true, volume: true },
});

const bars: OHLCBar[] = await fetch('/api/bars?symbol=AAPL&tf=1d').then((r) => r.json());
chart.setData(bars);

// A new bar opens, then the forming bar ticks:
const last = bars[bars.length - 1];
chart.appendBar({ time: last.time + 86_400_000, open: last.close, high: last.close, low: last.close, close: last.close, volume: 0 });
chart.updateLastBar({ ...chart.getData()[chart.getData().length - 1], close: last.close + 1.25 });
```

For a live feed, give the chart an adapter instead and it handles history,
streaming and reconnects: `chart.connect({ adapter, symbol, timeframe })`.
Built-in adapters: `BinanceAdapter`, `CoinbaseAdapter`, `BybitAdapter`,
`KrakenAdapter`, `MockAdapter` (random data for demos), and two bases for your
own feeds — `WebSocketAdapter` and `PollingAdapter` (see
[references/recipes.md](references/recipes.md)).

## Indicators

```ts
import { Chart, indicatorSource } from '@tradecanvas/chart';

declare const chart: Chart;

const ema = chart.addIndicator('ema', { period: 21 })!;              // on the price pane
const rsi = chart.addIndicator('rsi', { period: 14 }, 'bottom')!;    // a pane of its own

chart.updateIndicator(ema, { period: 34 });          // change inputs
chart.updateIndicator(ema, { source: 'hlc3' });      // compute from another price
chart.setIndicatorLevels(rsi, [20, 50, 80]);         // RSI's reference lines (null = defaults)
chart.updateIndicatorStyle(rsi, { colors: ['#f2a93b'], lineWidths: [2] });
chart.setIndicatorVisible(ema, false);

// An indicator on another indicator's line: an SMA of RSI is drawn in RSI's pane.
const smoothed = chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') });

// Values at the latest bar, by line key:
const series = chart.getIndicatorOutput(rsi)?.series ?? [];
const latestRsi = series[series.length - 1]?.value;

chart.removeIndicator(rsi); // also removes `smoothed`, which reads from it
```

- Panel indicators may share a pane: `addIndicator('stochastic', {}, 'bottom', { pane: rsi })`.
- Each line's latest value is tagged on its axis; turn that off with
  `features.indicatorValueLabels: false`.
- Custom indicators: extend `IndicatorBase`, declare `plots`, and register with
  `chart.registerIndicator(...)` — see [references/recipes.md](references/recipes.md).

## Drawings, alerts and orders

```ts
import type { Chart } from '@tradecanvas/chart';

declare const chart: Chart;
declare const t1: number, t2: number; // bar times

chart.setDrawingTool('fibRetracement'); // the user clicks the points; null cancels
const line = chart.addDrawing({
  type: 'trendLine',
  anchors: [{ time: t1, price: 61_800 }, { time: t2, price: 63_400 }],
  options: { extendRight: true },        // each tool's own settings: chart.getDrawingOptionDefs(type)
});
if (line && chart.canAddDrawingAlert(line)) chart.addDrawingAlert(line, { condition: 'crossingDown' });
chart.addAlert(65_000, 'crossingUp', 'BTC above 65k');
chart.setPositions([{ id: 'p1', side: 'buy', entryPrice: 62_500, quantity: 0.5, stopLoss: 61_000, takeProfit: 66_000 }]);
chart.on('positionModify', (e) => console.log('stop or target dragged', e.payload));
```

69 drawing tools; each keeps its own settings (`setDrawingOptions`, `updateDrawing`),
and drawings can be grouped (`groupDrawings`), reordered (`moveDrawing`) and erased
(`setEraserMode`). `riskReward` is a Long/Short position sized from `accountSize` and `risk`.

## Signals, trades and replay

```ts
import type { Chart } from '@tradecanvas/chart';

declare const chart: Chart;
declare const t1: number, t2: number; // bar times

chart.setSignalMarkers([{ id: 's1', time: t1, price: 62_000, direction: 'long', confidence: 0.8, source: 'my-strategy' }]);
chart.setTradeZones([{ id: 'z1', direction: 'long', entryTime: t1, entryPrice: 62_000, exitTime: t2, exitPrice: 63_500 }]);

// Replay from a time, only the replayed bars on the chart, the whole run in about 3.5 s.
// Markers and zones appear as the replay reaches them.
chart.replayStart({ startTime: t1, hideHistory: true, duration: 3500 });
chart.on('replayComplete', () => chart.replayStop());   // every bar and mark back
```

`replayPause`, `replayResume`, `replaySeekToTime` and `replaySeekToBar` steer it;
`revealMarks: false` shows every mark from the start.

## Saving layouts

```ts
import type { Chart } from '@tradecanvas/chart';

declare const chart: Chart;

const json = chart.saveState();           // chart type, theme, drawings, indicators, alerts
if (json) localStorage.setItem('layout', json);
chart.loadState(localStorage.getItem('layout') ?? '{}');
chart.setAutoSave('layout', 1500);        // or keep it saved as it changes
```

Saved indicators keep their inputs, sources, panes, colours, visibility and levels.

## Events

`chart.on(event, (e) => …)` — the payload is `e.payload`.

| Event | Payload |
|---|---|
| `crosshairMove` | `{ point, bar, barIndex }` (also over indicator panes) |
| `crosshairLeave` | — |
| `barClick` | `{ bar, barIndex, point }` |
| `visibleRangeChange` | `{ from, to }` bar indices |
| `dataUpdate` | the series |
| `indicatorAdd` / `indicatorRemove` | `{ instanceId, id }` |
| `indicatorChange` | `{ instanceId, change }`: `'visible' \| 'style' \| 'levels' \| 'params' \| 'pane'` |
| `indicatorUpdate` | `{ from }`: values recomputed from that bar on (once per update) |
| `drawingCreate` | `{ id, type, drawing }` (also when an undo brings a drawing back) |
| `drawingUpdate`, `drawingRemove`, `drawingDoubleClick` | `{ id }` |
| `drawingContextMenu` | `{ id, x, y }`: a drawing was right-clicked |
| `toolModeChange` | `{ eraser }` or `{ zoomArea }` |
| `orderModify`, `positionModify` | the object |
| `replayStep` | `{ barIndex, time, until, total }`: a replay step |
| `replayState` | `{ state }`: `'playing' \| 'paused' \| 'stopped'` |
| `replayComplete` | `{ barIndex, time }`: the replay reached its last bar |
| `styleChange` | `{ layer }`: `'host'` or `'user'` overrides changed |
| `rendererChange` | `{ renderer, reason? }`: WebGL fell back to Canvas 2D, or came back |

## Theming

`theme: 'dark' | 'light'` or a `Theme` object (`{ ...DARK_THEME, candleUp: '#1fa874' }`);
`chart.setTheme(...)` at runtime. Numbers follow `numberLocale` (`'en-US'`, `'vi-VN'` …).

One part of the look apart from the theme: `chart.applyOverrides({ 'grid.vertical.visible': false,
'series.candlestick.upColor': '#26a69a' })` (keys in `CHART_STYLE_KEYS`, `null` takes one away;
`overrides` in the options and the React/Vue/Svelte props). `getTheme()` is the theme as set; what
is drawn reads back from `getStyleValue(key)`. Orders, positions, signal markers, trade zones and
drawing handles take keys too (`trading.buyColor`, `markers.longColor`, `tradeZones.activeColor`,
`drawings.handleColor`). Each indicator plot's dash and visibility:
`updateIndicatorStyle(id, { plots: { signal: { lineStyle: 'dashed' } } })`. The widget's Settings
edit these keys on the user's layer: the Style tab the chart's parts and the colours of the chart
type on view, the Trading tab the orders', markers' and zones' colours (Auto until one is picked).

The widget's parts: `features: { 'toolbar.replay': false, hotkeys: false }` and
`widget.setFeatures(patch)` at runtime (names in `WIDGET_FEATURES`; no dot = a whole capability
everywhere, dotted = one place). They hide the widget's UI only; to stop drawing, trading or zoom
on the chart, use `chartOptions.features`. Your own parts: `addToolbarButton`,
`addToolbarDropdown`, `addSidebarButton`, `addStatusBarItem`, `getSlot('chart')`, `addHotkey`, and
the `chartMenuItems` / `drawingMenuItems` / `indicatorMenuItems` options. Style the widget with your
own CSS through `--tcw-*` variables and `[data-tcw-part~="name"]` (stable through 1.x).

## When something looks wrong

| Symptom | Check |
|---|---|
| Blank chart | The container has no height (check its computed size) |
| Garbled candles, wrong dates on the axis | Bars not ascending by time: `setData` does not sort them |
| Dates in 1970 | `time` in seconds treated as ms (or the reverse) mixed in one series |
| `addIndicator` returns `null` | `features.indicators` is off, or `features.indicatorIds` leaves it out |
| Indicator line missing at the start | Warm-up: no value until its period has enough bars |
| Chart stutters on a fast feed | `setData` called per tick instead of `updateLastBar` / `appendBar` |
| A React/Vue/Svelte chart shows Binance bars before yours | Pass `data` at mount, or `stream={false}` |

## References

- [references/indicators.md](references/indicators.md) — every built-in indicator: id, default params, lines, levels, source support (generated from the code).
- [references/recipes.md](references/recipes.md) — worked examples: custom data feeds, frameworks, indicators on indicators, a custom indicator, multi-chart layouts.
- Docs site: https://bonguynvan.github.io/tradecanvas/ · API: https://bonguynvan.github.io/tradecanvas/docs/api
