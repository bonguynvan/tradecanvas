<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

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
<p>직접 가진 봉, 입력값이 있는 지표, 그리고 스스로 스트림을 열지 않는 차트:</p>
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
  <thead><tr><th>Prop</th><th>타입</th><th>설명</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>string</code></td><td>스트림의 종목. 기본값 <code>'BTCUSDT'</code>.</td></tr>
    <tr><td><code>timeframe</code></td><td><code>TimeFrame</code></td><td>스트림의 시간 단위. 기본값 <code>'5m'</code>.</td></tr>
    <tr><td><code>theme</code></td><td><code>'dark' | 'light' | Theme</code></td><td>기본값 <code>'dark'</code>.</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartType</code></td><td>기본값 <code>'candlestick'</code>.</td></tr>
    <tr><td><code>data</code></td><td><code>OHLCBar[]</code></td><td>직접 가진 봉을 그대로 보여 줍니다. 마운트할 때 있으면 스트림을 열지 않고, 나중에 주면 열려 있는 스트림은 그대로 둡니다(<code>stream={false}</code>로 닫음).</td></tr>
    <tr><td><code>adapter</code></td><td><code>DataAdapter</code></td><td>스트림의 출처. 없으면 Binance.</td></tr>
    <tr><td><code>stream</code></td><td><code>boolean</code></td><td><code>false</code>: 스트림을 전혀 열지 않고 <code>data</code>를 기다립니다. 기본값 <code>true</code>.</td></tr>
    <tr><td><code>historyLimit</code></td><td><code>number</code></td><td>스트림이 처음 불러오는 봉 수. 기본값 500.</td></tr>
    <tr><td><code>indicators</code></td><td><code>IndicatorSpec[]</code></td><td><code>'rsi'</code> 또는 <code>{'{ id, params, position }'}</code>. 입력값이 바뀐 지표는 새 입력값으로 다시 붙습니다.</td></tr>
    <tr><td><code>features</code></td><td><code>FeaturesConfig</code></td><td>사용자가 차트에서 할 수 있는 일. 마운트 후 변경도 적용됩니다.</td></tr>
    <tr><td><code>signalMarkers / tradeZones</code></td><td><code>배열</code></td><td>매수·매도 표시와 거래. 리플레이는 닿을 때 보여 줍니다.</td></tr>
    <tr><td><code>signalMarkerStyle / tradeZoneStyle</code></td><td><code>스타일</code></td><td>색과 라벨.</td></tr>
    <tr><td><code>overrides</code></td><td><code>ChartStyleOverrides</code></td><td>키로 지정하는 차트 모양(<a href={href('/docs/styling#overrides')}>스타일링</a> 참고).</td></tr>
    <tr><td><code>autoScale</code></td><td><code>boolean</code></td><td>기본값 <code>true</code>.</td></tr>
    <tr><td><code>watermarkText</code></td><td><code>string</code></td><td>봉 뒤의 워터마크 글자.</td></tr>
    <tr><td><code>onReady</code></td><td><code>(chart) =&gt; void</code></td><td>차트가 마운트된 뒤(Vue: <code>ready</code> 이벤트).</td></tr>
  </tbody>
</table>

<blockquote>
  props만으로 부족한가요? <code>onReady</code>, ref(React / Vue), 또는
  <code>bind:chart</code>(Svelte)로 내부 <code>Chart</code>에 접근하면
  그림, 트레이딩, 실행 어댑터, 플러그인, 크기 조절 가능한 패널 등
  전체 API를 사용할 수 있습니다.
</blockquote>
