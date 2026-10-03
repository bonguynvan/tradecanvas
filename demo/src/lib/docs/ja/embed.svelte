<script lang="ts">
  import { base } from '$app/paths';
</script>

<svelte:head>
  <title>埋め込みウィジェット — TradeCanvas ドキュメント</title>
  <meta name="description" content="iframe の URL ひとつで、設定済みのトレーディングチャートを任意のページに埋め込めます。" />
</svelte:head>

<h1>埋め込みウィジェット</h1>
<p>
  <code>&lt;iframe&gt;</code> の URL ひとつで、設定済みのトレーディングチャートを任意のページに配置できます。
  npm install もビルド手順も不要です。
</p>

<h2>基本の iframe</h2>
<pre><code>{`<iframe
  src="https://your-site/tradecanvas/embed/?symbol=BTCUSDT&timeframe=5m&theme=dark"
  width="800"
  height="500"
  style="border: 0; border-radius: 12px;"
></iframe>`}</code></pre>

<h2>URL パラメーター</h2>
<table>
  <thead><tr><th>パラメーター</th><th>既定値</th><th>備考</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>BTCUSDT</code></td><td>Binance のシンボル。</td></tr>
    <tr><td><code>timeframe</code></td><td><code>5m</code></td><td><code>1m</code>、<code>5m</code>、<code>15m</code>、<code>1h</code>、<code>4h</code>、<code>1d</code>。</td></tr>
    <tr><td><code>theme</code></td><td><code>dark</code></td><td><code>dark</code>、<code>light</code>、<code>darkTerminal</code>。</td></tr>
    <tr><td><code>chartType</code></td><td><code>candlestick</code></td><td>18 種類のいずれか。</td></tr>
    <tr><td><code>indicators</code></td><td><em>なし</em></td><td>カンマ区切りの id。例：<code>indicators=sma,rsi</code>。</td></tr>
    <tr><td><code>trading</code></td><td><code>false</code></td><td>トレーディングパネルを表示します。</td></tr>
  </tbody>
</table>

<h2>ライブページ</h2>
<p>
  ドキュメントの枠なしでプレビューするには、<a href="{base}/embed">埋め込み用のルート</a>に直接アクセスしてください。
</p>
