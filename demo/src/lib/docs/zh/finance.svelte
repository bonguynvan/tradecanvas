<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>金融图表 — TradeCanvas 文档</title>
  <meta name="description" content="专用的金融渲染器：仪表图、热力图、市场深度图、迷你走势图、权益曲线和瀑布图。" />
</svelte:head>

<h1>金融图表</h1>
<p>面向金融仪表盘的专用渲染器，可与主K线图并列使用。</p>

<h2>可用的渲染器</h2>
<table>
  <thead><tr><th>渲染器</th><th>适用场景</th></tr></thead>
  <tbody>
    <tr><td><code>SparklineRenderer</code></td><td>紧凑的行情条、自选列表、KPI 单元格。</td></tr>
    <tr><td><code>GaugeRenderer</code></td><td>单一数值的仪表——市场情绪、风险、敞口。</td></tr>
    <tr><td><code>HeatmapRenderer</code></td><td>板块 / 资产相关性矩阵。</td></tr>
    <tr><td><code>DepthChartRenderer</code></td><td>L2 订单簿深度，累计买单 / 卖单。</td></tr>
    <tr><td><code>WaterfallRenderer</code></td><td>盈亏归因、可累加的资金流。</td></tr>
    <tr><td><code>EquityCurveRenderer</code></td><td>带回撤阴影的回测权益曲线。</td></tr>
    <tr><td><code>FinanceCrosshair</code></td><td>用于金融图表的多坐标轴十字光标。</td></tr>
  </tbody>
</table>

<h2>权益曲线示例</h2>
<p>可与<a href={href('/docs/analytics')}>分析</a>模块中的回测器搭配使用：</p>

<pre><code>{`import { Backtester } from '@tradecanvas/analytics'
import { EquityCurveRenderer } from '@tradecanvas/chart'

const result = new Backtester({ initialCash: 10_000 }).run(bars, myStrategy)

const renderer = new EquityCurveRenderer(canvas.getContext('2d')!)
renderer.render(result.equityCurve)`}</code></pre>

<h2>绩效仪表盘</h2>
<p>
  <code>PerformanceDashboard</code> 把这些金融渲染器组合成一份带主题的策略报告——
  顶部的关键统计条、权益曲线、水下回撤面板，以及按日历排列的月度收益热力图——
  直接由回测结果生成。
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
  如果需要自定义布局，相关的纯计算函数也已导出：
  <code>computeMonthlyReturns</code>、<code>computeDrawdownCurve</code>、
  <code>toEquityPoints</code> 和 <code>selectKeyStats</code>。
</p>

<h2>热力图布局</h2>
<p><code>HeatmapLayout</code> 可帮助你为任意指标矩阵计算方形网格和颜色刻度。</p>
