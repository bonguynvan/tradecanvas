<script lang="ts">
  import { base } from '$app/paths';
</script>

<svelte:head>
  <title>API Reference — TradeCanvas docs</title>
  <meta name="description" content="API reference for Chart, ChartWidget, ChartGrid and the core TradeCanvas surface." />
</svelte:head>

<h1>API reference</h1>
<p>Public surface of the three top-level classes: <code>Chart</code>, <code>ChartWidget</code>, and <code>ChartGrid</code>.</p>

<h2>Chart</h2>
<p>Headless renderer. Bring your own UI; subscribe to events; mutate state imperatively.</p>

<h3>Construction</h3>
<pre><code>{`new Chart(host: HTMLElement, options?: ChartOptions)`}</code></pre>

<h3>Data</h3>
<table>
  <thead><tr><th>Method</th><th>Purpose</th></tr></thead>
  <tbody>
    <tr><td><code>setData(data)</code></td><td>Replace the entire series.</td></tr>
    <tr><td><code>appendBar(bar)</code></td><td>Append a new bar; auto-scroll if enabled.</td></tr>
    <tr><td><code>appendBars(bars)</code></td><td>Batch append; recalculates indicators once.</td></tr>
    <tr><td><code>updateLastBar(bar)</code></td><td>Mutate the current forming bar.</td></tr>
    <tr><td><code>updateLastBarFromTick(tick)</code></td><td>Merge a tick into the last bar.</td></tr>
    <tr><td><code>getData()</code></td><td>Read the raw OHLC series.</td></tr>
  </tbody>
</table>

<h3>Chart type &amp; theme</h3>
<table>
  <thead><tr><th>Method</th><th>Purpose</th></tr></thead>
  <tbody>
    <tr><td><code>setChartType(type)</code></td><td>One of 17 types — see <a href="{base}/docs/chart-types">Chart types</a>.</td></tr>
    <tr><td><code>setTheme(name)</code></td><td>Switch between built-in themes.</td></tr>
    <tr><td><code>setTimeframe(tf)</code></td><td>Switch active timeframe; rewires the live stream.</td></tr>
  </tbody>
</table>

<h3>Indicators</h3>
<table>
  <thead><tr><th>Method</th><th>Purpose</th></tr></thead>
  <tbody>
    <tr><td><code>addIndicator(id, params?, position?)</code></td><td>Adds an overlay or panel indicator. Returns instance id.</td></tr>
    <tr><td><code>updateIndicator(instanceId, params)</code></td><td>Mutate a live indicator.</td></tr>
    <tr><td><code>removeIndicator(instanceId)</code></td><td>Remove and tear down.</td></tr>
  </tbody>
</table>

<h3>Axis &amp; scale</h3>
<p>
  The price axis (right strip) and time axis (bottom strip) accept direct
  pointer interaction — same gestures as TradingView:
</p>
<table>
  <thead><tr><th>Gesture</th><th>Effect</th></tr></thead>
  <tbody>
    <tr><td>Drag price axis up / down</td><td>Compress / expand the vertical price range (disables auto-scale).</td></tr>
    <tr><td>Drag time axis left / right</td><td>Zoom in / out on the time axis.</td></tr>
    <tr><td>Double-click price axis</td><td>Re-enable auto-scale.</td></tr>
    <tr><td>Double-click time axis</td><td>Fit all data to the viewport.</td></tr>
  </tbody>
</table>
<p>The same effects are also available programmatically:</p>
<pre><code>{`chart.setAutoScale(false)  // freeze the current price range
chart.setLogScale(true)    // switch to logarithmic price scale
chart.fitContent()         // zoom out to all data
chart.scrollToEnd()`}</code></pre>

<p>
  <strong>Price scale modes.</strong> Beyond regular and logarithmic, the axis
  can rebase its labels against the first visible bar — <code>percentage</code>
  shows % change, <code>indexedTo100</code> rebases the baseline to 100. Regular,
  percentage, and indexed share the same linear geometry; only the labels
  differ. Settable from the chart-settings panel or directly:
</p>
<pre><code>{`chart.setScaleMode('percentage')   // axis labels: +12.34% from first visible bar
chart.setScaleMode('indexedTo100') // first visible bar reads as 100
chart.setScaleMode('logarithmic')
chart.getScaleMode()`}</code></pre>

<h3>Volume Profile</h3>
<p>
  Horizontal histogram of traded volume bucketed by price over the visible
  range. Off by default — toggle programmatically or via the widget
  settings sheet:
</p>
<pre><code>{`chart.setVolumeProfileVisible(true)
chart.setVolumeProfileConfig({
  buckets: 48,        // resolution of the histogram
  widthRatio: 0.18,   // % of chart width
  opacity: 0.32,
  highlightPoC: true, // mark the highest-volume bucket
})`}</code></pre>

