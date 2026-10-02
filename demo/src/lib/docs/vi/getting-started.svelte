<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Bắt đầu — Tài liệu TradeCanvas</title>
  <meta name="description" content="Cài đặt TradeCanvas và hiển thị biểu đồ giao dịch canvas đầu tiên trong chưa đầy một phút." />
</svelte:head>

<h1>Bắt đầu</h1>
<p>Cài đặt TradeCanvas và hiển thị một biểu đồ trong chưa đầy một phút.</p>

<h2>Cài đặt</h2>
<p>Dùng trình quản lý gói nào bạn thích:</p>
<pre><code>npm install @tradecanvas/chart
# or
pnpm add @tradecanvas/chart
# or
yarn add @tradecanvas/chart</code></pre>

<h2>Widget dùng ngay</h2>
<p>
  <code>ChartWidget</code> là cách nhanh nhất để có một biểu đồ chạy được. Nó dựng toàn bộ
  giao diện giao dịch bên trong bất kỳ phần tử chứa nào — thanh công cụ, thanh bên công cụ vẽ,
  hộp thoại cài đặt, thanh trạng thái — mà không phụ thuộc vào framework nào.
</p>

<pre><code>{`import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  historyLimit: 500,
  trading: true,
  // Optional features
  watchlist: true,         // right-side sparkline panel
  persistLayouts: true,    // remember per-symbol indicators / drawings
  // dragDropImport defaults to true — drop a CSV / JSON onto the chart
})`}</code></pre>

<p>
  Ngay khi cài xong, widget đã hỗ trợ đầy đủ các thao tác quen thuộc của trader chuyên nghiệp:
  kéo qua nến cuối vào vùng tương lai còn trống, kéo trục giá/thời gian để co giãn,
  <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+kéo để chọn nhiều hình vẽ, <kbd>Shift</kbd>+kéo để đo,
  <kbd>Alt</kbd>+bấm để ghim chú thích, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd>
  để mở bảng lệnh, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>P</kbd> để tìm mã,
  và <kbd>?</kbd> để xem toàn bộ bảng phím tắt.
</p>

<h2>Chart headless</h2>
<p>
  Để toàn quyền kiểm soát giao diện xung quanh, hãy dùng trực tiếp lớp <code>Chart</code>
  ở tầng thấp hơn. Bạn tự làm thanh công cụ, mà vẫn giữ đủ mọi tính năng:
</p>

<pre><code>{`import { Chart } from '@tradecanvas/chart'

const chart = new Chart(host, {
  chartType: 'candlestick',
  theme: 'dark',
})

chart.setData(bars)
chart.addIndicator('sma', { period: 20 })`}</code></pre>

<h2>Wrapper cho framework</h2>
<p>
  Wrapper cho React, Vue và Svelte có trong mục
  <a href={href('/docs/frameworks')}>framework</a>.
</p>

<h2>Bước tiếp theo</h2>
<ul>
  <li><a href={href('/docs/api')}>Tham chiếu API</a> — toàn bộ API của <code>Chart</code> và <code>ChartWidget</code></li>
  <li><a href={href('/docs/chart-types')}>Loại biểu đồ</a> — 17 loại biểu đồ có sẵn</li>
  <li><a href={href('/docs/indicators')}>Chỉ báo</a> — danh mục 85 chỉ báo</li>
  <li><a href={href('/docs/realtime')}>Thời gian thực &amp; phát lại</a> — adapter dữ liệu stream và chế độ phát lại</li>
  <li><a href={href('/docs/analytics')}>Phân tích</a> — bộ backtest chiến lược và chỉ số rủi ro</li>
</ul>
