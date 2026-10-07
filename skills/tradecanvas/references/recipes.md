# TradeCanvas recipes

Worked examples. Every `ts` block here is type-checked against the library in
CI (`pnpm docs:check`), so the calls are real.

## Your own data feed over REST

`PollingAdapter` turns any "give me the last N bars" endpoint into a live feed:
it loads history, polls, updates the forming bar and closes it on rollover.

```ts
import { Chart, PollingAdapter, type OHLCBar, type TimeFrame } from '@tradecanvas/chart';

const feed = new PollingAdapter({
  name: 'my-api',
  intervalMs: 5_000,
  fetchBars: async (symbol: string, timeframe: TimeFrame, limit: number): Promise<OHLCBar[]> => {
    const res = await fetch(`/api/candles?symbol=${symbol}&tf=${timeframe}&limit=${limit}`);
    const rows: [number, number, number, number, number, number][] = await res.json();
    return rows.map(([time, open, high, low, close, volume]) => ({ time, open, high, low, close, volume }));
  },
});

const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' });
await chart.connect({ adapter: feed, symbol: 'AAPL', timeframe: '1h', historyLimit: 500 });
```

## Your own data feed over WebSocket

`WebSocketAdapter` handles connecting, reconnecting and the history request;
you describe the URL, the subscribe message and how to read a frame.

```ts
import { Chart, WebSocketAdapter, type OHLCBar } from '@tradecanvas/chart';

interface KlineFrame { t: number; o: string; h: string; l: string; c: string; v: string; final: boolean }

const feed = new WebSocketAdapter({
  name: 'my-exchange',
  wsUrl: () => 'wss://stream.example.com/ws',
  subscribeMessage: ({ symbol, timeframe }) => ({ op: 'subscribe', channel: `kline.${timeframe}.${symbol}` }),
  fetchHistory: async (symbol, timeframe, limit): Promise<OHLCBar[]> => {
    const res = await fetch(`https://api.example.com/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`);
    return res.json();
  },
  parseMessage: (raw) => {
    const k = (raw as { kline?: KlineFrame }).kline;
    if (!k) return null;
    const bar = { time: k.t, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v };
    return { bar, closed: k.final };
  },
});

const chart = new Chart(document.getElementById('chart')!, {});
await chart.connect({ adapter: feed, symbol: 'BTCUSDT', timeframe: '1m' });
```

A feed that learns the symbol's details only after connecting (its decimals,
price step or hours, say on its first message) sends a `symbolInfo` event with
the `SymbolInfo`, as it sends its other events (`emitEvent('symbolInfo', info)`
in a subclass of these adapters). The chart applies it: the price scale,
legend and tags take the symbol's decimals, the scale's ticks its price step.

## React, Vue, Svelte

The wrapper packages give a component with reactive props:

```tsx
import { TradeCanvas } from '@tradecanvas/react';
import { BinanceAdapter } from '@tradecanvas/chart';

const adapter = new BinanceAdapter();

export function PriceChart({ symbol }: { symbol: string }) {
  return (
    <TradeCanvas
      symbol={symbol}
      timeframe="15m"
      adapter={adapter}
      indicators={['rsi', { id: 'ema', params: { period: 50 } }]}
      onReady={(chart) => chart.setIndicatorValueLabelsVisible(true)}
      style={{ height: 480 }}
    />
  );
}
```

`indicators` takes ids or `{ id, params, position }`; one whose inputs change
is put back with them. With `data` at mount the component shows your bars and
opens no stream; `stream={false}` never opens one (and closes one it had), so a
chart mounted before its bars arrive doesn't start the default Binance feed.
`features` follows its changes after mount.

`@tradecanvas/vue` and `@tradecanvas/svelte` take the same data props (Vue
emits `ready` and `crosshairMove` instead of the callback props). To drive the
widget or a bare `Chart` from a framework, create it in the mount hook on a
sized element and call `destroy()` in the unmount hook.

## A signal from an indicator on an indicator

An SMA of RSI, drawn in RSI's pane, and a signal when RSI closes above it.
It looks at the two last *closed* bars (the forming one still moves) and fires
once per bar:

```ts
import { Chart, BinanceAdapter, indicatorSource } from '@tradecanvas/chart';

const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' });
await chart.connect({ adapter: new BinanceAdapter(), symbol: 'ETHUSDT', timeframe: '15m' });

