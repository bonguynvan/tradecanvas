<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Biểu đồ tài chính — Tài liệu TradeCanvas</title>
  <meta name="description" content="Các biểu đồ cho dashboard tài chính bên cạnh biểu đồ nến: biểu đồ cột, donut, scatter và bubble, histogram, calendar, correlation matrix, sparkline, gauge, heatmap và treemap, waterfall, depth chart, equity curve và báo cáo hiệu suất." />
</svelte:head>

<h1>Biểu đồ tài chính</h1>
<p>
  Các biểu đồ cho dashboard và báo cáo, bên cạnh biểu đồ nến. Mỗi biểu đồ là một class
  nhận một phần tử và các tuỳ chọn, tự đặt kích thước theo phần tử và vẽ theo theme tối
  hoặc sáng của biểu đồ; phần lớn có tooltip đi theo con trỏ.
</p>

<h2>Các biểu đồ</h2>
<table>
  <thead><tr><th>Class</th><th>Dùng cho</th></tr></thead>
  <tbody>
    <tr><td><code>BarChart</code></td><td>Giá trị theo nhóm: dòng tiền ròng, khối lượng theo phiên, lợi nhuận theo tháng. Dạng nhóm hoặc chồng, đứng hoặc nằm ngang, lên và xuống từ 0.</td></tr>
    <tr><td><code>DonutChart</code></td><td>Các phần của một tổng: phân bổ, tỷ trọng theo ngành. Biểu đồ tròn khi <code>innerRadius: 0</code>.</td></tr>
    <tr><td><code>ScatterChart</code></td><td>Hai giá trị cho mỗi mục: rủi ro so với lợi nhuận, định giá so với tăng trưởng; thành bubble khi điểm có kích thước.</td></tr>
    <tr><td><code>HistogramChart</code></td><td>Phân bố của các giá trị: lợi nhuận ngày, kết quả giao dịch, kèm đường tại giá trị trung bình hoặc VaR.</td></tr>
    <tr><td><code>CalendarChart</code></td><td>Mỗi ngày một giá trị trên lịch: lợi nhuận ngày, P&amp;L, nhật ký giao dịch.</td></tr>
    <tr><td><code>MatrixChart</code></td><td>Một giá trị cho mỗi cặp hàng và cột: tương quan, khối lượng theo giờ và thứ trong tuần.</td></tr>
    <tr><td><code>CounterClockChart</code></td><td>Giá trung bình so với khối lượng trung bình, theo từng nến: chu kỳ counter-clock của một cổ phiếu.</td></tr>
    <tr><td><code>SparklineChart</code></td><td>Đường nhỏ trong một dòng watchlist hoặc một ô KPI.</td></tr>
    <tr><td><code>GaugeChart</code></td><td>Một giá trị so với các vùng: tâm lý thị trường, rủi ro, mức dùng ký quỹ.</td></tr>
    <tr><td><code>HeatmapChart</code></td><td>Các ô tô màu theo mức thay đổi, dạng lưới hoặc treemap có kích thước theo trọng số (vốn hoá). Với <code>grouped</code>, thành bản đồ ngành.</td></tr>
    <tr><td><code>WaterfallChart</code></td><td>Các bước từ điểm đầu đến điểm cuối: phân rã P&amp;L, dòng tiền.</td></tr>
    <tr><td><code>DepthChart</code></td><td>Bid và ask cộng dồn của một sổ lệnh.</td></tr>
    <tr><td><code>EquityCurveChart</code></td><td>Giá trị tài khoản theo thời gian, kèm drawdown và benchmark.</td></tr>
    <tr><td><code>PerformanceDashboard</code></td><td>Báo cáo chiến lược từ một lần backtest: thống kê, equity, drawdown và lợi nhuận theo tháng.</td></tr>
  </tbody>
</table>

