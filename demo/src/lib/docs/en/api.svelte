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
    <tr><td><code>updateBar(bar)</code></td><td>Correct a loaded bar: the one with the same time, anywhere in the series. The view stays; false when no loaded bar has that time.</td></tr>
    <tr><td><code>getData()</code></td><td>Read the raw OHLC series.</td></tr>
  </tbody>
</table>

<p id="live-price">
  A bar from <code>appendBar</code>, <code>appendBars</code> or <code>updateLastBar</code>, and a tick, is the live price: the price line, the alerts and the orders' P&amp;L follow it, as they follow a connected stream and <code>setCurrentPrice</code>. A new bar sends <code>dataUpdate</code>; a tick on the forming bar sends none.
</p>

<p id="corrections">
  A bar your feed corrects goes in with <code>updateBar(bar)</code>: it replaces the loaded bar with the same <code>time</code>, wherever it is in the series, and returns <code>true</code>. The indicators are computed again from that bar on, Heikin-Ashi, Renko and the other types built from the bars follow, and the view stays where it is; corrections before the next frame are computed once, from the earliest. It returns <code>false</code> and changes nothing when no loaded bar has that time (a new bar is <code>appendBar</code>'s, older ones <code>prependBars</code>') or the chart can't take the bar. It is no live price: the orders and the alerts don't follow it, no alert fires on it, and alerts on indicator lines aren't checked against the corrected values. A corrected last bar moves the price line, as after <code>setData</code>. During a replay it corrects the live series: a bar the replay has passed shows corrected at once, a later one when the replay reaches it; a bar in the extended hours, while they are hidden, shows when they are shown. The bar loaded, sent again, changes nothing; a missing volume is 0, as with <code>setData</code>, so send the bar whole. It sends <code>dataUpdate</code> with <code>{'{'} kind: 'correction', time, index {'}'}</code>. In ChartWidget, <code>widget.getChart().updateBar(bar)</code> corrects the bars of a connected feed; bars you gave the widget with <code>setData</code> are a copy it builds its timeframes from again, so a correction to them lasts only until the next timeframe switch (a widget method for these is to come).
</p>

<p id="bar-times">
  Bar times are epoch milliseconds or seconds, one unit for the whole series. The chart reads it once, from the newest bar: <code>barTimeUnit(data)</code> gives 1 (milliseconds, from 1e11 up) or 1000 (seconds). So a series in milliseconds keeps its dates before 2001 too, though they are below 1e12. Keep a series in one unit; the times the chart hands back (events, <code>getData()</code>) are in it.
</p>

<h3>Chart type &amp; theme</h3>
<table>
  <thead><tr><th>Method</th><th>Purpose</th></tr></thead>
  <tbody>
    <tr><td><code>setChartType(type)</code></td><td>One of 18 types — see <a href={href('/docs/chart-types')}>Chart types</a>.</td></tr>
    <tr><td><code>getChartType()</code></td><td>The type the chart is drawn as (<code>'candlestick'</code> by default).</td></tr>
    <tr><td><code>setTheme(name | theme)</code></td><td>Switch between built-in themes, or set your own. <code>getTheme()</code> gives it back as set.</td></tr>
    <tr><td><code>applyOverrides(patch, {'{ layer }'})</code></td><td>Style any part of the chart by key (<code>'grid.vertical.visible'</code>, <code>'series.candlestick.upColor'</code>…); <code>null</code> takes a key away. See <a href={href('/docs/styling#overrides')}>Styling</a>.</td></tr>
    <tr><td><code>setOverrides(overrides, {'{ layer }'})</code> · <code>resetOverrides(keys?, {'{ layer }'})</code></td><td>All of a layer at once; take keys (or all) away.</td></tr>
    <tr><td><code>getOverrides({'{ layer }'})</code> · <code>getStyle()</code> · <code>getStyleValue(key)</code></td><td>A layer's overrides; the looks as resolved; what one key resolves to.</td></tr>
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
    <tr><td><code>removeIndicators(instanceIds)</code></td><td>Remove several, as one undo step.</td></tr>
    <tr><td><code>updateIndicatorStyle(instanceId, style)</code></td><td>Colours, line widths, opacity, and each plot's dash and visibility (<code>plots: {`{ signal: { lineStyle: 'dashed' } }`}</code>).</td></tr>
    <tr><td><code>setIndicatorDefaults(id, style | null)</code></td><td>The style indicators of a kind start with from now on.</td></tr>
    <tr><td><code>setIndicatorIntervals(instanceId, intervals | null)</code> · <code>getIndicatorIntervals(instanceId)</code></td><td>The intervals it shows on (<code>{`{ minutes: false, hours: [1, 4] }`}</code>); <code>null</code>: all of them. Saved with the layout.</td></tr>
    <tr><td><code>setDataTimeframe(timeframe | null)</code></td><td>The interval of bars set with <code>setData</code>: the legend names it, and indicators kept to some intervals follow it.</td></tr>
    <tr><td><code>setPaneStyle(instanceId, {'{ background, separator }'} | null)</code> · <code>getPaneStyle(instanceId)</code></td><td>A pane's own look, saved with its indicator.</td></tr>
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
  <strong>Time zone.</strong> The time axis, the crosshair's time, the tooltip, the day
  breaks and the range presets follow the browser's zone by default. Give the chart an
  IANA zone (daylight saving included), a fixed offset in minutes east of UTC, or
  <code>'exchange'</code> for the symbol's zone (<code>SymbolInfo.timeZone</code>), else its
  market's: as the <code>timeZone</code> option, from the widget's settings, or directly:
</p>
<pre><code>{`new Chart(host, { timeZone: 'America/New_York' }) // from the start

chart.setTimeZone('America/New_York')  // New York's time, daylight saving included
chart.setTimeZone(330)                 // UTC+5:30, in minutes
chart.setTimeZone(null)                // the browser's
chart.setTimeZone('exchange')          // the symbol's zone, else its market's
chart.getTimeZone()                    // 'exchange', as set
chart.getEffectiveTimeZone()           // the zone it stands for: 'Asia/Ho_Chi_Minh' on HOSE`}</code></pre>
<p>
  The chart's methods and types spell it <code>timeZone</code>, as <code>Intl.DateTimeFormat</code>
  does. The older names still work, and are deprecated: <code>setTimezone</code>,
  <code>getTimezone</code>, <code>getEffectiveTimezone</code>, <code>getExchangeTimezone</code>,
  <code>setTimezoneOffset</code>, <code>EXCHANGE_TIMEZONE</code> and <code>SymbolInfo.timezone</code>
  (a symbol that gives both is read by its <code>timeZone</code>).
</p>

<p>The same effects are also available programmatically:</p>
<pre><code>{`chart.setAutoScale(false)  // hold the price range on screen (a new series is fitted once)
chart.setLogScale(true)    // switch to logarithmic price scale
chart.setInvertScale(true) // upside down (Alt+I in the widget)
chart.fitContent()         // zoom out to all data (Alt+R in the widget, with auto scale)
chart.scrollToEnd()
chart.setVisibleRangePreset('3M')       // 1D 5D 1M 3M 6M YTD 1Y 5Y All
chart.setMinBarUnit(0.05)               // narrower bars, so 'All' fits a long series (0.25 by default)
chart.goToTime(Date.UTC(2025, 0, 1))    // centre that bar (Alt+G in the widget)
chart.setVisibleRange(from, to)         // the bars between two times, edge to edge (Go to's Custom range)
chart.getVisibleTimeRange()             // { from, to }: the first and last bars on screen, or null`}</code></pre>
<p id="long-ranges">
  <strong>Long ranges.</strong> A bar slot is never narrower than 0.25 px, so a range longer than that allows (26 years of days on a laptop) shows its newest part. In the widget a long range on the range bar switches to the timeframe whose bars fit, at 2 px a bar or more: 5Y of days goes to weeks, All to months; a short range goes back to the timeframe you picked, never finer. It switches only to timeframes your feed serves (or the bars here resample to). <code>{`features: { 'statusBar.rangeTimeframe': false }`}</code> keeps the timeframe. On a bare <code>Chart</code>, <code>minBarUnit</code> (an option, or <code>setMinBarUnit</code>) lets slots go down to 0.02 px, drawn a pixel column at a time.
</p>

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
  numbers. Without a format of your own, prices are grouped in the number locale; the
  axis's tick labels show only the decimals their step needs (73,500), while the last
  price, the crosshair and the tags beside the axis show every decimal. Times can read your way too; the formatter is told what a label is.
</p>
<pre><code>{`new Chart(host, { priceFormat: { denominator: 32 } })                    // 101'16
chart.setPriceFormat({ denominator: 32, subDenominator: 2 })            // 101'165: 16½ 32nds
chart.setPriceFormat((p) => '$' + p.toFixed(2))
chart.setPriceFormat(null)                                              // decimals again

chart.setTimeFormatter((time, { kind, timeZone }) =>
  // kind: 'year', 'month', 'day' (the step a label starts), 'time' (within a day), 'crosshair'
  new Intl.DateTimeFormat('en-GB', { timeZone: timeZone ?? undefined, hour: '2-digit', minute: '2-digit' }).format(time))`}</code></pre>

<h3 id="axis-labels">How the axes choose their labels</h3>
<p>
  The time axis labels the bars that start the largest calendar steps: a year (in bold), a month, a day, a round hour, at least 80 px apart. So at 5Y it reads <code>2022 · Jul · 2023</code>, at a month <code>Oct · 8 · 15</code>, within a day <code>12:00 · 18:00</code>. The labels belong to bars, not to the screen: panning moves them with their bars, and history loaded in front leaves them where they were. Left of the oldest bar there are none. Month names follow <code>setNumberLocale</code>, and the grid's lines go where the labels are.
</p>
<p>
  The price scale fits as many labels as its height does, at least 30 px apart, on the market's price step. On a log scale its step grows with the price, so the bottom is labelled as well as the top; on a percent or indexed scale its labels are round percents or index points from the baseline. Indicator panes count their labels by their height too.
</p>

<h3>Markets: price steps, limits and sessions</h3>
<p>
  <code>setMarket</code> gives the chart an exchange's rules: candle colours, decimals, the
  price step (which can depend on the price), the daily ceiling and floor, and the lot.
  <code>roundPrice</code> and <code>getPriceStep</code> follow the step of the price's band, so
  prices from the chart's menus land on valid prices, and the widget's order ticket checks
  an order against the step, the day's limits and whole lots. A preset also carries the
  exchange's sessions and time zone, for <code>getCurrentSession</code> and your own code; the
  chart's session shading and extended hours come from <code>setSymbolInfo</code>. Presets cover the Vietnamese exchanges as of May 2025: HOSE (10, 50 or
  100 dong a step by price, ±7%), its ETFs and covered warrants (10 dong), HNX (±10%, a
  post-close session), UPCoM (±15%) and VN30 index futures (0.1 a point, ±7%, from 8:45);
  shares and lots of 100, green up and red down, purple ceiling, cyan floor and yellow
  reference. Their prices are in thousands of dong, as price boards show them;
  <code>scaleMarketPrices(preset, 1000)</code> reads prices in dong.
