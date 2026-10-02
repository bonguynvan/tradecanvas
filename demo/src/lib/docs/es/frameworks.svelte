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
<table>
  <thead><tr><th>Prop</th><th>Tipo</th><th>Notas</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>string</code></td><td>Obligatoria.</td></tr>
    <tr><td><code>timeframe</code></td><td><code>TimeFrame</code></td><td><code>'1m' | '5m' | '15m' | '1h' | '4h' | '1d'</code></td></tr>
    <tr><td><code>theme</code></td><td><code>ThemeName</code></td><td><code>'dark' | 'light' | 'darkTerminal'</code></td></tr>
    <tr><td><code>adapter</code></td><td><code>DataAdapter</code></td><td>Fuente del flujo en vivo.</td></tr>
    <tr><td><code>historyLimit</code></td><td><code>number</code></td><td>Barras iniciales que se cargan.</td></tr>
    <tr><td><code>trading</code></td><td><code>boolean</code></td><td>Activa la capa de trading.</td></tr>
    <tr><td><code>onReady</code></td><td><code>(chart) =&gt; void</code></td><td>Se dispara cuando el gráfico se ha montado.</td></tr>
  </tbody>
</table>

<blockquote>
  ¿Necesitas algo más allá de las props? Accede al <code>Chart</code> subyacente
  mediante <code>onReady</code>, una ref (React / Vue) o <code>bind:chart</code>
  (Svelte) para usar la API completa: dibujos, trading, adaptadores de ejecución,
  plugins, paneles redimensionables y más.
</blockquote>
