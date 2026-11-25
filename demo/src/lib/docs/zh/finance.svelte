<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>金融图表 — TradeCanvas 文档</title>
  <meta name="description" content="与K线图并列、用于金融仪表盘的图表：柱状图、环形图、散点图和气泡图、直方图、日历图、相关矩阵、迷你走势图、仪表图、热力图和矩形树图、瀑布图、深度图、权益曲线，以及绩效报告。" />
</svelte:head>

<h1>金融图表</h1>
<p>
  与K线图并列、用于仪表盘和报告的图表。每种图表都是一个类，接收一个元素及其选项，按元素自动调整大小，
  并以图表的深色或浅色主题绘制；多数图表随指针显示提示框。
</p>

<h2>图表一览</h2>
<table>
  <thead><tr><th>类</th><th>用途</th></tr></thead>
  <tbody>
    <tr><td><code>BarChart</code></td><td>按类别的数值：资金净流入、各交易时段的成交量、月度收益。分组或堆叠，竖向或横向，以零为界向上和向下延伸。</td></tr>
    <tr><td><code>DonutChart</code></td><td>整体中的各部分：资产配置、按行业的敞口。<code>innerRadius: 0</code> 即为饼图。</td></tr>
    <tr><td><code>ScatterChart</code></td><td>每项两个数值：风险与收益、估值与增长；点带有大小时即为气泡图。</td></tr>
    <tr><td><code>HistogramChart</code></td><td>数值如何分布：日收益、交易结果，可在均值或 VaR 处画线。</td></tr>
    <tr><td><code>CalendarChart</code></td><td>日历上每天一个值：日收益、盈亏、交易日志。</td></tr>
    <tr><td><code>MatrixChart</code></td><td>每对行与列一个值：相关性、按小时和星期的成交量。</td></tr>
    <tr><td><code>CounterClockChart</code></td><td>逐根 K 线的平均价格对平均成交量：个股的逆时钟循环。</td></tr>
    <tr><td><code>SparklineChart</code></td><td>自选列表行或 KPI 卡片中的小线图。</td></tr>
    <tr><td><code>GaugeChart</code></td><td>一个数值与若干区间对照：市场情绪、风险、保证金占用。</td></tr>
    <tr><td><code>HeatmapChart</code></td><td>按涨跌着色的单元格，排成网格，或排成按权重（市值）确定大小的矩形树图。使用 <code>grouped</code> 时即为板块地图。</td></tr>
    <tr><td><code>WaterfallChart</code></td><td>从起点到终点的各个步骤：盈亏归因、现金流。</td></tr>
    <tr><td><code>DepthChart</code></td><td>订单簿的累计买单和卖单。</td></tr>
    <tr><td><code>EquityCurveChart</code></td><td>账户价值随时间的变化，带回撤和基准。</td></tr>
    <tr><td><code>PayoffChart</code></td><td>期权持仓到期时的盈亏，随标的价格变化：价差组合、跨式组合、鹰式组合。</td></tr>
    <tr><td><code>CurveChart</code></td><td>数值对行权价或期限，每个序列一条线：波动率微笑、期限结构、收益率曲线。</td></tr>
    <tr><td><code>BoxPlotChart</code></td><td>每组数值如何分布：按星期、按月份、按策略的收益。</td></tr>
    <tr><td><code>RadarChart</code></td><td>同时显示多项指标，每项一条辐条：策略的评分卡与基准的评分卡并列。</td></tr>
    <tr><td><code>SunburstChart</code></td><td>整体中的各部分，以及各部分之内的部分：先按资产类别、再按行业、再按持仓的资产配置。</td></tr>
    <tr><td><code>StackedAreaChart</code></td><td>多个序列随时间逐层堆叠：总量由什么构成，或其构成如何变化。</td></tr>
    <tr><td><code>SurfaceChart</code></td><td>两个轴上的数值，画成 3D 盒子里的一张曲面，拖动即可转动：按行权价和到期日的隐含波动率、按价格和日期的盈利，或以切片显示订单簿深度随时间的变化。</td></tr>
    <tr><td><code>Bar3DChart</code></td><td>每个数值一根柱子，每个序列一排，画在同样的盒子里：按季度和资产类别的收益、按小时和星期的成交量。</td></tr>
    <tr><td><code>PerformanceDashboard</code></td><td>由回测生成的策略报告：统计数据、权益曲线、回撤和月度收益。</td></tr>
  </tbody>
</table>

