<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>API Reference — TradeCanvas docs</title>
  <meta name="description" content="API reference for Chart, ChartWidget, ChartGrid and the core TradeCanvas surface." />
</svelte:head>

<h1>API reference</h1>
<p>Public surface of the top-level classes: <code>Chart</code>, <code>ChartWidget</code>, <code>ChartWidgetGrid</code> and <code>ChartGrid</code>.</p>

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
    <tr><td><code>setChartType(type)</code></td><td>One of 18 types — see <a href={href('/docs/chart-types')}>Chart types</a>.</td></tr>
    <tr><td><code>setTheme(name)</code></td><td>Switch between built-in themes.</td></tr>
    <tr><td><code>setTimeframe(tf)</code></td><td>Switch active timeframe; rewires the live stream.</td></tr>
  </tbody>
</table>

<h3>Renderer</h3>
<table>
  <thead><tr><th>Method</th><th>Purpose</th></tr></thead>
  <tbody>
    <tr><td><code>renderer</code> option</td><td><code>'canvas'</code> (default), <code>'webgl'</code>, or <code>'auto'</code> (WebGL on a hardware GPU only).</td></tr>
    <tr><td><code>setRenderer(mode)</code></td><td>Switch at runtime. Resolves to what draws now: <code>'canvas'</code> where WebGL 2 can't be had.</td></tr>
    <tr><td><code>getRenderer()</code></td><td><code>'canvas'</code> or <code>'webgl'</code>.</td></tr>
  </tbody>
</table>
<p>What the GPU draws, and the numbers: <a href={href('/docs/performance')}>Performance → WebGL renderer</a>.</p>

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
  pointer interaction, with the gestures traders already know:
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
<p>
  <strong>Timezone.</strong> Time-axis labels and the crosshair time pill follow
  the browser's local zone by default; switch to a fixed UTC offset (or back to
  local) from the settings sheet or directly:
</p>
<pre><code>{`chart.setTimezoneOffset(-300)  // EST (UTC-5), in minutes
chart.setTimezoneOffset(330)   // IST (UTC+5:30)
chart.setTimezoneOffset(null)  // back to browser-local`}</code></pre>

<p>The same effects are also available programmatically:</p>
<pre><code>{`chart.setAutoScale(false)  // freeze the current price range
chart.setLogScale(true)    // switch to logarithmic price scale
chart.setInvertScale(true) // upside down (Alt+I in the widget)
chart.fitContent()         // zoom out to all data
chart.scrollToEnd()
chart.setVisibleRangePreset('3M')       // 1D 5D 1M 3M 6M YTD 1Y 5Y All
chart.goToTime(Date.UTC(2025, 0, 1))    // centre that bar (Alt+G in the widget)`}</code></pre>

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

<h3>Price and time formats</h3>
<p>
  Prices can read in your own words, or in fractions of a point the way bonds and their
  futures are quoted (<code>101'16</code> is 101 and 16/32). The format reaches
  everything that prints a price on the price scale: axis, crosshair, last-price tag,
  legend, tooltips, orders, alerts and drawing labels; the axis puts its ticks on whole
  fractions and <code>roundPrice</code> rounds to them. Indicator panes keep their own
  numbers. Times can read your way too; the formatter is told what a label is.
</p>
<pre><code>{`new Chart(host, { priceFormat: { denominator: 32 } })                    // 101'16
chart.setPriceFormat({ denominator: 32, subDenominator: 2 })            // 101'165: 16½ 32nds
chart.setPriceFormat((p) => '$' + p.toFixed(2))
chart.setPriceFormat(null)                                              // decimals again

chart.setTimeFormatter((time, { kind, timeZone }) =>
  // kind: 'date' (a daily bar), 'day' (a new day), 'time' (within a day), 'crosshair'
  new Intl.DateTimeFormat('en-GB', { timeZone: timeZone ?? undefined, hour: '2-digit', minute: '2-digit' }).format(time))`}</code></pre>

<h3>Comparing symbols</h3>
<p>
  Another symbol's percent change on the price scale (<code>addCompareSymbol</code>), or
  its price on a scale of its own, in a pane of its own, or the spread or ratio of the
  chart's close to it — those last are indicators (<code>compareSymbol</code>,
  <code>spread</code>), with legends, value tags, alerts and saved layouts like any
  other. The other symbol's bars line up with the chart's by time. The chart asks for
  the bars it needs; give them again after a timeframe change.
