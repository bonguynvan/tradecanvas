<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Gráficos financieros — Documentación de TradeCanvas</title>
  <meta name="description" content="Gráficos para paneles financieros junto al gráfico de velas: barras, donut, dispersión y burbujas, histogramas, calendarios, matrices de correlación, minigráficos, indicadores de aguja, mapas de calor y treemaps, cascadas, profundidad, curvas de capital y un informe de rendimiento." />
</svelte:head>

<h1>Gráficos financieros</h1>
<p>
  Gráficos para paneles e informes, junto al gráfico de velas. Cada uno es una clase que recibe un elemento
  y sus opciones, se ajusta al tamaño del elemento y se dibuja con el tema oscuro o claro del gráfico; la
  mayoría sigue al puntero con un tooltip.
</p>

<h2>Los gráficos</h2>
<table>
  <thead><tr><th>Clase</th><th>Para</th></tr></thead>
  <tbody>
    <tr><td><code>BarChart</code></td><td>Valores por categoría: flujos netos, volumen por sesión, rentabilidad por mes. Agrupadas o apiladas, verticales u horizontales, hacia arriba y hacia abajo desde cero.</td></tr>
    <tr><td><code>DonutChart</code></td><td>Partes de un todo: asignación de activos, exposición por sector. Un gráfico de tarta con <code>innerRadius: 0</code>.</td></tr>
    <tr><td><code>ScatterChart</code></td><td>Dos valores por elemento: riesgo frente a rentabilidad, valoración frente a crecimiento; burbujas cuando un punto tiene tamaño.</td></tr>
    <tr><td><code>HistogramChart</code></td><td>Cómo se reparten los valores: rentabilidades diarias, resultados de operaciones, con líneas en la media o en un VaR.</td></tr>
    <tr><td><code>CalendarChart</code></td><td>Un valor por día en un calendario: rendimientos diarios, P&amp;L, un diario de operaciones.</td></tr>
    <tr><td><code>MatrixChart</code></td><td>Un valor por cada par de fila y columna: correlaciones, volumen por hora y día de la semana.</td></tr>
    <tr><td><code>CounterClockChart</code></td><td>Precio medio frente a volumen medio, barra a barra: el ciclo antihorario de un valor.</td></tr>
    <tr><td><code>SparklineChart</code></td><td>Una línea pequeña en una fila de la lista de seguimiento o en una tarjeta de KPI.</td></tr>
    <tr><td><code>GaugeChart</code></td><td>Un valor frente a unas bandas: sentimiento, riesgo, uso del margen.</td></tr>
    <tr><td><code>HeatmapChart</code></td><td>Celdas coloreadas según la variación, en una cuadrícula o en un treemap con tamaño según el peso (capitalización). Con <code>grouped</code>, un mapa por sectores.</td></tr>
    <tr><td><code>WaterfallChart</code></td><td>Pasos de un inicio a un final: atribución de ganancias y pérdidas, flujos de caja.</td></tr>
    <tr><td><code>DepthChart</code></td><td>Compras y ventas acumuladas de un libro de órdenes.</td></tr>
    <tr><td><code>EquityCurveChart</code></td><td>El valor de una cuenta a lo largo del tiempo, con sus drawdowns y un índice de referencia.</td></tr>
    <tr><td><code>PayoffChart</code></td><td>Lo que una posición de opciones gana o pierde al vencimiento, según el precio del subyacente: un spread, un straddle, un cóndor.</td></tr>
    <tr><td><code>CurveChart</code></td><td>Valores frente a un strike o un plazo, una línea por serie: una sonrisa de volatilidad, una estructura temporal, una curva de tipos.</td></tr>
    <tr><td><code>BoxPlotChart</code></td><td>Cómo se reparten los valores de cada grupo: rentabilidades por día de la semana, por mes, por estrategia.</td></tr>
    <tr><td><code>RadarChart</code></td><td>Varias medidas a la vez, un radio cada una: la tarjeta de puntuación de una estrategia junto a la de un índice de referencia.</td></tr>
    <tr><td><code>SunburstChart</code></td><td>Partes de un todo y las partes dentro de ellas: una asignación por clase de activo, luego por sector, luego por posición.</td></tr>
    <tr><td><code>StackedAreaChart</code></td><td>Varias series una sobre otra a lo largo del tiempo: de qué se compone un total, o cómo cambia su mezcla.</td></tr>
    <tr><td><code>SurfaceChart</code></td><td>Valores sobre dos ejes como una lámina en una caja 3D que giras arrastrando: volatilidad implícita por strike y vencimiento, una ganancia por precio y día o, en cortes, la profundidad de un libro de órdenes a lo largo del tiempo.</td></tr>
    <tr><td><code>Bar3DChart</code></td><td>Una columna por cada valor, en filas hacia el fondo, una por serie, en la misma caja: rentabilidades por trimestre y clase de activo, volumen por hora y día de la semana.</td></tr>
    <tr><td><code>PerformanceDashboard</code></td><td>Un informe de estrategia a partir de un backtest: estadísticas, capital, drawdown y rentabilidades mensuales.</td></tr>
  </tbody>
</table>

