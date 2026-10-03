<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Referencia de la API — Documentación de TradeCanvas</title>
  <meta name="description" content="Referencia de la API de Chart, ChartWidget, ChartGrid y la superficie principal de TradeCanvas." />
</svelte:head>

<h1>Referencia de la API</h1>
<p>Superficie pública de las clases de nivel superior: <code>Chart</code>, <code>ChartWidget</code>, <code>ChartWidgetGrid</code> y <code>ChartGrid</code>.</p>

<h2>Chart</h2>
<p>Renderizador sin interfaz. Tú pones la UI, te suscribes a los eventos y modificas el estado de forma imperativa.</p>

<h3>Creación</h3>
<pre><code>{`new Chart(host: HTMLElement, options?: ChartOptions)`}</code></pre>

<h3>Datos</h3>
<table>
  <thead><tr><th>Método</th><th>Función</th></tr></thead>
  <tbody>
    <tr><td><code>setData(data)</code></td><td>Sustituye la serie completa.</td></tr>
    <tr><td><code>appendBar(bar)</code></td><td>Añade una barra nueva; se desplaza automáticamente si está activado.</td></tr>
    <tr><td><code>appendBars(bars)</code></td><td>Añade en lote; recalcula los indicadores una sola vez.</td></tr>
    <tr><td><code>updateLastBar(bar)</code></td><td>Modifica la barra en formación.</td></tr>
    <tr><td><code>updateLastBarFromTick(tick)</code></td><td>Fusiona un tick en la última barra.</td></tr>
    <tr><td><code>getData()</code></td><td>Lee la serie OHLC sin procesar.</td></tr>
  </tbody>
</table>

<h3>Tipo de gráfico y tema</h3>
<table>
  <thead><tr><th>Método</th><th>Función</th></tr></thead>
  <tbody>
    <tr><td><code>setChartType(type)</code></td><td>Uno de los 17 tipos; consulta <a href={href('/docs/chart-types')}>Tipos de gráfico</a>.</td></tr>
    <tr><td><code>setTheme(name)</code></td><td>Cambia entre los temas integrados.</td></tr>
    <tr><td><code>setTimeframe(tf)</code></td><td>Cambia la temporalidad activa; reconecta el flujo en vivo.</td></tr>
  </tbody>
</table>

<h3>Indicadores</h3>
<table>
  <thead><tr><th>Método</th><th>Función</th></tr></thead>
  <tbody>
    <tr><td><code>addIndicator(id, params?, position?)</code></td><td>Añade un indicador superpuesto o en panel. Devuelve el id de la instancia.</td></tr>
    <tr><td><code>updateIndicator(instanceId, params)</code></td><td>Modifica un indicador activo.</td></tr>
    <tr><td><code>removeIndicator(instanceId)</code></td><td>Lo quita y libera sus recursos.</td></tr>
  </tbody>
</table>

<h3>Ejes y escala</h3>
<p>
  El eje de precio (franja derecha) y el eje de tiempo (franja inferior) admiten
  interacción directa con el puntero, con los gestos que los traders ya conocen:
</p>
<table>
  <thead><tr><th>Gesto</th><th>Efecto</th></tr></thead>
  <tbody>
    <tr><td>Arrastrar el eje de precio arriba / abajo</td><td>Comprime / expande el rango vertical de precios (desactiva la escala automática).</td></tr>
    <tr><td>Arrastrar el eje de tiempo a izquierda / derecha</td><td>Acerca / aleja el eje de tiempo.</td></tr>
    <tr><td>Doble clic en el eje de precio</td><td>Reactiva la escala automática.</td></tr>
    <tr><td>Doble clic en el eje de tiempo</td><td>Ajusta todos los datos a la vista.</td></tr>
  </tbody>
</table>
<p>
  <strong>Zona horaria.</strong> Las etiquetas del eje de tiempo y la etiqueta de
  hora de la cruz siguen por defecto la zona local del navegador; cambia a un
  desfase UTC fijo (o vuelve a la hora local) desde la hoja de configuración o
  directamente:
</p>
<pre><code>{`chart.setTimezoneOffset(-300)  // EST (UTC-5), in minutes
chart.setTimezoneOffset(330)   // IST (UTC+5:30)
chart.setTimezoneOffset(null)  // back to browser-local`}</code></pre>