const rsi = chart.addIndicator('rsi', { period: 14 })!;
const signal = chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') })!;

let lastSignalBar = -1;
chart.on('indicatorUpdate', () => {
  const r = chart.getIndicatorOutput(rsi)?.series ?? [];
  const s = chart.getIndicatorOutput(signal)?.series ?? [];
  const i = r.length - 2; // the bar that closed last
  if (i <= lastSignalBar) return;
  const [r0, r1, s0, s1] = [r[i - 1]?.value, r[i]?.value, s[i - 1]?.value, s[i]?.value];
  if (r0 === undefined || r1 === undefined || s0 === undefined || s1 === undefined) return;
  if (r0 <= s0 && r1 > s1) {
    lastSignalBar = i;
    console.log('RSI closed above its average');
  }
});
```

## A backtest replayed on the chart

```ts
import { Chart, type OHLCBar, type SignalMarker, type TradeZone } from '@tradecanvas/chart';

declare const bars: OHLCBar[];            // the whole lookback
declare const signals: SignalMarker[];    // the backtest's buys and sells
declare const trades: TradeZone[];        // and its trades

const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' });
chart.setData(bars);
chart.setSignalMarkers(signals);
chart.setTradeZones(trades);

// Sweep the last 30 days in about 3.5 s: only those bars on the chart, each
// mark appearing as the replay reaches it, each trade open until its exit.
const DAY = 86_400_000;
chart.replayStart({ startTime: bars[bars.length - 1].time - 30 * DAY, hideHistory: true, duration: 3500 });
chart.on('replayStep', (e) => console.log(`${e.payload.barIndex + 1} / ${e.payload.total}`));
chart.on('replayComplete', () => chart.replayStop());   // the whole series, every mark
```

`revealMarks: false` shows every mark through the replay. `duration` plays
several bars a frame when it must; a frame that comes late slows the replay
rather than skip ahead. The bars before `startTime` come back with
`replayStop()`.

## Alerts beyond a price level

A line crossing another line, a fast move, a close past a level, and an end
date. They check on every price the feed sends, with the lines they watch
taken at the same moment:

```ts
import { Chart, BinanceAdapter } from '@tradecanvas/chart';

const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' });
await chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '1h' });

const ema = chart.addIndicator('ema', { period: 50 })!;
const rsi = chart.addIndicator('rsi', { period: 14 })!;

chart.addAlert(NaN, 'crossingUp', 'above the 50 EMA', 'price', undefined, { target: `${ema}:value` });
chart.addAlert(NaN, 'movesDown', 'dump', 'price', undefined, { percent: 4, bars: 6 });        // bars: 2–500
chart.addAlert(70, 'greaterThan', 'RSI closed above 70', `${rsi}:value`, 'RSI', { onBarClose: true });
chart.addAlert(64_000, 'crossing', 'today only', 'price', undefined, { expiresAt: Date.now() + 86_400_000 });

chart.on('alertTriggered', (e) => console.log(e.payload.message, e.payload.channel, e.payload.target));
chart.on('alertExpired', (e) => console.log('expired', e.payload.id));
```

## Practising on a replay with a paper account

Replay an hourly chart in 5-minute steps and trade it on paper: orders fill on
the replayed prices and fills land on the replayed bars. Alerts keep watching
the live market meanwhile.

```ts
import { Chart, BinanceAdapter, PaperExecutionAdapter } from '@tradecanvas/chart';

const adapter = new BinanceAdapter();
const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' });
await chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1h' });
chart.connectExecution(new PaperExecutionAdapter());

const steps = await adapter.fetchHistory('BTCUSDT', '5m', 2000);
chart.replayStart({ steps, startIndex: 300, paused: true, speed: 5 });
chart.replayResume();
// … place orders from the chart; chart.replaySeekToBar(i) jumps, chart.replayStop() goes back to live
```

## Another symbol on its own scale, and the ratio of the two

ETH beside BTC on a price scale of its own, and BTC ÷ ETH in a pane. The
indicators ask for the bars of the symbol they read; fetch them again when the
interval changes:

```ts
import { Chart, BinanceAdapter } from '@tradecanvas/chart';

const adapter = new BinanceAdapter();
const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' });
await chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1h' });