<h3>Market Profile (TPO)</h3>
<p>
  A time-at-price histogram: each bar contributes one TPO to every price bucket
  its range touched, surfacing the Point of Control (busiest price) and the
  value area (≈70% of TPOs). Distinct from Volume Profile — it weights by time,
  not volume — and is left-pinned so both can show together. Off by default;
  toggle from the settings sheet or directly:
</p>
<pre><code>{`chart.setMarketProfileVisible(true)
chart.setMarketProfileConfig({
  buckets: 48,
  widthRatio: 0.18,
  opacity: 0.32,
  valueAreaPct: 0.7,  // fraction of TPOs in the value area
  highlightPoC: true, // dashed line at the point of control
})

// pure computation is exported too
import { computeMarketProfile } from '@tradecanvas/core'
const profile = computeMarketProfile(bars, priceMin, priceMax, { buckets: 48 })`}</code></pre>

<h3>Touch &amp; mobile</h3>
<table>
  <thead><tr><th>Gesture</th><th>Action</th></tr></thead>
  <tbody>
    <tr><td>1-finger drag (chart area)</td><td>Pan + move crosshair</td></tr>
    <tr><td>2-finger pinch</td><td>Zoom around the midpoint</td></tr>
    <tr><td>Long-press (~500 ms)</td><td>Pin OHLC tooltip at the bar (mobile equivalent of Alt-click)</td></tr>
    <tr><td>1-finger drag inside price / time axis strip</td><td>Scale the corresponding axis</td></tr>
  </tbody>
</table>
<p>
  Modals (settings, hotkey sheet, command palette, symbol search) automatically
  switch to a bottom-sheet pattern with a grab handle and safe-area-aware
  padding under 640 px viewports.
</p>

<h3>Measure tool</h3>
<p>
  Hold <kbd>Shift</kbd> and drag on the chart to measure bars × price between
  two points — the overlay shows price Δ (absolute + %), bar count, and time
  span. The overlay clears as soon as the mouse is released; it does not
  persist into saved state.
</p>

<h3>Events</h3>
<p>All events are typed via <code>ChartEventMap</code>:</p>
<pre><code>{`chart.on('orderPlace', e => /* OrderPlacePayload */)
chart.on('orderModify', e => /* OrderModifyPayload */)
chart.on('signalMarkerAdd', e => /* { marker } */)
chart.on('tradeZoneAdd', e => /* { zone } */)
chart.on('dataUpdate', e => /* { length } */)`}</code></pre>

<h2>ChartWidget</h2>
<p>Wraps <code>Chart</code> in a complete UI. Same instance is available via <code>widget.chart</code>.</p>

<pre><code>{`import { ChartWidget } from '@tradecanvas/chart/widget'

const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  historyLimit: 500,
  trading: true,
  features: { drawings: true, indicators: true },
  onReady: (chart) => { /* ... */ },
})

widget.chart.setData(...)
widget.destroy()`}</code></pre>

<h3>Widget keyboard shortcuts</h3>
<table>
  <thead><tr><th>Shortcut</th><th>Action</th></tr></thead>
  <tbody>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd></td><td>Command palette (indicators, chart types, drawings…)</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>P</kbd></td><td>Symbol search — fuzzy picker over the configured symbol list</td></tr>
    <tr><td><kbd>?</kbd></td><td>Show the keyboard shortcuts sheet</td></tr>
    <tr><td><kbd>Alt</kbd> + click chart</td><td>Pin OHLC tooltip at the hovered bar (delta to live crosshair shown)</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>Unpin tooltip / cancel drawing</td></tr>
    <tr><td>Click symbol in toolbar</td><td>Opens the symbol search modal</td></tr>
    <tr><td>Click play in toolbar</td><td>Opens the bar replay scrubber (play/step/seek/speed)</td></tr>
  </tbody>
</table>
<p>Update the searchable catalog at runtime with <code>widget.setSymbols(['BTCUSDT', 'ETHUSDT', …])</code>.</p>

<h3>Saved layouts</h3>
<p>
  Persist per-symbol indicator stacks, drawings, alerts, and chart type
  to <code>localStorage</code> automatically:
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT',
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  adapter: new BinanceAdapter(),
  persistLayouts: true,  // or { keyPrefix: 'myapp:', debounceMs: 2000 }
})

// Reset a single symbol's layout
widget.clearSavedLayout('BTCUSDT')`}</code></pre>
<p>
  Layouts flush on symbol switch and on widget destroy so nothing is lost
  when the user navigates away.
</p>

<h3>Drag-and-drop data import</h3>
<p>
  Drop a CSV or JSON file onto the chart to load it instantly. Enabled by
  default — disable with <code>dragDropImport: false</code>. The parser
  handles common column layouts (<code>time, open, high, low, close, volume</code>),
  ISO 8601 timestamps, and unix seconds/ms.
</p>
<pre><code>{`// Programmatic use
import { parseOHLCV } from '@tradecanvas/chart'

