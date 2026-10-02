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

<h2>Fuera del hilo principal</h2>
<p>
  <code>IndicatorWorkerHost</code> ejecuta los cálculos de los indicadores en un
  Web Worker con un <code>calculate()</code> basado en Promise, un tiempo de
  espera por solicitud y una alternativa síncrona para SSR y tests.
</p>
