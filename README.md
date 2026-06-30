# @tradecanvas/chart

High-performance canvas trading chart with built-in indicators, drawing tools, and real-time streaming. Zero external dependencies.

**[Live Demo](https://bonguynvan.github.io/tradecanvas/)** | **[GitHub](https://github.com/bonguynvan/tradecanvas)** | **[npm](https://www.npmjs.com/package/@tradecanvas/chart)**

## Why TradeCanvas?

Most chart libraries make you choose: pretty charts with no trading features, or trading features with an ugly API. TradeCanvas gives you both.

- **33 built-in indicators** — SMA, EMA, Hull MA, RSI, MACD, Bollinger, Ichimoku, Pivot Points, Anchored VWAP, ZigZag, Linear Regression Channel, Awesome / Chaikin Oscillator, and more. No separate calculation library needed.
- **24 drawing tools** — Trendlines, Fibonacci (retracement, extension, time zones), horizontal/vertical lines, channels, Elliott waves, Gann fans / boxes, Pitchfork, Volume Profile range. With undo/redo and full serialization.
- **17 chart types** — Candlestick, line, area, bar, hollow candle, baseline, Heikin-Ashi, Renko, Kagi, Line Break, Point & Figure, Range Bars, Volume Candles, **Equivolume**, HLC Area, Step Line, Line+Markers.
- **TradingView-grade interaction** *(new in 0.9)* — drag the price/time axes to scale, double-click to auto-fit, `Shift+drag` to measure (bars × price Δ × %), `Alt+click` to pin a comparison tooltip, axis-following price/time pill labels under the cursor, bar-hover highlight.
- **Trading overlay** — Render open positions with entry line, P&L zone, and SL/TP markers. Orders as dashed lines. Drag SL/TP to modify. Cleanly opt-out via `features.trading: false` for non-trading projects.
- **Real-time streaming** — Built-in Binance, Coinbase, Bybit, and Kraken adapters, plus generic `WebSocketAdapter` / `PollingAdapter` bases so any feed plugs in with ~20 lines.
- **Live execution** — connect an `ExecutionAdapter` to turn the trading overlay into a real trading surface, drag on the chart to create orders, and reconcile fills. Ships a `PaperExecutionAdapter` sandbox.
- **Plugin SDK** — register custom indicators, drawing tools, chart types, and overlays — globally or per-chart.
- **Strategy backtester** — `@tradecanvas/analytics` ships a bar-by-bar `Backtester` with virtual fills, commission/slippage models, portfolio tracking, and risk metrics (Sharpe, Sortino, Calmar, max drawdown). **Now with 4 ready-to-use reference strategies + Monte Carlo path-dependence analysis.**
- **Replay mode** — `ReplayController` drives historical bars forward at controlled speed with start / pause / step / seek / setSpeed. *(new in 0.9)* The widget now ships a floating bottom scrubber UI (play/pause/step/seek + 0.5×–100× speed) on top of it.
- **Volume Profile** *(new in 0.9)* — optional horizontal histogram of traded volume bucketed by price over the visible range, with point-of-control highlighting.
- **Watchlist sidebar** *(new in 0.9)* — opt-in vertical panel listing symbols with last price, % change, mini sparkline. Click a row to switch chart.
- **CSV / JSON drag-and-drop** *(new in 0.9)* — drop a file onto the chart, it parses and loads instantly. Detects header layouts, ISO/unix-s/unix-ms timestamps, and array-vs-object JSON shapes.
- **Saved layouts** *(new in 0.9)* — opt-in per-symbol persistence of chart type + indicator stack + drawings + alerts to localStorage. Switch symbol, switch back, your setup is intact.
- **Multi-chart grid** — `ChartGrid` for synchronized 2×2 / 2×3 layouts with linked crosshairs and shared time axis.
- **Signal markers & trade zones** — render bot/algorithm output (directional arrows, entry→exit rectangles) as a first-class chart layer.
- **Hotkey sheet** *(new in 0.9)* — press `?` in the widget to open a categorized keyboard-shortcut reference.
- **Save/load chart state** — Persist drawings, indicators, theme, and chart type to JSON. Restore with one call.
- **Zero dependencies** — The entire library is self-contained. No `d3`, no `chart.js`, no `fancy-canvas`.

## Install

```bash
npm install @tradecanvas/chart
# or
pnpm add @tradecanvas/chart
# or
yarn add @tradecanvas/chart
```

## Quick Start

The fastest path is `ChartWidget` — drop-in component with a full TradingView-like UI (toolbar, drawing sidebar, settings dialog, status bar). Zero framework dependency.

```typescript
import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  trading: true,
})
```

That's it. Live data, all 33 indicators, all 24 drawing tools, command palette (`Ctrl+K`), symbol search (`Ctrl+P`), hotkey sheet (`?`), shift-drag measure, alt-click tooltip pin, and drag-drop CSV/JSON loading.

## Headless Chart

For projects that want to own the surrounding UI (custom toolbar, framework-specific controls), use the lower-level `Chart` class directly:

```typescript
import { Chart, BinanceAdapter } from '@tradecanvas/chart'

const chart = new Chart(document.getElementById('chart')!, {
  theme: 'dark',
  autoScale: true,
  features: {
    drawings: true,
    indicators: true,
    trading: true,           // set false to disable orders/positions entirely
    tradingContextMenu: true, // set false to keep overlay but drop right-click menu
    volume: true,
  },
})

const adapter = new BinanceAdapter()
chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '5m', historyLimit: 300 })
```

### Widget Options

| Option | Type | Default | Description |
|---|---|---|---|
| `symbol` | `string` | `'BTCUSDT'` | Initial trading symbol |
| `timeframe` | `TimeFrame` | `'5m'` | Initial timeframe |
| `theme` | `'dark' \| 'light' \| Theme` | `'dark'` | Chart theme |
| `adapter` | `DataAdapter` | — | Data source adapter |
| `toolbar` | `boolean` | `true` | Show top toolbar |
| `drawingTools` | `boolean` | `true` | Show left drawing sidebar |
| `settings` | `boolean` | `true` | Show settings button |
| `trading` | `boolean` | `true` | Enable trading overlay |
| `statusBar` | `boolean` | `true` | Show bottom status bar |
| `symbols` | `string[]` | BTC/ETH/SOL/BNB | Searchable symbol catalog |
| `timeframes` | `TimeFrame[]` | 1m to 1d | Available timeframes |
| `chartTypes` | `ChartType[]` | 11 types | Available chart types |
| `watchlist` | `boolean` | `false` | Right-side watchlist sidebar |
| `dragDropImport` | `boolean` | `true` | Drop CSV / JSON files onto the chart to load data |
| `persistLayouts` | `boolean \| { keyPrefix, debounceMs }` | `false` | Save per-symbol indicators / drawings / chart type to localStorage |
| `onSymbolChange` | `(symbol) => void` | — | Symbol change callback |
| `onTimeframeChange` | `(tf) => void` | — | Timeframe change callback |
| `onReady` | `(chart) => void` | — | Fired when chart is ready |

### Widget vs Headless

| | `Chart` (headless) | `ChartWidget` |
|---|---|---|
| Import | `@tradecanvas/chart` | `@tradecanvas/chart/widget` |
| UI included | None — build your own | Complete toolbar, sidebar, settings |
| Bundle impact | ~50 KB gzip | ~65 KB gzip (includes UI) |
| Framework | Any (React, Vue, Svelte, vanilla) | Vanilla JS DOM (works everywhere) |
| Customization | Full control | Toggle sections on/off |
| Advanced access | Direct API | `widget.getChart()` for direct API |

## Features

### Chart Types

| Type | Description |
|---|---|
| Candlestick | Standard OHLC candles |
| Hollow Candle | Open/close determines fill |
| Bar (OHLC) | Classic open-high-low-close bars |
| Line | Close price line |
| Area | Filled area below close |
| Baseline | Two-tone area split at a reference price |
| Heikin-Ashi | Smoothed candles for trend identification |
| Renko | Fixed-size bricks that ignore time |
| Kagi | Reversal-based line chart |
| Point & Figure | X/O columns for supply/demand analysis |
| Line Break | Three-line break charts |
| Range Bars | Fixed price-range bars — each bar's high − low equals a configured range |
| Volume Candles | Candlesticks with width proportional to volume |
| Equivolume | Full-range boxes with width proportional to volume share (Richard Arms style) |
| HLC Area | High-low-close area band with close line |
| Step Line | Staircase/step pattern from close prices |
| Line with Markers | Close line with circular markers at each data point |

### Multi-Chart Grid

Display multiple synchronized charts side-by-side with linked crosshairs and time axis:

```typescript
import { ChartGrid, BinanceAdapter } from '@tradecanvas/chart'

const grid = new ChartGrid(document.getElementById('grid')!, {
  layout: '2x2',
  syncCrosshair: true,
  syncTimeAxis: true,
})

const adapter = new BinanceAdapter()
grid.connectAll(adapter, ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'], '5m')
```

Supported layouts: `'1x1'`, `'1x2'`, `'2x1'`, `'2x2'`, `'1x3'`, `'3x1'`, `'2x3'`, `'3x2'`.

### Command Palette

Press `Ctrl+K` (or `Cmd+K`) inside ChartWidget to open a searchable command palette. Quickly find and toggle indicators, change chart types, activate drawing tools, switch timeframes, or trigger actions (screenshot, theme toggle, settings).

### Finance Charts

| Chart | Description |
|---|---|
| SparklineChart | Tiny inline line/area chart from a number array — for dashboards and KPI cards |
| DepthChart | Bid/ask order book visualization with cumulative volume areas |
| EquityCurveChart | Portfolio equity line with drawdown shading and benchmark comparison |
| HeatmapChart | Colored cell grid with treemap layout — for sector/market performance |
| WaterfallChart | Running cumulative bars — P&L attribution, revenue bridge, cash flow |
| GaugeChart | Speedometer-style gauge — KPIs, risk scores, Fear & Greed index |

```typescript
import {
  SparklineChart, DepthChart, EquityCurveChart, HeatmapChart,
  WaterfallChart, GaugeChart,
} from '@tradecanvas/chart'

// Sparkline in a 120x48 container
new SparklineChart(el, { data: [100, 102, 98, 105, 103], mode: 'area', color: '#26A69A' })

// Equity curve with drawdown
new EquityCurveChart(el, { data: equityPoints, drawdown: true, benchmark: spyData })

// Order book depth
new DepthChart(el, { data: { bids, asks }, crosshair: true })

// Market heatmap (treemap weighted by market cap)
new HeatmapChart(el, { data: cells, weighted: true })

// P&L waterfall
new WaterfallChart(el, {
  data: [
    { label: 'Start', value: 10000, type: 'total' },
    { label: 'Gain', value: 1850 },
    { label: 'Loss', value: -620 },
    { label: 'End', value: 11230, type: 'total' },
  ],
})

// Fear & Greed gauge
const gauge = new GaugeChart(el, {
  value: 72,
  zones: [
    { from: 0, to: 25, color: '#ef4444' },
    { from: 75, to: 100, color: '#10b981' },
  ],
})
gauge.setValue(85) // animates smoothly
```

### Indicators (built-in)

**Overlay** (drawn on the price chart):
SMA, EMA, Hull MA, Bollinger Bands, Keltner Channel, Donchian Channel, Ichimoku Cloud, Parabolic SAR, Supertrend, VWAP, Anchored VWAP, Pivot Points (Classic), ZigZag, Linear Regression Channel

**Panel** (separate sub-chart):
RSI, MACD, Stochastic, ATR, ADX, CCI, CMF, MFI, OBV, ROC, TSI, Williams %R, Awesome Oscillator, Chaikin Oscillator, Volume Profile, VROC, Standard Deviation, Accumulation/Distribution, Aroon

All indicator parameters are validated at runtime — invalid values (NaN, Infinity, non-numeric strings, missing keys) fall back to documented defaults instead of silently propagating to calculations.

### Drawing Tools

Trendline, Horizontal Line, Vertical Line, Ray, Extended Line, Parallel Channel, Fibonacci Retracement, Fibonacci Extension, **Fibonacci Time Zones**, Rectangle, Ellipse, Triangle, Arrow, Pitchfork, Gann Fan, Gann Box, Elliott Wave, Regression Channel, Date Range, Price Range, Measure, Anchored VWAP, Volume Profile Range, Text Annotation

All drawing tools support:
- Click-to-place with magnet snapping to OHLC values
- Undo / redo (Ctrl+Z / Ctrl+Y)
- Serialization for save/load
- Custom styles (color, width, dash pattern)

### Trading Overlay

Render open positions and pending orders directly on the chart, like MT4/MT5.

```typescript
import type { TradingPosition, TradingOrder } from '@tradecanvas/chart'

chart.setPositions([{
  id: 'pos-1',
  side: 'buy',
  entryPrice: 3500,
  quantity: 1.5,
  closedQuantity: 0.5,   // partial close — visualized as a left-edge dim band
  stopLoss: 3400,
  takeProfit: 3700,
}])

chart.setOrders([{
  id: 'order-1',
  side: 'sell',
  type: 'limit',
  price: 3800,
  quantity: 0.5,
  label: 'TP',
  draggable: true,
}])

// Customize the position zone color via P&L thresholds
chart.setTradingConfig({
  pnlThresholds: [
    { pnl: -Infinity, color: '#b91c1c' },
    { pnl: 0,         color: '#94a3b8' },
    { pnl: 50,        color: '#16a34a' },
    { pnl: 200,       color: '#15803d' },
  ],
  // Custom label template — tokens: {side} {qty} {openQty} {closedQty} {entry} {price} {pnl} {pnlPct} {pnlSign}
  positionLabel: '{side} {openQty}/{qty} @ {entry} | {pnlSign}{pnl} ({pnlPct})',
})

// Listen for user drag-to-modify
chart.on('positionModify', (e) => console.log('SL/TP moved:', e.payload))
chart.on('orderModify', (e) => console.log('Order moved:', e.payload))
```

### Signal Markers

Visualize buy/sell signals from bots, indicators, or manual analysis.

```typescript
chart.addSignalMarker({
  time: 1715692800000,
  price: 62500,
  direction: 'long',
  confidence: 0.85,
  source: 'ema-crossover',
  label: 'EMA Cross',
})

// Color-code by source
chart.setSignalMarkerStyle({
  sourceColors: {
    'ema-crossover': '#2196F3',
    'rsi-divergence': '#FF9800',
    'whale-flow': '#9C27B0',
  },
})
```

### Trade Zones

Render entry→exit rectangles with P&L coloring for executed trades.

```typescript
const zoneId = chart.addTradeZone({
  entryTime: 1715692800000,
  entryPrice: 62500,
  exitTime: 1715700000000,
  exitPrice: 63200,
  direction: 'long',
  pnl: 140,
  pnlPercent: 1.12,
})

// Update a live trade when it closes
chart.updateTradeZone(zoneId, {
  exitTime: Date.now(),
  exitPrice: 63500,
  pnl: 200,
})
```

### Real-Time Streaming

```typescript
// Built-in Binance adapter (free, no API key)
chart.connect({
  adapter: new BinanceAdapter(),
  symbol: 'ETHUSDT',
  timeframe: '1m',
  historyLimit: 500,
})

// Or manual data feed
chart.setData(historicalBars)
chart.appendBar(newBar)
chart.updateLastBar(updatedBar)
chart.setCurrentPrice(3500.42)
```

**Built-in adapters** (all free, no API key): `BinanceAdapter`, `CoinbaseAdapter`, `BybitAdapter`, `KrakenAdapter`, plus `MockAdapter` for offline/testing.

```typescript
import { BybitAdapter, KrakenAdapter, CoinbaseAdapter } from '@tradecanvas/chart'

chart.connect({ adapter: new BybitAdapter(),    symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new KrakenAdapter(),   symbol: 'BTC/USD', timeframe: '5m' })
chart.connect({ adapter: new CoinbaseAdapter(), symbol: 'BTC-USD', timeframe: '15m' })
```

**Any feed in ~20 lines.** Extend `WebSocketAdapter` (live + REST history) or `PollingAdapter` (REST-only feeds) — the base handles the connection lifecycle, reconnect, decoding, and event emission. You supply a URL and a parse function:

```typescript
import { WebSocketAdapter } from '@tradecanvas/chart'

const myAdapter = new WebSocketAdapter({
  name: 'myexchange',
  wsUrl: (c) => `wss://api.myexchange.com/ws/${c.symbol}@kline_${c.timeframe}`,
  fetchHistory: (symbol, tf, limit) => fetch(`/candles?...`).then((r) => r.json()),
  parseMessage: (raw) => ({ bar: toBar(raw), closed: raw.k.x }),
})
```

### Live Execution

Connect an `ExecutionAdapter` to turn the display-only trading overlay into a real trading surface. The chart routes its order/position intents into the adapter, and renders the authoritative `orders` / `positions` the adapter emits back — the **adapter is the single source of truth**. With no adapter connected, those intents stay plain events (backward-compatible).

```typescript
import { PaperExecutionAdapter } from '@tradecanvas/chart'

