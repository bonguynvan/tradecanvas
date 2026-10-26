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
    <tr><td><code>PerformanceDashboard</code></td><td>由回测生成的策略报告：统计数据、权益曲线、回撤和月度收益。</td></tr>
  </tbody>
</table>

<h2>共同之处</h2>
<pre><code>{`const chart = new BarChart(element, { categories, series, theme: 'dark' })

chart.setOptions({ mode: 'stacked' })   // 任意选项，合并生效
chart.setTheme('light')                 // 'dark' | 'light' | 一个 Theme
chart.destroy()                         // 移除画布及其监听器`}</code></pre>
<p>
  每种图表都会填满其元素，并在元素尺寸变化时重绘。带悬停提示框的图表可用 <code>crosshair: false</code> 关闭提示框。
  柱状图、环形图、散点图、直方图、日历图和矩阵图会告诉屏幕阅读器它们显示的内容（画布带有 image 角色和一个标签）；
  <code>ariaLabel</code> 可以换成你自己的表述，例如用页面的语言。数字按 <code>valueFormat</code>（或
  <code>xFormat</code> / <code>yFormat</code>）显示，否则显示为 1,234.5，超过一万时显示为 12.3K。
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

<h2>板块地图</h2>
<pre><code>{`import { HeatmapChart } from '@tradecanvas/chart'

new HeatmapChart(el, {
  data: [
    { id: 'vcb', label: 'VCB', value: 0.8, weight: 480, group: '银行' },
    { id: 'hpg', label: 'HPG', value: 1.9, weight: 160, group: '钢铁' },
    { id: 'vhm', label: 'VHM', value: -2.4, weight: 170, group: '房地产' },
  ],
  grouped: true,                        // 先按板块、再按个股排列
  valueFormat: (v) => v.toFixed(1) + '%',
})`}</code></pre>
<p>
  每个板块所占面积等于其个股权重之和，放得下时板块名称和加权涨跌显示在其顶部。热力图的颜色范围为 -5 到 5，除非 <code>colorScale</code> 给出 <code>min</code> 和 <code>max</code>。
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
