<script lang="ts">
  // Generated from the indicator registry by `pnpm docs:gen`: always the real ids.
  import catalog from '$lib/generated/indicators.json';

  type Entry = (typeof catalog)[number];
  const overlays = catalog.filter((i) => i.placement === 'overlay');
  const panes = catalog.filter((i) => i.placement === 'panel');
  const params = (i: Entry) =>
    Object.entries(i.params).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
  const lines = (i: Entry) => i.plots.map((p) => p.title).join(', ');
  const hasSource = (i: Entry) => 'inputs' in i && Object.values(i.inputs ?? {}).some((x) => (x as { source?: boolean }).source);
</script>

<svelte:head>
  <title>Indicators — TradeCanvas docs</title>
  <meta name="description" content="{catalog.length} built-in technical indicators: moving averages, bands, oscillators, volume and volatility, with sources, indicators on indicators and editable levels." />
</svelte:head>

<h1>Indicators</h1>
<p>
  {catalog.length} built-in indicators. Add one by its id; parameters you leave out take
  their defaults, and invalid ones fall back to them.
</p>

<h2>Adding an indicator</h2>
<pre><code>{`const ema = chart.addIndicator('ema', { period: 50 })          // on the price pane
const rsi = chart.addIndicator('rsi', { period: 14 }, 'bottom') // in a pane of its own
chart.updateIndicator(rsi, { period: 21 })
chart.removeIndicator(rsi)`}</code></pre>
<p>
  <code>addIndicator</code> returns an instance id: the same indicator can be added several
  times, each instance with its own inputs, colours and levels.
</p>

<h2>Sources and indicators on indicators</h2>
<p>
  Indicators marked <em>source</em> below can run on another price than the close
  (<code>open</code>, <code>high</code>, <code>low</code>, <code>hl2</code>, <code>hlc3</code>,
  <code>ohlc4</code>, <code>hlcc4</code>) or on another indicator's line. A moving average of RSI
  is drawn in RSI's pane, on its scale, and goes when RSI does.
