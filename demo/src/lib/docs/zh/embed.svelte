<script lang="ts">
  import { base } from '$app/paths';
</script>

<svelte:head>
  <title>可嵌入组件 — TradeCanvas 文档</title>
  <meta name="description" content="只需一个 iframe 地址，即可在任意页面中嵌入配置完整的交易图表。" />
</svelte:head>

<h1>可嵌入组件</h1>
<p>
  只需一个 <code>&lt;iframe&gt;</code> 地址，即可把配置完整的交易图表放进任意页面。
  无需 npm 安装，也无需构建步骤。
</p>

<h2>基本 iframe</h2>
<pre><code>{`<iframe
  src="https://your-site/tradecanvas/embed/?symbol=BTCUSDT&timeframe=5m&theme=dark"
  width="800"
  height="500"
  style="border: 0; border-radius: 12px;"
></iframe>`}</code></pre>

<h2>URL 参数</h2>
<table>
  <thead><tr><th>参数</th><th>默认值</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>BTCUSDT</code></td><td>Binance 交易对代码。</td></tr>
    <tr><td><code>timeframe</code></td><td><code>5m</code></td><td><code>1m</code>、<code>5m</code>、<code>15m</code>、<code>1h</code>、<code>4h</code>、<code>1d</code>。</td></tr>
    <tr><td><code>theme</code></td><td><code>dark</code></td><td><code>dark</code>、<code>light</code>、<code>darkTerminal</code>。</td></tr>
    <tr><td><code>chartType</code></td><td><code>candlestick</code></td><td>18 种类型中的任意一种。</td></tr>
    <tr><td><code>indicators</code></td><td><em>无</em></td><td>以逗号分隔的 id，例如 <code>indicators=sma,rsi</code>。</td></tr>
    <tr><td><code>trading</code></td><td><code>false</code></td><td>显示交易面板。</td></tr>
  </tbody>
</table>

<h2>在线页面</h2>
<p>
  直接访问 <a href="{base}/embed">嵌入页面</a>，即可在不带文档界面的情况下预览。
</p>
