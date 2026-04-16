# @tradecanvas/chart

High-performance canvas trading chart with built-in indicators, drawing tools, and real-time streaming. Zero external dependencies.

**[Live Demo](https://bonguynvan.github.io/tradecanvas/)** | **[GitHub](https://github.com/bonguynvan/tradecanvas)** | **[npm](https://www.npmjs.com/package/@tradecanvas/chart)**

## Why TradeCanvas?

Most chart libraries make you choose: pretty charts with no trading features, or trading features with an ugly API. TradeCanvas gives you both.

- **20+ built-in indicators** — MA, EMA, RSI, MACD, Bollinger, Ichimoku, and more. No separate calculation library needed.
- **10+ drawing tools** — Trendlines, Fibonacci retracement, horizontal/vertical lines, rectangles, channels, Elliott waves, Gann fans. With undo/redo.
- **Trading overlay** — Render open positions with entry line, P&L zone, and SL/TP markers. Orders as dashed lines. Users can drag SL/TP to modify.
- **Real-time streaming** — Built-in Binance adapter. Plug in your own data source with the adapter interface.
- **Save/load chart state** — Persist drawings, indicators, theme, and chart type to JSON. Restore with one call.
- **Replay mode** — Step through historical data bar-by-bar for backtesting visualization.
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

```typescript
import { Chart, BinanceAdapter } from '@tradecanvas/chart'

// Create a chart
const chart = new Chart(document.getElementById('chart')!, {
  theme: 'dark',
  autoScale: true,
  features: {
    drawings: true,
    indicators: true,
    trading: true,
    volume: true,
  },
})

// Connect to live Binance data
const adapter = new BinanceAdapter()
chart.connect({
  adapter,
  symbol: 'BTCUSDT',
  timeframe: '5m',
  historyLimit: 300,
})
```

That's it. A full-featured trading chart with live data in 15 lines.

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
SMA, EMA, Bollinger Bands, Keltner Channel, Donchian Channel, Ichimoku Cloud, Parabolic SAR, Supertrend, VWAP

**Panel** (separate sub-chart):
RSI, MACD, Stochastic, ATR, ADX, CCI, CMF, MFI, OBV, ROC, TSI, Williams %R, Volume Profile, VROC, Standard Deviation, Accumulation/Distribution, Aroon

### Drawing Tools

Trendline, Horizontal Line, Vertical Line, Ray, Extended Line, Parallel Channel, Fibonacci Retracement, Fibonacci Extension, Rectangle, Ellipse, Triangle, Arrow, Pitchfork, Gann Fan, Gann Box, Elliott Wave, Regression Channel, Date Range, Price Range, Measure, Anchored VWAP, Volume Profile Range, Text Annotation

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

// Listen for user drag-to-modify
chart.on('positionModify', (e) => console.log('SL/TP moved:', e.payload))
chart.on('orderModify', (e) => console.log('Order moved:', e.payload))
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
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/chart'

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

```typescript
chart.replayStart({ data: historicalBars, speed: 2, startIndex: 100 })
chart.replayPause()
chart.replayResume()
chart.replayStop()
const { current, total, percent } = chart.getReplayProgress()
```

## Comparison

| Feature | @tradecanvas/chart | lightweight-charts | chart.js | Highcharts Stock |
|---|---|---|---|---|
| Chart types | 11 + 4 finance | 4 | 8 (non-financial) | 10+ |
| Finance charts | Sparkline, Depth, Equity, Heatmap | None | None | Some |
| Built-in indicators | 20+ | 0 | 0 | ~30 |
| Drawing tools | 23 | 0 | 0 | Some |
| Trading overlay | Full (pos + orders + drag) | None | None | None |
| Real-time streaming | Built-in (Binance) | Manual | Manual | Built-in |
| Save/load state | Yes | No | No | Yes |
| Replay mode | Yes | No | No | No |
| Multi-panel | Yes | No | No | Yes |
| Bundle (gzip) | ~50 KB | ~45 KB | ~70 KB | ~200 KB |
| Dependencies | 0 | 1 | 0 | 0 |
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
| `updateLastBar(bar)` | Update the in-progress candle |
| `setCurrentPrice(price)` | Show a live price line |
| `connect(config)` | Connect to a real-time data source |
| `setChartType(type)` | Switch chart type |
| `setTheme(theme)` | Apply a theme |
| `addIndicator(id, params?)` | Add a technical indicator |
| `removeIndicator(instanceId)` | Remove an indicator |
| `setDrawingTool(tool)` | Activate a drawing tool |
| `setPositions(positions)` | Render trading positions |
| `setOrders(orders)` | Render pending orders |
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
