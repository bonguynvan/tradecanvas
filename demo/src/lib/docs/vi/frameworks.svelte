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
<table>
  <thead><tr><th>Prop</th><th>Kiểu</th><th>Ghi chú</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>string</code></td><td>Bắt buộc.</td></tr>
    <tr><td><code>timeframe</code></td><td><code>TimeFrame</code></td><td><code>'1m' | '5m' | '15m' | '1h' | '4h' | '1d'</code></td></tr>
    <tr><td><code>theme</code></td><td><code>ThemeName</code></td><td><code>'dark' | 'light' | 'darkTerminal'</code></td></tr>
    <tr><td><code>adapter</code></td><td><code>DataAdapter</code></td><td>Nguồn dữ liệu trực tiếp.</td></tr>
    <tr><td><code>historyLimit</code></td><td><code>number</code></td><td>Số nến tải ban đầu.</td></tr>
    <tr><td><code>trading</code></td><td><code>boolean</code></td><td>Bật lớp phủ giao dịch.</td></tr>
    <tr><td><code>onReady</code></td><td><code>(chart) =&gt; void</code></td><td>Chạy sau khi biểu đồ được gắn vào trang.</td></tr>
  </tbody>
</table>

<blockquote>
  Cần nhiều hơn những gì props cung cấp? Truy cập <code>Chart</code> bên dưới qua
  <code>onReady</code>, một ref (React / Vue) hoặc <code>bind:chart</code> (Svelte)
  để dùng toàn bộ API — hình vẽ, giao dịch, adapter khớp lệnh, plugin, bảng
  đổi được kích thước và nhiều thứ khác.
</blockquote>
