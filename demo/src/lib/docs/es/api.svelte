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

<p id="live-price">
  Una barra de <code>appendBar</code>, <code>appendBars</code> o <code>updateLastBar</code>, y un tick, son el precio en vivo: la línea de precio, las alertas y el P&amp;L de las órdenes lo siguen, igual que siguen a un stream conectado y a <code>setCurrentPrice</code>. Una barra nueva envía <code>dataUpdate</code>; un tick en la barra en formación, no.
</p>

<p id="bar-times">
  Los tiempos de las barras son milisegundos o segundos de época, una sola unidad para toda la serie. El gráfico la lee una vez, de la barra más reciente: <code>barTimeUnit(data)</code> da 1 (milisegundos, desde 1e11) o 1000 (segundos). Así una serie en milisegundos conserva también sus fechas anteriores a 2001, aunque queden por debajo de 1e12. Mantenga cada serie en una unidad; los tiempos que el gráfico devuelve (eventos, <code>getData()</code>) están en ella.
</p>

<h3>Tipo de gráfico y tema</h3>
<table>
  <thead><tr><th>Método</th><th>Función</th></tr></thead>
  <tbody>
    <tr><td><code>setChartType(type)</code></td><td>Uno de los 18 tipos; consulta <a href={href('/docs/chart-types')}>Tipos de gráfico</a>.</td></tr>
    <tr><td><code>getChartType()</code></td><td>El tipo con que se dibuja el gráfico (<code>'candlestick'</code> por defecto).</td></tr>
    <tr><td><code>setTheme(name | theme)</code></td><td>Cambia entre los temas integrados, o fija el tuyo. <code>getTheme()</code> lo devuelve tal como se fijó.</td></tr>
    <tr><td><code>applyOverrides(patch, {'{ layer }'})</code></td><td>Da estilo a cualquier parte del gráfico por clave (<code>'grid.vertical.visible'</code>, <code>'series.candlestick.upColor'</code>…); <code>null</code> quita una clave. Ver <a href={href('/docs/styling#overrides')}>Estilos</a>.</td></tr>
    <tr><td><code>setOverrides(overrides, {'{ layer }'})</code> · <code>resetOverrides(keys?, {'{ layer }'})</code></td><td>Toda una capa de una vez; quita claves (o todas).</td></tr>
    <tr><td><code>getOverrides({'{ layer }'})</code> · <code>getStyle()</code> · <code>getStyleValue(key)</code></td><td>Los overrides de una capa; el aspecto resuelto; lo que resulta de una clave.</td></tr>
    <tr><td><code>setTimeframe(tf)</code></td><td>Cambia la temporalidad activa; reconecta el flujo en vivo.</td></tr>
  </tbody>
</table>

<h3>Renderizador</h3>
<table>
  <thead><tr><th>Método</th><th>Propósito</th></tr></thead>
  <tbody>
    <tr><td>Opción <code>renderer</code></td><td><code>'canvas'</code> (predeterminado), <code>'webgl'</code> o <code>'auto'</code> (WebGL solo con una GPU de hardware).</td></tr>
    <tr><td><code>setRenderer(mode)</code></td><td>Cambia en tiempo de ejecución. Devuelve lo que dibuja ahora: <code>'canvas'</code> si no hay WebGL 2.</td></tr>
    <tr><td><code>getRenderer()</code></td><td><code>'canvas'</code> o <code>'webgl'</code>.</td></tr>
  </tbody>
</table>
<p>Qué dibuja la GPU, y las cifras: <a href={href('/docs/performance')}>Rendimiento → Renderizador WebGL</a>.</p>

<h3>Indicadores</h3>
<table>
  <thead><tr><th>Método</th><th>Función</th></tr></thead>
  <tbody>
    <tr><td><code>addIndicator(id, params?, position?)</code></td><td>Añade un indicador superpuesto o en panel. Devuelve el id de la instancia.</td></tr>
    <tr><td><code>updateIndicator(instanceId, params)</code></td><td>Modifica un indicador activo.</td></tr>
    <tr><td><code>removeIndicator(instanceId)</code></td><td>Lo quita y libera sus recursos.</td></tr>
    <tr><td><code>removeIndicators(instanceIds)</code></td><td>Quita varios, en un solo paso de deshacer.</td></tr>
    <tr><td><code>updateIndicatorStyle(instanceId, style)</code></td><td>Colores, grosores, opacidad, y el trazo y la visibilidad de cada plot (<code>plots: {`{ signal: { lineStyle: 'dashed' } }`}</code>).</td></tr>
    <tr><td><code>setIndicatorDefaults(id, style | null)</code></td><td>Con qué estilo empiezan desde ahora los indicadores de un tipo.</td></tr>
    <tr><td><code>setIndicatorIntervals(instanceId, intervals | null)</code> · <code>getIndicatorIntervals(instanceId)</code></td><td>Las temporalidades en las que se muestra (<code>{`{ minutes: false, hours: [1, 4] }`}</code>); <code>null</code>: todas. Se guarda con el diseño.</td></tr>
    <tr><td><code>setDataTimeframe(timeframe | null)</code></td><td>La temporalidad de las barras dadas con <code>setData</code>: la línea de título de la leyenda la nombra, y los indicadores limitados a algunas temporalidades la siguen.</td></tr>
    <tr><td><code>setPaneStyle(instanceId, {'{ background, separator }'} | null)</code> · <code>getPaneStyle(instanceId)</code></td><td>El aspecto propio de un panel, guardado con su indicador.</td></tr>
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
  <strong>Zona horaria.</strong> El eje de tiempo, la hora de la cruz, el tooltip, las
  separaciones de día y los rangos predefinidos siguen por defecto la zona del navegador.
  Dale al gráfico una zona IANA (con el horario de verano), un desfase fijo en minutos al
  este de UTC, o <code>'exchange'</code> para la zona del símbolo
  (<code>SymbolInfo.timeZone</code>) o, si no la tiene, la de su mercado: con la opción
  <code>timeZone</code>, desde la configuración del widget o directamente:
</p>
<pre><code>{`new Chart(host, { timeZone: 'America/New_York' }) // desde el inicio

chart.setTimeZone('America/New_York')  // la hora de Nueva York, con el horario de verano
chart.setTimeZone(330)                 // UTC+5:30, en minutos
chart.setTimeZone(null)                // la del navegador
chart.setTimeZone('exchange')          // la zona del símbolo, si no la de su mercado
chart.getTimeZone()                    // 'exchange', tal como se fijó
chart.getEffectiveTimeZone()           // la zona que representa: 'Asia/Ho_Chi_Minh' en HOSE`}</code></pre>
<p>
  Los métodos y tipos del gráfico la escriben <code>timeZone</code>, como
  <code>Intl.DateTimeFormat</code>. Los nombres anteriores siguen funcionando y quedan obsoletos:
  <code>setTimezone</code>, <code>getTimezone</code>, <code>getEffectiveTimezone</code>,
  <code>getExchangeTimezone</code>, <code>setTimezoneOffset</code>, <code>EXCHANGE_TIMEZONE</code> y
  <code>SymbolInfo.timezone</code> (un símbolo que da ambos se lee por su <code>timeZone</code>).
</p>

<p>Los mismos efectos también están disponibles por código:</p>
<pre><code>{`chart.setAutoScale(false)  // freeze the current price range
chart.setLogScale(true)    // switch to logarithmic price scale
chart.setInvertScale(true) // upside down (Alt+I in the widget)
chart.fitContent()         // zoom out to all data (Alt+R in the widget, with auto scale)
chart.scrollToEnd()
chart.setVisibleRangePreset('3M')       // 1D 5D 1M 3M 6M YTD 1Y 5Y All
chart.setMinBarUnit(0.05)               // narrower bars, so 'All' fits a long series (0.25 by default)
chart.goToTime(Date.UTC(2025, 0, 1))    // centre that bar (Alt+G in the widget)
chart.setVisibleRange(from, to)         // the bars between two times, edge to edge (Go to's Custom range)
chart.getVisibleTimeRange()             // { from, to }: the first and last bars on screen, or null`}</code></pre>
<p id="long-ranges">
  <strong>Rangos largos.</strong> El hueco de una barra nunca es más estrecho que 0,25 px, así que un rango más largo (26 años de diario en un portátil) muestra su parte más reciente. En el widget, un rango largo de la barra de rangos cambia a la temporalidad cuyas barras caben, a 2 px o más cada una: 5Y de diario pasa a semanal, All a mensual; un rango corto vuelve a la temporalidad que eligió, nunca más fina. Solo cambia a temporalidades que su fuente sirve (o a las que se agregan las barras que hay). <code>{`features: { 'statusBar.rangeTimeframe': false }`}</code> mantiene la temporalidad. Con un <code>Chart</code> directo, <code>minBarUnit</code> (opción, o <code>setMinBarUnit</code>) deja bajar hasta 0,02 px, dibujando columna de píxel a columna.
</p>

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

