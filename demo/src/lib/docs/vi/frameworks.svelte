<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Framework — Tài liệu TradeCanvas</title>
  <meta name="description" content="Các gói wrapper React, Vue và Svelte cho TradeCanvas, với props và ref đúng phong cách của từng framework." />
</svelte:head>

<h1>Wrapper cho framework</h1>
<p>Wrapper đúng phong cách cho React, Vue và Svelte. Cả ba có cùng một bộ props và trao cho bạn instance <code>Chart</code> bên dưới.</p>

<h2>Cài đặt</h2>
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

<h2>Props dùng chung</h2>
<p>Nến của riêng bạn, chỉ báo kèm tham số, và một biểu đồ không bao giờ tự mở luồng dữ liệu:</p>
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
  <thead><tr><th>Prop</th><th>Kiểu</th><th>Ghi chú</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>string</code></td><td>Mã của luồng dữ liệu. Mặc định <code>'BTCUSDT'</code>.</td></tr>
    <tr><td><code>timeframe</code></td><td><code>TimeFrame</code></td><td>Khung thời gian của luồng. Mặc định <code>'5m'</code>.</td></tr>
    <tr><td><code>theme</code></td><td><code>'dark' | 'light' | Theme</code></td><td>Mặc định <code>'dark'</code>.</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartType</code></td><td>Mặc định <code>'candlestick'</code>.</td></tr>
    <tr><td><code>data</code></td><td><code>OHLCBar[]</code></td><td>Nến của riêng bạn, hiện đúng như vậy. Có ngay lúc mount thì không mở luồng nào; đưa vào sau thì luồng đang mở vẫn giữ (<code>stream={false}</code> sẽ đóng nó).</td></tr>
    <tr><td><code>adapter</code></td><td><code>DataAdapter</code></td><td>Nguồn của luồng; không có thì dùng Binance.</td></tr>
    <tr><td><code>stream</code></td><td><code>boolean</code></td><td><code>false</code>: không có luồng nào, biểu đồ chờ <code>data</code>. Mặc định <code>true</code>.</td></tr>
    <tr><td><code>historyLimit</code></td><td><code>number</code></td><td>Số nến luồng nạp lúc đầu. Mặc định 500.</td></tr>
    <tr><td><code>indicators</code></td><td><code>IndicatorSpec[]</code></td><td><code>'rsi'</code>, hoặc <code>{'{ id, params, position }'}</code>; chỉ báo nào đổi tham số sẽ được đặt lại với tham số mới.</td></tr>
    <tr><td><code>features</code></td><td><code>FeaturesConfig</code></td><td>Người dùng được làm gì trên biểu đồ; đổi sau khi mount cũng có hiệu lực.</td></tr>
    <tr><td><code>signalMarkers / tradeZones</code></td><td><code>mảng</code></td><td>Điểm mua, bán và lệnh giao dịch; phát lại sẽ hiện chúng khi chạy tới.</td></tr>
    <tr><td><code>signalMarkerStyle / tradeZoneStyle</code></td><td><code>style</code></td><td>Màu và nhãn của chúng.</td></tr>
    <tr><td><code>overrides</code></td><td><code>ChartStyleOverrides</code></td><td>Giao diện biểu đồ theo khoá (xem <a href={href('/docs/styling#overrides')}>Giao diện</a>).</td></tr>
    <tr><td><code>autoScale</code></td><td><code>boolean</code></td><td>Mặc định <code>true</code>.</td></tr>
    <tr><td><code>watermarkText</code></td><td><code>string</code></td><td>Chữ chìm phía sau các nến.</td></tr>
    <tr><td><code>onReady</code></td><td><code>(chart) =&gt; void</code></td><td>Sau khi biểu đồ mount (Vue: sự kiện <code>ready</code>).</td></tr>
  </tbody>
</table>

<blockquote>
  Cần nhiều hơn những gì props cung cấp? Truy cập <code>Chart</code> bên dưới qua
  <code>onReady</code>, một ref (React / Vue) hoặc <code>bind:chart</code> (Svelte)
  để dùng toàn bộ API — hình vẽ, giao dịch, adapter khớp lệnh, plugin, bảng
  đổi được kích thước và nhiều thứ khác.
</blockquote>
