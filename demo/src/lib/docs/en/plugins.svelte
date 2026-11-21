<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Plugins — TradeCanvas docs</title>
  <meta name="description" content="Extend TradeCanvas with custom indicators, drawing tools, chart types, and overlays via the plugin SDK." />
</svelte:head>

<h1>Plugins</h1>
<p>
  Extend the chart with custom <strong>indicators</strong>, <strong>drawing tools</strong>,
  <strong>chart types</strong>, and <strong>overlays</strong> — registered globally or per chart.
</p>

<h2>Registration</h2>
<p>Three ways to register, in precedence order: global defaults, the constructor, then imperative instance calls.</p>
<pre><code>{`import { Chart, registerPlugin } from '@tradecanvas/chart'

// 1) Global — every Chart created afterward inherits it
registerPlugin({ kind: 'indicator', plugin: new MyIndicator() })

// 2) Per-chart at construction
const chart = new Chart(el, { plugins: [{ kind: 'overlay', plugin: myHeatmap }] })

// 3) Imperative on an instance
chart.plugins.register({ kind: 'chartType', plugin: myCandles })
chart.plugins.unregister('chartType:my-candles')
chart.plugins.list()`}</code></pre>
<p>
  A <code>ChartWidget</code> takes them as <code>plugins</code> (typed, and with any <code>chartOptions.plugins</code>):
  they are registered with its chart before it restores anything, so a saved layout
  (<code>persistLayouts</code>), a template or a shared view that names one of your indicators gets it back.
  For the same id, the widget's <code>plugins</code> win over <code>chartOptions.plugins</code>, and a grid cell's own
  <code>plugins</code> replace the grid's shared ones. Registered on <code>widget.getChart()</code> after a layout was
  restored, an indicator comes too late: the layout has already left it out.
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT', adapter, persistLayouts: true,
  plugins: [{ kind: 'indicator', plugin: new DoubleSMA() }],
})`}</code></pre>

<h2>Plugin kinds</h2>
<table>
  <thead><tr><th>Kind</th><th>Contract</th><th>Renders</th></tr></thead>
  <tbody>
    <tr><td><code>indicator</code></td><td><code>IndicatorPlugin</code> — <code>calculate()</code> + <code>render(ctx, output, viewport, style, &#123; theme &#125;)</code></td><td>overlay or panel</td></tr>
    <tr><td><code>drawing</code></td><td><code>DrawingPlugin</code> — <code>render()</code> + <code>hitTest()</code></td><td>overlay layer</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartTypePlugin</code> — <code>createRenderer()</code> + optional <code>transform()</code></td><td>main series</td></tr>
    <tr><td><code>overlay</code></td><td><code>OverlayPlugin</code> — <code>render(ctx, &#123; viewport, data, theme &#125;)</code></td><td><code>main</code> / <code>overlay</code> / <code>ui</code></td></tr>
  </tbody>
</table>

<h2 id="define">Custom indicator, the short way</h2>
<p>
  <code>defineIndicator</code> makes an indicator from its inputs and one function of the bars: no class and no
  drawing code. <code>calculate</code> is handed the bars as columns (<code>bars.close[i]</code>), the inputs'
  values and <code>ta</code>, the sums indicators are made of, and returns its lines by key. The chart draws them,
  scales their pane, lists them in the legend, and gives each input a field in the settings dialog.
</p>
<pre><code>{`import { defineIndicator } from '@tradecanvas/chart'

const emaCross = defineIndicator({
  id: 'emaCross',
  name: 'EMA Crossover',
  placement: 'overlay',                       // on the prices; 'panel' (the default) is a pane of its own
  inputs: {
    fast: { default: 9, kind: 'int', min: 1 },
    slow: { default: 21, kind: 'int', min: 2 },
  },
  plots: [
    { key: 'fast', title: 'Fast', color: 0 },
    { key: 'slow', title: 'Slow', color: 1 },
    { key: 'buy', title: 'Buy', color: 2, kind: 'markers', shape: 'arrowUp', position: 'belowBar' },
    { key: 'sell', title: 'Sell', color: 3, kind: 'markers', shape: 'arrowDown', position: 'aboveBar' },
  ],
  calculate({ bars, inputs, ta }) {
    const fast = ta.ema(bars.close, inputs.fast)
    const slow = ta.ema(bars.close, inputs.slow)
    return { fast, slow, buy: ta.crossover(fast, slow), sell: ta.crossunder(fast, slow) }
  },
})

