<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Herramientas de dibujo — Documentación de TradeCanvas</title>
  <meta name="description" content="73 herramientas de dibujo integradas, cada una con su propia configuración: herramientas de Fibonacci y Gann, ondas de Elliott, patrones armónicos, notas, pinceles, posición larga/corta con cálculo del tamaño, alertas en dibujos, grupos y capas." />
</svelte:head>

<h1>Herramientas de dibujo</h1>
<p>
  73 herramientas de dibujo integradas. Todas se ajustan a las barras con el imán,
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

<h2 id="panes">En los paneles de indicadores</h2>
<p>
  Un dibujo empezado en un panel de indicador (RSI, MACD…) se hace en ese panel: los precios de sus anclas son los valores del panel, el imán se ajusta a las líneas del panel y el dibujo sigue la escala del panel, sin salir de él. Los paneles laterales y los plegados no admiten dibujos, y las herramientas que leen los precios de las barras (VWAP anclado, perfil de volumen, posición larga/corta) solo se usan en el panel de precio. Un dibujo de un panel no admite alertas de precio.
</p>
<pre><code>{`const rsi = chart.addIndicator('rsi')
chart.addDrawing({
  type: 'horizontalLine',
  anchors: [{ time: t1, price: 70 }],   // 70 en la escala del RSI
  paneId: rsi,                          // el id del panel, como lo da getIndicatorPanes()
})`}</code></pre>
<p>
  Cuando se quita el indicador dueño del panel y otro del panel lo toma, los dibujos van con el panel. Cuando el panel se va, sus dibujos se ocultan y vuelven con él al deshacer. Un diseño guardado los vuelve a poner en sus paneles.
</p>

<h2 id="text">Texto</h2>
<p>
  Las herramientas de texto (Texto, Nota, Llamada, Etiqueta de precio, Marca de flecha) comparten un estilo de texto: tamaño, negrita, cursiva y un color propio. Un Texto, una Nota y una Llamada además alinean sus líneas a la izquierda, al centro o a la derecha, pueden tener fondo y borde, y ajustan las líneas a un ancho. Un Texto conserva sus saltos de línea y sigue de largo si no se le da un ancho; una Nota y una Llamada ajustan a 240 px.
</p>
<p>
  Sin un tamaño propio, las palabras se escriben a 14 px y las cifras (el precio de un nivel, una proporción, un cuadro de estadísticas) a 12 px, ambas un paso o más por encima del texto de los ejes y creciendo con él (<code>chart.setFont</code>, y el widget en una pantalla ancha). Un tamaño de 12 guardado por una versión anterior se lee como ninguno. Las palabras que escribe la gente van en la fuente sans del sistema, y las cifras en la del gráfico; <code>font: {'{'} textFamily {'}'}</code> (o <code>chart.setFont({'{'} textFamily {'}'})</code>) da a las palabras una fuente propia, y el widget les da la de su preajuste.
</p>
<pre><code>{`chart.addDrawing({
  type: 'text',
  anchors: [{ time: t1, price: 101.2 }],
  style: {
    text: 'Breakout\\nretest here',     // se conservan sus saltos de línea
    fontSize: 14, bold: true, italic: false,
    textAlign: 'center',              // 'left' | 'center' | 'right'
    textColor: '#f2a93b',
    textBackground: true, fillColor: '#1e222d', fillOpacity: 0.8,
    textBorder: true, borderColor: '#f2a93b',
    textWrap: 200,                    // px; 0: solo donde el texto salta
  },
})`}</code></pre>
<p>
  En el widget, un texto, una nota, una llamada, una señal, un globo o un texto o nota fijos abren un cuadro sobre sus palabras en cuanto se dibujan y con un doble clic: se escribe encima, Enter o un clic fuera las guarda, Shift+Enter empieza una línea nueva y Escape las devuelve (un texto recién dibujado se quita, también sin palabras). Un solo deshacer quita un texto recién dibujado junto con sus palabras. Su configuración sigue a un clic, en la barra sobre él o en su menú. La barra sobre una selección fija el relleno y el color del texto de las herramientas que los tienen. <code>chart.getDrawingTextRect(id)</code> dice dónde está el cuadro de un texto, para poner encima un editor propio.
