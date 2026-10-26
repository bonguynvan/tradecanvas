<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Estilos — Documentación de TradeCanvas</title>
  <meta name="description" content="El aspecto del widget como tokens: esquinas, tamaños, tipografía, bordes, sombras y barras. Cuatro preajustes (Print, Studio, Terminal, Capsule) ceñidos a la proporción áurea, y tu propio tema sobre ellos." />
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
    <tr><td><code>print</code> (predeterminado)</td><td>
      Papel y tinta. Un fondo casi blanco o casi negro, gris para todo lo normal y color solo donde significa algo;
      líneas finas, controles de 3 px, menús de 5 px y diálogos de 8 px; etiquetas en mayúsculas; todas las cifras en una
      fuente monoespaciada para que los precios se alineen en columnas. Un botón elegido es de tinta sólida; una
      herramienta elegida, azul tinta.
    </td></tr>
    <tr><td><code>studio</code></td><td>
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

<h2>Un aspecto con aire</h2>
<p>
  <code>density: 'airy'</code> abre el gráfico con más barras en pantalla y aire entre ellas: el cuerpo de una vela es
  el hueco × φ⁻¹ (62%) en cualquier zoom, y el gráfico se abre a φ⁴ ≈ 6,85 px por hueco (<code>barLayout: 'golden'</code>).
  Los controles son holgados, y las cifras de los ejes y de la leyenda usan la fuente sans del aspecto. Es el
  aspecto con el que abrirá la 2.0.
</p>
<pre><code>{`new ChartWidget(host, { ui: { density: 'airy' } })

// The same on a chart of your own
import { Chart, SANS_FONT_FAMILY } from '@tradecanvas/chart'
const chart = new Chart(host, { barLayout: 'golden', font: { family: SANS_FONT_FAMILY } })
chart.setBarLayout('classic')    // a 2 px gap, as before
chart.setFont({ sizeSmall: 12 }) // the axes' and tags' size
chart.setFont(null)              // the theme's own font again`}</code></pre>
<p>
  <code>chartOptions.barLayout</code> y un <code>family</code> en <code>chartOptions.font</code> mandan sobre los del
  aspecto; si <code>chartOptions.font</code> solo fija tamaños, se queda la fuente del aspecto. Con barras en
  pantalla, un nuevo reparto mantiene el zoom y solo vuelve a dividir cada hueco.
</p>

<h2>La proporción áurea</h2>
<p>
  Print ajusta sus proporciones a la proporción áurea, φ ≈ 1.618, de modo que los tamaños que van juntos se relacionan
  igual en todas partes:
</p>
<table>
  <thead><tr><th>Qué</th><th>Regla</th><th>Valores (px)</th></tr></thead>
  <tbody>
    <tr><td>Tamaños</td><td>Medios pasos de φ desde el icono: un icono, su botón pequeño, su botón, una fila de menú, la barra.</td><td>16 · 20 · 26 · 33 · 42</td></tr>
    <tr><td>Espaciado</td><td>Números de Fibonacci, cada uno la suma de los dos anteriores, así que dos vecinos guardan una razón cercana a φ.</td><td>2 · 3 · 5 · 8 · 13 · 21 · 34</td></tr>
    <tr><td>Esquinas</td><td>
      También números de Fibonacci. Una esquina anidada es la que la rodea menos el relleno que hay entre ambas, así las
      curvas van paralelas: el 5 de un menú es el 2 de sus filas más sus 3 de relleno.
    </td><td>1 · 2 · 3 · 5 · 8</td></tr>
    <tr><td>Texto</td><td>
      Pasos de la raíz cúbica de φ, así que cada tercer tamaño es φ veces mayor: el título de un diálogo es φ veces su
      texto. Nunca baja de 10 px, donde las letras con dos marcas (en vietnamita, ế, ộ) dejan de leerse.
    </td><td>10 · 11 · 13 · 15 · 18 · 21</td></tr>
  </tbody>
