<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Plugins — Documentación de TradeCanvas</title>
  <meta name="description" content="Amplía TradeCanvas con indicadores, herramientas de dibujo, tipos de gráfico y capas personalizados mediante el SDK de plugins." />
</svelte:head>

<h1>Plugins</h1>
<p>
  Amplía el gráfico con <strong>indicadores</strong>, <strong>herramientas de dibujo</strong>,
  <strong>tipos de gráfico</strong> y <strong>capas</strong> personalizados, registrados de
  forma global o por gráfico.
</p>

<h2>Registro</h2>
<p>Hay tres formas de registrar, por orden de prioridad: valores globales por defecto, el constructor y, por último, llamadas imperativas sobre la instancia.</p>
<pre><code>{`import { Chart, registerPlugin } from '@tradecanvas/chart'

// 1) Global — every Chart created afterward inherits it
registerPlugin({ kind: 'indicator', plugin: new MyIndicator() })

// 2) Per-chart at construction
const chart = new Chart(el, { plugins: [{ kind: 'overlay', plugin: myHeatmap }] })

// 3) Imperative on an instance
chart.plugins.register({ kind: 'chartType', plugin: myCandles })
chart.plugins.unregister('chartType:my-candles')
chart.plugins.list()`}</code></pre>
<p>
  Un <code>ChartWidget</code> los recibe en <code>plugins</code> (tipado, y junto a cualquier <code>chartOptions.plugins</code>):
  se registran en su gráfico antes de que restaure nada, así que un diseño guardado
  (<code>persistLayouts</code>), una plantilla o una vista compartida que nombra uno de tus indicadores lo recupera.
  Para el mismo id, los <code>plugins</code> del widget ganan a <code>chartOptions.plugins</code>, y los
  <code>plugins</code> propios de una celda de la cuadrícula sustituyen a los compartidos de la cuadrícula. Registrado en
  <code>widget.getChart()</code> después de restaurar un diseño, un indicador llega tarde: el diseño ya lo ha dejado fuera.
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT', adapter, persistLayouts: true,
  plugins: [{ kind: 'indicator', plugin: new DoubleSMA() }],
})`}</code></pre>

<h2>Tipos de plugin</h2>
<table>
  <thead><tr><th>Tipo</th><th>Contrato</th><th>Dónde se dibuja</th></tr></thead>
  <tbody>
    <tr><td><code>indicator</code></td><td><code>IndicatorPlugin</code> — <code>calculate()</code> + <code>render(ctx, output, viewport, style, &#123; theme &#125;)</code></td><td>superpuesto o en panel</td></tr>
    <tr><td><code>drawing</code></td><td><code>DrawingPlugin</code> — <code>render()</code> + <code>hitTest()</code></td><td>capa superpuesta</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartTypePlugin</code> — <code>createRenderer()</code> + <code>transform()</code> opcional</td><td>serie principal</td></tr>
    <tr><td><code>overlay</code></td><td><code>OverlayPlugin</code> — <code>render(ctx, &#123; viewport, data, theme &#125;)</code></td><td><code>main</code> / <code>overlay</code> / <code>ui</code></td></tr>
  </tbody>
</table>

<h2>Indicador personalizado</h2>
<p>
  Un indicador es un <code>IndicatorPlugin</code>: un <code>descriptor</code> que dice qué es y cómo se ve, y un
  <code>calculate()</code> que da un valor por barra. Extiende <code>IndicatorBase</code> y el gráfico hace el resto a
  partir del descriptor: dibuja los plots, escala el panel, etiqueta los valores en el eje y muestra el indicador en la
  leyenda, la configuración y el diálogo Indicadores. Aquí tienes uno completo, un MACD que marca dónde gira su
  línea:
</p>
<pre><code>{`import { IndicatorBase, IndicatorValueMap } from '@tradecanvas/chart'

const ema = (prev, value, period) => (prev === undefined ? value : prev + (2 / (period + 1)) * (value - prev))