chart.connectExecution(new PaperExecutionAdapter({ markPrice: 64000 }))

// Drag-to-create an order, then confirm:
chart.startOrderDraft('buy')   // draggable line at the latest close
chart.confirmOrderDraft()      // emits orderPlace → adapter fills → chart renders the position
// chart.cancelOrderDraft()

// One channel for failures (adapter-reported or a failed command):
chart.on('executionError', (e) => toast(e.payload.message))
```

Implement `ExecutionAdapter` (it mirrors `DataAdapter`) to wire a real broker / OMS: `placeOrder`, `modifyOrder`, `cancelOrder`, `modifyPosition`, `closePosition`, plus `orders` / `positions` / `fill` / `error` events. `PaperExecutionAdapter` is a virtual-fill sandbox for demos and tests. The order type of a drag-to-create order (limit vs stop) is inferred from where you drop the line relative to the current price.

### Plugins — extend the chart

Register custom **indicators**, **drawing tools**, **chart types**, and **overlays** — globally (every chart created afterward inherits) or per-chart.

```typescript
import { Chart, registerPlugin, IndicatorBase } from '@tradecanvas/chart'

class MyIndicator extends IndicatorBase { /* descriptor, calculate(), render() */ }

// 1) Global — available to every chart created afterward:
registerPlugin({ kind: 'indicator', plugin: new MyIndicator() })

