<svelte:head>
  <title>Drawing tools — TradeCanvas docs</title>
  <meta name="description" content="23 built-in drawing tools: trendlines, Fibonacci, channels, Gann, Elliott waves, Volume Profile range, and more." />
</svelte:head>

<h1>Drawing tools</h1>
<p>23 built-in drawing tools. All tools support magnet snapping, undo/redo, and full JSON serialization.</p>

<h2>Activating a tool</h2>
<pre><code>{`chart.activateDrawingTool('trendLine')
// User clicks two points; the drawing is added to the manager.`}</code></pre>

<h2>Catalog</h2>

<h3>Lines</h3>
<ul>
  <li><code>trendLine</code></li>
  <li><code>ray</code></li>
  <li><code>extendedLine</code></li>
  <li><code>horizontalLine</code></li>
  <li><code>verticalLine</code></li>
</ul>

<h3>Channels</h3>
<ul>
  <li><code>parallelChannel</code></li>
  <li><code>regressionChannel</code></li>
</ul>

<h3>Shapes</h3>
<ul>
  <li><code>rectangle</code></li>
  <li><code>ellipse</code></li>
  <li><code>triangle</code></li>
</ul>

<h3>Fibonacci</h3>
<ul>
  <li><code>fibRetracement</code></li>
  <li><code>fibExtension</code></li>
  <li><code>fibTimeZones</code> — <strong>new in 0.8</strong>, vertical Fibonacci interval projections from a two-anchor time span.</li>
</ul>

<h3>Advanced</h3>
<ul>
  <li><code>pitchfork</code></li>
  <li><code>elliottWave</code></li>
  <li><code>gannFan</code></li>
  <li><code>gannBox</code></li>
  <li><code>anchoredVWAP</code></li>
  <li><code>volumeProfileRange</code></li>
</ul>

<h3>Measurement</h3>
<ul>
  <li><code>measure</code></li>
  <li><code>priceRange</code></li>
  <li><code>dateRange</code></li>
</ul>

<h3>Annotations</h3>
<ul>
  <li><code>text</code></li>
  <li><code>arrow</code></li>
</ul>

<h2>Serialization</h2>
<pre><code>{`const json = chart.serialize()              // → string
chart.deserialize(json)                     // validates + restores drawings/indicators/viewport`}</code></pre>

<p>
  <code>deserialize</code> filters malformed drawings, orders, and indicators —
  partial or corrupt payloads no longer poison the chart.
</p>
