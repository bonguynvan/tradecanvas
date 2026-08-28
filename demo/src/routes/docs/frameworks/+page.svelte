<svelte:head>
  <title>Frameworks — TradeCanvas docs</title>
  <meta name="description" content="React, Vue, and Svelte wrapper packages for TradeCanvas with idiomatic props and refs." />
</svelte:head>

<h1>Framework wrappers</h1>
<p>Idiomatic wrappers for React, Vue, and Svelte. All three expose the same prop surface and hand you the underlying <code>Chart</code> instance.</p>

<h2>Install</h2>
<pre><code>{`npm install @tradecanvas/react   # or @tradecanvas/vue · @tradecanvas/svelte
npm install @tradecanvas/chart   # the core (peer of each wrapper)`}</code></pre>

<h2>React</h2>
<pre><code>{`import { TradeCanvas, type TradeCanvasRef } from '@tradecanvas/react'
import { BinanceAdapter } from '@tradecanvas/chart'
import { useRef } from 'react'

function App() {
  const chartRef = useRef<TradeCanvasRef>(null)

  return (
    <TradeCanvas
      ref={chartRef}
      symbol="BTCUSDT"
      timeframe="5m"
      theme="dark"
      adapter={new BinanceAdapter()}
      onReady={(chart) => {
        chart.on('orderPlace', e => console.log(e.payload))
      }}
    />
  )
}`}</code></pre>

<h2>Vue</h2>
<pre><code>{`<script setup lang="ts">
import { TradeCanvas } from '@tradecanvas/vue'
import { BinanceAdapter } from '@tradecanvas/chart'

const adapter = new BinanceAdapter()
</script>

<template>
  <TradeCanvas
    symbol="BTCUSDT"
    timeframe="5m"
    theme="dark"
    :adapter="adapter"
    @ready="(chart) => console.log('ready', chart)"
  />
</template>`}</code></pre>

<h2>Svelte</h2>
<pre><code>{`<script lang="ts">
  import { TradeCanvas } from '@tradecanvas/svelte'
  import { BinanceAdapter } from '@tradecanvas/chart'

  const adapter = new BinanceAdapter()
</script>

<TradeCanvas
  symbol="BTCUSDT"
  timeframe="5m"
  theme="dark"
  {adapter}
  onReady={(chart) => console.log('ready', chart)}
/>`}</code></pre>

<h2>Shared props</h2>
<table>
  <thead><tr><th>Prop</th><th>Type</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>string</code></td><td>Required.</td></tr>
    <tr><td><code>timeframe</code></td><td><code>TimeFrame</code></td><td><code>'1m' | '5m' | '15m' | '1h' | '4h' | '1d'</code></td></tr>
    <tr><td><code>theme</code></td><td><code>ThemeName</code></td><td><code>'dark' | 'light' | 'darkTerminal'</code></td></tr>
    <tr><td><code>adapter</code></td><td><code>DataAdapter</code></td><td>Live stream source.</td></tr>
    <tr><td><code>historyLimit</code></td><td><code>number</code></td><td>Initial bars to load.</td></tr>
    <tr><td><code>trading</code></td><td><code>boolean</code></td><td>Enable trading overlay.</td></tr>
    <tr><td><code>onReady</code></td><td><code>(chart) =&gt; void</code></td><td>Fires after the chart mounts.</td></tr>
  </tbody>
</table>

<blockquote>
  Need something beyond the props? Reach the underlying <code>Chart</code> via
  <code>onReady</code>, a ref (React / Vue), or <code>bind:chart</code> (Svelte)
  for the full API — drawings, trading, execution adapters, plugins, resizable
  panes, and more.
</blockquote>
