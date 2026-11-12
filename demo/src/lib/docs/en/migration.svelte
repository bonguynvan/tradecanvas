<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Moving to 2.0 — TradeCanvas docs</title>
  <meta name="description" content="What changes for your code between TradeCanvas 1.x and 2.0: installing it, the default look and the one option that keeps the look of 1.x, the names that were removed and what to use instead, and the behaviour that changed." />
</svelte:head>

<h1>Moving to 2.0</h1>
<p>
  2.0 changes how the chart and the widget look by default, removes the names 1.x had deprecated, and changes
  four behaviours. Data, saved layouts, indicators, drawings, trading and themes carry over as they are. This page
  lists each change and what to do about it.
</p>

<h2 id="install">Install</h2>
<p>
  2.0 is the current release: every package is <code>2.0.0</code> under npm's <code>latest</code> tag. 1.x stays where it was, as <code>@tradecanvas/chart@1</code>, for a page that is not ready to move.
</p>
<pre><code>{`npm install @tradecanvas/chart

# with a framework component, its package too
npm install @tradecanvas/react
npm install @tradecanvas/vue
npm install @tradecanvas/svelte`}</code></pre>

<h2 id="look">The default look</h2>
<p>
  The chart and the widget open with more room around what they draw. One option keeps the look of 1.x:
</p>
<pre><code>{`// The widget as it was in 1.x
new ChartWidget(host, { ui: { density: 'classic' } })
widget.setUI({ density: 'classic' })

// A chart of your own as it was in 1.x
new Chart(host, { density: 'compact' })`}</code></pre>
<p>
  <code>ui: {'{'} density: 'compact' {'}'}</code> (smaller controls) is unchanged.
</p>
<p>What is different by default:</p>
<table>
  <thead><tr><th>What</th><th>1.x</th><th>2.0</th></tr></thead>
  <tbody>
    <tr><td>Room past the newest bar</td><td>5 slots</td><td>8 slots</td></tr>
    <tr><td>Free above and below the prices</td><td>9% of the height</td><td>11.5% of the height</td></tr>
    <tr><td>The bars of a bare <code>Chart</code></td><td>Classic</td><td>Golden, the body 62% of its slot, as the widget already drew them</td></tr>
    <tr><td>The legend, from the plot's corner</td><td>8 px in</td><td>12 px in</td></tr>
    <tr><td>The figures of a bare <code>Chart</code> (axes, tags, legend)</td><td>A monospaced face</td><td>The system's sans face, as the widget and the finance charts draw them; <code>font: {'{'} family: MONO_FONT_FAMILY {'}'}</code> keeps the old one</td></tr>
    <tr><td>The widget's spacing, <code>--tcw-space-1</code> … <code>-7</code></td><td>2 · 3 · 5 · 8 · 13 · 21 · 34 px</td><td>2 · 4 · 6 · 8 · 12 · 20 · 32 px</td></tr>
    <tr><td>Print's button</td><td>33 px</td><td>34 px</td></tr>
    <tr><td>Padding beside a button's label</td><td>8 px</td><td>12 px</td></tr>
  </tbody>
</table>
<p>
  Every size and gap in the widget is now an even number of pixels, and hairlines are one device pixel wide at a
  screen scale of 125% and 150%.
</p>
<p>Check these in your own code:</p>
<ul>
  <li>CSS that overrides <code>--tcw-space-*</code>, or that assumes a 33 px control.</li>
  <li>Code that passes <code>rightMargin</code>. It still wins when set.</li>
  <li>
    The React, Vue and Svelte components no longer set <code>rightMargin: 5</code> themselves. To keep it, pass
    <code>density: 'compact'</code> or <code>rightMargin: 5</code> in <code>options</code>.
  </li>
  <li>
    Code that reads <code>PRICE_SCALE_MARGIN</code> from <code>@tradecanvas/core</code> or
    <code>DEFAULT_CHART_OPTIONS.rightMargin</code>: both changed value.
  </li>
</ul>
<pre><code>{`// React; the Vue and Svelte components take the same options
<TradeCanvas options={{ density: 'compact' }} />
<TradeCanvas options={{ rightMargin: 5 }} />`}</code></pre>
<p>
  What each density sets, in full: <a href={href('/docs/styling#density')}>Styling → Density</a>.
</p>

