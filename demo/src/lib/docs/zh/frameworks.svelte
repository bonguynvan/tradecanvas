<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>框架 — TradeCanvas 文档</title>
  <meta name="description" content="TradeCanvas 的 React、Vue 和 Svelte 封装包，提供符合各框架习惯的 props 与 ref。" />
</svelte:head>

<h1>框架封装</h1>
<p>为 React、Vue 和 Svelte 提供符合各自习惯的封装组件。三者暴露相同的 props，并把底层的 <code>Chart</code> 实例交给你。</p>

<h2>安装</h2>
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

<h2>通用 props</h2>
<p>你自己的 K 线、带参数的指标，以及一个从不自行打开数据流的图表：</p>
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
  <thead><tr><th>Prop</th><th>类型</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>string</code></td><td>数据流的交易对。默认 <code>'BTCUSDT'</code>。</td></tr>
    <tr><td><code>timeframe</code></td><td><code>TimeFrame</code></td><td>数据流的周期。默认 <code>'5m'</code>。</td></tr>
    <tr><td><code>theme</code></td><td><code>'dark' | 'light' | Theme</code></td><td>默认 <code>'dark'</code>。</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartType</code></td><td>默认 <code>'candlestick'</code>。</td></tr>
    <tr><td><code>data</code></td><td><code>OHLCBar[]</code></td><td>你自己的 K 线，原样显示。挂载时就提供则不打开数据流；之后才提供，已打开的数据流保持不变（<code>stream={false}</code> 会关闭它）。</td></tr>
    <tr><td><code>adapter</code></td><td><code>DataAdapter</code></td><td>数据流的来源；不提供时使用 Binance。</td></tr>
    <tr><td><code>stream</code></td><td><code>boolean</code></td><td><code>false</code>：完全不打开数据流，图表等待 <code>data</code>。默认 <code>true</code>。</td></tr>
    <tr><td><code>historyLimit</code></td><td><code>number</code></td><td>数据流首先加载的 K 线数。默认 500。</td></tr>
    <tr><td><code>indicators</code></td><td><code>IndicatorSpec[]</code></td><td><code>'rsi'</code>，或 <code>{'{ id, params, position }'}</code>；参数改变的指标会以新参数重新添加。</td></tr>
    <tr><td><code>features</code></td><td><code>FeaturesConfig</code></td><td>用户能在图表上做什么；挂载后的修改同样生效。</td></tr>
    <tr><td><code>signalMarkers / tradeZones</code></td><td><code>数组</code></td><td>买卖标记和交易；回放到达时才显示。</td></tr>
    <tr><td><code>signalMarkerStyle / tradeZoneStyle</code></td><td><code>样式</code></td><td>它们的颜色和标签。</td></tr>
    <tr><td><code>overrides</code></td><td><code>ChartStyleOverrides</code></td><td>按键名设置图表外观（见<a href={href('/docs/styling#overrides')}>样式</a>）。</td></tr>
    <tr><td><code>autoScale</code></td><td><code>boolean</code></td><td>默认 <code>true</code>。</td></tr>
    <tr><td><code>watermarkText</code></td><td><code>string</code></td><td>K 线后面的水印文字。</td></tr>
    <tr><td><code>onReady</code></td><td><code>(chart) =&gt; void</code></td><td>图表挂载之后（Vue：<code>ready</code> 事件）。</td></tr>
  </tbody>
</table>

<blockquote>
  props 不够用？可以通过 <code>onReady</code>、ref（React / Vue）或
  <code>bind:chart</code>（Svelte）拿到底层的 <code>Chart</code>，使用完整 API——
  画线、交易、执行适配器、插件、可调整大小的窗格等等。
</blockquote>
