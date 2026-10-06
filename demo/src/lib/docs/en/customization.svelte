<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Customization — TradeCanvas docs</title>
  <meta name="description" content="Every way to make TradeCanvas your own: colours, the widget's look, the chart's look by key, 112 switches for the widget's parts, your own buttons, menus and status items, words, plugins and the headless chart." />
</svelte:head>

<h1>Customization</h1>
<p>
  Every way to make the chart your own, from the lightest touch to the deepest. Most apps need two or three of
  them: a theme, a few switches, a button of their own.
</p>

<h2>Which way for what</h2>
<table>
  <thead><tr><th>You want to change</th><th>Use</th></tr></thead>
  <tbody>
    <tr><td>The colours</td><td><code>theme</code> (<code>'dark'</code>, <code>'light'</code> or a theme of yours), <code>setTheme</code> — <a href={href('/docs/api')}>API</a></td></tr>
    <tr><td>The widget's corners, sizes, type and bars</td><td><code>ui</code> / <code>setUI</code> — <a href={href('/docs/styling')}>Styling</a></td></tr>
    <tr><td>One part of the chart's look: the grid, the crosshair, a chart type's colours</td><td><code>applyOverrides</code> by key — <a href={href('/docs/styling#overrides')}>Styling</a></td></tr>
    <tr><td>An indicator's lines, a pane's background</td><td><code>updateIndicatorStyle(id, {'{ plots }'})</code>, <code>setPaneStyle</code></td></tr>
    <tr><td>Which parts of the widget show</td><td><code>features</code> / <code>setFeatures</code> — <a href="#switches">below</a></td></tr>
    <tr><td>What users can do on the chart: draw, trade, zoom</td><td>The chart's own features: <code>chartOptions: {'{ features: { drawings: false } }'}</code></td></tr>
    <tr><td>Buttons, menus and status items of your own</td><td><code>addToolbarButton</code>, <code>addToolbarDropdown</code>, <code>addSidebarButton</code>, <code>addStatusBarItem</code>, <code>getSlot</code>, the menu hooks — <a href="#parts">below</a></td></tr>
    <tr><td>Keyboard shortcuts of your own</td><td><code>addHotkey</code> — <a href="#parts">below</a></td></tr>
    <tr><td>Your own CSS</td><td>The stable hooks: <code>--tcw-*</code>, <code>data-tcw-part</code> — <a href="#css">below</a></td></tr>
    <tr><td>The widget's words</td><td><code>locale</code>, <code>messages</code> — <a href="#words">below</a></td></tr>
    <tr><td>Indicators, drawings or chart types of your own</td><td><a href={href('/docs/plugins')}>Plugins</a></td></tr>
    <tr><td>All of the UI</td><td>The headless <code>Chart</code>, with your own around it — <a href={href('/docs/api')}>API</a></td></tr>
  </tbody>
</table>

<h2 id="switches">Feature switches</h2>
<p>
  Every part of the widget has a switch, and every switch is on until you turn it off. A name without a dot is a
  whole capability, off wherever it shows: <code>alerts</code> takes away the bell, the alert entries of the menus,
  and the alert notices. A dotted name is one place: <code>toolbar.alerts</code> takes away the bell alone, and the
  menus still offer alerts. Switches change while the widget runs.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  features: {
    'toolbar.replay': false,          // one button
    'sidebar.patterns': false,        // a section of drawing tools
    'menu.chart.exportData': false,   // one menu entry
    hotkeys: false,                   // every key of the widget's
  },
})

widget.setFeatures({ sidebar: false, statusBar: false })   // a clean chart, while it runs
widget.isFeatureOn('sidebar')        // false
widget.getFeatures()                 // every switch, on or off
grid.setFeatures({ toasts: false })  // every chart of a ChartWidgetGrid`}</code></pre>
<p>
  The names are a contract: new ones come, none is renamed. They are listed in <code>WIDGET_FEATURES</code>, and
  TypeScript checks them; an unknown name is left out with a warning.
</p>
<p>
  Switches show and hide the widget's own parts. To stop something on the chart itself — drawing, trading,
  zooming, a timeframe — use the chart's features (<code>chartOptions.features</code>). The parts that bring data
  or storage with them stay options: <code>trading</code>, <code>watchlist</code>, <code>depthLadder</code> and
  <code>layouts</code> decide whether they are there at all, and switches hide their buttons.