</p>
<pre><code>{`import { indicatorSource } from '@tradecanvas/chart'

chart.updateIndicator(ema, { source: 'hlc3' })
const smoothed = chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') })`}</code></pre>
<p>
  Pane indicators can also share a pane:
  <code>chart.addIndicator('stochastic', &#123;&#125;, 'bottom', &#123; pane: rsi &#125;)</code>.
</p>

<h2>Levels, colours and values</h2>
<pre><code>{`chart.setIndicatorLevels(rsi, [20, 50, 80])   // null restores 30 / 70
chart.updateIndicatorStyle(rsi, { colors: ['#f2a93b'], lineWidths: [2] })
chart.setIndicatorVisible(rsi, false)

const series = chart.getIndicatorOutput(rsi)?.series ?? []
const latest = series[series.length - 1]?.value   // keyed by the line keys below`}</code></pre>
<p>
  Each line's latest value is tagged on its axis in the line's colour; turn the tags off with
  <code>features.indicatorValueLabels: false</code> or <code>setIndicatorValueLabelsVisible(false)</code>.
  A pane's lines, levels, axis and crosshair share one scale.
</p>

<h2>On the price pane ({overlays.length})</h2>
<table>
  <thead><tr><th>id</th><th>Name</th><th>Default params</th><th>Lines</th></tr></thead>
  <tbody>
    {#each overlays as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· source</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>mtfma</code> plots a moving average from a higher timeframe on the current chart — the
  daily 50-MA on 1h bars, say. It averages only <em>completed</em> higher-timeframe closes, so it
  steps at each boundary and never repaints.
</p>

<h2>In a pane of their own ({panes.length})</h2>
<table>
  <thead><tr><th>id</th><th>Name</th><th>Default params</th><th>Lines</th><th>Levels</th></tr></thead>
  <tbody>
    {#each panes as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· source</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
        <td>{'levels' in ind ? ind.levels?.join(', ') : '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>voldelta</code> (Volume Delta) approximates buy/sell pressure from OHLCV — bars closing up
  add positive volume, down bars negative. <code>mode: 0</code> is the per-bar histogram,
  <code>mode: 1</code> cumulative delta. (A true tick delta needs per-trade bid/ask data, which an
  OHLCV series doesn't carry.)
</p>

<h2>Your own indicator</h2>
<p>
  Extend <code>IndicatorBase</code> and declare what it draws (<code>plots</code>), its pane scale,
  levels and inputs; the chart draws it, scales its pane, tags its values and lists it in the
  widget's legend and settings without rendering code of yours. See the
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">custom indicator recipe</a>.
</p>

<h2>Panes: resize, fold, maximise, reorder</h2>
<p>
  <strong>Drag the divider</strong> above a pane to resize it. In ChartWidget each pane
  has buttons at its top right: move it up or down, fold it to its header, maximise it
  (the other panes fold and the price pane keeps a strip). Saved layouts keep each
  pane's size, order, fold and maximise. The same from code:
</p>
<pre><code>{`chart.setPanelSize(rsi, 180)        // px, clamped to a minimum
chart.setPaneCollapsed(macd, true)  // fold to its header
chart.setMaximizedPane(rsi)         // null puts the panes back
chart.movePane(rsi, -1)             // one place up; 1 = down
chart.on('paneChange', (e) => e.payload.change)  // 'collapsed' | 'maximized' | 'order' | 'scale'
chart.setPaneScale(atr, { log: true, invert: false })  // log while its values are above 0
chart.setPaneScale(atr, { percent: true })             // labels in percent of its first value on screen`}</code></pre>
<p>
  Right-click a pane in ChartWidget for its own logarithmic, inverted or percent scale.
</p>

<h2>Moving an indicator to another pane</h2>
<p>
  An indicator can join another indicator's pane (it then shares that pane's scale),
  take a pane of its own, or go back to the price pane. When it leaves a pane it owned,
  the others in it stay (the next pane indicator takes the pane over), and those reading
  its lines follow it. In ChartWidget, the <strong>⋯</strong> button on a legend row
  offers the pane above, the pane below, a new pane and the price pane.
</p>
<pre><code>{`chart.moveIndicatorToPane(cci, rsi)      // into RSI's pane
chart.moveIndicatorToPane(cci, 'new')    // a pane of its own
chart.moveIndicatorToPane(ema, 'price')  // an overlay back to the price pane
chart.canMoveIndicatorToPane(cci, rsi)   // whether it would move`}</code></pre>

<h2>Undo, and templates</h2>
<p>
  Adding, removing, editing and moving indicators are undo steps in the same history
  as drawings (<kbd>Ctrl/⌘ Z</kbd>, <kbd>Ctrl/⌘ Shift Z</kbd>); an undone indicator
  comes back under its own id, so alerts on its lines still match. A burst of edits to
  one indicator (a colour dragged, a period typed) is one step. A loaded layout starts a
  fresh history.
</p>
<p>
  The indicators can be taken and put back as a whole, which is what ChartWidget's
  indicator templates do: <strong>Save indicators as template…</strong> in the indicators
  menu keeps them (inputs, style, levels, panes) under a name, and picking a template
  puts them in place of the chart's, as one undo step.
</p>
<pre><code>{`const setup = chart.getIndicatorSetup()   // what a layout keeps of them
chart.applyIndicatorSetup(setup)          // in place of the chart's indicators

new ChartWidget(host, { indicatorTemplates: true })  // the default`}</code></pre>

<h2>Computing outside the chart</h2>
<p>
  <code>IndicatorWorkerHost</code> computes an indicator from bars with the same messages a Web Worker would
  use. The worker script is not part of the published packages yet, so pass <code>null</code> and register
  the plugins to compute in place (SSR, tests, scripts):
</p>
<pre><code>{`import { IndicatorWorkerHost, RSIIndicator } from '@tradecanvas/core'

const host = new IndicatorWorkerHost(null)
host.registerFallbackPlugin(new RSIIndicator())
const output = await host.calculate('rsi', { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } }, bars)`}</code></pre>