</p>
<pre><code>{`chart.addCompareSymbol('eth', 'ETHUSDT', ethBars, '#7c4dff')   // percent change, on this scale
chart.addIndicator('compareSymbol', { symbol: 'ETHUSDT' }, 'bottom', { scale: 'left' })  // own scale
chart.addIndicator('spread', { symbol: 'ETHUSDT', mode: 'ratio' })                      // own pane

chart.on('symbolSeriesRequest', async ({ payload }) =>
  chart.setSymbolSeries(payload.symbol, await adapter.fetchHistory(payload.symbol, '1h', 1000)))
chart.getRequiredSymbols()                           // what to fetch again on a new interval
chart.setPaneScale(spreadId, { percent: true })     // a pane in percent of its first value`}</code></pre>
<p>
  In ChartWidget, the object tree's compare button asks for a symbol, then how:
  percent change, own scale, own pane, spread or ratio.
</p>

<h3>Exporting data</h3>
<p>
  The bars as CSV or JSON, each indicator line in a column of its own named as the
  legend names it. ChartWidget has <strong>Export data (CSV)</strong> in the chart's
  right-click menu.
</p>
<pre><code>{`chart.exportAllData('csv', 'btc-1h.csv')                 // every bar loaded
chart.exportVisibleData('json', undefined, { indicators: false })
const text = chart.getExportText('csv', { range: 'visible' })
const { bars, columns } = chart.getExportData()          // columns: { name, values }[]`}</code></pre>

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

<h3>Swing markers (pivots)</h3>
<p>
  Mark fractal swing highs/lows with small triangles (▼ above a confirmed pivot
  high, ▲ below a pivot low). The strength controls how many bars must be lower
  on each side. Toggle from the settings sheet, or:
</p>
<pre><code>{`chart.setPivotMarkersVisible(true)
chart.setPivotMarkersConfig({ left: 5, right: 5, showLabels: true })

// market-structure labels (HH / HL / LH / LL) instead of price
chart.setPivotMarkersConfig({ structureLabels: true })

// pure detection + classification are exported
import { findPivots, classifyPivots } from '@tradecanvas/core'
const pivots = findPivots(bars, 5, 5)        // [{ index, price, type }]
const structure = classifyPivots(pivots)     // adds label: 'HH'|'LH'|'HL'|'LL'`}</code></pre>

<h3>Session shading (regular trading hours)</h3>
<p>
  Dim bars outside the regular session (pre/post-market or the overnight break)
  so the cash session stands out. Defaults to US equity RTH (09:30–16:00 New
  York time, daylight saving included); configure the window in minutes-of-day
  plus the market's time zone. A symbol whose feed reports its sessions sets
  them by itself.
</p>
<pre><code>{`chart.setSessionShadingVisible(true)
chart.setSessionShadingConfig({
  startMinute: 9 * 60 + 30,     // 09:30
  endMinute: 16 * 60,           // 16:00 (end-exclusive; end < start wraps midnight)
  timeZone: 'America/New_York', // or tzOffsetMinutes: -300 for a fixed offset
})`}</code></pre>
<p>
  <strong>Extended hours.</strong> Turn them off and the bars outside the symbol's
  regular hours (<code>SymbolInfo.sessions</code> in its <code>timezone</code>) leave the
  chart; they are kept aside, live bars and history pages too, and come back when
  turned on. Bars a day or longer are left as they are.
</p>
<pre><code>{`chart.setSymbolInfo({ symbol: 'AAPL', timezone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] })
chart.setExtendedHours(false)     // or new Chart(host, { extendedHours: false })
chart.isExtendedHoursVisible()`}</code></pre>

<h3>Prior-period levels (PDH / PDL / PDC)</h3>
<p>
  Draw the prior day's (or week's) high, low, and close plus the current
  period's open as labelled horizontal lines — the support/resistance levels
  intraday traders watch. Toggle from the settings sheet, or directly:
</p>
<pre><code>{`chart.setPeriodLevelsVisible(true)
chart.setPeriodLevelsPeriod('week')   // 'day' (PDH/PDL/PDC) | 'week' (PWH/PWL/PWC)

// pure computation is exported
import { computePeriodLevels } from '@tradecanvas/core'
const levels = computePeriodLevels(bars, 'day')  // [{ id, label, price }]`}</code></pre>

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

// split into one mini-profile per calendar-day session
chart.setMarketProfileConfig({ splitBySession: true })