// 2) Per-chart at construction:
const chart = new Chart(el, { plugins: [{ kind: 'overlay', plugin: myHeatmap }] })

// 3) Imperative on an instance:
chart.plugins.register({ kind: 'chartType', plugin: myCustomCandles })
chart.setChartType('my-custom-candles')   // custom chart types render via the plugin
```

| Plugin kind | Contract |
|---|---|
| `indicator` | `IndicatorPlugin` — `calculate()` + `render()` |
| `drawing` | `DrawingPlugin` — `render()` + `hitTest()` |
| `chartType` | `ChartTypePlugin` — `createRenderer()` + optional `transform()` |
| `overlay` | `OverlayPlugin` — `render(ctx, { viewport, data, theme })` on the `main` / `overlay` / `ui` layer |

### Web Worker indicator pipeline

Heavy charts (1,000+ bars × 10+ indicators) can stutter when `calculate()` runs on the main thread. `IndicatorWorkerHost` offloads calculation to a worker so the render loop stays smooth.

```typescript
import { IndicatorWorkerHost } from '@tradecanvas/core'

// Bundler-supported worker URL (Vite, webpack 5, esbuild, etc.)
const worker = new Worker(
  new URL('@tradecanvas/core/dist/indicator.worker.js', import.meta.url),
  { type: 'module' },
)
const host = new IndicatorWorkerHost(worker, { timeoutMs: 30_000 })