<h3>Formatos de precio y de hora</h3>
<p>
  Los precios pueden mostrarse a tu manera, o en fracciones de punto, como se cotizan los bonos y sus
  futuros (<code>101'16</code> es 101 y 16/32). El formato llega a todo lo que muestra un precio en la
  escala de precio: eje, cruz, etiqueta del último precio, leyenda, información emergente, órdenes,
  alertas y etiquetas de los dibujos; el eje coloca sus marcas en fracciones enteras y
  <code>roundPrice</code> redondea a ellas. Los paneles de indicadores conservan sus propios números.
  Sin un formato propio, los precios se agrupan según la configuración regional de números; las etiquetas de las marcas
  del eje muestran solo los decimales que pide su paso (73,500), mientras que el último precio, la cruz y las etiquetas
  junto al eje muestran todos los decimales. Las horas también pueden mostrarse a tu manera; al formateador se le indica qué tipo de etiqueta es.
</p>
<pre><code>{`new Chart(host, { priceFormat: { denominator: 32 } })                    // 101'16
chart.setPriceFormat({ denominator: 32, subDenominator: 2 })            // 101'165: 16½ 32nds
chart.setPriceFormat((p) => '$' + p.toFixed(2))
chart.setPriceFormat(null)                                              // decimals again

chart.setTimeFormatter((time, { kind, timeZone }) =>
  // kind: 'year', 'month', 'day' (the step a label starts), 'time' (within a day), 'crosshair'
  new Intl.DateTimeFormat('en-GB', { timeZone: timeZone ?? undefined, hour: '2-digit', minute: '2-digit' }).format(time))`}</code></pre>

<h3 id="axis-labels">Cómo eligen sus etiquetas los ejes</h3>
<p>
  El eje de tiempo etiqueta las barras que empiezan los mayores pasos del calendario: un año (en negrita), un mes, un día, una hora redonda, a 80 px como mínimo unas de otras. Así a 5Y se lee <code>2022 · Jul · 2023</code>, en un mes <code>Oct · 8 · 15</code>, dentro de un día <code>12:00 · 18:00</code>. Las etiquetas pertenecen a las barras, no a la pantalla: al desplazarse se mueven con ellas, y el historial cargado delante las deja donde estaban. A la izquierda de la barra más antigua no hay ninguna. Los nombres de mes siguen <code>setNumberLocale</code> y las líneas de la cuadrícula van donde están las etiquetas.
</p>
<p>
  La escala de precios pone tantas etiquetas como caben en su altura, a 30 px como mínimo, en la fluctuación mínima del mercado. En escala logarítmica su paso crece con el precio, así que abajo hay etiquetas igual que arriba; en una escala de porcentaje o indexada son porcentajes o puntos de índice redondos desde la base. Los paneles de indicadores también cuentan sus etiquetas según su altura.
</p>

<h3>Mercados: fluctuación mínima, límites y sesiones</h3>
<p>
  <code>setMarket</code> le da al gráfico las reglas de una bolsa: colores de las velas, decimales, la
  fluctuación mínima (que puede depender del precio), el precio techo y el precio suelo del día, y el
  lote. <code>roundPrice</code> y <code>getPriceStep</code>
  siguen la fluctuación del tramo de cada precio, así que los precios de los menús del gráfico son
  siempre válidos, y el ticket de orden del widget comprueba la orden según la fluctuación, los límites
  del día y los lotes completos. Un preajuste también lleva las sesiones y la zona horaria de la
  bolsa, para <code>getCurrentSession</code> y tu propio código; el sombreado de sesión y el horario
  extendido del gráfico vienen de <code>setSymbolInfo</code>. Hay preajustes para las bolsas de Vietnam según sus reglas de mayo de
  2025: HOSE (pasos de 10, 50 o 100 dongs según el precio, ±7%), sus ETF y warrants cubiertos
  (10 dongs), HNX (±10%, con una sesión posterior al cierre), UPCoM (±15%) y los futuros sobre el
  índice VN30 (0,1 puntos por paso, ±7%, desde las 8:45); acciones en lotes de 100, verde al alza y
  rojo a la baja, techo morado, suelo cian y referencia amarilla. Sus precios están en miles de dongs,
  como los muestran las pizarras de precios; <code>scaleMarketPrices(preset, 1000)</code> lee los
  precios en dongs.
</p>
<pre><code>{`import {
  MARKET_HOSE, scaleMarketPrices, priceStepAt, roundToPriceStep, getCurrentSession,
  vn30fContracts, vn30fLastTradingDay,
} from '@tradecanvas/chart'

chart.setMarket(MARKET_HOSE)                 // o scaleMarketPrices(MARKET_HOSE, 1000) para 25350
chart.setTimeZone('exchange')                // el eje en la zona del mercado: Asia/Ho_Chi_Minh
chart.setPriceLimits(25.35)                  // la referencia: el cierre de ayer
chart.getPriceLimits()                       // { ceiling: 27.1, floor: 23.6, reference: 25.35 }
chart.roundPrice(25.37)                      // 25.35, un paso de 50 dongs
chart.getPriceStep(9.5)                      // 0.01 por debajo de 10.000 dongs

// Las reglas por separado
priceStepAt(25.35, MARKET_HOSE)              // 0.05
roundToPriceStep(10.486, MARKET_HOSE, 'down') // 10.45
getCurrentSession(MARKET_HOSE.sessions, Date.now(), MARKET_HOSE.timeZone) // { name: 'ATC', type: 'preClose', … }, solo por la hora

// Futuros del VN30: los cuatro contratos listados y su último día de negociación
vn30fContracts(Date.now())                   // [{ symbol: 'VN30F2611', lastTradingDay: '2026-11-19', … }, …]
vn30fLastTradingDay(2026, 12, (day) => holidays.has(day)) // el tercer jueves, antes si es festivo`}</code></pre>
<p>
  Un mercado propio es un <code>MarketConfig</code>: <code>priceStep</code>, o
  <code>priceSteps: [{'{'} from, step {'}'}]</code> por tramos, <code>priceLimits</code>,
  <code>volumeUnit</code> (el lote), <code>sessions</code>, <code>timeZone</code> y
  <code>colorScheme</code>. El <code>minTick</code> propio de un símbolo va por delante de la
  fluctuación del mercado. Las bolsas cambian sus reglas de vez en cuando; contrasta un preajuste con
  las reglas vigentes de tu bolsa antes de confiar en él.
</p>

<h3 id="comparing-symbols">Comparar símbolos</h3>
<p>
  El cambio porcentual de otro símbolo en la escala de precio (<code>addCompareSymbol</code>), o su
  precio en una escala propia, en un panel propio, o el diferencial o el ratio entre el cierre del
  gráfico y ese símbolo; estos últimos son indicadores (<code>compareSymbol</code>,
  <code>spread</code>), con leyenda, etiquetas de valor, alertas y diseños guardados como cualquier
  otro. Las barras del otro símbolo se alinean con las del gráfico por tiempo. El gráfico pide las
  barras que necesita; vuelve a dárselas tras un cambio de temporalidad. <code>correlation</code> (de los
  cierres) y <code>correlationlog</code> (de los rendimientos barra a barra) leen el otro símbolo del mismo
  modo, de −1 a 1.
</p>
<pre><code>{`chart.addCompareSymbol('eth', 'ETHUSDT', ethBars, '#7c4dff')   // percent change, on this scale
chart.addIndicator('compareSymbol', { symbol: 'ETHUSDT' }, 'bottom', { scale: 'left' })  // own scale
chart.addIndicator('spread', { symbol: 'ETHUSDT', mode: 'ratio' })                      // own pane
chart.addIndicator('correlation', { symbol: 'ETHUSDT', length: 20 })                    // −1 to 1, own pane

chart.on('symbolSeriesRequest', async ({ payload }) =>
  chart.setSymbolSeries(payload.symbol, await adapter.fetchHistory(payload.symbol, '1h', 1000)))
chart.getRequiredSymbols()                           // what to fetch again on a new interval
chart.setPaneScale(spreadId, { percent: true })     // a pane in percent of its first value`}</code></pre>
<p>
  En ChartWidget, Comparar en la barra de herramientas (y el + del árbol de objetos) abre el diálogo de comparar: busca
  un símbolo, elige cómo mostrarlo en <strong>Añadir como</strong> (cambio porcentual, escala propia, panel propio,
  diferencial, ratio, o la correlación de precios o de rendimientos) y añade tantos como quieras. Lo que ya se compara
  aparece primero, cada uno con su modo y un botón para quitarlo. La próxima vez, el diálogo se abre con el último modo usado.
</p>

<h3>Exportar datos</h3>
<p>
  Las barras en CSV o JSON, con cada línea de indicador en su propia columna y con el nombre que le da
  la leyenda. ChartWidget tiene <strong>Exportar datos (CSV)</strong> en el menú del clic derecho del
  gráfico.
</p>
<pre><code>{`chart.exportAllData('csv', 'btc-1h.csv')                 // every bar loaded
chart.exportVisibleData('json', undefined, { indicators: false })
const text = chart.getExportText('csv', { range: 'visible' })
const { bars, columns } = chart.getExportData()          // columns: { name, values }[]`}</code></pre>

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
<p>
  <strong>Horario extendido.</strong> Al desactivarlo, las barras fuera del horario regular del
  símbolo (<code>SymbolInfo.sessions</code> en su <code>timeZone</code>) salen del gráfico; se guardan
  aparte, también las barras en vivo y las páginas del historial, y vuelven al activarlo. Las barras de
  un día o más se quedan como están.
</p>
<pre><code>{`chart.setSymbolInfo({ symbol: 'AAPL', timeZone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] })
chart.setExtendedHours(false)     // or new Chart(host, { extendedHours: false })
chart.isExtendedHoursVisible()`}</code></pre>

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
    <tr><td>Tocar</td><td>Clic: <code>click</code>, <code>barClick</code>, un marcador de señal; sobre un dibujo, lo selecciona</td></tr>
    <tr><td>Doble toque</td><td>Doble clic: sobre un eje, lo restablece; sobre un dibujo, abre sus ajustes</td></tr>
    <tr><td>Arrastrar con 1 dedo sobre un dibujo</td><td>Moverlo, o cambiar su forma con un tirador del seleccionado</td></tr>
    <tr><td>Con una herramienta de dibujo: tocar, tocar — o pulsar, arrastrar, soltar</td><td>Colocar sus puntos; pulsar, arrastrar y soltar dibuja una línea de dos puntos de una vez</td></tr>
    <tr><td>Mantener pulsado sobre un dibujo</td><td>Su menú (como un clic derecho)</td></tr>
    <tr><td>Arrastrar con 1 dedo una línea de alerta, orden o bracket, o un divisor de panel</td><td>Arrastrarla</td></tr>
  </tbody>
</table>
<p>
  Un dedo alcanza más lejos que un ratón: unos 16 px hasta una línea y 22 px hasta un tirador, frente a 8. En una página que se desplaza, <code>pageScroll: true</code> deja a la página los deslizamientos verticales y la rueda del ratón: el gráfico se desplaza con un deslizamiento lateral y hace zoom con dos dedos o Ctrl + rueda (un pellizco del trackpad), mientras que las pulsaciones sobre dibujos, líneas y ejes siguen siendo del gráfico. <code>chart.setPageScroll(on)</code> lo cambia en marcha.
</p>
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
chart.on('dataUpdate', e => /* { kind: 'bars', length } con setData y barras nuevas; o kind 'alert' | 'bracket' | 'connection' | 'error' */)
chart.on('ordersChange', e => /* { orders } */)
chart.on('positionsChange', e => /* { positions } */)
chart.on('executionFill', e => /* { side, price, quantity, reason, pnl } */)
chart.on('chartContextMenu', e => /* { area, x, y, price, time } */)
chart.on('stateChange', () => /* pueden haber cambiado los dibujos, indicadores, alertas, el tipo de gráfico o el tema */)
chart.on('paneChange', e => /* { instanceId, change: 'collapsed' | 'maximized' | 'order' } */)
chart.on('chartTypeChange', e => /* { type, previous } */)
chart.on('symbolChange', e => /* { symbol, previous } */)
chart.on('timeframeChange', e => /* { timeframe, previous } */)
chart.on('historyChange', e => /* { canUndo, canRedo } */)
chart.on('drawingSelect', e => /* { ids, primary } */)
chart.on('rendererChange', e => /* { renderer: 'canvas' | 'webgl', reason?: 'unsupported' | 'contextLost' | 'contextRestored' | 'limit' } */)`}</code></pre>

<h3>Deshacer tus propios cambios</h3>
<p>
  <code>recordUndo</code> pone un cambio tuyo en el historial de deshacer del gráfico, junto con sus dibujos e
  indicadores: Ctrl/Cmd+Z llama a <code>undo</code> y rehacer llama a <code>redo</code>. Los cambios sobre el mismo
  <code>subject</code> hechos seguidos cuentan como un solo paso. ChartWidget registra así su configuración y su tipo de gráfico.
</p>
<pre><code>{`const before = panel.color
panel.color = 'red'
chart.recordUndo({ subject: 'panel-color', undo: () => (panel.color = before), redo: () => (panel.color = 'red') })`}</code></pre>

<h3>Teclado y lectores de pantalla</h3>
<p>
  Un gráfico con el foco se desplaza con las flechas (Mayús para diez barras), hace zoom con ↑/↓ o +/− y va al
  principio y al final con Inicio y Fin. Para los lectores de pantalla es una aplicación con un resumen
  (símbolo, tipo, temporalidad, último precio); cuando las teclas mueven la vista, dice lo que hay en pantalla, y
  la coma y el punto leen las barras una a una. <code>a11y.labels</code> lo pone en tu idioma;
  <code>a11y: false</code> lo quita. <code>scrollBars(n)</code> y <code>selectDrawing(id)</code>
  hacen desde el código lo que hacen las teclas y un clic.
</p>
<pre><code>{`new Chart(host, { a11y: { labels: { role: 'gráfico', summary: '{what}. Último precio {close}.' } } })`}</code></pre>
<p>
  Los precios que vienen del puntero se pueden ajustar a la cuadrícula del mercado con
  <code>chart.roundPrice(price)</code>: a un múltiplo del <code>minTick</code> del símbolo o,
  si no lo tiene, a su precisión. Los menús, el ticket de orden y la pestaña Coordinates de los ajustes de dibujo de ChartWidget lo hacen.
  <code>chart.getPriceStep()</code> devuelve ese paso.
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
  features: { 'toolbar.replay': false },   // los interruptores del widget: ver Personalización
  onReady: (chart, widget) => { /* once built, just after new ChartWidget() returns */ },
})

widget.chart.setData(...)
widget.destroy()`}</code></pre>

