<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

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
<p>自前の足、入力つきのインジケーター、そして自分からストリームを開かないチャート：</p>
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
  <thead><tr><th>Prop</th><th>型</th><th>説明</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>string</code></td><td>ストリームの銘柄。既定は <code>'BTCUSDT'</code>。</td></tr>
    <tr><td><code>timeframe</code></td><td><code>TimeFrame</code></td><td>ストリームの時間足。既定は <code>'5m'</code>。</td></tr>
    <tr><td><code>theme</code></td><td><code>'dark' | 'light' | Theme</code></td><td>既定は <code>'dark'</code>。</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartType</code></td><td>既定は <code>'candlestick'</code>。</td></tr>
    <tr><td><code>data</code></td><td><code>OHLCBar[]</code></td><td>自前の足をそのまま表示します。マウント時にあればストリームは開きません。あとから渡した場合、開いているストリームはそのままです（<code>stream={false}</code> で閉じます）。</td></tr>
    <tr><td><code>adapter</code></td><td><code>DataAdapter</code></td><td>ストリームの取得元。なければ Binance。</td></tr>
    <tr><td><code>stream</code></td><td><code>boolean</code></td><td><code>false</code>：ストリームを一切開かず、<code>data</code> を待ちます。既定は <code>true</code>。</td></tr>
    <tr><td><code>historyLimit</code></td><td><code>number</code></td><td>ストリームが最初に読み込む足の数。既定は 500。</td></tr>
    <tr><td><code>indicators</code></td><td><code>IndicatorSpec[]</code></td><td><code>'rsi'</code>、または <code>{'{ id, params, position }'}</code>。入力が変わったものは新しい入力で付け直します。</td></tr>
    <tr><td><code>features</code></td><td><code>FeaturesConfig</code></td><td>チャート上でユーザーができること。マウント後の変更も反映されます。</td></tr>
    <tr><td><code>signalMarkers / tradeZones</code></td><td><code>配列</code></td><td>売買のマークと取引。リプレイは届いた時点で表示します。</td></tr>
    <tr><td><code>signalMarkerStyle / tradeZoneStyle</code></td><td><code>スタイル</code></td><td>色とラベル。</td></tr>
    <tr><td><code>overrides</code></td><td><code>ChartStyleOverrides</code></td><td>キーで指定するチャートの見た目（<a href={href('/docs/styling#overrides')}>スタイル設定</a>を参照）。</td></tr>
    <tr><td><code>autoScale</code></td><td><code>boolean</code></td><td>既定は <code>true</code>。</td></tr>
    <tr><td><code>watermarkText</code></td><td><code>string</code></td><td>足の背後に出す透かし文字。</td></tr>
    <tr><td><code>onReady</code></td><td><code>(chart) =&gt; void</code></td><td>チャートのマウント後（Vue は <code>ready</code> イベント）。</td></tr>
  </tbody>
</table>

<blockquote>
  props だけでは足りない場合は、<code>onReady</code>、ref（React / Vue）、
  または <code>bind:chart</code>（Svelte）で内部の <code>Chart</code> にアクセスしてください。
  描画、トレーディング、執行アダプター、プラグイン、サイズ変更できるペインなど、
  API のすべてを使えます。
</blockquote>