</p>

<h3 id="line-text">Texto en líneas y rectángulos</h3>
<p>
  Una línea de tendencia, un rayo, una línea extendida, de información o de ángulo, una flecha, una línea horizontal o vertical y un rectángulo también llevan texto, con el mismo estilo. <code>textAlign</code> lo pone en el extremo izquierdo, el centro o el extremo derecho de la línea, y <code>textVAlign</code> encima de la línea, sobre ella o debajo; en un rectángulo lo colocan dentro, arriba, en el medio o abajo. El texto sigue la pendiente de la línea y siempre se lee de izquierda a derecha, y de abajo arriba en una línea vertical. En el widget, la pestaña Texto tiene esas dos filas.
</p>
<pre><code>{`chart.addDrawing({
  type: 'trendLine',
  anchors: [{ time: t1, price: 98 }, { time: t2, price: 104 }],
  style: { color: '#4c8dff', lineWidth: 2, lineStyle: 'solid',
    text: 'Breakout', textAlign: 'right', textVAlign: 'top' },  // 'top' | 'middle' | 'bottom'
})
chart.addDrawing({ type: 'verticalLine', anchors: [{ time: t3, price: 0 }], options: { showTime: true } })
chart.addDrawing({ type: 'fibRetracement', anchors: [a, b], options: { trendLine: false, oneColor: true } })`}</code></pre>
<p>
  Una línea horizontal y un rayo horizontal ocultan su precio con <code>showPrice: false</code>. Una línea vertical muestra la hora de su barra con <code>showTime: true</code>, escrita como la escribe la cruz. Un rectángulo tiene ocho controles: uno en cada esquina y uno en el centro de cada lado, que mueve solo ese lado. Un retroceso y una extensión de Fibonacci dibujan una línea discontinua por sus puntos (<code>trendLine</code>, activada por defecto) y dibujan todos sus niveles en el color del dibujo con <code>oneColor</code>. Un clic en las palabras también selecciona la línea o el rectángulo.
</p>

<h2 id="look">Cómo se ven los dibujos</h2>
<p>
  Todas las herramientas se dibujan de la misma manera:
</p>
<ul>
  <li>Los controles de un dibujo seleccionado son anillos de su color, rellenos con el fondo del gráfico (la clave de estilo <code>drawings.handleColor</code> los rellena con un color tuyo), un tamaño por encima de su línea: 9 px de diámetro en una línea de 1 px, más en una más gruesa. El control bajo el puntero crece, y el que se arrastra se rellena con el color. Solo el dibujo que un arrastre cambiaría de forma muestra anillos; los demás de una selección, y un dibujo bloqueado, muestran puntos pequeños.</li>
  <li>Un dibujo bajo el puntero brilla un poco, para que quede claro cuál toma un clic.</li>
  <li>Mientras se crea un dibujo, los puntos colocados se muestran como controles.</li>
  <li>Los guiones y los puntos crecen con la línea, los puntos son redondos y los extremos de una línea continua son redondeados. Las puntas de flecha también crecen con la línea.</li>
  <li>Un relleno es el color de la línea, atenuado, salvo que se haya fijado aparte: un dibujo que pasa a rojo se rellena de rojo. Una etiqueta sobre una marca de color se escribe en negro o en blanco, el que mejor se lea; un cuadro de estadísticas usa la superficie y el color de texto del propio gráfico, en ambos temas; las palabras en el color de un dibujo se oscurecen donde no se leerían sobre un fondo claro.</li>
  <li>Las líneas propias de una herramienta siguen su estilo de línea; sus cuadrículas, guías y ángulos secundarios son de 1 px y más claros. Un nivel, un ángulo o una división cuya etiqueta taparía otra queda sin etiqueta, nunca los niveles 0 y 1. Los porcentajes se escriben enteros cuando lo son (50%, no 50.0%), y cada ratio de Fibonacci dibujado junto a otros tiene un color propio.</li>
  <li>Las subidas y las bajadas (un rango de precio, el objetivo y el stop de una Posición larga/corta, el resultado de una previsión) toman los colores de ganancia y pérdida del tema (las claves de estilo <code>trading.profitColor</code> y <code>trading.lossColor</code>), verde y rojo sin ellas.</li>
  <li>Un texto, un icono o una marca de flecha no muestra controles, que quedarían sobre sus letras o su glifo: al seleccionarlo se enmarca, y se mueve pulsando en cualquier parte de él.</li>