<p>Los mismos efectos también están disponibles por código:</p>
<pre><code>{`chart.setAutoScale(false)  // freeze the current price range
chart.setLogScale(true)    // switch to logarithmic price scale
chart.setInvertScale(true) // upside down (Alt+I in the widget)
chart.fitContent()         // zoom out to all data
chart.scrollToEnd()
chart.setVisibleRangePreset('3M')       // 1D 5D 1M 3M 6M YTD 1Y 5Y All
chart.goToTime(Date.UTC(2025, 0, 1))    // centre that bar (Alt+G in the widget)`}</code></pre>

<p>
  <strong>Modos de la escala de precio.</strong> Además de normal y logarítmica,
  el eje puede recalcular sus etiquetas respecto a la primera barra visible:
  <code>percentage</code> muestra el cambio en %, <code>indexedTo100</code> fija
  la base en 100. Los modos normal, porcentaje e indexado comparten la misma
  geometría lineal; solo cambian las etiquetas. Se configura desde el panel de
  configuración del gráfico o directamente:
</p>
<pre><code>{`chart.setScaleMode('percentage')   // axis labels: +12.34% from first visible bar
chart.setScaleMode('indexedTo100') // first visible bar reads as 100
chart.setScaleMode('logarithmic')
chart.getScaleMode()`}</code></pre>

<h3>Perfil de volumen</h3>
<p>
  Histograma horizontal del volumen negociado, agrupado por precio, sobre el rango
  visible. Desactivado por defecto; actívalo por código o desde la hoja de
  configuración del widget:
</p>
<pre><code>{`chart.setVolumeProfileVisible(true)
chart.setVolumeProfileConfig({
  buckets: 48,        // resolution of the histogram
  widthRatio: 0.18,   // % of chart width
  opacity: 0.32,
  highlightPoC: true, // mark the highest-volume bucket
})`}</code></pre>

<h3>Marcadores de swing (pivotes)</h3>
<p>
  Marca los máximos y mínimos de swing fractales con pequeños triángulos (▼ sobre
  un pivote alto confirmado, ▲ bajo un pivote bajo). La fuerza indica cuántas
  barras deben quedar por debajo a cada lado. Actívalo desde la hoja de
  configuración o así:
</p>
<pre><code>{`chart.setPivotMarkersVisible(true)
chart.setPivotMarkersConfig({ left: 5, right: 5, showLabels: true })

// market-structure labels (HH / HL / LH / LL) instead of price
chart.setPivotMarkersConfig({ structureLabels: true })

// pure detection + classification are exported
import { findPivots, classifyPivots } from '@tradecanvas/core'
const pivots = findPivots(bars, 5, 5)        // [{ index, price, type }]
const structure = classifyPivots(pivots)     // adds label: 'HH'|'LH'|'HL'|'LL'`}</code></pre>

<h3>Sombreado de sesión (horario regular de negociación)</h3>
<p>
  Atenúa las barras fuera de la sesión regular (preapertura, poscierre o la pausa
  nocturna) para que la sesión principal destaque. Por defecto usa el horario
  regular de la renta variable de EE. UU. (09:30–16:00, hora de Nueva York, con
  horario de verano incluido); configura la ventana en minutos del día y la zona
  horaria del mercado. Un símbolo cuya fuente de datos informa de sus sesiones
  las configura por sí mismo.
</p>
<pre><code>{`chart.setSessionShadingVisible(true)
chart.setSessionShadingConfig({
  startMinute: 9 * 60 + 30,     // 09:30
  endMinute: 16 * 60,           // 16:00 (end-exclusive; end < start wraps midnight)
  timeZone: 'America/New_York', // or tzOffsetMinutes: -300 for a fixed offset
})`}</code></pre>

<h3>Niveles del periodo anterior (PDH / PDL / PDC)</h3>
<p>
  Dibuja el máximo, el mínimo y el cierre del día (o la semana) anterior, más la
  apertura del periodo actual, como líneas horizontales con etiqueta: los niveles
  de soporte y resistencia que vigilan los traders intradía. Actívalo desde la
  hoja de configuración o directamente:
</p>
<pre><code>{`chart.setPeriodLevelsVisible(true)
chart.setPeriodLevelsPeriod('week')   // 'day' (PDH/PDL/PDC) | 'week' (PWH/PWL/PWC)

// pure computation is exported
import { computePeriodLevels } from '@tradecanvas/core'
const levels = computePeriodLevels(bars, 'day')  // [{ id, label, price }]`}</code></pre>

<h3>Perfil de mercado (TPO)</h3>
<p>
  Un histograma de tiempo por precio: cada barra aporta un TPO a cada tramo de
  precio que tocó su rango, lo que revela el punto de control (el precio más
  concurrido) y el área de valor (≈70% de los TPO). Es distinto del perfil de
  volumen —pondera por tiempo, no por volumen— y se ancla a la izquierda para que
  ambos puedan mostrarse a la vez. Desactivado por defecto; actívalo desde la
  hoja de configuración o directamente:
</p>
<pre><code>{`chart.setMarketProfileVisible(true)
chart.setMarketProfileConfig({
  buckets: 48,
  widthRatio: 0.18,
  opacity: 0.32,
  valueAreaPct: 0.7,  // fraction of TPOs in the value area
  highlightPoC: true, // dashed line at the point of control
})

// split into one mini-profile per calendar-day session
chart.setMarketProfileConfig({ splitBySession: true })

// classic TPO letters per session (when zoomed in enough to be legible)
chart.setMarketProfileConfig({ splitBySession: true, letters: true })

// pure computation is exported too
import { computeMarketProfile, computeSessionProfiles } from '@tradecanvas/core'
const profile = computeMarketProfile(bars, priceMin, priceMax, { buckets: 48 })
const sessions = computeSessionProfiles(bars, priceMin, priceMax)  // per-day TPO`}</code></pre>

<h3>Táctil y móvil</h3>
<table>
  <thead><tr><th>Gesto</th><th>Acción</th></tr></thead>
  <tbody>
    <tr><td>Arrastrar con 1 dedo (área del gráfico)</td><td>Desplazar y mover la cruz</td></tr>
    <tr><td>Pellizcar con 2 dedos</td><td>Zoom alrededor del punto medio</td></tr>
    <tr><td>Mantener pulsado (~500 ms)</td><td>Fija la información OHLC en la barra (el equivalente móvil de Alt + clic)</td></tr>
    <tr><td>Arrastrar con 1 dedo dentro de la franja del eje de precio / tiempo</td><td>Escala el eje correspondiente</td></tr>
  </tbody>
</table>
<p>
  Los cuadros modales (configuración, hoja de atajos, paleta de comandos,
  búsqueda de símbolos) pasan automáticamente a una hoja inferior con asa de
  arrastre y márgenes que respetan el área segura en pantallas de menos de 640 px.
</p>

<h3>Herramienta de medición</h3>
<p>
  Mantén pulsado <kbd>Shift</kbd> y arrastra sobre el gráfico para medir barras ×
  precio entre dos puntos: la capa muestra el Δ de precio (absoluto y %), el
  número de barras y el intervalo de tiempo. La capa desaparece en cuanto sueltas
  el ratón; no se guarda en el estado persistido.
</p>

<h3>Eventos</h3>
<p>Todos los eventos están tipados mediante <code>ChartEventMap</code>:</p>
<pre><code>{`chart.on('orderPlace', e => /* OrderPlacePayload */)
chart.on('orderModify', e => /* OrderModifyPayload */)
chart.on('signalMarkerAdd', e => /* { marker } */)
chart.on('tradeZoneAdd', e => /* { zone } */)
chart.on('dataUpdate', e => /* { length } */)
chart.on('ordersChange', e => /* { orders } */)
chart.on('positionsChange', e => /* { positions } */)
chart.on('executionFill', e => /* { side, price, quantity, reason, pnl } */)
chart.on('chartContextMenu', e => /* { area, x, y, price, time } */)
chart.on('stateChange', () => /* pueden haber cambiado los dibujos, indicadores, alertas, el tipo de gráfico o el tema */)
chart.on('paneChange', e => /* { instanceId, change: 'collapsed' | 'maximized' | 'order' } */)`}</code></pre>
<p>
  Los precios que vienen del puntero se pueden ajustar a la cuadrícula del mercado con
  <code>chart.roundPrice(price)</code>: a un múltiplo del <code>minTick</code> del símbolo o,
  si no lo tiene, a su precisión. Los menús y el ticket de orden de ChartWidget lo hacen.
