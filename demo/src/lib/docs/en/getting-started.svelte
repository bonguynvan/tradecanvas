<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
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
  trading UI inside any host element — toolbar, drawing sidebar, settings
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
  // Optional features
  watchlist: true,         // right-side sparkline panel
  persistLayouts: true,    // remember per-symbol indicators / drawings
  // dragDropImport defaults to true — drop a CSV / JSON onto the chart
})`}</code></pre>

<p>
  Out of the box, the widget supports a full set of pro-trader gestures:
  drag past the last bar into empty future space, drag the price/time axes to scale,
  <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+drag to select several drawings, <kbd>Shift</kbd>+drag to measure,
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
  <a href={href('/docs/frameworks')}>frameworks</a> section.
</p>

<h2 id="ai">With a coding agent</h2>
<p>Coding agents can learn TradeCanvas instead of guessing it. The <strong>agent skill</strong> teaches the API with examples that are type-checked; in Claude Code it installs with two commands:</p>
<pre><code>{`/plugin marketplace add bonguynvan/tradecanvas
/plugin install tradecanvas@tradecanvas`}</code></pre>
<p>The <strong>MCP server</strong>, <code>@tradecanvas/mcp</code>, answers from the library's own catalog: indicator ids, their params and the keys of their lines; drawing tools and the points each takes; the options of <code>ChartWidget</code>, <code>Chart</code> and <code>ChartWidgetGrid</code>; feature switches and style keys. Its <code>validate_options</code> tool checks an options object before it is used and names the option that was meant. In Claude Code:</p>
<pre><code>{`claude mcp add tradecanvas -- npx -y @tradecanvas/mcp`}</code></pre>
<p>Cursor, Claude Desktop and most other clients take the same command in their MCP settings:</p>
<pre><code>{`{
  "mcpServers": {
    "tradecanvas": { "command": "npx", "args": ["-y", "@tradecanvas/mcp"] }
  }
}`}</code></pre>
<p>On Windows outside WSL, npx starts through <code>cmd</code>: <code>claude mcp add tradecanvas -- cmd /c npx -y @tradecanvas/mcp</code>, or in the settings <code>"command": "cmd", "args": ["/c", "npx", "-y", "@tradecanvas/mcp"]</code>. In Git Bash, which runs the <code>!</code> commands of Claude Code on Windows, write <code>//c</code>: Git Bash turns <code>/c</code> into a path.</p>
<p>Without either, <a href="https://tradecanvas.dev/llms.txt">llms.txt</a> and <a href="https://tradecanvas.dev/llms-full.txt">llms-full.txt</a> hand an assistant the docs in one file.</p>

<h2>Next steps</h2>
<ul>
  <li><a href={href('/docs/api')}>API reference</a> — full surface of <code>Chart</code> and <code>ChartWidget</code></li>
  <li><a href={href('/docs/chart-types')}>Chart types</a> — 18 built-in chart types</li>
  <li><a href={href('/docs/indicators')}>Indicators</a> — catalog of 134 indicators</li>
  <li><a href={href('/docs/realtime')}>Realtime &amp; replay</a> — streaming adapters and replay mode</li>
  <li><a href={href('/docs/analytics')}>Analytics</a> — strategy backtester and risk metrics</li>
</ul>
