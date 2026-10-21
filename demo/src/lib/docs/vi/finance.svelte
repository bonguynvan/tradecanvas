<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Biểu đồ tài chính — Tài liệu TradeCanvas</title>
  <meta name="description" content="Biểu đồ cho dashboard tài chính, đặt cạnh biểu đồ nến: biểu đồ cột, donut, scatter và bong bóng, histogram, lịch, ma trận tương quan, sparkline, đồng hồ đo, bản đồ nhiệt và treemap, thác nước, độ sâu, đường vốn và báo cáo hiệu suất." />
</svelte:head>

<h1>Biểu đồ tài chính</h1>
<p>
  Biểu đồ cho dashboard và báo cáo, đặt cạnh biểu đồ nến. Mỗi biểu đồ là một class nhận một
  phần tử và các tuỳ chọn, tự co giãn theo phần tử và vẽ theo theme tối hoặc sáng của chart;
  phần lớn hiện tooltip theo con trỏ.
</p>

<h2>Các biểu đồ</h2>
<table>
  <thead><tr><th>Class</th><th>Dùng cho</th></tr></thead>
  <tbody>
    <tr><td><code>BarChart</code></td><td>Giá trị theo hạng mục: dòng tiền ròng, khối lượng theo phiên, lợi nhuận theo tháng. Theo nhóm hoặc chồng lên nhau, đứng hoặc nằm ngang, đi lên và đi xuống từ 0.</td></tr>
    <tr><td><code>DonutChart</code></td><td>Các phần của một tổng thể: phân bổ tài sản, mức phơi nhiễm theo ngành. Thành biểu đồ tròn với <code>innerRadius: 0</code>.</td></tr>
    <tr><td><code>ScatterChart</code></td><td>Hai giá trị cho mỗi mục: rủi ro so với lợi nhuận, định giá so với tăng trưởng; thành bong bóng khi điểm có kích thước.</td></tr>
    <tr><td><code>HistogramChart</code></td><td>Giá trị phân bố ra sao: lợi nhuận theo ngày, kết quả các lệnh, có đường kẻ tại giá trị trung bình hoặc một mức VaR.</td></tr>
    <tr><td><code>CalendarChart</code></td><td>Mỗi ngày một giá trị trên lịch: lợi nhuận ngày, lãi lỗ, nhật ký giao dịch.</td></tr>
    <tr><td><code>MatrixChart</code></td><td>Một giá trị cho mỗi cặp hàng và cột: tương quan, khối lượng theo giờ và thứ.</td></tr>
    <tr><td><code>SparklineChart</code></td><td>Một đường nhỏ trong hàng của danh mục theo dõi hoặc trong ô KPI.</td></tr>
    <tr><td><code>GaugeChart</code></td><td>Một giá trị so với các dải: tâm lý thị trường, rủi ro, mức dùng ký quỹ.</td></tr>
    <tr><td><code>HeatmapChart</code></td><td>Các ô tô màu theo mức thay đổi, xếp thành lưới hoặc thành treemap theo tỷ trọng (vốn hoá). Với <code>grouped</code>, thành bản đồ theo ngành.</td></tr>
    <tr><td><code>WaterfallChart</code></td><td>Các bước từ điểm đầu đến điểm cuối: phân bổ lãi/lỗ (P&amp;L), dòng tiền.</td></tr>
    <tr><td><code>DepthChart</code></td><td>Bid và ask luỹ kế của sổ lệnh.</td></tr>
    <tr><td><code>EquityCurveChart</code></td><td>Giá trị tài khoản theo thời gian, kèm các đợt sụt giảm (drawdown) và một chỉ số tham chiếu (benchmark).</td></tr>
    <tr><td><code>PerformanceDashboard</code></td><td>Báo cáo chiến lược từ một backtest: các chỉ số, đường vốn, drawdown và lợi nhuận theo tháng.</td></tr>
  </tbody>
</table>

