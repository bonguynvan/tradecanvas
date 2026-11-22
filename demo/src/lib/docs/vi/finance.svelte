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
    <tr><td><code>PayoffChart</code></td><td>Lãi hoặc lỗ của một position quyền chọn tại ngày đáo hạn, theo giá của tài sản cơ sở: spread, straddle, condor.</td></tr>
    <tr><td><code>CurveChart</code></td><td>Giá trị theo strike hoặc theo kỳ hạn, mỗi chuỗi một đường: volatility smile, term structure, đường cong lợi suất.</td></tr>
    <tr><td><code>BoxPlotChart</code></td><td>Độ phân tán giá trị của từng nhóm: lợi nhuận theo thứ trong tuần, theo tháng, theo chiến lược.</td></tr>
    <tr><td><code>RadarChart</code></td><td>Nhiều thước đo cùng lúc, mỗi thước đo một tia: bảng điểm của một chiến lược bên cạnh bảng điểm của benchmark.</td></tr>
    <tr><td><code>SunburstChart</code></td><td>Các phần của một tổng và các phần bên trong chúng: phân bổ theo lớp tài sản, rồi theo ngành, rồi theo từng khoản nắm giữ.</td></tr>
    <tr><td><code>StackedAreaChart</code></td><td>Nhiều chuỗi chồng lên nhau theo thời gian: một tổng gồm những gì, hoặc cơ cấu của nó thay đổi thế nào.</td></tr>
    <tr><td><code>SurfaceChart</code></td><td>Giá trị trên hai trục dưới dạng một mặt trong hộp 3D mà bạn xoay bằng cách kéo: implied volatility theo strike và ngày đáo hạn, lợi nhuận theo giá và ngày, hoặc ở dạng các lát, độ sâu của một sổ lệnh theo thời gian.</td></tr>
    <tr><td><code>Bar3DChart</code></td><td>Mỗi giá trị một cột, xếp thành các hàng, mỗi chuỗi một hàng theo chiều sâu, trong cùng hộp đó: lợi nhuận theo quý và lớp tài sản, khối lượng theo giờ và thứ trong tuần.</td></tr>
    <tr><td><code>PerformanceDashboard</code></td><td>Báo cáo chiến lược từ một lần backtest: thống kê, equity, drawdown và lợi nhuận theo tháng.</td></tr>
  </tbody>
</table>