<h3 id="bars">Las barras</h3>
<table>
  <thead><tr><th>Barra</th><th>Qué lleva</th></tr></thead>
  <tbody>
    <tr><td>Barra de herramientas</td><td>
      El símbolo y su información; las temporalidades (las fijadas como botones, y un menú con todas por unidad, de minutos
      a meses, con una estrella en cada una para fijarla); el tipo de gráfico como su icono; Indicadores (un diálogo: ver <a href={href('/docs/indicators')}>Indicadores</a>), y Comparar cuando hay un adaptador de datos;
      deshacer y rehacer. A la derecha: diseños, repetición de barras, un menú Operar (una orden nueva, órdenes bracket
      largas y cortas, la escalera de profundidad y el panel de cuenta), y luego captura de pantalla, configuración, el
      tema y pantalla completa; también las alertas y el árbol de objetos donde no hay riel (en un móvil, o con
      <code>{`features: { dock: false }`}</code>). Lo que no cabe se pliega bajo “Más”.
    </td></tr>
    <tr><td>Herramientas de dibujo</td><td>
      El menú de cada grupo indica los atajos de sus herramientas (Alt+T una línea de tendencia) y tiene una estrella en
      cada fila para fijar la herramienta arriba. Abajo: el estilo de dibujo, el imán, la goma, el zoom de área, mantener
      el modo de dibujo, bloquear todo, ocultar todo y borrar todo.
    </td></tr>
    <tr><td>Barra de estado</td><td>
      Los rangos predefinidos e ir a fecha; el estado del mercado, la conexión, un reloj en la zona horaria de la vista
      (abre las zonas para elegir) y los interruptores <code>%</code> · <code>log</code> · <code>auto</code> de la escala
      de precio.
    </td></tr>
    <tr><td>Sobre un dibujo seleccionado</td><td>
      Su color, grosor y estilo de línea, ajustes, una alerta, bloqueo, más y borrar. Arrastra la barra por su asa y se
      queda ahí para el siguiente dibujo; con doble clic en el asa vuelve sobre el dibujo.
    </td></tr>
    <tr><td>Dock</td><td>
      Un riel en el borde exterior con un botón para cada panel: la lista de seguimiento, las alertas, el árbol de
      objetos, la ventana de datos y la información del símbolo. Ver <a href="#dock">El dock</a>.
    </td></tr>
  </tbody>