const output = await host.calculate(
  'rsi',
  { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } },
  bars,
)

// Health check / cleanup
await host.ping()
host.terminate()
```

No worker available (SSR, tests, or as a safety net)? Pass `null` and register fallback plugins for synchronous calculation:

```typescript
import { IndicatorWorkerHost, RSIIndicator } from '@tradecanvas/core'

const host = new IndicatorWorkerHost(null)
host.registerFallbackPlugin(new RSIIndicator())
const output = await host.calculate('rsi', config, bars)  // runs synchronously
```

Render still happens on the main thread (it needs `CanvasRenderingContext2D`). Only the heavy compute moves off-thread.

### Save / Load

```typescript
const json = chart.saveState()
localStorage.setItem('my-chart', json!)

chart.loadState(localStorage.getItem('my-chart')!)

// Download / upload files
chart.downloadState('my-chart.json')
await chart.loadStateFromFile()
```

### Themes

```typescript
import { DARK_THEME, LIGHT_THEME, DARK_TERMINAL } from '@tradecanvas/chart'

// Built-in presets: DARK_THEME, LIGHT_THEME, DARK_TERMINAL
chart.setTheme(DARK_TERMINAL)  // fintech terminal: #0E0E0E bg, #00FF87/#FF3B4D candles, monospace

