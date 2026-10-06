<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Estilos — Documentación de TradeCanvas</title>
  <meta name="description" content="El aspecto del widget como tokens: esquinas, tamaños, tipografía, bordes, sombras y barras. Tres preajustes (Studio, Terminal, Capsule) y tu propio tema sobre ellos." />
</svelte:head>

<h1>Estilos del widget</h1>
<p>
  El aspecto del widget es un conjunto de tokens: las esquinas de cada tipo de pieza, el tamaño de los controles y las
  barras, la tipografía, los bordes, las sombras, cómo se ve un botón elegido y si la barra de herramientas y las
  herramientas de dibujo van pegadas a los bordes o flotan. Parte de un preajuste y cambia lo que quieras. Los colores
  siguen dependiendo del tema (<code>dark</code> / <code>light</code>; consulta la
  <a href={href('/docs/api')}>referencia de la API</a>); cualquier aspecto funciona con ambos.
</p>

<h2>Preajustes</h2>
<table>
  <thead><tr><th>Preajuste</th><th>Aspecto</th></tr></thead>
  <tbody>
    <tr><td><code>studio</code> (predeterminado)</td><td>
      Controles redondeados de 7 px, menús de 11 px y diálogos de 16 px. Los grupos se separan con espacio en lugar de
      líneas, los menús flotan sobre sombras suaves, los botones de temporalidad van en un carril segmentado y un botón
      elegido lleva un relleno tintado.
    </td></tr>
    <tr><td><code>terminal</code></td><td>
      Denso y cuadrado: esquinas de 2 px, controles de 26 px, líneas entre grupos, etiquetas en mayúsculas y una línea
      bajo el botón elegido. Las etiquetas de precio del gráfico son cuadradas.
    </td></tr>
    <tr><td><code>capsule</code></td><td>
      Píldoras por todas partes, también en las etiquetas de precio. La barra de herramientas y las herramientas de dibujo
      flotan como islas, los menús son de vidrio esmerilado y un botón elegido es una píldora sólida.
    </td></tr>
  </tbody>
</table>

<h2>Elegir un aspecto</h2>
<pre><code>{`import { ChartWidget, ChartWidgetGrid } from '@tradecanvas/chart/widget'

const widget = new ChartWidget(host, { ui: 'terminal' })
widget.setUI('capsule')        // in place: nothing is rebuilt
widget.getUI()                 // every token, resolved

// A grid: every chart and the grid's bar, and the charts it adds later
const grid = new ChartWidgetGrid(host, { layout: '2x2', widget: { ui: 'terminal' } })
grid.setUI('studio')
grid.getUI()`}</code></pre>

<h2>Tu propio aspecto</h2>
<p>
  Un tema parte de un preajuste (Studio si no indicas ninguno) y cambia solo lo que nombra. Las esquinas fijadas en la
  escala llegan a todas las piezas que la siguen, salvo que fijes las de esa pieza en concreto.
</p>
<pre><code>{`widget.setUI({
  preset: 'studio',
  radius: { xs: 3, sm: 5, md: 10, lg: 12, xl: 18 },  // the scale, px (999: pills)
  components: { dialog: 20, tag: 0 },                // a part's own corners
  density: 'compact',                                // compact · comfortable · spacious
  sizes: { toolbar: 40 },                            // px; wins over density
  font: {
    family: "'Manrope', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
    size: 13, weight: 500, strongWeight: 600,
    labelCase: 'uppercase', labelTracking: 0.06,      // small labels
  },
  borders: { width: 1, separators: true },           // rules between toolbar groups
  shadows: { menu: '0 12px 30px rgba(0, 0, 0, 0.4)' },
  blur: 12,                                          // frosted floating surfaces, px
  active: 'solid',                                   // tint · solid · underline
  toolbar: 'floating',                               // docked · floating
  sidebar: 'floating',
  intervals: 'segmented',                            // plain · segmented
  tagRadius: 999,                                    // the chart's price tags and pills
})`}</code></pre>