</p>
<p>The older on/off options are the same switches, kept as they were:</p>
<table>
  <thead><tr><th>Option</th><th>Switches</th></tr></thead>
  <tbody>
    <tr><td><code>toolbar: false</code></td><td><code>toolbar</code></td></tr>
    <tr><td><code>drawingTools: false</code></td><td><code>sidebar</code>, <code>drawingSettings</code>, <code>hotkeys.tools</code>, <code>menu.chart.horizontalLine</code></td></tr>
    <tr><td><code>statusBar: false</code></td><td><code>statusBar</code>, <code>goToDate</code></td></tr>
    <tr><td><code>rangeBar: false</code></td><td><code>statusBar.range</code>, <code>goToDate</code></td></tr>
    <tr><td><code>accountPanel: false</code></td><td><code>accountPanel</code>, <code>orderTicket</code></td></tr>
    <tr><td><code>indicatorLegend</code>, <code>settings</code>, <code>alerts</code>, <code>objectTree</code>, <code>indicatorTemplates</code>, <code>intervalTyping</code>, <code>symbolInfo</code>, <code>navigation</code>, <code>dragDropImport</code>, <code>customTimeframes</code>, <code>fullscreen</code></td><td>The switch of the same name</td></tr>
  </tbody>
</table>

<h3>Every switch</h3>
<table>
  <thead><tr><th>Group</th><th>Switches</th></tr></thead>
  <tbody>
    <tr><td>Bars</td><td><code>toolbar</code> <code>sidebar</code> <code>statusBar</code></td></tr>
    <tr><td>Capabilities</td><td>
      <code>alerts</code> <code>objectTree</code> <code>symbolInfo</code> <code>symbolSearch</code> <code>settings</code>
      <code>indicatorSettings</code> <code>drawingSettings</code> <code>dataWindow</code> <code>commandPalette</code>
      <code>hotkeySheet</code> <code>goToDate</code> <code>replay</code> <code>screenshot</code> <code>copyImage</code>
      <code>shareView</code> <code>autoFib</code> <code>themeToggle</code> <code>fullscreen</code> <code>accountPanel</code>
      <code>orderTicket</code> <code>bracketOrders</code> <code>depthLadder</code> <code>layouts</code>
      <code>indicatorTemplates</code> <code>compare</code> <code>indicatorLegend</code> <code>navigation</code>
      <code>customTimeframes</code> <code>intervalTyping</code> <code>dragDropImport</code> <code>hotkeys</code>
      <code>toasts</code>
    </td></tr>
    <tr><td>Toolbar</td><td>
      <code>toolbar.symbol</code> <code>toolbar.symbolInfo</code> <code>toolbar.timeframes</code>
      <code>toolbar.timeframeMenu</code> <code>toolbar.chartType</code> <code>toolbar.indicators</code>
      <code>toolbar.layouts</code> <code>toolbar.replay</code> <code>toolbar.bracketOrders</code>
      <code>toolbar.depthLadder</code> <code>toolbar.accountPanel</code> <code>toolbar.objectTree</code>
      <code>toolbar.alerts</code> <code>toolbar.screenshot</code> <code>toolbar.settings</code>
      <code>toolbar.themeToggle</code> <code>toolbar.fullscreen</code>
    </td></tr>
    <tr><td>Drawing sidebar</td><td>
      <code>sidebar.cursor</code> <code>sidebar.favorites</code> <code>sidebar.lines</code> <code>sidebar.fibonacci</code>
      <code>sidebar.patterns</code> <code>sidebar.forecasting</code> <code>sidebar.annotation</code> <code>sidebar.style</code>
      <code>sidebar.magnet</code> <code>sidebar.eraser</code> <code>sidebar.zoomArea</code> <code>sidebar.stayInDrawing</code>
      <code>sidebar.undo</code> <code>sidebar.redo</code> <code>sidebar.clear</code>
    </td></tr>
    <tr><td>Status bar</td><td>
      <code>statusBar.range</code> <code>statusBar.goToDate</code> <code>statusBar.market</code>
      <code>statusBar.connection</code> <code>statusBar.symbol</code>
    </td></tr>
    <tr><td>On the chart</td><td>
      <code>indicatorLegend.values</code> <code>indicatorLegend.visibility</code> <code>indicatorLegend.settings</code>
      <code>indicatorLegend.remove</code> <code>indicatorLegend.more</code> <code>pane.move</code> <code>pane.collapse</code>
      <code>pane.maximize</code> <code>navigation.zoom</code> <code>navigation.scroll</code> <code>navigation.reset</code>
    </td></tr>
    <tr><td>Menus</td><td>
      <code>menu.chart</code> <code>menu.chart.alert</code> <code>menu.chart.order</code> <code>menu.chart.orderTicket</code>
      <code>menu.chart.horizontalLine</code> <code>menu.chart.resetView</code> <code>menu.chart.drawings</code>
      <code>menu.chart.exportData</code> <code>menu.chart.settings</code> <code>menu.chart.scale</code>
      <code>menu.chart.goToDate</code> <code>menu.chart.paneScale</code> <code>menu.priceAxisAdd</code>
      <code>menu.drawing</code> <code>menu.drawing.settings</code> <code>menu.drawing.alert</code>
      <code>menu.drawing.order</code> <code>menu.drawing.group</code> <code>menu.drawing.lock</code>
      <code>menu.drawing.hide</code> <code>menu.drawing.duplicate</code> <code>menu.drawing.delete</code>
    </td></tr>
    <tr><td>Keys</td><td>
      <code>hotkeys.commandPalette</code> <code>hotkeys.symbolSearch</code> <code>hotkeys.save</code>
      <code>hotkeys.tools</code> <code>hotkeys.invertScale</code> <code>hotkeys.goToDate</code> <code>hotkeys.help</code>
    </td></tr>
  </tbody>
