<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Drawing tools — TradeCanvas docs</title>
  <meta name="description" content="73 built-in drawing tools with their own settings: Fibonacci and Gann tools, Elliott waves, harmonic patterns, notes, brushes, Long/Short Position with sizing, alerts on drawings, groups and layers." />
</svelte:head>

<h1>Drawing tools</h1>
<p>
  73 built-in drawing tools. Each one snaps to the bars with the magnet, takes
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

<h2 id="panes">On indicator panes</h2>
<p>
  A drawing begun on an indicator pane (RSI, MACD…) is made on that pane: its anchors’ prices are the pane’s values, the magnet snaps to the pane’s lines, and it follows the pane’s scale. It stays inside its pane. Side panes and folded ones take no drawings, and the tools that read the bars’ prices (Anchored VWAP, Volume Profile, Long/Short Position) stay on the price pane. A pane’s drawing takes no price alert.
</p>
<pre><code>{`const rsi = chart.addIndicator('rsi')
chart.addDrawing({
  type: 'horizontalLine',
  anchors: [{ time: t1, price: 70 }],   // 70 on the RSI scale
  paneId: rsi,                          // a pane’s id, as getIndicatorPanes() lists them
})`}</code></pre>
<p>
  When the indicator that owns the pane is removed and another in the pane takes it over, its drawings go with the pane. When the pane goes, its drawings are hidden and come back with it on undo. A saved layout puts them back on their panes.
</p>

<h2 id="text">Text</h2>
<p>
  The text tools (Text, Note, Callout, Price Label, Arrow Mark) share one text style: size, bold, italics and a colour of their own. A Text, a Note and a Callout also line their lines up left, centre or right, can have a background and a border, and wrap at a width. A Text keeps its own line breaks and runs on unless it is given one; a Note and a Callout wrap at 240 px.
