<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Styling — TradeCanvas docs</title>
  <meta name="description" content="The widget's look as tokens, with three presets — Studio, Terminal, Capsule — and the chart's look by key: the grid, crosshair, axes, panes, legend, last price, volume and each chart type, indicator plots and panes." />
</svelte:head>

<h1>Styling the widget</h1>
<p>
  The widget's look is a set of tokens: the corners of each kind of part, control and bar sizes, type, borders,
  shadows, how a chosen button shows, and whether the toolbar and drawing tools sit along the edges or float.
  Start from a preset and change what you like. Colours stay with the theme (<code>dark</code> / <code>light</code>,
  see <a href={href('/docs/api')}>the API</a>); a look works with either.
</p>

<h2>Presets</h2>
<table>
  <thead><tr><th>Preset</th><th>Look</th></tr></thead>
  <tbody>
    <tr><td><code>studio</code> (default)</td><td>
      Rounded 7 px controls, 11 px menus and 16 px dialogs. Groups are spaced instead of ruled, menus float on soft
      shadows, the interval buttons sit in a segmented track, and a chosen button is a tinted fill.
    </td></tr>
    <tr><td><code>terminal</code></td><td>
      Dense and square: 2 px corners, 26 px controls, rules between groups, capital labels, and a line under the
      chosen button. Price tags on the chart are square.
    </td></tr>
    <tr><td><code>capsule</code></td><td>
      Pills everywhere, pill price tags included. The toolbar and the drawing tools float as islands, menus are
      frosted glass, and a chosen button is a solid pill.
    </td></tr>
  </tbody>
</table>

<h2>Picking a look</h2>
<pre><code>{`import { ChartWidget, ChartWidgetGrid } from '@tradecanvas/chart/widget'

const widget = new ChartWidget(host, { ui: 'terminal' })
widget.setUI('capsule')        // in place: nothing is rebuilt
widget.getUI()                 // every token, resolved

// A grid: every chart and the grid's bar, and the charts it adds later
const grid = new ChartWidgetGrid(host, { layout: '2x2', widget: { ui: 'terminal' } })
grid.setUI('studio')
grid.getUI()`}</code></pre>

<h2>Your own look</h2>
<p>
  A theme starts from a preset (Studio when you name none) and changes what it names. Corners set on the scale
  reach every part that follows it, unless you set that part's own.
</p>
<pre><code>{`widget.setUI({
  preset: 'studio',
  radius: { xs: 3, sm: 5, md: 10, lg: 12, xl: 18 },  // the scale, px (999: pills)
  components: { dialog: 20, tag: 0 },                // a part's own corners
  density: 'compact',                                // compact · comfortable · spacious
  sizes: { toolbar: 40 },                            // px; wins over density
  font: {
    family: "'Manrope', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
    size: 13, weight: 500, strongWeight: 600,
    labelCase: 'uppercase', labelTracking: 0.06,      // small labels
  },
  borders: { width: 1, separators: true },           // rules between toolbar groups
  shadows: { menu: '0 12px 30px rgba(0, 0, 0, 0.4)' },
  blur: 12,                                          // frosted floating surfaces, px
  active: 'solid',                                   // tint · solid · underline
  toolbar: 'floating',                               // docked · floating
  sidebar: 'floating',
  intervals: 'segmented',                            // plain · segmented
  tagRadius: 999,                                    // the chart's price tags and pills
})`}</code></pre>

<table>
  <thead><tr><th>Field</th><th>What it sets</th></tr></thead>
  <tbody>
    <tr><td><code>radius</code></td><td>The corner scale <code>xs</code>, <code>sm</code>, <code>md</code>, <code>lg</code>, <code>xl</code>, px (0–999).</td></tr>
    <tr><td><code>components</code></td><td>
      A part's own corners: <code>control</code> (buttons), <code>input</code>, <code>menu</code>, <code>dialog</code>,
      <code>panel</code> (alerts, data window, order ticket), <code>tooltip</code>, <code>tag</code>, <code>toast</code>,
      <code>toolbar</code> and <code>sidebar</code> (their own box, seen when they float). By default controls and
      fields take <code>md</code>, menus and panels <code>lg</code>, dialogs <code>xl</code>, tooltips and tags <code>sm</code>.
    </td></tr>
    <tr><td><code>density</code> / <code>sizes</code></td><td>
      <code>toolbar</code> height, <code>control</code> and <code>controlSmall</code> heights, <code>icon</code>,
      <code>sidebar</code> width and <code>menuItem</code> height, px.
    </td></tr>
    <tr><td><code>font</code></td><td>
      Families (CSS lists), body <code>size</code> (11–20 px; the small sizes follow it), weights, and the case
      and letter spacing (em) of small labels such as section titles.
    </td></tr>
    <tr><td><code>borders</code></td><td>Border width, and whether rules separate the toolbar's groups and the drawing tools.</td></tr>
    <tr><td><code>shadows</code></td><td>CSS shadows of menus, dialogs and tooltips.</td></tr>
    <tr><td><code>blur</code></td><td>Frosted menus, px: above 0, menus let some of the chart through, blurred.</td></tr>
    <tr><td><code>active</code></td><td>How a chosen button shows: a tinted fill, a solid pill, or an underline.</td></tr>
    <tr><td><code>toolbar</code> / <code>sidebar</code></td><td>Along the edge, or floating as an island.</td></tr>
    <tr><td><code>intervals</code></td><td>The interval buttons as they are, or in a segmented track.</td></tr>
    <tr><td><code>tagRadius</code></td><td>Corners of the price tags, axis pills and order badges the chart draws.</td></tr>
  </tbody>