// Or customize any preset
chart.setTheme({
  ...DARK_THEME,
  candleUp: '#26A69A',
  candleDown: '#EF5350',
  background: '#0a0a0f',
})
```

### Events

```typescript
chart.on('crosshairMove', (e) => { /* { point, bar, barIndex, indicatorValues } */ })
chart.on('barClick', (e) => { /* { bar, barIndex, point } */ })
chart.on('visibleRangeChange', (e) => { /* { from, to } */ })
chart.on('drawingCreate', (e) => { /* ... */ })
chart.on('orderModify', (e) => { /* ... */ })
chart.on('positionModify', (e) => { /* ... */ })
```

### Replay Mode

`ReplayController` plays a historical `DataSeries` forward at controlled speed. Decoupled from `Chart` — wire it into any sink (chart for UI playback, or a strategy fn for headless backtests).

```typescript
import { ReplayController } from '@tradecanvas/chart'

const replay = new ReplayController({
  data: historicalBars,
  speed: 10,        // bars per second
  startIndex: 0,
})

// Seed the chart with the prefix before replay starts
chart.setData(replay.getPrefix())

// Each emitted bar drives the chart forward
replay.on('bar', ({ bar }) => chart.appendBar(bar))
replay.on('finished', () => console.log('done'))

replay.start()
// replay.pause(); replay.resume(); replay.step(5); replay.seek(200); replay.setSpeed(20)
```

### Chart Interaction (TradingView-style)

Every gesture you'd expect from a desktop trading chart is built in:

| Gesture | Result |
|---|---|
| Drag price axis up/down | Compress / expand vertical scale (freezes auto-scale) |
| Drag time axis left/right | Zoom time axis |
| Double-click price axis | Re-enable auto-scale |
| Double-click time axis | Fit all data to viewport |
| Wheel | Zoom around cursor |
| Drag a pane divider | Resize the indicator pane (`ns-resize` cursor on hover) |
| `Shift` + drag | Measure ruler (bars × time × price Δ × %) |
| `Alt` + click | Pin OHLC tooltip; live crosshair shows Δ to pinned bar |
| Hover | Price + time pill labels follow on both axes |
| `Esc` | Unpin tooltip / cancel drawing |
| `?` | Show keyboard-shortcut sheet *(widget)* |
| `Ctrl/⌘ + K` | Command palette *(widget)* |
| `Ctrl/⌘ + P` | Symbol search *(widget)* |
| `Ctrl/⌘ + Z` / `Shift + Z` | Undo / redo drawings |

### Data import — drag-and-drop or programmatic

```typescript
import { parseOHLCV } from '@tradecanvas/chart'

