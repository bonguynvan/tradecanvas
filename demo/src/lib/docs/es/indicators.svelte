<script lang="ts">
  // Generated from the indicator registry by `pnpm docs:gen`: always the real ids.
  import catalog from '$lib/generated/indicators.json';

  type Entry = (typeof catalog)[number];
  const overlays = catalog.filter((i) => i.placement === 'overlay');
  const panes = catalog.filter((i) => i.placement === 'panel');
  const params = (i: Entry) =>
    Object.entries(i.params).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
  const lines = (i: Entry) => i.plots.map((p) => p.title).join(', ');
  const hasSource = (i: Entry) => Object.values(i.inputs).some((x) => x.kind === 'source');
</script>

<svelte:head>
  <title>Indicadores — Documentación de TradeCanvas</title>
  <meta name="description" content="{catalog.length} indicadores técnicos integrados: medias móviles, bandas, osciladores, volumen y volatilidad, con fuentes, indicadores sobre indicadores y niveles editables." />
</svelte:head>

<h1>Indicadores</h1>
<p>
  {catalog.length} indicadores integrados. Añade uno por su id; los parámetros que
  omitas toman su valor predeterminado, y los no válidos vuelven a él.
</p>

<h2>Añadir un indicador</h2>
<pre><code>{`const ema = chart.addIndicator('ema', { period: 50 })          // on the price pane
const rsi = chart.addIndicator('rsi', { period: 14 }, 'bottom') // in a pane of its own
chart.updateIndicator(rsi, { period: 21 })
chart.removeIndicator(rsi)`}</code></pre>
<p>
  <code>addIndicator</code> devuelve un id de instancia: el mismo indicador se puede
  añadir varias veces, cada instancia con sus propios parámetros, colores y niveles.
</p>

<p>
  En TypeScript, los ids integrados y sus parámetros tienen tipos: <code>BuiltInIndicators</code> recoge cada indicador
  con sus parámetros, sus valores por defecto y las claves de sus líneas, así que el editor los sugiere mientras escribes
  y un parámetro mal escrito no pasa la comprobación de tipos. Un indicador que registra un plugin acepta
  cualquier id y parámetros.
</p>

<h2>Fuentes e indicadores sobre indicadores</h2>
<p>
  Los indicadores marcados con <em>fuente</em> más abajo pueden calcularse sobre
  otro precio distinto del cierre (<code>open</code>, <code>high</code>,
  <code>low</code>, <code>hl2</code>, <code>hlc3</code>, <code>ohlc4</code>,
  <code>hlcc4</code>) o sobre la línea de otro indicador. Una media móvil del RSI
  se dibuja en el panel del RSI, en su escala, y desaparece cuando se quita el RSI.
