<script lang="ts">
  import { base } from '$app/paths';
  import BacktestPanel from '$lib/components/BacktestPanel.svelte';
</script>

<svelte:head>
  <title>Analytics &amp; backtesting — TradeCanvas docs</title>
  <meta name="description" content="@tradecanvas/analytics — bar-by-bar Backtester, Portfolio tracking, and risk metrics (Sharpe, Sortino, Calmar, max drawdown)." />
</svelte:head>

<h1>Analytics (0.8)</h1>
<p>
  <code>@tradecanvas/analytics</code> ships a headless, bar-by-bar strategy
  backtester with portfolio tracking and a summary risk-metrics calculator.
  Pair it with <a href="{base}/docs/realtime">replay mode</a> to visualize trades on the chart.
</p>

<BacktestPanel />
<p style="font-size: 12.5px; color: var(--text-muted); margin-top: -16px; margin-bottom: 24px;">
  ↑ Live SMA(10/30) cross-over backtest on 365 days of deterministic synthetic data.
  Scrub the slider or press Play to step through the equity curve bar-by-bar.
</p>

<h2>Backtester</h2>
<p>Execution model:</p>
<ul>
  <li>Strategy fn runs at close of each bar.</li>
  <li>Orders placed on bar N fill on bar N+1 — market at open; limit/stop when the bar trades through the trigger price.</li>
  <li>Equity is marked to close of every bar.</li>
</ul>

<pre><code>{`import { Backtester, FixedCommission, PercentSlippage } from '@tradecanvas/analytics'

const bt = new Backtester({
  initialCash: 10_000,
  commission: new FixedCommission(2),
  slippage: new PercentSlippage(0.0005),
  allowShort: true,
})

const result = bt.run(historicalBars, (ctx) => {
  if (!ctx.position) {
    ctx.placeOrder({ side: 'long', type: 'market', quantity: 1 })
  } else if (ctx.bar.close > ctx.position.averagePrice * 1.02) {
    ctx.close()
  }
})

console.log(result.metrics.sharpe, result.metrics.maxDrawdownPct)`}</code></pre>

<h2>StrategyContext</h2>
<table>
  <thead><tr><th>Field / method</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>bar</code></td><td>Current bar.</td></tr>
    <tr><td><code>index</code></td><td>Index of <code>bar</code> in the input series.</td></tr>
    <tr><td><code>history</code></td><td>Bars up to and including <code>bar</code>.</td></tr>
    <tr><td><code>position</code></td><td>Current position or <code>null</code>.</td></tr>
    <tr><td><code>cash</code></td><td>Available cash.</td></tr>
    <tr><td><code>equity</code></td><td>Cash + mark-to-market position value.</td></tr>
    <tr><td><code>placeOrder(order)</code></td><td>Queue order for next bar.</td></tr>
    <tr><td><code>close(tag?)</code></td><td>Market-close current position.</td></tr>
    <tr><td><code>cancel(orderId)</code></td><td>Cancel a pending order.</td></tr>
  </tbody>
</table>

<h2>Commission &amp; slippage models</h2>
<ul>
  <li><code>FixedCommission(perTrade)</code></li>
  <li><code>PercentCommission(rate)</code> — fraction of notional, e.g. <code>0.001</code> = 10 bps.</li>
  <li><code>PerShareCommission(perShare, minimum?)</code></li>
  <li><code>PercentSlippage(rate)</code> — adverse fraction of price.</li>
  <li><code>RangeBasedSlippage(factor)</code> — proportional to the bar's range.</li>
</ul>

<h2>Portfolio</h2>
<p>Tracks cash, one net position, realized P&amp;L, and the equity curve.</p>
<pre><code>{`const portfolio = new Portfolio({ initialCash: 10_000 })
portfolio.applyFill({ ... })
portfolio.mark(time, price)         // record equity point

portfolio.getPosition()             // → { side, quantity, averagePrice, ... } | null
portfolio.getTrades()               // → closed trades
portfolio.getEquityCurve()          // → equity points
portfolio.equity(price)             // mark-to-market`}</code></pre>

<h2>Risk metrics</h2>
<pre><code>{`import { computeRiskMetrics } from '@tradecanvas/analytics'

const m = computeRiskMetrics(initialCash, equityCurve, trades, {
  periodsPerYear: 252,    // optional; auto-detected from timestamps
  riskFreeRate: 0.03,
})

m.totalReturnPct
m.cagr
m.sharpe
m.sortino
m.calmar
m.maxDrawdownPct
m.winRate
m.profitFactor
m.expectancy`}</code></pre>

<p>
  Pair the result's <code>equityCurve</code> with
  <a href="{base}/docs/finance">EquityCurveRenderer</a> to visualize backtests.
</p>
