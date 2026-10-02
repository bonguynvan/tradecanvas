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
<table>
  <thead><tr><th>Prop</th><th>类型</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>string</code></td><td>必填。</td></tr>
    <tr><td><code>timeframe</code></td><td><code>TimeFrame</code></td><td><code>'1m' | '5m' | '15m' | '1h' | '4h' | '1d'</code></td></tr>
    <tr><td><code>theme</code></td><td><code>ThemeName</code></td><td><code>'dark' | 'light' | 'darkTerminal'</code></td></tr>
    <tr><td><code>adapter</code></td><td><code>DataAdapter</code></td><td>实时数据源。</td></tr>
    <tr><td><code>historyLimit</code></td><td><code>number</code></td><td>初始加载的K线数量。</td></tr>
    <tr><td><code>trading</code></td><td><code>boolean</code></td><td>启用交易图层。</td></tr>
    <tr><td><code>onReady</code></td><td><code>(chart) =&gt; void</code></td><td>图表挂载完成后触发。</td></tr>
  </tbody>
</table>

<blockquote>
  props 不够用？可以通过 <code>onReady</code>、ref（React / Vue）或
  <code>bind:chart</code>（Svelte）拿到底层的 <code>Chart</code>，使用完整 API——
  画线、交易、执行适配器、插件、可调整大小的窗格等等。
</blockquote>