</p>
<pre><code>{`import {
  MARKET_HOSE, scaleMarketPrices, priceStepAt, roundToPriceStep, getCurrentSession,
  vn30fContracts, vn30fLastTradingDay,
} from '@tradecanvas/chart'

chart.setMarket(MARKET_HOSE)                 // or scaleMarketPrices(MARKET_HOSE, 1000) for 25350
chart.setTimeZone('exchange')                // the axis in the market's zone: Asia/Ho_Chi_Minh
chart.setPriceLimits(25.35)                  // the reference: yesterday's close
chart.getPriceLimits()                       // { ceiling: 27.1, floor: 23.6, reference: 25.35 }
chart.roundPrice(25.37)                      // 25.35, a 50-dong step
chart.getPriceStep(9.5)                      // 0.01 below 10,000 dong

// The rules on their own
priceStepAt(25.35, MARKET_HOSE)              // 0.05
roundToPriceStep(10.486, MARKET_HOSE, 'down') // 10.45
getCurrentSession(MARKET_HOSE.sessions, Date.now(), MARKET_HOSE.timeZone) // { name: 'ATC', type: 'preClose', … }, by the clock only

// VN30 futures: the four listed contracts and their last trading days
vn30fContracts(Date.now())                   // [{ symbol: 'VN30F2611', lastTradingDay: '2026-11-19', … }, …]
vn30fLastTradingDay(2026, 12, (day) => holidays.has(day)) // the third Thursday, earlier on a holiday`}</code></pre>
<p>
  A market of your own is a <code>MarketConfig</code>: <code>priceStep</code>, or
  <code>priceSteps: [{'{'} from, step {'}'}]</code> for bands, <code>priceLimits</code>,
  <code>volumeUnit</code> (the lot), <code>sessions</code>, <code>timeZone</code> and
  <code>colorScheme</code>. A symbol's own <code>minTick</code> comes before the market's
  step. Exchanges change their rules from time to time; check a preset against your
  exchange's current rules before you rely on it.
</p>

<p>
  The limits are drawn as dashed lines named CE, FL and REF, with a tag on the axis, in the
  market's <code>colorScheme</code> colours, else the theme's <code>priceLimits</code>. A colour
  that doesn't read at 4.5:1 on the theme's background is shaded toward its text until it does, so the
  price board's bright magenta, cyan and yellow keep their hue on the light theme.
  A theme of your own without <code>priceLimits</code> takes the light theme's on a light background, the dark theme's on a dark one.
</p>

<h3 id="comparing-symbols">Comparing symbols</h3>
<p>
  Another symbol's percent change on the price scale (<code>addCompareSymbol</code>), or
  its price on a scale of its own, in a pane of its own, or the spread or ratio of the
  chart's close to it — those last are indicators (<code>compareSymbol</code>, <code>compareSymbolPane</code>,
  <code>spread</code>), with legends, value tags, alerts and saved layouts like any
  other. The other symbol's bars line up with the chart's by time. The chart asks for
  the bars it needs; give them again after a timeframe change. <code>correlation</code> (of the closes)
  and <code>correlationlog</code> (of bar-to-bar returns) read the other symbol the same way, from −1 to 1.
</p>
<pre><code>{`chart.addCompareSymbol('eth', 'ETHUSDT', ethBars, '#7c4dff')   // percent change, on this scale
chart.addIndicator('compareSymbol', { symbol: 'ETHUSDT' }, 'bottom', { scale: 'left' })  // own scale
chart.addIndicator('compareSymbolPane', { symbol: 'ETHUSDT' })                         // own pane, own scale
chart.addIndicator('spread', { symbol: 'ETHUSDT', mode: 'ratio' })                      // own pane
chart.addIndicator('correlation', { symbol: 'ETHUSDT', length: 20 })                    // −1 to 1, own pane

chart.on('symbolSeriesRequest', async ({ payload }) =>
  chart.setSymbolSeries(payload.symbol, await adapter.fetchHistory(payload.symbol, '1h', 1000)))
chart.getRequiredSymbols()                           // what to fetch again on a new interval
chart.setPaneScale(spreadId, { percent: true })     // a pane in percent of its first value`}</code></pre>
<p>
  A percent line starts at the chart's own close on the first bar on screen, the price a percent
  scale reads 0% at, from the other symbol's own first bar there; one whose bars begin later
  starts at 0% too. With the price scale in percent (<code>chart.setScaleMode('percentage')</code>)
  each line then reads its own change since the first bar on screen, which moves as you pan.
  Its label is at its end. <code>chart.getCompareValues(barIndex?)</code> gives each line at a
  bar (the last by default), for a legend of your own: <code>{'{'} id, label, color, visible, close, change, stale {'}'}</code>, where <code>close</code> is the
  other symbol's close at or before the bar and <code>change</code> its change in percent, as
  its line reads. Past the other symbol's last bar (bars you fetched once, the chart streaming
  on) it gives its last close, with <code>stale: true</code>. <code>chart.setCompareVisible(id, false)</code>
  hides a line and leaves it out of the auto scale.
</p>
<p>
  Renko, Kagi, Line Break, P&amp;F and Range Bars draw no compare lines: their bars only count on from
  the first, with no time of their own, so a line there would read the other symbol at the wrong
  bars. On those types the lines stay out of the auto scale, and <code>getCompareValues()</code>
  gives each one's close at the latest data bar, whatever bar is asked for, with <code>change: null</code>.
  The indicators that read another symbol by time (a symbol on its own scale or in its own pane, a spread,
  a ratio, a correlation) are not drawn there either, nor fit a scale: <code>getActiveIndicators()</code> gives
  them <code>shown: false</code> and <code>offChartType: true</code>, and ChartWidget dims their rows as it dims a
  compare's. Back on candles they come back.
  A pane with nothing else in it is taken away there, its room going to the plot, and comes back with them.
</p>
<pre><code>{`chart.setScaleMode('percentage')       // each line reads its change on the axis
chart.getCompareValues()               // [{ id: 'eth', label: 'ETHUSDT', color, visible, close: 2650.4, change: -1.82, stale: false }]
chart.getCompareValues(barIndex)       // at a bar: the one under the cursor
chart.setCompareVisible('eth', false)  // hidden, and out of the auto scale`}</code></pre>
<p>
  In ChartWidget, Compare on the toolbar (and the + in the object tree) opens the compare dialog: search for a
  symbol, pick how under <strong>Add as</strong> (percent change, own scale, own pane, spread, ratio, or the
  correlation of prices or of returns) and add as many as you like. What is compared already is listed first,
  each with its way and a button to take it off. The dialog opens next time on the way used last.