</p>

<h2>ChartWidget</h2>
<p>Envuelve <code>Chart</code> en una interfaz completa. La misma instancia está disponible en <code>widget.chart</code>.</p>

<pre><code>{`import { ChartWidget } from '@tradecanvas/chart/widget'

const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  historyLimit: 500,
  trading: true,
  features: { drawings: true, indicators: true },
  onReady: (chart) => { /* ... */ },
})

widget.chart.setData(...)
widget.destroy()`}</code></pre>

<h3>Atajos de teclado del widget</h3>
<table>
  <thead><tr><th>Atajo</th><th>Acción</th></tr></thead>
  <tbody>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd></td><td>Paleta de comandos (indicadores, tipos de gráfico, dibujos…)</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>P</kbd></td><td>Búsqueda de símbolos: selector difuso sobre la lista de símbolos configurada</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>S</kbd></td><td>Guarda el diseño (pide un nombre la primera vez)</td></tr>
    <tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Escribe una temporalidad (<code>5</code>, <code>15m</code>, <code>1h</code>, <code>1D</code>) y pulsa Enter (<code>intervalTyping: false</code> lo desactiva)</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>T</kbd> / <kbd>H</kbd> / <kbd>J</kbd> / <kbd>V</kbd> / <kbd>C</kbd> / <kbd>F</kbd></td><td>Línea de tendencia, línea horizontal, rayo horizontal, línea vertical, línea en cruz, retroceso de Fibonacci</td></tr>
    <tr><td><kbd>?</kbd></td><td>Muestra la hoja de atajos de teclado</td></tr>
    <tr><td><kbd>Alt</kbd> + clic en el gráfico</td><td>Fija la información OHLC en la barra bajo el cursor (muestra la diferencia con la cruz en vivo)</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>Desfija la información / cancela el dibujo</td></tr>
    <tr><td>Clic en el símbolo de la barra de herramientas</td><td>Abre el cuadro de búsqueda de símbolos</td></tr>
    <tr><td>Clic en reproducir en la barra de herramientas</td><td>Abre el control de repetición de barras (reproducir/avanzar/buscar/velocidad)</td></tr>
  </tbody>
</table>
<p>Actualiza el catálogo de búsqueda en tiempo de ejecución con <code>widget.setSymbols(['BTCUSDT', 'ETHUSDT', …])</code>.</p>

<h3>Ventana de datos</h3>
<p>
  Un panel flotante con los valores exactos de O/H/L/C/V, el cambio de la barra y
  el valor de cada indicador activo en la barra bajo el cursor; se actualiza en
  vivo al mover la cruz. Actívalo desde la paleta de comandos (<kbd>Ctrl/⌘ K</kbd> →
  "Mostrar/ocultar ventana de datos").
</p>

<h3>Vista compartible (enlaces profundos)</h3>
<p>
  Codifica la vista completa —símbolo, temporalidad, tipo de gráfico, escala de
  precio, indicadores (con sus parámetros) y dibujos— en una cadena compacta y
  apta para URL, para crear enlaces profundos. Con <code>shareUrl: true</code> el
  widget restaura un hash <code>#tcw=…</code> al cargar, y la acción "Compartir
  vista" de la paleta de comandos copia un enlace al portapapeles.
</p>
<pre><code>{`const widget = new ChartWidget(host, { shareUrl: true })

const token = widget.exportState()      // portable string
await widget.importState(token)         // restore a view
await widget.copyShareLink()            // copy "<url>#tcw=<token>"`}</code></pre>

<h3>Diseños con nombre</h3>
<p>
  El botón de diseño de la barra de herramientas guarda el gráfico con un nombre:
  símbolo, temporalidad, escala de precio, tipo de gráfico, indicadores, dibujos y
  alertas (no el tema, que sigue siendo el de quien mira). Abre, renombra y elimina
  diseños desde su menú; el diseño abierto se guarda solo a medida que cambia, y
  <kbd>Ctrl/⌘ S</kbd> lo guarda. Los diseños viven en el <code>localStorage</code> de
  este navegador salvo que indiques un <code>storage</code>: cuatro llamadas, y cada
  una puede devolver una promesa.
