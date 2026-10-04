<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Performance — TradeCanvas docs</title>
  <meta name="description" content="How TradeCanvas stays fast: two-canvas rendering, visible-range work, incremental indicators, cheap full loads, LTTB downsampling — with benchmark numbers." />
</svelte:head>

<h1>Performance</h1>
<p>
  A two-canvas Canvas2D pipeline repaints only what changed, and every per-frame step
  is bounded by what is on screen, not by how much history is loaded. The numbers below come from
  <code>pnpm bench</code> (single core) and from profiling the live widget; the
  <a href={href('/') + '#lab-title'}>Feature Lab</a> times real switches as you click.
</p>

<h2>Frames: flat from 500 to 100,000 bars</h2>
<ul>
  <li><strong>Two canvases</strong> — a scene canvas (grid, series, indicators, chart objects, axes) and a thin top canvas for the crosshair, legend and other pointer-tied visuals. A hover repaints only the top canvas (~0.2 ms), and the browser composites two surfaces, not four.</li>
  <li><strong>Visible-range rendering</strong> — every renderer, the auto-scale and the indicator price range walk only the bars in view.</li>
  <li><strong>No per-frame garbage</strong> — viewport snapshots are cached between changes; number and date formatters are reused instead of rebuilt per label.</li>
  <li><strong>Auto-sized price axis</strong> — fitting the axis to its longest label costs ~0.05 ms and only relayouts when the width really changes.</li>
</ul>

<h2>Live ticks: incremental indicators</h2>
<p>
  A tick only moves the forming bar, so indicators that implement <code>update()</code> recompute
  just that bar (SMA, EMA, WMA, VWMA, Bollinger, Envelope, RSI, MACD, ATR, OBV, Stochastic). Others
  fall back to a full recalculation. BB + EMA + RSI + MACD:
</p>
<table>
  <thead><tr><th>History</th><th>Full recalculation</th><th>Incremental <code>update()</code></th></tr></thead>
  <tbody>
    <tr><td>20,000 bars</td><td>~5 ms</td><td>~0.0005 ms</td></tr>
    <tr><td>100,000 bars</td><td>~27 ms</td><td>~0.001 ms</td></tr>
  </tbody>
</table>
<p>
  Custom indicators can opt in too — see <a href={href('/docs/plugins')}>Plugins → fast live updates</a>.
</p>

<h2>Switching symbol or timeframe</h2>
<ul>
  <li><strong>Cheap full loads</strong> — indicator values live in an <code>IndicatorValueMap</code> (array-backed, ~3× cheaper to build than a timestamp-keyed <code>Map</code>), and <code>setData</code> reuses already-valid bars instead of copying them.</li>
  <li><strong>Loading only when it is slow</strong> — the previous chart stays up; a veil appears only if a switch outlasts 200 ms, so a normal ~130 ms network switch never flashes.</li>
  <li><strong>No stale data</strong> — superseded history requests are dropped and old sockets detached, so the last click always wins.</li>
  <li><strong>Local resampling</strong> — static data switches timeframe without refetching; slow resamples paint the veil before the main thread gets busy.</li>
</ul>

<h2>LTTB downsampling</h2>
<p>
  Line and area charts downsample the visible range to ~2 points per pixel with
  <strong>Largest-Triangle-Three-Buckets</strong> when there are far more bars than pixels — the line
  stays visually identical while drawing dozens of times fewer points. A no-op at normal zoom. The
  algorithm is exported for your own use:
</p>
<pre><code>{`import { lttbDownsample } from '@tradecanvas/chart'

// indices preserving the shape of a 100k series, reduced to 1600 points
const idx = lttbDownsample(series.length, 1600, (i) => series[i].close)`}</code></pre>
<table>
  <thead><tr><th>Visible points → 1600</th><th>Time / frame</th><th>Throughput</th></tr></thead>
  <tbody>
    <tr><td>10,000</td><td>~0.025 ms</td><td>39,600 / s</td></tr>
    <tr><td>100,000</td><td>~0.32 ms</td><td>3,100 / s</td></tr>
    <tr><td>1,000,000</td><td>~2.6 ms</td><td>380 / s</td></tr>
  </tbody>
</table>

<h2>Indicators zoomed out</h2>
<p>
  Below a pixel per bar, indicator lines, bands and histograms draw one span per pixel column: the column's lowest to highest point, joined to the column before, as wide as the line. It looks much the same as a stroke through thousands of points for a fraction of the raster work. Zoomed out on 200,000 bars with Bollinger Bands, EMA, RSI and MACD, a frame went from about 54 ms to about 21 ms on integrated graphics. <code>node scripts/bench-render.mjs</code> runs these numbers on your own machine.
</p>

<h2>Off the main thread</h2>
<p>
  <code>IndicatorWorkerHost</code> runs indicator math in a Web Worker with a Promise-based
  <code>calculate()</code>, a per-request timeout, and a synchronous fallback for SSR and tests.
</p>