<h2>Lo que comparten</h2>
<pre><code>{`const chart = new BarChart(element, { categories, series, theme: 'dark' })

chart.setOptions({ mode: 'stacked' })   // cualquier opción, se combina
chart.setTheme('light')                 // 'dark' | 'light' | un Theme
chart.screenshot('flows', { pixelRatio: 2 })   // una imagen: ver más abajo
chart.destroy()                        // quita el canvas y sus listeners`}</code></pre>
<p>
  En una pantalla táctil, un toque muestra el tooltip, que permanece hasta que tocas en otro lugar; arrastrar sigue desplazando la página. Los gráficos se dibujan sobre los píxeles propios de la pantalla, así que las líneas se ven nítidas con cualquier zoom. Los gráficos de profundidad, de equity y de cascada ajustan sus márgenes a sus etiquetas, como los gráficos más nuevos.
</p>
<p>
  El texto usa la tipografía sans del sistema, como las cifras del widget; <code>font</code> define otra (<code>{'{'} family: MONO_FONT_FAMILY {'}'}</code> para la monoespaciada), y un tema con tipografía propia la conserva. <code>locale</code> (una etiqueta BCP 47 como <code>'vi'</code>) define el idioma en que se escriben números y fechas; si falta, el del navegador. Cada gráfico se describe a los lectores de pantalla en inglés, salvo que <code>ariaLabel</code> lo diga con tus palabras. <code>spreadLabel</code> del gráfico de profundidad y <code>benchmarkLabel</code> de la curva de equity reciben las palabras que se dibujan en ellos, y <code>labels</code> del panel sus títulos y los nombres de sus estadísticas.
</p>
<p>
  Cada gráfico llena su elemento y se vuelve a dibujar cuando el elemento cambia de tamaño. En los que muestran un
  tooltip al pasar el puntero, <code>crosshair: false</code> lo desactiva. Los gráficos de barras, donut, dispersión,
  histograma, calendario y matriz indican a los lectores de pantalla lo que muestran (el canvas tiene el rol image y una etiqueta);
  <code>ariaLabel</code> lo dice con tus palabras, por ejemplo en el idioma de tu página. Los números se muestran con
  <code>valueFormat</code> (o <code>xFormat</code> / <code>yFormat</code>); si no, como 1,234.5 y, a partir de
  diez mil, como 12.3K.
</p>

<h2 id="pictures">Imágenes, papel y dibujar sin página</h2>
<p>
  Cada gráfico da una imagen de sí mismo, como el gráfico de precios: <code>screenshot(filename, options)</code>
  guarda una, <code>copyScreenshot()</code> pone un PNG en el portapapeles, y <code>screenshotDataURL()</code>,
  <code>screenshotBlob()</code> y <code>toCanvas()</code> la entregan. El gráfico se dibuja de nuevo para la
  imagen, sin nada que siga al puntero: a su propio tamaño por la relación de píxeles de la pantalla, o con
  el <code>pixelRatio</code>, el <code>theme</code> y el <code>width</code> y el <code>height</code> que dan las
  opciones (para otro tamaño se dispone de nuevo). <code>print()</code> abre el diálogo de impresión solo para el
  gráfico y <code>toPdf()</code> da un PDF de una página, ambos en el tema claro y con el doble de
  píxeles salvo que se indique otra cosa; <code>chartsToPdf</code> hace un solo PDF de varios gráficos
  (<a href={href('/docs/api')}>Imágenes, impresión y PDF</a> tiene las opciones).
</p>
<pre><code>{`import { chartsToPdf } from '@tradecanvas/chart'

equity.screenshot('equity', { pixelRatio: 3 })                 // equity.png
const wide = flows.screenshotDataURL({ width: 1200, height: 400, type: 'jpeg' })
allocation.print({ title: 'Allocation' })
const report = await chartsToPdf([equity, flows, allocation], { title: 'March' })`}</code></pre>
<p>
  <code>renderFinanceChart</code> dibuja un gráfico en un contexto 2D tuyo, sin página: un canvas creado en
  Node, para una imagen en un correo, un informe o un mensaje de un bot, o un <code>OffscreenCanvas</code> en un
  worker. Su segundo argumento nombra el gráfico, por el nombre de su clase sin <code>Chart</code> y con la primera
  letra en minúscula (<code>'bar'</code>, <code>'equityCurve'</code>, <code>'boxPlot'</code>,
  <code>'surface'</code>, <code>'bar3d'</code>; <code>FINANCE_CHART_KINDS</code> los lista), y el tercero
  son las opciones propias de ese gráfico. Dibuja el tamaño que das en las unidades propias del contexto, sobre el
  fondo del tema: escala primero el contexto para más píxeles.