</p>
<pre><code>{`import { ChartWidget, type LayoutStorage } from '@tradecanvas/chart/widget'

const server: LayoutStorage = {
  list: () => api.get('/layouts'),              // [{ id, name, symbol, timeframe, updatedAt }]
  load: (id) => api.get(\`/layouts/\${id}\`),     // { ...summary, content } o null
  save: (layout) => api.put(\`/layouts/\${layout.id}\`, layout),
  remove: (id) => api.delete(\`/layouts/\${id}\`),
}

const widget = new ChartWidget(host, {
  layouts: { storage: server, autoSave: true, openLast: true },  // o false para ninguno
})

const layouts = widget.getLayoutSession()!
await layouts.saveAs('Swing BTC')
await layouts.open(id)
layouts.current()          // { id, name, … } o null
layouts.setAutoSave(false)

// Solo el contenido, para guardarlo donde quieras
const json = widget.getLayoutContent()
await widget.applyLayoutContent(json)`}</code></pre>
<p>
  <code>localStorageLayouts(prefix)</code> y <code>memoryLayouts()</code> son los dos
  almacenamientos incluidos. El contenido guardado se lee de forma defensiva: un
  diseño que no se puede interpretar se rechaza, en lugar de aplicarse a medias. Cada
  diseño registra su <code>kind</code> (<code>'chart'</code> o <code>'grid'</code>), así
  que un widget y una cuadrícula pueden compartir un mismo almacenamiento y cada uno
  lista solo los suyos. Guardar, abrir y el guardado automático se ejecutan de uno en
  uno, así que un guardado nunca acaba en un diseño abierto después de él.
</p>

<h3>Diseños por símbolo</h3>
<p>
  Por separado, guarda automáticamente en <code>localStorage</code>, por símbolo, los
  indicadores, dibujos, alertas y el tipo de gráfico:
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT',
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  adapter: new BinanceAdapter(),
  persistLayouts: true,  // or { keyPrefix: 'myapp:', debounceMs: 2000 }
})

// Reset a single symbol's layout
widget.clearSavedLayout('BTCUSDT')`}</code></pre>
<p>
  Los diseños se guardan al cambiar de símbolo y al destruir el widget, así que
  no se pierde nada cuando el usuario sale de la página.
</p>

<h3>Importación de datos con arrastrar y soltar</h3>
<p>
  Suelta un archivo CSV o JSON sobre el gráfico para cargarlo al instante.
  Activado por defecto; desactívalo con <code>dragDropImport: false</code>. El
  analizador reconoce las disposiciones de columnas habituales
  (<code>time, open, high, low, close, volume</code>), las marcas de tiempo
  ISO 8601 y los segundos/ms de Unix.
</p>
<pre><code>{`// Programmatic use
import { parseOHLCV } from '@tradecanvas/chart'

const { data, rowCount, skipped } = parseOHLCV(csvText)
chart.setData(data)`}</code></pre>

<h3>Remuestreo de temporalidades</h3>
<p>
  Pasa al widget tu serie de mayor resolución con <code>widget.setData()</code>
  y los botones de temporalidad de la barra de herramientas la agregan en el
  cliente: un solo conjunto de datos alimenta todas las resoluciones, sin volver
  a descargar nada. Está activo siempre que no haya un adaptador en vivo
  conectado; desactívalo con <code>resampleTimeframes: false</code>. Los tramos
  semanales empiezan el lunes por defecto (<code>weekStartsOn: 0</code> para el
  domingo).
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  timeframe: '1h',
  timeframes: ['5m', '15m', '1h', '4h', '1d', '1w'],
})
widget.setData(oneMinuteBars)   // base series; clicking 4h/1d/1w resamples it

// Or use the pure function directly
import { resampleOHLCV, inferTimeframeMs } from '@tradecanvas/chart'

const hourly = resampleOHLCV(oneMinuteBars, '1h')   // OHLC merged, volume summed
const fourHour = resampleOHLCV(oneMinuteBars, '4h', { weekStartsOn: 1 })`}</code></pre>
<p>
  Agrupación según el calendario: las temporalidades intradía y diarias se
  alinean con los límites de la época UTC, las semanas con el inicio de semana
  configurado y los meses / trimestres / años con los límites del calendario.
  Las barras de entrada nunca se modifican.
