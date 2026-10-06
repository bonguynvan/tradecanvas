<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Personalización — Documentación de TradeCanvas</title>
  <meta name="description" content="Todas las formas de hacer TradeCanvas tuyo: colores, el aspecto del widget, el aspecto del gráfico por clave, 112 interruptores para las partes del widget, botones, menús y elementos de estado propios, textos, plugins y el gráfico sin interfaz." />
</svelte:head>

<h1>Personalización</h1>
<p>
  Todas las formas de hacer tuyo el gráfico, del retoque más ligero al más profundo. La mayoría de las apps necesitan
  dos o tres: un tema, unos cuantos interruptores, un botón propio.
</p>

<h2>Qué usar para cada cosa</h2>
<table>
  <thead><tr><th>Quieres cambiar</th><th>Usa</th></tr></thead>
  <tbody>
    <tr><td>Los colores</td><td><code>theme</code> (<code>'dark'</code>, <code>'light'</code> o un tema tuyo), <code>setTheme</code> — <a href={href('/docs/api')}>API</a></td></tr>
    <tr><td>Las esquinas, los tamaños, la tipografía y las barras del widget</td><td><code>ui</code> / <code>setUI</code> — <a href={href('/docs/styling')}>Estilos</a></td></tr>
    <tr><td>Una parte del aspecto del gráfico: la cuadrícula, la cruz, los colores de un tipo de gráfico</td><td><code>applyOverrides</code> por clave — <a href={href('/docs/styling#overrides')}>Estilos</a></td></tr>
    <tr><td>Las líneas de un indicador, el fondo de un panel</td><td><code>updateIndicatorStyle(id, {'{ plots }'})</code>, <code>setPaneStyle</code></td></tr>
    <tr><td>Qué partes del widget se ven</td><td><code>features</code> / <code>setFeatures</code> — <a href="#switches">más abajo</a></td></tr>
    <tr><td>Lo que el usuario puede hacer en el gráfico: dibujar, operar, hacer zoom</td><td>Las features del propio gráfico: <code>chartOptions: {'{ features: { drawings: false } }'}</code></td></tr>
    <tr><td>Botones, menús y elementos de estado propios</td><td><code>addToolbarButton</code>, <code>addToolbarDropdown</code>, <code>addSidebarButton</code>, <code>addStatusBarItem</code>, <code>getSlot</code>, los ganchos de menú — <a href="#parts">más abajo</a></td></tr>
    <tr><td>Atajos de teclado propios</td><td><code>addHotkey</code> — <a href="#parts">más abajo</a></td></tr>
    <tr><td>Tu propio CSS</td><td>Los ganchos estables: <code>--tcw-*</code>, <code>data-tcw-part</code> — <a href="#css">más abajo</a></td></tr>
    <tr><td>Los textos del widget</td><td><code>locale</code>, <code>messages</code> — <a href="#words">más abajo</a></td></tr>
    <tr><td>Indicadores, herramientas de dibujo o tipos de gráfico propios</td><td><a href={href('/docs/plugins')}>Plugins</a></td></tr>
    <tr><td>Toda la interfaz</td><td>El <code>Chart</code> sin interfaz, con la tuya alrededor — <a href={href('/docs/api')}>API</a></td></tr>
  </tbody>
</table>

<h2 id="switches">Interruptores de funciones</h2>
<p>
  Cada parte del widget tiene un interruptor, y todos están encendidos hasta que los apagas. Un nombre sin punto es una
  capacidad entera, apagada allí donde aparezca: <code>alerts</code> quita la campana, las entradas de alerta de los
  menús y los avisos de alerta. Un nombre con punto es un solo lugar: <code>toolbar.alerts</code> quita solo la campana, y
  los menús siguen ofreciendo alertas. Los interruptores cambian mientras el widget funciona.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  features: {
    'toolbar.replay': false,          // un botón
    'sidebar.patterns': false,        // una sección de herramientas de dibujo
    'menu.chart.exportData': false,   // una entrada de menú
    hotkeys: false,                   // todos los atajos del widget
  },
})

