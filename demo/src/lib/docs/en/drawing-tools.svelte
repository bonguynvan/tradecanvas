<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Drawing tools — TradeCanvas docs</title>
  <meta name="description" content="69 built-in drawing tools with their own settings: Fibonacci and Gann tools, Elliott waves, harmonic patterns, notes, brushes, Long/Short Position with sizing, alerts on drawings, groups and layers." />
</svelte:head>

<h1>Drawing tools</h1>
<p>
  69 built-in drawing tools. Each one snaps to the bars with the magnet, takes
  undo and redo, keeps its own settings, and is saved with the layout.
</p>

<h2>Drawing with the pointer</h2>
<pre><code>{`chart.setDrawingTool('trendLine')   // the next clicks draw a trend line
chart.setDrawingTool(null)          // back to the cursor
chart.setStayInDrawingMode(true)    // keep the tool after each drawing`}</code></pre>
<p>A tool is drawn one of three ways:</p>
<ul>
  <li><b>Clicks</b> — one click per point (two for a trend line, five for an XABCD pattern).</li>
  <li><b>Freehand</b> — press and drag; <code>brush</code> and <code>highlighter</code>.</li>
  <li><b>Path</b> — one click per point, then a double-click, <kbd>Enter</kbd>, or a click on the last point ends it; <code>path</code> and <code>polyline</code>.</li>
</ul>
<p><kbd>Escape</kbd> drops a drawing that is not finished yet.</p>

<h2>Adding drawings from code</h2>
<pre><code>{`const id = chart.addDrawing({
  type: 'fibRetracement',
  anchors: [{ time: t1, price: 101.2 }, { time: t2, price: 96.4 }],
  style: { color: '#f2a93b' },
  options: { reverse: true, extendRight: true },
})

chart.autoFib()   // a retracement over the dominant swing in view, or null`}</code></pre>

<h2>Settings</h2>
<p>
  Besides its style (colour, width, line style, fill, text), a tool can offer
  settings of its own: Fibonacci levels, extending a line left or right,
  labels, a background, an icon, a wave degree. The settings dialog of the
  widget is built from them.
</p>
<pre><code>{`chart.getDrawingOptionDefs('fibRetracement')  // what the tool offers
chart.getDrawingOptions(id)                   // its values, defaults filled in
chart.setDrawingOptions(id, {
  levels: [{ value: 0.5, visible: true }, { value: 0.618, visible: true, color: '#e8505b' }],
})

// several changes as one undo step
chart.updateDrawing(id, { style: { lineWidth: 2 }, options: { extendLeft: true } })

// a dialog previewing changes: one undo step, or put back on cancel
chart.beginDrawingEdit(id)
chart.updateDrawing(id, { style: { color: '#26a69a' } })
chart.endDrawingEdit(id, { cancel: false })

// what every new Fibonacci retracement starts with
chart.setDrawingToolDefaults('fibRetracement', { showPrices: false })`}</code></pre>
<p>Settings from a saved layout or a pasted drawing are checked against the tool; values it does not take are dropped.</p>

<h2>Long/Short Position</h2>
<p>
  <code>riskReward</code>: drag from the entry to the stop. The target sits the
  reward:risk ratio away, and its handle changes the ratio. From the account
  size and the risk (a percent of the account, or an amount) it works out the
  quantity, and shows each line's price, distance and profit or loss.
</p>
<pre><code>{`chart.setDrawingOptions(id, { accountSize: 25_000, riskMode: 'percent', risk: 1, rewardRatio: 3 })`}</code></pre>

<h2>Alerts on drawings</h2>
<p>
  An alert can follow a trend line, ray, extended or horizontal line, or the
  lines of a parallel channel: it fires when the price crosses the line where
  it is at the latest bar, as drawn on the chart (straight across bars, and in
  log price on a log scale).
