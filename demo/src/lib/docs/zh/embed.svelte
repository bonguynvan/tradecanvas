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

<h2 id="mobile-app">在手机应用中</h2>
<p>
  图表和组件可在任何 WebView 中运行：React Native（<code>react-native-webview</code>）、Capacitor、Tauri 或原生应用自己的 WebView。宽度小于 641 px 时，组件按手机布局：工具栏保留代码、周期、图表类型和指标，其余放进“更多”；绘图工具收在图表上的一个按钮后面；菜单以底部面板打开；网格一次只显示一个图表，每个图表一个标签。更宽时，放不下的工具栏也会这样。手指能做鼠标能做的一切。
</p>
<p>给页面一个覆盖整个屏幕的 viewport。组件会让面板避开刘海和主屏幕指示条，并位于屏幕键盘之上。</p>
<pre><code>{`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`}</code></pre>
<p>大多数 WebView 会在应用转入后台时报告页面已隐藏：图表随即自行停止绘制（<code>pauseWhenHidden</code>），沉默太久的数据流会在应用回来时重新连接。若你的 WebView 不报告，请由应用来暂停。</p>
<pre><code>{`// React Native (react-native-webview): the app tells the page
AppState.addEventListener('change', (state) => {
  webview.current?.injectJavaScript(state === 'active' ? 'chart.resume(); true;' : 'chart.suspend(); true;');
});

// Capacitor
import { App } from '@capacitor/app';
App.addListener('appStateChange', ({ isActive }) => (isActive ? chart.resume() : chart.suspend()));`}</code></pre>
<p>放在可滚动屏幕里的图表把竖直滑动留给屏幕。</p>
<pre><code>{`new Chart(host, { pageScroll: true })   // a chart in a screen that scrolls`}</code></pre>
<p>Tauri 的内容安全策略必须允许页面访问数据源的主机。</p>
<pre><code>{`// tauri.conf.json (Tauri 2): let the page reach the feed
"app": {
  "security": {
    "csp": "default-src 'self'; connect-src 'self' https://api.binance.com wss://stream.binance.com:9443"
  }
}`}</code></pre>
<p>
  图表最多以 2 的像素比绘制（<code>maxPixelRatio</code>）；屏幕关闭时销毁它（<code>chart.destroy()</code>），画布内存立即归还。
</p>

<h2>在线页面</h2>
<p>
  直接访问 <a href="{base}/embed">嵌入页面</a>，即可在不带文档界面的情况下预览。
</p>