widget.setFeatures({ sidebar: false, statusBar: false })   // un gráfico limpio, en marcha
widget.isFeatureOn('sidebar')        // false
widget.getFeatures()                 // todos los interruptores, encendidos o apagados
grid.setFeatures({ toasts: false })  // cada gráfico de un ChartWidgetGrid`}</code></pre>
<p>
  Los nombres son un compromiso: llegan nuevos, ninguno cambia de nombre. Están en <code>WIDGET_FEATURES</code> y
  TypeScript los comprueba; un nombre desconocido se descarta con un aviso.
</p>
<p>
  Los interruptores muestran y ocultan las partes del propio widget. Para impedir algo en el gráfico mismo —dibujar,
  operar, hacer zoom, una temporalidad— usa las features del gráfico (<code>chartOptions.features</code>). Las partes que
  traen datos o almacenamiento siguen siendo opciones: <code>trading</code>, <code>watchlist</code>,
  <code>depthLadder</code> y <code>layouts</code> deciden si existen, y los interruptores ocultan sus botones.
</p>
<p>Las opciones de encendido y apagado anteriores son estos mismos interruptores, y siguen como estaban:</p>
<table>
  <thead><tr><th>Opción</th><th>Interruptores</th></tr></thead>
  <tbody>
    <tr><td><code>toolbar: false</code></td><td><code>toolbar</code></td></tr>
    <tr><td><code>drawingTools: false</code></td><td><code>sidebar</code>, <code>drawingSettings</code>, <code>hotkeys.tools</code>, <code>menu.chart.horizontalLine</code></td></tr>
    <tr><td><code>statusBar: false</code></td><td><code>statusBar</code>, <code>goToDate</code></td></tr>
    <tr><td><code>rangeBar: false</code></td><td><code>statusBar.range</code>, <code>goToDate</code></td></tr>
    <tr><td><code>accountPanel: false</code></td><td><code>accountPanel</code>, <code>orderTicket</code></td></tr>
    <tr><td><code>indicatorLegend</code>, <code>settings</code>, <code>alerts</code>, <code>objectTree</code>, <code>indicatorTemplates</code>, <code>intervalTyping</code>, <code>symbolInfo</code>, <code>navigation</code>, <code>dragDropImport</code>, <code>customTimeframes</code>, <code>fullscreen</code></td><td>El interruptor del mismo nombre</td></tr>
  </tbody>
</table>