</p>
<p>
  ChartWidget puts the price scale in percent while a symbol is compared in percent, and back to
  the scale you had once the last one goes. A logarithmic, percentage or indexed-to-100 scale is
  left as it is, and a scale you pick while comparing (the status bar's % or log, the chart's
  menu, the settings) stays, also after the last compare goes. The percent scale is never saved:
  a layout and a shared link keep your own. The legend lists each symbol compared in percent
  above the indicators, marked in its line's colour, with its price and its change at the bar under the
  cursor (the last bar otherwise), an eye to hide it and a button to take it off. Its bars are fetched as deep as the
  chart's and, when the chart loads older bars, the stretch those add (from a feed without <code>fetchHistoryBefore</code>,
  each again, as deep as the chart's, while the feed has older bars to give), so its line starts where the chart does.
  On a chart type that draws no compare lines it leaves your scale as it is and dims each compare's
  row, saying why in its tooltip and to a screen reader; back on one that draws them, the percent scale comes back.
</p>

<h3>Exporting data</h3>
<p>
  The bars as CSV or JSON, each indicator line in a column of its own named as the
  legend names it. ChartWidget has <strong>Export data (CSV)</strong> in the chart's
  right-click menu. Numbers with a fraction are written to 15 significant digits, so a
  volume summed from smaller bars reads 40.37 rather than 40.370000000000005.
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
  regular hours (<code>SymbolInfo.sessions</code> in its <code>timeZone</code>) leave the
  chart; they are kept aside, live bars and history pages too, and come back when
  turned on. Bars a day or longer are left as they are.
</p>
<pre><code>{`chart.setSymbolInfo({ symbol: 'AAPL', timeZone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] })
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

// pure computation is exported; the chart passes the exchange's zone (left out, the days are UTC's)
import { computePeriodLevels } from '@tradecanvas/core'
const levels = computePeriodLevels(bars, 'day', 'Australia/Sydney')  // [{ id, label, price }]`}</code></pre>

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

// split into one mini-profile per trading day, in the exchange's zone
chart.setMarketProfileConfig({ splitBySession: true })

// classic TPO letters per session (when zoomed in enough to be legible)
chart.setMarketProfileConfig({ splitBySession: true, letters: true })

// pure computation is exported too; give the sessions the exchange's zone, as the chart does (left out, UTC's days)
import { computeMarketProfile, computeSessionProfiles } from '@tradecanvas/core'
const profile = computeMarketProfile(bars, priceMin, priceMax, { buckets: 48 })
const sessions = computeSessionProfiles(bars, priceMin, priceMax, {}, 'Australia/Sydney')  // per-day TPO`}</code></pre>

<h3>Touch &amp; mobile</h3>
<table>
  <thead><tr><th>Gesture</th><th>Action</th></tr></thead>
  <tbody>
    <tr><td>1-finger drag (chart area)</td><td>Pan + move crosshair</td></tr>
    <tr><td>2-finger pinch</td><td>Zoom around the midpoint</td></tr>
    <tr><td>Long-press (~500 ms)</td><td>Pin OHLC tooltip at the bar (mobile equivalent of Alt-click)</td></tr>
    <tr><td>1-finger drag inside price / time axis strip</td><td>Scale the corresponding axis</td></tr>
    <tr><td>Tap</td><td>Click: <code>click</code>, <code>barClick</code>, a signal marker; on a drawing, select it</td></tr>
    <tr><td>Double tap</td><td>Double-click: on an axis, reset it; on a drawing, open its settings</td></tr>
    <tr><td>1-finger drag on a drawing</td><td>Move it, or reshape it by a handle of the selected one</td></tr>
    <tr><td>With a drawing tool: tap, tap — or press, drag, lift</td><td>Place its points; press, drag and lift draws a two-point line in one go</td></tr>
    <tr><td>Long-press on a drawing</td><td>Its menu (as a right-click)</td></tr>
    <tr><td>1-finger drag on an alert, order or bracket line, or a pane divider</td><td>Drag it</td></tr>
  </tbody>
</table>
<p>
  A finger reaches further than a mouse: about 16 px to a line and 22 px to a handle, against 8. On a page that scrolls, <code>pageScroll: true</code> leaves vertical swipes and the plain mouse wheel to the page: the chart pans with a sideways swipe and zooms with two fingers or Ctrl + wheel (a trackpad pinch), while presses on drawings, lines and axes stay the chart's. <code>chart.setPageScroll(on)</code> switches it while running.
</p>
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
chart.on('dataUpdate', e => /* { kind: 'bars', length } on setData and new bars; { kind: 'correction', time, index } on a corrected bar; or kind 'alert' | 'bracket' | 'connection' | 'error' */)
chart.on('ordersChange', e => /* { orders } */)
chart.on('positionsChange', e => /* { positions } */)
chart.on('executionFill', e => /* { side, price, quantity, reason, pnl } */)
chart.on('chartContextMenu', e => /* { area, x, y, price, time } */)
chart.on('stateChange', () => /* drawings, indicators, alerts, chart type or theme may have changed */)
chart.on('paneChange', e => /* { instanceId, change: 'collapsed' | 'maximized' | 'order' } */)
chart.on('crosshairMove', e => /* { point, bar, barIndex, time, prevClose }: time is when the bar stands as the axis dates it (on Renko, the bar a brick was finished on); prevClose the close of the bar drawn before */)
chart.on('legendResize', e => /* { bottom }: the legend drawn taller or shorter; content stacked under it moves to getLegendBottom() */)
chart.on('chartTypeChange', e => /* { type, previous } */)
chart.on('symbolChange', e => /* { symbol, previous } */)
chart.on('marketChange', e => /* { market }: setMarket */)
chart.on('compareChange', e => /* { id, change: 'add' | 'remove' | 'data' | 'visible' }: addCompareSymbol and the rest */)
chart.on('timeframeChange', e => /* { timeframe, previous } */)
chart.on('historyChange', e => /* { canUndo, canRedo } */)
chart.on('drawingSelect', e => /* { ids, primary } */)
chart.on('rendererChange', e => /* { renderer: 'canvas' | 'webgl', reason?: 'unsupported' | 'contextLost' | 'contextRestored' | 'limit' } */)`}</code></pre>
<p>
  Labels of your own under the legend start at <code>getLegendBottom()</code> and move
  with <code>legendResize</code>. Tell the chart their size with
  <code>setLegendStack({'{'} width, height {'}'})</code>, measured from the plot's left edge and
  that bottom (<code>null</code> when there are none): drawing labels, such as a horizontal
  line's price or a position's target, keep clear of them as they keep clear of the legend.
  ChartWidget does this for its indicator rows.
  A label they cover slides beside them on its own row, goes under them when that is
  near its line, or else sits on its line by the price axis; labels moved keep clear of one
  another, and a position's tags keep the order of their prices.
</p>

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
  its precision. ChartWidget's menus, order ticket and the drawing settings' Coordinates tab do this.
  <code>chart.getPriceStep()</code> is that step itself.
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
  features: { 'toolbar.replay': false },   // the widget's switches: see Customization
  onReady: (chart, widget) => { /* once built, just after new ChartWidget() returns */ },
})

widget.chart.setData(...)
widget.destroy()`}</code></pre>