class TurningMacd extends IndicatorBase {
  descriptor = {
    id: 'turning-macd', name: 'Turning MACD', shortName: 'TMACD',
    placement: 'panel',               // a pane of its own; 'overlay' draws on the price pane
    category: 'oscillators',          // its group in the Indicators dialog
    defaultConfig: { fast: 12, slow: 26, source: 'close' },
    inputs: {
      fast: { kind: 'int', min: 2, label: 'Fast' },
      slow: { kind: 'int', min: 3, label: 'Slow' },
      source: { kind: 'choice', label: 'Price', options: [{ value: 'close', label: 'Close' }, { value: 'hl2', label: 'Median' }] },
    },
    plots: [
      { key: 'value', title: 'MACD', color: 0 },
      { key: 'turn', title: 'Turn', color: 1, kind: 'markers', tone: { field: 'up' }, downColor: 2 },
    ],
    scale: { zero: true },
    levels: [0],
    defaultStyle: (theme) => ({ colors: theme.name === 'light' ? ['#1f4e8c', '#0a7d3b', '#b3261e'] : ['#8ab4f8', '#4cc38a', '#f28b82'] }),
  }

  calculate(data, config) {
    const { fast, slow, source } = config.params
    const values = new IndicatorValueMap()
    const series = new Array(data.length).fill(null)
    let f, s
    for (let i = 0; i < data.length; i++) {
      const bar = data[i]
      const price = source === 'hl2' ? (bar.high + bar.low) / 2 : bar.close
      f = ema(f, price, fast)
      s = ema(s, price, slow)
      if (i < slow) continue
      const point = { value: f - s }
      const a = series[i - 2]?.value, b = series[i - 1]?.value
      // The bar before this one is a turn when the line changed direction there.
      if (a !== undefined && b !== undefined && (b - a) * (point.value - b) < 0) {
        series[i - 1] = { ...series[i - 1], turn: b, up: point.value > b ? 1 : 0 }
        values.set(data[i - 1].time, series[i - 1])
      }
      series[i] = point
      values.set(bar.time, point)
    }
    return { values, series }
  }
}`}</code></pre>
<p>
  <code>calculate(data, config)</code> recibe las barras y las entradas de la instancia (<code>config.params</code>) y
  devuelve sus valores dos veces: por índice de barra (<code>series</code>, <code>null</code> antes del primer valor) y
  por hora de la barra (<code>values</code>). Usa <code>new IndicatorValueMap()</code> para <code>values</code>: un
  <code>Map</code> varias veces más barato de llenar en orden temporal, que es lo que hace cada cambio de símbolo o de
  intervalo. Un campo que ningún plot nombra (<code>up</code> arriba) no se dibuja, ni se escala, ni se muestra; está
  ahí para el <code>tone</code> de un plot.
</p>

<h3>El descriptor</h3>
<ul>
  <li><strong>Los plots</strong> dibujan un campo cada uno: <code>'line'</code> (por defecto), <code>'step'</code>,
    <code>'histogram'</code>, <code>'dots'</code> (una línea dibujada con puntos) o <code>'markers'</code>, una forma
    (<code>shape</code>: <code>'dot'</code>, <code>'triangleUp'</code>, <code>'triangleDown'</code>) en las barras donde el campo
    tiene valor, en él o, en el panel de precio, encima o debajo de la barra (<code>position</code>). <code>color</code> es un
    índice en los colores del estilo; <code>tone</code> y <code>downColor</code> dibujan un plot en dos colores;
    <code>width</code>, <code>lineStyle</code>, <code>opacity</code> y <code>breakOn</code> fijan el aspecto de una línea.
    <code>fills</code> sombrea entre dos plots.</li>
  <li><strong>Las entradas</strong> dicen cómo se edita cada entrada de <code>defaultConfig</code>: <code>kind</code>,
    <code>label</code>, <code>min</code>, <code>max</code>, <code>step</code>, y las <code>options</code> de una opción a elegir, sin más o
    con una etiqueta para cada una (<code>{'{ value, label }'}</code>). <code>{'{ source: true }'}</code> permite que se
    calcule sobre otro precio o sobre la línea de otro indicador.</li>
  <li><strong>El panel</strong>: <code>scale</code> fija sus límites o mantiene el cero a la vista, <code>levels</code> dibuja
    líneas de referencia que el usuario puede editar.</li>
  <li><strong>Su aspecto</strong>: <code>defaultStyle</code>, un estilo o uno para cada tema (más abajo).</li>
</ul>

<h3>Ticks en vivo: update y revisesBefore</h3>
<p>
  En cada tick solo cambia la barra más reciente. Sin <code>update()</code> el gráfico vuelve a ejecutar
  <code>calculate()</code> sobre todo el historial; con él, el gráfico te devuelve tu última salida (<code>prev</code>) y
  la primera barra que cambió (<code>from</code>), y recalculas desde ahí. Devuelve <code>null</code> para que se ejecute
  <code>calculate()</code> en su lugar; los valores deben ser los que daría él. <code>canResume</code> y
  <code>writePoint</code> vienen con <code>IndicatorBase</code>.
</p>
<p>
  Cada barra de un indicador como este se calcula a partir de las barras que la rodean, no de un estado acumulado como
  las medias de TurningMacd (que llevaría su propio estado, o dejaría fuera <code>update</code>):
</p>
<pre><code>{`// A swing high: the bar is higher than the n bars either side of it.
pointAt(data, i, n) {
  if (i < n || i + n >= data.length) return null
  for (let k = 1; k <= n; k++) if (data[i - k].high >= data[i].high || data[i + k].high > data[i].high) return null
  return { high: data[i].high }
}