</table>

<h3 id="dock">El dock</h3>
<p>
  Los paneles del widget se colocan junto al gráfico, de uno en uno, y se abren desde el riel del borde exterior (a la
  izquierda en un widget de derecha a izquierda). Un botón del riel abre su panel, o lo cierra si es el que está
  abierto; el botón de cerrar de cada panel también lo cierra. Ningún panel se abre solo: el gráfico tiene el espacio hasta que se pide uno
  (<code>widget.openPanel('watchlist')</code> lo abre desde tu código). Arrastra el borde del panel, o usa las flechas
  del teclado sobre él, para darle un ancho de 233 a 377 px (296 al principio), que se guarda en este navegador; nunca
  ocupa más del 38,2% de la fila, y el resto queda para el gráfico.
</p>
<p>
  En un móvil, o en un widget de menos de 641 px de ancho, no hay riel: el panel sube desde abajo sobre el gráfico,
  empieza cerrado y se cierra con Escape; un panel abierto cuando el widget se estrecha (al girar una tableta) se cierra. Ahí las alertas y el árbol de objetos se abren desde la barra de herramientas, la información del
  símbolo desde la <strong>ⓘ</strong> junto al símbolo, y cualquier panel desde tu propio código. Los gráficos de un
  <code>ChartWidgetGrid</code> no tienen riel cada uno, salvo que su <code>widget.features</code> active <code>dock</code>.
