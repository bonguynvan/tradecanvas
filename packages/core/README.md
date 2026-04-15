# @tradecanvas/core

Canvas rendering engine, indicators, drawing tools, trading overlays, and real-time streaming for the [@tradecanvas/chart](https://www.npmjs.com/package/@tradecanvas/chart) library.

**[Live Demo](https://bonguynvan.github.io/tradecanvas/)** | **[GitHub](https://github.com/bonguynvan/tradecanvas)** | **[Documentation](https://bonguynvan.github.io/tradecanvas/#getting-started)**

## Install

You don't need to install this package directly. It's included as a dependency of `@tradecanvas/chart`.

```bash
npm install @tradecanvas/chart
```

## What's Inside

### Rendering Engine

Multi-layer canvas rendering for optimal performance -- only dirty layers repaint each frame:

```
  UI Layer      (price axis, legend, live price)      z=3
  Overlay Layer (drawings, trading positions/orders)  z=2
  Main Layer    (candles, indicators, volume)          z=1
  Background    (grid, watermark)                      z=0
```

- `RenderEngine` -- orchestrates the render pipeline
- `LayerManager` -- manages canvas layer stack
- `RenderLoop` -- requestAnimationFrame loop with dirty tracking
- `DPRManager` -- device pixel ratio handling for crisp rendering

### Chart Renderers (11 types)

`CandlestickRenderer`, `HollowCandleRenderer`, `BarRenderer`, `LineRenderer`, `AreaRenderer`, `BaselineRenderer`, `RenkoRenderer`, `KagiRenderer`, `PointAndFigureRenderer`, `VolumeRenderer`, `CompareRenderer`

Data transforms: `toHeikinAshi`, `toRenko`, `toLineBreak`, `toKagi`, `toPointAndFigure`

### Indicators (26 built-in)

**Overlay** (on price chart): SMA, EMA, Bollinger Bands, Keltner Channel, Donchian Channel, Ichimoku Cloud, Parabolic SAR, Supertrend, VWAP

**Panel** (separate sub-chart): RSI, MACD, Stochastic, ATR, ADX, CCI, CMF, MFI, OBV, ROC, TSI, Williams %R, Volume Profile, VROC, Standard Deviation, Accumulation/Distribution, Aroon

Extensible via `IndicatorBase` for custom indicators.

### Drawing Tools (23)

Trendline, Horizontal/Vertical Lines, Ray, Extended Line, Parallel Channel, Fibonacci Retracement/Extension, Rectangle, Ellipse, Triangle, Arrow, Pitchfork, Gann Fan/Box, Elliott Wave, Regression Channel, Date/Price Range, Measure, Anchored VWAP, Volume Profile Range, Text Annotation

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
- `ReplayManager` -- bar-by-bar historical replay
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
