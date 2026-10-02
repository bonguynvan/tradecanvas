<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Gráficos financieros — Documentación de TradeCanvas</title>
  <meta name="description" content="Renderizadores financieros especializados: indicadores de aguja, mapas de calor, profundidad de mercado, minigráficos, curva de capital y cascada." />
</svelte:head>

<h1>Gráficos financieros</h1>
<p>Renderizadores especializados para paneles financieros, que acompañan al gráfico de velas principal.</p>

<h2>Renderizadores disponibles</h2>
<table>
  <thead><tr><th>Renderizador</th><th>Caso de uso</th></tr></thead>
  <tbody>
    <tr><td><code>SparklineRenderer</code></td><td>Cotizaciones compactas, listas de seguimiento, celdas de KPI.</td></tr>
    <tr><td><code>GaugeRenderer</code></td><td>Indicadores de aguja de un solo valor: sentimiento, riesgo, exposición.</td></tr>
    <tr><td><code>HeatmapRenderer</code></td><td>Matrices de correlación entre sectores / activos.</td></tr>
    <tr><td><code>DepthChartRenderer</code></td><td>Profundidad del libro de órdenes L2, compra/venta acumuladas.</td></tr>
    <tr><td><code>WaterfallRenderer</code></td><td>Atribución de ganancias y pérdidas, flujos aditivos.</td></tr>
    <tr><td><code>EquityCurveRenderer</code></td><td>Curva de capital de un backtest con sombreado del drawdown.</td></tr>
    <tr><td><code>FinanceCrosshair</code></td><td>Cruz multieje para gráficos financieros.</td></tr>
  </tbody>
</table>

<h2>Ejemplo de curva de capital</h2>
<p>Combínalo con el backtester de <a href={href('/docs/analytics')}>análisis</a>:</p>

<pre><code>{`import { Backtester } from '@tradecanvas/analytics'
import { EquityCurveRenderer } from '@tradecanvas/chart'

const result = new Backtester({ initialCash: 10_000 }).run(bars, myStrategy)

const renderer = new EquityCurveRenderer(canvas.getContext('2d')!)
renderer.render(result.equityCurve)`}</code></pre>

<h2>Panel de rendimiento</h2>
<p>
  <code>PerformanceDashboard</code> combina los renderizadores financieros en un
  único informe de estrategia con tema: una franja de estadísticas principales,
  una curva de capital, un panel de drawdown («bajo el agua») y un mapa de calor
  de rentabilidades mensuales en forma de calendario, todo construido
  directamente a partir del resultado de un backtest.
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
  Las derivaciones puras también se exportan, por si quieres un diseño propio:
  <code>computeMonthlyReturns</code>, <code>computeDrawdownCurve</code>,
  <code>toEquityPoints</code> y <code>selectKeyStats</code>.
</p>

<h2>Disposición del mapa de calor</h2>
<p><code>HeatmapLayout</code> ayuda a calcular cuadrículas cuadradas y escalas de color para matrices de métricas arbitrarias.</p>