chart.registerIndicator(emaCross)
chart.addIndicator('emaCross', { fast: 12 })`}</code></pre>
<ul>
  <li>
    <strong>Inputs.</strong> Each has a <code>default</code>, whose type is the input's type, and what the
    settings dialog needs to show it: <code>kind</code>, <code>min</code>, <code>max</code>, <code>step</code>,
    <code>options</code> for a choice, <code>source: true</code> for a price source (the indicator then reads it
    as <code>bars.close</code>).
  </li>
  <li>
    <strong>Lines.</strong> A value a bar; <code>undefined</code>, <code>null</code> or <code>NaN</code> where
    there is none. <code>true</code> marks a bar, for a plot of <code>kind: 'markers'</code> above or below the
    bars. With no <code>plots</code>, every line returned is drawn as a line in the theme's series colours.
  </li>
  <li>
    <strong>How it looks.</strong> <code>plots</code> (a line, <code>'histogram'</code>, <code>'step'</code>,
    <code>'dots'</code>, <code>'markers'</code>, each with its colour, width and dash), <code>fills</code> for a
    band between two lines, <code>scale</code> and <code>levels</code> for a pane, as in
    <a href="#descriptor">the descriptor</a> below.
  </li>
  <li>
    <strong><code>ta</code></strong> has <code>sma</code>, <code>ema</code>, <code>wma</code>, <code>rma</code>,
    <code>stdev</code>, <code>highest</code>, <code>lowest</code>, <code>change</code>, <code>rsi</code>,
    <code>macd</code>, <code>atr</code>, <code>bollinger</code>, <code>crossover</code> and
    <code>crossunder</code>. Each takes a value a bar and returns one, so one feeds the next
    (<code>ta.ema(ta.rsi(bars.close, 14), 9)</code>), and they give the values of the built-in indicators. It is
    exported on its own too: <code>{`import { ta } from '@tradecanvas/chart'`}</code>.
  </li>
</ul>
<p>
  It computes over all the bars on each tick, which is quick for sums like these. An indicator slow enough for
  that to show, or one that draws something other than a value a bar, is a class with an <code>update</code>:
  the long way, below.
</p>

<h2>Custom indicator</h2>
<p>
  An indicator is an <code>IndicatorPlugin</code>: a <code>descriptor</code> that says what it is and how it
  looks, and a <code>calculate()</code> that gives a value per bar. Extend <code>IndicatorBase</code> and the chart
  does the rest from the descriptor: it draws the plots, scales the pane, tags the values on the axis, and lists the
  indicator in the legend, the settings and the Indicators dialog. Here is a whole one, a MACD that marks where its
  line turns:
</p>
<pre><code>{`import { IndicatorBase, IndicatorValueMap } from '@tradecanvas/chart'

const ema = (prev, value, period) => (prev === undefined ? value : prev + (2 / (period + 1)) * (value - prev))

class TurningMacd extends IndicatorBase {
  descriptor = {
    id: 'turning-macd', name: 'Turning MACD', shortName: 'TMACD',
    placement: 'panel',               // a pane of its own; 'overlay' draws on the price pane
    category: 'oscillators',          // its group in the Indicators dialog
    defaultConfig: { fast: 12, slow: 26, source: 'close' },
    inputs: {
      fast: { kind: 'int', min: 2, label: 'Fast' },
      slow: { kind: 'int', min: 3, label: 'Slow' },
      source: { kind: 'choice', label: 'Price', options: [{ value: 'close', label: 'Close' }, { value: 'hl2', label: 'Median' }] },
    },
    plots: [
      { key: 'value', title: 'MACD', color: 0 },
      { key: 'turn', title: 'Turn', color: 1, kind: 'markers', tone: { field: 'up' }, downColor: 2 },
    ],
    scale: { zero: true },
    levels: [0],
    defaultStyle: (theme) => ({ colors: theme.name === 'light' ? ['#1f4e8c', '#0a7d3b', '#b3261e'] : ['#8ab4f8', '#4cc38a', '#f28b82'] }),
  }