<h2>共同之处</h2>
<pre><code>{`const chart = new BarChart(element, { categories, series, theme: 'dark' })

chart.setOptions({ mode: 'stacked' })   // 任意选项，合并生效
chart.setTheme('light')                 // 'dark' | 'light' | 一个 Theme
chart.screenshot('flows', { pixelRatio: 2 })   // 一张图片：见下文
chart.destroy()                        // 移除画布及其监听器`}</code></pre>
<p>
  在触摸屏上，轻点即可显示提示框，直到轻点别处才消失；拖动仍会滚动页面。图表按屏幕自身的像素绘制，因此在任何缩放比例下线条都保持清晰。深度图、权益曲线和瀑布图会根据标签自动留出边距，与较新的图表一致。
</p>
<p>
  文字使用系统的无衬线字体，与组件中的数字一致；<code>font</code> 可换成别的字体（<code>{'{'} family: MONO_FONT_FAMILY {'}'}</code> 可恢复等宽字体），自带字体的主题则保留其字体。<code>locale</code>（BCP 47 标签，如 <code>'vi'</code>）决定数字和日期的书写语言，不设置时跟随浏览器。每个图表默认用英文向屏幕阅读器描述自己，除非用 <code>ariaLabel</code> 换成你自己的表述。深度图的 <code>spreadLabel</code> 和权益曲线的 <code>benchmarkLabel</code> 用于设置画在图上的文字，仪表板的 <code>labels</code> 用于设置标题和各项指标的名称。
</p>
<p>
  每种图表都会填满其元素，并在元素尺寸变化时重绘。带悬停提示框的图表可用 <code>crosshair: false</code> 关闭提示框。
  柱状图、环形图、散点图、直方图、日历图和矩阵图会告诉屏幕阅读器它们显示的内容（画布带有 image 角色和一个标签）；
  <code>ariaLabel</code> 可以换成你自己的表述，例如用页面的语言。数字按 <code>valueFormat</code>（或
  <code>xFormat</code> / <code>yFormat</code>）显示，否则显示为 1,234.5，超过一万时显示为 12.3K。
</p>

<h2 id="pictures">图片、纸张，以及不依赖页面绘制</h2>
<p>
  每个图表都能给出自己的图片，与价格图表一样：<code>screenshot(filename, options)</code> 保存一张，<code>copyScreenshot()</code> 把一张 PNG 放到剪贴板，<code>screenshotDataURL()</code>、<code>screenshotBlob()</code> 和 <code>toCanvas()</code> 则把图片交给你。图表会为图片重新绘制，上面没有任何跟随指针的东西：按自身尺寸乘以屏幕的像素比，或按选项给出的 <code>pixelRatio</code>、<code>theme</code> 以及 <code>width</code> 和 <code>height</code>（换成另一个尺寸时会重新布局）。<code>print()</code> 只为图表打开打印对话框，<code>toPdf()</code> 给出一页的 PDF，除非另行指定，两者都使用浅色主题和两倍像素；<code>chartsToPdf</code> 把多个图表做成一个 PDF（选项见<a href={href('/docs/api')}>图片、打印与 PDF</a>）。
</p>
<pre><code>{`import { chartsToPdf } from '@tradecanvas/chart'

equity.screenshot('equity', { pixelRatio: 3 })                 // equity.png
const wide = flows.screenshotDataURL({ width: 1200, height: 400, type: 'jpeg' })
allocation.print({ title: 'Allocation' })
const report = await chartsToPdf([equity, flows, allocation], { title: 'March' })`}</code></pre>
<p>
  <code>renderFinanceChart</code> 不依赖页面，把图表画到你自己的 2D 上下文上：在 Node 中创建的画布，用于邮件、报告或机器人消息里的图片，或 worker 中的 <code>OffscreenCanvas</code>。第二个参数指定图表，用它的类名去掉 <code>Chart</code> 并把首字母小写（<code>'bar'</code>、<code>'equityCurve'</code>、<code>'boxPlot'</code>、<code>'surface'</code>、<code>'bar3d'</code>；<code>FINANCE_CHART_KINDS</code> 列出了它们），第三个参数是该图表自己的选项。它按上下文自己的单位绘制你给出的尺寸，画在主题的底色上：需要更多像素时，先缩放上下文。