</p>
<pre><code>{`import { createCanvas } from '@napi-rs/canvas'        // u otro canvas para Node
import { renderFinanceChart } from '@tradecanvas/chart'

const canvas = createCanvas(1600, 800)
const ctx = canvas.getContext('2d')
ctx.scale(2, 2)                                        // un gráfico de 800 × 400 con el doble de píxeles
renderFinanceChart(ctx, 'equityCurve', { data: equity, theme: 'light', font: { family: 'Inter' } }, { width: 800, height: 400 })
const png = canvas.toBuffer('image/png')`}</code></pre>
<p>
  El contexto tiene que tener lo que tiene el de un navegador: trazados, texto y su medición, y
  <code>getTransform</code>. El texto se dibuja en la tipografía del tema, así que nombra con
  <code>font</code> una que tu canvas tenga. Nada sigue a un puntero y nada se mueve: un indicador de aguja está en
  su valor. El panel de rendimiento está hecho de elementos de la página y no se dibuja así; sus gráficos, sí. El
  gráfico de precios tiene el suyo: <code>renderPriceChart</code>, en la página de la API.
</p>

<h2>Gráfico de barras</h2>
<pre><code>{`import { BarChart } from '@tradecanvas/chart'

// Compras netas extranjeras en diez sesiones: verde por encima de cero, rojo por debajo.
const flows = new BarChart(el, {
  categories: ['6/10', '7/10', '8/10', '9/10'],
  series: [{ name: 'Net', values: [-660, 860, -280, 230] }],
  colorBySign: true,                    // o { positive, negative }
  valueFormat: (v) => v + ' bn',
  onBarClick: ({ category, series, value, index }) => openDay(index),
})

// Varias series lado a lado, o apiladas: los positivos hacia arriba y los negativos hacia abajo desde cero.
new BarChart(el, {
  categories: ['Foreign', 'Proprietary', 'Retail'],
  series: [{ name: 'Buy', values: [820, 310, 4200] }, { name: 'Sell', values: [-760, -280, -4290] }],
  mode: 'stacked',
  orientation: 'horizontal',            // barras hacia la derecha, etiquetas a la izquierda
  showValues: true,
})

flows.update(categories, series)`}</code></pre>
<p>
  El cero siempre está en el eje de valores. Al pasar el puntero por una categoría se ven los valores de todas las
  series en ella; la leyenda aparece cuando hay más de una serie (<code>legend</code> para elegir). Las etiquetas que
  no caben en la parte inferior se muestran cada pocas categorías.
</p>

<h2>Gráfico de donut</h2>
<pre><code>{`import { DonutChart } from '@tradecanvas/chart'

new DonutChart(el, {
  data: [
    { label: 'Stocks', value: 52 },
    { label: 'Bonds', value: 23 },
    { label: 'Cash', value: 15 },
    { label: 'Gold', value: 10, color: '#d4a017' },
  ],
  innerRadius: 0.6,                     // 0 para una tarta
  centerLabel: 'Total',
  centerValue: '1.2B ₫',
  onSliceClick: (slice) => filterBy(slice.label),
})`}</code></pre>
<p>
  Los sectores van en el sentido de las agujas del reloj desde las doce; los valores de 0 o menos se omiten. Cada
  sector muestra su porcentaje cuando tiene sitio, y la leyenda lista nombres y porcentajes, junto al anillo cuando
  el gráfico es ancho y debajo cuando no.
</p>

<h2>Gráfico de dispersión y de burbujas</h2>
<pre><code>{`import { ScatterChart } from '@tradecanvas/chart'

new ScatterChart(el, {
  series: [{
    name: 'Banks',
    points: [
      { x: 21, y: 9, size: 480, label: 'VCB' },   // size: valor de mercado; el área de la burbuja lo sigue
      { x: 34, y: 24, size: 170, label: 'TCB' },
    ],
  }],
  xLabel: 'Volatility',
  yLabel: 'Return, a year',
  xFormat: (v) => v + '%',
  yFormat: (v) => v + '%',
  showLabels: true,
  onPointClick: (point, series) => openSymbol(point.label),
})`}</code></pre>
<p>
  Los ejes dejan sitio para la burbuja más grande (<code>maxRadius</code>, 24 px por defecto), y unas líneas marcan
  x = 0 e y = 0 cuando los ejes los cruzan (<code>zeroLines: false</code> para ocultarlas).
</p>

<h2>Histograma</h2>
<pre><code>{`import { HistogramChart, histogramBins } from '@tradecanvas/chart'

new HistogramChart(el, {
  values: dailyReturns,                 // en porcentaje
  binWidth: 0.5,                        // o bins: 20, o 'auto' (regla de Sturges)
  colorBySign: true,
  valueFormat: (v) => v.toFixed(1) + '%',
  markers: [{ value: mean, label: 'Mean' }, { value: var95, label: 'VaR 95%', color: '#e85a67' }],
})

histogramBins([1, 2, 2, 3, 10], { bins: 3 })
// [{ from: 1, to: 4, count: 4 }, { from: 4, to: 7, count: 0 }, { from: 7, to: 10, count: 1 }]`}</code></pre>