const { data, rowCount, skipped } = parseOHLCV(csvText)
chart.setData(data)
```

Drop a CSV or JSON file onto the widget and it loads instantly. Auto-detects
delimiter (`,` / `;` / tab / `|`), header vs. headerless, ISO 8601 timestamps,
and array-of-arrays vs. array-of-objects JSON.

### Backtesting (`@tradecanvas/analytics`)

Bar-by-bar strategy backtester with virtual fills, commission/slippage models, and a full risk-metrics report.

```typescript
import { Backtester, PercentCommission, PercentSlippage } from '@tradecanvas/analytics'

const bt = new Backtester({
  initialCash: 10_000,
  commission: new PercentCommission(0.0005),
  slippage: new PercentSlippage(0.0003),
})

const result = bt.run(historicalBars, (ctx) => {
  // Strategy fn runs at close of each bar; orders fill on the NEXT bar.
  if (!ctx.position && smaFast > smaSlow) {
    ctx.placeOrder({ side: 'long', type: 'market', quantity: 1 })
  } else if (ctx.position && smaFast < smaSlow) {
    ctx.close()
  }
})

console.log(result.metrics.sharpe)         // 1.42
console.log(result.metrics.maxDrawdownPct) // 0.087
console.log(result.equityCurve)            // → feed into the chart via EquityCurveRenderer
```

Returns: `fills`, closed `trades`, `equityCurve`, `metrics` (Sharpe, Sortino, Calmar, CAGR, max drawdown, win rate, profit factor, expectancy). See the [live backtest demo](https://bonguynvan.github.io/tradecanvas/docs/analytics/).

#### Strategy library (new in 0.9)

Four drop-in reference strategies — each returns a `StrategyFn` ready to feed
`Backtester.run()`:

```typescript
import {
  Backtester,
  smaCrossStrategy,
  rsiReversionStrategy,
  donchianBreakoutStrategy,
  bollingerReversionStrategy,
} from '@tradecanvas/analytics'