</table>
<p>Values it can't use (out of range, or CSS that could leave its declaration) are ignored and keep the preset's.</p>

<h2>Fonts</h2>
<p>
  The widget loads no fonts: it names them, and the browser falls back along each list. Studio names Manrope, then
  Inter; Terminal IBM Plex Sans Condensed and IBM Plex Mono; Capsule Sora. Load the ones you want:
</p>
<pre><code>{`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap">`}</code></pre>

<h2>CSS variables</h2>
<p>
  The tokens are CSS variables on the widget's root (and on its dialogs). Without the <code>ui</code> option they
  stay the stylesheet's — Studio's — so your own CSS can set them: the widget puts its stylesheet first in the
  page, so a rule of yours on <code>.tcw-root</code> wins. With <code>ui</code>, the widget writes them on the
  element, and they win.
</p>
<pre><code>{`.tcw-root {
  --tcw-radius: 4px;            /* the md corner: buttons and fields follow it */
  --tcw-dialog-radius: 12px;
  --tcw-control-h: 28px;
  --tcw-font: 'Inter', system-ui, sans-serif;
}`}</code></pre>
<table>
  <thead><tr><th>Variables</th><th>From</th></tr></thead>
  <tbody>
    <tr><td><code>--tcw-radius-xs</code>, <code>-sm</code>, <code>--tcw-radius</code>, <code>-lg</code>, <code>-xl</code></td><td><code>radius</code></td></tr>
    <tr><td><code>--tcw-control-radius</code>, <code>--tcw-input-radius</code>, <code>--tcw-menu-radius</code>, <code>--tcw-dialog-radius</code>, <code>--tcw-panel-radius</code>, <code>--tcw-tooltip-radius</code>, <code>--tcw-tag-radius</code>, <code>--tcw-toast-radius</code>, <code>--tcw-toolbar-radius</code>, <code>--tcw-sidebar-radius</code></td><td><code>components</code></td></tr>
    <tr><td><code>--tcw-toolbar-h</code>, <code>--tcw-control-h</code>, <code>--tcw-control-h-sm</code>, <code>--tcw-icon</code>, <code>--tcw-sidebar-w</code>, <code>--tcw-menu-item-h</code></td><td><code>sizes</code></td></tr>
    <tr><td><code>--tcw-font</code>, <code>--tcw-font-mono</code>, <code>--tcw-font-size</code> (and <code>-sm</code>, <code>-xs</code>, <code>-lg</code>), <code>--tcw-weight</code>, <code>--tcw-weight-strong</code>, <code>--tcw-label-case</code>, <code>--tcw-label-tracking</code></td><td><code>font</code></td></tr>
    <tr><td><code>--tcw-border-w</code>, <code>--tcw-sep-w</code></td><td><code>borders</code></td></tr>
    <tr><td><code>--tcw-menu-shadow</code>, <code>--tcw-dialog-shadow</code>, <code>--tcw-tooltip-shadow</code></td><td><code>shadows</code></td></tr>
    <tr><td><code>--tcw-blur</code>, <code>--tcw-surface-opacity</code></td><td><code>blur</code></td></tr>
  </tbody>
</table>
<p>
  The layout switches are data attributes on the same elements, for CSS of your own:
  <code>data-tcw-ui</code> (the preset), <code>data-tcw-active</code>, <code>data-tcw-toolbar</code>,
  <code>data-tcw-sidebar</code>, <code>data-tcw-intervals</code> and <code>data-tcw-separators</code> (<code>on</code> / <code>off</code>).