</table>
<p>
  A few that say more than their name: <code>indicatorLegend</code> off gives the panes their titles back;
  <code>menu.chart.*</code> covers the "+" by the price axis as well as the right-click menu; <code>compare</code>
  takes the add button of the object tree, and comparisons already on stay listed; <code>toasts</code> silences the
  widget's own notices (its errors still show), while yours through <code>widget.toast()</code> show as well.
</p>

<h2 id="parts">Your own parts</h2>
<p>
  Your buttons, menus and items go into the widget's bars, look like its own and follow its theme and look. Each
  returns a handle to change or remove it, and shows while its bar does.
</p>
<pre><code>{`widget.addToolbarButton({ id: 'news', label: 'News', icon: 'bell', toggle: true, onClick })

widget.addToolbarDropdown({
  id: 'scans',
  label: 'Scans',
  icon: 'layers',
  side: 'left',                              // with the chart controls
  items: () => [                             // asked for each time it opens
    { label: 'Breakouts', onSelect: () => runScan('breakouts') },
    { label: 'Live only', checked: liveOnly, onSelect: () => (liveOnly = !liveOnly) },
  ],
})

const ruler = widget.addSidebarButton({ id: 'ruler', label: 'Ruler', icon: 'ruler', toggle: true,
  onClick: () => ruler?.setActive(toggleRuler()) })

const latency = widget.addStatusBarItem({ id: 'latency', text: '12 ms', label: 'Latency' })
latency?.setText('15 ms')
widget.addHotkey({ keys: 'Alt+N', label: 'New note', onPress: () => addNote() })   // replaces a widget shortcut on the same keys; listed in the shortcut sheet (?)

// Anything else of yours: beside the toolbar's controls, under the sidebar's,
// on either end of the status bar, or over the chart
widget.getSlot('chart')?.append(myOverlay)   // the layer lets the pointer through; give yours pointer-events: auto`}</code></pre>
<p>Slots: <code>toolbar.left</code>, <code>toolbar.right</code>, <code>sidebar</code>, <code>statusBar.left</code>, <code>statusBar.right</code>, <code>chart</code>.</p>

<h3>Your menu entries</h3>
<p>Entries of yours go at the end of the widget's menus, asked for each time one opens, with where it opened.</p>
<pre><code>{`new ChartWidget(host, {
  chartMenuItems: ({ area, price }) => area === 'plot' && price !== undefined
    ? [{ label: 'Copy price', onSelect: () => copy(price) }]
    : [],
  drawingMenuItems: ({ id, type, selected }) => [{ label: 'Share', icon: 'link', onSelect: () => share(id) }],
  indicatorMenuItems: ({ instanceId, indicatorId }) => [{ label: 'Explain', onSelect: () => explain(indicatorId) }],
})`}</code></pre>

<h2 id="css">Your own CSS</h2>
<p>The widget is part of your page, not a frame, so your CSS reaches it. These hooks stay as they are through 1.x:</p>
<ul>
  <li><code>--tcw-*</code> variables on <code>.tcw-root</code>: the look's tokens (see <a href={href('/docs/styling')}>Styling</a>).</li>
  <li><code>[data-tcw-part~="toolbar.screenshot"]</code>: every part carries the names of its switches, so a rule finds it by the same name.</li>
  <li><code>.tcw-root[data-tcw-off~="sidebar"]</code>: the switches that are off, on the widget's root.</li>
  <li><code>[data-host-button="id"]</code>, <code>[data-host-item="id"]</code>: your own buttons and status items, by the id you gave them.</li>
</ul>
<p>Other class names are the widget's own and may change: style by the hooks.</p>
<pre><code>{`/* your toolbar button in the accent colour */
.tcw-root [data-host-button="news"] { color: var(--tcw-accent); }
/* a wider panel of yours while the drawing tools are switched off */
.my-layout:has(.tcw-root[data-tcw-off~="sidebar"]) .my-panel { width: 320px; }`}</code></pre>

<h2 id="words">Words</h2>
<p>
  The widget speaks 30 languages (<code>locale</code>; English and Vietnamese are built in, the others load from
  <code>@tradecanvas/chart/widget/locales</code>). <code>messages</code> changes any string of it, on top of the
  language's. Indicator names stay as they are.
</p>
<pre><code>{`import { de } from '@tradecanvas/chart/widget/locales'

new ChartWidget(host, {
  locale: 'de',
  messages: { ...de, 'toolbar.indicators': 'Studien' },
})`}</code></pre>

<h2>Deeper</h2>
<p>
  Indicators, drawing tools and chart types of your own register as <a href={href('/docs/plugins')}>plugins</a> and
  then work like the built-in ones, in the menus included. For a UI that is all yours, use the headless
  <code>Chart</code>: the same engine without the widget.
</p>