// classic TPO letters per session (when zoomed in enough to be legible)
chart.setMarketProfileConfig({ splitBySession: true, letters: true })

// pure computation is exported too
import { computeMarketProfile, computeSessionProfiles } from '@tradecanvas/core'
const profile = computeMarketProfile(bars, priceMin, priceMax, { buckets: 48 })
const sessions = computeSessionProfiles(bars, priceMin, priceMax)  // per-day TPO`}</code></pre>

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
chart.on('dataUpdate', e => /* { length } */)
chart.on('ordersChange', e => /* { orders } */)
chart.on('positionsChange', e => /* { positions } */)
chart.on('executionFill', e => /* { side, price, quantity, reason, pnl } */)
chart.on('chartContextMenu', e => /* { area, x, y, price, time } */)
chart.on('stateChange', () => /* drawings, indicators, alerts, chart type or theme may have changed */)
chart.on('paneChange', e => /* { instanceId, change: 'collapsed' | 'maximized' | 'order' } */)
chart.on('chartTypeChange', e => /* { type, previous } */)
chart.on('symbolChange', e => /* { symbol, previous } */)
chart.on('timeframeChange', e => /* { timeframe, previous } */)
chart.on('historyChange', e => /* { canUndo, canRedo } */)
chart.on('drawingSelect', e => /* { ids, primary } */)
chart.on('rendererChange', e => /* { renderer: 'canvas' | 'webgl', reason?: 'unsupported' | 'contextLost' } */)`}</code></pre>

<h3>Undo for your own changes</h3>
<p>
  <code>recordUndo</code> puts a change of yours in the chart's undo history, with its drawings and
  indicators: Ctrl/Cmd+Z calls <code>undo</code>, redo calls <code>redo</code>. Changes about the same
  <code>subject</code> close together are one step. ChartWidget records its settings and chart type this way.
</p>
<pre><code>{`const before = panel.color
panel.color = 'red'
chart.recordUndo({ subject: 'panel-color', undo: () => (panel.color = before), redo: () => (panel.color = 'red') })`}</code></pre>

<h3>Keyboard and screen readers</h3>
<p>
  A focused chart scrolls with the arrow keys (Shift for ten bars), zooms with ↑/↓ or +/−, and goes to
  the start and end with Home and End. For screen readers it is an application with a summary
  (symbol, type, timeframe, last price); after the keys move the view it says what is on screen, and
  comma and period read the bars one at a time. <code>a11y.labels</code> puts it in your language;
  <code>a11y: false</code> leaves it out. <code>scrollBars(n)</code> and <code>selectDrawing(id)</code>
  do from code what the keys and a click do.
</p>
<pre><code>{`new Chart(host, { a11y: { labels: { role: 'gráfico', summary: '{what}. Último precio {close}.' } } })`}</code></pre>
<p>
  Prices from the pointer can be put on the market's grid with
  <code>chart.roundPrice(price)</code>: a multiple of the symbol's <code>minTick</code>, else
  its precision. ChartWidget's menus and order ticket do this.
</p>

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
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>S</kbd></td><td>Save the layout (asks for a name the first time)</td></tr>
    <tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Type an interval (<code>5</code>, <code>15m</code>, <code>1h</code>, <code>1D</code>) and press Enter (<code>intervalTyping: false</code> turns it off)</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>T</kbd> / <kbd>H</kbd> / <kbd>J</kbd> / <kbd>V</kbd> / <kbd>C</kbd> / <kbd>F</kbd></td><td>Trend line, horizontal line, horizontal ray, vertical line, cross line, Fibonacci retracement</td></tr>
    <tr><td><kbd>?</kbd></td><td>Show the keyboard shortcuts sheet</td></tr>
    <tr><td><kbd>Alt</kbd> + click chart</td><td>Pin OHLC tooltip at the hovered bar (delta to live crosshair shown)</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>Unpin tooltip / cancel drawing</td></tr>
    <tr><td>Click symbol in toolbar</td><td>Opens the symbol search modal</td></tr>
    <tr><td>Click play in toolbar</td><td>Opens the bar replay scrubber (play/step/seek/speed)</td></tr>
  </tbody>
</table>
<p>Update the searchable catalog at runtime with <code>widget.setSymbols(['BTCUSDT', 'ETHUSDT', …])</code>.</p>

<h3>Data Window</h3>
<p>
  A floating readout of the exact O/H/L/C/V, bar change, and every active
  indicator's value at the hovered bar — updates live as you move the
  crosshair. Toggle it from the command palette (<kbd>Ctrl/⌘ K</kbd> →
  "Toggle Data Window").
</p>

<h3>Shareable view (deep links)</h3>
<p>
  Encode the whole view — symbol, timeframe, chart type, price scale,
  indicators (with params), and drawings — into a compact, URL-safe string for
  deep-linking. With <code>shareUrl: true</code> the widget restores a
  <code>#tcw=…</code> hash on load and the "Share View" command palette action
  copies a link to the clipboard.
</p>
<pre><code>{`const widget = new ChartWidget(host, { shareUrl: true })