<h2 id="removed">Names removed</h2>
<p>Each of these was deprecated in 1.x and is gone in 2.0.</p>
<table>
  <thead><tr><th>Removed</th><th>Use instead</th></tr></thead>
  <tbody>
    <tr><td><code>chart.setTimezone(tz)</code></td><td><code>chart.setTimeZone(tz)</code></td></tr>
    <tr><td><code>chart.getTimezone()</code></td><td><code>chart.getTimeZone()</code></td></tr>
    <tr><td><code>chart.getEffectiveTimezone()</code></td><td><code>chart.getEffectiveTimeZone()</code></td></tr>
    <tr><td><code>chart.getExchangeTimezone()</code></td><td><code>chart.getExchangeTimeZone()</code></td></tr>
    <tr><td><code>chart.setTimezoneOffset(minutes)</code></td><td><code>chart.setTimeZone(minutes)</code>: minutes east of UTC, or <code>null</code> for the browser's zone</td></tr>
    <tr><td><code>EXCHANGE_TIMEZONE</code></td><td><code>EXCHANGE_TIME_ZONE</code></td></tr>
    <tr><td><code>DEFAULT_FONT_FAMILY</code></td><td><code>MONO_FONT_FAMILY</code>: the monospaced face, which is no longer the default one</td></tr>
    <tr><td><code>SymbolInfo.timezone</code></td><td><code>SymbolInfo.timeZone</code></td></tr>
    <tr><td><code>TimeFormatContext.kind === 'date'</code> in a <code>timeFormatter</code></td><td>The axis gives <code>'year'</code>, <code>'month'</code> or <code>'day'</code>. It has not given <code>'date'</code> since 1.x, and the type no longer has it.</td></tr>
    <tr><td><code>SessionBreaks.setLocale()</code> and <code>SessionBreaks.renderLabels()</code> (<code>@tradecanvas/core</code>)</td><td>Remove the calls: both did nothing.</td></tr>
    <tr><td>The widget string key <code>replay.barsPerSecond</code></td><td>Remove it from a <code>messages</code> override: it was unused. The replay's speed text is <code>replay.rate</code>.</td></tr>
  </tbody>
</table>

<h3 id="symbol-time-zone">A symbol's <code>timezone</code> is no longer read</h3>
<p>
  The old field is not read at all. A symbol that gives only <code>timezone</code>, whether it comes from your
  <code>symbols</code>, <code>resolveSymbol</code>, a feed or an adapter, now has no zone of its own:
</p>
<ul>
  <li><code>setTimeZone('exchange')</code> and the dates of daily bars fall back to the market's zone, or to UTC;</li>
  <li>its own <code>sessions</code> are not shaded (the market's hours are, when a market is set);</li>
  <li>its status reads as a market that trades around the clock, and the symbol's panel shows no time zone.</li>
</ul>
<p>
  A <code>timezone</code> you still pass is carried along untouched in <code>getSymbolInfo()</code>, and nothing reads it.
</p>
<pre><code>{`// 1.x
chart.setSymbolInfo({ symbol: 'AAPL', timezone: 'America/New_York' })

// 2.0
chart.setSymbolInfo({ symbol: 'AAPL', timeZone: 'America/New_York' })`}</code></pre>

<h3 id="kept">Names that did not change</h3>
<p>
  The names are close, so take care with a search and replace. The widget's setting is still spelled
  <code>timezone</code>:
</p>
<pre><code>{`widget.setSettings({ timezone: 'exchange' })
widget.getSettings().timezone       // 'exchange'`}</code></pre>
<p>
  The widget string keys <code>settings.timezone</code> and <code>menu.chart.timezone</code> keep their names too.
</p>

<h3 id="find">Finding them</h3>
<p>
  Search your code for <code>Timezone(</code> and <code>EXCHANGE_TIMEZONE</code>, and for <code>timezone:</code>
  inside symbol objects. TypeScript reports each removed name.
</p>

<h2 id="behaviour">Behaviour that changed</h2>
<p>These changed with no name changing.</p>
<ul>
  <li>
    <strong>Price-axis labels at a pane's edge.</strong> A label that the top or bottom edge of its pane would cut
    is left out. Its grid line stays.
  </li>
  <li>
    <strong>The price pane among many panes.</strong> However many indicator panes are open, the price pane keeps
    at least 38.2% of the chart's height, and the open panes share the rest in proportion to their sizes. A pane's
    size as set is kept, and shows again on a taller chart. Before, panes kept their heights and could leave the
    price pane none.
  </li>
  <li>
    <strong>Line widths between whole pixels.</strong> A line of such a width takes the whole device pixels below
    it: 1.5 px is one device pixel at 100%, where it was two.
  </li>
  <li>
    <strong><code>setBarLayout()</code> and <code>setDensity()</code>.</strong> A bar layout set with
    <code>chart.setBarLayout()</code> while the chart runs is kept by a later <code>setDensity()</code>.
  </li>
</ul>

<h2 id="unchanged">Not changed</h2>
<ul>
  <li>
    Data: <code>DataAdapter</code>, <code>DataFeed</code>, <code>setData</code>, <code>appendBar</code> and
    <code>updateLastBar</code>.
  </li>
  <li>Saved layouts and settings from 1.x load as before.</li>
  <li>Indicators, drawings, trading, themes and style keys keep their names.</li>
</ul>