<h2>Điểm chung</h2>
<pre><code>{`const chart = new BarChart(element, { categories, series, theme: 'dark' })

chart.setOptions({ mode: 'stacked' })   // tuỳ chọn bất kỳ, được gộp vào
chart.setTheme('light')                 // 'dark' | 'light' | một Theme
chart.destroy()                         // gỡ canvas và các listener của nó`}</code></pre>
<p>
  Mỗi biểu đồ lấp đầy phần tử của nó và vẽ lại khi phần tử đổi kích thước. Biểu đồ nào có tooltip khi
  rê chuột thì <code>crosshair: false</code> sẽ tắt tooltip. Biểu đồ cột, donut, scatter, histogram, lịch và ma trận cho
  trình đọc màn hình biết chúng đang hiển thị gì (canvas có role image và một nhãn); <code>ariaLabel</code>
  diễn đạt điều đó bằng lời của bạn, chẳng hạn bằng ngôn ngữ của trang. Số được hiển thị bằng
  <code>valueFormat</code> (hoặc <code>xFormat</code> / <code>yFormat</code>), nếu không thì theo dạng
  1,234.5 và, từ mười nghìn trở lên, 12.3K.
</p>

<h2>Biểu đồ cột</h2>
<pre><code>{`import { BarChart } from '@tradecanvas/chart'

// Khối ngoại mua ròng trong mười phiên: xanh trên 0, đỏ dưới 0.
const flows = new BarChart(el, {
  categories: ['6/10', '7/10', '8/10', '9/10'],
  series: [{ name: 'Net', values: [-660, 860, -280, 230] }],
  colorBySign: true,                    // hoặc { positive, negative }
  valueFormat: (v) => v + ' bn',
  onBarClick: ({ category, series, value, index }) => openDay(index),
})

// Nhiều chuỗi đặt cạnh nhau, hoặc chồng lên nhau: số dương đi lên và số âm đi xuống từ 0.
new BarChart(el, {
  categories: ['Foreign', 'Proprietary', 'Retail'],
  series: [{ name: 'Buy', values: [820, 310, 4200] }, { name: 'Sell', values: [-760, -280, -4290] }],
  mode: 'stacked',
  orientation: 'horizontal',            // cột chạy sang phải, nhãn ở bên trái
  showValues: true,
})

flows.update(categories, series)`}</code></pre>
<p>
  Mức 0 luôn nằm trên trục giá trị. Rê chuột lên một hạng mục sẽ hiện giá trị của mọi chuỗi tại đó;
  legend hiện khi có hơn một chuỗi (chọn bằng <code>legend</code>). Nhãn không đủ chỗ ở trục dưới
  sẽ hiện cách quãng vài hạng mục một lần.
</p>

<h2>Biểu đồ donut</h2>
<pre><code>{`import { DonutChart } from '@tradecanvas/chart'

new DonutChart(el, {
  data: [
    { label: 'Stocks', value: 52 },
    { label: 'Bonds', value: 23 },
    { label: 'Cash', value: 15 },
    { label: 'Gold', value: 10, color: '#d4a017' },
  ],
  innerRadius: 0.6,                     // 0 để thành biểu đồ tròn
  centerLabel: 'Total',
  centerValue: '1.2B ₫',
  onSliceClick: (slice) => filterBy(slice.label),
})`}</code></pre>
<p>
  Các lát xếp theo chiều kim đồng hồ từ vị trí 12 giờ; giá trị từ 0 trở xuống bị bỏ qua. Mỗi lát hiện
  tỷ trọng của nó khi đủ chỗ, và legend liệt kê tên cùng tỷ trọng, nằm cạnh vòng tròn khi biểu đồ rộng
  và nằm bên dưới khi hẹp.
</p>