<h2>Phần dùng chung</h2>
<pre><code>{`const chart = new BarChart(element, { categories, series, theme: 'dark' })

chart.setOptions({ mode: 'stacked' })   // any option, merged
chart.setTheme('light')                 // 'dark' | 'light' | a Theme
chart.screenshot('flows', { pixelRatio: 2 })   // a picture: see below
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

<h2 id="pictures">Ảnh, giấy, và vẽ khi không có trang</h2>
<p>
  Mỗi biểu đồ cho ra ảnh của chính nó, như biểu đồ giá: <code>screenshot(filename, options)</code>
  lưu một ảnh, <code>copyScreenshot()</code> đưa một PNG vào clipboard, còn <code>screenshotDataURL()</code>,
  <code>screenshotBlob()</code> và <code>toCanvas()</code> trả ảnh về. Biểu đồ được vẽ lại cho
  ảnh, trên đó không có gì đi theo con trỏ: ở kích thước của nó nhân với pixel ratio của màn hình, hoặc với
  <code>pixelRatio</code>, <code>theme</code> cùng <code>width</code> và <code>height</code> mà
  các tuỳ chọn đưa (biểu đồ được dàn lại cho kích thước khác). <code>print()</code> mở dialog in cho
  riêng biểu đồ và <code>toPdf()</code> trả về một PDF một trang, cả hai ở theme sáng và gấp đôi
  số pixel trừ khi chỉ định khác; <code>chartsToPdf</code> tạo một PDF từ nhiều biểu đồ
  (các tuỳ chọn có ở <a href={href('/docs/api')}>Ảnh, in và PDF</a>).
</p>
<pre><code>{`import { chartsToPdf } from '@tradecanvas/chart'

equity.screenshot('equity', { pixelRatio: 3 })                 // equity.png
const wide = flows.screenshotDataURL({ width: 1200, height: 400, type: 'jpeg' })
allocation.print({ title: 'Allocation' })
const report = await chartsToPdf([equity, flows, allocation], { title: 'March' })`}</code></pre>
<p>
  <code>renderFinanceChart</code> vẽ một biểu đồ lên context 2D của riêng bạn, không có trang: một canvas tạo trong
  Node, cho ảnh trong email, báo cáo hoặc tin nhắn của bot, hoặc một <code>OffscreenCanvas</code> trong
  worker. Tham số thứ hai gọi tên biểu đồ, bằng tên class bỏ <code>Chart</code> và viết thường
  chữ cái đầu (<code>'bar'</code>, <code>'equityCurve'</code>, <code>'boxPlot'</code>,
  <code>'surface'</code>, <code>'bar3d'</code>; <code>FINANCE_CHART_KINDS</code> liệt kê chúng), và tham số thứ ba
  là các tuỳ chọn của chính biểu đồ đó. Hàm vẽ theo kích thước bạn đưa, tính bằng đơn vị của context, trên nền của
  theme: muốn nhiều pixel hơn thì scale context trước.
</p>
<pre><code>{`import { createCanvas } from '@napi-rs/canvas'        // or another canvas for Node
import { renderFinanceChart } from '@tradecanvas/chart'

const canvas = createCanvas(1600, 800)
const ctx = canvas.getContext('2d')
ctx.scale(2, 2)                                        // an 800 × 400 chart at twice the pixels
renderFinanceChart(ctx, 'equityCurve', { data: equity, theme: 'light', font: { family: 'Inter' } }, { width: 800, height: 400 })
const png = canvas.toBuffer('image/png')`}</code></pre>
<p>
  Context phải có những gì context của trình duyệt có: path, chữ và phép đo chữ, và
  <code>getTransform</code>. Chữ được vẽ bằng font của theme, nên hãy chỉ định bằng <code>font</code> một font
  mà canvas của bạn có. Không có gì đi theo con trỏ và không có gì chuyển động: gauge đứng ở giá trị của nó. Performance
  dashboard được dựng bằng phần tử của trang và không được vẽ theo cách này; các biểu đồ của nó thì có. Biểu đồ giá có
  hàm riêng: <code>renderPriceChart</code>, ở trang API.
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

<h2>Payoff của quyền chọn</h2>
<p>
  <code>PayoffChart</code> vẽ lãi hoặc lỗ của một position quyền chọn tại ngày đáo hạn, theo giá của tài sản cơ sở:
  phần lãi được tô màu phía trên 0 và phần lỗ phía dưới, một đường nét đứt tại mỗi điểm hoà vốn và tại <code>spot</code>,
  giá hiện tại. Một leg là <code>'call'</code> hoặc <code>'put'</code>, mua (<code>'long'</code>) hoặc bán
  (<code>'short'</code>), với <code>strike</code> của nó và <code>premium</code> của một đơn vị; leg
  <code>'underlying'</code> là tài sản cơ sở được giữ bên cạnh chúng, tại <code>entry</code> của nó.
  <code>multiplier</code> là số đơn vị của một hợp đồng. Các giá được vẽ nằm quanh các strike, hoặc theo
  <code>range</code> đã cho. Con trỏ đọc lãi hoặc lỗ tại giá của nó.
</p>
<pre><code>{`import { PayoffChart, payoffStats, optionPayoff } from '@tradecanvas/chart'

const condor = [
  { type: 'put', side: 'long', strike: 90, premium: 1 },
  { type: 'put', side: 'short', strike: 95, premium: 2.5 },
  { type: 'call', side: 'short', strike: 105, premium: 2.5 },
  { type: 'call', side: 'long', strike: 110, premium: 1 },
]
const chart = new PayoffChart(el, { legs: condor, multiplier: 100, spot: 101.4, spotLabel: 'Spot' })
chart.update(otherLegs)

payoffStats(condor, 100)    // { maxProfit: 300, maxLoss: -200, breakevens: [92, 108] }
optionPayoff(condor, 100, 100)   // 300: what the legs make with the underlying at 100

// Before expiry: a second, dashed line, by a model
chart.setOptions({ model: { daysToExpiry: 30, volatility: 0.25, rate: 0.03 } })
positionValue(condor, 100, { daysToExpiry: 30, volatility: 0.25 }, 100)   // what the legs make with 30 days to go
optionPrice('call', 100, 105, { years: 30 / 365, volatility: 0.25 })      // one option's price`}</code></pre>
<p>
  <code>payoffStats</code> trả về mức lãi lớn nhất và mức lỗ lớn nhất của các leg tại ngày đáo hạn
  (<code>null</code> khi không có giới hạn: một call mua, một call bán đứng riêng) và các giá mà chúng hoà
  vốn. Leg không có strike, hoặc tài sản cơ sở không có entry, không được tính.
</p>
<p>
  Với <code>model</code>, biểu đồ vẽ lãi hoặc lỗ của position khi còn chừng đó ngày,
  bằng nét đứt, đè lên payoff, ghi tên hai đường phía trên vùng vẽ, mỗi tên cạnh một đoạn của chính đường đó
  (<code>expiryLabel</code> và <code>model.label</code> ghi chúng theo cách của bạn) và đọc cả hai dưới
  con trỏ. Mỗi quyền chọn được định giá
  như một quyền chọn kiểu châu Âu bằng Black-Scholes tại <code>volatility</code> của model (theo năm, dạng tỷ lệ:
  <code>0.25</code> là 25%), kèm <code>rate</code> và <code>dividendYield</code> khi có; <code>volatility</code>
  và <code>daysToExpiry</code> riêng của một leg thay cho của model, cho một skew hoặc một calendar
  spread. Đây là kết quả của một model, không phải báo giá: một quyền chọn kiểu Mỹ, hoặc quyền chọn có volatility thay đổi theo
  giá, có giá trị khác. <code>positionValue</code> và <code>optionPrice</code> là các phép tính đó, chính xác
  đến khoảng một phần triệu của giá; khi không còn ngày nào thì <code>positionValue</code> là
  <code>optionPayoff</code>, và khi tài sản cơ sở bằng 0 thì một put có giá trị bằng strike của nó, đã chiết khấu.
</p>

<h2>Đường cong: volatility smile, term structure</h2>
<p>
  <code>CurveChart</code> vẽ giá trị theo strike, kỳ hạn hoặc kỳ đáo hạn, mỗi chuỗi một đường. Các
  đường được bo cong qua các điểm của chúng mà không vượt qua giá trị chúng không đạt tới
  (<code>smooth: false</code> nối chúng bằng đoạn thẳng), chuỗi có <code>dashed</code> là đường của hôm qua bên cạnh
  đường của hôm nay, và <code>markers</code> là các đường có nhãn tại một x. Với <code>ticks</code>, trục x do
  bạn đặt tên, một kỳ hạn tại mỗi số ngày. Con trỏ bắt vào x gần nhất có báo giá và đọc
  mọi đường cong tại đó, dọc theo đường như nó được vẽ. <code>curveValueAt(points, x)</code> đọc một đường cong bằng code,
  theo đoạn thẳng giữa các điểm của nó, hoặc dọc theo đường bo cong khi tham số thứ ba là <code>true</code>.
</p>
<pre><code>{`import { CurveChart } from '@tradecanvas/chart'

// A smile: implied volatility against the strike, a line an expiry.
new CurveChart(el, {
  series: [
    { name: '1M', points: [{ x: 90, y: 31 }, { x: 100, y: 24 }, { x: 110, y: 27 }] },
    { name: '3M', points: [{ x: 90, y: 28 }, { x: 100, y: 25 }, { x: 110, y: 26 }] },
  ],
  markers: [{ x: 101.4, label: 'ATM' }],
  valueFormat: (v) => v.toFixed(1) + '%',
})

// A term structure: tenors along x, in days.
new CurveChart(el, {
  series: [
    { name: 'Today', points: [{ x: 30, y: 26 }, { x: 90, y: 25 }, { x: 365, y: 27 }] },
    { name: 'A week ago', points: [{ x: 30, y: 24 }, { x: 90, y: 25 }, { x: 365, y: 26 }], dashed: true },
  ],
  ticks: [{ x: 30, label: '1M' }, { x: 90, label: '3M' }, { x: 365, label: '1Y' }],
})`}</code></pre>

<h2>Box plot</h2>
<p>
  <code>BoxPlotChart</code> cho thấy độ phân tán giá trị của từng nhóm: một hộp từ tứ phân vị thứ nhất đến tứ phân vị thứ ba
  với một đường tại trung vị, râu kéo đến các giá trị xa nhất nằm trong khoảng <code>whiskers</code> lần chiều cao hộp tính từ
  hộp (1.5 khi bỏ trống; <code>Infinity</code> để lấy giá trị thấp nhất và cao nhất), và một vòng tròn cho mỗi giá trị
  nằm xa hơn. Một nhóm đưa <code>values</code> thô của nó, hoặc các số của nó trong <code>stats</code> khi chúng
  đã được tính ở nơi khác. <code>boxPlotStats(values)</code> là cùng phép tính đó trong code, và
  <code>labels</code> viết chữ của phần đọc giá trị bằng ngôn ngữ khác. <code>onBoxClick</code> trả về nhóm
  mà một click rơi vào cùng năm số của nó: ở bất kỳ đâu theo chiều dọc tại vị trí của nhóm trên vùng vẽ, như
  cách phần đọc giá trị chọn nhóm.
</p>
<pre><code>{`import { BoxPlotChart, boxPlotStats } from '@tradecanvas/chart'

new BoxPlotChart(el, {
  data: [{ label: 'Mon', values: mondayReturns }, { label: 'Tue', values: tuesdayReturns }],
  colorBySign: true,                     // by each box's median
  valueFormat: (v) => v.toFixed(1) + '%',
  onBoxClick: (group, stats) => openDay(group.label, stats.median),
})

boxPlotStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 100])
// { min: 1, q1: 3.25, median: 5.5, q3: 7.75, max: 9, outliers: [100] }`}</code></pre>

<h2>Radar</h2>
<p>
  <code>RadarChart</code> đặt nhiều thước đo lên các tia quanh một tâm, theo chiều kim đồng hồ từ vị trí 12 giờ, và
  nối các giá trị của mỗi chuỗi thành một hình. Một tia chạy từ <code>min</code> của nó ở tâm (0 khi bỏ
  trống, hoặc giá trị thấp nhất trên tia khi giá trị đó dưới 0) đến <code>max</code> của nó ở vành, là giá trị cao nhất
  trên tia khi không truyền: hãy đặt riêng cho từng tia
  khi các thước đo khác nhau về độ lớn. Biểu đồ cần ba tia. Con trỏ đọc mọi chuỗi trên tia
  gần nhất, và <code>onAxisClick</code> trả về tia đó cho một click: nhãn của nó, vị trí của nó trong
  <code>axes</code>, và giá trị của từng chuỗi trên đó.
</p>
<pre><code>{`import { RadarChart } from '@tradecanvas/chart'

new RadarChart(el, {
  axes: [{ label: 'Sharpe', max: 3 }, { label: 'Sortino', max: 3 }, { label: 'Calmar', max: 3 }, { label: 'Win rate', max: 100 }],
  series: [{ name: 'Strategy', values: [1.8, 2.4, 1.5, 58] }, { name: 'Benchmark', values: [1.0, 1.3, 0.7, 51] }],
  onAxisClick: ({ axis, index, values }) => explain(axis, values),   // 'Sortino', 1, [{ series: 'Strategy', value: 2.4 }, …]
})`}</code></pre>

<h2>Sunburst</h2>
<p>
  <code>SunburstChart</code> vẽ các phần của một tổng và các phần bên trong chúng, mỗi cấp một vòng. Phần có
  <code>children</code> lớn bằng tổng các phần con của nó; phần không có thì lấy <code>value</code> của nó. Vòng
  đầu tiên lấy màu của bảng màu, và mỗi vòng bên ngoài lấy màu của phần cha, nhạt hơn. Vẽ tối đa bốn vòng
  (<code>maxDepth</code> để ít hơn hoặc nhiều hơn), <code>innerRadius: 0</code> đóng lỗ ở giữa, và
  <code>centerLabel</code> cùng <code>centerValue</code> được ghi trong lỗ đó. Một click trả về phần đó và các
  nhãn dẫn xuống nó. Tên được ghi dọc theo vòng của chúng khi đủ chỗ.
</p>
<pre><code>{`import { SunburstChart } from '@tradecanvas/chart'

new SunburstChart(el, {
  data: [
    { label: 'Stocks', children: [{ label: 'Banks', value: 22 }, { label: 'Technology', value: 14 }] },
    { label: 'Bonds', value: 23 },
    { label: 'Cash', value: 18 },
  ],
  centerLabel: 'Total', centerValue: '1.2B',
  onNodeClick: (node, path) => openHoldings(path),   // ['Stocks', 'Banks']
})`}</code></pre>

<h2>Stacked area</h2>
<p>
  <code>StackedAreaChart</code> chồng nhiều chuỗi trên cùng các điểm, chuỗi đầu tiên ở dưới cùng: một
  tổng gồm những gì theo thời gian. Với <code>normalized</code>, giá trị tại mỗi điểm là tỷ trọng trong tổng của chúng và
  các vùng lấp đầy chiều cao: cơ cấu thay đổi thế nào. Giá trị dưới 0 được tính là không có. Con trỏ đọc mọi
  chuỗi và tổng của chúng tại điểm gần nhất.
</p>
<pre><code>{`import { StackedAreaChart } from '@tradecanvas/chart'

const chart = new StackedAreaChart(el, {
  categories: ['Jan', 'Feb', 'Mar', 'Apr'],
  series: [{ name: 'Stocks', values: [40, 44, 47, 52] }, { name: 'Bonds', values: [30, 29, 27, 25] }, { name: 'Cash', values: [30, 27, 26, 23] }],
  normalized: true,
})
chart.update(nextSeries, nextCategories)`}</code></pre>

<h2>Surface 3D</h2>
<p>
  <code>SurfaceChart</code> vẽ giá trị trên hai trục dưới dạng một mặt trong một hộp: <code>x</code> theo chiều ngang,
  <code>y</code> chạy về phía sau, và <code>values[yIndex][xIndex]</code> hướng lên. Các số dọc theo một trục được đặt theo
  giá trị của chúng, và được vẽ theo giá trị tăng dần dù thứ tự thế nào; các tên được đặt cách đều theo thứ tự đã cho, nên
  một danh sách kỳ hạn (<code>'1W'</code>, <code>'1M'</code>, <code>'1Y'</code>) không bị dồn ở đầu ngắn.
  Giá trị bị thiếu hoặc không phải số để lại một lỗ, và một vị trí dọc theo trục mà không phải số thì bị bỏ ra
  cùng các giá trị của nó.
</p>
<pre><code>{`import { SurfaceChart } from '@tradecanvas/chart'

const chart = new SurfaceChart(el, {
  x: [80, 90, 100, 110, 120],              // strikes
  y: ['1W', '1M', '3M', '6M', '1Y'],       // expiries
  values: impliedVolatility,               // values[expiry][strike]
  xLabel: 'Strike', yLabel: 'Expiry', valueLabel: 'IV',
  valueFormat: (v) => (v * 100).toFixed(1) + '%',
  onPointClick: (point) => openChain(point.x, point.y),
})
chart.update(nextValues)                   // or update(values, { x, y }) when the axes changed too`}</code></pre>
<p>
  Kéo để xoay biểu đồ: chuột xoay và nghiêng nó, ngón tay chỉ xoay, để trang vẫn cuộn được
  bên dưới. Từ bàn phím, khi Tab đã tới biểu đồ, các phím mũi tên xoay và nghiêng nó 5 độ (15
  khi giữ Shift) và Home đưa về như cũ; trình đọc màn hình được báo các phím, và sau mỗi phím là biểu đồ đang được nhìn
  từ đâu (<code>describeView</code> viết nội dung đó theo cách của bạn). Double click đưa về <code>view</code> mà
  các tuỳ chọn đã đưa
  (<code>{'{'} yaw: -35, pitch: 28 {'}'}</code> khi không đưa: <code>yaw</code> xoay biểu đồ quanh
  trục thẳng đứng của nó, <code>pitch</code> là độ cao của mắt so với mặt sàn, từ 0 đến 90 độ).
  <code>getView()</code> đọc biểu đồ đang được nhìn từ đâu, <code>setView()</code> đặt hướng nhìn,
  <code>onViewChange</code> đi theo nó, và <code>rotate: false</code> giữ nó đứng yên. Biểu đồ được vẽ
  không có phối cảnh, nên các đường song song trong dữ liệu vẫn song song trên màn hình, và nó giữ một
  kích thước khi được xoay.
</p>
<p>
  <code>style</code> là <code>'surface'</code> (một mặt có tô bóng, mặc định), <code>'wireframe'</code> (chỉ
  các đường của nó) hoặc <code>'slices'</code> (mỗi <code>y</code> là một đường tô kín riêng, cái này sau cái kia).
  Giá trị được tô màu theo <code>colorRamp</code>: mặc định là một sắc màu từ gần màu nền của biểu đồ đến mức đậm nhất,
  trên khoảng của các giá trị; truyền <code>colors</code> (từ hai màu trở lên, màu của giá trị thấp nhất trước) cùng
  <code>min</code> và <code>max</code> để dùng thang riêng, ví dụ một màu lỗ, một màu trung tính và một màu lãi
  ở hai bên mức 0. Con trỏ đọc điểm gần nhất của ô mà nó đang ở trên, là ô phía trước ở chỗ
  mặt gập đè lên chính nó. Lưới quá 120 điểm dọc theo một trục được làm thưa còn chừng đó điểm, giữ cả hai đầu, và
  còn 60 trong suốt lúc đang được xoay, để một lưới lớn xoay mượt.
</p>
<p>
  <code>depthSurface(snapshots, {'{'} levels {'}'})</code> chuyển một dãy sổ lệnh thành
  <code>x</code>, <code>y</code> và <code>values</code> của một surface: giá theo chiều ngang, thời gian của các sổ lệnh về phía sau, và tại mỗi điểm là
  khối lượng đang chờ từ giá tốt nhất ra đến giá đó, như depth chart thể hiện. <code>levels</code> là số
  mức giá (48 khi bỏ trống, tối đa 1,000), còn <code>from</code> và <code>to</code> giới hạn trong một khoảng
  giá.
</p>
<pre><code>{`import { SurfaceChart, depthSurface } from '@tradecanvas/chart'

// books: { time, bids: [{ price, volume }], asks: [...] }[], oldest first
const chart = new SurfaceChart(el, {
  ...depthSurface(books, { levels: 48 }),
  style: 'slices',
  xLabel: 'Price', yLabel: 'Time', valueLabel: 'Depth',
  yFormat: (ms) => new Date(ms).toISOString().slice(11, 16),
})`}</code></pre>

<h2>Cột 3D</h2>
<p>
  <code>Bar3DChart</code> dựng một cột trên mỗi giá trị, thành các hàng, mỗi chuỗi một hàng theo chiều sâu: <code>categories</code> theo chiều ngang
  và mỗi phần tử của <code>series</code> một hàng, hàng đầu tiên ở phía trước của trục <code>y</code>. Các cột bắt đầu
  từ 0; cột dưới 0 treo xuống từ mức 0, mức này được vẽ thành một mặt cắt ngang hộp. Biểu đồ nhận
  <code>view</code>, <code>rotate</code> và phần còn lại của những gì surface nhận để xoay, và
  <code>onBarClick</code> trả về nhóm, chuỗi và giá trị. Không vẽ quá 120 nhóm và 120
  chuỗi.
</p>
<pre><code>{`import { Bar3DChart } from '@tradecanvas/chart'

const chart = new Bar3DChart(el, {
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [{ name: 'Stocks', values: [4.2, 6.1, -2.4, 5.3] }, { name: 'Bonds', values: [1.1, 0.8, 1.6, -0.5] }],
  valueFormat: (v) => v.toFixed(1) + '%',
})
chart.update(nextSeries, nextCategories)`}</code></pre>

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
