<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Moving from TradingView — TradeCanvas docs</title>
  <meta name="description" content="Move an app from TradingView's charting library (Advanced Charts, Trading Platform) or Lightweight Charts to TradeCanvas: keep the datafeed with feedFromJsApi or udfFeed, let a coding agent map the names and options through the MCP server, and know what does not carry over." />
</svelte:head>

<h1>Moving from TradingView</h1>
<p>
  An app built on TradingView's charting library (Advanced Charts or Trading Platform) or on Lightweight Charts
  moves to TradeCanvas without its backend changing. The datafeed stays as it is, behind a bridge. The names
  that do change, options, featuresets, overrides, studies, drawings and methods, are in tables the
  <a href={href('/docs/getting-started#ai')}>MCP server</a> answers from, so a coding agent looks each one up
  instead of guessing. This page says what carries over, what changes and what does not carry over.
</p>

<h2 id="datafeed">Keep the datafeed</h2>
<p>
  <code>feedFromJsApi</code> turns a datafeed written for the JS API (<code>onReady</code>,
  <code>resolveSymbol</code>, <code>getBars</code>, <code>subscribeBars</code>, and <code>searchSymbols</code>,
  <code>getQuotes</code>, <code>subscribeQuotes</code> when it has them) into a <code>DataFeed</code>:
</p>
<pre><code>{`import { feedFromJsApi } from '@tradecanvas/chart'
import { ChartWidget } from '@tradecanvas/chart/widget'

const feed = feedFromJsApi(datafeed)   // the app's datafeed, unchanged
await feed.ready()                      // onReady has answered: the timeframes it serves are known

const widget = new ChartWidget(document.getElementById('chart'), { feed, symbol: 'AAPL', timeframe: '1d' })`}</code></pre>
<p>What the bridge does for the datafeed:</p>
<ul>
  <li>resolves each symbol once and hands its symbol info back to <code>getBars</code> and <code>subscribeBars</code>;</li>
  <li>
    turns the chart's timeframes into resolutions (<code>'1h'</code> → <code>'60'</code>, <code>'1d'</code> →
    <code>'1D'</code>), and its <code>countBack</code> and <code>before</code> into <code>from</code>, <code>to</code>
    and <code>countBack</code> in seconds;
  </li>
  <li>asks once more from <code>nextTime</code> when a range had no bars;</li>
  <li>
    unsubscribes with the guid it subscribed with, and loads the series again when the datafeed calls
    <code>onResetCacheNeeded</code>;
  </li>
  <li>
    reads the symbol's <code>pricescale</code> and <code>minmov</code> as its price step, its <code>session</code> as
    its trading hours, and the timeframes it serves from <code>supported_resolutions</code>.
  </li>
</ul>
<p>
  The chart reads the timeframes a feed serves when it connects, and builds the others from them (a 7-minute chart
  from 1-minute bars). <code>onReady</code> answers later, so await <code>feed.ready()</code> before making the
  widget, or give them yourself: <code>feedFromJsApi(datafeed, {'{'} supportedTimeframes: ['1m', '1h', '1d'] {'}'})</code>.
</p>

<h3 id="udf">A UDF server</h3>
<p>A server that speaks UDF needs no datafeed code at all:</p>
<pre><code>{`import { udfFeed } from '@tradecanvas/chart'

const feed = udfFeed({ url: 'https://data.example.com/udf', updateFrequency: 10_000 })
await feed.ready()   // the timeframes of its /config

new ChartWidget(el, { feed, symbol: 'AAPL', timeframe: '1d' })`}</code></pre>
<p>
  It reads <code>/config</code>, <code>/symbols</code>, <code>/search</code>, <code>/history</code> and
  <code>/quotes</code>. UDF has no push, so live bars and quotes are asked for again every
  <code>updateFrequency</code> ms (10 s by default). <code>headers</code> are sent with every request.
</p>