</ul>

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

<h3 id="settings-dialog">El diálogo de configuración</h3>
<p>
  En el widget, un doble clic en un dibujo (o Configuración en su barra, en su menú o en el árbol de objetos) abre su
  configuración en pestañas. <strong>Estilo</strong>: la línea (color, grosor, trazo) en una fila, sus extremos, el
  relleno y luego los interruptores y las opciones de la herramienta, y sus niveles. <strong>Texto</strong>, para las
  herramientas que escriben: el texto y su tamaño. <strong>Coordenadas</strong>: el precio, la fecha y la hora de cada
  punto, en la zona horaria del gráfico. <strong>Visibilidad</strong>: las temporalidades en las que se muestra. Cada
  cambio se ve al momento; <strong>Aceptar</strong> los conserva como un solo paso de deshacer, <strong>Cancelar</strong>
  (o Escape) deja el dibujo como estaba. El menú <strong>Plantilla</strong> aplica o elimina una plantilla guardada,
  guarda el aspecto del dibujo como plantilla, guarda las opciones como predeterminadas de la herramienta y las
  restablece.
</p>

<h3 id="drawing-intervals">Visible solo en algunas temporalidades</h3>
<p>
  Un dibujo puede limitarse a algunas temporalidades, con las mismas reglas que un indicador: un tipo desactivado
  (<code>minutes: false</code>) o un rango de él (<code>hours: [1, 4]</code>). En las demás temporalidades no se
  dibuja, no responde a los clics y no se selecciona. Las reglas se guardan con el diseño.
</p>
<pre><code>{`chart.updateDrawing(id, { intervals: { minutes: false } })  // no en los gráficos de minutos
chart.isDrawingShown(id)                                    // false en un gráfico de 5m
chart.updateDrawing(id, { intervals: null })                // todas las temporalidades otra vez

chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: t, price: 100 }], intervals: { days: false, weeks: false } })`}</code></pre>
<p>Con un Chart directo y sin flujo de datos, indica la temporalidad de tus barras con <code>chart.setDataTimeframe('5m')</code>.</p>

<h3 id="line-stats">Extremos, punto medio y estadísticas de una línea</h3>
<p>
  Las líneas de tendencia, los rayos y las líneas extendidas pueden mostrar su punto medio y estadísticas entre sus
  dos puntos: la variación del precio y su porcentaje, las barras y el tiempo entre ellos, el ángulo. Las estadísticas
  se muestran mientras la línea está seleccionada, o siempre, junto a su extremo derecho, su punto medio o su extremo
  izquierdo. Los extremos de una línea de tendencia pueden ser flechas. Todo ello está desactivado hasta que se pide.
</p>
<pre><code>{`chart.setDrawingOptions(id, {
  showPriceRange: true, showBarsRange: true, showDateRange: true, showAngle: true,
  alwaysShowStats: true, statsPosition: 'right',   // 'left' | 'center' | 'right'
  showMiddlePoint: true,
  rightEnd: 'arrow',                                // líneas de tendencia: leftEnd, rightEnd
})`}</code></pre>

<h2 id="selection-toolbar">La barra sobre la selección</h2>
<p>
  En el widget, al hacer clic en un dibujo aparece una pequeña barra justo encima: color, grosor y estilo de línea, y luego ajustes, una alerta en su línea, bloqueo, el menú completo del dibujo (el mismo que con el botón derecho) y borrar. Con varios dibujos seleccionados se sitúa sobre todos y sus cambios van a cada uno. Sigue al dibujo cuando se mueve, se desplaza o se hace zoom, se aparta mientras hay una herramienta de dibujo, la goma o el zoom de área activos, y es una sola parada de tabulación que las flechas recorren.