const load = async (symbol: string) => chart.setSymbolSeries(symbol, await adapter.fetchHistory(symbol, '1h', 1000));
chart.on('symbolSeriesRequest', (e) => void load(e.payload.symbol));

chart.addIndicator('compareSymbol', { symbol: 'ETHUSDT' }, 'bottom', { scale: 'left' });
const ratio = chart.addIndicator('spread', { symbol: 'ETHUSDT', mode: 'ratio' })!;
chart.setPaneScale(ratio, { percent: true });
```

## Prices in 32nds

A bond future quoted in 32nds and half 32nds, on High-Low bars, regular
session only:

```ts
import { Chart } from '@tradecanvas/chart';

const chart = new Chart(document.getElementById('chart')!, {
  chartType: 'hiLo',
  priceFormat: { denominator: 32, subDenominator: 2 },  // 110'165 = 110 and 16.5/32
  extendedHours: false,
});
chart.setSymbolInfo({ symbol: 'ZN', timezone: 'America/Chicago', sessions: [{ start: '07:20', end: '14:00' }] });
```

## A custom indicator

Extend `IndicatorBase` and declare what it draws (`plots`), its pane scale and
levels; the chart then draws it, scales its pane, labels its values and lists
it in the widget legend and settings with no rendering code of yours.

```ts
import { Chart, IndicatorBase, IndicatorValueMap } from '@tradecanvas/chart';
import type { DataSeries, IndicatorConfig, IndicatorDescriptor, IndicatorOutput, IndicatorValue } from '@tradecanvas/chart';

/** Where the close sits in the last `period` bars' range, 0–100. */
class RangePosition extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'rangePosition',
    name: 'Range Position',
    shortName: 'RP',
    placement: 'panel',
    defaultConfig: { period: 20 },
    inputs: { period: { min: 2, max: 500 } },
    plots: [{ key: 'value', title: 'RP', color: 0 }],
    scale: { min: 0, max: 100 },
    levels: [20, 80],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = Math.max(2, Number(config.params.period) || 20);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    for (let i = period - 1; i < data.length; i++) {
      let hi = -Infinity;
      let lo = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        hi = Math.max(hi, data[j].high);
        lo = Math.min(lo, data[j].low);
      }
      const point = { value: hi > lo ? ((data[i].close - lo) / (hi - lo)) * 100 : 50 };
      values.set(data[i].time, point);
      series[i] = point;
    }
    return { values, series };
  }
}

const chart = new Chart(document.getElementById('chart')!, {});
chart.registerIndicator(new RangePosition());
chart.addIndicator('rangePosition', { period: 30 });
```

Declare `inputs: { source: { source: true } }` and read `data[i].close` to let
users run it on another price or another indicator's line.

## Several charts in a grid

```ts
import { ChartGrid, BinanceAdapter } from '@tradecanvas/chart';