update(data, config, prev, from) {
  if (!this.canResume(data, prev, from)) return null
  const n = config.params.strength
  // A new bar decides the bar n back: rewrite from there.
  for (let i = Math.max(0, from - n); i < data.length; i++) this.writePoint(prev, data, i, this.pointAt(data, i, n))
  return prev
}

revisesBefore(config) { return config.params.strength }`}</code></pre>
<p>
  <code>from</code> es siempre la primera barra que cambió. Cuando una barra nueva puede cambiar barras anteriores a ella
  (un punto swing, un giro o un fractal se deciden por las barras que vienen después), <code>update</code> las reescribe
  él mismo, y <code>revisesBefore(config)</code> dice cuántas, para que los indicadores que leen la línea de este también
  se recalculen desde ahí. Omítelo cuando solo cambian las barras a partir de <code>from</code>.
</p>

<h3>Dibujarlo</h3>
<p>
  El <code>render()</code> de <code>IndicatorBase</code> dibuja los <code>plots</code> y los <code>fills</code> en la escala
  del panel, así que la mayoría de los indicadores no llevan código de dibujo. Para dibujar más, sobrescríbelo y llámalo
  primero. El quinto argumento lleva el tema con el que dibuja el gráfico, para colores y una fuente que el estilo no da:
  <code>theme.candleUp</code>, <code>theme.candleDown</code>, <code>theme.text</code>, <code>theme.font</code>.
</p>
<pre><code>{`render(ctx, output, viewport, style, context) {
  super.render(ctx, output, viewport, style, context)
  ctx.fillStyle = context.theme.text
  // barIndexToX(i, viewport) and priceToY(value, viewport) place it where the chart draws
}`}</code></pre>

<h3>Colores que siguen al tema</h3>
<p>
  <code>defaultStyle</code> en el descriptor es el aspecto con el que empieza un indicador: un estilo, o una función del
  tema que da uno para cada tema. Una instancia con él sigue a <code>chart.setTheme()</code>; un color que alguien elige
  para ella se queda. Está por debajo del valor por defecto que guardó el usuario (<code>chart.setIndicatorDefaults()</code>,
  <em>Guardar como predeterminado</em> en el widget), así que los colores de tu app nunca ocupan el lugar de los del usuario.
  Un diseño guardado omite lo que da el tema, y abierto en otro tema toma los colores de ese tema.
</p>

<h3>Registrarlo antes de leer un diseño</h3>
<p>
  Un diseño guardado nombra los indicadores por id, y uno que no está registrado cuando se lee el diseño se queda fuera.
  Pasa tus indicadores a un <code>ChartWidget</code> en <code>plugins</code>: se registran antes de que restaure un diseño
  (<code>persistLayouts</code>), una plantilla o una vista compartida. En un <code>Chart</code>, pasa <code>plugins</code> al
  constructor, o regístralos antes de <code>loadState()</code>.
</p>
<pre><code>{`new ChartWidget(host, { symbol, adapter, persistLayouts: true, plugins: [{ kind: 'indicator', plugin: new TurningMacd() }] })

