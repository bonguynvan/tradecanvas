# @tradecanvas/svelte

Svelte 5 component for [`@tradecanvas/chart`](https://www.npmjs.com/package/@tradecanvas/chart) — reactive props, runes, zero boilerplate.

## Install

```bash
npm install @tradecanvas/svelte @tradecanvas/chart
```

`svelte` (>= 5) is a peer dependency.

## Usage

```svelte
<script lang="ts">
  import { TradeCanvas } from '@tradecanvas/svelte'
  import type { Chart } from '@tradecanvas/chart'

  let chart = $state<Chart | null>(null)
</script>

<div style="height: 500px">
  <TradeCanvas
    symbol="BTCUSDT"
    timeframe="5m"
    theme="dark"
    indicators={['rsi', 'macd']}
    bind:chart
  />
</div>
```

Streams live Binance data by default. Pass `data={bars}` for static OHLC, or `adapter={...}` for any feed. `bind:chart` gives you the underlying `Chart` (or use `onReady`).

## Props

`symbol`, `timeframe`, `theme`, `chartType`, `indicators` (ids, or `{ id, params, position }`), `data` (bars of your own; no stream), `adapter`, `stream` (`false`: no stream of its own), `historyLimit`, `features` (changes apply after mount too), `autoScale`, `signalMarkers`, `signalMarkerStyle`, `tradeZones`, `tradeZoneStyle`, `overrides` (style overrides by key, all of your app's), `watermarkText`, `onReady`, and `bind:chart`.

Reach the underlying `Chart` (drawings, trading, execution adapters, plugins, resizable panes) via `bind:chart` or `onReady`. See the [main docs](https://github.com/bonguynvan/tradecanvas).

## License

MIT