</p>

<h2 id="overrides">The chart's look: style overrides</h2>
<p>
  The theme sets the chart's colours as a whole. Any one part of what the chart draws can be set apart from it, by
  key: the grid's lines each way, the crosshair, the axes, the panes, the legend, the last price, the volume, the
  session breaks and the main series as each chart type draws it. A key left alone follows the theme, so a theme
  switch still recolours everything you didn't set.
</p>
<pre><code>{`import { Chart } from '@tradecanvas/chart'

const chart = new Chart(host, {
  overrides: { 'grid.vertical.visible': false },       // to start with
})

chart.applyOverrides({
  'series.candlestick.upColor': '#26a69a',              // every up/down type falls back to it
  'series.candlestick.downColor': '#ef5350',
  'grid.horizontal.style': 'dotted',
  'crosshair.vertical.style': 'solid',
  'crosshair.labelBackground': '#2962ff',
  'lastPrice.style': 'solid',
  'panes.background': '#0d1117',
  'legend.textColor': '#c9d1d9',
})
chart.applyOverrides({ 'legend.textColor': null })      // null takes a key away
chart.resetOverrides(['grid.horizontal.style'])         // or name the keys
chart.setOverrides({ 'background.color': '#000' })      // all of a layer at once

chart.getStyleValue('series.bar.upColor')               // '#26a69a': what a key resolves to
chart.getStyle().grid.vertical                          // { visible: false, color, style, width }
chart.on('styleChange', (e) => e.payload.layer)         // 'host' or 'user'`}</code></pre>

<h3>Keys</h3>
<table>
  <thead><tr><th>Keys</th><th>What they set</th></tr></thead>
  <tbody>
    <tr><td><code>background.color</code></td><td>The chart's background (and the panes', unless they have their own).</td></tr>
    <tr><td><code>panes.background</code>, <code>.separatorColor</code>, <code>.titleColor</code></td><td>Indicator panes: background, the bar at their top, their name.</td></tr>
    <tr><td><code>grid.horizontal.*</code>, <code>grid.vertical.*</code></td><td><code>visible</code>, <code>color</code>, <code>style</code> (<code>solid</code> · <code>dashed</code> · <code>dotted</code>), <code>width</code> — each way apart.</td></tr>
    <tr><td><code>crosshair.horizontal.*</code>, <code>crosshair.vertical.*</code></td><td>The same four for the crosshair's lines (dashed by default).</td></tr>
    <tr><td><code>crosshair.labelBackground</code>, <code>.labelTextColor</code></td><td>The price and time pills on the axes, and on the panes' scales.</td></tr>
    <tr><td><code>axis.price.lineColor</code>, <code>.textColor</code>, <code>axis.time.*</code></td><td>Each axis's line and labels (the panes' scales take the price axis's).</td></tr>
    <tr><td><code>legend.textColor</code>, <code>.labelColor</code></td><td>The legend's values, and its labels (O, H, L, Vol).</td></tr>
    <tr><td><code>lastPrice.visible</code>, <code>.upColor</code>, <code>.downColor</code>, <code>.style</code>, <code>.width</code></td><td>The last-price line and tag; their colours follow the series' unless set.</td></tr>
    <tr><td><code>volume.upColor</code>, <code>.downColor</code></td><td>The volume bars.</td></tr>
    <tr><td><code>sessionBreaks.color</code>, <code>.style</code>, <code>.width</code></td><td>The day, week and month breaks.</td></tr>
    <tr><td><code>highLow.color</code>, <code>watermark.color</code></td><td>The high and low lines, the watermark.</td></tr>
    <tr><td><code>trading.buyColor</code>, <code>.sellColor</code>, <code>.profitColor</code>, <code>.lossColor</code>, <code>.entryColor</code></td><td>Orders (buy, sell) and positions (profit, loss, entry), on the chart and on the price axis, over the trading config's colours.</td></tr>
    <tr><td><code>markers.longColor</code>, <code>.shortColor</code>, <code>.neutralColor</code></td><td>Signal markers, over their own style.</td></tr>
    <tr><td><code>tradeZones.profitColor</code>, <code>.lossColor</code>, <code>.activeColor</code></td><td>Trade zones: won, lost and still open.</td></tr>
    <tr><td><code>drawings.handleColor</code></td><td>A selected drawing's handles (white without it).</td></tr>
    <tr><td><code>series.&lt;type&gt;.*</code></td><td>
      The main series while it is drawn as that type: <code>upColor</code>, <code>downColor</code>, <code>wickUpColor</code>,
      <code>wickDownColor</code> (candles, Heikin-Ashi, volume candles, equivolume), <code>color</code> / <code>lineColor</code>
      and <code>lineWidth</code> (line, step line, line with markers, area, HLC area, baseline), <code>topColor</code> and
      <code>bottomColor</code> (area, HLC area).
    </td></tr>
  </tbody>
