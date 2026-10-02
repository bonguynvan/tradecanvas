<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Herramientas de dibujo — Documentación de TradeCanvas</title>
  <meta name="description" content="69 herramientas de dibujo integradas, cada una con su propia configuración: herramientas de Fibonacci y Gann, ondas de Elliott, patrones armónicos, notas, pinceles, posición larga/corta con cálculo del tamaño, alertas en dibujos, grupos y capas." />
</svelte:head>

<h1>Herramientas de dibujo</h1>
<p>
  69 herramientas de dibujo integradas. Todas se ajustan a las barras con el imán,
  admiten deshacer y rehacer, guardan su propia configuración y se guardan con el
  diseño.
</p>

<h2>Dibujar con el puntero</h2>
<pre><code>{`chart.setDrawingTool('trendLine')   // los siguientes clics dibujan una línea de tendencia
chart.setDrawingTool(null)          // vuelve al cursor
chart.setStayInDrawingMode(true)    // mantiene la herramienta tras cada dibujo`}</code></pre>
<p>Una herramienta se dibuja de una de estas tres maneras:</p>
<ul>
  <li><b>Clics</b> — un clic por punto (dos para una línea de tendencia, cinco para un patrón XABCD).</li>
  <li><b>Mano alzada</b> — pulsa y arrastra; <code>brush</code> y <code>highlighter</code>.</li>
  <li><b>Ruta</b> — un clic por punto y, para terminarla, un doble clic, <kbd>Enter</kbd> o un clic en el último punto; <code>path</code> y <code>polyline</code>.</li>
</ul>
<p><kbd>Escape</kbd> descarta un dibujo que aún no está terminado.</p>

<h2>Añadir dibujos desde el código</h2>
<pre><code>{`const id = chart.addDrawing({
  type: 'fibRetracement',
  anchors: [{ time: t1, price: 101.2 }, { time: t2, price: 96.4 }],
  style: { color: '#f2a93b' },
  options: { reverse: true, extendRight: true },
})

chart.autoFib()   // un retroceso sobre el swing dominante a la vista, o null`}</code></pre>

<h2>Configuración</h2>
<p>
  Además de su estilo (color, grosor, estilo de línea, relleno, texto), una
  herramienta puede ofrecer configuración propia: niveles de Fibonacci, extender
  una línea a la izquierda o a la derecha, etiquetas, un fondo, un icono, un grado
  de onda. El diálogo de configuración del widget se construye a partir de ella.
</p>
<pre><code>{`chart.getDrawingOptionDefs('fibRetracement')  // qué ofrece la herramienta
chart.getDrawingOptions(id)                   // sus valores, con los predeterminados rellenados
chart.setDrawingOptions(id, {
  levels: [{ value: 0.5, visible: true }, { value: 0.618, visible: true, color: '#e8505b' }],
})

// varios cambios como un solo paso de deshacer
chart.updateDrawing(id, { style: { lineWidth: 2 }, options: { extendLeft: true } })

// un diálogo que previsualiza los cambios: un paso de deshacer, o se revierte al cancelar
chart.beginDrawingEdit(id)
chart.updateDrawing(id, { style: { color: '#26a69a' } })
chart.endDrawingEdit(id, { cancel: false })

// con qué empieza cada retroceso de Fibonacci nuevo
chart.setDrawingToolDefaults('fibRetracement', { showPrices: false })`}</code></pre>
<p>La configuración de un diseño guardado o de un dibujo pegado se comprueba contra la herramienta; los valores que esta no admite se descartan.</p>

<h2>Posición larga/corta</h2>
<p>
  <code>riskReward</code>: arrastra desde la entrada hasta el stop. El objetivo se
  coloca a la distancia que marca la proporción beneficio:riesgo, y su punto de
  control cambia esa proporción. A partir del tamaño de la cuenta y del riesgo (un
  porcentaje de la cuenta o un importe) calcula la cantidad y muestra el precio, la
  distancia y la ganancia o pérdida de cada línea.
</p>
<pre><code>{`chart.setDrawingOptions(id, { accountSize: 25_000, riskMode: 'percent', risk: 1, rewardRatio: 3 })`}</code></pre>

<h2>Alertas en dibujos</h2>
<p>
  Una alerta puede seguir una línea de tendencia, un rayo, una línea extendida u
  horizontal, o las líneas de un canal paralelo: se activa cuando el precio cruza
  la línea en el valor que esta tiene en la última barra, tal como está dibujada en
  el gráfico (recta entre barras y, en una escala logarítmica, en precio
  logarítmico).
