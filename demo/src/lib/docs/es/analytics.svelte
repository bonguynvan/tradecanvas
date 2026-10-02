<script lang="ts">
  import BacktestPanel from '$lib/components/BacktestPanel.svelte';
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Análisis y backtesting — Documentación de TradeCanvas</title>
  <meta name="description" content="@tradecanvas/analytics — Backtester barra a barra, seguimiento de cartera y métricas de riesgo (Sharpe, Sortino, Calmar, drawdown máximo)." />
</svelte:head>

<h1>Análisis</h1>
<p>
  <code>@tradecanvas/analytics</code> incluye un backtester de estrategias sin
  interfaz que avanza barra a barra, con seguimiento de cartera y una calculadora
  de métricas de riesgo resumidas. Combínalo con el <a href={href('/docs/realtime')}>modo de repetición</a>
  para ver las operaciones sobre el gráfico.
</p>

<BacktestPanel />
<p style="font-size: 12.5px; color: var(--text-muted); margin-top: -16px; margin-bottom: 24px;">
  ↑ Backtest en vivo de un cruce SMA(10/30) sobre 365 días de datos sintéticos deterministas.
  Mueve el control deslizante o pulsa Reproducir para recorrer la curva de capital barra a barra.
</p>

<h2>Backtester</h2>
<p>Modelo de ejecución:</p>
<ul>
  <li>La función de estrategia se ejecuta al cierre de cada barra.</li>
  <li>Las órdenes enviadas en la barra N se ejecutan en la barra N+1: las de mercado a la apertura; las límite/stop cuando la barra atraviesa el precio de activación.</li>
  <li>El capital se valora al cierre de cada barra.</li>
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
  <thead><tr><th>Campo / método</th><th>Descripción</th></tr></thead>
  <tbody>
    <tr><td><code>bar</code></td><td>Barra actual.</td></tr>
    <tr><td><code>index</code></td><td>Índice de <code>bar</code> en la serie de entrada.</td></tr>
    <tr><td><code>history</code></td><td>Barras hasta <code>bar</code>, incluida.</td></tr>
    <tr><td><code>position</code></td><td>Posición actual o <code>null</code>.</td></tr>
    <tr><td><code>cash</code></td><td>Efectivo disponible.</td></tr>
    <tr><td><code>equity</code></td><td>Efectivo + valor de mercado de la posición.</td></tr>
    <tr><td><code>placeOrder(order)</code></td><td>Pone en cola una orden para la barra siguiente.</td></tr>
    <tr><td><code>close(tag?)</code></td><td>Cierra a mercado la posición actual.</td></tr>
    <tr><td><code>cancel(orderId)</code></td><td>Cancela una orden pendiente.</td></tr>
  </tbody>
</table>

<h2>Modelos de comisión y deslizamiento</h2>
<ul>
  <li><code>FixedCommission(perTrade)</code></li>
  <li><code>PercentCommission(rate)</code> — fracción del nocional, p. ej. <code>0.001</code> = 10 pb.</li>
  <li><code>PerShareCommission(perShare, minimum?)</code></li>
  <li><code>PercentSlippage(rate)</code> — fracción adversa del precio.</li>
  <li><code>RangeBasedSlippage(factor)</code> — proporcional al rango de la barra.</li>
</ul>

<h2>Cartera</h2>
<p>Registra el efectivo, una posición neta, las ganancias y pérdidas realizadas y la curva de capital.</p>
<pre><code>{`const portfolio = new Portfolio({ initialCash: 10_000 })
portfolio.applyFill({ ... })
portfolio.mark(time, price)         // record equity point

portfolio.getPosition()             // → { side, quantity, averagePrice, ... } | null
portfolio.getTrades()               // → closed trades
portfolio.getEquityCurve()          // → equity points
portfolio.equity(price)             // mark-to-market`}</code></pre>

<h2>Métricas de riesgo</h2>
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
  Combina el <code>equityCurve</code> del resultado con
  <a href={href('/docs/finance')}>EquityCurveRenderer</a> para visualizar los backtests.
</p>

<h2>Biblioteca de estrategias</h2>
<p>Estrategias de referencia listas para usar; cada una devuelve una <code>StrategyFn</code>:</p>
<pre><code>{`import {
  Backtester,
  smaCrossStrategy,
  rsiReversionStrategy,
  donchianBreakoutStrategy,
  bollingerReversionStrategy,
} from '@tradecanvas/analytics'

const bt = new Backtester({ initialCash: 10_000 })
bt.run(bars, smaCrossStrategy({ fastPeriod: 10, slowPeriod: 30 }))`}</code></pre>

<h2>Monte Carlo</h2>
<p>
  Baraja N veces el orden de las operaciones realizadas para revelar la dependencia
  de la secuencia. Una ventaja sólida mantiene estrecha la banda P5/P95; una estrategia
  que depende de una secuencia afortunada se abre en abanico.
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