</p>
<pre><code>{`widget.openPanel('watchlist')   // 'watchlist' | 'alerts' | 'objectTree' | 'dataWindow' | 'symbolInfo' | 'depthLadder'; false if not there
widget.getOpenPanel()           // the panel open, or null
widget.closePanel()

new ChartWidget(host, { features: { dock: false } })              // no rail: the toolbar opens the panels
new ChartWidget(host, { features: { 'dock.dataWindow': false } })  // no button for the data window`}</code></pre>

<h3 id="search-dialogs">Buscar símbolo, Comparar e Ir a</h3>
<p>
  <strong>Buscar símbolo</strong> se abre desde el símbolo de la barra de herramientas, con <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>P</kbd>
  o al escribir una letra sobre el gráfico, con la que empieza la búsqueda. Lista tus <code>symbols</code> hasta que se
  escribe algo, y luego consulta la búsqueda de tu feed (<code>searchSymbols</code>, o la del adaptador) cuando dejas de
  escribir. Cada fila empieza con una insignia (el logo del símbolo o, si no lo hay, la primera letra de su ticker en el
  color de su tipo), y siguen el símbolo, su nombre, su tipo y su bolsa en columnas, con el del gráfico marcado. Las
  pestañas reducen la lista a un tipo (acciones, cripto) y no se mueven mientras escribes; cuando las filas vienen de dos
  bolsas o más, una lista al lado la reduce a una. Ambas filtran las filas que ya hay: la búsqueda de un feed da como
  mucho 50, así que HNX elegida tras escribir <code>V</code> muestra los de HNX entre esos 50, no todos los símbolos de
  HNX con una V. Sin búsqueda, al escribir se encuentran tus símbolos por ticker y por nombre, con o sin los diacríticos
  del vietnamita (<code>ngan hang</code> encuentra «Ngân hàng»). Con <code>{`features: { symbolTyping: false }`}</code>,
  las letras escritas sobre el gráfico no abren la búsqueda.
</p>
<p>
  Da <code>symbols</code> como <code>SymbolInfo</code> y la lista se abre con nombres, tipos, bolsas y logos; el símbolo
  de la barra de herramientas y el panel de información del símbolo toman de ahí un nombre y una bolsa cuando el gráfico
  no los conoce. Los resultados de la búsqueda del feed mandan sobre estos datos y conservan tu logo; lo que el gráfico sabe de su propio símbolo solo da a la búsqueda un nombre o un logo que le falte, porque puede llamar al tipo y a la bolsa con otras palabras que tu lista (stock por Cổ phiếu, un bróker por la bolsa). Los pasos de precio y los horarios que des aquí no se aplican al
  gráfico: vienen del <code>resolveSymbol</code> del adaptador o de <code>chart.setSymbolInfo</code>.
</p>
<pre><code>{`new ChartWidget(el, {
  symbols: [
    { symbol: 'VNM', description: 'Vinamilk', type: 'stock', exchange: 'HOSE', logo: '/logos/vnm.svg' },
    'FPT',   // solo el ticker, como antes
  ],
})`}</code></pre>
<p>
  Un <code>logo</code> es una dirección <code>https:</code> o <code>http:</code>, una ruta de tu sitio, una URL
  <code>blob:</code> o una imagen escrita en <code>data:</code> (PNG, JPEG, GIF, WebP, AVIF o SVG); cualquier otra cosa
  se ignora. Solo se carga como imagen y sin referrer, así que la política <code>img-src</code> de tu página debe permitir
  su servidor; si no carga, se muestra la letra. Las letras toman sus colores de <code>--tcw-kind-1</code> … <code>--tcw-kind-5</code> (acciones, futuros, índices, cripto y perpetuos, divisas, en inglés, vietnamita, japonés, chino o coreano; un warrant toma el color de los futuros, un fondo o un ETF el de los índices y un bono el de las divisas; otro tipo recibe uno según sus palabras), definidos para el tema oscuro y el claro.
</p>
<p>
  Cuando una búsqueda ya ha informado de un símbolo, las palabras del feed lo nombran también en la lista con la que
  se abre la búsqueda, no solo entre los resultados. Un nombre, tipo, bolsa o logo que no sea texto (el
  <code>null</code> de un feed JSON, un código de bolsa numérico), en los resultados de un feed o en lo que sabe el gráfico, cuenta como no dado: ni se muestra ni borra los
  tuyos. Un prefijo de mercado antes de los dos puntos (<code>BINANCE:BTCUSDT</code>) se atenúa, y es lo primero que
  acorta una columna estrecha; en un teléfono, las pestañas de tipo se desplazan en una sola línea y se desvanecen en
  el extremo que tiene más detrás. Lo que el gráfico sabe de su símbolo lo nombra en la barra de herramientas y en el
  panel de información cuando es del mismo símbolo (en mayúsculas o minúsculas, con o sin un prefijo de mercado antes
  de los dos puntos) o se fijó después de cambiar de símbolo, así que la forma de escribirlo propia de un feed
  (<code>BTC-USD</code> para <code>BTCUSD</code>) también cuenta.
</p>
<p>
  <strong>Comparar</strong> es el mismo diálogo, con <strong>Añadir como</strong> bajo la búsqueda y lo que se compara
  listado primero (ver <a href="#comparing-symbols">Comparar símbolos</a>).