<h3>Todos los interruptores</h3>
<table>
  <thead><tr><th>Grupo</th><th>Interruptores</th></tr></thead>
  <tbody>
    <tr><td>Barras</td><td><code>toolbar</code> <code>sidebar</code> <code>statusBar</code></td></tr>
    <tr><td>Capacidades</td><td>
      <code>alerts</code> <code>objectTree</code> <code>symbolInfo</code> <code>symbolSearch</code> <code>settings</code>
      <code>indicatorSettings</code> <code>drawingSettings</code> <code>dataWindow</code> <code>commandPalette</code>
      <code>hotkeySheet</code> <code>goToDate</code> <code>replay</code> <code>screenshot</code> <code>copyImage</code>
      <code>shareView</code> <code>autoFib</code> <code>themeToggle</code> <code>fullscreen</code> <code>accountPanel</code>
      <code>orderTicket</code> <code>bracketOrders</code> <code>depthLadder</code> <code>layouts</code>
      <code>indicatorTemplates</code> <code>compare</code> <code>indicatorLegend</code> <code>navigation</code>
      <code>customTimeframes</code> <code>intervalTyping</code> <code>dragDropImport</code> <code>hotkeys</code>
      <code>toasts</code>
    </td></tr>
    <tr><td>Barra de herramientas</td><td>
      <code>toolbar.symbol</code> <code>toolbar.symbolInfo</code> <code>toolbar.timeframes</code>
      <code>toolbar.timeframeMenu</code> <code>toolbar.chartType</code> <code>toolbar.indicators</code>
      <code>toolbar.layouts</code> <code>toolbar.replay</code> <code>toolbar.bracketOrders</code>
      <code>toolbar.depthLadder</code> <code>toolbar.accountPanel</code> <code>toolbar.objectTree</code>
      <code>toolbar.alerts</code> <code>toolbar.screenshot</code> <code>toolbar.settings</code>
      <code>toolbar.themeToggle</code> <code>toolbar.fullscreen</code>
    </td></tr>
    <tr><td>Barra de dibujo</td><td>
      <code>sidebar.cursor</code> <code>sidebar.favorites</code> <code>sidebar.lines</code> <code>sidebar.fibonacci</code>
      <code>sidebar.patterns</code> <code>sidebar.forecasting</code> <code>sidebar.annotation</code> <code>sidebar.style</code>
      <code>sidebar.magnet</code> <code>sidebar.eraser</code> <code>sidebar.zoomArea</code> <code>sidebar.stayInDrawing</code>
      <code>sidebar.undo</code> <code>sidebar.redo</code> <code>sidebar.clear</code>
    </td></tr>
    <tr><td>Barra de estado</td><td>
      <code>statusBar.range</code> <code>statusBar.goToDate</code> <code>statusBar.market</code>
      <code>statusBar.connection</code> <code>statusBar.symbol</code>
    </td></tr>
    <tr><td>Sobre el gráfico</td><td>
      <code>indicatorLegend.values</code> <code>indicatorLegend.visibility</code> <code>indicatorLegend.settings</code>
      <code>indicatorLegend.remove</code> <code>indicatorLegend.more</code> <code>pane.move</code> <code>pane.collapse</code>
      <code>pane.maximize</code> <code>navigation.zoom</code> <code>navigation.scroll</code> <code>navigation.reset</code>
    </td></tr>
    <tr><td>Menús</td><td>
      <code>menu.chart</code> <code>menu.chart.alert</code> <code>menu.chart.order</code> <code>menu.chart.orderTicket</code>
      <code>menu.chart.horizontalLine</code> <code>menu.chart.resetView</code> <code>menu.chart.drawings</code>
      <code>menu.chart.exportData</code> <code>menu.chart.settings</code> <code>menu.chart.scale</code>
      <code>menu.chart.goToDate</code> <code>menu.chart.paneScale</code> <code>menu.priceAxisAdd</code>
      <code>menu.drawing</code> <code>menu.drawing.settings</code> <code>menu.drawing.alert</code>
      <code>menu.drawing.order</code> <code>menu.drawing.group</code> <code>menu.drawing.lock</code>
      <code>menu.drawing.hide</code> <code>menu.drawing.duplicate</code> <code>menu.drawing.delete</code>
    </td></tr>
    <tr><td>Atajos</td><td>
      <code>hotkeys.commandPalette</code> <code>hotkeys.symbolSearch</code> <code>hotkeys.save</code>
      <code>hotkeys.tools</code> <code>hotkeys.invertScale</code> <code>hotkeys.goToDate</code> <code>hotkeys.help</code>
    </td></tr>
  </tbody>
</table>
<p>
  Algunos hacen más de lo que dice su nombre: con <code>indicatorLegend</code> apagado, los paneles recuperan su título;
  <code>menu.chart.*</code> vale tanto para el menú del clic derecho como para el "+" junto al eje de precios;
  <code>compare</code> quita el botón de añadir del árbol de objetos, y las comparaciones ya puestas siguen en la lista;
  <code>toasts</code> calla los avisos del propio widget (sus errores se siguen mostrando), y los tuyos con
  <code>widget.toast()</code> también se muestran.
</p>

<h2 id="parts">Tus propias partes</h2>
<p>
  Tus botones, menús y elementos van en las barras del widget, se ven como los suyos y siguen su tema y su aspecto. Cada
  uno devuelve un manejador para cambiarlo o quitarlo, y se muestra mientras se muestre su barra.
