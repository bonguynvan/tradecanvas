<svelte:head>
  <title>Tipos de gráfico — Documentación de TradeCanvas</title>
  <meta name="description" content="18 tipos de gráfico integrados: velas, OHLC, máximo-mínimo, Heikin-Ashi, Renko, Kagi, Punto y figura, Equivolumen y más." />
</svelte:head>

<h1>Tipos de gráfico</h1>
<p>18 tipos de gráfico integrados. Cámbialos en tiempo de ejecución con <code>chart.setChartType(type)</code>.</p>

<h2>Estándar</h2>
<table>
  <thead><tr><th>Tipo</th><th>Descripción</th></tr></thead>
  <tbody>
    <tr><td><code>candlestick</code></td><td>Velas OHLC clásicas.</td></tr>
    <tr><td><code>bar</code></td><td>Barras OHLC (estilo occidental).</td></tr>
    <tr><td><code>line</code></td><td>Gráfico de línea de cierres.</td></tr>
    <tr><td><code>area</code></td><td>Área rellena bajo la línea de cierre.</td></tr>
    <tr><td><code>baseline</code></td><td>Por encima / por debajo de un precio base, relleno en dos colores.</td></tr>
    <tr><td><code>stepLine</code></td><td>Línea escalonada: resalta los cierres discretos de cada barra.</td></tr>
    <tr><td><code>lineWithMarkers</code></td><td>Línea con un punto en cada dato.</td></tr>
    <tr><td><code>hollowCandle</code></td><td>Cuerpo hueco cuando el cierre &gt; cierre anterior.</td></tr>
    <tr><td><code>hlcArea</code></td><td>Banda entre máximo y mínimo con una línea de cierre.</td></tr>
    <tr><td><code>hiLo</code></td><td>Una barra del mínimo al máximo de cada periodo, coloreada según la dirección; las barras anchas muestran su máximo y su mínimo.</td></tr>
  </tbody>
</table>

<h2>Derivados</h2>
<table>
  <thead><tr><th>Tipo</th><th>Descripción</th></tr></thead>
  <tbody>
    <tr><td><code>heikinAshi</code></td><td>Serie de velas suavizada mediante la transformación Heikin-Ashi.</td></tr>
    <tr><td><code>renko</code></td><td>Gráfico de ladrillos de precio fijo; independiente del tiempo.</td></tr>
    <tr><td><code>kagi</code></td><td>Líneas de giro yang/yin; el giro es un porcentaje (4 por defecto) o una cantidad de precio.</td></tr>
    <tr><td><code>lineBreak</code></td><td>Una línea nueva cuando el cierre rompe las últimas líneas (3 por defecto).</td></tr>
    <tr><td><code>pointAndFigure</code></td><td>Columnas de X/O; tamaño de caja + número de cajas para el giro.</td></tr>
    <tr><td><code>rangeBars</code></td><td>El máximo-mínimo de cada barra equivale a un rango fijo.</td></tr>
  </tbody>
</table>

<h2>Ponderados por volumen</h2>
<table>
  <thead><tr><th>Tipo</th><th>Descripción</th></tr></thead>
  <tbody>
    <tr><td><code>volumeCandles</code></td><td>Ancho de vela proporcional al volumen.</td></tr>
    <tr><td><code>equivolume</code></td><td>
      Cajas de rango completo con un ancho proporcional a su parte del volumen; el color sigue el cierre frente al cierre anterior (estilo Richard Arms).
    </td></tr>
  </tbody>
</table>

<h2>Cambio en tiempo de ejecución</h2>
<pre><code>{`chart.setChartType('equivolume')`}</code></pre>

<p>
  Las transformaciones (Heikin-Ashi, Renko, Kagi, Line Break, P&amp;F, Range Bars) se
  gestionan internamente: <code>chart.getData()</code> sigue devolviendo la serie de entrada original.
</p>

<h2>Configuración de los tipos derivados</h2>
<p>
  La caja de Renko, las líneas que un Line Break tiene que romper, la reversión de Kagi, la caja y la
  reversión de Punto y figura, y el rango de las Range Bars. Lo que no se configura se calcula a partir
  de los datos (una caja por ATR para Renko, el 1% del cierre medio para la caja de P&amp;F…). La
  configuración forma parte del estado guardado; en ChartWidget está en el cuadro de configuración del
  tipo de gráfico.
</p>
<pre><code>{`chart.setChartTypeOptions({
  renko: { boxSize: 50 },                         // or 'atr' with atrPeriod
  lineBreak: { lines: 2 },
  kagi: { reversal: 25, reversalType: 'price' },  // or a percent
  pointAndFigure: { boxSize: 10, reversal: 3 },
  rangeBars: { range: 20 },
})
chart.getChartTypeOptions()
new Chart(host, { chartTypeOptions: { renko: { boxSize: 50 } } })`}</code></pre>

<h2>La serie principal y las líneas del panel de precio</h2>
<p>
  Oculta la serie principal para ver solo los indicadores o los símbolos comparados; marca el máximo
  más alto y el mínimo más bajo en pantalla; marca el bid y el ask. Una fuente cuyos ticks traen
  <code>bid</code> y <code>ask</code> los mantiene al día por sí sola.
</p>
<pre><code>{`chart.setMainSeriesVisible(false)
chart.setHighLowLines(true)          // or new Chart(host, { highLowLines: true })
chart.setBidAsk({ bid: 64210.5, ask: 64211 })
chart.setBidAsk(null)`}</code></pre>
