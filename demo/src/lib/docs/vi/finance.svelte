<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Biểu đồ tài chính — Tài liệu TradeCanvas</title>
  <meta name="description" content="Các bộ render chuyên dụng cho tài chính: đồng hồ đo, bản đồ nhiệt, độ sâu thị trường, sparkline, đường vốn và biểu đồ thác nước." />
</svelte:head>

<h1>Biểu đồ tài chính</h1>
<p>Các bộ render chuyên dụng cho dashboard tài chính, đặt cạnh biểu đồ nến chính.</p>

<h2>Các bộ render có sẵn</h2>
<table>
  <thead><tr><th>Bộ render</th><th>Trường hợp dùng</th></tr></thead>
  <tbody>
    <tr><td><code>SparklineRenderer</code></td><td>Ô giá thu gọn, danh mục theo dõi, ô KPI.</td></tr>
    <tr><td><code>GaugeRenderer</code></td><td>Đồng hồ đo một giá trị — tâm lý thị trường, rủi ro, mức phơi nhiễm.</td></tr>
    <tr><td><code>HeatmapRenderer</code></td><td>Ma trận tương quan theo ngành / tài sản.</td></tr>
    <tr><td><code>DepthChartRenderer</code></td><td>Độ sâu sổ lệnh L2, bid/ask luỹ kế.</td></tr>
    <tr><td><code>WaterfallRenderer</code></td><td>Phân bổ lãi/lỗ (P&amp;L), các dòng tiền cộng dồn.</td></tr>
    <tr><td><code>EquityCurveRenderer</code></td><td>Đường vốn của backtest, có tô vùng sụt giảm (drawdown).</td></tr>
    <tr><td><code>FinanceCrosshair</code></td><td>Con trỏ chữ thập nhiều trục cho biểu đồ tài chính.</td></tr>
  </tbody>
</table>

<h2>Ví dụ đường vốn</h2>
<p>Kết hợp với bộ backtest trong phần <a href={href('/docs/analytics')}>phân tích</a>:</p>

<pre><code>{`import { Backtester } from '@tradecanvas/analytics'
import { EquityCurveRenderer } from '@tradecanvas/chart'

const result = new Backtester({ initialCash: 10_000 }).run(bars, myStrategy)

const renderer = new EquityCurveRenderer(canvas.getContext('2d')!)
renderer.render(result.equityCurve)`}</code></pre>

<h2>Dashboard hiệu suất</h2>
<p>
  <code>PerformanceDashboard</code> ghép các bộ render tài chính thành một báo cáo chiến lược
  duy nhất, theo giao diện đang dùng — dải chỉ số chính, đường vốn, bảng sụt giảm vốn
  (underwater) và bản đồ nhiệt lợi nhuận theo tháng dạng lịch — dựng trực tiếp từ
  kết quả backtest.
</p>

<pre><code>{`import { Backtester } from '@tradecanvas/analytics'
import { PerformanceDashboard } from '@tradecanvas/chart'

const result = new Backtester({ initialCash: 10_000 }).run(bars, myStrategy)

const dash = new PerformanceDashboard(document.getElementById('report')!, {
  result,            // any { equityCurve, metrics } — Backtester output fits
  theme: 'dark',
  title: 'SMA Crossover',
  subtitle: 'BTC/USDT · 1h · 2023',
})

// later: dash.update(newResult) · dash.setTheme('light') · dash.destroy()`}</code></pre>

<p>
  Các hàm tính toán thuần cũng được export, nếu bạn muốn tự làm bố cục:
  <code>computeMonthlyReturns</code>, <code>computeDrawdownCurve</code>,
  <code>toEquityPoints</code> và <code>selectKeyStats</code>.
</p>

<h2>Bố cục bản đồ nhiệt</h2>
<p><code>HeatmapLayout</code> giúp tính lưới ô vuông và thang màu cho ma trận chỉ số bất kỳ.</p>
