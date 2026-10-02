<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Plugins — TradeCanvas docs</title>
  <meta name="description" content="Extend TradeCanvas with custom indicators, drawing tools, chart types, and overlays via the plugin SDK." />
</svelte:head>

<h1>Plugins</h1>
<p>
  Extend the chart with custom <strong>indicators</strong>, <strong>drawing tools</strong>,
  <strong>chart types</strong>, and <strong>overlays</strong> — registered globally or per chart.
</p>

<h2>Registration</h2>
<p>Three ways to register, in precedence order: global defaults, the constructor, then imperative instance calls.</p>
<pre><code>{`import { Chart, registerPlugin } from '@tradecanvas/chart'

// 1) Global — every Chart created afterward inherits it
registerPlugin({ kind: 'indicator', plugin: new MyIndicator() })

// 2) Per-chart at construction
const chart = new Chart(el, { plugins: [{ kind: 'overlay', plugin: myHeatmap }] })

// 3) Imperative on an instance
chart.plugins.register({ kind: 'chartType', plugin: myCandles })
chart.plugins.unregister('chartType:my-candles')
chart.plugins.list()`}</code></pre>

<h2>Plugin kinds</h2>
<table>
  <thead><tr><th>Kind</th><th>Contract</th><th>Renders</th></tr></thead>
  <tbody>
    <tr><td><code>indicator</code></td><td><code>IndicatorPlugin</code> — <code>calculate()</code> + <code>render()</code></td><td>overlay or panel</td></tr>
    <tr><td><code>drawing</code></td><td><code>DrawingPlugin</code> — <code>render()</code> + <code>hitTest()</code></td><td>overlay layer</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartTypePlugin</code> — <code>createRenderer()</code> + optional <code>transform()</code></td><td>main series</td></tr>
    <tr><td><code>overlay</code></td><td><code>OverlayPlugin</code> — <code>render(ctx, &#123; viewport, data, theme &#125;)</code></td><td><code>main</code> / <code>overlay</code> / <code>ui</code></td></tr>
  </tbody>
</table>

<h2>Custom indicator</h2>
<p>Extend <code>IndicatorBase</code> for the drawing helpers, then register and add it like any built-in:</p>
<pre><code>{`import { IndicatorBase, IndicatorValueMap, registerPlugin } from '@tradecanvas/chart'

class DoubleSMA extends IndicatorBase {
  descriptor = {
    id: 'double-sma', name: 'Double SMA',
    placement: 'overlay', defaultConfig: { fast: 10, slow: 30 },
  }
  calculate(data, config) { /* values = new IndicatorValueMap(); return { values, series } */ }
  render(ctx, output, viewport, style) { /* draw lines */ }
}

registerPlugin({ kind: 'indicator', plugin: new DoubleSMA() })
chart.addIndicator('double-sma', { fast: 10, slow: 30 })`}</code></pre>
<p>
  For <code>values</code>, use <code>new IndicatorValueMap()</code> instead of <code>new Map()</code>: it's a drop-in
  <code>Map</code> that is several times cheaper to fill one bar at a time in time order, which is what every
  symbol or timeframe switch does over the whole history.
</p>

<h3>Fast live updates (optional)</h3>
<p>
  On every live tick only the forming bar changes. Implement <code>update()</code> to recompute just
  the bars from <code>from</code> onward instead of the whole history — the chart uses it on ticks and
  new bars, and falls back to <code>calculate()</code> when it's missing or returns <code>null</code>.
  It must produce the same values <code>calculate()</code> would.
</p>
<pre><code>{`update(data, config, prev, from) {
  if (!this.canResume(data, prev, from)) return null   // IndicatorBase helper
  for (let i = from; i < data.length; i++) {
    this.writePoint(prev, data, i, { value: /* recompute bar i */ 0 })
  }
  return prev
}`}</code></pre>

<h2>Custom chart type</h2>
<p>A <code>ChartTypePlugin</code> supplies a renderer and an optional data transform; switch to it like a built-in:</p>
<pre><code>{`registerPlugin({
  kind: 'chartType',
  plugin: {
    descriptor: { type: 'my-bricks', name: 'My Bricks' },
    createRenderer: () => new MyBrickRenderer(),
    transform: (raw) => toBricks(raw),   // optional
  },
})

chart.setChartType('my-bricks')`}</code></pre>

<h2>Custom overlay</h2>
<p>An <code>OverlayPlugin</code> draws each frame on the layer you choose, receiving the live viewport, data, and theme:</p>
<pre><code>{`registerPlugin({
  kind: 'overlay',
  plugin: {
    descriptor: { id: 'vwap-band', name: 'VWAP Band', layer: 'main' },
    render(ctx, { viewport, data, theme }) {
      // draw onto the main layer with the current viewport + data
    },
  },
})`}</code></pre>

<p>See the <a href={href('/docs/api')}>API reference</a> for the full plugin type signatures.</p>
