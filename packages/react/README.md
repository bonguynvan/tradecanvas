# @tradecanvas/react

React component for [`@tradecanvas/chart`](https://www.npmjs.com/package/@tradecanvas/chart) — reactive props, ref forwarding, zero boilerplate.

## Install

```bash
npm install @tradecanvas/react @tradecanvas/chart
```

`react` (>= 18) and `react-dom` are peer dependencies.

## Usage

```tsx
import { TradeCanvas } from '@tradecanvas/react'

export function Chart() {
  return (
    <div style={{ height: 500 }}>
      <TradeCanvas symbol="BTCUSDT" timeframe="5m" theme="dark" indicators={['rsi', 'macd']} />
    </div>
  )
}
```

Streams live Binance data by default. Pass `data={bars}` for static OHLC, or `adapter={...}` for any feed (`CoinbaseAdapter`, `BybitAdapter`, `KrakenAdapter`, or your own).

## Props

`symbol`, `timeframe`, `theme` (`'dark'` | `'light'` | `Theme`), `chartType`, `indicators`, `data`, `adapter`, `historyLimit`, `features`, `autoScale`, `signalMarkers`, `signalMarkerStyle`, `tradeZones`, `tradeZoneStyle`, `watermarkText`, `onReady(chart)`, `onCrosshairMove`, `className`, `style`.

## Imperative access

```tsx
import { useRef } from 'react'
import { TradeCanvas, type TradeCanvasRef } from '@tradecanvas/react'

const ref = useRef<TradeCanvasRef>(null)
ref.current?.getChart()             // the underlying Chart — full API
ref.current?.screenshot('chart.png')
```

Reach the underlying `Chart` (drawings, trading, execution adapters, plugins, drag-to-create orders, resizable panes) via `onReady` or `ref.getChart()`. See the [main docs](https://github.com/bonguynvan/tradecanvas).

## License

MIT