const grid = new ChartGrid(document.getElementById('grid')!, {
  layout: '2x2',
  syncCrosshair: true,
  syncTimeAxis: true,
});
// An adapter keeps one stream: each chart needs its own.
await grid.connectAll(() => new BinanceAdapter(), ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'], '5m');
grid.getChart(0)?.addIndicator('ema', { period: 50 });
```

With the full widget on each chart, `ChartWidgetGrid` adds a bar to pick the
arrangement and the sync, and saves the whole grid as a named layout:

```ts
import { ChartWidgetGrid } from '@tradecanvas/chart/widget';
import { BinanceAdapter } from '@tradecanvas/chart';

const workspace = new ChartWidgetGrid(document.getElementById('grid')!, {
  layout: '1x2',
  adapter: () => new BinanceAdapter(),   // one per chart
  cells: [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT', timeframe: '1h' }],
  sync: { crosshair: true, interval: true },
});
workspace.getActiveWidget().getChart().addIndicator('rsi', { period: 14 });
```

## Named layouts on your own server

```ts
import { ChartWidget, type LayoutStorage, type SavedLayout } from '@tradecanvas/chart/widget';

const server: LayoutStorage = {
  list: async () => (await fetch('/api/layouts')).json(),
  load: async (id) => {
    const res = await fetch(`/api/layouts/${encodeURIComponent(id)}`);
    return res.ok ? ((await res.json()) as SavedLayout) : null;
  },
  save: async (layout) => {
    await fetch(`/api/layouts/${encodeURIComponent(layout.id)}`, { method: 'PUT', body: JSON.stringify(layout) });
  },
  remove: async (id) => {
    await fetch(`/api/layouts/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  layouts: { storage: server, openLast: true },   // Ctrl/Cmd+S saves, the open layout auto-saves
});
await widget.getLayoutSession()?.saveAs('Swing BTC');
```

Treat what the server returns as untrusted: the widget refuses content it
cannot read, but your API should still check who owns a layout.

## The widget, saved per symbol and in Vietnamese

```ts
import { ChartWidget } from '@tradecanvas/chart/widget';
import { BinanceAdapter } from '@tradecanvas/chart';

new ChartWidget(document.getElementById('chart')!, {
  adapter: new BinanceAdapter(),
  symbol: 'BTCUSDT',
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  persistLayouts: true,            // indicators, drawings and chart type per symbol, in localStorage
  locale: 'vi',
  chartOptions: { numberLocale: 'vi-VN' },
});
```

## The widget in a look of your own

```ts
import { ChartWidget, WIDGET_UI_PRESETS } from '@tradecanvas/chart/widget';
import { BinanceAdapter } from '@tradecanvas/chart';

// 'studio' (the default), 'terminal' (dense, square) or 'capsule' (pills, floating bars)
const widget = new ChartWidget(document.getElementById('chart')!, {
  adapter: new BinanceAdapter(),
  symbol: 'BTCUSDT',
  ui: 'terminal',
});

// Your theme over a preset: what you leave out stays the preset's.
widget.setUI({
  preset: 'studio',
  radius: { md: 10, lg: 14 },   // buttons and fields take md, menus and panels lg
  density: 'compact',
  font: { family: "'Manrope', system-ui, sans-serif", labelCase: 'uppercase' },
  toolbar: 'floating',
  active: 'solid',              // tint · solid · underline
  tagRadius: 999,               // pill price tags on the chart
});
console.log(widget.getUI().sizes.control, WIDGET_UI_PRESETS.capsule.components.control);
```

The look changes shapes and sizes only; colours stay with `theme`. The
widget loads no fonts, so load the families a look names. Without `ui` the
look's CSS variables (`--tcw-radius`, `--tcw-control-h`, …) stay the
stylesheet's and your CSS can set them; with it the widget writes them inline.

## The chart's look by key

```ts
import { Chart, CHART_STYLE_KEYS, type ChartStyleKey } from '@tradecanvas/chart';

const chart = new Chart(document.getElementById('chart')!, {
  theme: 'dark',
  overrides: { 'grid.vertical.visible': false },   // the host's layer, from the start
});

// Any key of CHART_STYLE_KEYS; up/down colours fall back to series.candlestick.*
chart.applyOverrides({
  'series.candlestick.upColor': '#26a69a',
  'series.candlestick.downColor': '#ef5350',
  'grid.horizontal.style': 'dotted',
  'crosshair.vertical.style': 'solid',
  'lastPrice.style': 'solid',
});
chart.applyOverrides({ 'lastPrice.style': null });          // null takes a key away

// What the user picks: kept with the theme it was picked on, saved with saveState()
chart.applyOverrides({ 'background.color': '#0b0b0f' }, { layer: 'user' });

const macd = chart.addIndicator('macd', {});
if (macd) {
  chart.updateIndicatorStyle(macd, { plots: { signal: { lineStyle: 'dashed' }, histogram: { visible: false } } });
  chart.setPaneStyle(macd, { separator: '#f2a93b' });
}
chart.setIndicatorDefaults('ema', { colors: ['#f5a623'], lineWidths: [2] });

const keys = Object.keys(CHART_STYLE_KEYS) as ChartStyleKey[];
console.log(keys.length, chart.getStyleValue('series.bar.upColor'), chart.getStyle().grid.vertical.visible);
chart.on('styleChange', (e) => console.log(e.payload.layer));
```

`getTheme()` is the theme as set; the overrides go on it apart, so
`setTheme(getTheme())` never bakes them in. The host's layer stays through
theme switches and is never saved. A grid of charts takes them for every
chart with `grid.applyOverrides(patch)`. Orders and positions (`trading.*`),
signal markers (`markers.*`), trade zones (`tradeZones.*`) and a selected
drawing's handles (`drawings.handleColor`) read back `null` until set: they
keep their own colours. In the widget, Settings → Style and Settings →
Trading edit every key on the user's layer, with Auto for those.

## The widget with only the parts you want, and parts of your own

```ts
import { ChartWidget, WIDGET_FEATURES, type WidgetFeature } from '@tradecanvas/chart/widget';

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  features: {
    'toolbar.replay': false,          // one button
    'sidebar.patterns': false,        // a section of drawing tools
    'menu.chart.exportData': false,   // one menu entry
    hotkeys: false,                   // every key of the widget's
  },
  drawingMenuItems: ({ id, type }) => [{ label: `Copy ${type}`, icon: 'link', onSelect: () => void navigator.clipboard.writeText(id) }],
  indicatorMenuItems: ({ indicatorId }) => [{ label: 'About', icon: 'info', onSelect: () => console.log(indicatorId) }],
});

// While it runs: a clean chart, and back
widget.setFeatures({ sidebar: false, statusBar: false });
widget.setFeatures({ sidebar: true, statusBar: true });

// A menu of switches of your own on the toolbar
const parts: WidgetFeature[] = ['sidebar', 'statusBar', 'navigation', 'indicatorLegend'];
widget.addToolbarDropdown({
  id: 'parts',
  label: 'Parts',
  icon: 'layers',
  items: () => parts.map((name) => ({
    label: name,
    checked: widget.isFeatureOn(name),
    onSelect: () => widget.setFeatures({ [name]: !widget.isFeatureOn(name) }),
  })),
});

const latency = widget.addStatusBarItem({ id: 'latency', text: '— ms', label: 'Latency' });
latency?.setText('12 ms');

// A shortcut of your own, listed in the shortcut sheet (?). It replaces a widget shortcut on the
// same keys; the chart's own keys (arrows, Delete, Ctrl+Z) still run, and it warns of those.
const shortcut = widget.addHotkey({ keys: 'Alt+L', label: 'Show the latency', onPress: () => latency?.setText('12 ms') });
shortcut?.remove();
const focus = widget.addSidebarButton({
  id: 'focus',
  label: 'Focus',
  icon: 'eye',
  toggle: true,
  onClick: () => {
    const on = !widget.isFeatureOn('toolbar');
    widget.setFeatures({ toolbar: on });
    focus?.setActive(!on);
  },
});

const badge = document.createElement('div');
badge.textContent = 'Paper account';
badge.style.cssText = 'position:absolute;right:72px;top:8px;pointer-events:auto';
widget.getSlot('chart')?.append(badge);       // a layer over the chart the pointer passes through

console.log(WIDGET_FEATURES.length, widget.getFeatures().alerts);
```

A name without a dot (`alerts`, `settings`, `hotkeys`) turns a capability off
wherever it shows; a dotted one (`toolbar.alerts`) one place. The older options
(`toolbar: false`, `drawingTools: false`…) are the same switches. They hide the
widget's own UI; `chartOptions.features` is what stops drawing, trading or zoom
on the chart. A `ChartWidgetGrid` takes them for every chart with
`grid.setFeatures(patch)`.

## Watchlists with live quotes, and a tick chart

```ts
import { ChartWidget } from '@tradecanvas/chart/widget';
import { BinanceAdapter, marketStatus } from '@tradecanvas/chart';

const widget = new ChartWidget(document.getElementById('chart')!, {
  adapter: new BinanceAdapter(),      // its subscribeQuotes fills the rows
  symbol: 'BTCUSDT',
  watchlist: {
    lists: [
      { id: 'majors', name: 'Majors', symbols: ['BTCUSDT', 'ETHUSDT'] },
      { id: 'alts', name: 'Alts', symbols: ['SOLUSDT', 'ADAUSDT'] },
    ],
    persist: true,
  },
});
widget.addToWatchlist('BNBUSDT', 'alts');
widget.toggleSymbolInfo(true);         // price, market status, the day, hours, news
await widget.setTimeframe('100T');     // a bar per 100 trades, from Binance's trades

// Your own feed's quotes instead
widget.setQuotes([{ symbol: 'AAPL', last: 190.2, prevClose: 188.1 }]);
console.log(marketStatus({ symbol: 'AAPL', timezone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00', days: [1, 2, 3, 4, 5] }] }, Date.now()).state);
```

Quotes come from a feed's `subscribeQuotes` (or `watchlist.quotes`, or
`setQuotes`); tick timeframes need a feed with `fetchTrades` and
`subscribeTrades`.