<h2>Calendario</h2>
<pre><code>{`import { CalendarChart } from '@tradecanvas/chart'

// Un año de sesiones, de lunes a viernes, coloreadas según la variación del día.
new CalendarChart(el, {
  data: [{ date: '2025-01-02', value: 1.2 }, { date: '2025-01-03', value: -0.8 }],   // YYYY-MM-DD
  weekdays: 5,                          // 7 (por defecto) todos los días; weekStart: 0 empieza la semana en domingo
  locale: 'vi-VN',                      // nombres de meses y días
  colorScale: { min: -2, max: 2 },      // el rojo y el verde del tema, plenos en ±2
  valueFormat: (v) => v.toFixed(2) + '%',
  onDayClick: (day) => openSession(day.date),
})`}</code></pre>
<p>
  Las semanas van de izquierda a derecha y los días de la semana de arriba abajo, una franja por año natural y diez años como máximo; si el gráfico no es lo bastante alto para todos, los más antiguos se quedan fuera. Los días sin valor se dibujan vacíos, y la barra de color de abajo muestra la escala (<code>legend: false</code> la oculta).
</p>

<h2>Matriz de correlación</h2>
<pre><code>{`import { MatrixChart, correlationMatrix } from '@tradecanvas/chart'

// Rendimientos diarios, no precios: un array por acción, con los mismos días en cada uno.
const names = ['VCB', 'BID', 'CTG', 'TCB']
const values = correlationMatrix(returnsByStock)

new MatrixChart(el, {
  rows: names,                          // columns: [...] para una matriz que no es cuadrada
  values,                               // values[row][column]
  triangle: 'lower',                    // para correlaciones basta con la mitad
  colorScale: { min: -1, max: 1 },
  onCellClick: ({ row, column, value }) => compare(row, column),
})`}</code></pre>
<p>
  Las celdas son siempre cuadradas y muestran su valor cuando cabe (dos decimales salvo <code>valueFormat</code>); los nombres de columna que no caben a lo ancho de su celda se giran. <code>correlationMatrix</code> empareja los días que tienen ambas series y da NaN con menos de tres, y la celda queda vacía. Una matriz sirve también para otras tablas de valores, como el volumen por hora y día de la semana.
</p>
<p>
  Una tabla de pocas columnas, como las líneas de un estado financiero por periodo, usa <code>cellWidth: 'fill'</code>: las columnas se reparten el ancho junto a los nombres de las filas y las filas mantienen su altura, así que la matriz ocupa el gráfico en lugar de quedar pequeña en el centro. Un número fija el ancho de cada columna en píxeles, sin pasar del espacio disponible.
</p>

<h2>Mapa por sectores</h2>
<pre><code>{`import { HeatmapChart } from '@tradecanvas/chart'

new HeatmapChart(el, {
  data: [
    { id: 'vcb', label: 'VCB', value: 0.8, weight: 480, group: 'Bancos' },
    { id: 'hpg', label: 'HPG', value: 1.9, weight: 160, group: 'Acero' },
    { id: 'vhm', label: 'VHM', value: -2.4, weight: 170, group: 'Inmobiliario' },
  ],
  grouped: true,                        // mosaicos por grupo y luego por acción
  valueFormat: (v) => v.toFixed(1) + '%',
})`}</code></pre>
<p>
  Cada grupo ocupa el espacio de la suma de los pesos de sus acciones, y su nombre y su variación ponderada encabezan su mosaico cuando caben. Los colores del mapa de calor van de -5 a 5 salvo que <code>colorScale</code> indique <code>min</code> y <code>max</code>.
</p>

<h2>Curva antihoraria</h2>
<pre><code>{`import { CounterClockChart } from '@tradecanvas/chart'

const clock = new CounterClockChart(el, {
  data: bars,                           // barras OHLCV, la más antigua primero
  period: 25,                           // barras de cada media
  points: 120,                          // los puntos más recientes que se dibujan
  xLabel: 'Volumen, media', yLabel: 'Precio, media',
  onPointClick: (p) => goTo(p.time),
})

clock.getPhase()                        // 1–8: la dirección del último movimiento`}</code></pre>
<p>
  Cada punto es la media de 25 barras del volumen (en horizontal) y del cierre (en vertical), unidos en orden temporal y más tenues cuanto más antiguos. Un ciclo sano gira en sentido antihorario. <code>getPhase()</code> (y <code>counterClockPhase(points)</code>) nombran el último movimiento: 1 sube el volumen, 2 suben ambos, 3 sube el precio, 4 sube el precio con volumen a la baja, 5 baja el volumen, 6 bajan ambos, 7 baja el precio, 8 baja el precio con volumen al alza.
</p>