</p>
<pre><code>{`if (chart.canAddDrawingAlert(id)) {
  chart.addDrawingAlert(id, { condition: 'crossingUp', message: 'Broke the trend line' })
}`}</code></pre>
<p>La alerta acompaña a su dibujo, vuelve con él al deshacer y se guarda con el diseño.</p>

<h2>Orden y grupos</h2>
<pre><code>{`chart.moveDrawing(id, 'front')       // 'front' | 'forward' | 'backward' | 'back'
const group = chart.groupDrawings([a, b, c], 'Weekly levels')
chart.setDrawingGroupVisible(group, false)
chart.setDrawingGroupLocked(group, true)
chart.ungroupDrawings(group)

chart.getSelectedDrawingIds()
chart.removeDrawings(ids)            // un solo paso de deshacer
chart.setDrawingsVisible(ids, false)
chart.setDrawingsLocked(ids, true)`}</code></pre>
<p>Al hacer clic en un dibujo de un grupo se selecciona todo el grupo.</p>

<h2>Borrador, zoom e imán</h2>
<pre><code>{`chart.setEraserMode(true)          // cada clic sobre un dibujo lo elimina, hasta pulsar Escape
chart.setZoomAreaMode(true)        // el siguiente arrastre amplía las barras que quedan dentro del recuadro
chart.setDrawingMagnetMode('strong') // 'off' | 'weak' | 'strong'`}</code></pre>
<p>El imán débil ajusta un punto a la apertura, el máximo, el mínimo o el cierre de la barra cuando el puntero está cerca de uno de ellos; el imán fuerte lo hace siempre.</p>