<table>
  <thead><tr><th>Campo</th><th>Qué ajusta</th></tr></thead>
  <tbody>
    <tr><td><code>radius</code></td><td>La escala de esquinas <code>xs</code>, <code>sm</code>, <code>md</code>, <code>lg</code>, <code>xl</code>, en px (0–999).</td></tr>
    <tr><td><code>components</code></td><td>
      Las esquinas propias de una pieza: <code>control</code> (botones), <code>input</code>, <code>menu</code>, <code>dialog</code>,
      <code>panel</code> (alertas, ventana de datos, ticket de orden), <code>tooltip</code>, <code>tag</code>, <code>toast</code>,
      <code>toolbar</code> y <code>sidebar</code> (su propia caja, visible cuando flotan). Por defecto, los controles y
      los campos toman <code>md</code>; los menús y los paneles, <code>lg</code>; los diálogos, <code>xl</code>; y los
      tooltips y las etiquetas, <code>sm</code>.
    </td></tr>
    <tr><td><code>density</code> / <code>sizes</code></td><td>
      Alto de <code>toolbar</code>, alto de <code>control</code> y <code>controlSmall</code>, <code>icon</code>,
      ancho de <code>sidebar</code> y alto de <code>menuItem</code>, en px.
    </td></tr>
    <tr><td><code>font</code></td><td>
      Familias (listas CSS), <code>size</code> del texto base (11–20 px; los tamaños pequeños lo siguen), pesos, y las mayúsculas y
      el espaciado entre letras (em) de las etiquetas pequeñas, como los títulos de sección.
    </td></tr>
    <tr><td><code>borders</code></td><td>Grosor del borde, y si unas líneas separan los grupos de la barra de herramientas y las herramientas de dibujo.</td></tr>
    <tr><td><code>shadows</code></td><td>Sombras CSS de menús, diálogos y tooltips.</td></tr>
    <tr><td><code>blur</code></td><td>Menús esmerilados, en px: por encima de 0, los menús dejan ver algo del gráfico, desenfocado.</td></tr>
    <tr><td><code>active</code></td><td>Cómo se ve un botón elegido: un relleno tintado, una píldora sólida o un subrayado.</td></tr>
    <tr><td><code>toolbar</code> / <code>sidebar</code></td><td>Pegada al borde, o flotando como una isla.</td></tr>
    <tr><td><code>intervals</code></td><td>Los botones de temporalidad tal cual, o en un carril segmentado.</td></tr>
    <tr><td><code>tagRadius</code></td><td>Esquinas de las etiquetas de precio, las píldoras del eje y las insignias de órdenes que dibuja el gráfico.</td></tr>
  </tbody>
</table>
<p>Los valores que no puede usar (fuera de rango, o CSS que podría salirse de su declaración) se ignoran y se conserva el del preajuste.</p>

<h2>Fuentes</h2>
<p>
  El widget no carga ninguna fuente: las nombra, y el navegador recorre cada lista hasta dar con una disponible. Studio
  nombra Manrope y después Inter; Terminal, IBM Plex Sans Condensed e IBM Plex Mono; Capsule, Sora. Carga las que quieras:
</p>
<pre><code>{`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap">`}</code></pre>

<h2>Variables CSS</h2>
<p>
  Los tokens son variables CSS en la raíz del widget (y en sus diálogos). Sin la opción <code>ui</code> siguen siendo las
  de la hoja de estilos (las de Studio), así que tu propio CSS puede fijarlas: el widget coloca su hoja de estilos
  al principio de la página, de modo que una regla tuya sobre <code>.tcw-root</code> prevalece. Con <code>ui</code>,
  el widget las escribe en el elemento y son ellas las que prevalecen.