<h3 id="bars">The bars</h3>
<table>
  <thead><tr><th>Bar</th><th>What it holds</th></tr></thead>
  <tbody>
    <tr><td>Toolbar</td><td>
      The symbol and its info; the intervals (the pinned ones as buttons, and a menu of them all by unit, minutes to
      months, a star on each to pin it); the chart type as its icon; Indicators (a dialog: see <a href={href('/docs/indicators')}>Indicators</a>), and Compare when there is a data adapter; undo and redo. On the
      right: layouts, bar replay, a Trade menu (a new order, long and short brackets, the depth ladder and the
      account panel), then screenshot, settings, the theme and fullscreen; alerts and the object tree too where
      there is no rail (a phone, or <code>{`features: { dock: false }`}</code>). What doesn't fit folds under “more”.
    </td></tr>
    <tr><td>Drawing tools</td><td>
      Each group's menu names its tools' shortcuts (Alt+T a trend line) and has a star on each row to pin it to the
      top. At the bottom: the drawing style, the magnet, the eraser, the zoom area, staying in drawing mode, lock
      all, hide all and clear all.
    </td></tr>
    <tr><td>Status bar</td><td>
      Range presets and go to date; the market's status, the connection, a clock in the display time zone (it
      opens the zones to pick from) and the price scale's <code>%</code> · <code>log</code> · <code>auto</code>
      switches.
    </td></tr>
    <tr><td>Over a selected drawing</td><td>
      Its colour, width and line style, settings, an alert, lock, more and delete. Drag it by its grip and it stays
      there for the next drawing; double-click the grip to put it back over the drawing.
    </td></tr>
    <tr><td>Dock</td><td>
      A rail at the outer edge with a button for each panel: the watchlist, alerts, the object tree, the data
      window and the symbol info. See <a href="#dock">The dock</a>.
    </td></tr>
  </tbody>
</table>

<h3 id="dock">The dock</h3>
<p>
  The widget's panels sit beside the chart, one at a time, opened from the rail at the outer edge (on the left in
  a right-to-left widget). A rail button opens its panel, or shuts it when it is the one open; so does each
  panel's close button. No panel opens by itself: the chart has the room until one is asked for
  (<code>widget.openPanel('watchlist')</code> opens one from your code). Drag the panel's edge, or use the arrow keys on it, for a width from 233 to 377 px (296 to start),
  kept in this browser; it never takes more than 38.2% of the row, the chart keeping the rest.
</p>
<p>
  On a phone, or in a widget narrower than 641 px, there is no rail: a panel rises from the bottom over the chart,
  starts shut and shuts on Escape; a panel open as the widget turns narrow (a tablet turned) shuts. Alerts and the object tree open from the toolbar there, the symbol info from the
  <strong>ⓘ</strong> by the symbol, and any panel from your own code. The charts of a
  <code>ChartWidgetGrid</code> have no rail each, unless its <code>widget.features</code> turn <code>dock</code> on.
</p>
<pre><code>{`widget.openPanel('watchlist')   // 'watchlist' | 'alerts' | 'objectTree' | 'dataWindow' | 'symbolInfo' | 'depthLadder'; false if not there
widget.getOpenPanel()           // the panel open, or null
widget.closePanel()

new ChartWidget(host, { features: { dock: false } })              // no rail: the toolbar opens the panels
new ChartWidget(host, { features: { 'dock.dataWindow': false } })  // no button for the data window`}</code></pre>

<h3 id="search-dialogs">Symbol search, Compare and Go to</h3>
<p>
  <strong>Symbol search</strong> opens from the symbol on the toolbar, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>P</kbd>,
  or a letter typed on the chart, which it starts with. It lists your <code>symbols</code> until something is
  typed, then asks your feed's search (<code>searchSymbols</code>, or the adapter's) once typing pauses. A row starts
  with a badge (the symbol's logo, else the first letter of its ticker in its kind's colour), then the symbol, its
  name, its kind and its exchange in columns, the chart's own marked. Tabs keep the list to one kind (stocks, crypto)
  and stay put as you type; when the rows come from two or more exchanges, a list beside them keeps it to one. Both
  narrow the rows on hand and do not search again: a search returns a page of results (the adapter's is asked for
  50), so HNX picked after typing <code>V</code> shows the HNX ones among them, not every HNX symbol with a V. The
  list shows the best 200 rows, and a line under it says how many more typing would narrow. With no search, typing finds your symbols by ticker and by
  name, with or without Vietnamese marks (<code>ngan hang</code> finds “Ngân hàng”).
  <code>{`features: { symbolTyping: false }`}</code> leaves letters typed on the chart alone.
