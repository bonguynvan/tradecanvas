<script lang="ts">
  import { base } from '$app/paths';
</script>

<svelte:head>
  <title>Widget incrustable — Documentación de TradeCanvas</title>
  <meta name="description" content="Incrusta un gráfico de trading totalmente configurado en cualquier página con una sola URL de iframe." />
</svelte:head>

<h1>Widget incrustable</h1>
<p>
  Inserta un gráfico de trading totalmente configurado en cualquier página con
  una sola URL de <code>&lt;iframe&gt;</code>. Sin npm install ni paso de compilación.
</p>

<h2>iframe básico</h2>
<pre><code>{`<iframe
  src="https://your-site/tradecanvas/embed/?symbol=BTCUSDT&timeframe=5m&theme=dark"
  width="800"
  height="500"
  style="border: 0; border-radius: 12px;"
></iframe>`}</code></pre>

<h2>Parámetros de la URL</h2>
<table>
  <thead><tr><th>Parámetro</th><th>Predeterminado</th><th>Notas</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>BTCUSDT</code></td><td>Símbolo de Binance.</td></tr>
    <tr><td><code>timeframe</code></td><td><code>5m</code></td><td><code>1m</code>, <code>5m</code>, <code>15m</code>, <code>1h</code>, <code>4h</code>, <code>1d</code>.</td></tr>
    <tr><td><code>theme</code></td><td><code>dark</code></td><td><code>dark</code>, <code>light</code>, <code>darkTerminal</code>.</td></tr>
    <tr><td><code>chartType</code></td><td><code>candlestick</code></td><td>Cualquiera de los 17 tipos.</td></tr>
    <tr><td><code>indicators</code></td><td><em>ninguno</em></td><td>Ids separados por comas, p. ej. <code>indicators=sma,rsi</code>.</td></tr>
    <tr><td><code>trading</code></td><td><code>false</code></td><td>Muestra el panel de trading.</td></tr>
  </tbody>
</table>

<h2>Página en vivo</h2>
<p>
  Abre directamente la <a href="{base}/embed">ruta de incrustación</a> para
  previsualizarlo sin la interfaz de la documentación.
</p>