</p>
<pre><code>{`import { createCanvas } from '@napi-rs/canvas'        // 或其他用于 Node 的画布
import { renderFinanceChart } from '@tradecanvas/chart'

const canvas = createCanvas(1600, 800)
const ctx = canvas.getContext('2d')
ctx.scale(2, 2)                                        // 800 × 400 的图表，两倍像素
renderFinanceChart(ctx, 'equityCurve', { data: equity, theme: 'light', font: { family: 'Inter' } }, { width: 800, height: 400 })
const png = canvas.toBuffer('image/png')`}</code></pre>
<p>
  上下文必须具备浏览器的上下文所具备的东西：路径、文字及其测量，以及 <code>getTransform</code>。文字使用主题的字体绘制，所以请用 <code>font</code> 指定一种你的画布有的字体。没有东西跟随指针，也没有东西会动：仪表图停在它的数值上。绩效仪表盘由页面元素构成，不能这样绘制；它里面的图表可以。价格图表有自己的函数：<code>renderPriceChart</code>，见 API 页面。
</p>

<h2>柱状图</h2>
<pre><code>{`import { BarChart } from '@tradecanvas/chart'

// 十个交易日的外资净买入：零以上为绿色，零以下为红色。
const flows = new BarChart(el, {
  categories: ['6/10', '7/10', '8/10', '9/10'],
  series: [{ name: 'Net', values: [-660, 860, -280, 230] }],
  colorBySign: true,                    // 或 { positive, negative }
  valueFormat: (v) => v + ' bn',
  onBarClick: ({ category, series, value, index }) => openDay(index),
})

// 多个序列并排，或堆叠：正值从零向上，负值从零向下。
new BarChart(el, {
  categories: ['Foreign', 'Proprietary', 'Retail'],
  series: [{ name: 'Buy', values: [820, 310, 4200] }, { name: 'Sell', values: [-760, -280, -4290] }],
  mode: 'stacked',
  orientation: 'horizontal',            // 柱条向右延伸，标签在左侧
  showValues: true,
})

flows.update(categories, series)`}</code></pre>
<p>
  数值轴上始终包含零。悬停在某个类别上会显示所有序列在该类别的数值；序列多于一个时显示图例
  （可用 <code>legend</code> 设置）。底部放不下的标签每隔几个类别显示一次。
</p>

<h2>环形图</h2>
<pre><code>{`import { DonutChart } from '@tradecanvas/chart'

new DonutChart(el, {
  data: [
    { label: 'Stocks', value: 52 },
    { label: 'Bonds', value: 23 },
    { label: 'Cash', value: 15 },
    { label: 'Gold', value: 10, color: '#d4a017' },
  ],
  innerRadius: 0.6,                     // 设为 0 即为饼图
  centerLabel: 'Total',
  centerValue: '1.2B ₫',
  onSliceClick: (slice) => filterBy(slice.label),
})`}</code></pre>
<p>
  扇区从十二点钟方向按顺时针排列；小于或等于 0 的值会被略去。空间足够时，每个扇区显示其占比；图例列出名称和占比，
  图表较宽时位于圆环旁边，否则位于下方。
</p>