</p>
<p>
  Give <code>symbols</code> as <code>SymbolInfo</code> and the list opens with names, kinds, exchanges and logos;
  the toolbar's symbol and the symbol info panel take a name and an exchange from them where the chart knows none.
  A feed's search results win over these words and keep your logo; what the chart knows of its own symbol gives the search only a name or a logo it lacks, as it may name the kind and the exchange in other words than your list (stock for Cổ phiếu, a broker for the exchange). Price steps and hours given here are not applied to the chart: those come from the adapter's
  <code>resolveSymbol</code> or <code>chart.setSymbolInfo</code>.
</p>
<pre><code>{`new ChartWidget(el, {
  symbols: [
    { symbol: 'VNM', description: 'Vinamilk', type: 'stock', exchange: 'HOSE', logo: '/logos/vnm.svg' },
    'FPT',   // a ticker alone, as before
  ],
})`}</code></pre>
<p>
  A <code>logo</code> is an <code>https:</code> or <code>http:</code> address, a path on your site, a
  <code>blob:</code> URL or an image written in <code>data:</code> (PNG, JPEG, GIF, WebP, AVIF or SVG); anything
  else is ignored. It is only ever loaded as an image, with no referrer, so your page's <code>img-src</code> policy
  must allow its host; one that fails to load shows the letter. The letters take their colours from <code>--tcw-kind-1</code> … <code>--tcw-kind-5</code> (stock, futures, index, crypto and perpetuals, forex, in English, Vietnamese, Japanese, Chinese or Korean words; a warrant takes the futures' colour, a fund or an ETF the index's, a bond the forex's; another kind gets one by its words), set for the dark and the light theme.
</p>
<p>
  Once a search has told of a symbol, the feed's words name it on the list the search opens with too, not only
  among the results. A name, kind, exchange or logo that isn't text (a JSON feed's <code>null</code>, a numeric
  exchange code), in a feed's results or in what the chart knows, counts as not given: it neither shows nor erases yours. A venue before a colon
  (<code>BINANCE:BTCUSDT</code>) is dimmed, and is what a narrow column shortens first; on a phone the kind tabs
  scroll in one line and fade at an end with more past it. What the chart knows of its symbol names it on the
  toolbar and in the info panel when it is of the same symbol (in any case, with or without a venue before a colon)
  or was set since the symbol changed, so a feed's own spelling (<code>BTC-USD</code> for <code>BTCUSD</code>)
  still counts.
</p>
<p>
  <strong>Compare</strong> is the same dialog with <strong>Add as</strong> under the search and what is compared
  listed first (see <a href="#comparing-symbols">Comparing symbols</a>).
</p>
<p>
  <strong>Go to</strong> (the calendar on the status bar, <kbd>Alt</kbd>+<kbd>G</kbd>, or the chart's menu) has two
  tabs. <strong>Date</strong> centres the bar of a day and a time; <strong>Custom range</strong> shows the bars
  between two of them edge to edge, starting from those on screen. The month under the fields fills the date
  field in hand, and after a range's start it moves on to its end. On daily bars and longer there is no time to
  give, and days after today can't be picked. Dates and times read in the display time zone.
</p>

<h3>Widget keyboard shortcuts</h3>
<table>
  <thead><tr><th>Shortcut</th><th>Action</th></tr></thead>
  <tbody>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd></td><td>Command palette: the widget's own commands with their keys (go to, reset the view, save the layout, the panels…), the drawing tools, chart types, intervals and indicators; the ones used last come first</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>P</kbd></td><td>Symbol search: your symbols, or your feed's search as you type</td></tr>
    <tr><td><kbd>A</kbd>–<kbd>Z</kbd></td><td>Search for a symbol, starting with the letter typed (<code>{`features: { symbolTyping: false }`}</code> turns it off)</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>S</kbd></td><td>Save the layout (asks for a name the first time)</td></tr>
    <tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Type an interval (<code>5</code>, <code>15m</code>, <code>1h</code>, <code>1D</code>) and press Enter (<code>intervalTyping: false</code> turns it off)</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>T</kbd> / <kbd>H</kbd> / <kbd>J</kbd> / <kbd>V</kbd> / <kbd>C</kbd> / <kbd>F</kbd></td><td>Trend line, horizontal line, horizontal ray, vertical line, cross line, Fibonacci retracement</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>R</kbd></td><td>Reset the view: every bar in sight, the price scale fitted to them</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>I</kbd></td><td>Invert the price scale</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>G</kbd></td><td>Go to a date</td></tr>
    <tr><td><kbd>?</kbd></td><td>The shortcut sheet, searchable by what a key does or by the keys</td></tr>
    <tr><td><kbd>Alt</kbd> + click chart</td><td>Pin OHLC tooltip at the hovered bar (delta to live crosshair shown)</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>Unpin tooltip / cancel drawing</td></tr>
    <tr><td><kbd>Shift</kbd> + <kbd>←</kbd> / <kbd>→</kbd></td><td>Step the replay back / forward</td></tr>
    <tr><td><kbd>Space</kbd></td><td>Play or pause the replay (on the chart or its track; outside a replay it fits the chart)</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>Stop picking the replay's start bar</td></tr>
    <tr><td>Click symbol in toolbar</td><td>Opens the symbol search modal</td></tr>
    <tr><td>Click play in toolbar</td><td>Opens the bar replay scrubber (play/step/seek/speed)</td></tr>
  </tbody>
</table>
<p>
  Change the symbols on offer at runtime with <code>widget.setSymbols(['BTCUSDT', 'ETHUSDT', …])</code>, tickers or
  <code>SymbolInfo</code> as in <code>symbols</code>. A watchlist made from <code>symbols</code> (no <code>lists</code>,
  nothing kept) is replaced with them, and asks quotes for every one: for a long list from your server, give the
  watchlist lists of its own.
</p>
<pre><code>{`const widget = new ChartWidget(el, {
  adapter: feed,
  watchlist: { lists: [{ id: 'main', name: 'Main', symbols: ['VNM', 'FPT'] }] },
})
widget.setSymbols(await loadMarkets())   // your server's SymbolInfo[]: the search opens with them, the watchlist stays`}</code></pre>

<h3>Data Window</h3>
<p>
  A floating readout of the exact O/H/L/C/V, bar change, and every active
  indicator's value at the hovered bar — updates live as you move the
  crosshair. Toggle it from the command palette (<kbd>Ctrl/⌘ K</kbd> →
  "Toggle Data Window"). On a touch screen, touch the chart to put the
  crosshair on a bar. Prices, the change and the values of indicators on the
  price pane read as the chart writes prices; those of indicators in a pane of
  their own as their legend row does; all in the chart's number locale.
  A compare, a spread or a ratio, and a line on a scale of its own, read in the
  decimals their size calls for, not the chart's prices'. On Renko, Kagi and the
  like the data window shows the brick under the pointer and its change from the
  brick before.
</p>

<h3>Shareable view (deep links)</h3>
<p>
  Encode the whole view — symbol, timeframe, chart type, price scale,
  indicators (with params), drawings, and the Chart Settings changed from the
  defaults (not the time zone or number format) — into a compact, URL-safe
  string for deep-linking. With <code>shareUrl: true</code> the widget restores a
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
  interval, price scale, chart type, indicators, drawings, alerts and the
  <a href="#chart-settings">Chart Settings</a> (not the theme, the time zone or
  the number format, which stay the viewer's). Open, rename and delete layouts from its
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

<h3 id="chart-settings">Chart settings</h3>
<p>
  The settings dialog's switches and choices (the volume and market profiles,
  swing markers, session shading, prior-period levels, grid, legend, crosshair,
  scales, time zone, number format) are the widget's Chart Settings. Read them
  with <code>getSettings()</code>, a copy; change some with
  <code>setSettings(patch)</code>, which drops what it can't read, keeps numbers
  in the dialog's ranges and records no undo step; and hear of each change with
  <code>onSettingsChange(listener)</code>, which returns the function that stops
  it. It is called once when the dialog closes with OK, never for Cancel or for
  a change that changes nothing. Until the chart has bars, <code>setSettings</code>
  leaves auto-scale on, since off holds the price range on screen and there is none
  yet: the settings <code>onSettingsChange</code> gave, auto-scale off after a drag
  on the price axis, are safe to give back right after the constructor. With <code>persistSettings: true</code> the
  widget keeps them in this browser and puts them back on the next visit.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  chartOptions: { timeZone: 'UTC' },
  persistSettings: true,            // or { key: 'myapp:settings' }
})

