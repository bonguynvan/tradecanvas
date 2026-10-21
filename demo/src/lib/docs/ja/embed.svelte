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

<h2 id="mobile-app">スマートフォンアプリの中で</h2>
<p>
  チャートとウィジェットはどの WebView でも動きます：React Native（<code>react-native-webview</code>）、Capacitor、Tauri、ネイティブアプリ独自のもの。幅が 641 px 未満ではウィジェットがスマートフォン向けに並びます：ツールバーにはシンボル、時間足、チャートの種類、インジケーターが残り、残りは「その他」の中へ。描画ツールはチャート上のボタンの奥に、メニューは下からのシートで開き、グリッドはチャートを 1 つずつタブで切り替えて表示します。幅が広くても、収まらないツールバーは同じようにします。指でマウスと同じことができます。
</p>
<p>画面全体を覆う viewport をページに指定してください。ウィジェットはシートをノッチやホームバーから離し、画面キーボードの上に保ちます。</p>
<pre><code>{`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`}</code></pre>
<p>多くの WebView はアプリがバックグラウンドに回るとページを非表示と報告します。するとチャートは自ら描画を止め（<code>pauseWhenHidden</code>）、長く沈黙したストリームはアプリが戻ると再接続します。報告しない WebView では、アプリ側から一時停止してください。</p>
<pre><code>{`// React Native (react-native-webview): the app tells the page
AppState.addEventListener('change', (state) => {
  webview.current?.injectJavaScript(state === 'active' ? 'chart.resume(); true;' : 'chart.suspend(); true;');
});

// Capacitor
import { App } from '@capacitor/app';
App.addListener('appStateChange', ({ isActive }) => (isActive ? chart.resume() : chart.suspend()));`}</code></pre>
<p>スクロールする画面の中のチャートは、縦のスワイプを画面に任せます。</p>
<pre><code>{`new Chart(host, { pageScroll: true })   // a chart in a screen that scrolls`}</code></pre>
<p>Tauri のコンテンツセキュリティポリシーで、データフィードのホストへの接続を許可する必要があります。</p>
<pre><code>{`// tauri.conf.json (Tauri 2): let the page reach the feed
"app": {
  "security": {
    "csp": "default-src 'self'; connect-src 'self' https://api.binance.com wss://stream.binance.com:9443"
  }
}`}</code></pre>
<p>
  チャートはピクセル比 2 までで描画します（<code>maxPixelRatio</code>）。画面を閉じるときに破棄（<code>chart.destroy()</code>）すると、キャンバスのメモリはすぐに返されます。
</p>

<h2>ライブページ</h2>
<p>
  ドキュメントの枠なしでプレビューするには、<a href="{base}/embed">埋め込み用のルート</a>に直接アクセスしてください。
</p>