</p>
<pre><code>{`new ChartWidget(host, { features: { selectionToolbar: false } })  // turn it off
widget.setFeatures({ selectionToolbar: true })

// Your own controls over a drawing, on a bare Chart:
chart.on('drawingSelect', ({ payload }) => {
  const rect = payload.primary ? chart.getDrawingRect(payload.primary) : null
  // { x, y, width, height } in px from the chart container's top-left, or null
})`}</code></pre>

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
chart.moveDrawing(id, 0)              // or a place in the order: 0 the bottom, as getDrawings() lists them
chart.updateDrawing(id, { name: 'Weekly support' })  // its name in the object tree; null: its tool's
const group = chart.groupDrawings([a, b, c], 'Weekly levels')
chart.setDrawingGroupVisible(group, false)
chart.setDrawingGroupLocked(group, true)
chart.ungroupDrawings(group)

chart.getSelectedDrawingIds()
chart.removeDrawings(ids)            // un solo paso de deshacer
chart.removeAll('drawings')         // todos los dibujos; 'indicators', o 'all' para ambos: un paso de deshacer, los dibujos bloqueados se quedan
chart.setDrawingsVisible(ids, false)
chart.setDrawingsLocked(ids, true)

chart.copyDrawings()                 // los seleccionados (Ctrl+C)
chart.pasteDrawings()                // Ctrl+V, aquí o en otro gráfico de la página
chart.canPasteDrawings()             // si hay algo que pegar`}</code></pre>
<p>Al hacer clic en un dibujo de un grupo se selecciona todo el grupo.</p>
<p>En el árbol de objetos del widget los dibujos aparecen según se apilan, el de arriba primero. Un clic en el nombre de un dibujo lo selecciona y un doble clic lo renombra. Su fila lo clona, y su asa lo arrastra al lugar de otra fila; las flechas sobre el asa lo mueven una fila arriba o abajo en la lista y en el apilado a la vez.</p>

<h2>Borrador, zoom e imán</h2>
<pre><code>{`chart.setEraserMode(true)          // cada clic sobre un dibujo lo elimina, hasta pulsar Escape
chart.setZoomAreaMode(true)        // el siguiente arrastre amplía las barras que quedan dentro del recuadro
chart.setDrawingMagnetMode('strong') // 'off' | 'weak' | 'strong'`}</code></pre>
<p>El imán débil ajusta un punto a la apertura, el máximo, el mínimo o el cierre de la barra cuando el puntero está cerca de uno de ellos; el imán fuerte lo hace siempre. En el widget el imán empieza apagado: un dibujo queda donde se pone hasta que el botón del imán lo enciende.</p>

<h2 id="cursors">Cursores, y el tramo de un dibujo en los ejes</h2>
<pre><code>{`new Chart(el, { crosshair: { mode: 'magnet', cursor: 'dot' } })
chart.setCrosshairCursor('arrow')        // 'cross' | 'dot' | 'arrow'
chart.on('crosshairCursorChange', (e) => e.payload)  // { cursor }
widget.setCrosshairCursor('dot')         // the widget's, a Chart Setting
chart.setDrawingAxisSpansVisible(false)  // or features: { drawingAxisSpans: false }`}</code></pre>
<p><strong>Cross</strong> dibuja las líneas de la cruz con un cursor en cruz. <strong>Dot</strong> dibuja las mismas líneas con un punto pequeño del color de la cruz como cursor. <strong>Arrow</strong> no dibuja líneas y deja el cursor de flecha, mientras el precio y la hora siguen al puntero en los ejes. En el widget, el botón del cursor arriba de las herramientas de dibujo abre un menú con los tres, y los ajustes del gráfico tienen la fila. El tipo es del espectador: <code>persistSettings</code> lo guarda, y un layout o un enlace compartido nunca lo lleva.</p>
<p>Mientras un dibujo está seleccionado, se mueve o se está dibujando, el eje de precios se tiñe de su precio más bajo al más alto y el eje de tiempo de su primera a su última hora, con cada extremo rotulado en el color del dibujo. Una línea horizontal marca solo su precio y una vertical solo su hora; un dibujo fijado a la pantalla no marca ninguno. La goma resalta el dibujo que un clic borraría.</p>