</table>
<p>
  Los pasos del texto siguen el tamaño base que fijes (<code>font.size</code>), y <code>density</code> mueve los
  tamaños medio paso hacia abajo o hacia arriba. <code>PHI</code>, <code>FIBONACCI</code> y
  <code>phiStep(base, steps, perPhi)</code> vienen de <code>@tradecanvas/commons</code> para un aspecto propio.
</p>

<h2>Tu propio aspecto</h2>
<p>
  Un tema parte de un preajuste (Print si no indicas ninguno) y cambia solo lo que nombra. Las esquinas fijadas en la
  escala llegan a todas las piezas que la siguen, salvo que fijes las de esa pieza en concreto.
</p>
<pre><code>{`widget.setUI({
  preset: 'studio',
  radius: { xs: 3, sm: 5, md: 10, lg: 12, xl: 18 },  // the scale, px (999: pills)
  components: { dialog: 20, tag: 0 },                // a part's own corners
  density: 'compact',                                // compact · comfortable · spacious · airy
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
      ancho de <code>sidebar</code> y alto de <code>menuItem</code>, en px. <code>compact</code> y
      <code>spacious</code> son los tamaños de Print medio paso de φ más abajo o más arriba.
    </td></tr>
    <tr><td><code>font</code></td><td>
      Familias (listas CSS), <code>size</code> del texto base (11–20 px; los demás tamaños lo siguen, separados un tercio de paso de φ), pesos, y las mayúsculas y
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
  El widget no carga ninguna fuente: las nombra, y el navegador recorre cada lista hasta dar con una disponible. Print
  nombra las fuentes que trae cualquier sistema (Segoe UI, San Francisco, Roboto) y, para las cifras, Cascadia Mono,
  SF Mono, Menlo o Consolas, así que no necesita cargar nada. Studio nombra Manrope y después Inter; Terminal,
  IBM Plex Sans Condensed e IBM Plex Mono; Capsule, Sora. Carga las que quieras:
</p>
<pre><code>{`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap">`}</code></pre>

<h2>Variables CSS</h2>
<p>
  Los tokens son variables CSS en la raíz del widget (y en sus diálogos). Sin la opción <code>ui</code> siguen siendo las
  de la hoja de estilos (las de Print), así que tu propio CSS puede fijarlas: el widget coloca su hoja de estilos
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
    <tr><td><code>--tcw-font</code>, <code>--tcw-font-mono</code>, <code>--tcw-font-size</code> (y <code>-xs</code>, <code>-sm</code>, <code>-lg</code>, <code>-xl</code>, <code>-display</code>), <code>--tcw-weight</code>, <code>--tcw-weight-strong</code>, <code>--tcw-label-case</code>, <code>--tcw-label-tracking</code></td><td><code>font</code></td></tr>
    <tr><td><code>--tcw-border-w</code>, <code>--tcw-sep-w</code></td><td><code>borders</code></td></tr>
    <tr><td><code>--tcw-menu-shadow</code>, <code>--tcw-dialog-shadow</code>, <code>--tcw-tooltip-shadow</code></td><td><code>shadows</code></td></tr>
    <tr><td><code>--tcw-blur</code>, <code>--tcw-surface-opacity</code></td><td><code>blur</code></td></tr>
    <tr><td><code>--tcw-space-1</code> … <code>--tcw-space-7</code></td><td>La hoja de estilos: espaciado Fibonacci, de 2 a 34 px</td></tr>
    <tr><td><code>--tcw-kind-1</code> … <code>--tcw-kind-5</code></td><td>La hoja de estilos: los colores de la búsqueda de símbolos para cada tipo de símbolo (acciones, futuros, índices, cripto, divisas), definidos para el tema oscuro y el claro. Una paleta propia también debe definirlos, o las insignias conservan estos tonos.</td></tr>
    <tr><td><code>--tcw-font-features</code></td><td>La hoja de estilos: <code>normal</code>, las fuentes tal como se dibujan. La opción <code>ui</code> nunca la fija, así que una regla tuya sobre <code>.tcw-root</code> activa las funciones OpenType de tu fuente (la a de un piso y los dígitos abiertos de Inter: <code>'cv11', 'ss01'</code>). Llegan al texto del widget, también a sus botones y campos, y nunca al texto del gráfico (sus lienzos y sus tooltips).</td></tr>
  </tbody>
</table>
<p>
  Los interruptores de disposición son atributos data en esos mismos elementos, para tu propio CSS:
  <code>data-tcw-ui</code> (el preajuste), <code>data-tcw-active</code>, <code>data-tcw-toolbar</code>,
  <code>data-tcw-sidebar</code>, <code>data-tcw-intervals</code> y <code>data-tcw-separators</code> (<code>on</code> / <code>off</code>).
</p>

<h2 id="controls">Campos, listas y el calendario</h2>
<p>
  Todos los campos del widget (alertas, ajustes, el ticket de orden, ir a fecha, los parámetros de un indicador) tienen un mismo aspecto: un relleno tenue y una línea fina, una línea más firme al pasar el ratón y, con el foco, la línea toma el color de acento, sin anillo alrededor. Un select abre la lista propia del widget, con una marca en la fila elegida, los grupos como títulos, las flechas, Enter, Escape y la búsqueda por letra; un campo de fecha abre el calendario del widget, con las semanas desde el día en que las empieza el idioma, hoy subrayado y los días fuera del <code>min</code> y el <code>max</code> del campo en gris. Las casillas, los botones de opción, los deslizadores y los interruptores siguen los mismos tokens, igual que las barras de desplazamiento: finas y redondeadas, solo el pulgar, sin pista.
</p>
<p>
  Los campos siguen siendo el <code>&lt;select&gt;</code> y el <code>&lt;input&gt;</code> del navegador: valores, eventos y formularios funcionan como antes, y en una pantalla táctil se abren la rueda y el calendario del propio teléfono, más cómodos para el dedo.
</p>
<p>El aspecto sale de estas variables, con valores para el tema oscuro y el claro:</p>
<p><code>--tcw-field-bg</code>, <code>--tcw-field-bg-hover</code>, <code>--tcw-field-bg-focus</code>, <code>--tcw-field-line</code>, <code>--tcw-field-line-hover</code>, <code>--tcw-field-line-focus</code>, <code>--tcw-field-placeholder</code>, <code>--tcw-check-line</code>, <code>--tcw-scroll-thumb</code>, <code>--tcw-scroll-thumb-hover</code>.</p>
<pre><code>{`.tcw-root {
  --tcw-field-bg: transparent;            /* fields as lines, no fill */
  --tcw-field-line: rgba(255, 255, 255, 0.12);
  --tcw-field-line-focus: #5b8cff;        /* focus in your brand colour */
}`}</code></pre>

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
    <tr><td><code>crosshair.horizontal.*</code>, <code>crosshair.vertical.*</code></td><td>Las mismas cuatro para las líneas del crosshair (líneas finas continuas por defecto).</td></tr>
    <tr><td><code>crosshair.labelBackground</code>, <code>.labelTextColor</code></td><td>Las etiquetas de precio y hora en los ejes, y en las escalas de los paneles.</td></tr>
    <tr><td><code>axis.price.lineColor</code>, <code>.textColor</code>, <code>axis.time.*</code></td><td>La línea y las etiquetas de cada eje (las escalas de los paneles siguen al eje de precios).</td></tr>
    <tr><td><code>legend.textColor</code>, <code>.labelColor</code></td><td>Los valores de la leyenda, y sus etiquetas (O, H, L, Vol).</td></tr>
    <tr><td><code>lastPrice.visible</code>, <code>.upColor</code>, <code>.downColor</code>, <code>.style</code>, <code>.width</code></td><td>La línea y la etiqueta del último precio; sus colores siguen a la serie si no se fijan. El tiempo que le queda a la barra (<code>features.barCountdown</code>) cuelga bajo la etiqueta.</td></tr>
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
  Ajustes del widget escriben en la capa del usuario. Sus pestañas, a un lado, ajustan cada parte del gráfico con estas
  claves: <strong>Símbolo</strong> (el tipo de gráfico a la vista, el último precio, el volumen), <strong>Línea de
  estado</strong>, <strong>Escalas</strong>, <strong>Apariencia</strong> (fondo, cuadrícula, cruz, cortes de sesión),
  <strong>Capas</strong> y <strong>Trading</strong> (órdenes, posiciones, marcas de señal, zonas de operación). Cada
  cambio se ve al momento; <strong>Cancelar</strong> los deshace todos y <strong>Aceptar</strong> los guarda como un solo
  paso de deshacer. El menú <strong>Plantilla</strong> guarda el aspecto con un nombre, aplica o borra uno guardado y
  vuelve a los colores del tema, sea cual sea. Un color que se deja a la propia parte aparece como Auto, y Auto lo
  devuelve allí.
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

<h2 id="legend">La leyenda OHLCV</h2>
<p>
  La leyenda en la parte superior del gráfico empieza con una línea de título: el símbolo, la temporalidad y la bolsa, y en esa misma línea la barra bajo el puntero (si no, la última): apertura, máximo, mínimo, cierre y el cambio. El volumen va en una línea aparte. Si el área del gráfico es demasiado estrecha para la línea de título, como en un teléfono, esta pasa a varias líneas. El gráfico toma el símbolo y la temporalidad de su flujo de datos, y la bolsa de los datos del símbolo; <code>setSymbolName('Bitcoin')</code> fija un nombre propio hasta que cambie el símbolo, y <code>showSymbol: false</code> quita el título. Cada valor conserva su sitio mientras cambian sus dígitos, así que no tiembla con los ticks en vivo. Se puede apagar o dejar solo las filas que quiera. En el widget toma la fuente de cifras del aspecto, al tamaño de las filas de indicadores que lista debajo; <code>setUI</code> la vuelve a poner, después de un <code>setLegend</code> suyo.
</p>
<pre><code>{`new Chart(host, { features: { legend: false } })   // no legend at all
chart.setLegend({ visible: false })                  // or at any time
chart.setLegend({
  showSymbol: false, showOHLC: true, showChange: true, showVolume: false,
  position: 'top-right',
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',                   // null: the theme's font
})

// The widget: start with it off (the user can still turn it on in Settings)
new ChartWidget(host, { chartOptions: { features: { legend: false } } })`}</code></pre>

<h2 id="volume">La escala de precio y la banda del volumen</h2>
<p>
  Las barras de volumen se quedan en una banda a lo largo de la parte inferior del área del gráfico, de φ^-4.5 (alrededor
  del 11.5%) de su altura, y la escala de precio ajustada mantiene las velas por encima, con un hueco de φ^-7 (3%). Por
  encima del máximo más alto deja φ^-5 (9%). Sin volumen a la vista (desactivado, o barras que no lo traen) las velas
  recuperan la banda. La escala también se ajusta a los indicadores superpuestos y a las líneas de comparación a la vista.
</p>

<h2>Colores del volumen</h2>
<p>
  Las barras de volumen toman <code>volumeUp</code> y <code>volumeDown</code> (o las claves <code>volume.*</code>) del tema. Los temas incluidos las dibujan en una sola tinta neutra, más clara en las barras bajistas: las velas de encima ya muestran hacia dónde fue el precio, así que las barras siguen siendo un fondo. Siguen neutras cuando cambian los colores de las velas, sea desde tu código o desde los ajustes del widget. Para barras en los colores de las velas, <code>volumeColor(candleColor)</code> devuelve un color de vela con la opacidad del volumen:
</p>
<pre><code>{`import { DARK_THEME, volumeColor } from '@tradecanvas/chart'

chart.setTheme({
  ...DARK_THEME,
  candleUp: '#26a17b',
  candleDown: '#e0525f',
  volumeUp: volumeColor('#26a17b'),
  volumeDown: volumeColor('#e0525f'),
})`}</code></pre>