  calculate(data, config) {
    const { fast, slow, source } = config.params
    const values = new IndicatorValueMap()
    const series = new Array(data.length).fill(null)
    let f, s
    for (let i = 0; i < data.length; i++) {
      const bar = data[i]
      const price = source === 'hl2' ? (bar.high + bar.low) / 2 : bar.close
      f = ema(f, price, fast)
      s = ema(s, price, slow)
      if (i < slow) continue
      const point = { value: f - s }
      const a = series[i - 2]?.value, b = series[i - 1]?.value
      // The bar before this one is a turn when the line changed direction there.
      if (a !== undefined && b !== undefined && (b - a) * (point.value - b) < 0) {
        series[i - 1] = { ...series[i - 1], turn: b, up: point.value > b ? 1 : 0 }
        values.set(data[i - 1].time, series[i - 1])
      }
      series[i] = point
      values.set(bar.time, point)
    }
    return { values, series }
  }
}`}</code></pre>
<p>
  <code>calculate(data, config)</code> gets the bars and the instance's inputs (<code>config.params</code>) and
  returns its values twice: by bar index (<code>series</code>, <code>null</code> before the first value) and by bar
  time (<code>values</code>). Use <code>new IndicatorValueMap()</code> for <code>values</code>: a <code>Map</code> that
  is several times cheaper to fill in time order, which every symbol or interval switch does. A field no plot names
  (<code>up</code> above) is not drawn, scaled or shown; it is there for a plot's <code>tone</code>.
</p>

<h3 id="descriptor">The descriptor</h3>
<ul>
  <li><strong>Plots</strong> draw a field each: <code>'line'</code> (the default), <code>'step'</code>,
    <code>'histogram'</code>, <code>'dots'</code> (a line drawn as dots), or <code>'markers'</code>, a shape
    (<code>shape</code>: <code>'dot'</code>, <code>'triangleUp'</code>, <code>'triangleDown'</code>) on the bars where the field
    has a value, at it or, on the price pane, above or below the bar (<code>position</code>). <code>color</code> is an
    index into the style's colours; <code>tone</code> and <code>downColor</code> draw a plot in two colours;
    <code>width</code>, <code>lineStyle</code>, <code>opacity</code> and <code>breakOn</code> set a line's look.
    <code>fills</code> shade between two plots.</li>
  <li><strong>Inputs</strong> say how each input in <code>defaultConfig</code> is edited: <code>kind</code>,
    <code>label</code>, <code>min</code>, <code>max</code>, <code>step</code>, and a choice's <code>options</code>, plain or
    with a label for each (<code>{'{ value, label }'}</code>). <code>{'{ source: true }'}</code> lets it run on another
    price or another indicator's line.</li>
  <li><strong>The pane</strong>: <code>scale</code> fixes its bounds or keeps zero in view, <code>levels</code> draws
    reference lines the viewer can edit.</li>
  <li><strong>Its look</strong>: <code>defaultStyle</code>, a style or one for each theme (below).</li>
</ul>

<h3>Live ticks: update and revisesBefore</h3>
<p>
  On each tick only the newest bar changes. Without <code>update()</code> the chart runs <code>calculate()</code> over
  the whole history again; with it, the chart hands back your last output (<code>prev</code>) and the first bar that
  changed (<code>from</code>), and you recompute from there. Return <code>null</code> to have <code>calculate()</code> run
  instead; the values must be the ones it would give. <code>canResume</code> and <code>writePoint</code> come with
  <code>IndicatorBase</code>.
</p>
<p>
  Each bar of an indicator like this one is worked out from the bars around it, not from a running state like
  TurningMacd's averages (which would keep its own state, or leave <code>update</code> out):
</p>
<pre><code>{`// A swing high: the bar is higher than the n bars either side of it.
pointAt(data, i, n) {
  if (i < n || i + n >= data.length) return null
  for (let k = 1; k <= n; k++) if (data[i - k].high >= data[i].high || data[i + k].high > data[i].high) return null
  return { high: data[i].high }
}

update(data, config, prev, from) {
  if (!this.canResume(data, prev, from)) return null
  const n = config.params.strength
  // A new bar decides the bar n back: rewrite from there.
  for (let i = Math.max(0, from - n); i < data.length; i++) this.writePoint(prev, data, i, this.pointAt(data, i, n))
  return prev
}