<h2>Minigráfico, indicador de aguja, mapa de calor, cascada, profundidad y curva de capital</h2>
<pre><code>{`import { SparklineChart, GaugeChart, HeatmapChart, WaterfallChart, DepthChart, EquityCurveChart } from '@tradecanvas/chart'

new SparklineChart(el, { data: closes, mode: 'area', showLastPoint: true })

const gauge = new GaugeChart(el, {
  value: 72, min: 0, max: 100, label: 'Fear & Greed',
  zones: [{ from: 0, to: 45, color: '#e8505b' }, { from: 45, to: 55, color: '#8a93a3' }, { from: 55, to: 100, color: '#1fa874' }],
})
gauge.setValue(64)

// Un treemap con tamaño según el valor de mercado y color según la variación del día.
new HeatmapChart(el, {
  data: [{ id: 'vcb', label: 'VCB', value: 1.2, weight: 480 }, { id: 'fpt', label: 'FPT', value: -0.8, weight: 170 }],
  weighted: true, showLabels: true, showValues: true,
  onCellClick: (cell) => openSymbol(cell.label),
})

new WaterfallChart(el, { data: [{ label: 'Start', value: 10000, type: 'total' }, { label: 'Fees', value: -85 }, { label: 'End', value: 9915, type: 'total' }] })
new DepthChart(el, { data: { bids, asks }, midPriceLine: true, spreadLabel: true })
new EquityCurveChart(el, { data: equity, benchmark, drawdown: true })`}</code></pre>
<p>
  Una curva de capital también acepta <strong>levels</strong>, líneas a lo ancho del gráfico en valores fijos con cada
  valor en una etiqueta del eje, y <strong>bands</strong>, tramos de valores teñidos bajo la curva. Un level tiene un
  <code>label</code> escrito en su extremo derecho (<code>labelAt: 'start'</code> para el izquierdo, lejos del último
  punto de la curva), un <code>color</code> y un <code>dash</code> (<code>[]</code> para una
  línea continua); una band tiene un <code>label</code> en su esquina y un <code>color</code> que se usa tal cual, así que
  da uno con transparencia. Ambos toman los colores del tema si no se da ninguno. El valor de un level se escribe
  completo, o con <code>valueFormat</code> si se da. Las etiquetas de levels demasiado cercanos para que quepan ambas se
  apartan (cuando no hay sitio para todas, se omiten las de los levels más bajos), y los nombres dentro del gráfico no se
  pisan entre sí. La escala de valores se amplía para mostrarlos todos;
  <code>fitLevels: false</code> la ajusta a la curva, deja fuera un level que quede fuera y dibuja una band solo donde se
  solapa con ella. <code>setOptions</code> los cambia en el gráfico tal como está.
</p>
<pre><code>{`const chart = new EquityCurveChart(el, {
  data: closes,
  levels: [{ value: 41_250, label: 'BOS', color: '#e0a030' }, { value: 38_900, label: 'Equilibrium' }],
  bands: [
    { from: 38_900, to: 44_100, label: 'Premium', color: 'rgba(232, 80, 91, 0.10)' },
    { from: 33_700, to: 38_900, label: 'Discount', color: 'rgba(31, 168, 116, 0.10)' },
  ],
})
chart.setOptions({ levels: [{ value: 42_000, label: 'CHoCH' }] })`}</code></pre>

<h2>Payoff de opciones</h2>
<p>
  <code>PayoffChart</code> dibuja lo que una posición de opciones gana o pierde al vencimiento, según el precio del
  subyacente: la ganancia teñida por encima de cero y la pérdida por debajo, una línea discontinua en cada punto de
  equilibrio y en <code>spot</code>, el precio actual. Una pata es una <code>'call'</code> o una <code>'put'</code>,
  comprada (<code>'long'</code>) o vendida (<code>'short'</code>), con su <code>strike</code> y la
  <code>premium</code> de una unidad; una pata <code>'underlying'</code> es el subyacente que se tiene junto a ellas,
  a su <code>entry</code>. <code>multiplier</code> son las unidades que cubre un contrato. Los precios dibujados
  están en torno a los strikes, o son el <code>range</code> dado. El puntero lee la ganancia o la pérdida en su precio.
</p>
<pre><code>{`import { PayoffChart, payoffStats, optionPayoff } from '@tradecanvas/chart'

const condor = [
  { type: 'put', side: 'long', strike: 90, premium: 1 },
  { type: 'put', side: 'short', strike: 95, premium: 2.5 },
  { type: 'call', side: 'short', strike: 105, premium: 2.5 },
  { type: 'call', side: 'long', strike: 110, premium: 1 },
]
const chart = new PayoffChart(el, { legs: condor, multiplier: 100, spot: 101.4, spotLabel: 'Spot' })
chart.update(otherLegs)

payoffStats(condor, 100)    // { maxProfit: 300, maxLoss: -200, breakevens: [92, 108] }
optionPayoff(condor, 100, 100)   // 300: lo que ganan las patas con el subyacente en 100

// Antes del vencimiento: una segunda línea, discontinua, según un modelo
chart.setOptions({ model: { daysToExpiry: 30, volatility: 0.25, rate: 0.03 } })
positionValue(condor, 100, { daysToExpiry: 30, volatility: 0.25 }, 100)   // lo que ganan las patas cuando quedan 30 días
optionPrice('call', 100, 105, { years: 30 / 365, volatility: 0.25 })      // el precio de una opción`}</code></pre>
<p>
  <code>payoffStats</code> da lo máximo que ganan las patas y lo máximo que pierden al vencimiento
  (<code>null</code> donde no hay límite: una call comprada, una call vendida sola) y los precios en los que quedan
  en equilibrio. Una pata sin su strike, o el subyacente sin su entrada, no cuenta para nada.