<h2>散点图和气泡图</h2>
<pre><code>{`import { ScatterChart } from '@tradecanvas/chart'

new ScatterChart(el, {
  series: [{
    name: 'Banks',
    points: [
      { x: 21, y: 9, size: 480, label: 'VCB' },   // size：市值；气泡面积随之变化
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
  坐标轴会为最大的气泡留出空间（<code>maxRadius</code>，默认 24 px）；坐标轴跨过 x = 0 和 y = 0 时，
  会在那里画线标出（<code>zeroLines: false</code> 可隐藏）。
</p>

<h2>直方图</h2>
<pre><code>{`import { HistogramChart, histogramBins } from '@tradecanvas/chart'

new HistogramChart(el, {
  values: dailyReturns,                 // 单位为百分比
  binWidth: 0.5,                        // 或 bins: 20，或 'auto'（Sturges 规则）
  colorBySign: true,
  valueFormat: (v) => v.toFixed(1) + '%',
  markers: [{ value: mean, label: 'Mean' }, { value: var95, label: 'VaR 95%', color: '#e85a67' }],
})

histogramBins([1, 2, 2, 3, 10], { bins: 3 })
// [{ from: 1, to: 4, count: 4 }, { from: 4, to: 7, count: 0 }, { from: 7, to: 10, count: 1 }]`}</code></pre>

<h2>日历图</h2>
<pre><code>{`import { CalendarChart } from '@tradecanvas/chart'

// 一年的交易日，周一至周五，按当日涨跌着色。
new CalendarChart(el, {
  data: [{ date: '2025-01-02', value: 1.2 }, { date: '2025-01-03', value: -0.8 }],   // YYYY-MM-DD
  weekdays: 5,                          // 7（默认）为每天；weekStart: 0 让每周从周日开始
  locale: 'vi-VN',                      // 月份和星期的名称
  colorScale: { min: -2, max: 2 },      // 主题的红色和绿色，±2 时最深
  valueFormat: (v) => v.toFixed(2) + '%',
  onDayClick: (day) => openSession(day.date),
})`}</code></pre>
<p>
  周从左到右排列，星期从上到下排列，每个日历年一条，最多十年；图表高度不够时，最早的年份先被省去。没有值的日子画成空格，下方的色条显示色阶（<code>legend: false</code> 可隐藏）。
</p>

<h2>相关矩阵</h2>
<pre><code>{`import { MatrixChart, correlationMatrix } from '@tradecanvas/chart'

// 传入日收益而不是价格：每只股票一个数组，各数组的日期相同。
const names = ['VCB', 'BID', 'CTG', 'TCB']
const values = correlationMatrix(returnsByStock)

new MatrixChart(el, {
  rows: names,                          // 非方阵时使用 columns: [...]
  values,                               // values[row][column]
  triangle: 'lower',                    // 相关性只需一半
  colorScale: { min: -1, max: 1 },
  onCellClick: ({ row, column, value }) => compare(row, column),
})`}</code></pre>
<p>
  单元格保持正方形，放得下时显示数值（未设 <code>valueFormat</code> 时保留两位小数）；列名放不下时会倾斜显示。<code>correlationMatrix</code> 只配对两个序列都有的日期，少于三天时返回 NaN，该单元格留空。矩阵也适用于其他数值表，例如按小时和星期的成交量。
</p>
<p>
  列数较少的表格（例如按期间排列的财务报表各行）可用 <code>cellWidth: 'fill'</code>：各列平分行名旁边的宽度，行高保持不变，矩阵会占满图表，而不是小小地停在中间。给一个数字则按像素设定每列宽度，最多不超过可用空间。
</p>

<h2>板块地图</h2>
<pre><code>{`import { HeatmapChart } from '@tradecanvas/chart'

new HeatmapChart(el, {
  data: [
    { id: 'vcb', label: 'VCB', value: 0.8, weight: 480, group: '银行', logo: '/logos/vcb.png' },
    { id: 'hpg', label: 'HPG', value: 1.9, weight: 160, group: '钢铁' },
    { id: 'vhm', label: 'VHM', value: -2.4, weight: 170, group: '房地产' },
  ],
  grouped: true,                        // 先按板块、再按个股排列
  valueFormat: (v) => v.toFixed(1) + '%',
})`}</code></pre>
<p>
  每个板块所占面积等于其个股权重之和，放得下时板块名称和加权涨跌显示在其顶部。热力图的颜色范围为 -5 到 5，除非 <code>colorScale</code> 给出 <code>min</code> 和 <code>max</code>。
</p>
<p>
  带有 <code>logo</code> 的单元格在放得下时，会把 logo 画在名称上方的白色底板上；单元格变小时，先消失的是 logo，
  然后才是名称和数值。它接受与品种的 <code>logo</code> 相同的地址（<code>https:</code> 地址、你站点上的路径、
  <code>blob:</code> 或 <code>data:image/…</code> URL），只加载一次；加载失败的单元格按没有 logo 绘制。
  来自其他站点的 logo 必须带 CORS 响应头，这样图表仍能保存为图片；不带的会被略过。
  <code>showLogos: false</code> 不绘制任何 logo。无页面绘制（<code>renderFinanceChart</code>）时，热力图没有 logo。
</p>

<h2>逆时钟曲线</h2>
<pre><code>{`import { CounterClockChart } from '@tradecanvas/chart'

const clock = new CounterClockChart(el, {
  data: bars,                           // OHLCV K 线，最早的在前
  period: 25,                           // 每个均值包含的 K 线数
  points: 120,                          // 绘制最新的点数
  xLabel: '成交量，均值', yLabel: '价格，均值',
  onPointClick: (p) => goTo(p.time),
})

clock.getPhase()                        // 1–8：最后一步的方向`}</code></pre>
<p>
  每个点是成交量（横轴）和收盘价（纵轴）的 25 根均值，按时间顺序相连，越早越淡。健康的循环按逆时针方向转动。<code>getPhase()</code>（以及 <code>counterClockPhase(points)</code>）给出最后一步：1 量增，2 量价齐升，3 价升，4 价升量缩，5 量减，6 量价齐跌，7 价跌，8 价跌量增。
</p>

<h2>迷你走势图、仪表图、热力图、瀑布图、深度图和权益曲线</h2>
<pre><code>{`import { SparklineChart, GaugeChart, HeatmapChart, WaterfallChart, DepthChart, EquityCurveChart } from '@tradecanvas/chart'

new SparklineChart(el, { data: closes, mode: 'area', showLastPoint: true })

const gauge = new GaugeChart(el, {
  value: 72, min: 0, max: 100, label: 'Fear & Greed',
  zones: [{ from: 0, to: 45, color: '#e8505b' }, { from: 45, to: 55, color: '#8a93a3' }, { from: 55, to: 100, color: '#1fa874' }],
})
gauge.setValue(64)

// 按市值确定大小、按当日涨跌着色的矩形树图。
new HeatmapChart(el, {
  data: [{ id: 'vcb', label: 'VCB', value: 1.2, weight: 480 }, { id: 'fpt', label: 'FPT', value: -0.8, weight: 170 }],
  weighted: true, showLabels: true, showValues: true,
  onCellClick: (cell) => openSymbol(cell.label),
})

new WaterfallChart(el, { data: [{ label: 'Start', value: 10000, type: 'total' }, { label: 'Fees', value: -85 }, { label: 'End', value: 9915, type: 'total' }] })
new DepthChart(el, { data: { bids, asks }, midPriceLine: true, spreadLabel: true })
new EquityCurveChart(el, { data: equity, benchmark, drawdown: true })`}</code></pre>
<p>
  净值曲线还接受 <strong>levels</strong>，即在固定数值处横贯绘图区的线，每个数值写在轴上的标签里；以及
  <strong>bands</strong>，即曲线下方着色的数值区间。level 可设 <code>label</code>（写在线的右端；<code>labelAt: 'start'</code> 则写在左端，远离曲线的最新一点）、<code>color</code>
  和 <code>dash</code>（<code>[]</code> 为实线）；band 可设 <code>label</code>（在其左上角）和按原样使用的
  <code>color</code>，所以请传入带透明度的颜色。未给颜色时两者都使用主题的颜色。level 的数值完整写出，若给了
  <code>valueFormat</code> 则按它写。level 靠得太近、标签放不下时会彼此错开（空间不够全部显示时，舍去最低几个 level 的标签），
  绘图区内的名称也不会互相重叠。数值刻度会扩展以显示全部；<code>fitLevels: false</code> 让刻度只按曲线，刻度外的
  level 不画，band 只画与刻度重叠的部分。<code>setOptions</code> 可在原图表上修改它们。
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

<h2>期权损益</h2>
<p>
  <code>PayoffChart</code> 绘制期权持仓到期时的盈亏，随标的价格变化：零以上的盈利和零以下的亏损各自着色，每个盈亏平衡点和 <code>spot</code>（当前价格）处各有一条虚线。一条腿是 <code>'call'</code> 或 <code>'put'</code>，买入（<code>'long'</code>）或卖出（<code>'short'</code>），带有它的 <code>strike</code> 和一个单位的 <code>premium</code>；<code>'underlying'</code> 腿是与它们一同持有的标的，按其 <code>entry</code> 计。<code>multiplier</code> 是一张合约对应的单位数。绘制的价格在各行权价附近，或为给出的 <code>range</code>。指针读出其所在价格处的盈亏。
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
optionPayoff(condor, 100, 100)   // 300：标的在 100 时各条腿的盈亏

// 到期之前：按模型画出的第二条线，为虚线
chart.setOptions({ model: { daysToExpiry: 30, volatility: 0.25, rate: 0.03 } })
positionValue(condor, 100, { daysToExpiry: 30, volatility: 0.25 }, 100)   // 距到期还有 30 天时各条腿的盈亏
optionPrice('call', 100, 105, { years: 30 / 365, volatility: 0.25 })      // 单个期权的价格`}</code></pre>
<p>
  <code>payoffStats</code> 给出各条腿到期时的最大盈利和最大亏损（没有限度时为 <code>null</code>：买入的看涨期权、单独卖出的看涨期权），以及盈亏平衡的价格。没有行权价的腿，或没有入场价的标的，不计入。
</p>
<p>
  设置 <code>model</code> 后，图表会在损益线之上用虚线画出距到期还有这么多天时持仓的盈亏，在绘图区上方标出两条线的名称，每个名称旁有一小段它自己的线（<code>expiryLabel</code> 和 <code>model.label</code> 可换成你自己的文字），并在指针处读出两者。每个期权按欧式期权用 Black-Scholes 定价，使用模型的 <code>volatility</code>（年化，以小数表示：<code>0.25</code> 即 25%），给出时还使用 <code>rate</code> 和 <code>dividendYield</code>；腿自己的 <code>volatility</code> 和 <code>daysToExpiry</code> 会取代模型的，用于偏斜或日历价差。这是模型的答案，不是报价：美式期权，或波动率随价格变动的期权，价值会不同。<code>positionValue</code> 和 <code>optionPrice</code> 就是这些计算，精确到价格的约百万分之一；剩余天数为零时，<code>positionValue</code> 就是 <code>optionPayoff</code>，标的价格为零时，看跌期权的价值是其行权价的贴现值。
</p>

<h2>曲线：波动率微笑、期限结构</h2>
<p>
  <code>CurveChart</code> 绘制数值对行权价、期限或到期日的曲线，每个序列一条线。线条平滑地穿过各点，不会越过它没有达到的数值（<code>smooth: false</code> 用直线连接），带 <code>dashed</code> 的序列是画在今天的曲线旁边的昨天的曲线，<code>markers</code> 是位于某个 x 处、带标签的线。使用 <code>ticks</code> 时，x 轴由你命名，每个天数处写一个期限。指针吸附到最近的有报价的 x，并沿着画出的线读出那里的每条曲线。<code>curveValueAt(points, x)</code> 在代码中读取一条曲线，在各点之间按直线读，第三个参数为 <code>true</code> 时沿平滑后的线读。
</p>
<pre><code>{`import { CurveChart } from '@tradecanvas/chart'

// 微笑曲线：隐含波动率对行权价，每个到期日一条线。
new CurveChart(el, {
  series: [
    { name: '1M', points: [{ x: 90, y: 31 }, { x: 100, y: 24 }, { x: 110, y: 27 }] },
    { name: '3M', points: [{ x: 90, y: 28 }, { x: 100, y: 25 }, { x: 110, y: 26 }] },
  ],
  markers: [{ x: 101.4, label: 'ATM' }],
  valueFormat: (v) => v.toFixed(1) + '%',
})

// 期限结构：x 轴为期限，以天计。
new CurveChart(el, {
  series: [
    { name: 'Today', points: [{ x: 30, y: 26 }, { x: 90, y: 25 }, { x: 365, y: 27 }] },
    { name: 'A week ago', points: [{ x: 30, y: 24 }, { x: 90, y: 25 }, { x: 365, y: 26 }], dashed: true },
  ],
  ticks: [{ x: 30, label: '1M' }, { x: 90, label: '3M' }, { x: 365, label: '1Y' }],
})`}</code></pre>

<h2>箱线图</h2>
<p>
  <code>BoxPlotChart</code> 显示每组数值如何分布：一个从第一四分位数到第三四分位数的箱体，中位数处有一条线；须线延伸到距箱体不超过 <code>whiskers</code> 倍箱体高度的最远数值（省略时为 1.5；<code>Infinity</code> 则到最低值和最高值）；更远的每个数值画一个圆环。一个组给出原始的 <code>values</code>，或在数字已在别处算好时用 <code>stats</code> 给出这些数字。<code>boxPlotStats(values)</code> 是代码中同样的计算，<code>labels</code> 把读数的文字换成另一种语言。<code>onBoxClick</code> 给出点击所落在的组及其五个数字：在该组横向所占的位置上，上下任何地方都算，与读数选取组的方式相同。
</p>
<pre><code>{`import { BoxPlotChart, boxPlotStats } from '@tradecanvas/chart'

new BoxPlotChart(el, {
  data: [{ label: 'Mon', values: mondayReturns }, { label: 'Tue', values: tuesdayReturns }],
  colorBySign: true,                     // 按每个箱体的中位数
  valueFormat: (v) => v.toFixed(1) + '%',
  onBoxClick: (group, stats) => openDay(group.label, stats.median),
})

boxPlotStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 100])
// { min: 1, q1: 3.25, median: 5.5, q3: 7.75, max: 9, outliers: [100] }`}</code></pre>

<h2>雷达图</h2>
<p>
  <code>RadarChart</code> 把多项指标放在围绕中心的辐条上，从十二点钟方向按顺时针排列，并把每个序列的数值连成一个形状。辐条从中心处的 <code>min</code>（省略时为 0，其上的最低值低于零时则取该最低值）延伸到边缘处的 <code>max</code>，未给出时取其上的最高值：各项指标的大小不同时，请给每条辐条各自的值。它需要三条辐条。指针读出最近辐条上的每个序列，<code>onAxisClick</code> 在点击时给出那条辐条：它的标签、它在 <code>axes</code> 中的位置，以及每个序列在其上的数值。
</p>
<pre><code>{`import { RadarChart } from '@tradecanvas/chart'

new RadarChart(el, {
  axes: [{ label: 'Sharpe', max: 3 }, { label: 'Sortino', max: 3 }, { label: 'Calmar', max: 3 }, { label: 'Win rate', max: 100 }],
  series: [{ name: 'Strategy', values: [1.8, 2.4, 1.5, 58] }, { name: 'Benchmark', values: [1.0, 1.3, 0.7, 51] }],
  onAxisClick: ({ axis, index, values }) => explain(axis, values),   // 'Sortino', 1, [{ series: 'Strategy', value: 2.4 }, …]
})`}</code></pre>

<h2>旭日图</h2>
<p>
  <code>SunburstChart</code> 绘制整体中的各部分以及各部分之内的部分，每一层一个环。带 <code>children</code> 的部分与其子项合起来一样大；不带的取其 <code>value</code>。第一环使用调色板的颜色，其外的每一环使用其父项的颜色，但更浅。最多绘制四环（用 <code>maxDepth</code> 设置更少或更多），<code>innerRadius: 0</code> 封闭中间的孔，<code>centerLabel</code> 和 <code>centerValue</code> 写在孔中。点击会给出该部分以及一直到它的各级标签。名称在放得下的地方沿环书写。
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

<h2>堆叠面积图</h2>
<p>
  <code>StackedAreaChart</code> 在相同的点上堆叠多个序列，第一个在最下面：总量随时间由什么构成。使用 <code>normalized</code> 时，每个点的数值是其总和的占比，面积填满整个高度：构成如何变化。小于零的值按零计。指针读出最近点上的每个序列及其总和。
</p>
<pre><code>{`import { StackedAreaChart } from '@tradecanvas/chart'

const chart = new StackedAreaChart(el, {
  categories: ['Jan', 'Feb', 'Mar', 'Apr'],
  series: [{ name: 'Stocks', values: [40, 44, 47, 52] }, { name: 'Bonds', values: [30, 29, 27, 25] }, { name: 'Cash', values: [30, 27, 26, 23] }],
  normalized: true,
})
chart.update(nextSeries, nextCategories)`}</code></pre>

<h2>3D 曲面</h2>
<p>
  <code>SurfaceChart</code> 把两个轴上的数值画成盒子里的一张曲面：<code>x</code> 横向，<code>y</code> 向后延伸，<code>values[yIndex][xIndex]</code> 向上。轴上的数字按其数值定位，无论顺序如何都按数值从小到大绘制；名称按给出的顺序等距排列，所以一列期限（<code>'1W'</code>、<code>'1M'</code>、<code>'1Y'</code>）不会挤在短期一端。缺失或不是数字的值会留下一个洞，轴上不是数字的位置连同它的数值一起被略去。
</p>
<pre><code>{`import { SurfaceChart } from '@tradecanvas/chart'

const chart = new SurfaceChart(el, {
  x: [80, 90, 100, 110, 120],              // 行权价
  y: ['1W', '1M', '3M', '6M', '1Y'],       // 到期日
  values: impliedVolatility,               // values[expiry][strike]
  xLabel: 'Strike', yLabel: 'Expiry', valueLabel: 'IV',
  valueFormat: (v) => (v * 100).toFixed(1) + '%',
  onPointClick: (point) => openChain(point.x, point.y),
})
chart.update(nextValues)                   // 坐标轴也变了时用 update(values, { x, y })`}</code></pre>
<p>
  拖动可转动图表：鼠标可以旋转和倾斜它，手指只旋转它，这样页面仍能在它下面滚动。使用键盘时，Tab 到达图表后，方向键以 5 度（按住 Shift 为 15 度）旋转和倾斜它，Home 复位；屏幕阅读器会被告知这些按键，并在每次按键后被告知图表是从哪里观察的（<code>describeView</code> 可换成你自己的表述）。双击回到选项给出的 <code>view</code>（未给出时为 <code>{'{'} yaw: -35, pitch: 28 {'}'}</code>：<code>yaw</code> 让图表绕其竖直轴旋转，<code>pitch</code> 是视点高出底面的角度，0 到 90 度）。<code>getView()</code> 读取当前的观察位置，<code>setView()</code> 设置它，<code>onViewChange</code> 跟随它，<code>rotate: false</code> 让它保持不动。图表不带透视绘制，所以数据中平行的线在屏幕上仍然平行，转动时大小保持不变。
</p>
<p>
  <code>style</code> 为 <code>'surface'</code>（带明暗的曲面，默认）、<code>'wireframe'</code>（只画它的线）或 <code>'slices'</code>（每个 <code>y</code> 各是一条填充的线，一条排在另一条后面）。数值按 <code>colorRamp</code> 着色：默认是一种色相，在数值的范围内从接近图表底色到最浓；要用自己的颜色，请给出 <code>colors</code>（两种或更多，最低值的颜色在前）以及 <code>min</code> 和 <code>max</code>，例如零的两侧分别为亏损色和盈利色，中间为中性色。指针读出它所在单元格的最近的点，曲面自身折叠重合处取前面的那个。某个轴上超过 120 个点的网格会被抽稀到 120 个，两端保留，转动期间抽稀到 60 个，这样大网格也能流畅转动。
</p>
<p>
  <code>depthSurface(snapshots, {'{'} levels {'}'})</code> 把一连串订单簿变成曲面的 <code>x</code>、<code>y</code> 和 <code>values</code>：价格横向，订单簿的时间向后，每一处是从最优价到该价格之间等待成交的量，与深度图相同。<code>levels</code> 是价格的个数（省略时为 48，最多 1,000），<code>from</code> 和 <code>to</code> 把价格限制在一个区间内。
</p>
<pre><code>{`import { SurfaceChart, depthSurface } from '@tradecanvas/chart'

// books：{ time, bids: [{ price, volume }], asks: [...] }[]，最早的在前
const chart = new SurfaceChart(el, {
  ...depthSurface(books, { levels: 48 }),
  style: 'slices',
  xLabel: 'Price', yLabel: 'Time', valueLabel: 'Depth',
  yFormat: (ms) => new Date(ms).toISOString().slice(11, 16),
})`}</code></pre>

<h2>3D 柱状图</h2>
<p>
  <code>Bar3DChart</code> 在每个数值上立一根柱子，每个序列一排：<code>categories</code> 横向排列，<code>series</code> 中的每一个各占一排，第一个在 <code>y</code> 轴的最前面。柱子从零开始；小于零的柱子从零的高度向下悬挂，零的高度画成横贯盒子的一个平面。它接受 <code>view</code>、<code>rotate</code> 以及曲面用于转动的其余选项，<code>onBarClick</code> 给出类别、序列和数值。最多绘制 120 个类别和 120 个序列。
</p>
<pre><code>{`import { Bar3DChart } from '@tradecanvas/chart'

const chart = new Bar3DChart(el, {
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [{ name: 'Stocks', values: [4.2, 6.1, -2.4, 5.3] }, { name: 'Bonds', values: [1.1, 0.8, 1.6, -0.5] }],
  valueFormat: (v) => v.toFixed(1) + '%',
})
chart.update(nextSeries, nextCategories)`}</code></pre>

<h2>绩效仪表盘</h2>
<p>
  <code>PerformanceDashboard</code> 由回测结果组合出一份策略报告：一条关键统计条、权益曲线、其下方的回撤，
  以及月度收益日历。可与<a href={href('/docs/analytics')}>分析</a>模块中的回测器搭配使用。
</p>
<pre><code>{`import { Backtester } from '@tradecanvas/analytics'
import { PerformanceDashboard } from '@tradecanvas/chart'

const result = new Backtester({ initialCash: 10_000 }).run(bars, myStrategy)

const dash = new PerformanceDashboard(document.getElementById('report')!, {
  result,            // 任何 { equityCurve, metrics } 均可：Backtester 的输出正好适用
  theme: 'dark',
  title: 'SMA Crossover',
  subtitle: 'BTC/USDT · 1h · 2023',
})

// 之后：dash.update(newResult) · dash.setTheme('light') · dash.destroy()`}</code></pre>
<p>
  手动构建的指标与 <code>@tradecanvas/analytics</code> 返回的一样用小数表示：
  <code>totalReturnPct</code> 为 <code>0.12</code> 时显示为 +12.00%，若按百分比（<code>12</code>）传入，
  显示会大 100 倍。<code>maxDrawdownPct</code> 无论正负都显示为下跌。
</p>
<p>
  如需自定义布局，相关计算函数也已导出：<code>computeMonthlyReturns</code>、
  <code>computeDrawdownCurve</code>、<code>toEquityPoints</code>、<code>selectKeyStats</code>；
  如需自定义坐标轴，还有 <code>niceScale(min, max)</code>（刻度步长为 1、2、2.5 或 5）。
</p>