const bt = new Backtester({ initialCash: 10_000 })
bt.run(bars, smaCrossStrategy({ fastPeriod: 10, slowPeriod: 30 }))
bt.run(bars, donchianBreakoutStrategy({ entryPeriod: 20, exitPeriod: 10 }))
```

#### Monte Carlo path-dependence (new in 0.9)

Shuffle realised trade order N times to expose whether a strategy depends on
lucky sequencing. Tight P5/P95 band = robust edge; wide band = path-dependent.

```typescript
import { runMonteCarlo } from '@tradecanvas/analytics'

const result = bt.run(bars, smaCrossStrategy())
const mc = runMonteCarlo(10_000, result.trades, { simulations: 1000, seed: 42 })

mc.equityBands              // [{ step, p5, p25, p50, p75, p95 }, …]
mc.finalEquityPercentiles   // { p5, p25, p50, p75, p95 }
mc.probabilityProfitable    // 0..1
mc.worstMaxDrawdownPct
```

## Comparison

| Feature | @tradecanvas/chart | lightweight-charts | chart.js | Highcharts Stock |
|---|---|---|---|---|
| Chart types | 17 + 6 finance | 4 | 8 (non-financial) | 10+ |
| Finance charts | Sparkline, Depth, Equity, Heatmap, Waterfall, Gauge | None | None | Some |
| Built-in indicators | 33 | 0 | 0 | ~30 |
| Drawing tools | 24 | 0 | 0 | Some |
| Trading overlay | Full (pos + orders + drag) | None | None | None |
| Real-time streaming | Built-in (Binance) | Manual | Manual | Built-in |
| Save/load state | Yes | No | No | Yes |
| Replay mode | Yes (`ReplayController`) | No | No | No |
| Backtester | Yes (`@tradecanvas/analytics`) | No | No | No |
| Multi-chart grid | Yes (`ChartGrid`) | No | No | Yes |
| Bundle (gzip) | ~56 KB core | ~45 KB | ~70 KB | ~200 KB |
| Dependencies | 0 | 1 | 0 | 0 |
| Widget (complete UI) | Yes (`ChartWidget`) | No | No | No |
| License | MIT | Apache 2.0 | MIT | Commercial |

## API Overview

### `new Chart(container, options)`

```typescript
const chart = new Chart(element, {
  chartType: 'candlestick',
  theme: DARK_THEME,
  autoScale: true,
  rightMargin: 5,
  numberLocale: 'en-US',  // or 'de-DE', 'vi-VN', etc. — BCP 47 locale
  crosshair: { mode: 'magnet' },
  features: { drawings: true, indicators: true, trading: true, volume: true },
})