<h2 id="editing">Editar con el puntero y las teclas</h2>
<ul>
  <li>El imán también actúa al arrastrar un control y al mover un dibujo: el punto más cercano a donde se agarró cae en un precio y el resto conserva su posición respecto a él. El imán débil alcanza 50 px.</li>
  <li>Mantén <kbd>Ctrl</kbd>/<kbd>⌘</kbd> al dibujar o arrastrar para invertir el imán mientras tanto: se activa si está apagado y se apaga si está activo.</li>
  <li>Mantén <kbd>Shift</kbd> al dibujar o arrastrar un control para que la línea quede horizontal, vertical o a 45° en pantalla. En una zona vacía del gráfico, <kbd>Shift</kbd> + arrastrar sigue midiendo. Vale para líneas y trazados; un rectángulo, el ancho de un canal o el punto de un pitchfork quedan libres.</li>
  <li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> mueven los dibujos seleccionados una barra a los lados o un píxel arriba o abajo; con <kbd>Shift</kbd>, diez. Una serie de pulsaciones es un solo paso de deshacer, y los dibujos bloqueados no se mueven.</li>
  <li><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + arrastrar sobre un dibujo saca una copia (de toda la selección si el dibujo está en ella), en un solo paso de deshacer. <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + clic sigue añadiéndolo a la selección o quitándolo, y <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + arrastrar en una zona vacía dibuja un cuadro de selección. Sobre un control del dibujo seleccionado, <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + arrastrar lo reforma con el imán invertido.</li>
  <li><kbd>Escape</kbd> mientras se arrastra un dibujo cancela el arrastre: un dibujo movido o reformado vuelve a donde estaba, y una copia que se estaba sacando desaparece, sin dejar nada que deshacer.</li>
</ul>

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
  <li><code>parallelChannel</code> — la línea que pasa por sus dos primeros puntos, desplazada en vertical hasta el tercero (así la leen sus alertas), con una línea central opcional, que se extiende en cualquiera de los dos sentidos.</li>
  <li><code>regressionChannel</code> — la recta de mínimos cuadrados de los cierres entre sus dos puntos, con bandas a dos desviaciones estándar a cada lado; sus puntos fijan las barras, y sus controles quedan sobre la recta.</li>
</ul>

<h3>Fibonacci</h3>
<ul>
  <li><code>fibRetracement</code>, <code>fibExtension</code> — niveles editables, precios y porcentajes, etiquetas a la izquierda o a la derecha, fondo, invertir.</li>
  <li><code>fibChannel</code>, <code>fibSpeedResistanceFan</code> — los rayos del abanico en los colores de sus niveles, los rayos de tiempo discontinuos, ambos con etiqueta.</li>
  <li><code>fibTimeZones</code> — desde el inicio de la zona (0) en adelante; sus controles, y los de <code>cyclicLines</code>, quedan sobre sus líneas, a media altura del área del gráfico.</li>
  <li><code>fibArcs</code> — arcos alrededor del inicio de un movimiento, semicírculos o círculos completos.</li>
  <li><code>fibCircles</code> — círculos en múltiplos de Fibonacci de un radio.</li>
  <li><code>fibSpiral</code> — una espiral áurea desde su centro.</li>
  <li><code>fibWedge</code> — arcos entre dos líneas que parten de un vértice.</li>
</ul>

<h3>Gann y horquillas</h3>
<ul>
  <li><code>pitchfork</code>, <code>schiffPitchfork</code>, <code>modifiedSchiffPitchfork</code> — la línea B–C une las púas, y la horquilla se tiñe entre ellas hasta el borde del área del gráfico.</li>
  <li><code>pitchfan</code> — rayos desde un pivote a través de niveles entre dos puntos.</li>
  <li><code>gannFan</code> — cada ángulo lleva su etiqueta donde sale del área del gráfico; <code>gannBox</code> — sus divisiones llevan etiqueta en precio y en tiempo; <code>gannSquare</code></li>
</ul>

<h3>Formas</h3>
<ul>
  <li><code>rectangle</code>, <code>circle</code>, <code>ellipse</code>, <code>triangle</code> — los controles de una elipse están sobre su curva y cada uno mueve un lado.</li>
  <li><code>polyline</code> — una forma cerrada, un punto por clic.</li>
  <li><code>curve</code> — curvada a través de un tercer punto; <code>arc</code> — un arco de circunferencia por tres puntos.</li>
