<svelte:head>
  <title>Herramientas de dibujo — Documentación de TradeCanvas</title>
  <meta name="description" content="40 herramientas de dibujo integradas: líneas de tendencia, canales y abanicos de Fibonacci, horquillas de Schiff, patrones armónicos, Gann, ondas de Elliott, perfil de volumen de rango, posición larga/corta y más." />
</svelte:head>

<h1>Herramientas de dibujo</h1>
<p>40 herramientas de dibujo integradas. Todas admiten ajuste con imán, deshacer/rehacer y serialización completa a JSON.</p>

<h2>Activar una herramienta</h2>
<pre><code>{`chart.activateDrawingTool('trendLine')
// User clicks two points; the drawing is added to the manager.`}</code></pre>

<h2>Fibonacci automático</h2>
<p>
  Con un clic se dibuja un retroceso de Fibonacci sobre el swing dominante (máximo
  y mínimo extremos) del rango visible, anclado de mínimo→máximo en un swing
  alcista y de máximo→mínimo en uno bajista. Ejecútalo desde la paleta de comandos
  ("Fibonacci automático") o por código:
</p>
<pre><code>{`chart.autoFib()  // returns the new drawing id, or null if no clear swing

// general drawing append (active style applied, id auto-assigned)
chart.addDrawing({ type: 'fibRetracement', anchors: [a, b] })`}</code></pre>

<h2>Catálogo</h2>

<h3>Líneas</h3>
<ul>
  <li><code>trendLine</code></li>
  <li><code>ray</code></li>
  <li><code>extendedLine</code></li>
  <li><code>horizontalLine</code></li>
  <li><code>horizontalRay</code> — como <code>horizontalLine</code>, pero solo se extiende hacia delante en el tiempo desde el ancla.</li>
  <li><code>verticalLine</code></li>
  <li><code>crossLine</code> — una línea horizontal y otra vertical que pasan por un punto (un solo clic).</li>
  <li><code>infoLine</code> — línea de tendencia con un cuadro de estadísticas: cambio de precio y %, barras y tiempo abarcados, ángulo.</li>
  <li><code>trendAngle</code> — línea de tendencia que muestra su ángulo en pantalla en grados.</li>
</ul>

<h3>Canales</h3>
<ul>
  <li><code>parallelChannel</code></li>
  <li><code>regressionChannel</code></li>
</ul>

<h3>Formas</h3>
<ul>
  <li><code>rectangle</code></li>
  <li><code>ellipse</code></li>
  <li><code>triangle</code></li>
  <li><code>circle</code> — primero el centro y después un punto del borde.</li>
</ul>

<h3>Fibonacci</h3>
<ul>
  <li><code>fibRetracement</code></li>
  <li><code>fibExtension</code></li>
  <li><code>fibTimeZones</code> — proyecciones verticales de intervalos de Fibonacci a partir de un lapso de tiempo entre dos anclas.</li>
  <li><code>fibChannel</code> — A→B es la línea de tendencia base y C fija el ancho; paralelas en fracciones de Fibonacci de ese ancho.</li>
  <li><code>fibSpeedResistanceFan</code> — rayos desde A que pasan por fracciones de Fibonacci del movimiento A→B, tanto en precio como en tiempo.</li>
</ul>

<h3>Avanzadas</h3>
<ul>
  <li><code>pitchfork</code> — horquilla de Andrews.</li>
  <li><code>schiffPitchfork</code> — la mediana empieza a mitad de precio entre A y B, en el tiempo de A.</li>
  <li><code>modifiedSchiffPitchfork</code> — la mediana empieza en el punto medio entre A y B.</li>
  <li><code>cyclicLines</code> — líneas verticales que se repiten con el intervalo A→B.</li>
  <li><code>gannFan</code></li>
  <li><code>gannBox</code></li>
  <li><code>anchoredVWAP</code></li>
  <li><code>volumeProfileRange</code></li>
</ul>

<h3>Patrones</h3>
<ul>
  <li><code>xabcdPattern</code> — XABCD armónico (Gartley, Bat, Butterfly, Crab…) con las proporciones XB, AC, BD y XD etiquetadas.</li>
  <li><code>abcdPattern</code> — ABCD con las proporciones BC/AB y CD/BC.</li>
  <li><code>headAndShoulders</code> — siete pivotes con la línea clavicular trazada por los dos puntos del cuello.</li>
  <li><code>elliottWave</code> — conteo de ondas 1-2-3-4-5-A-B-C.</li>
</ul>

<h3>Medición</h3>
<ul>
  <li><code>measure</code></li>
  <li><code>priceRange</code></li>
  <li><code>dateRange</code></li>
  <li><code>dateAndPriceRange</code> — un cuadro que mide el cambio de precio, las barras, el tiempo y el volumen negociado.</li>
</ul>

<h3>Anotaciones</h3>
<ul>
  <li><code>text</code></li>
  <li><code>arrow</code></li>
  <li><code>priceLabel</code> — etiqueta anclada a un punto que muestra su precio (o <code>style.text</code>).</li>
</ul>

<h3>Posición</h3>
<ul>
  <li><code>riskReward</code> — "Posición larga/corta": arrastra desde la entrada hasta el stop; la dirección y una zona sombreada de riesgo/beneficio (2:1 por defecto) se calculan automáticamente.</li>
</ul>

<h2>Serialización</h2>
<pre><code>{`const json = chart.serialize()              // → string
chart.deserialize(json)                     // validates + restores drawings/indicators/viewport`}</code></pre>

<p>
  <code>deserialize</code> descarta los dibujos, órdenes e indicadores mal
  formados: los datos parciales o corruptos ya no estropean el gráfico.
</p>