<h2>Biểu đồ scatter và bong bóng</h2>
<pre><code>{`import { ScatterChart } from '@tradecanvas/chart'

new ScatterChart(el, {
  series: [{
    name: 'Banks',
    points: [
      { x: 21, y: 9, size: 480, label: 'VCB' },   // size: giá trị vốn hoá; diện tích bong bóng tỷ lệ theo nó
      { x: 34, y: 24, size: 170, label: 'TCB' },
    ],
  }],
  xLabel: 'Volatility',
  yLabel: 'Return, a year',
  xFormat: (v) => v + '%',
  yFormat: (v) => v + '%',
  showLabels: true,
  onPointClick: (point, series) => openSymbol(point.label),
})`}</code></pre>
<p>
  Các trục chừa chỗ cho bong bóng lớn nhất (<code>maxRadius</code>, mặc định 24 px), và có đường kẻ
  đánh dấu x = 0 và y = 0 khi trục đi qua các giá trị này (<code>zeroLines: false</code> để ẩn).
</p>

<h2>Histogram</h2>
<pre><code>{`import { HistogramChart, histogramBins } from '@tradecanvas/chart'

new HistogramChart(el, {
  values: dailyReturns,                 // tính theo phần trăm
  binWidth: 0.5,                        // hoặc bins: 20, hoặc 'auto' (quy tắc Sturges)
  colorBySign: true,
  valueFormat: (v) => v.toFixed(1) + '%',
  markers: [{ value: mean, label: 'Mean' }, { value: var95, label: 'VaR 95%', color: '#e85a67' }],
})

histogramBins([1, 2, 2, 3, 10], { bins: 3 })
// [{ from: 1, to: 4, count: 4 }, { from: 4, to: 7, count: 0 }, { from: 7, to: 10, count: 1 }]`}</code></pre>

<h2>Lịch</h2>
<pre><code>{`import { CalendarChart } from '@tradecanvas/chart'

// Một năm phiên giao dịch, thứ Hai đến thứ Sáu, tô màu theo biến động trong ngày.
new CalendarChart(el, {
  data: [{ date: '2025-01-02', value: 1.2 }, { date: '2025-01-03', value: -0.8 }],   // YYYY-MM-DD
  weekdays: 5,                          // 7 (mặc định) là mọi ngày; weekStart: 0 để tuần bắt đầu từ Chủ nhật
  locale: 'vi-VN',                      // tên tháng và tên thứ
  colorScale: { min: -2, max: 2 },      // màu đỏ và xanh của theme, đậm nhất ở ±2
  valueFormat: (v) => v.toFixed(2) + '%',
  onDayClick: (day) => openSession(day.date),
})`}</code></pre>
<p>
  Tuần chạy từ trái sang phải, các thứ từ trên xuống dưới, mỗi năm dương lịch một dải, tối đa mười năm; khi biểu đồ không đủ cao cho tất cả, các năm cũ nhất bị bỏ trước. Ngày không có giá trị được vẽ trống, và thanh màu bên dưới cho biết thang màu (<code>legend: false</code> để ẩn).
</p>

<h2>Ma trận tương quan</h2>
<pre><code>{`import { MatrixChart, correlationMatrix } from '@tradecanvas/chart'

// Lợi nhuận ngày, không phải giá: mỗi mã một mảng, cùng các ngày như nhau.
const names = ['VCB', 'BID', 'CTG', 'TCB']
const values = correlationMatrix(returnsByStock)

new MatrixChart(el, {
  rows: names,                          // columns: [...] cho ma trận không vuông
  values,                               // values[row][column]
  triangle: 'lower',                    // với tương quan, một nửa là đủ
  colorScale: { min: -1, max: 1 },
  onCellClick: ({ row, column, value }) => compare(row, column),
})`}</code></pre>
<p>
  Ô luôn vuông và in giá trị khi vừa chỗ (hai chữ số thập phân nếu không có <code>valueFormat</code>); tên cột không vừa bề ngang ô thì được xoay nghiêng. <code>correlationMatrix</code> ghép các ngày mà cả hai chuỗi đều có, và trả về NaN khi có ít hơn ba ngày, khi đó ô để trống. Ma trận cũng hợp với các bảng giá trị khác, như khối lượng theo giờ và thứ.
</p>