</p>
<p>
  Con <code>model</code> el gráfico dibuja lo que la posición gana o pierde cuando aún quedan esos días,
  en discontinuo, sobre el payoff, nombra las dos líneas encima del área del gráfico, cada una junto a un tramo de su propia línea
  (<code>expiryLabel</code> y <code>model.label</code> las dicen con tus palabras) y lee ambas bajo el
  puntero. Cada opción se valora
  como una europea con Black-Scholes a la <code>volatility</code> del modelo (la de un año, como fracción:
  <code>0.25</code> es el 25%), con <code>rate</code> y <code>dividendYield</code> donde se den; la
  <code>volatility</code> y los <code>daysToExpiry</code> propios de una pata sustituyen a los del modelo, para un skew o un calendar
  spread. Es la respuesta de un modelo, no una cotización: una opción americana, o una cuya volatilidad se mueve con el
  precio, vale otra cosa. <code>positionValue</code> y <code>optionPrice</code> son los cálculos, exactos
  hasta más o menos una parte en un millón de un precio; cuando no quedan días <code>positionValue</code> es
  <code>optionPayoff</code>, y con el subyacente en nada una put vale su strike, descontado.
</p>

<h2>Curvas: una sonrisa de volatilidad, una estructura temporal</h2>
<p>
  <code>CurveChart</code> dibuja valores frente a un strike, un plazo o un vencimiento, una línea por serie. Las
  líneas se redondean a través de sus puntos sin pasar de un valor que no alcanzan
  (<code>smooth: false</code> los une con rectas), una serie con <code>dashed</code> es la de ayer junto a
  la de hoy, y <code>markers</code> son líneas con etiqueta en una x. Con <code>ticks</code> el eje x lo
  nombras tú, un plazo en cada número de días. El puntero se ajusta a la x más cercana que tiene una cotización y lee
  allí cada curva, a lo largo de la línea tal como se dibuja. <code>curveValueAt(points, x)</code> lee una curva en código,
  en línea recta entre sus puntos, o a lo largo de la línea redondeada con <code>true</code> como tercer argumento.
</p>
<pre><code>{`import { CurveChart } from '@tradecanvas/chart'

// Una sonrisa: volatilidad implícita frente al strike, una línea por vencimiento.
new CurveChart(el, {
  series: [
    { name: '1M', points: [{ x: 90, y: 31 }, { x: 100, y: 24 }, { x: 110, y: 27 }] },
    { name: '3M', points: [{ x: 90, y: 28 }, { x: 100, y: 25 }, { x: 110, y: 26 }] },
  ],
  markers: [{ x: 101.4, label: 'ATM' }],
  valueFormat: (v) => v.toFixed(1) + '%',
})

// Una estructura temporal: plazos a lo largo de x, en días.
new CurveChart(el, {
  series: [
    { name: 'Today', points: [{ x: 30, y: 26 }, { x: 90, y: 25 }, { x: 365, y: 27 }] },
    { name: 'A week ago', points: [{ x: 30, y: 24 }, { x: 90, y: 25 }, { x: 365, y: 26 }], dashed: true },
  ],
  ticks: [{ x: 30, label: '1M' }, { x: 90, label: '3M' }, { x: 365, label: '1Y' }],
})`}</code></pre>

<h2>Diagrama de caja</h2>
<p>
  <code>BoxPlotChart</code> muestra cómo se reparten los valores de cada grupo: una caja del primer cuartil al tercero
  con una línea en la mediana, bigotes hasta los valores más lejanos dentro de <code>whiskers</code> alturas de caja
  desde la caja (1.5 si se omite; <code>Infinity</code> para el más bajo y el más alto), y un anillo por cada valor
  más alejado. Un grupo da sus <code>values</code> sin procesar, o sus números en <code>stats</code> cuando
  se calcularon en otro sitio. <code>boxPlotStats(values)</code> es el mismo cálculo en código, y
  <code>labels</code> pone las palabras de la lectura en otro idioma. <code>onBoxClick</code> da el grupo
  sobre el que cae un clic y sus cinco números: en cualquier punto, arriba o abajo, del lugar del grupo a lo ancho del
  gráfico, tal como lo elige la lectura.
</p>
<pre><code>{`import { BoxPlotChart, boxPlotStats } from '@tradecanvas/chart'

new BoxPlotChart(el, {
  data: [{ label: 'Mon', values: mondayReturns }, { label: 'Tue', values: tuesdayReturns }],
  colorBySign: true,                     // según la mediana de cada caja
  valueFormat: (v) => v.toFixed(1) + '%',
  onBoxClick: (group, stats) => openDay(group.label, stats.median),
})

boxPlotStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 100])
// { min: 1, q1: 3.25, median: 5.5, q3: 7.75, max: 9, outliers: [100] }`}</code></pre>

<h2>Radar</h2>
<p>
  <code>RadarChart</code> pone varias medidas en radios alrededor de un centro, en el sentido de las agujas del reloj
  desde las doce, y une los valores de cada serie en una figura. Un radio va de su <code>min</code> en el centro (0 si
  se omite, o el valor más bajo que haya en él cuando está por debajo de cero) a su <code>max</code> en el borde, el valor más alto
  que haya en él cuando no se da ninguno: da a cada radio el
  suyo cuando las medidas difieren en magnitud. Necesita tres radios. El puntero lee todas las series en el radio más
  cercano, y <code>onAxisClick</code> da ese radio para un clic: su etiqueta, su lugar entre
  <code>axes</code> y el valor de cada serie en él.