</p>
<pre><code>{`.tcw-root {
  --tcw-radius: 4px;            /* the md corner: buttons and fields follow it */
  --tcw-dialog-radius: 12px;
  --tcw-control-h: 28px;
  --tcw-font: 'Inter', system-ui, sans-serif;
}`}</code></pre>
<table>
  <thead><tr><th>Variables</th><th>Origen</th></tr></thead>
  <tbody>
    <tr><td><code>--tcw-radius-xs</code>, <code>-sm</code>, <code>--tcw-radius</code>, <code>-lg</code>, <code>-xl</code></td><td><code>radius</code></td></tr>
    <tr><td><code>--tcw-control-radius</code>, <code>--tcw-input-radius</code>, <code>--tcw-menu-radius</code>, <code>--tcw-dialog-radius</code>, <code>--tcw-panel-radius</code>, <code>--tcw-tooltip-radius</code>, <code>--tcw-tag-radius</code>, <code>--tcw-toast-radius</code>, <code>--tcw-toolbar-radius</code>, <code>--tcw-sidebar-radius</code></td><td><code>components</code></td></tr>
    <tr><td><code>--tcw-toolbar-h</code>, <code>--tcw-control-h</code>, <code>--tcw-control-h-sm</code>, <code>--tcw-icon</code>, <code>--tcw-sidebar-w</code>, <code>--tcw-menu-item-h</code></td><td><code>sizes</code></td></tr>
    <tr><td><code>--tcw-font</code>, <code>--tcw-font-mono</code>, <code>--tcw-font-size</code> (y <code>-sm</code>, <code>-xs</code>, <code>-lg</code>), <code>--tcw-weight</code>, <code>--tcw-weight-strong</code>, <code>--tcw-label-case</code>, <code>--tcw-label-tracking</code></td><td><code>font</code></td></tr>
    <tr><td><code>--tcw-border-w</code>, <code>--tcw-sep-w</code></td><td><code>borders</code></td></tr>
    <tr><td><code>--tcw-menu-shadow</code>, <code>--tcw-dialog-shadow</code>, <code>--tcw-tooltip-shadow</code></td><td><code>shadows</code></td></tr>
    <tr><td><code>--tcw-blur</code>, <code>--tcw-surface-opacity</code></td><td><code>blur</code></td></tr>
  </tbody>
</table>
<p>
  Los interruptores de disposición son atributos data en esos mismos elementos, para tu propio CSS:
  <code>data-tcw-ui</code> (el preajuste), <code>data-tcw-active</code>, <code>data-tcw-toolbar</code>,
  <code>data-tcw-sidebar</code>, <code>data-tcw-intervals</code> y <code>data-tcw-separators</code> (<code>on</code> / <code>off</code>).
</p>

<h2 id="overrides">El aspecto del gráfico: overrides de estilo</h2>
<p>
  El tema fija los colores del gráfico en conjunto. Cualquier parte de lo que dibuja el gráfico se puede fijar aparte,
  por clave: las líneas de la cuadrícula en cada dirección, el crosshair, los ejes, los paneles, la leyenda, el último
  precio, el volumen, los cortes de sesión y la serie principal tal como la dibuja cada tipo de gráfico. Una clave que
  no toques sigue al tema, así que al cambiar de tema cambia todo lo que no fijaste.
</p>
<pre><code>{`import { Chart } from '@tradecanvas/chart'

const chart = new Chart(host, {
  overrides: { 'grid.vertical.visible': false },       // para empezar
})

chart.applyOverrides({
  'series.candlestick.upColor': '#26a69a',              // todos los tipos alcistas/bajistas vuelven a esta
  'series.candlestick.downColor': '#ef5350',
  'grid.horizontal.style': 'dotted',
  'crosshair.vertical.style': 'solid',
  'crosshair.labelBackground': '#2962ff',
  'lastPrice.style': 'solid',
  'panes.background': '#0d1117',
  'legend.textColor': '#c9d1d9',
})
chart.applyOverrides({ 'legend.textColor': null })      // null quita una clave
chart.resetOverrides(['grid.horizontal.style'])         // o nombra las claves
chart.setOverrides({ 'background.color': '#000' })      // toda una capa de una vez

chart.getStyleValue('series.bar.upColor')               // '#26a69a': lo que resulta de una clave
chart.getStyle().grid.vertical                          // { visible: false, color, style, width }
chart.on('styleChange', (e) => e.payload.layer)         // 'host' | 'user'`}</code></pre>