</table>
<p>
  <code>CHART_STYLE_KEYS</code> lists every key with the kind of value it takes, and TypeScript checks keys and
  values as you write them. Up and down colours fall back to <code>series.candlestick.*</code>, line colours and widths
  to <code>series.line.*</code>, area fills to <code>series.area.*</code>, then to the theme; a wick takes its body's
  colour once that is set. Unknown keys and values are left out with a warning.
</p>

<h3>Your app's and the user's</h3>
<p>
  Overrides come in two layers. Yours (<code>layer: 'host'</code>, the default) stay through theme switches and are
  never saved. The user's (<code>layer: 'user'</code>) win over yours, are kept with the theme they were made on —
  colours picked on the dark theme come back with the dark theme — and are saved with <code>saveState()</code>. The
  widget's Settings write the user's layer, and its Reset goes back to the theme's colours, whichever theme it is.
  Its Style tab sets every part of the chart's look by these keys, the colours of the chart type on view included,
  and its Trading tab the colours of orders, positions, signal markers and trade zones. A colour left to the part
  itself shows as Auto, and Auto takes one back there.
</p>
<pre><code>{`chart.applyOverrides({ 'background.color': '#0b0b0f' }, { layer: 'user' })
chart.getOverrides({ layer: 'user' })                 // the user's, for the current theme
chart.getTheme()                           // the theme as set: the overrides go on it apart`}</code></pre>
<p>
  The grid and crosshair options (<code>grid.hLineColor</code>, <code>crosshair.vLine.style</code>…) are shorthand
  for their keys. A grid of charts takes overrides for all of its charts: <code>grid.applyOverrides(patch)</code>. The
  React, Vue and Svelte components take them as an <code>overrides</code> prop.
</p>

<h3>Indicator plots and panes</h3>
<pre><code>{`// Each plot's own dash and visibility, by its key (colours and widths stay in colors / lineWidths)
chart.updateIndicatorStyle(macdId, { plots: { signal: { lineStyle: 'dashed' }, histogram: { visible: false } } })

// What every indicator of a kind starts with from now on
chart.setIndicatorDefaults('ema', { colors: ['#f5a623'], lineWidths: [2] })

// A pane's own background and separator, saved with its indicator
chart.setPaneStyle(rsiId, { background: '#101418', separator: '#f5a623' })`}</code></pre>
<p>
  A hidden plot shows no value tag and no legend value. Every indicator leaves a hidden plot out, and nearly every
  one takes its plots' dash; a few that draw shapes of their own (Parabolic SAR's dots, Supertrend, Zig Zag, the
  volume profiles) keep their own stroke.
</p>

<h2>The chart's tags</h2>
<p>
  The widget hands <code>tagRadius</code> to its chart (a shape in <code>chartOptions.shapes</code> stays until
  you call <code>setUI</code>). On a bare <code>Chart</code>, set the shape yourself; it lasts across theme
  switches. Price tags, axis and crosshair pills, order, position and bracket tags and period-level tags take it.
</p>
<pre><code>{`const chart = new Chart(host, { shapes: { tagRadius: 4 } })
chart.setShapes({ tagRadius: 999 })   // pill price tags, axis pills and order badges
chart.getShapes()`}</code></pre>

<h2>Volume colours</h2>
<p>
  Volume bars take the theme's <code>volumeUp</code> and <code>volumeDown</code> (or the <code>volume.*</code> keys). <code>volumeColor(candleColor)</code> gives the candle colour at the volume's opacity, so in a theme of your own the bars stay a backdrop under the candles. The widget does this itself when its settings change the candle colours, and a theme spread from a preset that only changes <code>candleUp</code> / <code>candleDown</code> gets volume in those colours too.
</p>
<pre><code>{`import { DARK_THEME, volumeColor } from '@tradecanvas/chart'

chart.setTheme({
  ...DARK_THEME,
  candleUp: '#26a17b',
  candleDown: '#e0525f',
  volumeUp: volumeColor('#26a17b'),
  volumeDown: volumeColor('#e0525f'),
})`}</code></pre>