<h2>Teclado</h2>
<ul>
  <li><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Z</kbd> deshacer, <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> o <kbd>Ctrl</kbd> + <kbd>Y</kbd> rehacer.</li>
  <li><kbd>Ctrl</kbd> + <kbd>C</kbd> / <kbd>V</kbd> copiar y pegar dibujos, <kbd>Ctrl</kbd> + <kbd>D</kbd> duplicar, <kbd>Delete</kbd> eliminar.</li>
  <li><kbd>Ctrl</kbd> + <kbd>G</kbd> agrupar la selección, <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd> desagrupar.</li>
  <li><kbd>Ctrl</kbd> + <kbd>]</kbd> / <kbd>[</kbd> traer adelante / enviar atrás; con <kbd>Shift</kbd>, al frente / al fondo.</li>
  <li><kbd>Enter</kbd> termina una ruta; <kbd>Escape</kbd> abandona la herramienta, el borrador o la selección.</li>
</ul>

<h2>Eventos</h2>
<pre><code>{`chart.on('drawingCreate', (e) => e.payload)       // { id, type, drawing }
chart.on('drawingUpdate', (e) => e.payload)       // { id }
chart.on('drawingRemove', (e) => e.payload)       // { id }
chart.on('drawingDoubleClick', (e) => e.payload)  // { id }
chart.on('drawingContextMenu', (e) => e.payload)  // { id, x, y }
chart.on('toolModeChange', (e) => e.payload)      // { eraser } o { zoomArea }`}</code></pre>
<p>Deshacer y rehacer envían <code>drawingCreate</code>, <code>drawingRemove</code> y <code>drawingUpdate</code> para los dibujos que recuperan, quitan o modifican.</p>

<h2>Catálogo</h2>

<h3>Líneas</h3>
<ul>
  <li><code>trendLine</code> — se extiende a la izquierda o a la derecha si se pide.</li>
  <li><code>ray</code>, <code>extendedLine</code></li>
  <li><code>horizontalLine</code>, <code>horizontalRay</code> (hacia delante en el tiempo desde su punto), <code>verticalLine</code>, <code>crossLine</code></li>
  <li><code>infoLine</code> — con un cuadro de variación de precio, barras, tiempo y ángulo.</li>
  <li><code>trendAngle</code> — con su ángulo en pantalla.</li>
</ul>

<h3>Canales</h3>
<ul>
  <li><code>parallelChannel</code> — con una línea central opcional, que se extiende en cualquiera de los dos sentidos.</li>
  <li><code>regressionChannel</code></li>
</ul>

<h3>Fibonacci</h3>
<ul>
  <li><code>fibRetracement</code>, <code>fibExtension</code> — niveles editables, precios y porcentajes, etiquetas a la izquierda o a la derecha, fondo, invertir.</li>
  <li><code>fibChannel</code>, <code>fibTimeZones</code>, <code>fibSpeedResistanceFan</code></li>
  <li><code>fibArcs</code> — arcos alrededor del inicio de un movimiento, semicírculos o círculos completos.</li>
  <li><code>fibCircles</code> — círculos en múltiplos de Fibonacci de un radio.</li>
  <li><code>fibSpiral</code> — una espiral áurea desde su centro.</li>
  <li><code>fibWedge</code> — arcos entre dos líneas que parten de un vértice.</li>
</ul>

<h3>Gann y horquillas</h3>
<ul>
  <li><code>pitchfork</code>, <code>schiffPitchfork</code>, <code>modifiedSchiffPitchfork</code></li>
  <li><code>pitchfan</code> — rayos desde un pivote a través de niveles entre dos puntos.</li>
  <li><code>gannFan</code>, <code>gannBox</code>, <code>gannSquare</code></li>
</ul>

<h3>Formas</h3>
<ul>
  <li><code>rectangle</code>, <code>circle</code>, <code>ellipse</code>, <code>triangle</code></li>
  <li><code>polyline</code> — una forma cerrada, un punto por clic.</li>
  <li><code>curve</code> — curvada a través de un tercer punto; <code>arc</code> — un arco de circunferencia por tres puntos.</li>
</ul>

<h3>Pinceles</h3>
<ul>
  <li><code>brush</code>, <code>highlighter</code> — a mano alzada.</li>
  <li><code>path</code> — una línea a través de puntos, con una flecha al final.</li>
</ul>

<h3>Patrones</h3>
<ul>
  <li><code>xabcdPattern</code>, <code>cypherPattern</code>, <code>abcdPattern</code>, <code>threeDrives</code> — con sus proporciones.</li>
  <li><code>headAndShoulders</code> — con la línea clavicular.</li>
</ul>

<h3>Ondas de Elliott</h3>
<ul>
  <li><code>elliottWave</code> (1–5, A–C), <code>elliottImpulse</code>, <code>elliottCorrection</code>, <code>elliottTriangle</code>, <code>elliottDoubleCombo</code>, <code>elliottTripleCombo</code> — etiquetas al estilo del grado de la onda: ①, (1), 1 o i.</li>
</ul>

<h3>Ciclos</h3>
<ul>
  <li><code>cyclicLines</code>, <code>timeCycles</code>, <code>sineLine</code></li>
</ul>

<h3>Medición</h3>
<ul>
  <li><code>measure</code>, <code>priceRange</code>, <code>dateRange</code>, <code>dateAndPriceRange</code></li>
</ul>

<h3>Notas y marcas</h3>
<ul>
  <li><code>text</code>, <code>note</code> (una chincheta con su texto), <code>callout</code>, <code>priceLabel</code></li>
  <li><code>arrow</code>, <code>arrowMark</code> (arriba, abajo, izquierda o derecha, con etiqueta), <code>flag</code>, <code>icon</code> (estrella, corazón, marca de verificación, cruz, círculo, triángulos, rayo)</li>
</ul>

<h3>Previsión</h3>
<ul>
  <li><code>riskReward</code> — Posición larga/corta (arriba).</li>
  <li><code>forecast</code> — verde cuando el precio alcanza el objetivo, rojo si antes se agota su tiempo.</li>
  <li><code>projection</code> — un movimiento trasladado desde un tercer punto.</li>
  <li><code>barsPattern</code> — una copia de algunas barras, como barras, línea o máximo-mínimo, reflejada o volteada.</li>
  <li><code>anchoredVWAP</code>, <code>volumeProfileRange</code></li>
</ul>

<h2>Guardado</h2>
<pre><code>{`const json = chart.saveState()   // dibujos, su configuración y grupos, indicadores, alertas…
chart.loadState(json)            // comprueba cada dibujo; los mal formados se descartan`}</code></pre>

<h2>Tus propias herramientas</h2>
<p>
  Una herramienta es un <code>DrawingPlugin</code> registrado con
  <code>chart.registerDrawingTool(plugin)</code>. Su descriptor enumera su
  configuración (<code>options</code>), cómo se dibuja (<code>creation</code>) y
  si tiene relleno o texto; puede dar los precios de sus líneas
  (<code>priceAt</code>, para las alertas), puntos de control para mover que no son
  anclas (<code>moveHandle</code>) y recibir las barras del gráfico
  (<code>setDataGetter</code>). Consulta <a href={href('/docs/plugins')}>Plugins</a>.
</p>
