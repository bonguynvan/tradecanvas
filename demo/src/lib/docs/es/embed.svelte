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
    <tr><td><code>chartType</code></td><td><code>candlestick</code></td><td>Cualquiera de los 18 tipos.</td></tr>
    <tr><td><code>indicators</code></td><td><em>ninguno</em></td><td>Ids separados por comas, p. ej. <code>indicators=sma,rsi</code>.</td></tr>
    <tr><td><code>trading</code></td><td><code>false</code></td><td>Muestra el panel de trading.</td></tr>
  </tbody>
</table>

<h2 id="mobile-app">En una app de móvil</h2>
<p>
  El gráfico y el widget funcionan en cualquier WebView: React Native (<code>react-native-webview</code>), Capacitor, Tauri o el de una app nativa. Por debajo de 641 px de ancho, el widget se organiza para un móvil: la barra conserva el símbolo, el intervalo, el tipo de gráfico y los indicadores y deja el resto bajo «más»; las herramientas de dibujo esperan tras un botón sobre el gráfico; los menús se abren como hojas desde abajo; una cuadrícula muestra un gráfico a la vez, con una pestaña para cada uno. Más ancho, una barra que no cabe hace lo mismo. Un dedo hace lo que hace un ratón.
</p>
<p>Dé a la página un viewport que cubra la pantalla. El widget mantiene sus hojas lejos de la muesca y la barra de inicio, y por encima del teclado en pantalla.</p>
<pre><code>{`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`}</code></pre>
<p>La mayoría de los WebView avisan de que la página está oculta cuando la app pasa a segundo plano: el gráfico deja de dibujar por sí solo (<code>pauseWhenHidden</code>) y un flujo callado demasiado tiempo se reconecta cuando la app vuelve. Si el suyo no avisa, páuselo desde la app.</p>
<pre><code>{`// React Native (react-native-webview): the app tells the page
AppState.addEventListener('change', (state) => {
  webview.current?.injectJavaScript(state === 'active' ? 'chart.resume(); true;' : 'chart.suspend(); true;');
});

// Capacitor
import { App } from '@capacitor/app';
App.addListener('appStateChange', ({ isActive }) => (isActive ? chart.resume() : chart.suspend()));`}</code></pre>
<p>Un gráfico dentro de una pantalla que se desplaza deja los deslizamientos verticales a la pantalla.</p>
<pre><code>{`new Chart(host, { pageScroll: true })   // a chart in a screen that scrolls`}</code></pre>
<p>La política de seguridad de contenido de Tauri debe permitir que la página llegue a los hosts del feed de datos.</p>
<pre><code>{`// tauri.conf.json (Tauri 2): let the page reach the feed
"app": {
  "security": {
    "csp": "default-src 'self'; connect-src 'self' https://api.binance.com wss://stream.binance.com:9443"
  }
}`}</code></pre>
<p>
  El gráfico dibuja como mucho a una densidad de píxeles de 2 (<code>maxPixelRatio</code>); destrúyalo (<code>chart.destroy()</code>) cuando se cierre su pantalla y la memoria de sus lienzos vuelve enseguida.
</p>

<h2>Página en vivo</h2>
<p>
  Abre directamente la <a href="{base}/embed">ruta de incrustación</a> para
  previsualizarlo sin la interfaz de la documentación.
</p>
