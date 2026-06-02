<script lang="ts">
  import { base } from '$app/paths';
</script>

<svelte:head>
  <title>Getting Started — TradeCanvas docs</title>
  <meta name="description" content="Install TradeCanvas and render your first canvas trading chart in under a minute." />
</svelte:head>

<h1>Getting started</h1>
<p>Install TradeCanvas and render a chart in under a minute.</p>

<h2>Installation</h2>
<p>Use whichever package manager you prefer:</p>
<pre><code>npm install @tradecanvas/chart
# or
pnpm add @tradecanvas/chart
# or
yarn add @tradecanvas/chart</code></pre>

<h2>Drop-in widget</h2>
<p>
  <code>ChartWidget</code> is the fastest path to a working chart. It renders a full
  TradingView-like UI inside any host element — toolbar, drawing sidebar, settings
  dialog, status bar — with zero framework dependency.
</p>

<pre><code>{`import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  historyLimit: 500,
  trading: true,
  // Optional 0.9 features
  watchlist: true,         // right-side sparkline panel
  persistLayouts: true,    // remember per-symbol indicators / drawings
  // dragDropImport defaults to true — drop a CSV / JSON onto the chart
})`}</code></pre>

<p>
  Out of the box, the widget supports a full set of TradingView-style gestures:
  drag the price/time axes to scale, <kbd>Shift</kbd>+drag to measure,
  <kbd>Alt</kbd>+click to pin a tooltip, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd>
  for the command palette, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>P</kbd> for symbol search,
  and <kbd>?</kbd> to see the full shortcut sheet.
</p>

<h2>Headless Chart</h2>
<p>
  For full control over the surrounding UI, use the lower-level <code>Chart</code>
  class directly. You bring your own toolbar; you keep all features:
</p>

<pre><code>{`import { Chart } from '@tradecanvas/chart'

const chart = new Chart(host, {
  chartType: 'candlestick',
  theme: 'dark',
})

chart.setData(bars)
chart.addIndicator('sma', { period: 20 })`}</code></pre>

<h2>Framework wrappers</h2>
<p>
  React, Vue, and Svelte wrappers are available in the
  <a href="{base}/docs/frameworks">frameworks</a> section.
</p>

<h2>Next steps</h2>
<ul>
  <li><a href="{base}/docs/api">API reference</a> — full surface of <code>Chart</code> and <code>ChartWidget</code></li>
  <li><a href="{base}/docs/chart-types">Chart types</a> — 17 built-in chart types</li>
  <li><a href="{base}/docs/indicators">Indicators</a> — catalog of 33 indicators</li>
  <li><a href="{base}/docs/realtime">Realtime &amp; replay</a> — streaming adapters and replay mode</li>
  <li><a href="{base}/docs/analytics">Analytics</a> — strategy backtester and risk metrics</li>
</ul>