</p>
<pre><code>{`import { RadarChart } from '@tradecanvas/chart'

new RadarChart(el, {
  axes: [{ label: 'Sharpe', max: 3 }, { label: 'Sortino', max: 3 }, { label: 'Calmar', max: 3 }, { label: 'Win rate', max: 100 }],
  series: [{ name: 'Strategy', values: [1.8, 2.4, 1.5, 58] }, { name: 'Benchmark', values: [1.0, 1.3, 0.7, 51] }],
  onAxisClick: ({ axis, index, values }) => explain(axis, values),   // 'Sortino', 1, [{ series: 'Strategy', value: 2.4 }, …]
})`}</code></pre>

<h2>Sunburst</h2>
<p>
  <code>SunburstChart</code> dibuja partes de un todo y las partes dentro de ellas, un anillo por nivel. Una parte con
  <code>children</code> es tan grande como todos ellos juntos; una sin ellos toma su <code>value</code>. El primer
  anillo toma los colores de la paleta y cada anillo exterior el de su padre, más pálido. Se dibujan cuatro anillos como máximo
  (<code>maxDepth</code> para menos o más), <code>innerRadius: 0</code> cierra el hueco, y
  <code>centerLabel</code> y <code>centerValue</code> se escriben en él. Un clic da la parte y las
  etiquetas que llevan hasta ella. Los nombres se escriben a lo largo de sus anillos donde caben.
</p>
<pre><code>{`import { SunburstChart } from '@tradecanvas/chart'

new SunburstChart(el, {
  data: [
    { label: 'Stocks', children: [{ label: 'Banks', value: 22 }, { label: 'Technology', value: 14 }] },
    { label: 'Bonds', value: 23 },
    { label: 'Cash', value: 18 },
  ],
  centerLabel: 'Total', centerValue: '1.2B',
  onNodeClick: (node, path) => openHoldings(path),   // ['Stocks', 'Banks']
})`}</code></pre>

<h2>Áreas apiladas</h2>
<p>
  <code>StackedAreaChart</code> apila varias series sobre los mismos puntos, la primera abajo: de qué se
  compone un total a lo largo del tiempo. Con <code>normalized</code> los valores de cada punto son partes de su total y
  las áreas llenan la altura: cómo cambia una mezcla. Un valor por debajo de cero cuenta como ninguno. El puntero lee
  todas las series y su total en el punto más cercano.
</p>
<pre><code>{`import { StackedAreaChart } from '@tradecanvas/chart'

const chart = new StackedAreaChart(el, {
  categories: ['Jan', 'Feb', 'Mar', 'Apr'],
  series: [{ name: 'Stocks', values: [40, 44, 47, 52] }, { name: 'Bonds', values: [30, 29, 27, 25] }, { name: 'Cash', values: [30, 27, 26, 23] }],
  normalized: true,
})
chart.update(nextSeries, nextCategories)`}</code></pre>

<h2>Superficie 3D</h2>
<p>
  <code>SurfaceChart</code> dibuja valores sobre dos ejes como una lámina en una caja: <code>x</code> a lo ancho,
  <code>y</code> hacia el fondo y <code>values[yIndex][xIndex]</code> hacia arriba. Los números a lo largo de un eje se
  colocan según su valor, y se dibujan de menor a mayor sea cual sea su orden; los nombres se espacian de forma uniforme en
  el orden dado, así que una lista de plazos (<code>'1W'</code>, <code>'1M'</code>, <code>'1Y'</code>) no queda apretada en su extremo corto.
  Un valor que falta o que no es un número deja un hueco, y un lugar a lo largo de un eje que no es un número se deja fuera
  con sus valores.
</p>
<pre><code>{`import { SurfaceChart } from '@tradecanvas/chart'

const chart = new SurfaceChart(el, {
  x: [80, 90, 100, 110, 120],              // strikes
  y: ['1W', '1M', '3M', '6M', '1Y'],       // vencimientos
  values: impliedVolatility,               // values[expiry][strike]
  xLabel: 'Strike', yLabel: 'Expiry', valueLabel: 'IV',
  valueFormat: (v) => (v * 100).toFixed(1) + '%',
  onPointClick: (point) => openChain(point.x, point.y),
})
chart.update(nextValues)                   // o update(values, { x, y }) cuando también cambiaron los ejes`}</code></pre>
<p>
  Arrastrar gira el gráfico: un ratón lo gira y lo inclina, un dedo solo lo gira, para que la página siga desplazándose
  bajo él. Desde el teclado, una vez que Tab ha llegado al gráfico, las flechas lo giran y lo inclinan 5 grados (15
  con Mayús) e Inicio vuelve atrás; a un lector de pantalla se le dicen las teclas, y después de cada una desde dónde se ve
  el gráfico (<code>describeView</code> lo dice con tus palabras). Un doble clic vuelve a la <code>view</code> que
  dieron las opciones
  (<code>{'{'} yaw: -35, pitch: 28 {'}'}</code> cuando no dan ninguna: <code>yaw</code> gira el gráfico sobre su
  eje vertical, <code>pitch</code> es a qué altura sobre el suelo está el ojo, de 0 a 90 grados).
  <code>getView()</code> lee desde dónde se ve ahora, <code>setView()</code> lo fija,
  <code>onViewChange</code> lo sigue, y <code>rotate: false</code> lo mantiene quieto. El gráfico se dibuja
  sin perspectiva, así que las líneas que son paralelas en los datos siguen paralelas en la pantalla, y conserva un
  mismo tamaño mientras se gira.
