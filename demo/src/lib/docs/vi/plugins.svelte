<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Plugin — Tài liệu TradeCanvas</title>
  <meta name="description" content="Mở rộng TradeCanvas bằng chỉ báo, công cụ vẽ, loại biểu đồ và lớp phủ tuỳ chỉnh qua plugin SDK." />
</svelte:head>

<h1>Plugin</h1>
<p>
  Mở rộng biểu đồ bằng <strong>chỉ báo</strong>, <strong>công cụ vẽ</strong>,
  <strong>loại biểu đồ</strong> và <strong>lớp phủ</strong> tuỳ chỉnh — đăng ký toàn cục hoặc cho từng biểu đồ.
</p>

<h2>Đăng ký</h2>
<p>Có ba cách đăng ký, theo thứ tự ưu tiên: mặc định toàn cục, qua constructor, rồi gọi trực tiếp trên instance.</p>
<pre><code>{`import { Chart, registerPlugin } from '@tradecanvas/chart'

// 1) Global — every Chart created afterward inherits it
registerPlugin({ kind: 'indicator', plugin: new MyIndicator() })

// 2) Per-chart at construction
const chart = new Chart(el, { plugins: [{ kind: 'overlay', plugin: myHeatmap }] })

// 3) Imperative on an instance
chart.plugins.register({ kind: 'chartType', plugin: myCandles })
chart.plugins.unregister('chartType:my-candles')
chart.plugins.list()`}</code></pre>

<h2>Các loại plugin</h2>
<table>
  <thead><tr><th>Loại</th><th>Interface</th><th>Vẽ ở</th></tr></thead>
  <tbody>
    <tr><td><code>indicator</code></td><td><code>IndicatorPlugin</code> — <code>calculate()</code> + <code>render()</code></td><td>phủ lên biểu đồ hoặc bảng riêng</td></tr>
    <tr><td><code>drawing</code></td><td><code>DrawingPlugin</code> — <code>render()</code> + <code>hitTest()</code></td><td>lớp overlay</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartTypePlugin</code> — <code>createRenderer()</code> + <code>transform()</code> tuỳ chọn</td><td>chuỗi chính</td></tr>
    <tr><td><code>overlay</code></td><td><code>OverlayPlugin</code> — <code>render(ctx, &#123; viewport, data, theme &#125;)</code></td><td><code>main</code> / <code>overlay</code> / <code>ui</code></td></tr>
  </tbody>
</table>

<h2>Chỉ báo tuỳ chỉnh</h2>
<p>Kế thừa <code>IndicatorBase</code> để có sẵn các hàm hỗ trợ vẽ, rồi đăng ký và thêm nó như mọi chỉ báo có sẵn:</p>
<pre><code>{`import { IndicatorBase, IndicatorValueMap, registerPlugin } from '@tradecanvas/chart'

class DoubleSMA extends IndicatorBase {
  descriptor = {
    id: 'double-sma', name: 'Double SMA',
    placement: 'overlay', defaultConfig: { fast: 10, slow: 30 },
  }
  calculate(data, config) { /* values = new IndicatorValueMap(); return { values, series } */ }
  render(ctx, output, viewport, style) { /* draw lines */ }
}

registerPlugin({ kind: 'indicator', plugin: new DoubleSMA() })
chart.addIndicator('double-sma', { fast: 10, slow: 30 })`}</code></pre>
<p>
  Với <code>values</code>, hãy dùng <code>new IndicatorValueMap()</code> thay vì <code>new Map()</code>: nó thay thế trực tiếp
  được cho <code>Map</code> nhưng rẻ hơn nhiều lần khi điền từng nến theo thứ tự thời gian, đúng là việc mà mỗi lần
  đổi mã hay khung thời gian phải làm trên toàn bộ lịch sử.
</p>

<h3>Cập nhật trực tiếp nhanh (tuỳ chọn)</h3>
<p>
  Mỗi tick trực tiếp chỉ làm thay đổi nến đang hình thành. Cài đặt <code>update()</code> để chỉ tính lại
  các nến từ <code>from</code> trở đi thay vì toàn bộ lịch sử — biểu đồ dùng nó khi có tick và
  nến mới, và quay về <code>calculate()</code> khi hàm này không có hoặc trả về <code>null</code>.
  Nó phải cho ra đúng các giá trị mà <code>calculate()</code> sẽ cho.
</p>
<pre><code>{`update(data, config, prev, from) {
  if (!this.canResume(data, prev, from)) return null   // IndicatorBase helper
  for (let i = from; i < data.length; i++) {
    this.writePoint(prev, data, i, { value: /* recompute bar i */ 0 })
  }
  return prev
}`}</code></pre>

<h2>Loại biểu đồ tuỳ chỉnh</h2>
<p>Một <code>ChartTypePlugin</code> cung cấp bộ render và một phép biến đổi dữ liệu tuỳ chọn; chuyển sang nó như với một loại có sẵn:</p>
<pre><code>{`registerPlugin({
  kind: 'chartType',
  plugin: {
    descriptor: { type: 'my-bricks', name: 'My Bricks' },
    createRenderer: () => new MyBrickRenderer(),
    transform: (raw) => toBricks(raw),   // optional
  },
})

chart.setChartType('my-bricks')`}</code></pre>

<h2>Lớp phủ tuỳ chỉnh</h2>
<p>Một <code>OverlayPlugin</code> vẽ mỗi khung hình trên lớp bạn chọn, nhận khung nhìn, dữ liệu và giao diện (theme) hiện tại:</p>
<pre><code>{`registerPlugin({
  kind: 'overlay',
  plugin: {
    descriptor: { id: 'vwap-band', name: 'VWAP Band', layer: 'main' },
    render(ctx, { viewport, data, theme }) {
      // draw onto the main layer with the current viewport + data
    },
  },
})`}</code></pre>

<p>Xem <a href={href('/docs/api')}>Tham chiếu API</a> để biết đầy đủ chữ ký kiểu của plugin.</p>
