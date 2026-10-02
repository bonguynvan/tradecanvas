<script lang="ts">
  import { base } from '$app/paths';
</script>

<svelte:head>
  <title>Embeddable widget — TradeCanvas docs</title>
  <meta name="description" content="Embed a fully configured trading chart in any page via a single iframe URL." />
</svelte:head>

<h1>Embeddable widget</h1>
<p>
  Drop a fully configured trading chart into any page via a single
  <code>&lt;iframe&gt;</code> URL. No npm install, no build step.
</p>

<h2>Basic iframe</h2>
<pre><code>{`<iframe
  src="https://your-site/tradecanvas/embed/?symbol=BTCUSDT&timeframe=5m&theme=dark"
  width="800"
  height="500"
  style="border: 0; border-radius: 12px;"
></iframe>`}</code></pre>

<h2>URL parameters</h2>
<table>
  <thead><tr><th>Param</th><th>Default</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>BTCUSDT</code></td><td>Binance symbol.</td></tr>
    <tr><td><code>timeframe</code></td><td><code>5m</code></td><td><code>1m</code>, <code>5m</code>, <code>15m</code>, <code>1h</code>, <code>4h</code>, <code>1d</code>.</td></tr>
    <tr><td><code>theme</code></td><td><code>dark</code></td><td><code>dark</code>, <code>light</code>, <code>darkTerminal</code>.</td></tr>
    <tr><td><code>chartType</code></td><td><code>candlestick</code></td><td>Any of the 17 types.</td></tr>
    <tr><td><code>indicators</code></td><td><em>none</em></td><td>Comma-separated ids, e.g. <code>indicators=sma,rsi</code>.</td></tr>
    <tr><td><code>trading</code></td><td><code>false</code></td><td>Show the trading panel.</td></tr>
  </tbody>
</table>

<h2>Live page</h2>
<p>
  Visit the <a href="{base}/embed">embed route</a> directly to preview without
  the docs chrome.
</p>
