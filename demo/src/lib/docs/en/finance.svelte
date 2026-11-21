<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Finance charts — TradeCanvas docs</title>
  <meta name="description" content="Charts for finance dashboards beside the candle chart: bars, donuts, scatter and bubbles, histograms, calendars, correlation matrices, sparklines, gauges, heatmaps and treemaps, waterfalls, depth, equity curves and a performance report." />
</svelte:head>

<h1>Finance charts</h1>
<p>
  Charts for dashboards and reports, beside the candle chart. Each one is a class that
  takes an element and its options, sizes itself to the element and draws in the chart's
  dark or light theme; most follow the pointer with a tooltip.
</p>

<h2>The charts</h2>
<table>
  <thead><tr><th>Class</th><th>For</th></tr></thead>
  <tbody>
    <tr><td><code>BarChart</code></td><td>Values by category: net flows, volume by session, returns by month. Grouped or stacked, upright or sideways, up and down from zero.</td></tr>
    <tr><td><code>DonutChart</code></td><td>Parts of a whole: allocation, exposure by sector. A pie with <code>innerRadius: 0</code>.</td></tr>
    <tr><td><code>ScatterChart</code></td><td>Two values per item: risk against return, valuation against growth; bubbles when a point has a size.</td></tr>
    <tr><td><code>HistogramChart</code></td><td>How values spread: daily returns, trade results, with lines at the mean or a VaR.</td></tr>
    <tr><td><code>CalendarChart</code></td><td>A value a day on a calendar: daily returns, P&amp;L, a trading journal.</td></tr>
    <tr><td><code>MatrixChart</code></td><td>A value for each pair of rows and columns: correlations, volume by hour and weekday.</td></tr>
    <tr><td><code>CounterClockChart</code></td><td>Average price against average volume, bar by bar: the counter-clock cycle of a stock.</td></tr>
    <tr><td><code>SparklineChart</code></td><td>A small line in a watchlist row or a KPI tile.</td></tr>
    <tr><td><code>GaugeChart</code></td><td>One value against bands: sentiment, risk, margin use.</td></tr>
    <tr><td><code>HeatmapChart</code></td><td>Cells coloured by change, in a grid or a treemap sized by weight (market cap). With <code>grouped</code>, a sector map.</td></tr>
    <tr><td><code>WaterfallChart</code></td><td>Steps from a start to an end: P&amp;L attribution, cash flows.</td></tr>
    <tr><td><code>DepthChart</code></td><td>Cumulative bids and asks of an order book.</td></tr>
    <tr><td><code>EquityCurveChart</code></td><td>An account's value over time, with drawdowns and a benchmark.</td></tr>
    <tr><td><code>PayoffChart</code></td><td>What an options position makes or loses at expiry, over the underlying's price: a spread, a straddle, a condor.</td></tr>
    <tr><td><code>CurveChart</code></td><td>Values against a strike or a tenor, a line for each series: a volatility smile, a term structure, a yield curve.</td></tr>
    <tr><td><code>BoxPlotChart</code></td><td>How each group's values spread: returns by weekday, by month, by strategy.</td></tr>
    <tr><td><code>RadarChart</code></td><td>Several measures at once, a spoke each: a strategy's scorecard beside a benchmark's.</td></tr>
    <tr><td><code>SunburstChart</code></td><td>Parts of a whole and the parts inside them: an allocation by asset class, then sector, then holding.</td></tr>
    <tr><td><code>StackedAreaChart</code></td><td>Several series one on another over time: what a total is made of, or how its mix changes.</td></tr>
    <tr><td><code>PerformanceDashboard</code></td><td>A strategy report from a backtest: stats, equity, drawdown and monthly returns.</td></tr>
  </tbody>
</table>

<h2>What they share</h2>
<pre><code>{`const chart = new BarChart(element, { categories, series, theme: 'dark' })

chart.setOptions({ mode: 'stacked' })   // any option, merged
chart.setTheme('light')                 // 'dark' | 'light' | a Theme
chart.destroy()                         // removes the canvas and its listeners`}</code></pre>
<p>
  On a touch screen a tap shows the tooltip, and it stays until a tap elsewhere; a drag still scrolls the page. The charts draw on the screen's own pixels, so lines stay sharp at any zoom or display scaling. The depth, equity and waterfall charts size their margins to their labels, as the newer charts do.