const chart = new Chart(host, { plugins: [{ kind: 'indicator', plugin: new TurningMacd() }] })
chart.addIndicator('turning-macd', { fast: 8 })`}</code></pre>

<h3>Lo que el gráfico lee de él</h3>
<ul>
  <li><strong>La leyenda</strong> lo nombra por <code>shortName</code> y las entradas que difieren de
    <code>defaultConfig</code> (una opción a elegir por su etiqueta), y muestra el valor de cada plot salvo los marcadores, en su color.</li>
  <li><strong>El eje de precios</strong> etiqueta el último valor de esos plots.</li>
  <li><strong>La exportación CSV</strong> tiene una columna para cada uno, nombrada con el nombre de la leyenda y, cuando hay
    más de uno, el <code>title</code> del plot.</li>
  <li><strong>El diálogo de configuración</strong> edita las entradas, lista cada plot con su color, si se muestra y un
    trazo para una línea o un escalón, y edita los niveles.</li>
  <li><strong>El diálogo Indicadores</strong> lo lista por <code>name</code> bajo su <code>category</code>.</li>
  <li><strong>Otro indicador</strong> puede leer sus líneas (los mismos plots) como su fuente.</li>
</ul>
<p>
  Los agentes de programación reciben la misma guía, con código comprobado por tipos contra los paquetes publicados, de la
  herramienta <code>custom_indicator</code> del servidor MCP y de la
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">receta de indicador personalizado</a> de la skill.
</p>

<h2>Herramienta de dibujo personalizada</h2>
<p>
  Extiende <code>DrawingBase</code> para usar sus utilidades (de anclas a píxeles,
  estilos de línea, puntos de control), describe la herramienta y regístrala. La
  configuración que enumeres en <code>descriptor.options</code> aparece en el
  diálogo de configuración del widget y se guarda con el dibujo.
</p>
<pre><code>{`import { DrawingBase, registerPlugin } from '@tradecanvas/chart'

class TargetLine extends DrawingBase {
  descriptor = {
    type: 'targetLine', name: 'Target Line', requiredAnchors: 1,
    options: { label: { kind: 'text', label: 'Label', default: 'Target' } },
  }
  render(ctx, state, viewport, selected) { /* en this.anchorToPixel(state.anchors[0], viewport) */ }
  hitTest(point, state, viewport, tolerance) { /* ¿está el puntero sobre él? */ return false }
  // opcional: los precios de sus líneas, para que una alerta pueda seguirlas
  priceAt(state) { return [state.anchors[0].price] }
}

