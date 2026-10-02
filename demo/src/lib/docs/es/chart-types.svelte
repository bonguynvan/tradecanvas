<svelte:head>
  <title>Tipos de gráfico — Documentación de TradeCanvas</title>
  <meta name="description" content="17 tipos de gráfico integrados: velas, OHLC, Heikin-Ashi, Renko, Kagi, Punto y figura, Equivolumen y más." />
</svelte:head>

<h1>Tipos de gráfico</h1>
<p>17 tipos de gráfico integrados. Cámbialos en tiempo de ejecución con <code>chart.setChartType(type)</code>.</p>

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
  </tbody>
</table>

<h2>Derivados</h2>
<table>
  <thead><tr><th>Tipo</th><th>Descripción</th></tr></thead>
  <tbody>
    <tr><td><code>heikinAshi</code></td><td>Serie de velas suavizada mediante la transformación Heikin-Ashi.</td></tr>
    <tr><td><code>renko</code></td><td>Gráfico de ladrillos de precio fijo; independiente del tiempo.</td></tr>
    <tr><td><code>kagi</code></td><td>Líneas de giro yang/yin según un umbral porcentual.</td></tr>
    <tr><td><code>lineBreak</code></td><td>Patrón de giro de ruptura de 3 líneas.</td></tr>
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
