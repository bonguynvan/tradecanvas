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
    <tr><td><code>chartType</code></td><td><code>candlestick</code></td><td>Any of the 18 types.</td></tr>
    <tr><td><code>indicators</code></td><td><em>none</em></td><td>Comma-separated ids, e.g. <code>indicators=sma,rsi</code>.</td></tr>
    <tr><td><code>trading</code></td><td><code>false</code></td><td>Show the trading panel.</td></tr>
  </tbody>
</table>

<h2 id="mobile-app">In a phone app</h2>
<p>
  The chart and the widget run in any WebView: React Native (<code>react-native-webview</code>), Capacitor, Tauri, a native app's own. Below 641 px wide the widget lays itself out for a phone: the toolbar keeps the symbol, the interval, the chart type and the indicators and puts the rest under “more”; the drawing tools wait behind a button over the chart; menus open as sheets from the bottom; a grid shows one chart at a time, with a tab for each. Wider, a toolbar that doesn't fit does the same. A finger does what a mouse does.
</p>
<p>Give the page a viewport that covers the screen. The widget keeps its sheets clear of the notch and the home bar, and above the on-screen keyboard.</p>
<pre><code>{`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`}</code></pre>
<p>Most WebViews report the page hidden when the app goes to the background: the chart then stops drawing by itself (<code>pauseWhenHidden</code>), and a stream silent too long reconnects when the app comes back. Where yours doesn't, pause it from the app.</p>
<pre><code>{`// React Native (react-native-webview): the app tells the page
AppState.addEventListener('change', (state) => {
  webview.current?.injectJavaScript(state === 'active' ? 'chart.resume(); true;' : 'chart.suspend(); true;');
});

// Capacitor
import { App } from '@capacitor/app';
App.addListener('appStateChange', ({ isActive }) => (isActive ? chart.resume() : chart.suspend()));`}</code></pre>
<p>A chart inside a screen that scrolls leaves vertical swipes to the screen.</p>
<pre><code>{`new Chart(host, { pageScroll: true })   // a chart in a screen that scrolls`}</code></pre>
<p>
  Tauri's content security policy must let the page reach the data feed's hosts. The widget also needs <code>style-src 'unsafe-inline'</code>, for the one <code>&lt;style&gt;</code> element it adds, and <code>img-src data:</code>, for the small icons in its fields and checkboxes: without the first it shows unstyled, without the second its fields lose their icons. Copying the chart image needs nothing more.
</p>
<pre><code>{`// tauri.conf.json (Tauri 2): the feed's hosts, the widget's styles and icons
"app": {
  "security": {
    "csp": "default-src 'self'; connect-src 'self' https://api.binance.com wss://stream.binance.com:9443; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
  }
}`}</code></pre>
<p>
  Tauri adds a nonce to <code>style-src</code> for each <code>&lt;style&gt;</code> element in the page's own HTML (and a hash in its isolation pattern), and a browser ignores <code>'unsafe-inline'</code> once a nonce is there, so the widget's styles are refused again. Keep the page's styles in stylesheet files, or list <code>"style-src"</code> under <code>dangerousDisableAssetCspModification</code>.
</p>
<p>
  The chart draws at a pixel ratio of 2 at most (<code>maxPixelRatio</code>); destroy it (<code>chart.destroy()</code>) when its screen closes, and its canvas memory goes back at once.
</p>

<h2>Live page</h2>
<p>
  Visit the <a href="{base}/embed">embed route</a> directly to preview without
  the docs chrome.
</p>