<h3>Claves</h3>
<table>
  <thead><tr><th>Claves</th><th>Qué fijan</th></tr></thead>
  <tbody>
    <tr><td><code>background.color</code></td><td>El fondo del gráfico (y el de los paneles, salvo que tengan el suyo).</td></tr>
    <tr><td><code>panes.background</code>, <code>.separatorColor</code>, <code>.titleColor</code></td><td>Paneles de indicadores: fondo, la barra de arriba, su nombre.</td></tr>
    <tr><td><code>grid.horizontal.*</code>, <code>grid.vertical.*</code></td><td><code>visible</code>, <code>color</code>, <code>style</code> (<code>solid</code> · <code>dashed</code> · <code>dotted</code>), <code>width</code>, cada dirección aparte.</td></tr>
    <tr><td><code>crosshair.horizontal.*</code>, <code>crosshair.vertical.*</code></td><td>Las mismas cuatro para las líneas del crosshair (discontinuas por defecto).</td></tr>
    <tr><td><code>crosshair.labelBackground</code>, <code>.labelTextColor</code></td><td>Las etiquetas de precio y hora en los ejes, y en las escalas de los paneles.</td></tr>
    <tr><td><code>axis.price.lineColor</code>, <code>.textColor</code>, <code>axis.time.*</code></td><td>La línea y las etiquetas de cada eje (las escalas de los paneles siguen al eje de precios).</td></tr>
    <tr><td><code>legend.textColor</code>, <code>.labelColor</code></td><td>Los valores de la leyenda, y sus etiquetas (O, H, L, Vol).</td></tr>
    <tr><td><code>lastPrice.visible</code>, <code>.upColor</code>, <code>.downColor</code>, <code>.style</code>, <code>.width</code></td><td>La línea y la etiqueta del último precio; sus colores siguen a la serie si no se fijan.</td></tr>
    <tr><td><code>volume.upColor</code>, <code>.downColor</code></td><td>Las barras de volumen.</td></tr>
    <tr><td><code>sessionBreaks.color</code>, <code>.style</code>, <code>.width</code></td><td>Los cortes de día, semana y mes.</td></tr>
    <tr><td><code>highLow.color</code>, <code>watermark.color</code></td><td>Las líneas de máximo y mínimo, la marca de agua.</td></tr>
    <tr><td><code>trading.buyColor</code>, <code>.sellColor</code>, <code>.profitColor</code>, <code>.lossColor</code>, <code>.entryColor</code></td><td>Órdenes (compra, venta) y posiciones (beneficio, pérdida, entrada), en el gráfico y en el eje de precios, por encima de los colores de la configuración de trading.</td></tr>
    <tr><td><code>markers.longColor</code>, <code>.shortColor</code>, <code>.neutralColor</code></td><td>Las marcas de señal, por encima de su propio estilo.</td></tr>
    <tr><td><code>tradeZones.profitColor</code>, <code>.lossColor</code>, <code>.activeColor</code></td><td>Las zonas de operación: ganadas, perdidas y abiertas.</td></tr>
    <tr><td><code>drawings.handleColor</code></td><td>Los tiradores del dibujo seleccionado (blancos si no se fija).</td></tr>
    <tr><td><code>series.&lt;type&gt;.*</code></td><td>La serie principal mientras se dibuja con ese tipo: <code>upColor</code>, <code>downColor</code>, <code>wickUpColor</code>,
      <code>wickDownColor</code> (velas, Heikin-Ashi, velas de volumen, equivolumen), <code>color</code> / <code>lineColor</code>
      y <code>lineWidth</code> (línea, línea escalonada, línea con marcadores, área, área HLC, línea base), <code>topColor</code> y
      <code>bottomColor</code> (área, área HLC).</td></tr>
  </tbody>
</table>
<p>
  <code>CHART_STYLE_KEYS</code> enumera cada clave con el tipo de valor que admite, y TypeScript revisa claves y
  valores mientras escribes. Los colores alcistas y bajistas vuelven a <code>series.candlestick.*</code>, los colores y
  grosores de línea a <code>series.line.*</code>, los rellenos a <code>series.area.*</code>, y luego al tema; una mecha toma
  el color de su cuerpo cuando este está fijado. Las claves y valores desconocidos se descartan con un aviso.
</p>

