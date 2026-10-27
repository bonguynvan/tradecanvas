<svelte:head>
  <title>Chart types — TradeCanvas docs</title>
  <meta name="description" content="18 built-in chart types: candlestick, OHLC, High-Low, Heikin-Ashi, Renko, Kagi, Point & Figure, Equivolume, and more." />
</svelte:head>

<h1>Chart types</h1>
<p>18 built-in chart types. Switch at runtime via <code>chart.setChartType(type)</code>.</p>

<h2>Standard</h2>
<table>
  <thead><tr><th>Type</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>candlestick</code></td><td>Classic OHLC candles.</td></tr>
    <tr><td><code>bar</code></td><td>OHLC bars (Western style).</td></tr>
    <tr><td><code>line</code></td><td>Close-line chart.</td></tr>
    <tr><td><code>area</code></td><td>Filled area under the close line.</td></tr>
    <tr><td><code>baseline</code></td><td>Above / below a baseline price, two-color fill.</td></tr>
    <tr><td><code>stepLine</code></td><td>Staircase line — emphasizes discrete bar closes.</td></tr>
    <tr><td><code>lineWithMarkers</code></td><td>Line plus a dot at each data point.</td></tr>
    <tr><td><code>hollowCandle</code></td><td>Hollow body when close &gt; previous close.</td></tr>
    <tr><td><code>hlcArea</code></td><td>High-low band with a close line.</td></tr>
    <tr><td><code>hiLo</code></td><td>A bar from each low to its high, coloured by direction; wide bars carry their high and low.</td></tr>
  </tbody>
</table>

<h2>Derived</h2>
<table>
  <thead><tr><th>Type</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>heikinAshi</code></td><td>Smoothed candle series via Heikin-Ashi transform.</td></tr>
    <tr><td><code>renko</code></td><td>Fixed price-brick chart; time-independent.</td></tr>
    <tr><td><code>kagi</code></td><td>Yang/yin reversal lines; the reversal is a percent (4) or an amount of price.</td></tr>
    <tr><td><code>lineBreak</code></td><td>A new line once the close breaks the last lines (3 by default).</td></tr>
    <tr><td><code>pointAndFigure</code></td><td>X/O columns; box size + reversal count.</td></tr>
    <tr><td><code>rangeBars</code></td><td>Each bar's high-low equals a fixed range, and it closes at its high or its low; the last bar is the one still forming.</td></tr>
  </tbody>
</table>

<h2>Volume-weighted</h2>
<table>
  <thead><tr><th>Type</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>volumeCandles</code></td><td>Candle width proportional to volume.</td></tr>
    <tr><td><code>equivolume</code></td><td>
      Full-range boxes with width proportional to volume share; color tracks close vs prior close (Richard Arms style).
    </td></tr>
  </tbody>
</table>

<h2>Switching at runtime</h2>
<pre><code>{`chart.setChartType('equivolume')`}</code></pre>

<p>
  Transforms (Heikin-Ashi, Renko, Kagi, Line Break, P&amp;F, Range Bars) are handled
  internally — <code>chart.getData()</code> still returns the raw input series.
</p>

<h2>Settings of the built bar types</h2>
<p>
  Renko's box, the lines a Line Break has to break, Kagi's reversal, Point &amp; Figure's
  box and reversal, and the range of range bars. What isn't set is worked out from the
  data (an ATR box for Renko, 1% of the average close for a P&amp;F box…). The settings
  are kept in a saved state; in ChartWidget they are in the settings dialog for the
  chart's type.
</p>
<p>
  The automatic range of range bars is the mean true range of the last 100 closed bars,
  rounded to a 1, 2 or 5 (… 1, 2, 5, 10, 20 …) and to a whole number of the symbol's
  price step (on a market whose step depends on the price, the largest step those bars
  traded at): small bars on a one-second chart, larger ones on a daily chart. The bar
  still forming is left out of it, so a tick changes only the range bars built from that
  bar; the ones before it stay as they are. When a bar closes and moves the mean to the
  next 1-2-5 number, or those bars to another price step, every bar is built again on the
  new range. A bar closes at its low plus the range on the way up, or its high minus the
  range on the way down: its close is a price it reached, and its wick shows the way it
  went first. A jump of several ranges, a gap between bars too, makes a bar for each range;
  the bars that fill a gap stand at prices the gap skipped, which never traded. A range, set
  or automatic, is raised to 2, 5, 10, 20… times itself, the first that makes no more, when
  the closed bars would make more than 100,000 range bars, or the bar still forming more than
  100,000 on its own; every bar is then built again on the raised range. A range under half the
  15th significant digit of the largest price closes no bar, however the prices are written.
</p>
<p>
  Renko's box, Kagi's reversal and a Point &amp; Figure box keep to the same limit: one so small
  for the prices that the bars before the last would make more than 100,000 bricks, lines or
  columns, or the last bar that many on its own, is raised to 2, 5, 10, 20… times itself, the
  first that makes no more, and the chart is built on it. Kagi and Point &amp; Figure make one
  line or column a bar at most, so only a series of more than 100,000 bars can reach the limit;
  Line Break, whose setting is a count of lines, makes one line a bar at most too. A box, reversal
  or range that is no finite number above 0, in a saved state or a shared link, is dropped (the
  chart goes back to its default: worked out from the data, or Kagi's 4%), so a link can't stall
  the chart. The settings dialog takes none under 0.00000001 and says so under the field. On a live chart a raised size
  stays from tick to tick, so a tick builds the bars once, and is worked out again for a new
  series; <code>toRenko</code>, <code>toKagi</code>, <code>toPointAndFigure</code> and
  <code>toRangeBars</code> do the same when given a <code>ReshapeMemo</code> as their last argument.
  Keep one memo for each series, pass it on every run, and call <code>memo.clear()</code> (or make a
  new one) when the series is replaced, for a new symbol or timeframe: a memo can't tell a new series
  by itself, and would draw it at the last one's raised size.
</p>
<pre><code>{`chart.setChartTypeOptions({
  renko: { boxSize: 50 },                         // or 'atr' with atrPeriod
  lineBreak: { lines: 2 },
  kagi: { reversal: 25, reversalType: 'price' },  // or a percent
  pointAndFigure: { boxSize: 10, reversal: 3 },
  rangeBars: { range: 20 },
})
chart.getChartTypeOptions()
new Chart(host, { chartTypeOptions: { renko: { boxSize: 50 } } })`}</code></pre>

<h2>The main series, and lines on the price pane</h2>
<p>
  Hide the main series to look at the indicators or compared symbols alone; mark the
  highest high and lowest low on screen; mark the bid and ask. A feed whose ticks carry
  <code>bid</code> and <code>ask</code> keeps those up to date by itself.
</p>
<pre><code>{`chart.setMainSeriesVisible(false)
chart.setHighLowLines(true)          // or new Chart(host, { highLowLines: true })
chart.setBidAsk({ bid: 64210.5, ask: 64211 })
chart.setBidAsk(null)`}</code></pre>
