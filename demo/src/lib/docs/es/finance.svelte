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
    <tr><td><code>SparklineChart</code></td><td>Una línea pequeña en una fila de la lista de seguimiento o en una tarjeta de KPI.</td></tr>
    <tr><td><code>GaugeChart</code></td><td>Un valor frente a unas bandas: sentimiento, riesgo, uso del margen.</td></tr>
    <tr><td><code>HeatmapChart</code></td><td>Celdas coloreadas según la variación, en una cuadrícula o en un treemap con tamaño según el peso (capitalización). Con <code>grouped</code>, un mapa por sectores.</td></tr>
    <tr><td><code>WaterfallChart</code></td><td>Pasos de un inicio a un final: atribución de ganancias y pérdidas, flujos de caja.</td></tr>
    <tr><td><code>DepthChart</code></td><td>Compras y ventas acumuladas de un libro de órdenes.</td></tr>
    <tr><td><code>EquityCurveChart</code></td><td>El valor de una cuenta a lo largo del tiempo, con sus drawdowns y un índice de referencia.</td></tr>
    <tr><td><code>PerformanceDashboard</code></td><td>Un informe de estrategia a partir de un backtest: estadísticas, capital, drawdown y rentabilidades mensuales.</td></tr>
  </tbody>
</table>

<h2>Lo que comparten</h2>
<pre><code>{`const chart = new BarChart(element, { categories, series, theme: 'dark' })

chart.setOptions({ mode: 'stacked' })   // cualquier opción, se combina
chart.setTheme('light')                 // 'dark' | 'light' | un Theme
chart.destroy()                         // quita el canvas y sus listeners`}</code></pre>
<p>
  Cada gráfico llena su elemento y se vuelve a dibujar cuando el elemento cambia de tamaño. En los que muestran un
  tooltip al pasar el puntero, <code>crosshair: false</code> lo desactiva. Los gráficos de barras, donut, dispersión,
  histograma, calendario y matriz indican a los lectores de pantalla lo que muestran (el canvas tiene el rol image y una etiqueta);
  <code>ariaLabel</code> lo dice con tus palabras, por ejemplo en el idioma de tu página. Los números se muestran con
  <code>valueFormat</code> (o <code>xFormat</code> / <code>yFormat</code>); si no, como 1,234.5 y, a partir de
  diez mil, como 12.3K.
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
  Los cálculos se exportan para un diseño propio: <code>computeMonthlyReturns</code>,
  <code>computeDrawdownCurve</code>, <code>toEquityPoints</code>, <code>selectKeyStats</code> y, para ejes propios,
  <code>niceScale(min, max)</code> (marcas en pasos de 1, 2, 2.5 o 5).
</p>
