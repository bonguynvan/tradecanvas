<svelte:head>
  <title>Performance — TradeCanvas docs</title>
  <meta name="description" content="LTTB downsampling and visible-range rendering keep line charts smooth over 100k+ bars, with benchmark numbers." />
</svelte:head>

<h1>Performance</h1>
<p>A multi-layer Canvas2D pipeline repaints only dirty layers each frame. Two things keep large data fast.</p>

<h2>LTTB downsampling</h2>
<p>
  Line and area charts automatically downsample the visible range to ~2 points per pixel with
  <strong>Largest-Triangle-Three-Buckets</strong> when there are far more bars than pixels — the line
  stays visually identical while drawing dozens of times fewer points. A no-op at normal zoom. The
  algorithm is exported for your own use:
</p>
<pre><code>{`import { lttbDownsample } from '@tradecanvas/chart'

// indices preserving the shape of a 100k series, reduced to 1600 points
const idx = lttbDownsample(series.length, 1600, (i) => series[i].close)`}</code></pre>

<h2>Benchmark</h2>
<p>Downsampling throughput (<code>pnpm bench</code>, single core):</p>
<table>
  <thead><tr><th>Visible points → 1600</th><th>Time / frame</th><th>Throughput</th></tr></thead>
  <tbody>
    <tr><td>10,000</td><td>~0.025 ms</td><td>39,600 / s</td></tr>
    <tr><td>100,000</td><td>~0.32 ms</td><td>3,100 / s</td></tr>
    <tr><td>1,000,000</td><td>~2.6 ms</td><td>380 / s</td></tr>
  </tbody>
</table>
<p>
  A 100k-bar line chart downsamples in ~0.3 ms — well inside a 16.6 ms frame budget — then draws
  ~62× fewer points (100k → 1600).
</p>

<h2>Visible-range rendering</h2>
<p>Every renderer iterates only the bars currently in view, never the whole series.</p>