</p>
<p>
  <strong>Ir a</strong> (el calendario de la barra de estado, <kbd>Alt</kbd>+<kbd>G</kbd> o el menú del gráfico) tiene dos
  pestañas. <strong>Fecha</strong> centra la barra de un día y una hora; <strong>Rango personalizado</strong> muestra de borde
  a borde las barras entre dos de ellos, partiendo de las que hay en pantalla. El mes bajo los campos rellena el campo de
  fecha que se está editando y, tras el inicio de un rango, pasa a su final. En barras diarias y mayores no hay hora que
  indicar, y no se pueden elegir días posteriores a hoy. Las fechas y horas se leen en la zona horaria de la vista.
</p>

<h3>Atajos de teclado del widget</h3>
<table>
  <thead><tr><th>Atajo</th><th>Acción</th></tr></thead>
  <tbody>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd></td><td>Paleta de comandos: los comandos del widget con sus atajos (ir a, restablecer la vista, guardar la disposición, los paneles…), las herramientas de dibujo, los tipos de gráfico, las temporalidades y los indicadores; los usados hace poco, primero</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>P</kbd></td><td>Búsqueda de símbolos: tus símbolos, o la búsqueda de tu feed mientras escribes</td></tr>
    <tr><td><kbd>A</kbd>–<kbd>Z</kbd></td><td>Busca un símbolo, empezando por la letra escrita (<code>{`features: { symbolTyping: false }`}</code> lo desactiva)</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>S</kbd></td><td>Guarda el diseño (pide un nombre la primera vez)</td></tr>
    <tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Escribe una temporalidad (<code>5</code>, <code>15m</code>, <code>1h</code>, <code>1D</code>) y pulsa Enter (<code>intervalTyping: false</code> lo desactiva)</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>T</kbd> / <kbd>H</kbd> / <kbd>J</kbd> / <kbd>V</kbd> / <kbd>C</kbd> / <kbd>F</kbd></td><td>Línea de tendencia, línea horizontal, rayo horizontal, línea vertical, línea en cruz, retroceso de Fibonacci</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>R</kbd></td><td>Restablece la vista: todas las barras a la vista, con la escala de precio ajustada a ellas</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>I</kbd></td><td>Invierte la escala de precio</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>G</kbd></td><td>Va a una fecha</td></tr>
    <tr><td><kbd>?</kbd></td><td>La hoja de atajos, que se busca por lo que hace una tecla o por la tecla</td></tr>
    <tr><td><kbd>Alt</kbd> + clic en el gráfico</td><td>Fija la información OHLC en la barra bajo el cursor (muestra la diferencia con la cruz en vivo)</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>Desfija la información / cancela el dibujo</td></tr>
    <tr><td>Clic en el símbolo de la barra de herramientas</td><td>Abre el cuadro de búsqueda de símbolos</td></tr>
    <tr><td>Clic en reproducir en la barra de herramientas</td><td>Abre el control de repetición de barras (reproducir/avanzar/buscar/velocidad)</td></tr>
  </tbody>
</table>
<p>
  Cambia los símbolos disponibles en tiempo de ejecución con <code>widget.setSymbols(['BTCUSDT', 'ETHUSDT', …])</code>,
  tickers o <code>SymbolInfo</code> como en <code>symbols</code>. Una lista de seguimiento hecha a partir de
  <code>symbols</code> (sin <code>lists</code> y sin guardarse) se sustituye por ellos y pide cotizaciones de cada uno:
  para una lista larga de tu servidor, dale a la lista de seguimiento sus propias listas.
</p>
<pre><code>{`const widget = new ChartWidget(el, {
  adapter: feed,
  watchlist: { lists: [{ id: 'main', name: 'Principal', symbols: ['VNM', 'FPT'] }] },
})
widget.setSymbols(await loadMarkets())   // los SymbolInfo[] de tu servidor: la búsqueda se abre con ellos, la lista de seguimiento se queda`}</code></pre>

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

<h3>Listas de seguimiento</h3>
<p>
  Un panel del dock con listas de símbolos; cada fila lleva el último precio, el % de cambio y un minigráfico. Las
  listas se cambian, crean, renombran y borran desde su menú; los símbolos se añaden desde la búsqueda de símbolos
  (+), se quitan y se reordenan arrastrando o con Alt+↑/↓. Las filas toman las cotizaciones del
  <code>subscribeQuotes</code> del adaptador, de una fuente de cotizaciones tuya o de lo que tú envíes.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  adapter: new BinanceAdapter(),               // its quotes fill the rows
  watchlist: {
    lists: [
      { id: 'majors', name: 'Majors', symbols: ['BTCUSDT', 'ETHUSDT'] },
      { id: 'alts', name: 'Alts', symbols: ['SOLUSDT', 'ADAUSDT'] },
    ],
    persist: true,                             // kept in this browser
    onChange: (lists, active) => save(lists),  // or keep them yourself
  },
})

widget.addToWatchlist('BNBUSDT', 'alts')
widget.setActiveWatchlist('alts')
widget.setQuotes([{ symbol: 'AAPL', last: 190.2, prevClose: 188.1 }])   // from your own feed
widget.getQuote('AAPL')`}</code></pre>
<p>
  <code>watchlist: true</code> muestra una sola lista de <code>symbols</code>, como antes; <code>setWatchlistEntry</code>
  sigue enviando el precio, la variación y el minigráfico de una fila.
</p>

<h3>Información del símbolo</h3>
<p>
  Un panel del dock que se abre con la ⓘ junto al símbolo, desde el riel o desde la paleta de comandos: los nombres del
  símbolo, el último precio y su variación, el estado del mercado con la cuenta atrás hasta la próxima apertura o cierre,
  la apertura del día, el rango, el volumen, el cierre anterior, compra y venta, el tamaño del tick, la moneda, la zona y
  el horario de negociación, y noticias. La barra de estado indica cuándo el mercado está cerrado.
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'AAPL',
  news: (symbol, limit) => api.headlines(symbol, limit),   // or the adapter's fetchNews
})
widget.toggleSymbolInfo(true)`}</code></pre>