</p>
<p>
  Text is in the system's sans face, as the widget's figures are; <code>font</code> sets another (<code>{'{'} family: MONO_FONT_FAMILY {'}'}</code> for the monospaced one), and a theme with a face of its own keeps it. <code>locale</code> (a BCP 47 tag such as <code>'vi'</code>) sets the language numbers and dates are written in; the browser's own otherwise. Every chart describes itself to screen readers in English unless <code>ariaLabel</code> says it in your words. A depth chart's <code>spreadLabel</code> and an equity curve's <code>benchmarkLabel</code> take the words drawn on them, and a dashboard's <code>labels</code> its titles and the names of its stats.
</p>
<p>
  Each chart fills its element and redraws when the element resizes. Where a chart has a hover
  tooltip, <code>crosshair: false</code> turns it off. Bar, donut, scatter, histogram, calendar and matrix charts tell screen readers
  what they show (the canvas has an image role and a label); <code>ariaLabel</code> puts it in
  your words, for instance in your page's language. Numbers read with
  <code>valueFormat</code> (or <code>xFormat</code> / <code>yFormat</code>), else as
  1,234.5 and, past ten thousand, 12.3K.
</p>

<h2>Bar chart</h2>
<pre><code>{`import { BarChart } from '@tradecanvas/chart'

// Foreign net buying over ten sessions: green above zero, red below.
const flows = new BarChart(el, {
  categories: ['6/10', '7/10', '8/10', '9/10'],
  series: [{ name: 'Net', values: [-660, 860, -280, 230] }],
  colorBySign: true,                    // or { positive, negative }
  valueFormat: (v) => v + ' bn',
  onBarClick: ({ category, series, value, index }) => openDay(index),
})

// Several series side by side, or stacked: positives up and negatives down from zero.
new BarChart(el, {
  categories: ['Foreign', 'Proprietary', 'Retail'],
  series: [{ name: 'Buy', values: [820, 310, 4200] }, { name: 'Sell', values: [-760, -280, -4290] }],
  mode: 'stacked',
  orientation: 'horizontal',            // bars to the right, labels on the left
  showValues: true,
})

flows.update(categories, series)`}</code></pre>
<p>
  Zero is always on the value axis. Hovering a category shows every series' value for it;
  the legend shows when there is more than one series (<code>legend</code> to choose). Labels
  that don't fit along the bottom show every few categories.
</p>

<h2>Donut chart</h2>
<pre><code>{`import { DonutChart } from '@tradecanvas/chart'

new DonutChart(el, {
  data: [
    { label: 'Stocks', value: 52 },
    { label: 'Bonds', value: 23 },
    { label: 'Cash', value: 15 },
    { label: 'Gold', value: 10, color: '#d4a017' },
  ],
  innerRadius: 0.6,                     // 0 for a pie
  centerLabel: 'Total',
  centerValue: '1.2B ₫',
  onSliceClick: (slice) => filterBy(slice.label),
})`}</code></pre>
<p>
  Slices go clockwise from twelve o'clock; values of 0 or less are left out. Each slice shows
  its share where it has room, and the legend lists names and shares, beside the ring when the
  chart is wide and under it when not.
</p>

<h2>Scatter and bubble chart</h2>
<pre><code>{`import { ScatterChart } from '@tradecanvas/chart'

new ScatterChart(el, {
  series: [{
    name: 'Banks',
    points: [
      { x: 21, y: 9, size: 480, label: 'VCB' },   // size: market value; the bubble's area follows it
      { x: 34, y: 24, size: 170, label: 'TCB' },
    ],
  }],
  xLabel: 'Volatility',
  yLabel: 'Return, a year',
  xFormat: (v) => v + '%',
  yFormat: (v) => v + '%',
  showLabels: true,
  onPointClick: (point, series) => openSymbol(point.label),
})`}</code></pre>
<p>
  The axes leave room for the largest bubble (<code>maxRadius</code>, 24 px by default), and lines
  mark x = 0 and y = 0 when the axes cross them (<code>zeroLines: false</code> to hide them).
</p>