revisesBefore(config) { return config.params.strength }`}</code></pre>
<p>
  <code>from</code> is always the first bar that changed. When a new bar can change bars before it (a swing point,
  a turn, a fractal is decided by the bars after it), <code>update</code> rewrites them itself, and
  <code>revisesBefore(config)</code> says how many, so the indicators that read this one's line are recomputed from
  there too. Leave it out when only bars from <code>from</code> on change.
</p>

<h3>Drawing it</h3>
<p>
  <code>IndicatorBase</code>'s <code>render()</code> draws the <code>plots</code> and <code>fills</code> on the pane's
  scale, so most indicators have no drawing code. To draw more, override it and call it first. The fifth argument
  holds the theme the chart draws with, for colours and a font the style doesn't give: <code>theme.candleUp</code>,
  <code>theme.candleDown</code>, <code>theme.text</code>, <code>theme.font</code>.
</p>
<pre><code>{`render(ctx, output, viewport, style, context) {
  super.render(ctx, output, viewport, style, context)
  ctx.fillStyle = context.theme.text
  // barIndexToX(i, viewport) and priceToY(value, viewport) place it where the chart draws
}`}</code></pre>

<h3>Colours that follow the theme</h3>
<p>
  <code>defaultStyle</code> on the descriptor is the look an indicator starts with: a style, or a function of the
  theme that gives one for each. An instance on it follows <code>chart.setTheme()</code>; a colour someone picks for
  it stays. It sits under the viewer's saved default (<code>chart.setIndicatorDefaults()</code>, the widget's
  <em>Save as default</em>), so your app's colours never take the viewer's place. A saved layout leaves out what
  the theme gives, and opened in another theme it takes that theme's colours.
</p>

<h3>Registering it before a layout is read</h3>
<p>
  A saved layout names indicators by id, and one that isn't registered when the layout is read is left out. Give a
  <code>ChartWidget</code> your indicators in <code>plugins</code>: they are registered before it restores a layout
  (<code>persistLayouts</code>), a template or a shared view. On a <code>Chart</code>, pass <code>plugins</code> to the
  constructor, or register before <code>loadState()</code>.
</p>
<pre><code>{`new ChartWidget(host, { symbol, adapter, persistLayouts: true, plugins: [{ kind: 'indicator', plugin: new TurningMacd() }] })

const chart = new Chart(host, { plugins: [{ kind: 'indicator', plugin: new TurningMacd() }] })
chart.addIndicator('turning-macd', { fast: 8 })`}</code></pre>

<h3>What the chart reads off it</h3>
<ul>
  <li><strong>The legend</strong> names it by <code>shortName</code> and the inputs that differ from
    <code>defaultConfig</code> (a choice by its label), and shows the value of each plot but markers, in its colour.</li>
  <li><strong>The price axis</strong> tags the latest value of those plots.</li>
  <li><strong>The CSV export</strong> has a column for each of them, named by the legend's name and, when there is
    more than one, the plot's <code>title</code>.</li>
  <li><strong>The settings dialog</strong> edits the inputs, lists each plot with its colour, whether it shows, and a
    dash for a line or a step, and edits the levels.</li>
  <li><strong>The Indicators dialog</strong> lists it by <code>name</code> under its <code>category</code>: a kind
    (<code>'oscillators'</code>, <code>'volume'</code>…) or a group of your own, <code>{`{ id: 'my-app', label: 'My App' }`}</code>,
    which puts your app's indicators together under its name, before the built-in kinds (several groups in the
    order their first indicators are registered). Search finds them by that name too.</li>
  <li><strong>Another indicator</strong> can read its lines (the same plots) as its source.</li>
</ul>
<p>
  Coding agents get the same guide, with code type-checked against the published packages, from the MCP server's
  <code>custom_indicator</code> tool and the skill's
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">custom indicator recipe</a>.
</p>

<h2>Custom drawing tool</h2>
<p>
  Extend <code>DrawingBase</code> for its helpers (anchors to pixels, line
  styles, handles), describe the tool, and register it. Settings listed in
  <code>descriptor.options</code> show up in the widget's settings dialog and
  are saved with the drawing.
</p>
<pre><code>{`import { DrawingBase, registerPlugin } from '@tradecanvas/chart'

