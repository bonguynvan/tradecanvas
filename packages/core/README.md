# @tradecanvas/core

Canvas rendering engine, indicators, drawing tools, trading overlays, and real-time streaming for the [@tradecanvas/chart](https://www.npmjs.com/package/@tradecanvas/chart) library.

**[Live Demo](https://tradecanvas.dev/)** | **[GitHub](https://github.com/bonguynvan/tradecanvas)** | **[Documentation](https://tradecanvas.dev/docs/getting-started/)**

## Install

You don't need to install this package directly. It's included as a dependency of `@tradecanvas/chart`.

```bash
npm install @tradecanvas/chart
```

## What's Inside

### Rendering Engine

Two stacked canvases — a hover repaints only the thin top one:

```
  Top canvas    (crosshair + axis pills, legend, countdown, measure)   z=1
  Scene canvas  (grid, candles, indicators, drawings, orders, axes)    z=0
```

- `RenderEngine` -- orchestrates the render pipeline
- `LayerManager` -- the scene and top canvases
- `RenderLoop` -- requestAnimationFrame loop with dirty tracking
- `DPRManager` -- device pixel ratio handling for crisp rendering

### Chart Renderers (17 types)

`CandlestickRenderer`, `HollowCandleRenderer`, `BarRenderer`, `LineRenderer`, `AreaRenderer`, `BaselineRenderer`, `RenkoRenderer`, `KagiRenderer`, `PointAndFigureRenderer`, `VolumeRenderer`, `VolumeCandleRenderer`, `EquivolumeRenderer`, `HLCAreaRenderer`, `StepLineRenderer`, `LineWithMarkersRenderer`, `CompareRenderer`. Heikin-Ashi, Line Break, and Range Bars reuse `CandlestickRenderer` against transformed data.

Data transforms: `toHeikinAshi`, `toRenko`, `toLineBreak`, `toKagi`, `toPointAndFigure`, `toRangeBars` (and `pointAndFigureColumns`, the columns of `toPointAndFigure` with the box they were built on, to draw them that size)

### Indicators (134 built-in)

Moving averages, bands and channels, trend and stops, VWAPs and profiles on the price pane; oscillators, volume and volatility indicators in panes of their own. Every id with its inputs, lines and levels is in the [indicator catalog](https://tradecanvas.dev/docs/indicators). Four more read a second symbol's bars (`compareSymbol`, `spread`, `correlation`, `correlationlog`); `@tradecanvas/chart`'s `Chart` registers them with its symbol store.

Indicator parameters are read through `getNumberParam` / `getIntParam` helpers, so invalid values (NaN, Infinity, missing keys, non-numeric strings) safely fall back to defaults instead of producing NaN-laced calculations.

Extensible via `IndicatorBase` for custom indicators.

### Indicator math in a worker

`IndicatorWorkerHost` wraps a `Worker` you create and exposes a Promise-based `calculate()`, with a per-request timeout and a `ping()` health check:

```ts
import { IndicatorWorkerHost } from '@tradecanvas/core'

// Your own worker, built from src/indicators/worker/indicator.worker.ts in the repository
const worker = new Worker(new URL('./indicator.worker.ts', import.meta.url), { type: 'module' })
const host = new IndicatorWorkerHost(worker)
const output = await host.calculate('rsi', config, bars)
```

Pass `null` instead of a worker to calculate synchronously (SSR, tests). The package does not ship a built worker script, and the chart computes its own indicators on the main thread; it does not route them through this host yet.

### Drawing Tools (24)

Trendline, Horizontal/Vertical Lines, Ray, Extended Line, Parallel Channel, Fibonacci Retracement / Extension / **Time Zones** *(new in 0.8)*, Rectangle, Ellipse, Triangle, Arrow, Pitchfork, Gann Fan/Box, Elliott Wave, Regression Channel, Date/Price Range, Measure, Anchored VWAP, Volume Profile Range, Text Annotation

All tools support magnet snapping, undo/redo, and serialization. Extensible via `DrawingBase`.

### Trading

- `TradingManager` -- manage positions and orders
- `TradingRenderer` -- render entry lines, P&L zones, SL/TP markers
- `OrderRenderer` -- render pending orders with drag-to-modify
- `DepthOverlay` -- bid/ask depth visualization

### Real-Time Streaming

- `StreamManager` -- manage data connections with auto-reconnect
- `BinanceAdapter` -- built-in Binance WebSocket adapter
- `MockAdapter` -- testing and demo data
- `TickAggregator` -- aggregate raw ticks into OHLC bars
- `ReconnectManager` -- exponential backoff reconnection

### Interaction

- Pan, zoom (wheel/pinch), crosshair tracking
- Keyboard shortcuts (arrows, +/-, Home/End, Space)
- Drawing tool interaction with magnet snapping

### Features

- `AlertManager` -- price and indicator alerts
- `ReplayManager` -- bar-by-bar historical replay (Chart-tied)
- `ReplayController` *(new in 0.8)* -- headless replay decoupled from Chart; powers backtest visualization
- `ChartStateManager` -- save/load chart state as JSON
- `UndoRedoManager` -- undo/redo for drawings
- `DataExporter` -- export visible/all data as CSV or JSON

### UI

- `ChartLegend` -- OHLCV overlay display
- `Screenshot` -- export chart as PNG
- `Watermark` -- background text watermark
- `BarCountdown` -- time until candle close
- `SessionBreaks` -- market session visualization

## License

[MIT](https://github.com/bonguynvan/tradecanvas/blob/main/LICENSE)