const token = widget.exportState()      // portable string
await widget.importState(token)         // restore a view
await widget.copyShareLink()            // copy "<url>#tcw=<token>"`}</code></pre>

<h3>Named layouts</h3>
<p>
  The layout button on the toolbar saves the chart under a name: symbol,
  interval, price scale, chart type, indicators, drawings and alerts (not the
  theme, which stays the viewer's). Open, rename and delete layouts from its
  menu; the layout open auto-saves as it changes, and <kbd>Ctrl/⌘ S</kbd> saves
  it. Layouts live in this browser's <code>localStorage</code> unless you give a
  <code>storage</code>: four calls, each may return a promise.
</p>
<pre><code>{`import { ChartWidget, type LayoutStorage } from '@tradecanvas/chart/widget'

const server: LayoutStorage = {
  list: () => api.get('/layouts'),              // [{ id, name, symbol, timeframe, updatedAt }]
  load: (id) => api.get(\`/layouts/\${id}\`),     // { ...summary, content } or null
  save: (layout) => api.put(\`/layouts/\${layout.id}\`, layout),
  remove: (id) => api.delete(\`/layouts/\${id}\`),
}

const widget = new ChartWidget(host, {
  layouts: { storage: server, autoSave: true, openLast: true },  // or false for none
})

const layouts = widget.getLayoutSession()!
await layouts.saveAs('Swing BTC')
await layouts.open(id)
layouts.current()          // { id, name, … } or null
layouts.setAutoSave(false)

// The content alone, to keep wherever you like
const json = widget.getLayoutContent()
await widget.applyLayoutContent(json)`}</code></pre>
<p>
  <code>localStorageLayouts(prefix)</code> and <code>memoryLayouts()</code> are the
  two storages that ship. Stored content is read defensively: a layout that does
  not parse is refused, not half applied. Each layout records its
  <code>kind</code> (<code>'chart'</code> or <code>'grid'</code>), so a widget and a
  grid can share one storage and each lists only its own. Saving, opening and
  auto-saving run one at a time, so a save never lands in a layout opened after it.
</p>

<h3>Per-symbol layouts</h3>
<p>
  Separately, persist per-symbol indicator stacks, drawings, alerts, and chart type
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

<h3>Watchlists</h3>
<p>
  A right-side panel of lists of symbols, each row with last price, % change and a sparkline. Lists
  are switched, created, renamed and deleted from its menu; symbols are added from the symbol search
  (+), removed, and reordered by dragging or Alt+↑/↓. Rows take quotes from the adapter's
  <code>subscribeQuotes</code>, a quote source of yours, or what you push.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  adapter: new BinanceAdapter(),               // its quotes fill the rows
  watchlist: {
    lists: [
      { id: 'majors', name: 'Majors', symbols: ['BTCUSDT', 'ETHUSDT'] },
      { id: 'alts', name: 'Alts', symbols: ['SOLUSDT', 'ADAUSDT'] },
    ],
    persist: true,                             // kept in this browser
    onChange: (lists, active) => save(lists),  // or keep them yourself
  },
})

widget.addToWatchlist('BNBUSDT', 'alts')
widget.setActiveWatchlist('alts')
widget.setQuotes([{ symbol: 'AAPL', last: 190.2, prevClose: 188.1 }])   // from your own feed
widget.getQuote('AAPL')`}</code></pre>
<p>
  <code>watchlist: true</code> shows one list of <code>symbols</code>, as before; <code>setWatchlistEntry</code>
  still pushes a row's price, move and sparkline.
</p>

<h3>Symbol info</h3>
<p>
  A panel from the toolbar's ⓘ button (or the command palette): the symbol's names, last price and
  move, the market's status counting down to the next open or close, the day's open, range, volume,
  prior close, bid and ask, tick size, currency, zone and trading hours, and news. The status bar shows
  when the market is closed.
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'AAPL',
  news: (symbol, limit) => api.headlines(symbol, limit),   // or the adapter's fetchNews
})
widget.toggleSymbolInfo(true)`}</code></pre>