<h2>Phần dùng chung</h2>
<pre><code>{`const chart = new BarChart(element, { categories, series, theme: 'dark' })

chart.setOptions({ mode: 'stacked' })   // any option, merged
chart.setTheme('light')                 // 'dark' | 'light' | a Theme
chart.destroy()                         // removes the canvas and its listeners`}</code></pre>
<p>
  Trên màn hình cảm ứng, chạm để hiện tooltip, và tooltip giữ nguyên đến khi chạm vào chỗ khác; kéo vẫn cuộn trang. Các biểu đồ vẽ theo pixel thực của màn hình, nên đường nét vẫn sắc ở mọi mức zoom hoặc tỉ lệ hiển thị. Depth chart, equity curve và waterfall đặt lề theo nhãn của chúng, giống các biểu đồ mới hơn.
</p>
<p>
  Chữ dùng font sans của hệ thống, giống các con số trong widget; <code>font</code> đặt font khác (<code>{'{'} family: MONO_FONT_FAMILY {'}'}</code> cho font monospace), và theme có font riêng thì giữ font đó. <code>locale</code> (một tag BCP 47 như <code>'vi'</code>) đặt ngôn ngữ để viết số và ngày; nếu không có thì dùng ngôn ngữ của trình duyệt. Mỗi biểu đồ tự mô tả bằng tiếng Anh cho trình đọc màn hình, trừ khi <code>ariaLabel</code> mô tả theo cách của bạn. <code>spreadLabel</code> của depth chart và <code>benchmarkLabel</code> của equity curve nhận chữ được vẽ lên chúng, và <code>labels</code> của dashboard nhận các tiêu đề và tên các chỉ số thống kê.
</p>
<p>
  Mỗi biểu đồ lấp đầy phần tử của nó và vẽ lại khi phần tử đổi kích thước. Với biểu đồ có tooltip
  khi rê chuột, <code>crosshair: false</code> tắt tooltip. Biểu đồ cột, donut, scatter, histogram, calendar và matrix cho trình đọc màn hình biết
  chúng hiển thị gì (canvas có role image và một nhãn); <code>ariaLabel</code> viết mô tả đó theo
  cách của bạn, ví dụ bằng ngôn ngữ của trang. Số được đọc bằng
  <code>valueFormat</code> (hoặc <code>xFormat</code> / <code>yFormat</code>), nếu không thì theo dạng
  1,234.5 và, từ mười nghìn trở lên, 12.3K.
</p>

<h2>Biểu đồ cột</h2>
<pre><code>{`import { BarChart } from '@tradecanvas/chart'

// Foreign net buying over ten sessions: green above zero, red below.
const flows = new BarChart(el, {
  categories: ['6/10', '7/10', '8/10', '9/10'],
  series: [{ name: 'Net', values: [-660, 860, -280, 230] }],
  colorBySign: true,                    // or { positive, negative }
  valueFormat: (v) => v + ' bn',
  onBarClick: ({ category, series, value, index }) => openDay(index),
})

// Several series side by side, or stacked: positives up and negatives down from zero.
new BarChart(el, {
  categories: ['Foreign', 'Proprietary', 'Retail'],
  series: [{ name: 'Buy', values: [820, 310, 4200] }, { name: 'Sell', values: [-760, -280, -4290] }],
  mode: 'stacked',
  orientation: 'horizontal',            // bars to the right, labels on the left
  showValues: true,
})

flows.update(categories, series)`}</code></pre>
<p>
  Trục giá trị luôn có mức 0. Rê chuột lên một nhóm sẽ hiện giá trị của mọi chuỗi trong nhóm đó;
  legend hiện khi có nhiều hơn một chuỗi (chọn bằng <code>legend</code>). Khi nhãn
  không đủ chỗ dọc cạnh dưới, chỉ hiện nhãn cách vài nhóm một.
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
  innerRadius: 0.6,                     // 0 for a pie
  centerLabel: 'Total',
  centerValue: '1.2B ₫',
  onSliceClick: (slice) => filterBy(slice.label),
})`}</code></pre>
<p>
  Các lát đi theo chiều kim đồng hồ từ vị trí 12 giờ; giá trị từ 0 trở xuống bị bỏ qua. Mỗi lát hiện
  tỷ trọng của nó khi đủ chỗ, và legend liệt kê tên và tỷ trọng, bên cạnh vòng tròn khi
  biểu đồ rộng và bên dưới khi hẹp.
</p>

<h2>Biểu đồ scatter và bubble</h2>
<pre><code>{`import { ScatterChart } from '@tradecanvas/chart'