</p>

<h3>Lista de seguimiento lateral</h3>
<p>
  Panel lateral derecho opcional que muestra todos los símbolos configurados con
  el último precio, el cambio en % y un minigráfico:
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT',
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  adapter: new BinanceAdapter(),
  watchlist: true,
})

// Feed non-active rows from your own data source
widget.setWatchlistEntry('ETHUSDT', {
  lastPrice: 3245.12,
  refPrice: 3180.50,
  sparkline: [3180, 3195, 3210, ...],
})`}</code></pre>

<h3>Herramientas de dibujo favoritas</h3>
<p>
  Fija las herramientas de dibujo que más usas en una franja en la parte superior
  de la barra lateral. Haz clic derecho en cualquier herramienta (en el menú de su
  grupo o en la propia franja) para fijarla o desfijarla; la selección se guarda
  en localStorage. Define los favoritos iniciales con
  <code>drawingFavorites</code>:
</p>
<pre><code>{`new ChartWidget(host, {
  drawingFavorites: ['trendLine', 'horizontalLine', 'fibRetracement', 'rectangle'],
})`}</code></pre>

<h3>Estilo de dibujo y plantillas</h3>
<p>
  El botón de paleta de la barra lateral de dibujo abre un menú de estilo: elige
  el color, el grosor y el estilo de línea del próximo dibujo (y del
  seleccionado), y guarda <strong>plantillas</strong> con nombre en localStorage
  para reutilizarlas con un clic. Equivalentes por código:
</p>
<pre><code>{`chart.setDrawingStyle({ color: '#e8505b', lineWidth: 2, lineStyle: 'dashed' })
chart.getDrawingStyle()
chart.setSelectedDrawingStyle({ color: '#1fa874' })  // restyle the selected drawing`}</code></pre>

<h3>Árbol de objetos</h3>
<p>
  El botón de capas de la barra de herramientas abre un panel con el árbol de
  objetos, que lista todos los indicadores y dibujos activos. Los indicadores se
  pueden quitar; cada dibujo se puede mostrar / ocultar, bloquear / desbloquear,
  configurar y eliminar, y los grupos aparecen con sus dibujos debajo. Activado
  por defecto; desactívalo con <code>objectTree: false</code>.
  Los controles de dibujo corresponden a:
</p>
<pre><code>{`chart.getDrawings()                 // DrawingState[] (id, type, visible, locked)
chart.setDrawingVisible(id, false)  // hide a single drawing
chart.setDrawingLocked(id, true)    // lock it from edits
chart.removeDrawing(id)
chart.groupDrawings(ids, 'Weekly levels')  // se ocultan, bloquean y seleccionan juntos
chart.renameDrawingGroup(groupId, 'Old highs')
chart.getActiveIndicators()         // active indicator instances
chart.updateIndicator(instanceId, { period: 50 })  // re-tune params live
chart.removeIndicator(instanceId)`}</code></pre>
<h3>Configuración y menú del dibujo</h3>
<p>
  Haz doble clic en un dibujo, o usa su engranaje en el árbol de objetos, para
  abrir su configuración: el estilo, la configuración propia de la herramienta
  (niveles de Fibonacci, extensiones, etiquetas…) y sus puntos en la zona horaria
  del gráfico. Haz clic derecho en un dibujo para ver su menú: configuración, una
  alerta en su línea, orden, agrupar, bloquear, ocultar, duplicar y eliminar. La
  barra lateral también tiene un borrador, una herramienta de zoom y un imán que
  puede estar desactivado, débil o fuerte. Consulta
  <a href={href('/docs/drawing-tools')}>Herramientas de dibujo</a> para ver la API que hay debajo.
</p>

<p>
  El botón de engranaje de cada fila de indicador abre un <strong>cuadro de
  configuración</strong> que examina los parámetros del indicador (números,
  interruptores, colores) y aplica los cambios en vivo mediante
  <code>updateIndicator</code>: no hace falta quitarlo y volver a añadirlo para
  cambiar un periodo o un color.
