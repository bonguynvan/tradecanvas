# @tradecanvas/chart

High-performance canvas trading chart with built-in indicators, drawing tools, and real-time streaming. Zero external dependencies.

**[Live Demo](https://bonguynvan.github.io/tradecanvas/)** | **[GitHub](https://github.com/bonguynvan/tradecanvas)** | **[npm](https://www.npmjs.com/package/@tradecanvas/chart)**

## Why TradeCanvas?

Most chart libraries make you choose: pretty charts with no trading features, or trading features with an ugly API. TradeCanvas gives you both.

- **70 built-in indicators** — SMA, EMA, TEMA, VWMA, Hull MA, RSI, MACD, Bollinger, Envelope, Ichimoku, Pivot Points, Anchored VWAP, ZigZag, Linear Regression Channel, Awesome / Chaikin Oscillator, and more. No separate calculation library needed.
- **69 drawing tools** — Trendlines (info line, trend angle, cross line), Fibonacci (retracement, extension, channel, time zones, speed resistance fan and arcs, circles, spiral, wedge), horizontal/vertical lines, channels, pitchforks and pitchfan, Gann fan / box / square, cycles, harmonic patterns (XABCD, cypher, ABCD, three drives, head and shoulders), Elliott waves, notes, callouts and marks, brush and path, forecast and projection, Long/Short Position with position sizing, Volume Profile range. Each with its own settings, alerts on trend lines, groups and layers, undo/redo and full serialization.
- **18 chart types** — Candlestick, line, area, bar, hollow candle, baseline, High-Low, Heikin-Ashi, Renko, Kagi, Line Break, Point & Figure, Range Bars, Volume Candles, **Equivolume**, HLC Area, Step Line, Line+Markers. Renko's box, Kagi's reversal and the like are yours to set.
- **Pro-grade interaction** — pan freely past the last bar into empty future space (drawings can go there too), drag the price/time axes to scale, double-click to auto-fit, `Ctrl/⌘+drag` to select several drawings (then move, restyle or delete them together), `Shift+drag` to measure (bars × price Δ × %), `Alt+click` to pin a comparison tooltip, context cursors (crosshair, grabbing hand, resize arrows), axis-following price/time pill labels under the cursor, bar-hover highlight.
- **Trading overlay** — Render open positions with entry line, P&L zone, and SL/TP markers. Orders as dashed lines. Drag SL/TP to modify, cancel / close / reverse from the buttons on each line, and see every fill marked on its bar. ChartWidget adds an order ticket that checks the order as you fill it in, and an account panel with positions, working orders and history. Cleanly opt-out via `features.trading: false` for non-trading projects.
- **Real-time streaming** — Built-in Binance adapter. Plug in your own data source with the adapter interface.
- **Strategy backtester** — `@tradecanvas/analytics` ships a bar-by-bar `Backtester` with virtual fills, commission/slippage models, portfolio tracking, and risk metrics (Sharpe, Sortino, Calmar, max drawdown). **Now with 4 ready-to-use reference strategies + Monte Carlo path-dependence analysis.**
- **Replay mode** — replay the chart's own bars from any point, in finer steps if you like (an hourly chart forming from 5-minute bars), with play / pause / step / seek / speed, and paper-trade on the replayed prices. The widget has a replay bar for it; `ReplayController` drives bars headless too.
- **Alerts** — on a price level, an indicator line, a drawing, or one line crossing another; on a move of some percent within some bars; only on closed bars; with an expiry. The widget's alerts panel sets all of them.
- **Compare and spread** — other symbols in percent on the price scale, on a scale or pane of their own, or as a spread or ratio, lined up with the chart by time.
- **Price formats** — prices in your own format or in fractions of a point (a bond in 32nds: 110'165) on every label; times your way; extended hours on or off; data export with the indicator lines.
- **Volume Profile** *(new in 0.9)* — optional horizontal histogram of traded volume bucketed by price over the visible range, with point-of-control highlighting.
- **Watchlist sidebar** *(new in 0.9)* — opt-in vertical panel listing symbols with last price, % change, mini sparkline. Click a row to switch chart.
- **CSV / JSON drag-and-drop** *(new in 0.9)* — drop a file onto the chart, it parses and loads instantly. Detects header layouts, ISO/unix-s/unix-ms timestamps, and array-vs-object JSON shapes.
- **Named layouts** — save the chart under a name (symbol, interval, scale, indicators, drawings, alerts), open, rename, delete, auto-save the open one, `Ctrl/⌘+S`. Kept in the browser, or on your server through a four-call `LayoutStorage`. Per-symbol auto-persistence (`persistLayouts`) is there too.
- **Multi-chart** — `ChartWidgetGrid` puts up to six full widgets side by side, linked by symbol, interval, crosshair, time or drawings as you choose, and saves them as one layout. `ChartGrid` does the same for bare charts.
- **Signal markers & trade zones** — render bot/algorithm output (directional arrows, entry→exit rectangles) as a first-class chart layer.
- **Hotkey sheet** *(new in 0.9)* — press `?` in the widget to open a categorized keyboard-shortcut reference.
- **Extensible widget** — add your own toolbar buttons and right-click menu entries (`addToolbarButton`, `chartMenuItems`).
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

The fastest path is `ChartWidget` — drop-in component with a full trading UI (toolbar, drawing sidebar, settings dialog, status bar). Zero framework dependency.

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

That's it. Live data, all 85 indicators, all 69 drawing tools, command palette (`Ctrl+K`), symbol search (`Ctrl+P`), hotkey sheet (`?`), shift-drag measure, alt-click tooltip pin, and drag-drop CSV/JSON loading.

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
    tradingContextMenu: true, // opt-in right-click order menu (off by default)
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
| `rangeBar` | `boolean` | `true` | Range presets (1D … All) and go to date (Alt+G) on the status bar |
| `indicatorLegend` | `boolean` | `true` | Indicators listed on the chart (under the OHLCV legend and atop their panes) with show / settings / remove |
| `fullscreen` | `boolean` | `true` | Fullscreen button in the toolbar |
| `symbols` | `string[]` | BTC/ETH/SOL/BNB | Searchable symbol catalog |
| `timeframes` | `TimeFrame[]` | 1m to 1M | Timeframes on offer; pin favourites from the ▾ menu |
| `chartTypes` | `ChartType[]` | 18 types | Available chart types |
| `watchlist` | `boolean` | `false` | Right-side watchlist sidebar |
| `dragDropImport` | `boolean` | `true` | Drop CSV / JSON files onto the chart to load data |
| `persistLayouts` | `boolean \| { keyPrefix, debounceMs }` | `false` | Save per-symbol indicators / drawings / chart type to localStorage |
| `onSymbolChange` | `(symbol) => void` | — | Symbol change callback |
| `onTimeframeChange` | `(tf) => void` | — | Timeframe change callback |
| `onReady` | `(chart) => void` | — | Fired when chart is ready |
| `locale` | `string` | `'en'` | UI chrome language — built-in `'en'` / `'vi'`, see **Widget i18n** below |
| `messages` | `Partial<Record<MessageKey, string>>` | — | Override or add individual UI strings on top of `locale` |

### Icons

The widget's icon set is exported for your own UI: `createIcon(name)`,
`createToolIcon(drawingTool)`, `createChartTypeIcon(chartType)` return inline
SVG strings drawn in `currentColor` (24 px grid, 1.75 px strokes).

```ts
import { createToolIcon } from '@tradecanvas/chart/widget'
button.innerHTML = createToolIcon('fibRetracement', 16)
```

### Widget i18n

`locale` and `messages` translate `ChartWidget`'s own chrome — toolbar, watchlist, indicator-picker section headers (Popular/All, overlay/panel tags), status bar, settings panel (titles/tabs/section headers), and hotkey sheet (title/group headers). Set at construction; not currently hot-swappable at runtime.

```ts
new ChartWidget(el, {
  locale: 'vi',                              // built-in Vietnamese table
  messages: { 'watchlist.title': 'Theo dõi' }, // override/add individual keys — always wins
  chartOptions: { numberLocale: 'vi-VN' },    // separate: number/date formatting (see below)
});
```

`locale`/`messages` only cover chrome **text**; they're independent of `chartOptions.numberLocale`, which controls number/date **formatting** (price axis, legend, watchlist prices, current-price tag, session-break dates) via `Intl`/`toLocaleString`.

Not yet covered by `locale` (still English; PRs welcome, or override via `messages`/your own CSS):
- Indicator and drawing-tool **names** (SMA, Bollinger Bands, Trend Line, …) — these come from `widgetConfig.ts`'s data tables, not the message catalog.
- Individual settings rows beyond the tab/section level (e.g. "Up Body", "Grid Lines").
- Individual hotkey-sheet shortcut labels and key-cap text (group titles are translated).
- Alerts panel, symbol search, command palette, data window, depth ladder, bracket bar, replay bar, drawing-style panel, object tree.

See `packages/library/src/widget/i18n.ts` for the full key list (`MessageKey`) and the English/Vietnamese tables.

### Widget vs Headless

| | `Chart` (headless) | `ChartWidget` |
|---|---|---|
| Import | `@tradecanvas/chart` | `@tradecanvas/chart/widget` |
| UI included | None — build your own | Complete toolbar, sidebar, settings |
| Bundle impact | ~50 KB gzip | ~65 KB gzip (includes UI) |
| Framework | Any (React, Vue, Svelte, vanilla) | Vanilla JS DOM (works everywhere) |
| Customization | Full control | Toggle sections on/off |
| Advanced access | Direct API | `widget.getChart()` for direct API |

### Widget Look

The widget's shapes and sizes — corners, control heights, type, borders, shadows, how a chosen button shows, bars docked or floating — are a look of their own, apart from the colours. Three presets: **Studio** (the default), **Terminal** (dense and square) and **Capsule** (pills, floating bars). Start from one and change what you like:

```ts
const widget = new ChartWidget(host, { ui: 'terminal' });
widget.setUI({ preset: 'studio', radius: { md: 10 }, density: 'compact', toolbar: 'floating', active: 'solid' });
```

The chart's price tags take the same corners (`tagRadius`; on a bare `Chart`, `chart.setShapes({ tagRadius })`). The widget loads no fonts: load the ones a look names. See [Styling](https://bonguynvan.github.io/tradecanvas/docs/styling).

### Widget Theming

`ChartWidget`'s own chrome (toolbar, sidebars, settings panel, watchlist — everything *outside* the canvas) is styled entirely through CSS custom properties on `.tcw-root`, the widget's own root element. These are a **stable, documented contract**: additive-only across minor/patch releases — a property is never renamed or removed without a major version bump. Override them from the host page; no build step or theme object needed.

```css
/* Dark is the default (no attribute needed); light sets data-tcw-theme="light" */
.my-app .tcw-root:not([data-tcw-theme="light"]) {
  --tcw-bg: #0a0a0f;
  --tcw-accent: #7c5cff;
  --tcw-radius: 0px;
  --tcw-radius-lg: 0px;
}
```

| Variable | Default (dark) | Purpose |
|---|---|---|
| `--tcw-bg` | `#080b10` | Root background |
| `--tcw-bg-surface` | `#0c1016` | Panel / toolbar surface |
| `--tcw-bg-elevated` | `#141922` | Popovers, dropdowns, modals |
| `--tcw-bg-overlay` | `rgba(20,25,34,.5)` | Backdrop behind overlays |
| `--tcw-border` | `#1f2630` | Default border |
| `--tcw-border-strong` | `#2a323e` | Emphasized border (focus rings, dividers) |
| `--tcw-text` | `#e7e9ee` | Primary text |
| `--tcw-text-dim` | `#aab1bd` | Secondary text |
| `--tcw-text-muted` | `#758091` | Tertiary / placeholder text |
| `--tcw-accent` | `#f2a93b` | Primary accent (active tab, focus, links) |
| `--tcw-accent-ink` | `#1a1204` | Text and icons on an accent fill |
| `--tcw-accent-hover` | `#f5b95c` | Accent hover state |
| `--tcw-accent-soft` | `rgba(242,169,59,.14)` | Accent tint (selected row background) |
| `--tcw-accent-glow` | `rgba(242,169,59,.22)` | Accent glow (focus halo) |
| `--tcw-accent-line` | `rgba(242,169,59,.55)` | Accent border/underline |
| `--tcw-red` / `--tcw-red-soft` | `#e8505b` / tint | Down/sell/negative |
| `--tcw-green` / `--tcw-green-soft` | `#1fa874` / tint | Up/buy/positive |
| `--tcw-amber` | `#ff9f43` | Warning |
| `--tcw-hover-bg` | `rgba(255,255,255,.05)` | Row/button hover background |
| `--tcw-active-bg` | `rgba(255,255,255,.08)` | Row/button pressed background |
| `--tcw-divider` | `rgba(255,255,255,.06)` | Hairline dividers |
| `--tcw-ease` / `--tcw-ease-out` | cubic-bezier | Transition easing |
| `--tcw-dur-fast` / `-normal` / `-slow` | `120ms` / `180ms` / `260ms` | Transition durations |
| `--tcw-radius-xs` / `-sm` / `--tcw-radius` / `-lg` / `-xl` | `3px` / `5px` / `7px` / `11px` / `16px` | The corner scale — set to `0` for a square look |
| `--tcw-control-radius` / `--tcw-input-radius` / `--tcw-menu-radius` / `--tcw-dialog-radius` / `--tcw-panel-radius` / `--tcw-tooltip-radius` / `--tcw-tag-radius` / `--tcw-toast-radius` | from the scale | Each kind of part's corners |
| `--tcw-toolbar-h` / `--tcw-control-h` / `--tcw-control-h-sm` / `--tcw-icon` / `--tcw-sidebar-w` / `--tcw-menu-item-h` | `46px` / `30px` / `24px` / `18px` / `48px` / `30px` | Sizes |
| `--tcw-font` / `--tcw-font-size` / `--tcw-weight` / `--tcw-weight-strong` | `'Manrope', 'Inter', …` / `13px` / `500` / `600` | Type |
| `--tcw-label-case` / `--tcw-label-tracking` | `none` / `0em` | Small labels (section titles) |
| `--tcw-border-w` / `--tcw-sep-w` | `1px` / `0px` | Border width; rules between toolbar groups |
| `--tcw-menu-shadow` / `--tcw-dialog-shadow` / `--tcw-tooltip-shadow` | the elevation shadows | Shadows of menus, dialogs, tooltips |
| `--tcw-blur` / `--tcw-surface-opacity` | `0px` / `100%` | Frosted menus |
| `--tcw-shadow-sm` / `-md` / `-lg` / `-xl` | box-shadow values | Elevation |
| `--tcw-ring` | `0 0 0 2px rgba(242,169,59,.45)` | Focus ring |
| `--tcw-font-mono` | `'JetBrains Mono', …` | Monospace font stack (price ladder, code) |

Light theme (`[data-tcw-theme="light"]`) redefines the color group (`--tcw-bg*`, `--tcw-border*`, `--tcw-text*`, `--tcw-accent*`, `--tcw-hover-bg`, `--tcw-active-bg`, `--tcw-divider`, `--tcw-shadow*`) with its own defaults — override both selectors if you support both themes. With the `ui` option set, the widget writes its look's variables on the element, so they win over your CSS; without it they stay yours to set.

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

// An adapter keeps one stream: give each chart its own
grid.connectAll(() => new BinanceAdapter(), ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'], '5m')
```

With the full widget on each chart, a bar to pick the arrangement and sync, and the whole grid saved as a named layout:

```typescript
import { ChartWidgetGrid } from '@tradecanvas/chart/widget'

const workspace = new ChartWidgetGrid(document.getElementById('grid')!, {
  layout: '1x2',
  adapter: () => new BinanceAdapter(),
  cells: [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT', timeframe: '1h' }],
  sync: { crosshair: true, interval: false, symbol: false, time: false, drawings: false },
})
workspace.setSync({ time: true })
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
new SparklineChart(el, { data: [100, 102, 98, 105, 103], mode: 'area', color: '#1fa874' })

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

// Fear & Greed gauge: zones light up to the value, the label shows the current zone
const gauge = new GaugeChart(el, {
  value: 72,
  label: 'Fear & Greed',
  zones: [
    { from: 0, to: 25, color: '#e8505b', label: 'Extreme fear' },
    { from: 25, to: 45, color: '#f2a93b', label: 'Fear' },
    { from: 45, to: 55, color: '#8a93a3', label: 'Neutral' },
    { from: 55, to: 75, color: '#62c895', label: 'Greed' },
    { from: 75, to: 100, color: '#1fa874', label: 'Extreme greed' },
  ],
  // pointer: 'needle',  // classic needle instead of the ring marker
})
gauge.setValue(85) // animates smoothly
```

### Indicators (built-in)

85 indicators — moving averages (SMA, EMA, WMA, Hull, DEMA, TEMA, ALMA, KAMA,
LSMA, McGinley, SMMA, MA Cross, MTF MA), bands and channels (Bollinger,
Keltner, Donchian, Envelope, Linear Regression), trend and stops (Ichimoku,
Supertrend, Parabolic SAR, Chandelier, Chande Kroll Stop, Alligator, ZigZag,
Fractals, Pivot Points), VWAPs and Volume Profile on the price pane; RSI, MACD,
Stochastic, ATR, ADX, CCI, OBV, MFI, Bollinger %B and BandWidth, Historical
Volatility, Ulcer Index and 40 more oscillators, volume and volatility
indicators in panes. The [indicator catalog](https://bonguynvan.github.io/tradecanvas/docs/indicators)
lists every id with its inputs, lines and levels.

```typescript
import { indicatorSource } from '@tradecanvas/chart'

const rsi = chart.addIndicator('rsi', { period: 14 })!
chart.addIndicator('ema', { period: 21, source: 'hlc3' })                     // another price
chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') }) // RSI's own average, in RSI's pane
chart.setIndicatorLevels(rsi, [20, 50, 80])
```

- **Sources**: close, open, high, low, hl2, hlc3, ohlc4, hlcc4, or another indicator's line.
- **Panes**: one value scale per pane for lines, levels, axis and crosshair; move an indicator into another pane, a new one or back to the price pane; fold, maximise and reorder panes (`moveIndicatorToPane`, `setPaneCollapsed`, `setMaximizedPane`, `movePane`).
- **Undo and templates**: Ctrl/Cmd+Z undoes indicator changes, in the same history as drawings; ChartWidget saves the indicators as named templates (`getIndicatorSetup` / `applyIndicatorSetup`).
- **Levels**: editable per instance (RSI 30/70, CCI ±100 …), kept in saved layouts.
- **Value tags**: each line's latest value on its axis, in its colour.
- **Custom indicators** declare their lines (`plots`), scale, levels and inputs; the chart draws and labels them.

Invalid parameters (NaN, Infinity, non-numeric strings, missing keys) fall back
to the defaults instead of reaching the calculations.

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

// The × and ⇅ buttons on the lines raise these; so can your own UI
chart.cancelOrderIntent('order-1')
chart.reversePositionIntent('pos-1')
chart.on('executionFill', (e) => console.log(e.payload.reason, e.payload.pnl))
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
    'ema-crossover': '#4c8dff',
    'rsi-divergence': '#f2a93b',
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

### Indicators outside the chart

`IndicatorWorkerHost` computes an indicator from bars with the same messages a
Web Worker would use. The worker script is not part of the published packages
yet; pass `null` and register the plugins to compute in place (SSR, tests,
scripts):

```typescript
import { IndicatorWorkerHost, RSIIndicator } from '@tradecanvas/core'

const host = new IndicatorWorkerHost(null)
host.registerFallbackPlugin(new RSIIndicator())
const output = await host.calculate('rsi', { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } }, bars)
```

### Save / Load

```typescript
const json = chart.saveState()
localStorage.setItem('my-chart', json!)

chart.loadState(localStorage.getItem('my-chart')!)

// Download / upload files
chart.downloadState('my-chart.json')
await chart.loadStateFromFile()

// Or keep a layout saved as it changes (debounced)
chart.setAutoSave('my-chart', 1500)
```

A saved layout holds the chart type, theme, drawings, indicators (inputs, pane,
colours, visibility) and alerts, including alerts on indicator lines.

### Themes

```typescript
import { DARK_THEME, LIGHT_THEME, DARK_TERMINAL } from '@tradecanvas/chart'

// Built-in presets: DARK_THEME, LIGHT_THEME, DARK_TERMINAL
chart.setTheme(DARK_TERMINAL)  // fintech terminal: #0E0E0E bg, #00FF87/#FF3B4D candles, monospace

// Or customize any preset
chart.setTheme({
  ...DARK_THEME,
  candleUp: '#1fa874',
  candleDown: '#e8505b',
  background: '#0a0a0f',
})
```

### Events

```typescript
chart.on('crosshairMove', (e) => { /* { point, bar, barIndex, indicatorValues } — also over indicator panes */ })
chart.on('crosshairLeave', () => { /* the pointer left the plot */ })
chart.on('drawingToolChange', (e) => { /* { tool } — null once a drawing is finished or cancelled */ })
chart.on('indicatorUpdate', (e) => { /* { from } — indicator values recomputed from this bar on */ })
chart.on('paneResize', (e) => { /* { instanceId, size } — an indicator pane was resized */ })
chart.on('indicatorChange', (e) => { /* { instanceId, change } — shown/hidden, restyled, levels, inputs or pane changed */ })
chart.on('barClick', (e) => { /* { bar, barIndex, point } */ })
chart.on('visibleRangeChange', (e) => { /* { from, to } — bar indices, not timestamps */ })
chart.on('priceRangeChange', (e) => { /* { min, max } — visible price bounds */ })
chart.on('zoomChange', (e) => { /* { barWidth } — pixels per bar */ })
chart.on('drawingCreate', (e) => { /* ... */ })
chart.on('orderModify', (e) => { /* ... */ })
chart.on('positionModify', (e) => { /* ... */ })
```

`visibleRangeChange`, `priceRangeChange`, and `zoomChange` fire on every pan,
zoom, resize, and data update — but only when that piece of viewport state
actually changed. Resolve a `visibleRangeChange` index to time with
`chart.getData()[e.payload.from].time`.

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

### Chart Interaction

Every gesture you'd expect from a desktop trading chart is built in:

| Gesture | Result |
|---|---|
| Drag chart body left/right | Pan through time |
| Drag chart body up/down | Pan the price scale (freezes auto-scale; double-click price axis to restore) |
| Drag price axis up/down | Compress / expand vertical scale (freezes auto-scale) |
| Drag time axis left/right | Zoom time axis |
| Double-click price axis | Re-enable auto-scale |
| Double-click time axis | Fit all data to viewport |
| Wheel | Zoom around cursor |
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
| Chart types | 18 + 6 finance | 4 | 8 (non-financial) | 10+ |
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
| `setInvertScale(v)` | Turn the price scale upside down |
| `fitContent()` / `scrollToEnd()` | Fit all data / jump to live edge |
| `setVisibleRangePreset(p)` | Show `1D`, `5D`, `1M`, `3M`, `6M`, `YTD`, `1Y`, `5Y` or `All` |
| `goToTime(time)` | Centre the bar at a time |
| `setCrosshairTime(time)` | Mirror another chart's crosshair (vertical line only) |
| `copyDrawings()` / `pasteDrawings()` | Copy the selection, paste into this or another chart |
| `setStayInDrawingMode(v)` | Keep the drawing tool after each drawing |
| `saveState(key?)` | Serialize chart state |
| `loadState(json)` | Restore chart state |
| `screenshot()` | Download chart as image |
| `on(event, handler)` | Subscribe to events |
| `destroy()` | Clean up all resources |

### Data Format

```typescript
interface OHLCBar {
  time: number    // Unix time in ms or seconds (up to 1e12 is read as seconds); ascending
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
| [Live demo](https://bonguynvan.github.io/tradecanvas/) | Feature Lab: drawing tools, indicators, trading, replay, sub-cent prices + Vietnamese UI, 200k bars, slow-network switching — each on a live chart |
| [StackBlitz sandboxes](https://bonguynvan.github.io/tradecanvas/examples/) | One-click, forkable: vanilla `Chart`, `ChartWidget`, React / Vue / Svelte wrappers, finance charts |
| [`@tradecanvas/react`](https://www.npmjs.com/package/@tradecanvas/react) · [`/vue`](https://www.npmjs.com/package/@tradecanvas/vue) · [`/svelte`](https://www.npmjs.com/package/@tradecanvas/svelte) | Framework components — reactive props, typed, zero boilerplate |

## AI coding tools

- [`llms.txt`](https://bonguynvan.github.io/tradecanvas/llms.txt) and
  [`llms-full.txt`](https://bonguynvan.github.io/tradecanvas/llms-full.txt) give
  assistants the docs in one place.
- An agent skill, [`skills/tradecanvas`](https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/SKILL.md), teaches
  coding agents to build with TradeCanvas: the entry points, the rules that
  avoid most bugs, and worked examples that CI type-checks against the library.
  Copy the folder into your project's `.claude/skills/` (or your agent's skills
  folder) to use it.

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

Two stacked canvases — a hover repaints only the thin top one:

```
  Top canvas    (crosshair + axis pills, legend, countdown, measure)   z=1
  Scene canvas  (grid, candles, indicators, drawings, orders, axes)    z=0
```

## Related projects

- **[bo-grid](https://github.com/bonguynvan/bo-grid)** — tiny, fast **Svelte 5** data grid for fintech UIs: canvas sparklines, batched realtime cell updates, virtual scrolling, grouping / pivot / tree data, and Excel export, with a core that gzips to ~32 KB. The table half of the same toolkit — pair it with TradeCanvas for a full trading desk. **[Live demo](https://bonguynvan.github.io/bo-grid/)**

## License

[MIT](./LICENSE)
