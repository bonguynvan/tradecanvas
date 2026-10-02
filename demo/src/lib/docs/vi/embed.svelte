<script lang="ts">
  import { base } from '$app/paths';
</script>

<svelte:head>
  <title>Widget nhúng — Tài liệu TradeCanvas</title>
  <meta name="description" content="Nhúng một biểu đồ giao dịch đã cấu hình đầy đủ vào bất kỳ trang nào chỉ bằng một URL iframe." />
</svelte:head>

<h1>Widget nhúng</h1>
<p>
  Đưa một biểu đồ giao dịch đã cấu hình đầy đủ vào bất kỳ trang nào chỉ bằng một URL
  <code>&lt;iframe&gt;</code>. Không cần npm install, không cần bước build.
</p>

<h2>Iframe cơ bản</h2>
<pre><code>{`<iframe
  src="https://your-site/tradecanvas/embed/?symbol=BTCUSDT&timeframe=5m&theme=dark"
  width="800"
  height="500"
  style="border: 0; border-radius: 12px;"
></iframe>`}</code></pre>

<h2>Tham số URL</h2>
<table>
  <thead><tr><th>Tham số</th><th>Mặc định</th><th>Ghi chú</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>BTCUSDT</code></td><td>Mã trên Binance.</td></tr>
    <tr><td><code>timeframe</code></td><td><code>5m</code></td><td><code>1m</code>, <code>5m</code>, <code>15m</code>, <code>1h</code>, <code>4h</code>, <code>1d</code>.</td></tr>
    <tr><td><code>theme</code></td><td><code>dark</code></td><td><code>dark</code>, <code>light</code>, <code>darkTerminal</code>.</td></tr>
    <tr><td><code>chartType</code></td><td><code>candlestick</code></td><td>Bất kỳ loại nào trong 17 loại.</td></tr>
    <tr><td><code>indicators</code></td><td><em>không có</em></td><td>Các id cách nhau bằng dấu phẩy, ví dụ <code>indicators=sma,rsi</code>.</td></tr>
    <tr><td><code>trading</code></td><td><code>false</code></td><td>Hiện bảng giao dịch.</td></tr>
  </tbody>
</table>

<h2>Trang trực tiếp</h2>
<p>
  Mở thẳng <a href="{base}/embed">trang embed</a> để xem trước mà không có
  khung giao diện của trang tài liệu.
</p>