</p>
<p>
  <code>style</code> es <code>'surface'</code> (una lámina sombreada, el valor por defecto), <code>'wireframe'</code> (solo sus
  líneas) o <code>'slices'</code> (cada <code>y</code> una línea rellena propia, una detrás de otra).
  Los valores se colorean según <code>colorRamp</code>: por defecto un solo tono, desde cerca del fondo del gráfico hasta su más
  intenso, sobre el rango de los valores; da <code>colors</code> (dos o más, primero el del valor más bajo) y
  <code>min</code> y <code>max</code> para los tuyos, como un color de pérdida, uno neutro y uno de ganancia
  a cada lado de cero. El puntero lee el punto más cercano de la celda sobre la que está, la de delante donde la
  lámina se pliega sobre sí misma. Una cuadrícula de más de 120 puntos a lo largo de un eje se reduce a esos, conservando ambos extremos, y
  a 60 mientras se está girando, para que una cuadrícula grande gire con fluidez.
</p>
<p>
  <code>depthSurface(snapshots, {'{'} levels {'}'})</code> convierte una serie de libros de órdenes en los
  <code>x</code>, <code>y</code> y <code>values</code> de una superficie: los precios a lo ancho, los tiempos de los libros hacia el fondo, y en cada uno el
  volumen que espera desde el mejor precio hasta ese precio, como lo tiene un gráfico de profundidad. <code>levels</code> es cuántos
  precios (48 si se omite, 1.000 como máximo), y <code>from</code> y <code>to</code> se limitan a una ventana de
  precios.
</p>
<pre><code>{`import { SurfaceChart, depthSurface } from '@tradecanvas/chart'

// books: { time, bids: [{ price, volume }], asks: [...] }[], el más antiguo primero
const chart = new SurfaceChart(el, {
  ...depthSurface(books, { levels: 48 }),
  style: 'slices',
  xLabel: 'Price', yLabel: 'Time', valueLabel: 'Depth',
  yFormat: (ms) => new Date(ms).toISOString().slice(11, 16),
})`}</code></pre>

<h2>Barras 3D</h2>
<p>
  <code>Bar3DChart</code> levanta una columna sobre cada valor, en filas hacia el fondo, una por serie: <code>categories</code> a lo ancho
  y una fila por cada una de las <code>series</code>, la primera al frente del eje <code>y</code>. Las columnas empiezan
  en cero; una por debajo de cero cuelga del nivel de cero, que se dibuja como una lámina a través de la caja. Acepta
  <code>view</code>, <code>rotate</code> y el resto de lo que una superficie acepta para girar, y
  <code>onBarClick</code> da la categoría, la serie y el valor. No se dibujan más de 120 categorías y 120
  series.
</p>
<pre><code>{`import { Bar3DChart } from '@tradecanvas/chart'

const chart = new Bar3DChart(el, {
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [{ name: 'Stocks', values: [4.2, 6.1, -2.4, 5.3] }, { name: 'Bonds', values: [1.1, 0.8, 1.6, -0.5] }],
  valueFormat: (v) => v.toFixed(1) + '%',
})
chart.update(nextSeries, nextCategories)`}</code></pre>

<h2>Panel de rendimiento</h2>
<p>
  <code>PerformanceDashboard</code> arma un informe de estrategia a partir de un backtest: una franja de estadísticas
  principales, la curva de capital, el drawdown debajo y un calendario de rentabilidades mensuales. Combínalo con el
  backtester de <a href={href('/docs/analytics')}>análisis</a>.
</p>
<pre><code>{`import { Backtester } from '@tradecanvas/analytics'
import { PerformanceDashboard } from '@tradecanvas/chart'

const result = new Backtester({ initialCash: 10_000 }).run(bars, myStrategy)

const dash = new PerformanceDashboard(document.getElementById('report')!, {
  result,            // cualquier { equityCurve, metrics }: la salida de Backtester sirve
  theme: 'dark',
  title: 'SMA Crossover',
  subtitle: 'BTC/USDT · 1h · 2023',
})

// después: dash.update(newResult) · dash.setTheme('light') · dash.destroy()`}</code></pre>
<p>
  Las métricas que armes a mano van en fracciones, como las devuelve <code>@tradecanvas/analytics</code>:
  un <code>totalReturnPct</code> de <code>0.12</code> se muestra como +12.00%, y uno dado en porcentaje
  (<code>12</code>) se vería 100 veces más grande. <code>maxDrawdownPct</code> se lee como una caída,
  tenga el signo que tenga.
</p>
<p>
  Los cálculos se exportan para un diseño propio: <code>computeMonthlyReturns</code>,
  <code>computeDrawdownCurve</code>, <code>toEquityPoints</code>, <code>selectKeyStats</code> y, para ejes propios,
  <code>niceScale(min, max)</code> (marcas en pasos de 1, 2, 2.5 o 5).
</p>