registerPlugin({ kind: 'drawing', plugin: new TargetLine() })
chart.setDrawingTool('targetLine')`}</code></pre>
<p>
  El nombre de la herramienta sirve en todo lugar donde el gráfico acepta uno (<code>setDrawingTool</code>, <code>addDrawing</code>…), también en TypeScript:
  <code>DrawingToolType</code> acepta cualquier nombre y sigue completando los integrados, que lista <code>BuiltInDrawingToolType</code>.
</p>
<p>
  El descriptor también puede indicar cómo se dibuja la herramienta
  (<code>creation</code>: <code>'clicks'</code>, <code>'freehand'</code> o
  <code>'path'</code>, con <code>maxAnchors</code>) y si el diálogo ofrece un
  relleno (<code>fill</code>) o texto (<code>text</code>). Una herramienta puede
  mover puntos de control que no son anclas con <code>moveHandle()</code> y
  recibe las barras del gráfico mediante <code>setDataGetter(getter, revision)</code>
  cuando dibuja a partir de ellas. <code>revision()</code> cambia cuando una barra
  se corrige en el mismo array (<code>updateBar</code>): una herramienta que guarda
  lo que calculó a partir de las barras lo calcula de nuevo entonces.
</p>

<h2>Tipo de gráfico personalizado</h2>
<p>Un <code>ChartTypePlugin</code> aporta un renderizador y una transformación de datos opcional; cámbiate a él como a uno integrado:</p>
<pre><code>{`registerPlugin({
  kind: 'chartType',
  plugin: {
    descriptor: { type: 'my-bricks', name: 'My Bricks' },
    createRenderer: () => new MyBrickRenderer(),
    transform: (raw) => toBricks(raw),   // optional
  },
})

chart.setChartType('my-bricks')`}</code></pre>

<h2>Capa personalizada</h2>
<p>Un <code>OverlayPlugin</code> dibuja cada fotograma en la capa que elijas y recibe la vista, los datos y el tema actuales:</p>
<pre><code>{`import { overlayScale, registerPlugin } from '@tradecanvas/chart'

registerPlugin({
  kind: 'overlay',
  plugin: {
    descriptor: { id: 'high-marks', name: 'High marks', layer: 'main' },
    render(ctx, context) {
      const s = overlayScale(context)
      ctx.fillStyle = '#f2a93b'
      for (let i = s.visible.from; i <= s.visible.to; i++) {
        const bar = context.data[i]
        ctx.fillRect(s.indexToX(i) - s.barWidth / 2, s.priceToY(bar.high) - 1, s.barWidth, 2)
      }
    },
  },
})`}</code></pre>
<p>
  <code>overlayScale(context)</code> coloca las cosas donde las dibuja el gráfico: <code>timeToX</code> / <code>xToTime</code>
  por la hora de la vela (entre velas y más allá de la última, en proporción), <code>indexToX</code> / <code>xToIndex</code>,
  <code>priceToY</code> / <code>yToPrice</code> (también en escala logarítmica o invertida), <code>barWidth</code> y
  <code>visible</code>, las velas en pantalla. Para filas en la cuadrícula de precios, <code>chart.getPriceStep()</code> es el
  paso mínimo del símbolo (<code>minTick</code>), la unidad de una fracción o una unidad de los decimales que se muestran.
  Los renderizadores de tipos de gráfico solo reciben el viewport, y los indicadores el viewport y el tema: para ellos se exportan
  <code>priceToY</code>, <code>barIndexToX</code>, <code>timeToX</code> y sus inversas. Las velas son las que están en
  pantalla: en un gráfico Renko o Kagi, sus ladrillos (<code>chart.isTimeAligned()</code> indica cuándo son las velas del feed).
  Para escribir un precio como el eje, el viewport lleva el formato de precio propio del gráfico cuando lo tiene
  (<code>formatPrice</code>), su <code>numberLocale</code> y los decimales del mercado o del símbolo cuando alguno los
  fija (<code>pricePrecision</code>); los paneles de indicadores dejan sin fijar el formato y los decimales.
</p>
<p>
  Un overlay con ajustes propios (un modo de visualización, un interruptor) puede mostrar un cambio al instante,
  aunque no llegue ningún tick que redibuje el gráfico: pon <code>enabled: false</code> en el plugin para ocultarlo
  sin quitar su registro, y llama a <code>chart.requestRender()</code> tras cambiar cualquiera de los dos. Varias
  peticiones antes del siguiente fotograma dibujan uno solo.
</p>

<p>Consulta la <a href={href('/docs/api')}>referencia de la API</a> para ver las firmas de tipos completas de los plugins.</p>
