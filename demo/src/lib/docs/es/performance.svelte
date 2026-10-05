<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Rendimiento — Documentación de TradeCanvas</title>
  <meta name="description" content="Cómo se mantiene rápido TradeCanvas: renderizado en dos canvas, trabajo limitado al rango visible, indicadores incrementales, cargas completas baratas y submuestreo LTTB, con cifras de benchmark." />
</svelte:head>

<h1>Rendimiento</h1>
<p>
  Un pipeline Canvas2D de dos canvas solo vuelve a pintar lo que ha cambiado, y
  cada paso por fotograma depende de lo que hay en pantalla, no de cuánto
  historial está cargado. Las cifras de abajo proceden de <code>pnpm bench</code>
  (un solo núcleo) y del perfilado del widget en vivo; el
  <a href={href('/') + '#lab-title'}>Feature Lab</a> mide los cambios reales a
  medida que haces clic.
</p>

<h2>Fotogramas: estables de 500 a 100,000 barras</h2>
<ul>
  <li><strong>Dos canvas</strong>: un canvas de escena (cuadrícula, series, indicadores, objetos del gráfico, ejes) y un canvas superior ligero para la cruz, la leyenda y demás elementos ligados al puntero. Al pasar el cursor solo se vuelve a pintar el canvas superior (~0.2 ms), y el navegador compone dos superficies, no cuatro.</li>
  <li><strong>Renderizado del rango visible</strong>: todos los renderizadores, la escala automática y el rango de precios de los indicadores recorren solo las barras a la vista.</li>
  <li><strong>Sin basura por fotograma</strong>: las instantáneas de la vista se guardan en caché entre cambios; los formateadores de números y fechas se reutilizan en lugar de recrearse para cada etiqueta.</li>
  <li><strong>Eje de precio de tamaño automático</strong>: ajustar el eje a su etiqueta más larga cuesta ~0.05 ms y solo se recalcula el diseño cuando el ancho cambia de verdad.</li>
</ul>

<h2>Ticks en vivo: indicadores incrementales</h2>
<p>
  Un tick solo mueve la barra en formación, así que los indicadores que
  implementan <code>update()</code> recalculan únicamente esa barra (SMA, EMA, WMA,
  VWMA, Bollinger, Envelope, RSI, MACD, ATR, OBV, Stochastic). Los demás recurren a
  un recálculo completo. BB + EMA + RSI + MACD:
</p>
<table>
  <thead><tr><th>Historial</th><th>Recálculo completo</th><th><code>update()</code> incremental</th></tr></thead>
  <tbody>
    <tr><td>20,000 barras</td><td>~5 ms</td><td>~0.0005 ms</td></tr>
    <tr><td>100,000 barras</td><td>~27 ms</td><td>~0.001 ms</td></tr>
  </tbody>
</table>
<p>
  Los indicadores personalizados también pueden aprovecharlo; consulta <a href={href('/docs/plugins')}>Plugins → actualizaciones rápidas en vivo</a>.
</p>

<h2>Cambio de símbolo o de temporalidad</h2>
<ul>
  <li><strong>Cargas completas baratas</strong>: los valores de los indicadores viven en un <code>IndicatorValueMap</code> (basado en arrays, ~3× más barato de construir que un <code>Map</code> indexado por marca de tiempo), y <code>setData</code> reutiliza las barras que ya son válidas en lugar de copiarlas.</li>
  <li><strong>Indicador de carga solo cuando es lento</strong>: el gráfico anterior sigue visible; solo aparece un velo si un cambio dura más de 200 ms, así que un cambio de red normal de ~130 ms nunca parpadea.</li>
  <li><strong>Sin datos obsoletos</strong>: las solicitudes de historial superadas se descartan y los sockets antiguos se desconectan, así que el último clic siempre gana.</li>
  <li><strong>Remuestreo local</strong>: con datos estáticos se cambia de temporalidad sin volver a descargar; los remuestreos lentos pintan el velo antes de que el hilo principal se ocupe.</li>
</ul>

<h2>Submuestreo LTTB</h2>
<p>
  Los gráficos de línea y de área submuestrean el rango visible a ~2 puntos por
  píxel con <strong>Largest-Triangle-Three-Buckets</strong> cuando hay muchas más
  barras que píxeles: la línea se ve idéntica mientras se dibujan decenas de veces
  menos puntos. Con el zoom normal no hace nada. El algoritmo se exporta para que
  lo uses tú también:
</p>
<pre><code>{`import { lttbDownsample } from '@tradecanvas/chart'

// indices preserving the shape of a 100k series, reduced to 1600 points
const idx = lttbDownsample(series.length, 1600, (i) => series[i].close)`}</code></pre>
<table>
  <thead><tr><th>Puntos visibles → 1600</th><th>Tiempo / fotograma</th><th>Rendimiento</th></tr></thead>
  <tbody>
    <tr><td>10,000</td><td>~0.025 ms</td><td>39,600 / s</td></tr>
    <tr><td>100,000</td><td>~0.32 ms</td><td>3,100 / s</td></tr>
    <tr><td>1,000,000</td><td>~2.6 ms</td><td>380 / s</td></tr>
  </tbody>
</table>