<h2>Histogram</h2>
<pre><code>{`import { HistogramChart, histogramBins } from '@tradecanvas/chart'

new HistogramChart(el, {
  values: dailyReturns,                 // in percent
  binWidth: 0.5,                        // or bins: 20, or 'auto' (Sturges' rule)
  colorBySign: true,
  valueFormat: (v) => v.toFixed(1) + '%',
  markers: [{ value: mean, label: 'Mean' }, { value: var95, label: 'VaR 95%', color: '#e85a67' }],
})

histogramBins([1, 2, 2, 3, 10], { bins: 3 })
// [{ from: 1, to: 4, count: 4 }, { from: 4, to: 7, count: 0 }, { from: 7, to: 10, count: 1 }]`}</code></pre>

<h2>Calendar</h2>
<pre><code>{`import { CalendarChart } from '@tradecanvas/chart'

// A year of sessions, Monday to Friday, coloured by the day's change.
new CalendarChart(el, {
  data: [{ date: '2025-01-02', value: 1.2 }, { date: '2025-01-03', value: -0.8 }],   // YYYY-MM-DD
  weekdays: 5,                          // 7 (default) every day; weekStart: 0 starts weeks on Sunday
  locale: 'vi-VN',                      // month and day names
  colorScale: { min: -2, max: 2 },      // the theme's red and green, full at ±2
  valueFormat: (v) => v.toFixed(2) + '%',
  onDayClick: (day) => openSession(day.date),
})`}</code></pre>
<p>
  Weeks run left to right and weekdays top to bottom, one band a calendar year and ten years at most; when the chart is too short for all of them, the oldest give way. Days without a value are drawn empty, and the colour bar underneath shows the scale (<code>legend: false</code> hides it).
</p>

<h2>Correlation matrix</h2>
<pre><code>{`import { MatrixChart, correlationMatrix } from '@tradecanvas/chart'

// Daily returns, not prices: one array per stock, the same days in each.
const names = ['VCB', 'BID', 'CTG', 'TCB']
const values = correlationMatrix(returnsByStock)

new MatrixChart(el, {
  rows: names,                          // columns: [...] for a matrix that isn't square
  values,                               // values[row][column]
  triangle: 'lower',                    // half is enough for correlations
  colorScale: { min: -1, max: 1 },
  onCellClick: ({ row, column, value }) => compare(row, column),
})`}</code></pre>
<p>
  Cells stay square and print their value where it fits (two decimals unless <code>valueFormat</code>); column names that don't fit across their cells are turned. <code>correlationMatrix</code> pairs the days both series have and gives NaN for fewer than three, which leaves the cell empty. A matrix suits other tables of values too, such as volume by hour and weekday.
</p>
<p>
  A table of a few columns, such as a statement's lines by period, takes <code>cellWidth: 'fill'</code>: the columns share the width beside the row names and the rows keep their height, so the matrix uses the chart instead of sitting small in its middle. A number sets each column's width in pixels, no wider than the room.
</p>

<h2>Sector map</h2>
<pre><code>{`import { HeatmapChart } from '@tradecanvas/chart'

new HeatmapChart(el, {
  data: [
    { id: 'vcb', label: 'VCB', value: 0.8, weight: 480, group: 'Banks' },
    { id: 'hpg', label: 'HPG', value: 1.9, weight: 160, group: 'Steel' },
    { id: 'vhm', label: 'VHM', value: -2.4, weight: 170, group: 'Real estate' },
  ],
  grouped: true,                        // tiles by group, then by stock
  valueFormat: (v) => v.toFixed(1) + '%',
})`}</code></pre>
<p>
  Each group takes the room of its stocks' weights, and its name and weighted change head its tile where they fit. The heatmap's colours run from -5 to 5 unless <code>colorScale</code> gives a <code>min</code> and <code>max</code>.
</p>