<h2>Bản đồ theo ngành</h2>
<pre><code>{`import { HeatmapChart } from '@tradecanvas/chart'

new HeatmapChart(el, {
  data: [
    { id: 'vcb', label: 'VCB', value: 0.8, weight: 480, group: 'Ngân hàng' },
    { id: 'hpg', label: 'HPG', value: 1.9, weight: 160, group: 'Thép' },
    { id: 'vhm', label: 'VHM', value: -2.4, weight: 170, group: 'Bất động sản' },
  ],
  grouped: true,                        // xếp ô theo nhóm, rồi theo mã
  valueFormat: (v) => v.toFixed(1) + '%',
})`}</code></pre>
<p>
  Mỗi nhóm chiếm phần diện tích bằng tổng tỷ trọng các mã của nó, tên nhóm và biến động bình quân theo tỷ trọng nằm ở đầu ô khi vừa chỗ. Màu của heatmap chạy từ -5 đến 5, trừ khi <code>colorScale</code> cho <code>min</code> và <code>max</code>.
</p>

<h2>Sparkline, đồng hồ đo, bản đồ nhiệt, thác nước, độ sâu và đường vốn</h2>
<pre><code>{`import { SparklineChart, GaugeChart, HeatmapChart, WaterfallChart, DepthChart, EquityCurveChart } from '@tradecanvas/chart'

new SparklineChart(el, { data: closes, mode: 'area', showLastPoint: true })

const gauge = new GaugeChart(el, {
  value: 72, min: 0, max: 100, label: 'Fear & Greed',
  zones: [{ from: 0, to: 45, color: '#e8505b' }, { from: 45, to: 55, color: '#8a93a3' }, { from: 55, to: 100, color: '#1fa874' }],
})
gauge.setValue(64)

// Treemap có kích thước theo vốn hoá, tô màu theo mức thay đổi trong ngày.
new HeatmapChart(el, {
  data: [{ id: 'vcb', label: 'VCB', value: 1.2, weight: 480 }, { id: 'fpt', label: 'FPT', value: -0.8, weight: 170 }],
  weighted: true, showLabels: true, showValues: true,
  onCellClick: (cell) => openSymbol(cell.label),
})

new WaterfallChart(el, { data: [{ label: 'Start', value: 10000, type: 'total' }, { label: 'Fees', value: -85 }, { label: 'End', value: 9915, type: 'total' }] })
new DepthChart(el, { data: { bids, asks }, midPriceLine: true, spreadLabel: true })
new EquityCurveChart(el, { data: equity, benchmark, drawdown: true })`}</code></pre>

<h2>Dashboard hiệu suất</h2>
<p>
  <code>PerformanceDashboard</code> dựng một báo cáo chiến lược từ một backtest: dải chỉ số chính,
  đường vốn, drawdown ngay bên dưới và lịch lợi nhuận theo tháng. Dùng cùng bộ backtest trong phần
  <a href={href('/docs/analytics')}>phân tích</a>.
</p>
<pre><code>{`import { Backtester } from '@tradecanvas/analytics'
import { PerformanceDashboard } from '@tradecanvas/chart'

const result = new Backtester({ initialCash: 10_000 }).run(bars, myStrategy)

const dash = new PerformanceDashboard(document.getElementById('report')!, {
  result,            // bất kỳ { equityCurve, metrics } nào: kết quả của Backtester dùng được ngay
  theme: 'dark',
  title: 'SMA Crossover',
  subtitle: 'BTC/USDT · 1h · 2023',
})

// về sau: dash.update(newResult) · dash.setTheme('light') · dash.destroy()`}</code></pre>
<p>
  Các hàm tính toán được export để bạn tự làm bố cục: <code>computeMonthlyReturns</code>,
  <code>computeDrawdownCurve</code>, <code>toEquityPoints</code>, <code>selectKeyStats</code>, và để tự
  dựng trục, <code>niceScale(min, max)</code> (vạch chia theo bước 1, 2, 2.5 hoặc 5).
</p>