const { data, rowCount, skipped } = parseOHLCV(csvText)
chart.setData(data)`}</code></pre>

<h3>Timeframe resampling</h3>
<p>
  Feed the widget your finest-resolution series with <code>widget.setData()</code>
  and the toolbar timeframe buttons aggregate it on the client — one dataset
  drives every resolution, no refetch. Active whenever no live adapter is
  attached; opt out with <code>resampleTimeframes: false</code>. Weekly buckets
  anchor to Monday by default (<code>weekStartsOn: 0</code> for Sunday).
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  timeframe: '1h',
  timeframes: ['5m', '15m', '1h', '4h', '1d', '1w'],
})
widget.setData(oneMinuteBars)   // base series; clicking 4h/1d/1w resamples it

// Or use the pure function directly
import { resampleOHLCV, inferTimeframeMs } from '@tradecanvas/chart'

const hourly = resampleOHLCV(oneMinuteBars, '1h')   // OHLC merged, volume summed
const fourHour = resampleOHLCV(oneMinuteBars, '4h', { weekStartsOn: 1 })`}</code></pre>
<p>
  Calendar-aware bucketing: intraday and daily frames anchor to UTC epoch
  boundaries, weeks to the configured week start, and months / quarters / years
  to calendar boundaries. Input bars are never mutated.
</p>

<h3>Watchlist sidebar</h3>
<p>
  Opt-in right-side panel showing all configured symbols with last price, %
  change, and a mini sparkline:
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT',
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  adapter: new BinanceAdapter(),
  watchlist: true,
})

// Feed non-active rows from your own data source
widget.setWatchlistEntry('ETHUSDT', {
  lastPrice: 3245.12,
  refPrice: 3180.50,
  sparkline: [3180, 3195, 3210, ...],
})`}</code></pre>

<h3>Object tree</h3>
<p>
  The toolbar layers button opens an object-tree panel listing every active
  indicator and drawing. Indicators can be removed; drawings get per-item
  show / hide, lock / unlock, and delete. Enabled by default — disable with
  <code>objectTree: false</code>. The drawing controls map to:
</p>
<pre><code>{`chart.getDrawings()                 // DrawingState[] (id, type, visible, locked)
chart.setDrawingVisible(id, false)  // hide a single drawing
chart.setDrawingLocked(id, true)    // lock it from edits
chart.removeDrawing(id)
chart.getActiveIndicators()         // active indicator instances
chart.updateIndicator(instanceId, { period: 50 })  // re-tune params live
chart.removeIndicator(instanceId)`}</code></pre>
<p>
  The gear button on each indicator row opens a <strong>settings dialog</strong>
  that introspects the indicator's parameters (numbers, toggles, colors) and
  applies edits live via <code>updateIndicator</code> — no need to remove and
  re-add to change a period or colour.
</p>
<p>
  The object tree's <strong>Compare</strong> section overlays other symbols as
  normalized lines. With a live adapter, the + button opens the symbol picker,
  fetches that symbol's history via <code>adapter.fetchHistory</code>, and adds
  it in percent mode (so mixed-price symbols share one axis). Comparisons
  refetch automatically on timeframe change. Programmatic equivalents:
</p>
<pre><code>{`widget.addCompareSymbol('ETHUSDT')   // fetches + overlays (needs an adapter)

// or drive the chart directly with your own data
chart.addCompareSymbol('ETHUSDT', 'ETH', ethBars, '#627eea')
chart.setCompareMode('percent')      // 'percent' | 'absolute'
chart.removeCompareSymbol('ETHUSDT')`}</code></pre>

<h3>Price alerts</h3>
<p>
  The toolbar bell opens a floating panel to add, list, and delete price
  alerts; a toast fires when one triggers. Alert lines are also
  <strong>draggable</strong> — grab one on the chart and slide it to re-price
  (moving an alert re-arms it). Enabled by default — disable with
  <code>alerts: false</code>. Drive it programmatically via the
  <code>Chart</code> API and the typed alert events:
</p>
<pre><code>{`// Add from code (condition: 'crossing' | 'crossingUp' | 'crossingDown'
//                          | 'greaterThan' | 'lessThan')
const id = chart.addAlert(64200, 'crossingUp', 'breakout')
chart.removeAlert(id)
chart.getAlerts()      // PriceAlert[]
chart.saveAlerts('tcw:alerts:BTCUSDT')   // localStorage persistence
chart.loadAlerts('tcw:alerts:BTCUSDT')

// React to triggers
chart.on('alertTriggered', (e) => {
  console.log('hit', e.payload.price, e.payload.message)
})
// also: 'alertAdd' / 'alertRemove' / 'alertUpdate' (fired on drag)`}</code></pre>

<h2>ChartGrid</h2>
<p>Synchronized multi-chart layouts.</p>
<pre><code>{`import { ChartGrid } from '@tradecanvas/chart'

const grid = new ChartGrid(host, { layout: '2x2', theme: 'dark' })
await grid.connectAll(new BinanceAdapter(), ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'], '5m')
grid.setLayout('1x2')`}</code></pre>

<p>Layouts: <code>'1x2'</code>, <code>'2x2'</code>, <code>'2x3'</code>, <code>'3x3'</code>.</p>