<h3>Los de tu app y los del usuario</h3>
<p>
  Los overrides van en dos capas. Los tuyos (<code>layer: 'host'</code>, por defecto) se mantienen al cambiar de tema y
  nunca se guardan. Los del usuario (<code>layer: 'user'</code>) ganan a los tuyos, se guardan con el tema en que se
  hicieron —los colores elegidos en el tema oscuro vuelven con el tema oscuro— y se guardan con <code>saveState()</code>. Los
  Ajustes del widget escriben en la capa del usuario, y su Restablecer vuelve a los colores del tema, sea cual sea.
  Su pestaña Estilo ajusta cada parte del gráfico con estas claves, incluidos los colores del tipo de gráfico a la
  vista, y su pestaña Trading los colores de órdenes, posiciones, marcas de señal y zonas de operación. Un color que
  se deja a la propia parte aparece como Auto, y Auto lo devuelve allí.
</p>
<pre><code>{`chart.applyOverrides({ 'background.color': '#0b0b0f' }, { layer: 'user' })
chart.getOverrides({ layer: 'user' })                 // los del usuario, para el tema actual
chart.getTheme()                           // el tema tal como se fijó: los overrides van aparte`}</code></pre>
<p>
  Las opciones de la cuadrícula y del crosshair (<code>grid.hLineColor</code>, <code>crosshair.vLine.style</code>…) son
  atajos de sus claves. Una cuadrícula de gráficos aplica overrides a todos sus gráficos: <code>grid.applyOverrides(patch)</code>.
  Los componentes de React, Vue y Svelte los reciben en la prop <code>overrides</code>.
</p>

<h3>Plots de indicadores y paneles</h3>
<pre><code>{`// El trazo y la visibilidad de cada plot, por su clave (colores y grosores siguen en colors / lineWidths)
chart.updateIndicatorStyle(macdId, { plots: { signal: { lineStyle: 'dashed' }, histogram: { visible: false } } })

// Con qué empieza desde ahora cada indicador de un tipo
chart.setIndicatorDefaults('ema', { colors: ['#f5a623'], lineWidths: [2] })

// El fondo y el separador propios de un panel, guardados con su indicador
chart.setPaneStyle(rsiId, { background: '#101418', separator: '#f5a623' })`}</code></pre>
<p>
  Un plot oculto no muestra etiqueta de valor ni valor en la leyenda. Todos los indicadores dejan fuera un plot
  oculto, y casi todos toman el trazo de sus plots; unos pocos que dibujan formas propias (los puntos del Parabolic
  SAR, Supertrend, Zig Zag, los perfiles de volumen) mantienen su propio trazo.
</p>

<h2>Las etiquetas del gráfico</h2>
<p>
  El widget pasa <code>tagRadius</code> a su gráfico (una forma indicada en <code>chartOptions.shapes</code> se
  mantiene hasta que llames a <code>setUI</code>). Con un <code>Chart</code> sin widget, fija tú la forma; se mantiene
  al cambiar de tema. La adoptan las etiquetas de precio, las píldoras del eje y de la cruz, las etiquetas de órdenes,
  posiciones y órdenes bracket, y las de los niveles del periodo anterior.
</p>
<pre><code>{`const chart = new Chart(host, { shapes: { tagRadius: 4 } })
chart.setShapes({ tagRadius: 999 })   // pill price tags, axis pills and order badges
chart.getShapes()`}</code></pre>

<h2>Colores del volumen</h2>
<p>
  Las barras de volumen toman <code>volumeUp</code> y <code>volumeDown</code> (o las claves <code>volume.*</code>) del tema. <code>volumeColor(candleColor)</code> devuelve el color de la vela con la opacidad del volumen, así en un tema propio las barras siguen siendo un fondo bajo las velas. El widget lo hace solo cuando sus ajustes cambian los colores de las velas, y un tema basado en un preajuste que solo cambia <code>candleUp</code> / <code>candleDown</code> también tiene el volumen en esos colores.
</p>
<pre><code>{`import { DARK_THEME, volumeColor } from '@tradecanvas/chart'

chart.setTheme({
  ...DARK_THEME,
  candleUp: '#26a17b',
  candleDown: '#e0525f',
  volumeUp: volumeColor('#26a17b'),
  volumeDown: volumeColor('#e0525f'),
})`}</code></pre>