</p>
<pre><code>{`if (chart.canAddDrawingAlert(id)) {
  chart.addDrawingAlert(id, { condition: 'crossingUp', message: 'Broke the trend line' })
}`}</code></pre>
<p>The alert goes with its drawing, comes back with it on undo, and is saved with the layout.</p>

<h2>Order and groups</h2>
<pre><code>{`chart.moveDrawing(id, 'front')       // 'front' | 'forward' | 'backward' | 'back'
const group = chart.groupDrawings([a, b, c], 'Weekly levels')
chart.setDrawingGroupVisible(group, false)
chart.setDrawingGroupLocked(group, true)
chart.ungroupDrawings(group)

chart.getSelectedDrawingIds()
chart.removeDrawings(ids)            // one undo step
chart.setDrawingsVisible(ids, false)
chart.setDrawingsLocked(ids, true)`}</code></pre>
<p>Clicking one drawing of a group selects the whole group.</p>

<h2>Eraser, zoom and magnet</h2>
<pre><code>{`chart.setEraserMode(true)          // each click on a drawing removes it, until Escape
chart.setZoomAreaMode(true)        // the next drag zooms to the bars in its box
chart.setDrawingMagnetMode('strong') // 'off' | 'weak' | 'strong'`}</code></pre>
<p>The weak magnet snaps a point to the bar's open, high, low or close when the pointer is near one; the strong magnet always does.</p>