</p>
<p>
  La sección <strong>Comparar</strong> del árbol de objetos superpone otros
  símbolos como líneas normalizadas. Con un adaptador en vivo, el botón + abre el
  selector de símbolos, descarga el historial de ese símbolo mediante
  <code>adapter.fetchHistory</code> y lo añade en modo porcentaje (para que
  símbolos con precios muy distintos compartan un eje). Las comparaciones se
  vuelven a descargar automáticamente al cambiar de temporalidad. Equivalentes
  por código:
</p>
<pre><code>{`widget.addCompareSymbol('ETHUSDT')   // fetches + overlays (needs an adapter)

// or drive the chart directly with your own data
chart.addCompareSymbol('ETHUSDT', 'ETH', ethBars, '#627eea')
chart.setCompareMode('percent')      // 'percent' | 'absolute'
chart.removeCompareSymbol('ETHUSDT')`}</code></pre>

<h3>Alertas de precio</h3>
<p>
  Además de un nivel, una alerta puede comparar una línea con otra (el precio cruzando una
  media móvil, el MACD cruzando su señal), saltar con un movimiento de cierto porcentaje en
  cierto número de barras (de 2 a 500), mirar solo las barras cerradas (sin saltar por una
  mecha que vuelve) y vencer. El panel de alertas del widget tiene todo esto; desde código
  son el último argumento de <code>addAlert</code>. Las alertas se comprueban con cada
  precio, venga de <code>setCurrentPrice</code> o de una fuente conectada, junto con las
  líneas que vigilan:
</p>
<pre><code>{`const ema = chart.addIndicator('ema', { period: 50 })
const rsi = chart.addIndicator('rsi')
chart.addAlert(NaN, 'crossingUp', 'above the 50 EMA', 'price', undefined, { target: \`\${ema}:value\` })
chart.addAlert(NaN, 'movesUp', 'pump', 'price', undefined, { percent: 5, bars: 12 })
chart.addAlert(70, 'greaterThan', 'RSI closed above 70', \`\${rsi}:value\`, 'RSI', { onBarClose: true })
chart.addAlert(64_000, 'crossing', 'today only', 'price', undefined, { expiresAt: Date.now() + 86_400_000 })

chart.on('alertExpired', (e) => e.payload)   // it reached its time without firing
chart.on('alertTriggered', (e) => e.payload)  // { id, condition, channel, target?, percent?, bars?, … }`}</code></pre>
<p>
  La campana de la barra de herramientas abre un panel flotante para añadir,
  listar y eliminar alertas de precio; cuando una se activa aparece un aviso.
  Las líneas de alerta también se pueden <strong>arrastrar</strong>: toma una en
  el gráfico y deslízala para cambiar su precio (al mover una alerta se vuelve a
  armar). Activado por defecto; desactívalo con <code>alerts: false</code>.
  Contrólalo por código con la API de <code>Chart</code> y los eventos de alerta
  tipados:
</p>
<pre><code>{`// Add from code (condition: 'crossing' | 'crossingUp' | 'crossingDown'
//                          | 'greaterThan' | 'lessThan')
const id = chart.addAlert(64200, 'crossingUp', 'breakout')
chart.removeAlert(id)
chart.getAlerts()      // PriceAlert[]
chart.saveAlerts('tcw:alerts:BTCUSDT')   // localStorage persistence
chart.loadAlerts('tcw:alerts:BTCUSDT')

// React to triggers
chart.on('alertTriggered', (e) => {
  console.log('hit', e.payload.price, e.payload.message)
})
// also: 'alertAdd' / 'alertRemove' / 'alertUpdate' (fired on drag)

// Indicator alerts: bind to an indicator line via channel '<instanceId>:<key>'.
// In the widget, the alerts panel's source dropdown lists every active line.
const ema = chart.addIndicator('rsi')
chart.addAlert(70, 'crossingUp', 'RSI overbought', \`\${ema}:rsi\`, 'RSI')`}</code></pre>
<p>
  Activa un sonido y/o una notificación de escritorio cuando salte una alerta
  (ambos desactivados por defecto). <code>sound: true</code> reproduce un pitido
  integrado; pasa una URL para usar uno propio. <code>desktop: true</code> usa la
  Notification API y pide permiso la primera vez.