class TargetLine extends DrawingBase {
  descriptor = {
    type: 'targetLine', name: 'Target Line', requiredAnchors: 1,
    options: { label: { kind: 'text', label: 'Label', default: 'Target' } },
  }
  render(ctx, state, viewport, selected) { /* at this.anchorToPixel(state.anchors[0], viewport) */ }
  hitTest(point, state, viewport, tolerance) { /* is the pointer on it? */ return false }
  // optional: the prices of its lines, so an alert can follow them
  priceAt(state) { return [state.anchors[0].price] }
}

registerPlugin({ kind: 'drawing', plugin: new TargetLine() })
chart.setDrawingTool('targetLine')`}</code></pre>
<p>
  The tool's name works wherever the chart takes one (<code>setDrawingTool</code>, <code>addDrawing</code>…) in TypeScript too:
  <code>DrawingToolType</code> takes any name and still completes the built-in ones, which <code>BuiltInDrawingToolType</code> lists.
</p>
<p>
  The descriptor can also say how the tool is drawn (<code>creation</code>:
  <code>'clicks'</code>, <code>'freehand'</code> or <code>'path'</code>, with
  <code>maxAnchors</code>) and whether the dialog offers a fill
  (<code>fill</code>) or text (<code>text</code>). A tool can move handles that
  are not anchors with <code>moveHandle()</code>, and receives the chart's bars
  through <code>setDataGetter(getter, revision)</code> when it draws from them.
  <code>revision()</code> moves when a bar was corrected in the same array
  (<code>updateBar</code>): a tool that keeps what it computed from the bars
  computes it again then.
</p>

<h2>Custom chart type</h2>
<p>A <code>ChartTypePlugin</code> supplies a renderer and an optional data transform; switch to it like a built-in:</p>
<pre><code>{`registerPlugin({
  kind: 'chartType',
  plugin: {
    descriptor: { type: 'my-bricks', name: 'My Bricks' },
    createRenderer: () => new MyBrickRenderer(),
    transform: (raw) => toBricks(raw),   // optional
  },
})

chart.setChartType('my-bricks')`}</code></pre>

<h2>Custom overlay</h2>
<p>An <code>OverlayPlugin</code> draws each frame on the layer you choose, receiving the live viewport, data, and theme:</p>
<pre><code>{`import { overlayScale, registerPlugin } from '@tradecanvas/chart'

registerPlugin({
  kind: 'overlay',
  plugin: {
    descriptor: { id: 'high-marks', name: 'High marks', layer: 'main' },
    render(ctx, context) {
      const s = overlayScale(context)
      ctx.fillStyle = '#f2a93b'
      for (let i = s.visible.from; i <= s.visible.to; i++) {
        const bar = context.data[i]
        ctx.fillRect(s.indexToX(i) - s.barWidth / 2, s.priceToY(bar.high) - 1, s.barWidth, 2)
      }
    },
  },
})`}</code></pre>
<p>
  <code>overlayScale(context)</code> places things where the chart draws them: <code>timeToX</code> / <code>xToTime</code>
  by bar time (between bars and past the newest, in proportion), <code>indexToX</code> / <code>xToIndex</code>,
  <code>priceToY</code> / <code>yToPrice</code> (on a log or inverted scale too), <code>barWidth</code>, and
  <code>visible</code>, the bars on screen. For rows on the price grid, <code>chart.getPriceStep()</code> is the
  symbol's smallest step (<code>minTick</code>), a fraction's unit, or one unit of the decimals prices show.
  Chart-type renderers get the viewport alone, and indicators the viewport and the theme: <code>priceToY</code>, <code>barIndexToX</code>,
  <code>timeToX</code> and their inverses are exported for them. The bars are those on screen: on a Renko or
  Kagi chart, its bricks (<code>chart.isTimeAligned()</code> says when they are the feed's bars).
  To write a price as the axis does, the viewport carries the chart's own price format when it has one
  (<code>formatPrice</code>), its <code>numberLocale</code>, and the market's or the symbol's decimals when one sets
  them (<code>pricePrecision</code>); indicator panes leave the format and the decimals unset.
</p>
<p>
  An overlay with settings of its own (a display mode, a switch) can show a change at once, even when no
  tick is coming to redraw the chart: set <code>enabled: false</code> on the plugin to hide it while it stays
  registered, and call <code>chart.requestRender()</code> after changing either. Requests before the next
  frame make one frame.
</p>

<p>See the <a href={href('/docs/api')}>API reference</a> for the full plugin type signatures.</p>