<h3>Navigation, undo and direction</h3>
<p>
  Buttons over the chart — zoom out and in, scroll earlier and later (held, they keep going), reset —
  show while the mouse is on it (<code>navigation: false</code> leaves them out). Settings changes and
  chart type changes are undone with Ctrl/Cmd+Z, with drawings and indicators. In Arabic, Hebrew,
  Persian or Urdu the widget mirrors (<code>dir: 'auto'</code>; or <code>'rtl'</code> / <code>'ltr'</code>);
  the chart keeps time running left to right.
</p>

<h3>Drawing favorites</h3>
<p>
  Pin frequently-used drawing tools to a strip at the top of the sidebar.
  Right-click any tool (in a group flyout or the strip itself) to pin or unpin
  it; the set persists to localStorage. Seed the initial pins with
  <code>drawingFavorites</code>:
</p>
<pre><code>{`new ChartWidget(host, {
  drawingFavorites: ['trendLine', 'horizontalLine', 'fibRetracement', 'rectangle'],
})`}</code></pre>

<h3>Drawing style &amp; templates</h3>
<p>
  The palette button on the drawing sidebar opens a style popover — pick colour,
  line width, and line style for the next drawing (and the selected one), and
  save named <strong>templates</strong> persisted to localStorage for one-click
  reuse. Programmatic equivalents:
</p>
<pre><code>{`chart.setDrawingStyle({ color: '#e8505b', lineWidth: 2, lineStyle: 'dashed' })
chart.getDrawingStyle()
chart.setSelectedDrawingStyle({ color: '#1fa874' })  // restyle the selected drawing`}</code></pre>

<h3>Object tree</h3>
<p>
  The toolbar layers button opens an object-tree panel listing every active
  indicator and drawing. Indicators can be removed; drawings get per-item
  show / hide, lock / unlock, settings and delete, and groups are listed with
  their drawings under them. Enabled by default — disable with
  <code>objectTree: false</code>. The drawing controls map to:
</p>
<pre><code>{`chart.getDrawings()                 // DrawingState[] (id, type, visible, locked)
chart.setDrawingVisible(id, false)  // hide a single drawing
chart.setDrawingLocked(id, true)    // lock it from edits
chart.removeDrawing(id)
chart.groupDrawings(ids, 'Weekly levels')  // hidden, locked and selected together
chart.renameDrawingGroup(groupId, 'Old highs')
chart.getActiveIndicators()         // active indicator instances
chart.updateIndicator(instanceId, { period: 50 })  // re-tune params live
chart.removeIndicator(instanceId)`}</code></pre>
<h3>Drawing settings and menu</h3>
<p>
  Double-click a drawing, or use its gear in the object tree, to open its
  settings: style, the tool's own settings (Fibonacci levels, extensions,
  labels…) and its points in the chart's time zone. Right-click a drawing for
  its menu: settings, an alert on its line, order, group, lock, hide,
  duplicate and delete. The sidebar also has an eraser, a zoom tool and a
  magnet that goes off, weak and strong. See
  <a href={href('/docs/drawing-tools')}>Drawing tools</a> for the API underneath.
</p>

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
  Beyond a level, an alert can compare a line with another line (the price crossing a
  moving average, MACD crossing its signal), fire on a move of some percent within some
  bars (2 to 500), look only at closed bars (no firing on a wick that comes back), and
  expire. The widget's alerts panel has all of these; from code they are the last
  argument of <code>addAlert</code>. Alerts check on every price, from
  <code>setCurrentPrice</code> or a connected feed, together with the lines they watch:
</p>
<pre><code>{`const ema = chart.addIndicator('ema', { period: 50 })
const rsi = chart.addIndicator('rsi')
chart.addAlert(NaN, 'crossingUp', 'above the 50 EMA', 'price', undefined, { target: \`\${ema}:value\` })
chart.addAlert(NaN, 'movesUp', 'pump', 'price', undefined, { percent: 5, bars: 12 })
chart.addAlert(70, 'greaterThan', 'RSI closed above 70', \`\${rsi}:value\`, 'RSI', { onBarClose: true })
chart.addAlert(64_000, 'crossing', 'today only', 'price', undefined, { expiresAt: Date.now() + 86_400_000 })

chart.on('alertExpired', (e) => e.payload)   // it reached its time without firing
chart.on('alertTriggered', (e) => e.payload)  // { id, condition, channel, target?, percent?, bars?, … }`}</code></pre>
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
// also: 'alertAdd' / 'alertRemove' / 'alertUpdate' (fired on drag)