</p>
<pre><code>{`widget.addToolbarButton({ id: 'news', label: 'News', icon: 'bell', toggle: true, onClick })

widget.addToolbarDropdown({
  id: 'scans',
  label: 'Scans',
  icon: 'layers',
  side: 'left',                              // con los controles del gráfico
  items: () => [                             // se piden cada vez que se abre
    { label: 'Breakouts', onSelect: () => runScan('breakouts') },
    { label: 'Live only', checked: liveOnly, onSelect: () => (liveOnly = !liveOnly) },
  ],
})

const ruler = widget.addSidebarButton({ id: 'ruler', label: 'Ruler', icon: 'ruler', toggle: true,
  onClick: () => ruler?.setActive(toggleRuler()) })

const latency = widget.addStatusBarItem({ id: 'latency', text: '12 ms', label: 'Latency' })
latency?.setText('15 ms')
widget.addHotkey({ keys: 'Alt+N', label: 'New note', onPress: () => addNote() })   // sustituye al atajo del widget con las mismas teclas; también en la hoja de atajos (?)

// Cualquier otra cosa tuya: junto a los controles de la barra, bajo los de la barra lateral,
// en un extremo u otro de la barra de estado, o sobre el gráfico
widget.getSlot('chart')?.append(myOverlay)   // la capa deja pasar el puntero; da pointer-events: auto a lo tuyo`}</code></pre>
<p>Ranuras: <code>toolbar.left</code>, <code>toolbar.right</code>, <code>sidebar</code>, <code>statusBar.left</code>, <code>statusBar.right</code>, <code>chart</code>.</p>

<h3>Tus entradas de menú</h3>
<p>Tus entradas van al final de los menús del widget; se piden cada vez que uno se abre, con el lugar donde se abrió.</p>
<pre><code>{`new ChartWidget(host, {
  chartMenuItems: ({ area, price }) => area === 'plot' && price !== undefined
    ? [{ label: 'Copy price', onSelect: () => copy(price) }]
    : [],
  drawingMenuItems: ({ id, type, selected }) => [{ label: 'Share', icon: 'link', onSelect: () => share(id) }],
  indicatorMenuItems: ({ instanceId, indicatorId }) => [{ label: 'Explain', onSelect: () => explain(indicatorId) }],
})`}</code></pre>

<h2 id="css">Tu propio CSS</h2>
<p>El widget forma parte de tu página, no de un iframe, así que tu CSS llega a él. Estos ganchos se mantienen durante toda la 1.x:</p>
<ul>
  <li>Las variables <code>--tcw-*</code> en <code>.tcw-root</code>: los tokens del aspecto (ver <a href={href('/docs/styling')}>Estilos</a>).</li>
  <li><code>[data-tcw-part~="toolbar.screenshot"]</code>: cada parte lleva los nombres de sus interruptores, así que una regla la encuentra por el mismo nombre.</li>
  <li><code>.tcw-root[data-tcw-off~="sidebar"]</code>: los interruptores apagados, en la raíz del widget.</li>
  <li><code>[data-host-button="id"]</code>, <code>[data-host-item="id"]</code>: tus propios botones y elementos de estado, por el id que les diste.</li>
</ul>
<p>Los demás nombres de clase son del propio widget y pueden cambiar: aplica estilos mediante los ganchos.</p>
<pre><code>{`/* tu botón de la barra en el color de acento */
.tcw-root [data-host-button="news"] { color: var(--tcw-accent); }
/* un panel tuyo más ancho mientras las herramientas de dibujo están apagadas */
.my-layout:has(.tcw-root[data-tcw-off~="sidebar"]) .my-panel { width: 320px; }`}</code></pre>

<h2 id="words">Textos</h2>
<p>
  El widget habla 30 idiomas (<code>locale</code>; inglés y vietnamita vienen incluidos, los demás se cargan desde
  <code>@tradecanvas/chart/widget/locales</code>). <code>messages</code> cambia cualquiera de sus textos, encima de los
  del idioma. Los nombres de los indicadores no cambian.
</p>
<pre><code>{`import { de } from '@tradecanvas/chart/widget/locales'

new ChartWidget(host, {
  locale: 'de',
  messages: { ...de, 'toolbar.indicators': 'Studien' },
})`}</code></pre>

<h2>Más a fondo</h2>
<p>
  Los indicadores, herramientas de dibujo y tipos de gráfico propios se registran como <a href={href('/docs/plugins')}>plugins</a>
  y funcionan como los incluidos, también en los menús. Para una interfaz del todo tuya, usa el <code>Chart</code> sin
  interfaz: el mismo motor, sin el widget.
</p>
