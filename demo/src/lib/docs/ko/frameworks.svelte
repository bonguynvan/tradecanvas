<svelte:head>
  <title>프레임워크 — TradeCanvas 문서</title>
  <meta name="description" content="각 프레임워크에 맞는 props와 ref를 제공하는 TradeCanvas용 React, Vue, Svelte 래퍼 패키지." />
</svelte:head>

<h1>프레임워크 래퍼</h1>
<p>React, Vue, Svelte에 맞게 만든 래퍼입니다. 세 래퍼 모두 같은 props를 제공하며, 내부의 <code>Chart</code> 인스턴스를 넘겨줍니다.</p>

<h2>설치</h2>
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

<h2>공통 props</h2>
<table>
  <thead><tr><th>Prop</th><th>타입</th><th>비고</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>string</code></td><td>필수.</td></tr>
    <tr><td><code>timeframe</code></td><td><code>TimeFrame</code></td><td><code>'1m' | '5m' | '15m' | '1h' | '4h' | '1d'</code></td></tr>
    <tr><td><code>theme</code></td><td><code>ThemeName</code></td><td><code>'dark' | 'light' | 'darkTerminal'</code></td></tr>
    <tr><td><code>adapter</code></td><td><code>DataAdapter</code></td><td>실시간 스트림 소스.</td></tr>
    <tr><td><code>historyLimit</code></td><td><code>number</code></td><td>처음에 불러올 봉 수.</td></tr>
    <tr><td><code>trading</code></td><td><code>boolean</code></td><td>트레이딩 오버레이를 활성화합니다.</td></tr>
    <tr><td><code>onReady</code></td><td><code>(chart) =&gt; void</code></td><td>차트가 마운트된 후 호출됩니다.</td></tr>
  </tbody>
</table>

<blockquote>
  props만으로 부족한가요? <code>onReady</code>, ref(React / Vue), 또는
  <code>bind:chart</code>(Svelte)로 내부 <code>Chart</code>에 접근하면
  그림, 트레이딩, 실행 어댑터, 플러그인, 크기 조절 가능한 패널 등
  전체 API를 사용할 수 있습니다.
</blockquote>