widget.setSettings({ volumeProfileVisible: true, timezone: 'exchange' })
widget.getSettings().timezone       // 'exchange'

const stop = widget.onSettingsChange((settings) => {
  api.put('/me/chart-settings', settings)   // your server, say
})
stop()`}</code></pre>
<p>
  <code>getSettings()</code> reads back what was set on <code>getChart()</code> too,
  so a layout or a link saves it as it is. The chart gives these settings with
  <code>isVolumeVisible()</code>, <code>isLegendVisible()</code>,
  <code>isBarCountdownVisible()</code>, <code>isIndicatorValueLabelsVisible()</code>,
  <code>isLeftPriceScaleVisible()</code>, <code>getMarketProfileConfig()</code>,
  <code>getDepthHeatmapConfig()</code>, <code>getPivotMarkersConfig()</code> and
  <code>getPeriodLevelsPeriod()</code>, beside each overlay's <code>is…Visible()</code>.
</p>
<ul>
  <li><strong>persistSettings</strong> keeps, per browser, what the user changed
    from your values. A kept value wins over <code>chartOptions</code>, and Reset
    goes back to yours. It leaves out the log and auto-scale flags and a chart
    type's own settings (the Renko box and the like), which are the chart's state.
    Give each widget on a page a <code>key</code> of its own; a grid gives each of
    its charts one. It can't tell who made a change: what you set with
    <code>setSettings</code> (in <code>onReady</code>, say), and what an opened
    layout brings, are kept as the user's too, and win over
    <code>chartOptions</code> on the next visit even once your code stops setting
    them. Setting one back to your <code>chartOptions</code> value takes it out of
    what is kept. What an opened share link brings is someone else's choice: it
    shows for that visit only, is not kept, and calls no
    <code>onSettingsChange</code> listener (the next change tells them all).</li>
  <li><strong>Named layouts</strong> keep all of them but the time zone and the
    number format, which stay the viewer's, and auto-scale, which a drag on the
    price axis turns off. In the layout's JSON they are under
    <code>settings</code>, except the scale and its flip, which have fields of
    their own, and a chart type's own settings, which are in the chart's state.
    A layout saved before they were kept has none, and opening it leaves the
    settings as they are. An older version of the library opens a newer layout
    without them, and its auto-save writes it back without them.</li>
  <li><strong>Share links</strong> carry the ones the sender changed from the
    defaults, but the time zone, the number format and auto-scale. A chart
    type's own settings in a link set only the types the sender set and the
    type shown (at its defaults when the sender left it there); the viewer's
    settings of the other types stay. For the
    switches your <code>features</code> set (the legend, the volume, the bar
    countdown, the indicators' value labels) the defaults are where they set
    them, so a switch the sender's app turned off isn't sent as a change.</li>
  <li><strong>Switched-off features</strong>: where your <code>features</code>
    turn off the legend, the volume, the bar countdown or the log scale, nothing
    kept, shared, opened, set or applied from a chart template turns them on,
    and the settings dialog doesn't offer the legend's or the volume's switch
    and colours.</li>
  <li><strong>Per-symbol layouts</strong> (<code>persistLayouts</code>) and
    <code>chart.saveState()</code> hold a chart type's own settings, which are
    part of the chart's state, and none of the others.</li>
</ul>

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
  when the user navigates away. Of the Chart Settings they hold
  only a chart type's own; <code>persistSettings</code> keeps the others.
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

// Or build bars yourself
import { resampleBars, timeframeBucketStart } from '@tradecanvas/chart'

const hourly = resampleBars(oneMinuteBars, '1h')   // OHLC merged, volume summed
const days = resampleBars(oneMinuteBars, '1d', { timeZone: 'Asia/Ho_Chi_Minh' })   // from 00:00 there
const dayStart = timeframeBucketStart(trade.time, '1d', { timeZone: 'Asia/Ho_Chi_Minh' })`}</code></pre>
<p>
  Calendar-aware bucketing: minutes and hours (1h and shorter) floor to multiples of the
  frame since the Unix epoch. Days, weeks (from the configured week start), months,
  quarters and years start at the exchange's midnight, and so do the hour frames that
  divide a day (2h, 3h, 4h, 6h, 8h, 12h). For the bars given to <code>widget.setData</code>,
  that is the midnight of the symbol's <code>timeZone</code> (<code>setSymbolInfo</code>), else
  the market's (<code>setMarket</code>), else UTC's. The timeframes a feed lacks start at the
  midnight of the zone its <code>resolveSymbol</code> names, else UTC's: the market's zone
  doesn't move them. A day the clocks change is 23 or 25 hours
  long. Daily bars stamped at 00:00 UTC are read as the dates they name, so a Monday stays
  in its own week west of UTC and the weeks keep 00:00 UTC stamps. Input bars are never
  mutated.