<h2 id="mcp">Let an agent map the rest</h2>
<p>The MCP server has three tools for a move:</p>
<table>
  <thead><tr><th>Tool</th><th>What it does</th></tr></thead>
  <tbody>
    <tr>
      <td><code>migration_plan</code></td>
      <td>The steps in order, what to search the app's code for, and which tool maps what each search finds.</td>
    </tr>
    <tr>
      <td><code>migration_lookup</code></td>
      <td>
        What one name becomes: a widget option, featureset, override key, study, drawing shape, widget or chart
        method, datafeed or broker member, or a resolution. It gives the option, feature switch, style key,
        indicator id (with its defaults and line keys), drawing type (with its points) or call, and says plainly
        when there is nothing like it and what to do instead.
      </td>
    </tr>
    <tr>
      <td><code>convert_widget_options</code></td>
      <td>
        The whole options object of <code>new TradingView.widget({'{'}...{'}'})</code>, featuresets and overrides
        included, as <code>ChartWidget</code> options; or Lightweight Charts' <code>createChart</code> options as
        <code>Chart</code> options. It also lists the calls to make once the chart exists and what has no place, and
        checks the result as <code>validate_options</code> does.
      </td>
    </tr>
  </tbody>
</table>
<p>
  With the server connected, ask the agent for the move: it calls <code>migration_plan</code> first and works
  through the app from there. The agent skill has the same steps for an agent without the server.
</p>

<h2 id="differs">What changes</h2>
<table>
  <thead><tr><th>TradingView</th><th>TradeCanvas</th></tr></thead>
  <tbody>
    <tr><td><code>new TradingView.widget({'{'} container: 'id' {'}'})</code>, <code>library_path</code></td><td><code>new ChartWidget(element, options)</code>; nothing to host</td></tr>
    <tr><td><code>onChartReady(cb)</code></td><td>The <code>onReady</code> option, or code after the constructor</td></tr>
    <tr><td><code>widget.activeChart().createStudy(...)</code></td><td><code>widget.getChart().addIndicator(id, params)</code>; ids are short: <code>'rsi'</code>, <code>'bb'</code></td></tr>
    <tr><td><code>createShape({'{'} time, price {'}'}, {'{'} shape {'}'})</code>, time in seconds</td><td><code>addDrawing({'{'} type, anchors: [{'{'} time, price {'}'}] {'}'})</code>, time in milliseconds</td></tr>
    <tr><td>A resolution: <code>'60'</code>, <code>'1D'</code>, <code>'W'</code></td><td>A timeframe: <code>'1h'</code>, <code>'1d'</code>, <code>'1w'</code> (<code>resolutionToTimeframe</code>, <code>timeframeToResolution</code>)</td></tr>
    <tr><td><code>disabled_features</code>, <code>enabled_features</code></td><td><code>features</code>: every switch is on unless set <code>false</code></td></tr>
    <tr><td><code>overrides</code>, <code>applyOverrides</code></td><td>Style keys, in <code>chartOptions.overrides</code> or <code>chart.applyOverrides()</code>; line styles by name</td></tr>
    <tr><td><code>save_load_adapter</code></td><td><code>layouts: {'{'} storage {'}'}</code> with a <code>LayoutStorage</code> (<code>list</code>, <code>load</code>, <code>save</code>, <code>remove</code>)</td></tr>
    <tr><td>Broker API, order and position lines</td><td>An <code>ExecutionAdapter</code>, <code>setOrders</code>, <code>setPositions</code> and the order events (<a href={href('/docs/trading')}>Trading</a>)</td></tr>
    <tr><td>Lightweight Charts: bars and markers in seconds</td><td>Milliseconds: <code>time * 1000</code></td></tr>
  </tbody>
</table>

<h2 id="not-carried">What does not carry over</h2>
<ul>
  <li>
    <strong>Saved charts.</strong> Layouts, drawings and studies saved in TradingView's format do not load: users
    start new layouts.
  </li>
  <li>
    <strong>Custom indicators</strong> written for <code>custom_indicators_getter</code> are rewritten as an
    <a href={href('/docs/plugins')}>indicator plugin</a>, unless one of the 138 built-in ones does the same.
  </li>
  <li>
    <strong>Some drawing tools and featuresets</strong> have no equivalent. <code>migration_lookup</code> says which,
    and names the closest tool.
  </li>
  <li>
    <strong>Trading across symbols.</strong> An <code>ExecutionAdapter</code>'s orders and positions are those of the
    chart's symbol; an account manager over many symbols and accounts is the app's own.
  </li>
</ul>
<p>
  The tables are written from TradingView's public documentation, read in November 2026, and are checked against
  TradeCanvas's own names on every build. A name that is missing or wrong is a bug: report it on GitHub.
</p>
