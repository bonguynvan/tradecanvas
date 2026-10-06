<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Frameworks — Documentación de TradeCanvas</title>
  <meta name="description" content="Paquetes envoltorio de TradeCanvas para React, Vue y Svelte, con props y refs idiomáticas." />
</svelte:head>

<h1>Envoltorios para frameworks</h1>
<p>Envoltorios idiomáticos para React, Vue y Svelte. Los tres exponen las mismas props y te dan acceso a la instancia de <code>Chart</code> subyacente.</p>

<h2>Instalación</h2>
<pre><code>{`npm install @tradecanvas/react   # or @tradecanvas/vue · @tradecanvas/svelte
npm install @tradecanvas/chart   # the core (peer of each wrapper)`}</code></pre>

<h2>React</h2>
<pre><code>{`import { TradeCanvas, type TradeCanvasRef } from '@tradecanvas/react'
import { BinanceAdapter } from '@tradecanvas/chart'
import { useRef } from 'react'

function App() {
  const chartRef = useRef<TradeCanvasRef>(null)

  return (
    <TradeCanvas
      ref={chartRef}
      symbol="BTCUSDT"
      timeframe="5m"
      theme="dark"
      adapter={new BinanceAdapter()}
      onReady={(chart) => {
        chart.on('orderPlace', e => console.log(e.payload))
      }}
    />
  )
}`}</code></pre>

<h2>Vue</h2>
<pre><code>{'<' + `script setup lang="ts">
import { TradeCanvas } from '@tradecanvas/vue'
import { BinanceAdapter } from '@tradecanvas/chart'

const adapter = new BinanceAdapter()
` + '<' + `/script>

<template>
  <TradeCanvas
    symbol="BTCUSDT"
    timeframe="5m"
    theme="dark"
    :adapter="adapter"
    @ready="(chart) => console.log('ready', chart)"
  />
</template>`}</code></pre>

<h2>Svelte</h2>
<pre><code>{'<' + `script lang="ts">
  import { TradeCanvas } from '@tradecanvas/svelte'
  import { BinanceAdapter } from '@tradecanvas/chart'

  const adapter = new BinanceAdapter()
` + '<' + `/script>

<TradeCanvas
  symbol="BTCUSDT"
  timeframe="5m"
  theme="dark"
  {adapter}
  onReady={(chart) => console.log('ready', chart)}
/>`}</code></pre>

<h2>Props comunes</h2>
<p>Velas propias, indicadores con sus parámetros y un gráfico que nunca abre un flujo por su cuenta:</p>
<pre><code>{'<' + `script lang="ts">
  import { TradeCanvas } from '@tradecanvas/svelte'
  import type { Chart } from '@tradecanvas/chart'

  let { bars } = $props()
  let chart = $state<Chart | null>(null)
` + '<' + `/script>

<TradeCanvas
  data={bars}
  stream={false}
  indicators={['rsi', { id: 'ema', params: { period: 50 } }]}
  features={{ replay: true }}
  bind:chart
/>`}</code></pre>
<table>
  <thead><tr><th>Prop</th><th>Tipo</th><th>Notas</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>string</code></td><td>El símbolo del flujo. Por defecto <code>'BTCUSDT'</code>.</td></tr>
    <tr><td><code>timeframe</code></td><td><code>TimeFrame</code></td><td>La temporalidad del flujo. Por defecto <code>'5m'</code>.</td></tr>
    <tr><td><code>theme</code></td><td><code>'dark' | 'light' | Theme</code></td><td>Por defecto <code>'dark'</code>.</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartType</code></td><td>Por defecto <code>'candlestick'</code>.</td></tr>
    <tr><td><code>data</code></td><td><code>OHLCBar[]</code></td><td>Velas propias, tal cual. Si están al montar, no se abre ningún flujo; si llegan después, un flujo ya abierto sigue (<code>stream={false}</code> lo cierra).</td></tr>
    <tr><td><code>adapter</code></td><td><code>DataAdapter</code></td><td>El origen del flujo; Binance si no se da.</td></tr>
    <tr><td><code>stream</code></td><td><code>boolean</code></td><td><code>false</code>: ningún flujo, el gráfico espera a <code>data</code>. Por defecto <code>true</code>.</td></tr>
    <tr><td><code>historyLimit</code></td><td><code>number</code></td><td>Velas que el flujo carga primero. Por defecto 500.</td></tr>
    <tr><td><code>indicators</code></td><td><code>IndicatorSpec[]</code></td><td><code>'rsi'</code>, o <code>{'{ id, params, position }'}</code>; uno cuyos parámetros cambian se vuelve a poner con ellos.</td></tr>
    <tr><td><code>features</code></td><td><code>FeaturesConfig</code></td><td>Lo que el usuario puede hacer en el gráfico; los cambios tras montarlo también se aplican.</td></tr>
    <tr><td><code>signalMarkers / tradeZones</code></td><td><code>arrays</code></td><td>Marcas de compra y venta y operaciones; una repetición las muestra al llegar a ellas.</td></tr>
    <tr><td><code>signalMarkerStyle / tradeZoneStyle</code></td><td><code>estilos</code></td><td>Sus colores y etiquetas.</td></tr>
    <tr><td><code>overrides</code></td><td><code>ChartStyleOverrides</code></td><td>El aspecto del gráfico por clave (ver <a href={href('/docs/styling#overrides')}>Estilos</a>).</td></tr>
    <tr><td><code>autoScale</code></td><td><code>boolean</code></td><td>Por defecto <code>true</code>.</td></tr>
    <tr><td><code>watermarkText</code></td><td><code>string</code></td><td>Texto detrás de las velas.</td></tr>
    <tr><td><code>onReady</code></td><td><code>(chart) =&gt; void</code></td><td>Tras montar el gráfico (Vue: el evento <code>ready</code>).</td></tr>
  </tbody>
</table>

<blockquote>
  ¿Necesitas algo más allá de las props? Accede al <code>Chart</code> subyacente
  mediante <code>onReady</code>, una ref (React / Vue) o <code>bind:chart</code>
  (Svelte) para usar la API completa: dibujos, trading, adaptadores de ejecución,
  plugins, paneles redimensionables y más.
</blockquote>
