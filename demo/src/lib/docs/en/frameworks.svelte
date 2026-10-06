<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

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
<pre><code>{'<' + `script setup lang="ts">
import { TradeCanvas } from '@tradecanvas/vue'
import { BinanceAdapter } from '@tradecanvas/chart'

const adapter = new BinanceAdapter()
` + '<' + `/script>

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
<pre><code>{'<' + `script lang="ts">
  import { TradeCanvas } from '@tradecanvas/svelte'
  import { BinanceAdapter } from '@tradecanvas/chart'

  const adapter = new BinanceAdapter()
` + '<' + `/script>

<TradeCanvas
  symbol="BTCUSDT"
  timeframe="5m"
  theme="dark"
  {adapter}
  onReady={(chart) => console.log('ready', chart)}
/>`}</code></pre>

<h2>Shared props</h2>
<p>Bars of your own, indicators with their inputs, and a chart that never opens a stream of its own:</p>
<pre><code>{'<' + `script lang="ts">
  import { TradeCanvas } from '@tradecanvas/svelte'
  import type { Chart } from '@tradecanvas/chart'

  let { bars } = $props()
  let chart = $state<Chart | null>(null)
` + '<' + `/script>

<TradeCanvas
  data={bars}
  stream={false}
  indicators={['rsi', { id: 'ema', params: { period: 50 } }]}
  features={{ replay: true }}
  bind:chart
/>`}</code></pre>
<table>
  <thead><tr><th>Prop</th><th>Type</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>string</code></td><td>The stream's symbol. Default <code>'BTCUSDT'</code>.</td></tr>
    <tr><td><code>timeframe</code></td><td><code>TimeFrame</code></td><td>The stream's interval. Default <code>'5m'</code>.</td></tr>
    <tr><td><code>theme</code></td><td><code>'dark' | 'light' | Theme</code></td><td>Default <code>'dark'</code>.</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartType</code></td><td>Default <code>'candlestick'</code>.</td></tr>
    <tr><td><code>data</code></td><td><code>OHLCBar[]</code></td><td>Bars of your own, shown as they are. Given at mount, no stream is opened; given later, a stream already open stays (<code>stream={false}</code> closes it).</td></tr>
    <tr><td><code>adapter</code></td><td><code>DataAdapter</code></td><td>The stream's source; Binance without one.</td></tr>
    <tr><td><code>stream</code></td><td><code>boolean</code></td><td><code>false</code>: no stream at all, the chart waits for <code>data</code>. Default <code>true</code>.</td></tr>
    <tr><td><code>historyLimit</code></td><td><code>number</code></td><td>Bars the stream loads first. Default 500.</td></tr>
    <tr><td><code>indicators</code></td><td><code>IndicatorSpec[]</code></td><td><code>'rsi'</code>, or <code>{'{ id, params, position }'}</code>; one whose inputs change is put back with them.</td></tr>
    <tr><td><code>features</code></td><td><code>FeaturesConfig</code></td><td>What users can do on the chart; changes after mount apply too.</td></tr>
    <tr><td><code>signalMarkers / tradeZones</code></td><td><code>arrays</code></td><td>Buy and sell marks and trades; a replay shows them as it reaches them.</td></tr>
    <tr><td><code>signalMarkerStyle / tradeZoneStyle</code></td><td><code>styles</code></td><td>Their colours and labels.</td></tr>
    <tr><td><code>overrides</code></td><td><code>ChartStyleOverrides</code></td><td>The chart's look by key (see <a href={href('/docs/styling#overrides')}>Styling</a>).</td></tr>
    <tr><td><code>autoScale</code></td><td><code>boolean</code></td><td>Default <code>true</code>.</td></tr>
    <tr><td><code>watermarkText</code></td><td><code>string</code></td><td>Text behind the bars.</td></tr>
    <tr><td><code>onReady</code></td><td><code>(chart) =&gt; void</code></td><td>After the chart mounts (Vue: the <code>ready</code> event).</td></tr>
  </tbody>
</table>

<blockquote>
  Need something beyond the props? Reach the underlying <code>Chart</code> via
  <code>onReady</code>, a ref (React / Vue), or <code>bind:chart</code> (Svelte)
  for the full API — drawings, trading, execution adapters, plugins, resizable
  panes, and more.
</blockquote>
