<svelte:head>
  <title>Indicators — TradeCanvas docs</title>
  <meta name="description" content="33 built-in technical indicators: SMA, EMA, RSI, MACD, Bollinger Bands, Ichimoku, Anchored VWAP, and more." />
</svelte:head>

<h1>Indicators</h1>
<p>33 built-in indicators. Add by id; each registry entry validates its own params.</p>

<h2>Adding an indicator</h2>
<pre><code>{`const instanceId = chart.addIndicator('rsi', { period: 14 }, 'bottom')
chart.updateIndicator(instanceId, { period: 21 })
chart.removeIndicator(instanceId)`}</code></pre>

<h2>Overlay indicators</h2>
<p>Drawn on the main price pane.</p>
<table>
  <thead><tr><th>id</th><th>Name</th></tr></thead>
  <tbody>
    <tr><td><code>sma</code></td><td>Simple Moving Average</td></tr>
    <tr><td><code>ema</code></td><td>Exponential Moving Average</td></tr>
    <tr><td><code>wma</code></td><td>Weighted Moving Average</td></tr>
    <tr><td><code>hullMa</code></td><td>Hull Moving Average</td></tr>
    <tr><td><code>mtfma</code></td><td>MTF Moving Average (higher-timeframe MA, non-repainting)</td></tr>
    <tr><td><code>bollingerBands</code></td><td>Bollinger Bands</td></tr>
    <tr><td><code>keltnerChannels</code></td><td>Keltner Channels</td></tr>
    <tr><td><code>donchianChannels</code></td><td>Donchian Channels</td></tr>
    <tr><td><code>vwap</code></td><td>VWAP</td></tr>
    <tr><td><code>anchoredVwap</code></td><td>Anchored VWAP</td></tr>
    <tr><td><code>svwap</code></td><td>Session VWAP (resets each day; optional ±σ bands via <code>bands: 1–3</code>)</td></tr>
    <tr><td><code>parabolicSar</code></td><td>Parabolic SAR</td></tr>
    <tr><td><code>supertrend</code></td><td>Supertrend</td></tr>
    <tr><td><code>ichimoku</code></td><td>Ichimoku Kinko Hyo</td></tr>
    <tr><td><code>pivotPoints</code></td><td>Pivot Points (Classic)</td></tr>
    <tr><td><code>zigzag</code></td><td>ZigZag</td></tr>
    <tr><td><code>linearRegressionChannel</code></td><td>Linear Regression Channel</td></tr>
    <tr><td><code>chandelier</code></td><td>Chandelier Exit (ATR trailing-stop levels, long &amp; short)</td></tr>
  </tbody>
</table>

<p>
  <code>mtfma</code> plots a moving average from a higher timeframe on the
  current chart — e.g. the daily 50-MA while viewing 1h bars. It averages only
  <em>completed</em> higher-timeframe closes, so it steps at each boundary and
  never repaints. Configure <code>period</code> and <code>timeframe</code> from
  the indicator's gear dialog (or <code>addIndicator('mtfma', &#123; period: 50,
  timeframe: '1d' &#125;)</code>).
</p>

<h2>Panel indicators</h2>
<p>Rendered in their own pane beneath the chart.</p>
<table>
  <thead><tr><th>id</th><th>Name</th></tr></thead>
  <tbody>
    <tr><td><code>rsi</code></td><td>Relative Strength Index</td></tr>
    <tr><td><code>macd</code></td><td>MACD</td></tr>
    <tr><td><code>stochastic</code></td><td>Stochastic</td></tr>
    <tr><td><code>stochasticRsi</code></td><td>Stochastic RSI</td></tr>
    <tr><td><code>atr</code></td><td>Average True Range</td></tr>
    <tr><td><code>adx</code></td><td>Average Directional Index</td></tr>
    <tr><td><code>cci</code></td><td>Commodity Channel Index</td></tr>
    <tr><td><code>mfi</code></td><td>Money Flow Index</td></tr>
    <tr><td><code>williamsR</code></td><td>Williams %R</td></tr>
    <tr><td><code>obv</code></td><td>On-Balance Volume</td></tr>
    <tr><td><code>chaikinOscillator</code></td><td>Chaikin Oscillator (exposes cumulative ADL)</td></tr>
    <tr><td><code>voldelta</code></td><td>Volume Delta (directional volume; per-bar or cumulative)</td></tr>
    <tr><td><code>vortex</code></td><td>Vortex Indicator (VI+ / VI−; trend direction &amp; strength)</td></tr>
    <tr><td><code>chop</code></td><td>Choppiness Index (trend vs range, 0–100; &gt;61.8 choppy, &lt;38.2 trending)</td></tr>
    <tr><td><code>uo</code></td><td>Ultimate Oscillator (3-timeframe momentum, 0–100; 30/70 bands)</td></tr>
    <tr><td><code>fi</code></td><td>Force Index (price change × volume, EMA-smoothed; zero-centered)</td></tr>
    <tr><td><code>crsi</code></td><td>Connors RSI (composite RSI + streak-RSI + percent-rank, 0–100; 10/90 bands)</td></tr>
    <tr><td><code>coppock</code></td><td>Coppock Curve (long-term momentum; WMA of two ROCs; zero-centered)</td></tr>
    <tr><td><code>awesomeOscillator</code></td><td>Awesome Oscillator</td></tr>
    <tr><td><code>momentum</code></td><td>Momentum</td></tr>
    <tr><td><code>roc</code></td><td>Rate of Change</td></tr>
    <tr><td><code>volume</code></td><td>Volume bars</td></tr>
    <tr><td><code>volumeRoc</code></td><td>Volume Rate of Change</td></tr>
    <tr><td><code>standardDeviation</code></td><td>Standard Deviation</td></tr>
    <tr><td><code>trix</code></td><td>TRIX</td></tr>
  </tbody>
</table>

<p>
  <code>voldelta</code> (Volume Delta) approximates buy/sell pressure from
  OHLCV — bars closing up add positive volume, down bars negative. Set
  <code>mode: 0</code> for the per-bar delta histogram or <code>mode: 1</code>
  for cumulative delta. (A true tick delta needs per-trade bid/ask data, which
  an OHLCV series doesn't carry.)
</p>

<h2>Web Worker pipeline</h2>
<p>For heavy indicator workloads, offload calculation off the render loop:</p>
<pre><code>{`import { IndicatorWorkerHost } from '@tradecanvas/chart'

const host = new IndicatorWorkerHost()
await host.ping()
const result = await host.calculate('rsi', bars, { period: 14 })
host.terminate()`}</code></pre>

<p>Pass <code>null</code> as the worker to use the synchronous fallback (SSR, tests).</p>