<h3>Navegación, deshacer y dirección</h3>
<p>
  Los botones sobre el gráfico (alejar y acercar, desplazarse hacia atrás y hacia delante, que siguen mientras los
  mantienes pulsados, y restablecer) aparecen mientras el ratón está cerca del borde inferior del área del gráfico, lejos de los datos, o
  mientras uno tiene el foco (<code>navigation: false</code> los quita).
  Los cambios de configuración y de tipo de gráfico se deshacen con Ctrl/Cmd+Z, junto con los dibujos y los indicadores.
  En árabe, hebreo, persa o urdu el widget se refleja (<code>dir: 'auto'</code>; o <code>'rtl'</code> / <code>'ltr'</code>);
  el gráfico mantiene el tiempo de izquierda a derecha.
</p>

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
  El botón de capas del riel (el de la barra de herramientas, donde no hay riel) abre en el dock el
  árbol de objetos, que lista todos los indicadores y dibujos activos. Los indicadores se
  pueden quitar; cada dibujo se puede mostrar / ocultar, bloquear / desbloquear,
  configurar y eliminar, y los grupos aparecen con sus dibujos debajo. Activado
  por defecto; desactívalo con <code>objectTree: false</code>.
  Los controles de dibujo corresponden a:
</p>
<pre><code>{`chart.getDrawings()                 // DrawingState[] (id, type, visible, locked, intervals)
chart.setDrawingVisible(id, false)  // hide a single drawing
chart.isDrawingShown(id)            // no está oculto y se muestra en esta temporalidad
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
  abrir su configuración en pestañas: Estilo (la línea, sus extremos, el relleno y
  la configuración propia de la herramienta, como los niveles de Fibonacci, las
  extensiones y las etiquetas), Texto para las herramientas que escriben,
  Coordenadas (sus puntos en la zona horaria del gráfico) y Visibilidad (las
  temporalidades en las que se muestra), con un menú Plantilla, Cancelar y Aceptar
  al pie. Haz clic derecho en un dibujo para ver su menú: configuración, una
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
  La sección <strong>Comparar</strong> del árbol de objetos lista los símbolos
  superpuestos como líneas normalizadas. Con un adaptador en vivo, su botón + abre el
  diálogo de comparar; un símbolo añadido en porcentaje descarga su historial mediante
  <code>adapter.fetchHistory</code> (para que
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

<h3>Interruptores de funciones</h3>
<p>132 interruptores, todos encendidos hasta que se apagan: un nombre sin punto es una capacidad entera, apagada allí donde aparezca; un nombre con punto es un solo lugar. Cambian mientras el widget funciona. La lista completa y las opciones anteriores a las que equivalen están en <a href={href('/docs/customization')}>Personalización</a>.</p>
<pre><code>{`new ChartWidget(host, { features: { 'toolbar.replay': false, 'sidebar.patterns': false, hotkeys: false } })   // un botón, una sección de dibujo, todos los atajos

widget.setFeatures({ sidebar: false, statusBar: false })
widget.isFeatureOn('sidebar')    // false
widget.getFeatures()             // todos los interruptores, encendidos o apagados`}</code></pre>

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
<p>También un botón de menú en la barra, botones en la barra de dibujo, elementos en la barra de estado, lugares propios en cada barra y sobre el gráfico, y entradas al final del menú de un dibujo o de un indicador (ver <a href={href('/docs/customization#parts')}>Personalización</a>):</p>
<pre><code>{`widget.addToolbarDropdown({ id: 'scans', label: 'Scans', icon: 'layers', items: () => [...] })   // se piden cada vez que se abre
widget.addSidebarButton({ id: 'ruler', label: 'Ruler', icon: 'ruler', toggle: true, onClick })
widget.addStatusBarItem({ id: 'latency', text: '12 ms', label: 'Latency' })
widget.getSlot('chart')          // una capa sobre el gráfico
widget.addHotkey({ keys: 'Alt+N', label: 'New note', onPress })   // un atajo propio; sustituye al del widget con las mismas teclas

new ChartWidget(host, {
  drawingMenuItems: ({ id, type }) => [{ label: 'Share', onSelect: () => share(id) }],
  indicatorMenuItems: ({ instanceId, indicatorId }) => [{ label: 'Explain', onSelect: () => explain(indicatorId) }],
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
  sync: { crosshair: true, time: false, symbol: false, interval: false, drawings: false, replay: false },
})

grid.setLayout('1x2')
grid.setSync({ interval: true })   // alinea los demás con el gráfico activo
grid.applyOverrides({ 'grid.vertical.visible': false })   // el aspecto de todos los gráficos, y de los que añada después
grid.setFeatures({ 'toolbar.replay': false })               // los interruptores de todos los gráficos, y de los que añada después
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
  juntan sus dibujos, sin perder ninguno); la de la repetición lleva a los demás a la misma hora
  que el gráfico que se está repitiendo (un gráfico con barras más largas que los pasos de la
  repetición muestra entera la barra que contiene esa hora). Los gráficos que sobran cuando la cuadrícula
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