</p>
<pre><code>{`import { indicatorSource } from '@tradecanvas/chart'

chart.updateIndicator(ema, { source: 'hlc3' })
const smoothed = chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') })`}</code></pre>
<p>
  Los indicadores en panel también pueden compartir un panel:
  <code>chart.addIndicator('stochastic', &#123;&#125;, 'bottom', &#123; pane: rsi &#125;)</code>.
</p>

<h2>Niveles, colores y valores</h2>
<pre><code>{`chart.setIndicatorLevels(rsi, [20, 50, 80])   // null restores 30 / 70
chart.updateIndicatorStyle(rsi, { colors: ['#f2a93b'], lineWidths: [2] })
chart.setIndicatorVisible(rsi, false)

const series = chart.getIndicatorOutput(rsi)?.series ?? []
const latest = series[series.length - 1]?.value   // keyed by the line keys below`}</code></pre>
<p>
  La leyenda muestra el último valor de cada línea. Para marcarlo también en su eje, con el color de la línea,
  activa <code>features.indicatorValueLabels: true</code> o
  <code>setIndicatorValueLabelsVisible(true)</code> (desactivado por defecto). Las líneas, los niveles, el
  eje y la cruz de un panel comparten una misma escala.
</p>

<h2>Solo en algunas temporalidades</h2>
<p>
  Un indicador puede limitarse a algunas temporalidades: una media de 200 días en el gráfico
  diario y superiores, un oscilador rápido solo en los gráficos de minutos. Cada tipo de
  temporalidad (ticks, segundos, minutos, horas, días, semanas, meses) se deja activado, se
  desactiva o se limita a un rango de valores; un tipo que no se indica lo muestra en todas. El
  gráfico aplica las reglas a la temporalidad del flujo al que está conectado, a medida que esta
  cambia; para las barras dadas con <code>setData</code>,
  <code>chart.setDataTimeframe('1h')</code> le indica su temporalidad (ChartWidget lo hace por sí mismo); sin
  ninguno de los dos, muestra el indicador. Las reglas se guardan con el diseño y se deshacen como
  cualquier otro cambio.
</p>
<pre><code>{`chart.setIndicatorIntervals(ema, { seconds: false, minutes: false, hours: [1, 4] })
chart.getIndicatorIntervals(ema)    // { seconds: false, minutes: false, hours: [1, 4] }
chart.setIndicatorIntervals(ema, null)  // todas otra vez`}</code></pre>
<p>
  <code>getActiveIndicators()</code> indica de cada uno si está <code>visible</code> (activado) y si
  está <code>shown</code> (dibujado en esta temporalidad). En ChartWidget, su fila de la leyenda se
  vuelve gris mientras no lo está.
</p>

<h2>En ChartWidget</h2>
<p>
  <strong>Indicadores</strong>, en la barra de herramientas, abre un diálogo. Escribe para buscar
  cualquier indicador por su nombre o su nombre corto (<kbd>Enter</kbd> añade la mejor
  coincidencia), o elige un grupo en el lateral: <strong>Favoritos</strong>,
  <strong>Plantillas</strong>, <strong>Todos</strong> y luego cada tipo (medias móviles,
  tendencia, osciladores, volatilidad, volumen, bandas y canales, precio y patrones). Una fila
  añade su indicador y el diálogo sigue abierto para el siguiente; un contador muestra cuántos hay
  en el gráfico, y la estrella de al lado lo guarda en favoritos. En un móvil, los grupos son una
  fila de chips sobre la lista.
</p>
<p>
  La configuración de un indicador (el nombre en su fila de la leyenda, o su engranaje) tiene tres
  pestañas: <strong>Parámetros</strong>; <strong>Estilo</strong>, una fila por línea (visible o no,
  sus colores, su trazo), el grosor de línea, la escala de precio de un indicador superpuesto y los
  niveles; y <strong>Visibilidad</strong>, las temporalidades en las que se muestra. Cada cambio se
  ve al momento. <strong>Cancelar</strong> o <kbd>Esc</kbd> lo deja todo como estaba,
  <strong>Aceptar</strong> lo conserva. <strong>Predeterminados</strong> lo restablece, o lo guarda
  como predeterminado: los nuevos indicadores de su tipo empiezan entonces con estos parámetros y
  este aspecto, en este navegador.
</p>

<h2>En el panel de precio ({overlays.length})</h2>
<table>
  <thead><tr><th>id</th><th>Nombre</th><th>Parámetros predeterminados</th><th>Líneas</th></tr></thead>
  <tbody>
    {#each overlays as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· fuente</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>mtfma</code> traza en el gráfico actual una media móvil de una temporalidad
  superior; por ejemplo, la MA de 50 diaria sobre barras de 1h. Solo promedia los
  cierres <em>completados</em> de la temporalidad superior, así que avanza en
  escalones en cada límite y nunca se redibuja.
</p>

<p>
  <code>vwap</code> vuelve a empezar en su <code>anchor</code>: <code>'session'</code>, por defecto, cada día de
  negociación desde la medianoche en la zona horaria de la bolsa (el <code>timeZone</code> del símbolo, si no el del
  mercado, si no UTC); <code>'week'</code> cada lunes; <code>'month'</code> el día 1; <code>'all'</code> nunca: promedia
  todas las barras cargadas, así que cambia al cargar historial más antiguo. En barras diarias, el VWAP de sesión es
  el precio típico de cada barra, así que elige ahí <code>'week'</code> o <code>'month'</code>. <code>svwap</code> es el
  VWAP de sesión con bandas σ, y <code>avwap</code> empieza en la barra a la que lo anclas. <code>svwap</code>,
  <code>mtfma</code>, las líneas del día anterior y las sesiones del perfil de mercado cuentan sus días en la misma zona.
  Los marcos de 2h a 12h de <code>mtfma</code> también empiezan a la medianoche de la bolsa, mientras que las velas de 4h
  del propio feed siguen la cuadrícula de UTC, y en barras diarias <code>svwap</code> da solo su línea, sin bandas. En ChartWidget, un VWAP con otro anclaje lleva su nombre ('VWAP Semana') en la leyenda, las fichas y el panel de objetos, y el anclaje y sus opciones se leen en el idioma del widget; la columna del CSV sigue siendo <code>VWAP</code>.
</p>
<pre><code>{`chart.addIndicator('vwap')                      // vuelve a empezar cada día de negociación
chart.addIndicator('vwap', { anchor: 'week' })  // cada lunes: para barras diarias
chart.addIndicator('vwap', { anchor: 'all' })   // todas las barras cargadas, como antes`}</code></pre>

<p>
  <code>volumeProfile</code> dibuja una fila por franja de precio desde el borde izquierdo del gráfico;
  el largo de cada fila sigue el volumen negociado en esa franja. Las filas son translúcidas, así que la
  leyenda que queda encima y las velas que quedan debajo se siguen leyendo; dale una <code>opacity</code> menor con
  <code>updateIndicatorStyle</code> para atenuarlo más.
</p>

<h2>En un panel propio ({panes.length})</h2>
<table>
  <thead><tr><th>id</th><th>Nombre</th><th>Parámetros predeterminados</th><th>Líneas</th><th>Niveles</th></tr></thead>
  <tbody>
    {#each panes as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· fuente</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
        <td>{'levels' in ind ? ind.levels?.join(', ') : '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>voldelta</code> (Volume Delta) es lo que tomaron los compradores de cada barra menos lo que
  tomaron los vendedores. Una barra que dice quién tomó sus operaciones (su <code>buyVolume</code>) da
  su delta real. Una que no lo dice se lee por cómo cerró: todo su volumen al alza si cerró en su
  apertura o por encima, a la baja en otro caso, que es lo más cerca que llega una barra OHLCV.
  <code>mode: 0</code> es el histograma por barra y <code>mode: 1</code> el delta acumulado, que empieza
  de nuevo con cada periodo de <code>anchor</code> (<code>'session'</code>, <code>'week'</code> o
  <code>'month'</code>; nunca con <code>'all'</code>, el valor por defecto).
</p>

<h2>Indicadores de las pantallas de cotización asiáticas</h2>
<p>
  Indicadores que los operadores de Corea, Japón y Vietnam esperan en sus pantallas de cotización: la Psychological Line (<code>psy</code>) y la New Psychological Line (<code>newpsy</code>), Volume Ratio (<code>vr</code>), AB Ratio (<code>abratio</code>), <code>sonar</code>, <code>sigma</code>, Binary Wave (<code>binarywave</code>), Trade Value (<code>tradevalue</code>) con Volume Change (<code>volchange</code>), el rango proyectado de DeMark (<code>demark</code>) y un arcoíris de medias (<code>rainbow</code>) de hasta 20 líneas. Trade Value es una estimación, cierre × volumen en cada barra; la cifra oficial de la bolsa llega en su feed.
</p>
<pre><code>{`chart.addIndicator('psy', { period: 10 }, 'bottom')              // proporción de cierres al alza; marca 25 y 75
chart.addIndicator('vr', { period: 20 }, 'bottom')                // volumen de días al alza frente a días a la baja
chart.addIndicator('tradevalue', {}, 'bottom')                    // cierre × volumen, en cada barra
chart.addIndicator('rainbow', { first: 10, step: 10, count: 10 }) // diez medias, de 10 a 100 barras`}</code></pre>

<h2>Patrones de velas</h2>
<p>
  64 patrones de una a cinco barras: dojis, martillos y estrellas fugaces, marubozu y belt hold; envolventes, harami, líneas penetrantes y nubes oscuras, pinzas, kicking; estrellas de la mañana y de la tarde, bebés abandonados, tres soldados y tres cuervos, tres dentro y tres fuera, huecos tasuki; three-line strike, tres métodos, mat hold, breakaway y ladder bottom. Un patrón de giro solo cuenta tras la tendencia que gira (el cierre anterior más allá de su media de 10 barras y del cierre de 10 barras antes, <code>trendPeriod</code>), y un cuerpo es largo o corto frente al cuerpo medio de las barras anteriores. El indicador dibuja una flecha bajo un patrón alcista y sobre uno bajista, con su nombre corto cuando las barras son lo bastante anchas; una barra que termina varios muestra el más largo. <code>reversal</code>, <code>continuation</code> e <code>indecision</code> (1 o 0) eligen los tipos.
</p>
<pre><code>{`chart.addIndicator('candlepatterns')                  // una flecha y el nombre en cada barra que termina uno
chart.addIndicator('candlepatterns', { indecision: 1 }) // también dojis y peonzas

import { detectCandlePatterns, CANDLE_PATTERNS } from '@tradecanvas/chart'

const found = detectCandlePatterns(bars, { patterns: ['bullishEngulfing', 'hammer'] })
// [{ index, time, pattern: { id, name, short, direction, kind, bars } }]
CANDLE_PATTERNS.length                                 // 64`}</code></pre>
<p>
  Una página que busca patrones y no dibuja gráfico (un escáner, un screener) importa los dos desde
  <code>@tradecanvas/core/patterns</code>: solo el detector, unos 4 kB con gzip, en un chunk propio, así que
  la página no carga el motor del gráfico aunque otras páginas de la app sí lo hagan. Añade
  <code>@tradecanvas/core</code> a las dependencias de la app para importarlo.
</p>
<pre><code>{`import { detectCandlePatterns, CANDLE_PATTERNS } from '@tradecanvas/core/patterns'`}</code></pre>

<h2 id="fair-value-gaps">Fair value gaps</h2>
<p>
  Tres barras dejan un fair value gap cuando el mínimo de la tercera queda por encima del máximo de la primera (o, a la baja, su máximo por debajo del mínimo de la primera): entre ambos solo negoció la barra central. El gráfico dibuja una caja sobre esos precios, desde la barra central hasta el borde derecho mientras el gap sigue abierto, en verde azulado para un gap al alza y en rosa para uno a la baja (los colores de las marcas de los patrones de velas, distintos del verde y el rojo de las velas; el estilo del indicador los cambia). Un gap lo llena la primera barra posterior que lo recorre entero, y entonces deja de dibujarse salvo que <code>showFilled</code> sea 1. <code>detectFairValueGaps</code> los devuelve todos sin gráfico, con la barra que llenó cada uno.
</p>
<pre><code>{`chart.addIndicator('fvg')                              // una caja sobre cada gap aún abierto
chart.addIndicator('fvg', { minPercent: 0.1 })         // omite los gaps menores del 0,1% del precio
chart.addIndicator('fvg', { showFilled: 1 })           // conserva los llenados, más tenues, hasta la barra que los llenó

import { detectFairValueGaps } from '@tradecanvas/chart'

detectFairValueGaps(bars, { minPercent: 0.1 })
// [{ index, formed, direction: 'up' | 'down', top, bottom, filledAt }]`}</code></pre>

<h2>Tu propio indicador</h2>
<p>
  El camino corto es <code>defineIndicator</code>: sus entradas, y una sola función que devuelve sus líneas a partir de
  las barras, con <code>ta</code> para los cálculos (<code>ta.ema</code>, <code>ta.rsi</code>, <code>ta.crossover</code>…).
</p>
<pre><code>{`import { defineIndicator } from '@tradecanvas/chart'

chart.registerIndicator(defineIndicator({
  id: 'smoothRsi',
  name: 'Smoothed RSI',
  inputs: { period: { default: 14, kind: 'int', min: 2 }, smooth: { default: 5, kind: 'int', min: 1 } },
  scale: { min: 0, max: 100 },
  levels: [30, 70],
  calculate: ({ bars, inputs, ta }) => ({ value: ta.ema(ta.rsi(bars.close, inputs.period), inputs.smooth) }),
}))
chart.addIndicator('smoothRsi')`}</code></pre>
<p>
  Para un indicador que sigue el ritmo de los ticks sobre un historial largo, o que dibuja algo propio, extiende
  <code>IndicatorBase</code> y declara lo que dibuja (<code>plots</code>),
  la escala de su panel, sus niveles y sus parámetros; el gráfico lo dibuja,
  escala su panel, etiqueta sus valores y lo muestra en la leyenda y la
  configuración del widget sin que tengas que escribir código de renderizado.
  Su <code>category</code> (<code>'oscillators'</code>, <code>'volume'</code>…) lo coloca en ese
  grupo del diálogo Indicadores; sin ella, aparece en Otros. Un grupo propio, <code>{`{ id: 'my-app', label: 'My App' }`}</code>,
  lista juntos los indicadores de tu app bajo su nombre, antes de los tipos integrados. Consulta la
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">receta de indicador personalizado</a>.
  Un indicador que agrupa las barras por día, semana o mes lee la zona de la bolsa en
  <code>config.exchangeTimeZone</code> (la fija el gráfico; sin ella, UTC). Una zona nueva vuelve a
  calcular solo los indicadores que la leen y los que leen sus líneas: uno tuyo que no la lee puede
  decir <code>readsExchangeTimeZone: false</code> en su descriptor y queda como está.
</p>
<p>
  El <code>kind</code> de cada entrada (<code>'int'</code>, <code>'number'</code>, <code>'boolean'</code>,
  <code>'choice'</code>, <code>'source'</code>, <code>'color'</code>, <code>'text'</code>) y sus
  <code>min</code>, <code>max</code> y <code>step</code> deciden su campo en los ajustes: un
  <code>'int'</code> se redondea al escribirlo, como se lee un periodo. Sin <code>kind</code>, se deduce del
  valor por defecto (un número es <code>'number'</code>: solo se redondea un <code>'int'</code> declarado). <code>describeInputs(descriptor)</code> lista
  las entradas tal como las leen el diálogo de ajustes, esta documentación y el servidor MCP.
</p>
<pre><code>{`inputs: {
  period: { kind: 'int', min: 2, max: 500 },
  mult: { kind: 'number', min: 0.1, step: 0.1 },
  source: { source: true },
  type: { kind: 'choice', options: [{ value: 'ema', label: 'Exponential' }, { value: 'sma', label: 'Simple' }] },
}`}</code></pre>
<p>
  Las <code>options</code> de una opción a elegir son valores, o valores con la etiqueta que los ajustes muestran
  para ellos (<code>{'{ value, label }'}</code>), en el idioma de tu app; el indicador recibe el valor.
</p>
<p>
  El descriptor también dice cómo se ven sus plots, y el gráfico los dibuja así: <code>fills</code> sombrea entre
  dos plots donde ambos tienen valor, bajo las líneas; el <code>width</code> de un plot lo mantiene en ese grosor
  sea cual sea el del indicador (una línea media fina); <code>lineStyle</code> lo dibuja discontinuo hasta que su
  estilo diga otra cosa, y la configuración muestra y restaura ese trazo; <code>opacity</code> lo atenúa;
  <code>breakOn</code> nombra un campo que numera periodos, y la línea se corta donde cambia. Los canales, las
  bandas, Supertrend y Parabolic SAR integrados se dibujan así.
</p>
<pre><code>{`plots: [
  { key: 'upper', title: 'Upper', color: 0 },
  { key: 'middle', title: 'Basis', color: 1, width: 1, lineStyle: 'dashed' },
  { key: 'lower', title: 'Lower', color: 0 },
],
fills: [{ between: ['upper', 'lower'], color: 0, opacity: 0.1 }],`}</code></pre>
<p>
  Un plot de <code>kind: 'markers'</code> marca las barras donde su campo tiene valor (un giro, una señal) con una
  <code>shape</code> (<code>'triangleUp'</code>, <code>'triangleDown'</code>, <code>'arrowUp'</code>, <code>'arrowDown'</code>,
  <code>'dot'</code>, <code>'square'</code> o <code>'diamond'</code>), en el valor o, en el
  panel de precio, sobre el máximo de la barra o bajo su mínimo (<code>position: 'aboveBar'</code>, <code>'belowBar'</code>).
  No es un valor que leer: no tiene valor en la leyenda, ni etiqueta en el eje, ni columna en una exportación, y no se
  ofrece como línea que otro indicador pueda leer. En un panel, sus marcas están en sus valores. Deja el campo sin
  fijar en las barras sin marca.
</p>
<p>
  Sus marcas son tan anchas como permiten las barras, de 4 a 8 px. Quien mira el gráfico elige otra forma y un tamaño en la
  pestaña Estilo del indicador, y el código los fija en el estilo del plot: <code>shape</code>, y <code>size</code> en píxeles de ancho (de 2 a
  40) o <code>'auto'</code>. Williams Fractals se dibuja así: un triángulo sobre un máximo y otro bajo un mínimo.
</p>
<pre><code>{`chart.updateIndicatorStyle(fractals, { plots: { up: { shape: 'arrowUp', size: 14 }, down: { size: 'auto' } } });`}</code></pre>
<pre><code>{`plots: [
  { key: 'value', title: 'MACD', color: 0 },
  { key: 'turn', title: 'Turn', color: 1, kind: 'markers', shape: 'triangleUp', position: 'belowBar' },
],`}</code></pre>

<h2>Paneles: redimensionar, contraer, maximizar, reordenar</h2>
<p>
  <strong>Arrastra el divisor</strong> que hay sobre un panel para cambiar su tamaño. En
  ChartWidget cada panel tiene botones arriba a la derecha: subirlo o bajarlo, contraerlo
  hasta su cabecera y maximizarlo (los demás paneles se contraen y el panel de precio
  conserva una franja). Los diseños guardados conservan el tamaño, el orden y el estado
  contraído o maximizado de cada panel. Lo mismo desde código:
</p>
<pre><code>{`chart.setPanelSize(rsi, 180)        // px, clamped to a minimum
chart.setPaneCollapsed(macd, true)  // fold to its header
chart.setMaximizedPane(rsi)         // null puts the panes back
chart.movePane(rsi, -1)             // one place up; 1 = down
chart.on('paneChange', (e) => e.payload.change)  // 'collapsed' | 'maximized' | 'order' | 'scale'
chart.setPaneScale(atr, { log: true, invert: false })  // log while its values are above 0
chart.setPaneScale(atr, { percent: true })             // labels in percent of its first value on screen`}</code></pre>
<p>
  En ChartWidget, haz clic derecho en un panel para darle su propia escala logarítmica,
  invertida o porcentual.
</p>

<h2>Mover un indicador a otro panel</h2>
<p>
  Un indicador puede unirse al panel de otro indicador (y entonces comparte la escala de
  ese panel), tener un panel propio o volver al panel de precio. Cuando deja un panel que
  era suyo, los demás indicadores se quedan en él (el siguiente indicador en panel pasa a
  ser su dueño), y los que leen sus líneas lo siguen. En ChartWidget, el botón
  <strong>⋯</strong> de una fila de la leyenda ofrece el panel de arriba, el de abajo, un
  panel nuevo y el panel de precio.
</p>
<pre><code>{`chart.moveIndicatorToPane(cci, rsi)      // into RSI's pane
chart.moveIndicatorToPane(cci, 'new')    // a pane of its own
chart.moveIndicatorToPane(ema, 'price')  // an overlay back to the price pane
chart.canMoveIndicatorToPane(cci, rsi)   // whether it would move`}</code></pre>

<h2>Deshacer y plantillas</h2>
<p>
  Añadir, quitar, editar y mover indicadores son pasos que se pueden deshacer, en el mismo
  historial que los dibujos (<kbd>Ctrl/⌘ Z</kbd>, <kbd>Ctrl/⌘ Shift Z</kbd>); un indicador
  que vuelve al deshacer conserva su propio id, así que las alertas sobre sus líneas siguen
  coincidiendo. Una ráfaga de cambios en un mismo indicador (un color arrastrado, un
  periodo escrito) es un solo paso. Al cargar un diseño, el historial empieza de cero.
</p>
<p>
  Los indicadores se pueden tomar y volver a poner en bloque, que es lo que hacen las
  plantillas de indicadores de ChartWidget: <strong>Guardar indicadores como plantilla…</strong>
  en la pestaña Plantillas del diálogo Indicadores los guarda (parámetros, estilo, niveles, paneles) con un nombre, y
  elegir una plantilla los pone en lugar de los del gráfico, como un solo paso de deshacer.
</p>
<pre><code>{`const setup = chart.getIndicatorSetup()   // what a layout keeps of them
chart.applyIndicatorSetup(setup)          // in place of the chart's indicators

new ChartWidget(host, { indicatorTemplates: true })  // the default`}</code></pre>

<h2>Cálculo fuera del gráfico</h2>
<p>
  <code>IndicatorWorkerHost</code> calcula un indicador a partir de las barras en el worker incluido
  en el paquete (<code>createIndicatorWorker()</code>), el mismo que usa el gráfico con
  <code>indicatorWorker: 'auto'</code>. Pasa <code>null</code> en su lugar y registra los plugins para
  calcular en el mismo hilo (SSR, tests, scripts):
</p>
<pre><code>{`import { IndicatorWorkerHost, RSIIndicator, createIndicatorWorker } from '@tradecanvas/core'

const config = { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } }

const inWorker = new IndicatorWorkerHost(await createIndicatorWorker())
const output = await inWorker.calculate('rsi', config, bars)

const inPlace = new IndicatorWorkerHost(null)
inPlace.registerFallbackPlugin(new RSIIndicator())
const same = await inPlace.calculate('rsi', config, bars)`}</code></pre>
