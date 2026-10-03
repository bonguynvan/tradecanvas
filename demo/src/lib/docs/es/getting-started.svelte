<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Primeros pasos — Documentación de TradeCanvas</title>
  <meta name="description" content="Instala TradeCanvas y muestra tu primer gráfico de trading en canvas en menos de un minuto." />
</svelte:head>

<h1>Primeros pasos</h1>
<p>Instala TradeCanvas y muestra un gráfico en menos de un minuto.</p>

<h2>Instalación</h2>
<p>Usa el gestor de paquetes que prefieras:</p>
<pre><code>npm install @tradecanvas/chart
# or
pnpm add @tradecanvas/chart
# or
yarn add @tradecanvas/chart</code></pre>

<h2>Widget listo para usar</h2>
<p>
  <code>ChartWidget</code> es el camino más rápido hacia un gráfico funcional.
  Muestra una interfaz de trading completa dentro de cualquier elemento
  contenedor —barra de herramientas, barra lateral de dibujo, cuadro de
  configuración, barra de estado— sin depender de ningún framework.
</p>

<pre><code>{`import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  historyLimit: 500,
  trading: true,
  // Optional features
  watchlist: true,         // right-side sparkline panel
  persistLayouts: true,    // remember per-symbol indicators / drawings
  // dragDropImport defaults to true — drop a CSV / JSON onto the chart
})`}</code></pre>

<p>
  De serie, el widget admite todos los gestos de un trader profesional:
  arrastrar más allá de la última barra hacia el espacio futuro vacío, arrastrar
  los ejes de precio/tiempo para escalar, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+arrastrar
  para seleccionar varios dibujos, <kbd>Shift</kbd>+arrastrar para medir,
  <kbd>Alt</kbd>+clic para fijar la información de una barra,
  <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd> para la paleta de comandos,
  <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>P</kbd> para buscar símbolos y
  <kbd>?</kbd> para ver la lista completa de atajos.
</p>

<h2>Chart sin interfaz</h2>
<p>
  Para controlar por completo la interfaz que lo rodea, usa directamente la clase
  <code>Chart</code>, de más bajo nivel. Tú pones la barra de herramientas y
  conservas todas las funciones:
</p>

<pre><code>{`import { Chart } from '@tradecanvas/chart'

const chart = new Chart(host, {
  chartType: 'candlestick',
  theme: 'dark',
})

chart.setData(bars)
chart.addIndicator('sma', { period: 20 })`}</code></pre>

<h2>Envoltorios para frameworks</h2>
<p>
  Los envoltorios para React, Vue y Svelte están en la sección de
  <a href={href('/docs/frameworks')}>frameworks</a>.
</p>

<h2>Siguientes pasos</h2>
<ul>
  <li><a href={href('/docs/api')}>Referencia de la API</a> — superficie completa de <code>Chart</code> y <code>ChartWidget</code></li>
  <li><a href={href('/docs/chart-types')}>Tipos de gráfico</a> — 18 tipos de gráfico integrados</li>
  <li><a href={href('/docs/indicators')}>Indicadores</a> — catálogo de 85 indicadores</li>
  <li><a href={href('/docs/realtime')}>Tiempo real y repetición</a> — adaptadores de streaming y modo de repetición</li>
  <li><a href={href('/docs/analytics')}>Análisis</a> — backtester de estrategias y métricas de riesgo</li>
</ul>
