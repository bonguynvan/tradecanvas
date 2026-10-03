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
    <tr><td><code>rangeBars</code></td><td>Each bar's high-low equals a fixed range.</td></tr>
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