<h2>Counter-clock chart</h2>
<pre><code>{`import { CounterClockChart } from '@tradecanvas/chart'

const clock = new CounterClockChart(el, {
  data: bars,                           // OHLCV bars, oldest first
  period: 25,                           // bars in each average
  points: 120,                          // the newest points drawn
  xLabel: 'Volume, average', yLabel: 'Price, average',
  onPointClick: (p) => goTo(p.time),
})

clock.getPhase()                        // 1–8: the direction of the last move`}</code></pre>
<p>
  Each point is the 25-bar average of volume (across) and of the close (up), joined in time order and fading with age. A healthy cycle turns counter-clockwise. <code>getPhase()</code> (and <code>counterClockPhase(points)</code>) name the last move: 1 volume rising, 2 both rising, 3 price rising, 4 price rising on falling volume, 5 volume falling, 6 both falling, 7 price falling, 8 price falling on rising volume.
</p>

<h2>Sparkline, gauge, heatmap, waterfall, depth and equity curve</h2>
<pre><code>{`import { SparklineChart, GaugeChart, HeatmapChart, WaterfallChart, DepthChart, EquityCurveChart } from '@tradecanvas/chart'

new SparklineChart(el, { data: closes, mode: 'area', showLastPoint: true })

const gauge = new GaugeChart(el, {
  value: 72, min: 0, max: 100, label: 'Fear & Greed',
  zones: [{ from: 0, to: 45, color: '#e8505b' }, { from: 45, to: 55, color: '#8a93a3' }, { from: 55, to: 100, color: '#1fa874' }],
})
gauge.setValue(64)

// A treemap sized by market value, coloured by the day's change.
new HeatmapChart(el, {
  data: [{ id: 'vcb', label: 'VCB', value: 1.2, weight: 480 }, { id: 'fpt', label: 'FPT', value: -0.8, weight: 170 }],
  weighted: true, showLabels: true, showValues: true,
  onCellClick: (cell) => openSymbol(cell.label),
})

new WaterfallChart(el, { data: [{ label: 'Start', value: 10000, type: 'total' }, { label: 'Fees', value: -85 }, { label: 'End', value: 9915, type: 'total' }] })
new DepthChart(el, { data: { bids, asks }, midPriceLine: true, spreadLabel: true })
new EquityCurveChart(el, { data: equity, benchmark, drawdown: true })`}</code></pre>
<p>
  An equity curve also takes <strong>levels</strong>, lines across the plot at fixed values with each value in a
  tag at the axis, and <strong>bands</strong>, tinted stretches of values under the curve. A level has a
  <code>label</code> written at its right end (<code>labelAt: 'start'</code> for its left, away from the curve's
  latest point), a <code>color</code> and a <code>dash</code> (<code>[]</code> for a solid line); a band has a <code>label</code> in its corner and a <code>color</code> used as given, so give one with
  transparency. Both take the theme's colours when none is given. A level's value is written in full, or by
  <code>valueFormat</code> when given. Tags of levels too close for both move apart (when there is no room for
  them all, the lowest levels' are left out), and the names in the plot keep clear of each other. The value scale widens to show them all; <code>fitLevels: false</code> keeps it
  to the curve, leaving out a level outside it and drawing a band only where it overlaps it.
  <code>setOptions</code> changes them on the chart as it is.
</p>
<pre><code>{`const chart = new EquityCurveChart(el, {
  data: closes,
  levels: [{ value: 41_250, label: 'BOS', color: '#e0a030' }, { value: 38_900, label: 'Equilibrium' }],
  bands: [
    { from: 38_900, to: 44_100, label: 'Premium', color: 'rgba(232, 80, 91, 0.10)' },
    { from: 33_700, to: 38_900, label: 'Discount', color: 'rgba(31, 168, 116, 0.10)' },
  ],
})
chart.setOptions({ levels: [{ value: 42_000, label: 'CHoCH' }] })`}</code></pre>

<h2>Option payoff</h2>
<p>
  <code>PayoffChart</code> draws what an options position makes or loses at expiry, over the underlying's price:
  the profit tinted above zero and the loss below it, a dashed line at each breakeven and at <code>spot</code>,
  the price now. A leg is a <code>'call'</code> or a <code>'put'</code>, bought (<code>'long'</code>) or sold
  (<code>'short'</code>), with its <code>strike</code> and the <code>premium</code> of one unit; an
  <code>'underlying'</code> leg is the underlying held beside them, at its <code>entry</code>.
  <code>multiplier</code> is the units a contract is for. The prices drawn are around the strikes, or the
  <code>range</code> given. The pointer reads the profit or loss at its price.
</p>
<pre><code>{`import { PayoffChart, payoffStats, optionPayoff } from '@tradecanvas/chart'

const condor = [
  { type: 'put', side: 'long', strike: 90, premium: 1 },
  { type: 'put', side: 'short', strike: 95, premium: 2.5 },
  { type: 'call', side: 'short', strike: 105, premium: 2.5 },
  { type: 'call', side: 'long', strike: 110, premium: 1 },
]
const chart = new PayoffChart(el, { legs: condor, multiplier: 100, spot: 101.4, spotLabel: 'Spot' })
chart.update(otherLegs)

payoffStats(condor, 100)    // { maxProfit: 300, maxLoss: -200, breakevens: [92, 108] }
optionPayoff(condor, 100, 100)   // 300: what the legs make with the underlying at 100`}</code></pre>
<p>
  <code>payoffStats</code> gives the most the legs make and the most they lose at expiry
  (<code>null</code> where there is no limit: a call bought, a call sold alone) and the prices where they break
  even. They are sums at expiry: no option is priced before it, so there is no curve for today.
</p>

<h2>Curves: a volatility smile, a term structure</h2>
<p>
  <code>CurveChart</code> draws values against a strike, a tenor or a maturity, a line for each series. The
  lines are rounded through their points without passing a value they do not reach
  (<code>smooth: false</code> joins them straight), a series with <code>dashed</code> is yesterday's beside
  today's, and <code>markers</code> are labelled lines at an x. With <code>ticks</code> the x axis is
  named by you, a tenor at each number of days. The pointer snaps to the nearest x that has a quote and reads
  every curve there; <code>curveValueAt(points, x)</code> is the same reading in code.
</p>
<pre><code>{`import { CurveChart } from '@tradecanvas/chart'

// A smile: implied volatility against the strike, a line an expiry.
new CurveChart(el, {
  series: [
    { name: '1M', points: [{ x: 90, y: 31 }, { x: 100, y: 24 }, { x: 110, y: 27 }] },
    { name: '3M', points: [{ x: 90, y: 28 }, { x: 100, y: 25 }, { x: 110, y: 26 }] },
  ],
  markers: [{ x: 101.4, label: 'ATM' }],
  valueFormat: (v) => v.toFixed(1) + '%',
})

// A term structure: tenors along x, in days.
new CurveChart(el, {
  series: [
    { name: 'Today', points: [{ x: 30, y: 26 }, { x: 90, y: 25 }, { x: 365, y: 27 }] },
    { name: 'A week ago', points: [{ x: 30, y: 24 }, { x: 90, y: 25 }, { x: 365, y: 26 }], dashed: true },
  ],
  ticks: [{ x: 30, label: '1M' }, { x: 90, label: '3M' }, { x: 365, label: '1Y' }],
})`}</code></pre>

<h2>Box plot</h2>
<p>
  <code>BoxPlotChart</code> shows how each group's values spread: a box from the first quartile to the third
  with a line at the median, whiskers to the furthest values within <code>whiskers</code> box heights of the
  box (1.5 when left out; <code>Infinity</code> for the lowest and the highest), and a ring for each value
  further out. A group gives its raw <code>values</code>, or its numbers in <code>stats</code> when they were
  worked out elsewhere. <code>boxPlotStats(values)</code> is the same working out in code, and
  <code>labels</code> puts the readout's words in another language.
</p>
<pre><code>{`import { BoxPlotChart, boxPlotStats } from '@tradecanvas/chart'

new BoxPlotChart(el, {
  data: [{ label: 'Mon', values: mondayReturns }, { label: 'Tue', values: tuesdayReturns }],
  colorBySign: true,                     // by each box's median
  valueFormat: (v) => v.toFixed(1) + '%',
})

boxPlotStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 100])
// { min: 1, q1: 3.25, median: 5.5, q3: 7.75, max: 9, outliers: [100] }`}</code></pre>

<h2>Radar</h2>
<p>
  <code>RadarChart</code> puts several measures on spokes around a centre, clockwise from twelve o'clock, and
  joins each series' values into a shape. A spoke runs from its <code>min</code> (0 when left out) at the
  centre to its <code>max</code> at the rim, the highest value on it when none is given: give each spoke its
  own when the measures differ in size. It needs three spokes. The pointer reads every series on the nearest
  spoke.
</p>
<pre><code>{`import { RadarChart } from '@tradecanvas/chart'

new RadarChart(el, {
  axes: [{ label: 'Sharpe', max: 3 }, { label: 'Sortino', max: 3 }, { label: 'Calmar', max: 3 }, { label: 'Win rate', max: 100 }],
  series: [{ name: 'Strategy', values: [1.8, 2.4, 1.5, 58] }, { name: 'Benchmark', values: [1.0, 1.3, 0.7, 51] }],
})`}</code></pre>

<h2>Sunburst</h2>
<p>
  <code>SunburstChart</code> draws parts of a whole and the parts inside them, a ring a level. A part with
  <code>children</code> is as large as they are together; one without takes its <code>value</code>. The first
  ring takes the palette's colours and each ring outside it its parent's, paler. Four rings are drawn at most
  (<code>maxDepth</code> for fewer or more), <code>innerRadius: 0</code> closes the hole, and
  <code>centerLabel</code> and <code>centerValue</code> are written in it. A click gives the part and the
  labels down to it.
</p>
<pre><code>{`import { SunburstChart } from '@tradecanvas/chart'

new SunburstChart(el, {
  data: [
    { label: 'Stocks', children: [{ label: 'Banks', value: 22 }, { label: 'Technology', value: 14 }] },
    { label: 'Bonds', value: 23 },
    { label: 'Cash', value: 18 },
  ],
  centerLabel: 'Total', centerValue: '1.2B',
  onNodeClick: (node, path) => openHoldings(path),   // ['Stocks', 'Banks']
})`}</code></pre>

<h2>Stacked area</h2>
<p>
  <code>StackedAreaChart</code> stacks several series over the same points, the first at the bottom: what a
  total is made of over time. With <code>normalized</code> each point's values are shares of their total and
  the areas fill the height: how a mix changes. A value under zero counts as none. The pointer reads every
  series and their total at the nearest point.
</p>
<pre><code>{`import { StackedAreaChart } from '@tradecanvas/chart'

const chart = new StackedAreaChart(el, {
  categories: ['Jan', 'Feb', 'Mar', 'Apr'],
  series: [{ name: 'Stocks', values: [40, 44, 47, 52] }, { name: 'Bonds', values: [30, 29, 27, 25] }, { name: 'Cash', values: [30, 27, 26, 23] }],
  normalized: true,
})
chart.update(nextSeries, nextCategories)`}</code></pre>

<h2>Performance dashboard</h2>
<p>
  <code>PerformanceDashboard</code> puts a strategy report together from a backtest: a strip of
  headline stats, the equity curve, the drawdown under it and a calendar of monthly returns.
  Pair it with the <a href={href('/docs/analytics')}>analytics</a> backtester.
</p>
<pre><code>{`import { Backtester } from '@tradecanvas/analytics'
import { PerformanceDashboard } from '@tradecanvas/chart'

const result = new Backtester({ initialCash: 10_000 }).run(bars, myStrategy)

const dash = new PerformanceDashboard(document.getElementById('report')!, {
  result,            // any { equityCurve, metrics }: Backtester output fits
  theme: 'dark',
  title: 'SMA Crossover',
  subtitle: 'BTC/USDT · 1h · 2023',
})

// later: dash.update(newResult) · dash.setTheme('light') · dash.destroy()`}</code></pre>
<p>
  Metrics you build by hand take fractions, as <code>@tradecanvas/analytics</code> returns them: a
  <code>totalReturnPct</code> of <code>0.12</code> shows as +12.00%, and one given in percent
  (<code>12</code>) would show 100 times too large. <code>maxDrawdownPct</code> reads as a fall,
  whichever sign it is given with.
</p>
<p>
  The calculations are exported for a layout of your own: <code>computeMonthlyReturns</code>,
  <code>computeDrawdownCurve</code>, <code>toEquityPoints</code>, <code>selectKeyStats</code>, and
  for axes of your own <code>niceScale(min, max)</code> (ticks in steps of 1, 2, 2.5 or 5).
</p>
