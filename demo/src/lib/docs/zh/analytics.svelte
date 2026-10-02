<script lang="ts">
  import BacktestPanel from '$lib/components/BacktestPanel.svelte';
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>分析与回测 — TradeCanvas 文档</title>
  <meta name="description" content="@tradecanvas/analytics——逐K线运行的 Backtester、Portfolio 账户跟踪，以及风险指标（Sharpe、Sortino、Calmar、最大回撤）。" />
</svelte:head>

<h1>分析</h1>
<p>
  <code>@tradecanvas/analytics</code> 提供一个无界面、逐K线运行的策略回测器，
  附带投资组合跟踪和汇总风险指标计算器。
  与<a href={href('/docs/realtime')}>回放模式</a>搭配使用，即可在图表上直观展示交易。
</p>

<BacktestPanel />
<p style="font-size: 12.5px; color: var(--text-muted); margin-top: -16px; margin-bottom: 24px;">
  ↑ 基于 365 天确定性合成数据的 SMA(10/30) 交叉策略实时回测。
  拖动滑块或点击“播放”，即可逐根K线查看权益曲线的变化。
</p>

<h2>Backtester</h2>
<p>执行模型：</p>
<ul>
  <li>策略函数在每根K线收盘时运行。</li>
  <li>在第 N 根K线下的订单于第 N+1 根K线成交——市价单按开盘价成交；限价单 / 止损单在K线价格穿过触发价时成交。</li>
  <li>权益按每根K线的收盘价计值。</li>
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
  <thead><tr><th>字段 / 方法</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td><code>bar</code></td><td>当前K线。</td></tr>
    <tr><td><code>index</code></td><td><code>bar</code> 在输入序列中的索引。</td></tr>
    <tr><td><code>history</code></td><td>截至并包含 <code>bar</code> 的所有K线。</td></tr>
    <tr><td><code>position</code></td><td>当前持仓，或 <code>null</code>。</td></tr>
    <tr><td><code>cash</code></td><td>可用现金。</td></tr>
    <tr><td><code>equity</code></td><td>现金 + 按市值计价的持仓价值。</td></tr>
    <tr><td><code>placeOrder(order)</code></td><td>将订单排入队列，在下一根K线执行。</td></tr>
    <tr><td><code>close(tag?)</code></td><td>以市价平掉当前持仓。</td></tr>
    <tr><td><code>cancel(orderId)</code></td><td>撤销一个挂单。</td></tr>
  </tbody>
</table>

<h2>手续费与滑点模型</h2>
<ul>
  <li><code>FixedCommission(perTrade)</code></li>
  <li><code>PercentCommission(rate)</code> — 名义金额的比例，例如 <code>0.001</code> = 10 个基点。</li>
  <li><code>PerShareCommission(perShare, minimum?)</code></li>
  <li><code>PercentSlippage(rate)</code> — 按价格比例计算的不利滑点。</li>
  <li><code>RangeBasedSlippage(factor)</code> — 与K线的价格区间成正比。</li>
</ul>

<h2>Portfolio</h2>
<p>跟踪现金、一个净持仓、已实现盈亏以及权益曲线。</p>
<pre><code>{`const portfolio = new Portfolio({ initialCash: 10_000 })
portfolio.applyFill({ ... })
portfolio.mark(time, price)         // record equity point

portfolio.getPosition()             // → { side, quantity, averagePrice, ... } | null
portfolio.getTrades()               // → closed trades
portfolio.getEquityCurve()          // → equity points
portfolio.equity(price)             // mark-to-market`}</code></pre>

<h2>风险指标</h2>
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
  将结果中的 <code>equityCurve</code> 与
  <a href={href('/docs/finance')}>EquityCurveRenderer</a> 搭配，即可可视化回测结果。
</p>

<h2>策略库</h2>
<p>开箱即用的参考策略——每个都返回一个 <code>StrategyFn</code>：</p>
<pre><code>{`import {
  Backtester,
  smaCrossStrategy,
  rsiReversionStrategy,
  donchianBreakoutStrategy,
  bollingerReversionStrategy,
} from '@tradecanvas/analytics'

const bt = new Backtester({ initialCash: 10_000 })
bt.run(bars, smaCrossStrategy({ fastPeriod: 10, slowPeriod: 30 }))`}</code></pre>

<h2>蒙特卡洛模拟</h2>
<p>
  将已实现交易的顺序随机打乱 N 次，以揭示路径依赖性。
  稳健的优势会让 P5/P95 区间保持收敛；依赖幸运交易顺序的策略，区间则会大幅发散。
</p>
<pre><code>{`import { runMonteCarlo } from '@tradecanvas/analytics'

const result = bt.run(bars, smaCrossStrategy())
const mc = runMonteCarlo(10_000, result.trades, {
  simulations: 1000,
  seed: 42,  // deterministic
})

mc.equityBands         // per-step P5/P25/P50/P75/P95
mc.finalEquityPercentiles  // { p5, p25, p50, p75, p95 }
mc.probabilityProfitable
mc.worstMaxDrawdownPct`}</code></pre>