</ul>

<h3>Pinceles</h3>
<ul>
  <li><code>brush</code>, <code>highlighter</code> — a mano alzada; seleccionado, el trazo se enmarca como un texto y se mueve pulsando en cualquier punto de él.</li>
  <li><code>path</code> — una línea a través de puntos, con una flecha al final.</li>
</ul>

<h3>Patrones</h3>
<ul>
  <li><code>xabcdPattern</code>, <code>cypherPattern</code>, <code>abcdPattern</code>, <code>threeDrives</code> — con sus proporciones. Los nombres de los puntos quedan por fuera de ellos, lejos de los controles; cada proporción va sobre su guía, o justo al lado si la línea está ocupada, sin tapar nunca un nombre, un control u otra proporción.</li>
  <li><code>headAndShoulders</code> — con la línea clavicular y el nombre de cada pico sobre él, abreviado a LS, H y RS donde los nombres completos se tocarían.</li>
</ul>

<h3>Ondas de Elliott</h3>
<ul>
  <li><code>elliottWave</code> (1–5, A–C), <code>elliottImpulse</code>, <code>elliottCorrection</code>, <code>elliottTriangle</code>, <code>elliottDoubleCombo</code>, <code>elliottTripleCombo</code> — etiquetas al estilo del grado de la onda: una cifra en un círculo, (1), 1 o i, por fuera de sus puntos.</li>
</ul>

<h3>Ciclos</h3>
<ul>
  <li><code>cyclicLines</code>, <code>timeCycles</code>, <code>sineLine</code></li>
</ul>

<h3>Medición</h3>
<ul>
  <li><code>priceRange</code> — un cuadro en el color de subida o de bajada (o el que elijas para él) con una flecha que lo recorre hacia arriba o hacia abajo y el cambio en una marca pasado su extremo.</li>
  <li><code>dateRange</code> — las barras entre dos momentos, una flecha que lo cruza y las barras y el tiempo en una marca; sus controles en los extremos de su flecha, a media altura del área del gráfico.</li>
  <li><code>dateAndPriceRange</code> — ambos a la vez, con una flecha en cada medida y el volumen dentro; <code>measure</code> — el cambio y las barras entre dos puntos.</li>
</ul>

<h3>Notas y marcas</h3>
<ul>
  <li><code>text</code>, <code>note</code> (una chincheta con su texto), <code>callout</code>, <code>priceLabel</code></li>
  <li><code>arrow</code>, <code>arrowMark</code> (arriba, abajo, izquierda o derecha, con etiqueta), <code>flag</code>, <code>icon</code> (estrella, corazón, marca de verificación, cruz, círculo, triángulos, rayo)</li>
  <li><code>signpost</code> (su texto en un cartel sobre un poste clavado en una barra), <code>balloon</code> (su texto en un globo que señala una barra)</li>
  <li><code>anchoredText</code>, <code>anchoredNote</code>: fijos en un lugar de la pantalla, no se mueven cuando el gráfico se desplaza, hace zoom o cambia de símbolo. Sus puntos son fracciones del área del gráfico (<code>{'{'} time: 0.5, price: 0.25 {'}'}</code> es la mitad a lo ancho y un cuarto desde arriba), y la configuración no tiene pestaña de Coordenadas.</li>
</ul>

<h3>Previsión</h3>
<ul>
  <li><code>riskReward</code> — Posición larga/corta (arriba).</li>
  <li><code>forecast</code> — en el color de subida cuando el precio alcanza el objetivo, en el de bajada si antes se agota su tiempo.</li>
  <li><code>projection</code> — un movimiento trasladado desde un tercer punto.</li>
  <li><code>barsPattern</code> — una copia de algunas barras, como barras, línea o máximo-mínimo, reflejada o volteada; las barras que copia quedan bajo una banda clara.</li>
  <li><code>anchoredVWAP</code> — su control sobre el VWAP donde empieza; <code>volumeProfileRange</code> — el volumen en cada precio como un histograma dentro del cuadro del rango, el área de valor (70% del volumen) sombreada y el punto de control atravesándolo; sus controles en las esquinas del cuadro.</li>
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