<h2>Keyboard</h2>
<ul>
  <li><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Z</kbd> undo, <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> or <kbd>Ctrl</kbd> + <kbd>Y</kbd> redo.</li>
  <li><kbd>Ctrl</kbd> + <kbd>C</kbd> / <kbd>V</kbd> copy and paste drawings, <kbd>Ctrl</kbd> + <kbd>D</kbd> duplicate, <kbd>Delete</kbd> remove.</li>
  <li><kbd>Ctrl</kbd> + <kbd>G</kbd> group the selection, <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd> ungroup.</li>
  <li><kbd>Ctrl</kbd> + <kbd>]</kbd> / <kbd>[</kbd> bring forward / send backward; with <kbd>Shift</kbd>, to the front / back.</li>
  <li><kbd>Enter</kbd> ends a path; <kbd>Escape</kbd> drops the tool, the eraser, or the selection.</li>
</ul>

<h2>Events</h2>
<pre><code>{`chart.on('drawingCreate', (e) => e.payload)       // { id, type, drawing }
chart.on('drawingUpdate', (e) => e.payload)       // { id }
chart.on('drawingRemove', (e) => e.payload)       // { id }
chart.on('drawingDoubleClick', (e) => e.payload)  // { id }
chart.on('drawingContextMenu', (e) => e.payload)  // { id, x, y }
chart.on('toolModeChange', (e) => e.payload)      // { eraser } or { zoomArea }`}</code></pre>
<p>Undo and redo send <code>drawingCreate</code>, <code>drawingRemove</code> and <code>drawingUpdate</code> for the drawings they bring back, take away or change.</p>

<h2>Catalog</h2>

<h3>Lines</h3>
<ul>
  <li><code>trendLine</code> — extends left or right when asked.</li>
  <li><code>ray</code>, <code>extendedLine</code></li>
  <li><code>horizontalLine</code>, <code>horizontalRay</code> (forward in time from its point), <code>verticalLine</code>, <code>crossLine</code></li>
  <li><code>infoLine</code> — with a box of price change, bars, time and angle.</li>
  <li><code>trendAngle</code> — with its on-screen angle.</li>
</ul>

<h3>Channels</h3>
<ul>
  <li><code>parallelChannel</code> — with an optional middle line, extending either way.</li>
  <li><code>regressionChannel</code></li>
</ul>

<h3>Fibonacci</h3>
<ul>
  <li><code>fibRetracement</code>, <code>fibExtension</code> — editable levels, prices and percentages, labels left or right, background, reverse.</li>
  <li><code>fibChannel</code>, <code>fibTimeZones</code>, <code>fibSpeedResistanceFan</code></li>
  <li><code>fibArcs</code> — arcs around the start of a move, half or full circles.</li>
  <li><code>fibCircles</code> — circles at Fibonacci multiples of a radius.</li>
  <li><code>fibSpiral</code> — a golden spiral from its centre.</li>
  <li><code>fibWedge</code> — arcs between two lines from an apex.</li>
</ul>

<h3>Gann and pitchforks</h3>
<ul>
  <li><code>pitchfork</code>, <code>schiffPitchfork</code>, <code>modifiedSchiffPitchfork</code></li>
  <li><code>pitchfan</code> — rays from a pivot through levels between two points.</li>
  <li><code>gannFan</code>, <code>gannBox</code>, <code>gannSquare</code></li>
</ul>

<h3>Shapes</h3>
<ul>
  <li><code>rectangle</code>, <code>circle</code>, <code>ellipse</code>, <code>triangle</code></li>
  <li><code>polyline</code> — a closed shape, a point per click.</li>
  <li><code>curve</code> — bent through a third point; <code>arc</code> — a circle arc through three points.</li>
</ul>

<h3>Brushes</h3>
<ul>
  <li><code>brush</code>, <code>highlighter</code> — freehand.</li>
  <li><code>path</code> — a line through points, with an arrow at the end.</li>
</ul>

<h3>Patterns</h3>
<ul>
  <li><code>xabcdPattern</code>, <code>cypherPattern</code>, <code>abcdPattern</code>, <code>threeDrives</code> — with their ratios.</li>
  <li><code>headAndShoulders</code> — with the neckline.</li>
</ul>

<h3>Elliott waves</h3>
<ul>
  <li><code>elliottWave</code> (1–5, A–C), <code>elliottImpulse</code>, <code>elliottCorrection</code>, <code>elliottTriangle</code>, <code>elliottDoubleCombo</code>, <code>elliottTripleCombo</code> — labels in the style of the wave degree: ①, (1), 1 or i.</li>
</ul>

<h3>Cycles</h3>
<ul>
  <li><code>cyclicLines</code>, <code>timeCycles</code>, <code>sineLine</code></li>
</ul>

<h3>Measuring</h3>
<ul>
  <li><code>measure</code>, <code>priceRange</code>, <code>dateRange</code>, <code>dateAndPriceRange</code></li>
</ul>

<h3>Notes and marks</h3>
<ul>
  <li><code>text</code>, <code>note</code> (a pin with its text), <code>callout</code>, <code>priceLabel</code></li>
  <li><code>arrow</code>, <code>arrowMark</code> (up, down, left or right, with a label), <code>flag</code>, <code>icon</code> (star, heart, tick, cross, circle, triangles, bolt)</li>
</ul>

<h3>Forecasting</h3>
<ul>
  <li><code>riskReward</code> — Long/Short Position (above).</li>
  <li><code>forecast</code> — green once the price reaches the target, red when its time runs out first.</li>
  <li><code>projection</code> — a move carried over from a third point.</li>
  <li><code>barsPattern</code> — a copy of some bars, as bars, a line or high-low, mirrored or flipped.</li>
  <li><code>anchoredVWAP</code>, <code>volumeProfileRange</code></li>
</ul>

<h2>Saving</h2>
<pre><code>{`const json = chart.saveState()   // drawings, their settings and groups, indicators, alerts…
chart.loadState(json)            // checks every drawing; malformed ones are left out`}</code></pre>

<h2>Your own tools</h2>
<p>
  A tool is a <code>DrawingPlugin</code> registered with
  <code>chart.registerDrawingTool(plugin)</code>. Its descriptor lists its
  settings (<code>options</code>), how it is drawn (<code>creation</code>), and
  whether it has a fill or text; it may give the prices of its lines
  (<code>priceAt</code>, for alerts), move handles that are not anchors
  (<code>moveHandle</code>), and receive the chart's bars
  (<code>setDataGetter</code>). See <a href={href('/docs/plugins')}>Plugins</a>.
</p>
