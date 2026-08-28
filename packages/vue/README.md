# @tradecanvas/vue

Vue 3 component for [`@tradecanvas/chart`](https://www.npmjs.com/package/@tradecanvas/chart) — reactive props, template ref, zero boilerplate.

## Install

```bash
npm install @tradecanvas/vue @tradecanvas/chart
```

`vue` (>= 3.3) is a peer dependency.

## Usage

```vue
<script setup lang="ts">
import { TradeCanvas } from '@tradecanvas/vue'
import type { Chart } from '@tradecanvas/chart'

function onReady(chart: Chart) {
  // full charting API
}
</script>

<template>
  <div style="height: 500px">
    <TradeCanvas
      symbol="BTCUSDT"
      timeframe="5m"
      theme="dark"
      :indicators="['rsi', 'macd']"
      @ready="onReady"
    />
  </div>
</template>
```

Streams live Binance data by default. Pass `:data="bars"` for static OHLC, or `:adapter="..."` for any feed.

## Props & events

Props: `symbol`, `timeframe`, `theme`, `chartType`, `indicators`, `data`, `adapter`, `historyLimit`, `features`, `autoScale`, `signalMarkers`, `signalMarkerStyle`, `tradeZones`, `tradeZoneStyle`, `watermarkText`.

Events: `@ready="(chart) => …"`, `@crosshairMove="(payload) => …"`.

## Imperative access

```vue
<script setup lang="ts">
import { ref } from 'vue'
const el = ref()
// el.value.getChart() · el.value.screenshot('chart.png')
</script>

<template>
  <TradeCanvas ref="el" symbol="BTCUSDT" />
</template>
```

Reach the underlying `Chart` (drawings, trading, execution adapters, plugins, resizable panes) via `@ready` or the template ref's `getChart()`. See the [main docs](https://github.com/bonguynvan/tradecanvas).

## License

MIT
