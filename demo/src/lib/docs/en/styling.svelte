<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Styling — TradeCanvas docs</title>
  <meta name="description" content="The widget's look as tokens: corners, sizes, type, borders, shadows and bars. Three presets — Studio, Terminal, Capsule — and your own theme over them." />
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

<h2>The chart's tags</h2>
<p>
  The widget hands <code>tagRadius</code> to its chart (a shape in <code>chartOptions.shapes</code> stays until
  you call <code>setUI</code>). On a bare <code>Chart</code>, set the shape yourself; it lasts across theme
  switches. Price tags, axis and crosshair pills, order, position and bracket tags and period-level tags take it.
</p>
<pre><code>{`const chart = new Chart(host, { shapes: { tagRadius: 4 } })
chart.setShapes({ tagRadius: 999 })   // pill price tags, axis pills and order badges
chart.getShapes()`}</code></pre>