</p>
<pre><code>{`new ChartWidget(host, {
  alertNotifications: { sound: true, desktop: true },
})`}</code></pre>

<h3>Tus propios botones y entradas de menú</h3>
<p>
  Añade botones a la barra de herramientas (un icono integrado o un elemento tuyo,
  texto, un interruptor) y entradas a los menús del clic derecho del gráfico, después
  de las del propio widget.
</p>
<pre><code>{`const news = widget.addToolbarButton({
  id: 'news',
  label: 'News',
  icon: 'bell',            // o un elemento <svg>; o text: 'News'
  side: 'right',           // 'left' se coloca junto a los controles del gráfico
  toggle: true,
  onClick: () => news?.setActive(togglePanel()),
})
news?.setText('3')
news?.remove()

new ChartWidget(host, {
  chartMenuItems: ({ area, price, time }) => area === 'plot' && price !== undefined
    ? [{ label: \`Copy \${price.toFixed(2)}\`, icon: 'check', onSelect: () => copy(price) }]
    : [],
})`}</code></pre>

<h2>ChartWidgetGrid</h2>
<p>
  Varios widgets de gráfico uno junto a otro, cada uno con su propio símbolo,
  temporalidad, indicadores y dibujos. Una barra encima de ellos elige la disposición,
  vincula los gráficos y guarda toda la cuadrícula como un diseño con nombre. El
  último gráfico pulsado es el activo (con contorno).
</p>
<pre><code>{`import { ChartWidgetGrid } from '@tradecanvas/chart/widget'

const grid = new ChartWidgetGrid(host, {
  layout: '2x2',                                   // '1x1' '1x2' '2x1' '2x2' '1x3' '3x1' '2x3' '3x2'
  widget: { timeframe: '1h' },                    // todos los gráficos
  adapter: () => new BinanceAdapter(),            // uno por gráfico: un adaptador mantiene un único flujo
  cells: [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT' }, { symbol: 'SOLUSDT' }, { symbol: 'BNBUSDT' }],
  sync: { crosshair: true, time: false, symbol: false, interval: false, drawings: false },
})

grid.setLayout('1x2')
grid.setSync({ interval: true })   // alinea los demás con el gráfico activo
grid.getActiveWidget().getChart()
grid.getLayoutSession()?.saveAs('Majors')

// Cada gráfico según se crea (al inicio y al crecer la cuadrícula)
new ChartWidgetGrid(host, {
  onChartAdd: (widget, index) => widget.getChart().addIndicator('ema', { period: 21 }),
})`}</code></pre>
<p>
  La sincronización de la cruz muestra en todos los gráficos la hora bajo el puntero;
  la del tiempo desplaza y amplía los demás junto con el gráfico que se está usando;
  los dibujos se copian a los gráficos que muestran el mismo símbolo (al activarla se
  juntan sus dibujos, sin perder ninguno). Los gráficos que sobran cuando la cuadrícula
  se reduce se guardan aparte, se conservan en el diseño guardado y vuelven tal como
  estaban cuando crece de nuevo; un gráfico totalmente nuevo se abre con el símbolo y
  la temporalidad del gráfico activo cuando estos están sincronizados.
</p>

<h2>ChartGrid</h2>
<p>Disposiciones de varios gráficos sin interfaz (sin barra de herramientas) sincronizados; consulta <code>ChartWidgetGrid</code> para la interfaz completa.</p>
<pre><code>{`import { ChartGrid } from '@tradecanvas/chart'

const grid = new ChartGrid(host, { layout: '2x2', theme: 'dark' })
// Un adaptador por gráfico: un adaptador mantiene un único flujo
await grid.connectAll(() => new BinanceAdapter(), ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'], '5m')
grid.setLayout('1x2')`}</code></pre>

<p>Disposiciones: <code>'1x1'</code>, <code>'1x2'</code>, <code>'2x1'</code>, <code>'2x2'</code>, <code>'1x3'</code>, <code>'3x1'</code>, <code>'2x3'</code>, <code>'3x2'</code>.</p>