new ScatterChart(el, {
  series: [{
    name: 'Banks',
    points: [
      { x: 21, y: 9, size: 480, label: 'VCB' },   // size: market value; the bubble's area follows it
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
  Các trục chừa chỗ cho bubble lớn nhất (<code>maxRadius</code>, mặc định 24 px), và các đường
  đánh dấu x = 0 và y = 0 khi trục đi qua chúng (<code>zeroLines: false</code> để ẩn).
</p>

<h2>Histogram</h2>
<pre><code>{`import { HistogramChart, histogramBins } from '@tradecanvas/chart'

new HistogramChart(el, {
  values: dailyReturns,                 // in percent
  binWidth: 0.5,                        // or bins: 20, or 'auto' (Sturges' rule)
  colorBySign: true,
  valueFormat: (v) => v.toFixed(1) + '%',
  markers: [{ value: mean, label: 'Mean' }, { value: var95, label: 'VaR 95%', color: '#e85a67' }],
})

histogramBins([1, 2, 2, 3, 10], { bins: 3 })
// [{ from: 1, to: 4, count: 4 }, { from: 4, to: 7, count: 0 }, { from: 7, to: 10, count: 1 }]`}</code></pre>

<h2>Calendar</h2>
<pre><code>{`import { CalendarChart } from '@tradecanvas/chart'

// A year of sessions, Monday to Friday, coloured by the day's change.
new CalendarChart(el, {
  data: [{ date: '2025-01-02', value: 1.2 }, { date: '2025-01-03', value: -0.8 }],   // YYYY-MM-DD
  weekdays: 5,                          // 7 (default) every day; weekStart: 0 starts weeks on Sunday
  locale: 'vi-VN',                      // month and day names
  colorScale: { min: -2, max: 2 },      // the theme's red and green, full at ±2
  valueFormat: (v) => v.toFixed(2) + '%',
  onDayClick: (day) => openSession(day.date),
})`}</code></pre>
<p>
  Các tuần chạy từ trái sang phải và các thứ trong tuần từ trên xuống dưới, mỗi năm dương lịch một dải và tối đa mười năm; khi biểu đồ không đủ cao để chứa hết, các năm cũ nhất bị bỏ đi. Ngày không có giá trị được vẽ trống, và thanh màu bên dưới cho thấy thang màu (<code>legend: false</code> để ẩn).
</p>

<h2>Correlation matrix</h2>
<pre><code>{`import { MatrixChart, correlationMatrix } from '@tradecanvas/chart'

// Daily returns, not prices: one array per stock, the same days in each.
const names = ['VCB', 'BID', 'CTG', 'TCB']
const values = correlationMatrix(returnsByStock)

new MatrixChart(el, {
  rows: names,                          // columns: [...] for a matrix that isn't square
  values,                               // values[row][column]
  triangle: 'lower',                    // half is enough for correlations
  colorScale: { min: -1, max: 1 },
  onCellClick: ({ row, column, value }) => compare(row, column),
})`}</code></pre>
<p>
  Các ô giữ hình vuông và in giá trị khi đủ chỗ (hai chữ số thập phân, trừ khi có <code>valueFormat</code>); tên cột không vừa chiều ngang ô thì được xoay. <code>correlationMatrix</code> ghép các ngày mà cả hai chuỗi đều có và trả về NaN khi ít hơn ba ngày, để trống ô đó. Matrix cũng phù hợp với các bảng giá trị khác, như khối lượng theo giờ và thứ trong tuần.
</p>
<p>
  Bảng có ít cột, như các dòng của báo cáo tài chính theo kỳ, dùng <code>cellWidth: 'fill'</code>: các cột chia nhau chiều ngang bên cạnh tên hàng và các hàng giữ chiều cao, nên matrix dùng hết biểu đồ thay vì nằm nhỏ ở giữa. Một số đặt chiều rộng mỗi cột theo pixel, không vượt quá chỗ trống.
</p>

<h2>Bản đồ ngành</h2>
<pre><code>{`import { HeatmapChart } from '@tradecanvas/chart'

new HeatmapChart(el, {
  data: [
    { id: 'vcb', label: 'VCB', value: 0.8, weight: 480, group: 'Banks' },
    { id: 'hpg', label: 'HPG', value: 1.9, weight: 160, group: 'Steel' },
    { id: 'vhm', label: 'VHM', value: -2.4, weight: 170, group: 'Real estate' },
  ],
  grouped: true,                        // tiles by group, then by stock
  valueFormat: (v) => v.toFixed(1) + '%',
})`}</code></pre>
<p>
  Mỗi nhóm chiếm diện tích theo tổng trọng số các cổ phiếu của nó, và tên cùng mức thay đổi có trọng số của nhóm nằm ở đầu ô khi đủ chỗ. Màu của heatmap chạy từ -5 đến 5, trừ khi <code>colorScale</code> đặt <code>min</code> và <code>max</code>.
</p>

<h2>Biểu đồ counter-clock</h2>
<pre><code>{`import { CounterClockChart } from '@tradecanvas/chart'

const clock = new CounterClockChart(el, {
  data: bars,                           // OHLCV bars, oldest first
  period: 25,                           // bars in each average
  points: 120,                          // the newest points drawn
  xLabel: 'Volume, average', yLabel: 'Price, average',
  onPointClick: (p) => goTo(p.time),
})

clock.getPhase()                        // 1–8: the direction of the last move`}</code></pre>
<p>
  Mỗi điểm là trung bình 25 nến của khối lượng (trục ngang) và của giá đóng cửa (trục dọc), nối theo thứ tự thời gian và mờ dần theo tuổi. Một chu kỳ lành mạnh xoay ngược chiều kim đồng hồ. <code>getPhase()</code> (và <code>counterClockPhase(points)</code>) cho biết bước di chuyển cuối: 1 khối lượng tăng, 2 cả hai tăng, 3 giá tăng, 4 giá tăng khi khối lượng giảm, 5 khối lượng giảm, 6 cả hai giảm, 7 giá giảm, 8 giá giảm khi khối lượng tăng.
</p>

<h2>Sparkline, gauge, heatmap, waterfall, depth chart và equity curve</h2>
<pre><code>{`import { SparklineChart, GaugeChart, HeatmapChart, WaterfallChart, DepthChart, EquityCurveChart } from '@tradecanvas/chart'

new SparklineChart(el, { data: closes, mode: 'area', showLastPoint: true })

const gauge = new GaugeChart(el, {
  value: 72, min: 0, max: 100, label: 'Fear & Greed',
  zones: [{ from: 0, to: 45, color: '#e8505b' }, { from: 45, to: 55, color: '#8a93a3' }, { from: 55, to: 100, color: '#1fa874' }],
})
gauge.setValue(64)

// A treemap sized by market value, coloured by the day's change.
new HeatmapChart(el, {
  data: [{ id: 'vcb', label: 'VCB', value: 1.2, weight: 480 }, { id: 'fpt', label: 'FPT', value: -0.8, weight: 170 }],
  weighted: true, showLabels: true, showValues: true,
  onCellClick: (cell) => openSymbol(cell.label),
})

new WaterfallChart(el, { data: [{ label: 'Start', value: 10000, type: 'total' }, { label: 'Fees', value: -85 }, { label: 'End', value: 9915, type: 'total' }] })
new DepthChart(el, { data: { bids, asks }, midPriceLine: true, spreadLabel: true })
new EquityCurveChart(el, { data: equity, benchmark, drawdown: true })`}</code></pre>
<p>
  Equity curve còn nhận <strong>levels</strong>, các đường ngang qua vùng vẽ tại giá trị cố định, mỗi giá trị ghi trong một
  nhãn ở trục, và <strong>bands</strong>, các khoảng giá trị được tô màu dưới đường cong. Một level có
  <code>label</code> ghi ở đầu bên phải (<code>labelAt: 'start'</code> để ghi ở đầu bên trái, xa điểm mới nhất của
  đường cong), <code>color</code> và <code>dash</code> (<code>[]</code> cho
  đường liền); một band có <code>label</code> ở góc và <code>color</code> được dùng nguyên như truyền vào, nên hãy truyền màu có
  độ trong suốt. Cả hai dùng màu của theme khi không truyền màu. Giá trị của level được ghi đầy đủ, hoặc theo
  <code>valueFormat</code> khi có. Nhãn của các level quá gần nhau sẽ được dời ra xa nhau (khi không đủ chỗ cho tất
  cả, nhãn của các level thấp nhất bị bỏ), và tên trong vùng vẽ không đè lên nhau. Thang giá trị được nới rộng để hiện tất cả; <code>fitLevels: false</code> giữ thang
  theo đường cong, bỏ các level nằm ngoài và chỉ vẽ band ở phần chồng lên thang.
  <code>setOptions</code> thay đổi chúng trên biểu đồ đang hiển thị.
</p>
<pre><code>{`const chart = new EquityCurveChart(el, {
  data: closes,
  levels: [{ value: 41_250, label: 'BOS', color: '#e0a030' }, { value: 38_900, label: 'Equilibrium' }],
  bands: [
    { from: 38_900, to: 44_100, label: 'Premium', color: 'rgba(232, 80, 91, 0.10)' },
    { from: 33_700, to: 38_900, label: 'Discount', color: 'rgba(31, 168, 116, 0.10)' },
  ],
})
chart.setOptions({ levels: [{ value: 42_000, label: 'CHoCH' }] })`}</code></pre>

<h2>Performance dashboard</h2>
<p>
  <code>PerformanceDashboard</code> dựng báo cáo chiến lược từ một lần backtest: một dải
  chỉ số thống kê chính, equity curve, drawdown bên dưới và calendar lợi nhuận theo tháng.
  Dùng cùng bộ backtest trong <a href={href('/docs/analytics')}>analytics</a>.
</p>
<pre><code>{`import { Backtester } from '@tradecanvas/analytics'
import { PerformanceDashboard } from '@tradecanvas/chart'

const result = new Backtester({ initialCash: 10_000 }).run(bars, myStrategy)

const dash = new PerformanceDashboard(document.getElementById('report')!, {
  result,            // any { equityCurve, metrics }: Backtester output fits
  theme: 'dark',
  title: 'SMA Crossover',
  subtitle: 'BTC/USDT · 1h · 2023',
})

// later: dash.update(newResult) · dash.setTheme('light') · dash.destroy()`}</code></pre>
<p>
  Metrics tự tạo nhận giá trị dạng phân số, như <code>@tradecanvas/analytics</code> trả về:
  <code>totalReturnPct</code> bằng <code>0.12</code> hiển thị là +12.00%, còn nếu truyền theo phần trăm
  (<code>12</code>) thì sẽ hiển thị lớn gấp 100 lần. <code>maxDrawdownPct</code> luôn được hiểu là mức giảm,
  dù truyền với dấu nào.
</p>
<p>
  Các hàm tính toán được export để dùng với layout riêng: <code>computeMonthlyReturns</code>,
  <code>computeDrawdownCurve</code>, <code>toEquityPoints</code>, <code>selectKeyStats</code>, và
  cho trục tự vẽ, <code>niceScale(min, max)</code> (vạch chia theo bước 1, 2, 2.5 hoặc 5).
</p>