</p>
<p>
  A daily bar shows the date it stands for, whatever zone the chart shows: one stamped at
  00:00 UTC its UTC date, one built at the exchange's midnight the exchange's date (on the
  time axis, the crosshair and its card, the tooltip Alt-click pins, and the bar times a screen reader reads). For bars you build yourself, <code>timeframeBucketStart(time, timeframe, {'{'} timeZone {'}'})</code> gives the
  start of the bar a time falls in.
</p>

<h3>Watchlists</h3>
<p>
  A panel of the dock: lists of symbols, each row with last price, % change and a sparkline. Lists
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
  A panel of the dock, from the ⓘ by the symbol, the rail, or the command palette: the symbol's names, last price and
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
  show while the mouse is near the plot's bottom edge, out of the way of the data, or while one has focus
  (<code>navigation: false</code> leaves them out). Settings changes and
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
  The rail's layers button (the toolbar's, where there is no rail) opens the
  object tree in the dock, listing every active indicator, named as its chip names it (EMA 20, Compare ETHUSDT),
  and every drawing. Indicators can be removed; drawings get per-item
  show / hide, lock / unlock, settings and delete, and groups are listed with
  their drawings under them. Enabled by default — disable with
  <code>objectTree: false</code>. The drawing controls map to:
</p>
<pre><code>{`chart.getDrawings()                 // DrawingState[] (id, type, visible, locked, intervals)
chart.setDrawingVisible(id, false)  // hide a single drawing
chart.isDrawingShown(id)            // not hidden, and on this interval
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
  settings in tabs: Style (the line, its ends, the fill, the tool's own
  settings such as Fibonacci levels, extensions and labels), Text for the tools
  that write, Coordinates (its points in the chart's time zone) and Visibility
  (the intervals it shows on), with a Template menu, Cancel and OK at the foot.
  Right-click a drawing for
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
  The object tree's <strong>Compare</strong> section lists every compare, as the compare
  dialog does: each symbol with its way (percent change, own scale, own pane, spread, ratio
  or correlation) and a button to take it off. With a live adapter, its + button opens the
  compare dialog. Whatever the way, the widget fetches the other symbol's bars through
  <code>adapter.fetchHistory</code> before it adds the compare, and adds nothing when they
  don't come (the fetch fails, or there are no bars at this interval); a toast says why.
  A compare a saved state brings back stays on the chart when its bars fail to load, and
  fills on an interval that has them. Comparisons refetch automatically on timeframe
  change. Programmatic equivalents:
</p>
<pre><code>{`widget.addCompareSymbol('ETHUSDT')   // fetches + overlays (needs an adapter)
await widget.addCompareSymbol('ETHUSDT', 'scale')  // its bars first; nothing added if they don't come

// or drive the chart directly with your own data
chart.addCompareSymbol('ETHUSDT', 'ETH', ethBars, '#627eea')
chart.setCompareMode('percent')      // 'percent' | 'absolute'
chart.setScaleMode('percentage')     // each line's change, read on the axis
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

<h3>Feature switches</h3>
<p>132 switches, every one on until turned off: a name without a dot is a whole capability, off wherever it shows; a dotted name is one place. They change while the widget runs. All of them, and the older options they stand for, are in <a href={href('/docs/customization')}>Customization</a>.</p>
<pre><code>{`new ChartWidget(host, { features: { 'toolbar.replay': false, 'sidebar.patterns': false, hotkeys: false } })   // one button, a section of drawing tools, every key

widget.setFeatures({ sidebar: false, statusBar: false })
widget.isFeatureOn('sidebar')    // false
widget.getFeatures()             // every switch, on or off`}</code></pre>

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
<p>Also a menu button on the toolbar, buttons on the drawing sidebar, items on the status bar, places of your own in each bar and over the chart, and entries at the end of a drawing's or an indicator's menu (see <a href={href('/docs/customization#parts')}>Customization</a>):</p>
<pre><code>{`widget.addToolbarDropdown({ id: 'scans', label: 'Scans', icon: 'layers', items: () => [...] })   // asked for each time it opens
widget.addSidebarButton({ id: 'ruler', label: 'Ruler', icon: 'ruler', toggle: true, onClick })
widget.addStatusBarItem({ id: 'latency', text: '12 ms', label: 'Latency' })
widget.getSlot('chart')          // a layer over the chart
widget.addHotkey({ keys: 'Alt+N', label: 'New note', onPress })   // a shortcut of yours; it replaces a widget shortcut on the same keys

new ChartWidget(host, {
  drawingMenuItems: ({ id, type }) => [{ label: 'Share', onSelect: () => share(id) }],
  indicatorMenuItems: ({ instanceId, indicatorId }) => [{ label: 'Explain', onSelect: () => explain(indicatorId) }],
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
grid.applyOverrides({ 'grid.vertical.visible': false })   // every chart's look, and the charts it adds
grid.setFeatures({ 'toolbar.replay': false })               // every chart's switches, and the charts it adds
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
