<svelte:head>
  <title>Drawing tools — TradeCanvas docs</title>
  <meta name="description" content="40 built-in drawing tools: trendlines, Fibonacci channels and fans, Schiff pitchforks, harmonic patterns, Gann, Elliott waves, Volume Profile range, Long/Short Position, and more." />
</svelte:head>

<h1>Drawing tools</h1>
<p>40 built-in drawing tools. All tools support magnet snapping, undo/redo, and full JSON serialization.</p>

<h2>Activating a tool</h2>
<pre><code>{`chart.activateDrawingTool('trendLine')
// User clicks two points; the drawing is added to the manager.`}</code></pre>

<h2>Auto Fibonacci</h2>
<p>
  One click draws a Fibonacci retracement over the dominant swing (extreme high
  and low) in the visible range — anchored low→high for an up-swing, high→low
  for a down-swing. Run it from the command palette ("Auto Fibonacci"), or
  programmatically:
</p>
<pre><code>{`chart.autoFib()  // returns the new drawing id, or null if no clear swing

// general drawing append (active style applied, id auto-assigned)
chart.addDrawing({ type: 'fibRetracement', anchors: [a, b] })`}</code></pre>

<h2>Catalog</h2>

<h3>Lines</h3>
<ul>
  <li><code>trendLine</code></li>
  <li><code>ray</code></li>
  <li><code>extendedLine</code></li>
  <li><code>horizontalLine</code></li>
  <li><code>horizontalRay</code> — like <code>horizontalLine</code>, but only extends forward in time from the anchor.</li>
  <li><code>verticalLine</code></li>
  <li><code>crossLine</code> — a horizontal and a vertical line through one point (single click).</li>
  <li><code>infoLine</code> — trend line with a stats box: price change and %, bars and time spanned, angle.</li>
  <li><code>trendAngle</code> — trend line showing its on-screen angle in degrees.</li>
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
  <li><code>circle</code> — center point, then a point on the edge.</li>
</ul>

<h3>Fibonacci</h3>
<ul>
  <li><code>fibRetracement</code></li>
  <li><code>fibExtension</code></li>
  <li><code>fibTimeZones</code> — vertical Fibonacci interval projections from a two-anchor time span.</li>
  <li><code>fibChannel</code> — A→B is the base trend line, C sets the width; parallels at Fibonacci fractions of it.</li>
  <li><code>fibSpeedResistanceFan</code> — rays from A through Fibonacci fractions of the A→B move, in both price and time.</li>
</ul>

<h3>Advanced</h3>
<ul>
  <li><code>pitchfork</code> — Andrews' pitchfork.</li>
  <li><code>schiffPitchfork</code> — median starts halfway in price from A to B, at A's time.</li>
  <li><code>modifiedSchiffPitchfork</code> — median starts at the midpoint of A and B.</li>
  <li><code>cyclicLines</code> — vertical lines repeating at the A→B interval.</li>
  <li><code>gannFan</code></li>
  <li><code>gannBox</code></li>
  <li><code>anchoredVWAP</code></li>
  <li><code>volumeProfileRange</code></li>
</ul>

<h3>Patterns</h3>
<ul>
  <li><code>xabcdPattern</code> — harmonic XABCD (Gartley, Bat, Butterfly, Crab…) with the XB, AC, BD and XD ratios labelled.</li>
  <li><code>abcdPattern</code> — ABCD with the BC/AB and CD/BC ratios.</li>
  <li><code>headAndShoulders</code> — seven pivots with the neckline drawn through both neck points.</li>
  <li><code>elliottWave</code> — 1-2-3-4-5-A-B-C wave count.</li>
</ul>

<h3>Measurement</h3>
<ul>
  <li><code>measure</code></li>
  <li><code>priceRange</code></li>
  <li><code>dateRange</code></li>
  <li><code>dateAndPriceRange</code> — one box measuring price change, bars, time and volume traded.</li>
</ul>

<h3>Annotations</h3>
<ul>
  <li><code>text</code></li>
  <li><code>arrow</code></li>
  <li><code>priceLabel</code> — callout pinned to a point, showing its price (or <code>style.text</code>).</li>
</ul>

<h3>Position</h3>
<ul>
  <li><code>riskReward</code> — "Long/Short Position": drag from entry to stop; direction and a shaded risk/reward zone (2:1 by default) are computed automatically.</li>
</ul>

<h2>Serialization</h2>
<pre><code>{`const json = chart.serialize()              // → string
chart.deserialize(json)                     // validates + restores drawings/indicators/viewport`}</code></pre>

<p>
  <code>deserialize</code> filters malformed drawings, orders, and indicators —
  partial or corrupt payloads no longer poison the chart.
</p>