// Indicator alerts: bind to an indicator line via channel '<instanceId>:<key>'.
// In the widget, the alerts panel's source dropdown lists every active line.
const ema = chart.addIndicator('rsi')
chart.addAlert(70, 'crossingUp', 'RSI overbought', \`\${ema}:rsi\`, 'RSI')`}</code></pre>
<p>
  Opt into a sound and/or desktop notification when an alert fires (both off by
  default). <code>sound: true</code> plays a built-in beep; pass a URL for a
  custom one. <code>desktop: true</code> uses the Notification API and asks
  permission on first use.
</p>
<pre><code>{`new ChartWidget(host, {
  alertNotifications: { sound: true, desktop: true },
})`}</code></pre>

<h3>Your own buttons and menu entries</h3>
<p>
  Add buttons to the toolbar (a built-in icon or an element of yours, text, a
  switch) and entries to the chart's right-click menus, after the widget's own.
</p>
<pre><code>{`const news = widget.addToolbarButton({
  id: 'news',
  label: 'News',
  icon: 'bell',            // or an <svg> element; or text: 'News'
  side: 'right',           // 'left' sits with the chart controls
  toggle: true,
  onClick: () => news?.setActive(togglePanel()),
})
news?.setText('3')
news?.remove()

new ChartWidget(host, {
  chartMenuItems: ({ area, price, time }) => area === 'plot' && price !== undefined
    ? [{ label: \`Copy \${price.toFixed(2)}\`, icon: 'check', onSelect: () => copy(price) }]
    : [],
})`}</code></pre>

<h2>ChartWidgetGrid</h2>
<p>
  Several chart widgets side by side, each with its own symbol, interval,
  indicators and drawings. A bar above them picks the arrangement, links the
  charts and saves the whole grid as a named layout. The chart pressed last is
  the active one (outlined).
</p>
<pre><code>{`import { ChartWidgetGrid } from '@tradecanvas/chart/widget'

const grid = new ChartWidgetGrid(host, {
  layout: '2x2',                                   // '1x1' '1x2' '2x1' '2x2' '1x3' '3x1' '2x3' '3x2'
  widget: { timeframe: '1h' },                    // every chart
  adapter: () => new BinanceAdapter(),            // one per chart: an adapter keeps one stream
  cells: [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT' }, { symbol: 'SOLUSDT' }, { symbol: 'BNBUSDT' }],
  sync: { crosshair: true, time: false, symbol: false, interval: false, drawings: false, replay: false },
})

grid.setLayout('1x2')
grid.setSync({ interval: true })   // lines the others up with the active chart
grid.getActiveWidget().getChart()
grid.getLayoutSession()?.saveAs('Majors')

// Each chart as it is made (at the start, and when the grid grows)
new ChartWidgetGrid(host, {
  onChartAdd: (widget, index) => widget.getChart().addIndicator('ema', { period: 21 }),
})`}</code></pre>
<p>
  Crosshair sync shows the time under the pointer on every chart; time sync
  scrolls and zooms the others with the chart being used; drawings are copied
  to the charts showing the same symbol (switching it on puts their drawings
  together, none lost); replay sync replays the others to the same time as the chart
  being replayed (a chart whose bars are longer than the replay's steps shows the whole
  bar that holds that time).
  Charts the grid shrinks from are put away, kept in the
  saved layout, and come back as they were when it grows again; a brand-new
  chart opens on the active chart's symbol and interval when those are synced.
</p>

<h2>ChartGrid</h2>
<p>Synchronized multi-chart layouts of headless charts (no toolbar); see <code>ChartWidgetGrid</code> for the full UI.</p>
<pre><code>{`import { ChartGrid } from '@tradecanvas/chart'

const grid = new ChartGrid(host, { layout: '2x2', theme: 'dark' })
// One adapter per chart: an adapter keeps one stream
await grid.connectAll(() => new BinanceAdapter(), ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'], '5m')
grid.setLayout('1x2')`}</code></pre>

<p>Layouts: <code>'1x1'</code>, <code>'1x2'</code>, <code>'2x1'</code>, <code>'2x2'</code>, <code>'1x3'</code>, <code>'3x1'</code>, <code>'2x3'</code>, <code>'3x2'</code>.</p>