// Change locale at runtime
chart.setNumberLocale('de-DE')  // 65.234,00
```

### Key Methods

| Method | Description |
|---|---|
| `setData(bars)` | Load historical OHLCV data |
| `appendBar(bar)` | Append a new candle |
| `appendBars(bars)` | Bulk append (reconnect catch-up) |
| `updateLastBar(bar)` | Update the in-progress candle |
| `setCurrentPrice(price, pulseColor?)` | Show a live price line |
| `connect(config)` | Connect to a real-time data source |
| `setTimeframe(tf)` | Switch timeframe on active stream |
| `setChartType(type)` | Switch chart type |
| `setTheme(theme)` | Apply a theme (DARK_THEME, LIGHT_THEME, DARK_TERMINAL) |
| `setNumberLocale(locale)` | Set number format locale (en-US, de-DE, vi-VN) |
| `setStatusText(text)` | Show status in legend area ("LIVE · 8ms") |
| `addIndicator(id, params?)` | Add a technical indicator |
| `removeIndicator(instanceId)` | Remove an indicator |
| `setDrawingTool(tool)` | Activate a drawing tool |
| `setPositions(positions)` | Render trading positions |
| `setOrders(orders)` | Render pending orders |
| `setVolumeProfileVisible(v)` | Toggle the horizontal volume-profile overlay |
| `setVolumeProfileConfig({ buckets, widthRatio, opacity, highlightPoC })` | Tune the volume profile |
| `setAutoScale(v)` / `setLogScale(v)` | Lock or change price-scale mode |
| `fitContent()` / `scrollToEnd()` | Fit all data / jump to live edge |
| `saveState(key?)` | Serialize chart state |
| `loadState(json)` | Restore chart state |
| `screenshot()` | Download chart as image |
| `on(event, handler)` | Subscribe to events |
| `destroy()` | Clean up all resources |

### Data Format

```typescript
interface OHLCBar {
  time: number    // Unix timestamp (seconds)
  open: number
  high: number
  low: number
  close: number
  volume: number
}
```

## Examples

| Example | Description |
|---|---|
| [Live Demo](https://bonguynvan.github.io/tradecanvas/) | Full-featured demo with live Binance data |
| [examples/basic](./examples/basic/) | Vanilla JS + live Binance streaming |
| [examples/vanilla-static](./examples/vanilla-static/) | Vanilla JS + static data (offline) |
| [examples/react](./examples/react/) | React 19 integration |
| [examples/svelte](./examples/svelte/) | Svelte 5 integration |
| [examples/vue](./examples/vue/) | Vue 3 integration |

## Browser Support

Chrome 80+, Firefox 80+, Safari 14+, Edge 80+

## Framework Integration

TradeCanvas is framework-agnostic. The `Chart` class takes a DOM element and manages its own canvas layers.

**React:**

```tsx
import { useEffect, useRef } from 'react'
import { Chart, BinanceAdapter } from '@tradecanvas/chart'

function TradingChart() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const chart = new Chart(ref.current!, {
      theme: 'dark',
      features: { indicators: true, drawings: true },
    })
    chart.connect({
      adapter: new BinanceAdapter(),
      symbol: 'BTCUSDT',
      timeframe: '5m',
    })
    return () => chart.destroy()
  }, [])

  return <div ref={ref} style={{ width: '100%', height: 500 }} />
}
```

**Svelte:**

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Chart, BinanceAdapter, DARK_THEME } from '@tradecanvas/chart'
  import type { TimeFrame } from '@tradecanvas/chart'

  interface Props { symbol?: string; timeframe?: TimeFrame }
  let { symbol = 'BTCUSDT', timeframe = '5m' }: Props = $props()

  let container: HTMLDivElement
  let chart: Chart | null = null

  onMount(() => {
    chart = new Chart(container, {
      chartType: 'candlestick',
      theme: DARK_THEME,
      autoScale: true,
      features: { indicators: true, drawings: true, volume: true },
    })
    chart.connect({ adapter: new BinanceAdapter(), symbol, timeframe })
  })

  onDestroy(() => chart?.destroy())

  $effect(() => {
    if (!chart) return
    chart.disconnectStream()
    chart.connect({ adapter: new BinanceAdapter(), symbol, timeframe })
  })
</script>

<div bind:this={container} style="width: 100%; height: 600px" />
```

**Vue:**

```vue
<template>
  <div ref="chartContainer" style="width: 100%; height: 600px" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Chart, BinanceAdapter, DARK_THEME } from '@tradecanvas/chart'

const chartContainer = ref<HTMLDivElement>()
let chart: Chart | null = null

onMounted(() => {
  if (!chartContainer.value) return
  chart = new Chart(chartContainer.value, {
    chartType: 'candlestick',
    theme: DARK_THEME,
    autoScale: true,
    features: { indicators: true, drawings: true, volume: true },
  })
  chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '5m' })
})

onUnmounted(() => chart?.destroy())
</script>
```

## Architecture

Multi-layer canvas for optimal rendering — only dirty layers repaint each frame:

```
  UI Layer      (price axis, legend, live price)     z=3
  Overlay Layer (drawings, trading positions/orders) z=2
  Main Layer    (candles, indicators, volume)         z=1
  Background    (grid, watermark)                     z=0
```

## License

[MIT](./LICENSE)
