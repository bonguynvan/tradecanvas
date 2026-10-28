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
    <tr><td><code>pointAndFigure</code></td><td>Columnas de X/O; tamaño de caja + número de cajas para el giro. Las cajas demasiado pequeñas para verse se dibujan como columnas sólidas, y si hay menos columnas de las que caben en la vista, se ajustan a ella.</td></tr>
    <tr><td><code>rangeBars</code></td><td>El máximo-mínimo de cada barra equivale a un rango fijo, y la barra cierra en su máximo o en su mínimo; la última barra es la que todavía se está formando.</td></tr>
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
<p>
  El eje de tiempo y la etiqueta de hora del cursor fechan un ladrillo, una línea o una columna por la
  barra en que se completó, así que el eje de un gráfico Renko, Kagi, Line Break, P&amp;F o Range Bars
  muestra los años, meses y días que abarca; los ladrillos completados en una misma barra comparten su
  etiqueta. Sus propios valores <code>time</code> solo los cuentan, de uno en uno. <code>axisTimes(series)</code>
  de <code>@tradecanvas/chart</code> da esas fechas para una serie construida con <code>toRenko</code> y similares.
</p>
<p>
  El tooltip del crosshair y el evento <code>crosshairMove</code> fechan un ladrillo igual: el
  <code>time</code> del payload es la fecha del eje y <code>prevClose</code> el cierre del ladrillo anterior. En
  estos tipos los indicadores se calculan sobre los ladrillos, líneas o columnas dibujados, no sobre las barras de
  debajo, así que una media móvil va sobre los ladrillos y la leyenda, la ventana de datos de ChartWidget y una
  exportación la leen en un ladrillo; una exportación escribe los ladrillos, fechados como los fecha el eje. Los
  indicadores que cuentan días (VWAP, Session VWAP, la media móvil multitemporal) y los que leen otro símbolo por
  tiempo no se dibujan ahí: <code>getActiveIndicators()</code> los marca con <code>offChartType: true</code>.
</p>
<p>
  Renko, Kagi, Line Break y Range Bars con menos ladrillos o líneas de los que caben en la vista se ajustan
  a ella como Point &amp; Figure, así que no quedan en la parte derecha del gráfico. El volumen de una columna
  P&amp;F es el de las barras de las que se hizo. En estos tipos el eje de tiempo deja solo las dos clases de
  etiqueta más gruesas a la vista (años y meses, por ejemplo), sin un día suelto entre ellas.
</p>

<h2>Configuración de los tipos derivados</h2>
<p>
  La caja de Renko, las líneas que un Line Break tiene que romper, la reversión de Kagi, la caja y la
  reversión de Punto y figura, y el rango de las Range Bars. Lo que no se configura se calcula a partir
  de los datos (una caja por ATR para Renko, la quincuagésima parte del rango de precios, redondeada a 1, 2 o 5, para la caja de P&amp;F…). La
  configuración forma parte del estado guardado; en ChartWidget está en el cuadro de configuración del
  tipo de gráfico.
</p>
<p>
  El rango automático de las Range Bars es el rango verdadero medio de las últimas 100 barras cerradas,
  redondeado a un 1, 2 o 5 (… 1, 2, 5, 10, 20 …) y a un número entero de pasos de precio del símbolo
  (en un mercado cuyo paso depende del precio, el mayor paso al que negociaron esas barras): barras
  pequeñas en un gráfico de un segundo, más grandes en uno diario. La barra que todavía se forma queda
  fuera del cálculo, así que un tick solo cambia las range bars hechas con esa barra; las anteriores se
  quedan como están. Cuando una barra cierra y lleva la media al siguiente número 1-2-5, o esas barras a
  otro paso de precio, todas las barras se vuelven a construir con el nuevo rango. Al subir, una barra
  cierra en su mínimo más el rango; al bajar, en su máximo menos el rango: su cierre es un precio que
  alcanzó, y su mecha muestra hacia dónde fue primero. Un salto de varios rangos, también un hueco entre
  dos barras, da una barra por cada rango; las barras que llenan un hueco quedan en precios que el
  hueco saltó, en los que nunca se negoció. Un rango, fijado o automático, se eleva a 2, 5, 10, 20…
  veces su valor, el primero que no da más, cuando las barras cerradas darían más de 100.000 range
  bars, o la barra que todavía se forma más de 100.000 por sí sola; entonces todas las barras se
  vuelven a construir con el rango elevado. Un rango menor que la mitad de la 15.ª cifra significativa
  del precio más alto no cierra ninguna barra, se escriban como se escriban los precios.
</p>
<p>
  La caja de Renko, la reversión de Kagi y la caja de Punto y figura siguen el mismo límite: una tan
  pequeña para los precios que las barras anteriores a la última darían más de 100.000 ladrillos,
  líneas o columnas, o la última barra otras tantas por sí sola, se eleva a 2, 5, 10, 20… veces su
  valor, el primero que no da más, y el gráfico se construye con ella. Kagi y Punto y figura dan como
  mucho una línea o una columna por barra, así que solo una serie de más de 100.000 barras puede
  llegar al límite; Line Break, cuyo ajuste es un número de líneas, también da como mucho una línea
  por barra. Una caja, reversión o rango que no sea un número finito mayor que 0, en un estado guardado
  o un enlace compartido, se descarta (el gráfico vuelve a su valor por defecto: calculado a partir
  de los datos, o el 4% de Kagi), así que un enlace no puede bloquear el gráfico. El cuadro de
  configuración no acepta valores por debajo de 0,00000001 y lo dice bajo el campo. En un gráfico en vivo, un tamaño elevado
  se mantiene de un tick a otro, así que cada tick construye las barras una vez, y se vuelve a calcular
  para una serie nueva; <code>toRenko</code>, <code>toKagi</code>, <code>toPointAndFigure</code> y
  <code>toRangeBars</code> hacen lo mismo si reciben un <code>ReshapeMemo</code> como último argumento.
  Usa un memo por serie, pásalo en cada cálculo y llama a <code>memo.clear()</code> (o crea uno nuevo)
  cuando la serie se sustituya por otra, con un símbolo o una temporalidad nuevos: un memo no distingue
  por sí solo una serie nueva y la dibujaría con el tamaño elevado de la anterior.
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
