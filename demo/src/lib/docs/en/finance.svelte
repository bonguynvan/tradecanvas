<svelte:head>
  <title>Finance charts — TradeCanvas docs</title>
  <meta name="description" content="Specialized finance renderers: gauges, heatmaps, market depth, sparklines, equity curve, and waterfall." />
</svelte:head>

<h1>Finance charts</h1>
<p>Specialized renderers for finance dashboards, sitting alongside the main candle chart.</p>

<h2>Available renderers</h2>
<table>
  <thead><tr><th>Renderer</th><th>Use case</th></tr></thead>
  <tbody>
    <tr><td><code>SparklineRenderer</code></td><td>Compact tickers, watchlists, KPI cells.</td></tr>
    <tr><td><code>GaugeRenderer</code></td><td>Single scalar gauges — sentiment, risk, exposure.</td></tr>
    <tr><td><code>HeatmapRenderer</code></td><td>Sector / asset correlation matrices.</td></tr>
    <tr><td><code>DepthChartRenderer</code></td><td>L2 order book depth, cumulative bid/ask.</td></tr>
    <tr><td><code>WaterfallRenderer</code></td><td>P&amp;L attribution, additive flows.</td></tr>
    <tr><td><code>EquityCurveRenderer</code></td><td>Backtest equity curve with drawdown shading.</td></tr>
    <tr><td><code>FinanceCrosshair</code></td><td>Multi-axis crosshair for finance charts.</td></tr>
  </tbody>
</table>

<h2>Equity curve example</h2>
<p>Pair with the <a href="/tradecanvas/docs/analytics">analytics</a> backtester:</p>

<pre><code>{`import { Backtester } from '@tradecanvas/analytics'
import { EquityCurveRenderer } from '@tradecanvas/chart'

const result = new Backtester({ initialCash: 10_000 }).run(bars, myStrategy)

const renderer = new EquityCurveRenderer(canvas.getContext('2d')!)
renderer.render(result.equityCurve)`}</code></pre>

<h2>Performance dashboard</h2>
<p>
  <code>PerformanceDashboard</code> composes the finance renderers into a single,
  themed strategy report — a headline stats strip, an equity curve, an
  underwater drawdown panel, and a calendar monthly-returns heatmap — built
  directly from a backtest result.
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
  The pure derivations are exported too, if you want a custom layout:
  <code>computeMonthlyReturns</code>, <code>computeDrawdownCurve</code>,
  <code>toEquityPoints</code>, and <code>selectKeyStats</code>.
</p>

<h2>Heatmap layout</h2>
<p><code>HeatmapLayout</code> helps compute square grids and color scales for arbitrary metric matrices.</p>