</p>
<p>
  Without a size of their own, words are set at 14 px and figures (a level's price, a ratio, a stats box) at 12 px, both a step or more over the axis type and growing with it (<code>chart.setFont</code>, and the widget on a wide screen). A size of 12 saved by an earlier version reads as none. Words people write are set in the system's sans face, figures in the chart's face; <code>font: {'{'} textFamily {'}'}</code> (or <code>chart.setFont({'{'} textFamily {'}'})</code>) gives the words a face of your own, and the widget gives them its look's.
</p>
<pre><code>{`chart.addDrawing({
  type: 'text',
  anchors: [{ time: t1, price: 101.2 }],
  style: {
    text: 'Breakout\\nretest here',     // its own line breaks are kept
    fontSize: 14, bold: true, italic: false,
    textAlign: 'center',              // 'left' | 'center' | 'right'
    textColor: '#f2a93b',
    textBackground: true, fillColor: '#1e222d', fillOpacity: 0.8,
    textBorder: true, borderColor: '#f2a93b',
    textWrap: 200,                    // px; 0: only where the text breaks
  },
})`}</code></pre>
<p>
  In the widget, a text, a note, a callout, a signpost, a balloon or an anchored text or note opens a box over its words as soon as it is drawn and on a double-click: type over them, Enter or a click away keeps them, Shift+Enter starts a new line, and Escape puts them back (a text just drawn goes, with no words too). One undo takes a text just drawn and its words away. Its settings stay a click away, on the toolbar over it or its menu. The toolbar over a selection sets the fill and the text colour of the tools that have them. <code>chart.getDrawingTextRect(id)</code> says where a text's box is, to lay an editor of your own over it.
</p>

<h3 id="line-text">Text on lines and boxes</h3>
<p>
  A trend line, a ray, an extended, info or angle line, an arrow, a horizontal or vertical line and a rectangle take a text too, in the same style. <code>textAlign</code> puts it at the line's left end, its middle or its right end, and <code>textVAlign</code> above the line, on it or under it; in a rectangle they place it inside, at its top, middle or bottom. The text follows the line's slope and always reads left to right, and bottom to top along a vertical line. In the widget the Text tab has the two rows.
</p>
<pre><code>{`chart.addDrawing({
  type: 'trendLine',
  anchors: [{ time: t1, price: 98 }, { time: t2, price: 104 }],
  style: { color: '#4c8dff', lineWidth: 2, lineStyle: 'solid',
    text: 'Breakout', textAlign: 'right', textVAlign: 'top' },  // 'top' | 'middle' | 'bottom'
})
chart.addDrawing({ type: 'verticalLine', anchors: [{ time: t3, price: 0 }], options: { showTime: true } })
chart.addDrawing({ type: 'fibRetracement', anchors: [a, b], options: { trendLine: false, oneColor: true } })`}</code></pre>
<p>
  A horizontal line and a horizontal ray hide their price with <code>showPrice: false</code>. A vertical line shows its bar's time with <code>showTime: true</code>, written as the crosshair writes it. A rectangle has eight handles: one at each corner and one in the middle of each side, which moves that side alone. A Fibonacci retracement and extension draw a dashed line through their points (<code>trendLine</code>, on by default) and draw all their levels in the drawing's colour with <code>oneColor</code>. A click on the words picks the line or the box too.
</p>

<h2 id="look">How drawings look</h2>
<p>
  Every tool is drawn the same way:
</p>
<ul>
  <li>A selected drawing's handles are rings in its colour, filled with the chart's background (the <code>drawings.handleColor</code> style key fills them with a colour of yours), a size over its line: 9 px across on a 1 px line, more on a thicker one. The handle under the pointer grows, and the one in hand fills with the colour. Only the drawing a drag would reshape shows rings; the others of a selection, and a locked drawing, show small dots.</li>
  <li>A drawing under the pointer glows a little, so it is plain which one a click takes.</li>
  <li>While a drawing is made, the points placed show as handles.</li>
  <li>Dashes and dots grow with the line, dots are round, and a solid line's ends are round. Arrowheads grow with the line too.</li>
  <li>A fill is the line's colour, tinted, unless it was set on its own: a drawing turned red fills red. A label on a coloured tag is written in black or white, whichever reads; a stats box is the chart's own surface and text colour, in both themes; words in a drawing's colour are deepened where they would not read on a light background.</li>
  <li>A tool's own lines follow its line style; its grids, guides and secondary angles are 1 px and lighter. A level, an angle or a division whose label would cover another's is left unlabelled, never the 0 and 1 levels. Percentages are written whole when they are (50%, not 50.0%), and each Fibonacci ratio drawn with others has a colour of its own.</li>
  <li>Rises and falls (a price range, a Long/Short position's target and stop, a forecast's outcome) take the theme's profit and loss colours (the <code>trading.profitColor</code> and <code>trading.lossColor</code> style keys), green and red without them.</li>
</ul>

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

<h3 id="settings-dialog">The settings dialog</h3>
<p>
  In the widget, a double-click on a drawing (or Settings on its toolbar, its menu or the object tree) opens its
  settings in tabs. <strong>Style</strong>: the line (colour, width, dash) in one row, its ends, the fill, then the
  tool's switches and choices, and its levels. <strong>Text</strong>, for the tools that write: the text and its
  size. <strong>Coordinates</strong>: each point's price, date and time, in the chart's time zone.
  <strong>Visibility</strong>: the intervals it shows on. Every change shows at once; <strong>OK</strong> keeps them
  as one undo step, <strong>Cancel</strong> (or Escape) puts the drawing back. The <strong>Template</strong> menu
  applies or deletes a saved template, saves the drawing's look as one, keeps the options as the tool's default,
  and resets them.
</p>

<h3 id="drawing-intervals">Shown on some intervals</h3>
<p>
  A drawing can be kept to some intervals, with the rules an indicator takes: a unit off
  (<code>minutes: false</code>), or a range of it (<code>hours: [1, 4]</code>). On the other intervals it is not
  drawn, not hit and not selected. The rules are saved with the layout.
</p>
<pre><code>{`chart.updateDrawing(id, { intervals: { minutes: false } })  // not on minute charts
chart.isDrawingShown(id)                                    // false on a 5m chart
chart.updateDrawing(id, { intervals: null })                // every interval again

chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: t, price: 100 }], intervals: { days: false, weeks: false } })`}</code></pre>
<p>On a bare Chart without a stream, give the interval of your bars with <code>chart.setDataTimeframe('5m')</code>.</p>

<h3 id="line-stats">A line's ends, middle and stats</h3>
<p>
  Trend lines, rays and extended lines can show their middle point, and stats between their two points: the
  price's change and its percentage, the bars and the time between them, the angle. The stats show while the line
  is selected, or all the time, by its right end, its middle or its left end. A trend line's ends can be arrows.
  All of it is off until asked for.
</p>
<pre><code>{`chart.setDrawingOptions(id, {
  showPriceRange: true, showBarsRange: true, showDateRange: true, showAngle: true,
  alwaysShowStats: true, statsPosition: 'right',   // 'left' | 'center' | 'right'
  showMiddlePoint: true,
  rightEnd: 'arrow',                                // trend lines: leftEnd, rightEnd
})`}</code></pre>

<h2 id="selection-toolbar">The toolbar over a selection</h2>
<p>
  In the widget, clicking a drawing shows a small toolbar right over it: colour, line width and line style, then settings, an alert on its line, lock, the full drawing menu (the same as a right-click) and delete. With several drawings selected it sits over all of them, and its changes go to each. It follows the drawing while it is moved, panned or zoomed, steps aside while a drawing tool, the eraser or the zoom area is on, and is one tab stop that the arrow keys move along.
</p>
<pre><code>{`new ChartWidget(host, { features: { selectionToolbar: false } })  // turn it off
widget.setFeatures({ selectionToolbar: true })

// Your own controls over a drawing, on a bare Chart:
chart.on('drawingSelect', ({ payload }) => {
  const rect = payload.primary ? chart.getDrawingRect(payload.primary) : null
  // { x, y, width, height } in px from the chart container's top-left, or null
})`}</code></pre>

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
chart.moveDrawing(id, 0)              // or a place in the order: 0 the bottom, as getDrawings() lists them
chart.updateDrawing(id, { name: 'Weekly support' })  // its name in the object tree; null: its tool's
const group = chart.groupDrawings([a, b, c], 'Weekly levels')
chart.setDrawingGroupVisible(group, false)
chart.setDrawingGroupLocked(group, true)
chart.ungroupDrawings(group)

chart.getSelectedDrawingIds()
chart.removeDrawings(ids)            // one undo step
chart.removeAll('drawings')         // every drawing; 'indicators', or 'all' for both: one undo step, locked drawings stay
chart.setDrawingsVisible(ids, false)
chart.setDrawingsLocked(ids, true)

chart.copyDrawings()                 // the selected ones (Ctrl+C)
chart.pasteDrawings()                // Ctrl+V, here or on another chart of the page
chart.canPasteDrawings()             // whether there is something to paste`}</code></pre>
<p>Clicking one drawing of a group selects the whole group.</p>
<p>In the widget's object tree the drawings are listed as they stack, the one on top first. A click on a drawing's name selects it and a double-click renames it. Its row clones it, and its grip drags it onto another row's place; the arrow keys on the grip move it one row up or down the list and the stack together.</p>

<h2>Eraser, zoom and magnet</h2>
<pre><code>{`chart.setEraserMode(true)          // each click on a drawing removes it, until Escape
chart.setZoomAreaMode(true)        // the next drag zooms to the bars in its box
chart.setDrawingMagnetMode('strong') // 'off' | 'weak' | 'strong'`}</code></pre>
<p>The weak magnet snaps a point to the bar's open, high, low or close when the pointer is near one; the strong magnet always does. In the widget the magnet starts off: a drawing goes where it is placed until the magnet button turns it on.</p>

<h2 id="editing">Editing with the pointer and the keys</h2>
<ul>
  <li>The magnet works on a dragged handle and on a moved drawing too: the point nearest where it was grabbed lands on a price, and the rest keep their place to it. The weak magnet reaches 50 px.</li>
  <li>Hold <kbd>Ctrl</kbd>/<kbd>⌘</kbd> while drawing or dragging to turn the magnet over for that moment: on when it is off, off when it is on.</li>
  <li>Hold <kbd>Shift</kbd> while drawing or dragging a handle to keep the line flat, upright or at 45° on screen. On empty chart, <kbd>Shift</kbd> + drag still measures. It holds for lines and paths; a box, a channel's width or a pitchfork's point stays free.</li>
  <li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> move the selected drawings a bar across or a pixel up or down; with <kbd>Shift</kbd>, ten. A run of presses is one undo step, and locked drawings stay.</li>
  <li><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + drag on a drawing drags out a copy (of the whole selection when the drawing is in it), one undo step. A <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + click still adds it to the selection or takes it out, and <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + drag on empty chart draws a selection box. On a handle of the selected drawing, <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + drag reshapes it with the magnet turned over instead.</li>
  <li><kbd>Escape</kbd> while a drawing is dragged calls the drag off: a moved or reshaped drawing goes back where it was, and a copy being dragged out goes, with nothing left to undo.</li>
</ul>

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
  <li><code>parallelChannel</code> — the line through its first two points moved straight up or down to its third (as its alerts read it), with an optional middle line, extending either way.</li>
  <li><code>regressionChannel</code> — the least-squares line through the closes between its two points, with bands two standard deviations either side; its points set the bars, and its handles sit on the line.</li>
</ul>

<h3>Fibonacci</h3>
<ul>
  <li><code>fibRetracement</code>, <code>fibExtension</code> — editable levels, prices and percentages, labels left or right, background, reverse.</li>
  <li><code>fibChannel</code>, <code>fibSpeedResistanceFan</code> — the fan's rays in their levels' colours, the time rays dashed, both labelled.</li>
  <li><code>fibTimeZones</code> — from the zone's start (0) on; its handles, and those of <code>cyclicLines</code>, sit on their lines halfway up the plot.</li>
  <li><code>fibArcs</code> — arcs around the start of a move, half or full circles.</li>
  <li><code>fibCircles</code> — circles at Fibonacci multiples of a radius.</li>
  <li><code>fibSpiral</code> — a golden spiral from its centre.</li>
  <li><code>fibWedge</code> — arcs between two lines from an apex.</li>
</ul>

<h3>Gann and pitchforks</h3>
<ul>
  <li><code>pitchfork</code>, <code>schiffPitchfork</code>, <code>modifiedSchiffPitchfork</code></li>
  <li><code>pitchfan</code> — rays from a pivot through levels between two points.</li>
  <li><code>gannFan</code> — each angle labelled where it leaves the plot; <code>gannBox</code> — its divisions labelled in price and in time; <code>gannSquare</code></li>
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
  <li><code>priceRange</code> — a box in the rise or fall colour (or the colour you pick for it) with an arrow up or down it and the change on a tag past its end.</li>
  <li><code>dateRange</code> — the bars between two times, an arrow across and the bars and time on a tag; its handles at the ends of its arrow, halfway up the plot.</li>
  <li><code>dateAndPriceRange</code> — both at once, with an arrow on each measure and the volume inside; <code>measure</code> — the change and the bars between two points.</li>
</ul>

<h3>Notes and marks</h3>
<ul>
  <li><code>text</code>, <code>note</code> (a pin with its text), <code>callout</code>, <code>priceLabel</code></li>
  <li><code>arrow</code>, <code>arrowMark</code> (up, down, left or right, with a label), <code>flag</code>, <code>icon</code> (star, heart, tick, cross, circle, triangles, bolt)</li>
  <li><code>signpost</code> (its text on a board atop a post on a bar), <code>balloon</code> (its text in a bubble pointing at a bar)</li>
  <li><code>anchoredText</code>, <code>anchoredNote</code>: kept to a place on the screen, they stay put as the chart scrolls, zooms or changes symbol. Their points are shares of the plot (<code>{'{'} time: 0.5, price: 0.25 {'}'}</code> is halfway across, a quarter down), and the settings have no Coordinates tab.</li>
</ul>

<h3>Forecasting</h3>
<ul>
  <li><code>riskReward</code> — Long/Short Position (above).</li>
  <li><code>forecast</code> — in the rise colour once the price reaches the target, the fall colour when its time runs out first.</li>
  <li><code>projection</code> — a move carried over from a third point.</li>
  <li><code>barsPattern</code> — a copy of some bars, as bars, a line or high-low, mirrored or flipped; the bars it copies under a light band.</li>
  <li><code>anchoredVWAP</code> — its handle on the VWAP where it starts; <code>volumeProfileRange</code> — the volume at each price as a histogram inside the range's box, the value area (70% of the volume) shaded, the point of control across; its handles on the box's corners.</li>
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
