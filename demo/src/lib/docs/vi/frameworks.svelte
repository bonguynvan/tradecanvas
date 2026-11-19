<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Framework — Tài liệu TradeCanvas</title>
  <meta name="description" content="Các package wrapper React, Vue và Svelte cho TradeCanvas, với props và ref theo cách viết của từng framework." />
</svelte:head>

<h1>Wrapper cho framework</h1>
<p>Wrapper cho React, Vue và Svelte, viết theo cách quen thuộc của từng framework. Cả ba có cùng bộ props và trả về instance <code>Chart</code> bên dưới.</p>

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
<p>Dữ liệu nến của riêng bạn, chỉ báo kèm tham số, và một biểu đồ không tự mở stream:</p>
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
    <tr><td><code>symbol</code></td><td><code>string</code></td><td>Mã của stream. Mặc định <code>'BTCUSDT'</code>.</td></tr>
    <tr><td><code>timeframe</code></td><td><code>TimeFrame</code></td><td>Khung thời gian của stream. Mặc định <code>'5m'</code>.</td></tr>
    <tr><td><code>theme</code></td><td><code>'dark' | 'light' | Theme</code></td><td>Mặc định <code>'dark'</code>.</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartType</code></td><td>Mặc định <code>'candlestick'</code>.</td></tr>
    <tr><td><code>data</code></td><td><code>OHLCBar[]</code></td><td>Nến của riêng bạn, hiển thị nguyên trạng. Truyền lúc mount thì không mở stream; truyền sau đó thì stream đang mở vẫn giữ (<code>stream={'{'}false{'}'}</code> đóng stream). Nến nối tiếp các nến đã truyền trước đó (nến cuối thay đổi, hoặc nến thêm sau nó) được đưa vào như tick trực tiếp và view không bị reset, ở cả ba wrapper: khi truyền một mảng mới (<code>[...bars, next]</code>), và với Vue và Svelte, cả khi push vào hoặc sửa chính mảng đó. Thay đổi ở một trong ba nến cuối trước nến đang hình thành, cùng thời gian, được đưa vào như một bản sửa (<code>updateBar</code>), nên view cũng không bị reset: với mảng mới ở cả ba wrapper, và với Vue và Svelte, cả khi sửa tại chỗ. Mọi trường hợp khác là một series mới, kể cả nến của bạn sau khi stream đã đưa nến của nó vào biểu đồ.</td></tr>
    <tr><td><code>adapter</code></td><td><code>DataAdapter</code></td><td>Nguồn của stream; không truyền thì dùng Binance.</td></tr>
    <tr><td><code>stream</code></td><td><code>boolean</code></td><td><code>false</code>: không có stream, biểu đồ chờ <code>data</code>. Mặc định <code>true</code>.</td></tr>
    <tr><td><code>historyLimit</code></td><td><code>number</code></td><td>Số nến stream tải ban đầu. Mặc định 500.</td></tr>
    <tr><td><code>indicators</code></td><td><code>IndicatorSpec[]</code></td><td><code>'rsi'</code>, hoặc <code>{'{ id, params, position }'}</code>; chỉ báo có tham số thay đổi được thêm lại với tham số mới.</td></tr>
    <tr><td><code>features</code></td><td><code>FeaturesConfig</code></td><td>Những thao tác người dùng được làm trên biểu đồ; thay đổi sau khi mount cũng được áp dụng.</td></tr>
    <tr><td><code>signalMarkers / tradeZones</code></td><td><code>arrays</code></td><td>Điểm mua, bán và các giao dịch; replay hiện chúng khi chạy tới.</td></tr>
    <tr><td><code>signalMarkerStyle / tradeZoneStyle</code></td><td><code>styles</code></td><td>Màu và nhãn của chúng.</td></tr>
    <tr><td><code>overrides</code></td><td><code>ChartStyleOverrides</code></td><td>Giao diện biểu đồ theo key (xem <a href={href('/docs/styling#overrides')}>Styling</a>).</td></tr>
    <tr><td><code>autoScale</code></td><td><code>boolean</code></td><td>Mặc định <code>true</code>.</td></tr>
    <tr><td><code>watermarkText</code></td><td><code>string</code></td><td>Chữ nằm phía sau nến.</td></tr>
    <tr><td><code>options</code></td><td><code>Partial&lt;ChartOptions&gt;</code></td><td>Tuỳ chọn biểu đồ mà props không có (<code>maxBarSpacing</code>, <code>rightMargin</code>, <code>renderer</code>…), gộp đè lên giá trị mặc định của component lúc mount. Thay đổi sau đó không được áp dụng; <code>chartType</code>, <code>theme</code> và <code>autoScale</code> luôn lấy từ prop tương ứng.</td></tr>
    <tr><td><code>onReady</code></td><td><code>(chart) =&gt; void</code></td><td>Gọi sau khi biểu đồ mount (Vue: event <code>ready</code>).</td></tr>
  </tbody>
</table>

<blockquote>
  Cần nhiều hơn props? Lấy <code>Chart</code> bên dưới qua
  <code>onReady</code>, một ref (React / Vue), hoặc <code>bind:chart</code> (Svelte)
  để dùng toàn bộ API — hình vẽ, giao dịch, execution adapter, plugin, pane
  đổi được kích thước, và các phần khác.
</blockquote>

<h2 id="powered-by">Badge Powered by</h2>
<p>Để ghi nguồn TradeCanvas trong ứng dụng, đặt badge: dòng chữ, biểu tượng TC và wordmark gộp thành một link tới tradecanvas.dev, được trình đọc màn hình đọc là “Powered by TradeCanvas”. Badge lấy màu chữ của vùng xung quanh, nên theo được theme sáng hoặc tối; chỉ cây nến trong biểu tượng giữ màu hổ phách của thương hiệu.</p>
<pre><code>{'<' + `script lang="ts">
  import { PoweredBy } from '@tradecanvas/svelte'
` + '<' + `/script>

<PoweredBy size={14} />`}</code></pre>

<pre><code>{`import { createPoweredBy } from '@tradecanvas/chart/brand'

statusBar.append(createPoweredBy({ height: 14 }))`}</code></pre>
<p><code>size</code> (Svelte) hoặc <code>height</code> là chiều cao của biểu tượng tính bằng pixel, tối thiểu 12: 14–16 hợp với thanh trạng thái, 24 hợp với footer. Dòng chữ dùng font của trang và không nhỏ hơn 10 px. <code>href</code> và <code>target</code> (mặc định <code>_blank</code>) gán cho link; <code>poweredByHtml()</code> trả về markup, còn <code>TRADECANVAS_MARK_SVG</code> và <code>TRADECANVAS_WORDMARK_SVG</code> trả về riêng hình.</p>
<p>Badge có entry riêng, <code>@tradecanvas/chart/brand</code>, không kéo theo phần nào của biểu đồ, nên một trang chỉ hiện badge mà không có biểu đồ, ví dụ footer của landing page, chỉ nặng vài kilobyte. Entry chính export cùng các tên này. <code>PoweredBy</code> của Svelte import từ entry đó.</p>
