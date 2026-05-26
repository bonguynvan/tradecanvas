<svelte:head>
  <title>Chart types — TradeCanvas docs</title>
  <meta name="description" content="17 built-in chart types: candlestick, OHLC, Heikin-Ashi, Renko, Kagi, Point & Figure, Equivolume, and more." />
</svelte:head>

<h1>Chart types</h1>
<p>17 built-in chart types. Switch at runtime via <code>chart.setChartType(type)</code>.</p>

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
  </tbody>
</table>

<h2>Derived</h2>
<table>
  <thead><tr><th>Type</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>heikinAshi</code></td><td>Smoothed candle series via Heikin-Ashi transform.</td></tr>
    <tr><td><code>renko</code></td><td>Fixed price-brick chart; time-independent.</td></tr>
    <tr><td><code>kagi</code></td><td>Yang/yin reversal lines on a percentage threshold.</td></tr>
    <tr><td><code>lineBreak</code></td><td>3-line break reversal pattern.</td></tr>
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
      <strong>New in 0.8.</strong> Full-range boxes with width proportional to volume share; color tracks close vs prior close (Richard Arms style).
    </td></tr>
  </tbody>
</table>

<h2>Switching at runtime</h2>
<pre><code>{`chart.setChartType('equivolume')`}</code></pre>

<p>
  Transforms (Heikin-Ashi, Renko, Kagi, Line Break, P&amp;F, Range Bars) are handled
  internally — <code>chart.getData()</code> still returns the raw input series.
</p>
