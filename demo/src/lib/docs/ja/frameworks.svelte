<svelte:head>
  <title>フレームワーク — TradeCanvas ドキュメント</title>
  <meta name="description" content="TradeCanvas 用の React、Vue、Svelte ラッパーパッケージ。各フレームワークに沿った props と ref を備えています。" />
</svelte:head>

<h1>フレームワーク用ラッパー</h1>
<p>React、Vue、Svelte のそれぞれの流儀に沿ったラッパーです。3 つとも同じ props を公開し、内部の <code>Chart</code> インスタンスを受け取れます。</p>

<h2>インストール</h2>
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

<h2>共通の props</h2>
<table>
  <thead><tr><th>プロパティ</th><th>型</th><th>備考</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>string</code></td><td>必須。</td></tr>
    <tr><td><code>timeframe</code></td><td><code>TimeFrame</code></td><td><code>'1m' | '5m' | '15m' | '1h' | '4h' | '1d'</code></td></tr>
    <tr><td><code>theme</code></td><td><code>ThemeName</code></td><td><code>'dark' | 'light' | 'darkTerminal'</code></td></tr>
    <tr><td><code>adapter</code></td><td><code>DataAdapter</code></td><td>ライブストリームのデータソース。</td></tr>
    <tr><td><code>historyLimit</code></td><td><code>number</code></td><td>最初に読み込むバーの本数。</td></tr>
    <tr><td><code>trading</code></td><td><code>boolean</code></td><td>トレーディングオーバーレイを有効にします。</td></tr>
    <tr><td><code>onReady</code></td><td><code>(chart) =&gt; void</code></td><td>チャートのマウント後に呼ばれます。</td></tr>
  </tbody>
</table>

<blockquote>
  props だけでは足りない場合は、<code>onReady</code>、ref（React / Vue）、
  または <code>bind:chart</code>（Svelte）で内部の <code>Chart</code> にアクセスしてください。
  描画、トレーディング、執行アダプター、プラグイン、サイズ変更できるペインなど、
  API のすべてを使えます。
</blockquote>