<h2>Indicadores con zoom alejado</h2>
<p>
  Cuando cada barra mide menos de un píxel, las líneas, bandas e histogramas de los indicadores se dibujan con un tramo por columna de píxeles: del punto más bajo al más alto de la columna, unido a la columna anterior y tan ancho como la línea. Se ve casi igual que un trazo por miles de puntos con una fracción del trabajo de rasterizado. Con el zoom alejado sobre 200.000 barras con Bandas de Bollinger, EMA, RSI y MACD, un fotograma pasó de unos 54 ms a unos 21 ms en una GPU integrada. <code>node scripts/bench-render.mjs</code> mide estas cifras en tu propio equipo.
</p>

<h2>Renderizador WebGL (versión preliminar)</h2>
<p>
  <code>renderer: 'webgl'</code> dibuja el área del gráfico y los paneles de indicadores con WebGL 2, en un canvas bajo la escena 2D: la cuadrícula, las sesiones, las velas y el volumen directamente, y el dibujo en Canvas 2D de los indicadores, las líneas de comparación y la mayoría de los tipos de gráfico se graba como trazos, rellenos y rectángulos de la GPU, con los bordes suavizados como en Canvas 2D. El mapa de calor de profundidad y los perfiles de volumen y de mercado se graban igual, bajo las barras; un perfil de mercado que muestra su recuadro de estadísticas o sus letras sigue en Canvas 2D. El texto, los dibujos, las órdenes, los ejes y la cruceta siguen en Canvas 2D, igual que todo lo que la GPU no dibujaría igual (se deja a Canvas 2D en orden, así que el apilado no cambia); los plugins de indicadores propios funcionan sin cambios. Las velas caen en los mismos píxeles del dispositivo que con Canvas 2D; las líneas y los rellenos solo difieren en algunos píxeles de borde suavizados. El código WebGL es un chunk propio (unos 17 KB con gzip) que se carga la primera vez que se usa; donde falta WebGL 2, o si se pierde el contexto, el gráfico sigue dibujando con Canvas 2D. Si el contexto vuelve, WebGL también. Como mucho 8 gráficos de una página dibujan con WebGL a la vez (<code>setMaxWebGLCharts</code>), porque Chrome y Safari solo mantienen unos 16 contextos WebGL por página y descartan el más antiguo al pasarse; un gráfico por encima del límite dibuja con Canvas 2D hasta que se libere uno. Comprobado en Chrome, Firefox y WebKit.
</p>
<pre><code>{`const chart = new Chart(el, { renderer: 'webgl' })

chart.on('rendererChange', (e) => console.log(e.payload))
// { renderer: 'webgl', reason?: 'contextRestored' }, or { renderer: 'canvas', reason: 'unsupported' | 'contextLost' | 'limit' }

await chart.setRenderer('canvas')   // resolves to what draws now

setMaxWebGLCharts(4)   // from '@tradecanvas/chart': at most 4 charts on the page draw with WebGL (8 by default)`}</code></pre>
<p>Tiempo por fotograma al desplazar, en una GPU integrada (Intel UHD; 16.7 ms son 60 fps):</p>
<table>
  <thead><tr><th>Gráfico</th><th>Densidad de píxeles</th><th>Canvas 2D</th><th>WebGL</th></tr></thead>
  <tbody>
    <tr><td>1600×900, 500 velas + 4 indicadores</td><td>2</td><td>27.4 ms</td><td>19.6 ms</td></tr>
    <tr><td>1600×900, zoom alejado sobre 200,000 barras + 4 indicadores</td><td>2</td><td>34.5 ms</td><td>20.2 ms</td></tr>
    <tr><td>1600×900, zoom alejado sobre 1,000,000 barras + 4 indicadores</td><td>2</td><td>34.5 ms</td><td>16.7 ms</td></tr>
    <tr><td>1600×900, mapa de calor de profundidad, 240 instantáneas × 80 niveles</td><td>2</td><td>25.5 ms</td><td>16.8 ms</td></tr>
    <tr><td>Seis gráficos, cada uno con 500 velas y dos indicadores</td><td>2</td><td>23.5 ms</td><td>17.2 ms</td></tr>
    <tr><td>2560×1400, 2,000 velas + 4 indicadores</td><td>1</td><td>41.6 ms</td><td>17.7 ms</td></tr>
    <tr><td>2560×1400, 2,000 velas + 4 indicadores</td><td>1.5</td><td>70.8 ms</td><td>17.6 ms</td></tr>
    <tr><td>2560×1400, 2,000 velas + 4 indicadores</td><td>2</td><td>114.5 ms</td><td>29.1 ms</td></tr>
    <tr><td>2560×1400, 2,000 velas</td><td>2</td><td>33.1 ms</td><td>20.9 ms</td></tr>
  </tbody>
</table>
<p>
  La mayoría de los fotogramas WebGL de arriba se quedan en 16.7 ms; las medias incluyen algunos más largos. Con densidad 2 en un gráfico de 2560×1400, solo la composición de las capas a tamaño completo ya le cuesta al navegador unos 23 ms en esta GPU. <code>node scripts/bench-render.mjs --renderer=webgl</code> mide estas cifras en tu equipo.
</p>

<h2>Fuera del hilo principal</h2>
<p>
  <code>IndicatorWorkerHost</code> ejecuta los cálculos de los indicadores en un
  Web Worker con un <code>calculate()</code> basado en Promise, un tiempo de
  espera por solicitud y una alternativa síncrona para SSR y tests.
</p>
