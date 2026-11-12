<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Estilos — Documentación de TradeCanvas</title>
  <meta name="description" content="El aspecto del widget como tokens: esquinas, tamaños, tipografía, bordes, sombras y barras. Cinco preajustes (Print, Studio, Terminal, Capsule, Desk), y tu propio tema sobre ellos." />
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
      líneas finas, controles de 3 px, menús de 5 px y diálogos de 8 px; iconos grandes de trazo fino;
      etiquetas tal como se escriben y un peso medio para destacar; la fuente del propio sistema (Segoe UI Variable en
      Windows 11); todas las cifras, también las del
      gráfico, en una fuente sans de dígitos del mismo ancho (Segoe UI en Windows, Helvetica Neue en Apple, Roboto en
      Android), así que los precios se alinean en columnas. Un botón elegido es de tinta sólida; una
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
    <tr><td><code>desk</code></td><td>
      La ventana de una plataforma de trading de escritorio: Tahoma de 12 px para las etiquetas y las cifras del gráfico,
      esquinas y etiquetas de precio rectas, barras un paso más compactas (controles de 24 px), líneas entre grupos y un
      botón elegido teñido. Sin Tahoma usa Verdana, Segoe UI o DejaVu Sans.
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

<h2 id="density">Densidad</h2>
<p>
  El gráfico y el widget se abren con aire alrededor de lo que dibujan. El cuerpo de una vela es el hueco × φ⁻¹ (62%) en cualquier zoom, y el resto es separación; el gráfico se abre a φ⁴ ≈ 6,85 px por hueco (<code>barLayout: 'golden'</code>), unas 250 barras en una pantalla de 1920 px. La barra más reciente queda a 8 huecos del eje de precios. Los precios dejan libre un φ⁻⁴·⁵ (11,5%) de la altura del área de dibujo por encima del máximo más alto y por debajo del mínimo más bajo; con el volumen activado, la banda de volumen va debajo de las velas con una separación de φ⁻⁶ (5,6%), así que nunca se solapan. La leyenda se sitúa a 12 px de la esquina del área de dibujo. En el widget, todos los tamaños y espacios son un número par de píxeles, y los botones, las barras y las filas de menú tienen 12 px a cada lado de su texto.
</p>
<p>
  <code>density</code> lo fija todo de una vez: para el widget, en <code>ui</code>; para un gráfico propio, en sus opciones:
</p>
<table>
  <thead><tr><th><code>ui.density</code></th><th>El widget</th><th>Su gráfico</th></tr></thead>
  <tbody>
    <tr><td><code>'comfortable'</code></td><td>El valor por defecto: tamaños pares (un botón de 34 px, un icono de 20 px), espaciado 2 · 4 · 6 · 8 · 12 · 20 · 32, 12 px de relleno en un control.</td><td>Comfortable, barras golden.</td></tr>
    <tr><td><code>'classic'</code></td><td>Como era antes de la 2.0 (con la pantalla al 100% de escala, los mismos píxeles, salvo las marcas del eje de precios, que son más nítidas): un botón de 33 px, espaciado 2 · 3 · 5 · 8 · 13 · 21 · 34, 8 px de relleno en un control.</td><td>Compact, con las barras golden que ya tenía el widget.</td></tr>
    <tr><td><code>'compact'</code></td><td>Controles más pequeños (un botón de 26 px, un icono de 16 px) sobre el espaciado clásico. Sin cambios desde la 1.x.</td><td>Compact, barras classic.</td></tr>
    <tr><td><code>'spacious'</code></td><td>Controles más grandes (un botón de 42 px, un icono de 26 px).</td><td>Comfortable, barras golden.</td></tr>
    <tr><td><code>'airy'</code></td><td>Como spacious, y las cifras de los ejes y de la leyenda usan la fuente sans del aspecto.</td><td>Comfortable, barras golden.</td></tr>
  </tbody>
</table>
<table>
  <thead><tr><th><code>density</code> de un gráfico</th><th>Barras</th><th>Espacio tras la barra más reciente</th><th>Por encima y por debajo de los precios</th><th>Sobre la banda de volumen</th><th>Leyenda desde la esquina</th></tr></thead>
  <tbody>
    <tr><td><code>'comfortable'</code> (por defecto)</td><td>golden</td><td>8 huecos</td><td>φ⁻⁴·⁵ (11,5%)</td><td>φ⁻⁶ (5,6%)</td><td>12 px hacia dentro, 8 px hacia abajo</td></tr>
    <tr><td><code>'compact'</code> (como antes de la 2.0)</td><td>classic: una separación de 2 px, 10 px por hueco al abrir</td><td>5 huecos</td><td>φ⁻⁵ (9%)</td><td>φ⁻⁷ (3,4%)</td><td>8 px hacia dentro, 6 px hacia abajo</td></tr>
  </tbody>
</table>
<pre><code>{`// The widget as it was before 2.0
new ChartWidget(host, { ui: { density: 'classic' } })
widget.setUI({ density: 'classic' })

// A chart of your own as it was before 2.0
import { Chart, CHART_SPACING, MONO_FONT_FAMILY } from '@tradecanvas/chart'
const chart = new Chart(host, { density: 'compact', font: { family: MONO_FONT_FAMILY } })
chart.setDensity('comfortable')  // and back
chart.getDensity()               // 'comfortable'
CHART_SPACING.comfortable        // the numbers each density sets

// One part of it
new Chart(host, { barLayout: 'classic' })   // a 2 px gap between bars, the rest comfortable
new Chart(host, { rightMargin: 5 })         // 5 slots past the newest bar
chart.setBarLayout('golden')
chart.setFont({ family: MONO_FONT_FAMILY, sizeSmall: 12 }) // the axes' and tags' face and size
chart.setFont(null)                         // the theme's own font again`}</code></pre>
<p>
  El <code>barLayout</code> y el <code>rightMargin</code> con los que se crea un gráfico se mantienen al cambiar de densidad. En el widget, <code>chartOptions.density</code>, <code>chartOptions.barLayout</code> y un <code>family</code> en <code>chartOptions.font</code> mandan sobre los del aspecto; si <code>chartOptions.font</code> solo fija tamaños, se queda la fuente del aspecto. Con barras en pantalla, un nuevo reparto mantiene el zoom y solo vuelve a dividir cada hueco.
</p>

<h3 id="whole-pixels">En píxeles enteros</h3>
<p>
  Con la pantalla al 125% o al 150% de escala, un píxel CSS son 1,25 o 1,5 píxeles de dispositivo, y una línea de 1 px dibujada entre dos de ellos sale borrosa. El gráfico dimensiona sus canvas según el recuento de píxeles de dispositivo que da el propio navegador y coloca sobre ellos sus líneas finas: la cuadrícula, las líneas y marcas de los ejes, la cruz, la línea del último precio, las líneas de órdenes, alertas y niveles, las mechas, el divisor de un panel y los bordes de las etiquetas de precio. Una línea de 1 px mide un píxel de dispositivo de ancho al 125% y al 150%, igual que el navegador dibuja un borde de 1 px. En el widget, los tamaños son pares para que un icono quede a un número entero de píxeles del borde de su botón, y un botón del de su barra; y los botones de texto de la barra de herramientas miden un número entero de píxeles de ancho allí donde el navegador puede redondear una caja dimensionada por su contenido (Chrome y Edge 129 y posteriores), de modo que los iconos que van detrás también se ven nítidos.
</p>

<h2>La proporción áurea</h2>
<p>
  Print ajusta sus proporciones a la proporción áurea, φ ≈ 1.618, de modo que los tamaños que van juntos se relacionan
  igual en todas partes:
</p>
<table>
  <thead><tr><th>Qué</th><th>Regla</th><th>Valores (px)</th></tr></thead>
  <tbody>
    <tr><td>Tamaños</td><td>Medios pasos de φ, cada uno el número par más cercano a su paso (20,4; 25,9; 32,9; 41,9): un icono, su botón pequeño, su botón, la barra, la columna de herramientas de dibujo; una fila de menú mide lo mismo que un botón. El botón se aparta de la regla: 32 queda más cerca de su paso, pero mide 34, el tamaño que aparentaba el 33 de la 1.x, lo que deja a un icono de 20 px 7 px a cada lado. Los iconos de las herramientas de dibujo van medio paso por encima de los demás (26 frente a 20), y sus botones algo por debajo de ese paso, para dejar 3 px a cada lado en la columna.</td><td>20 · 26 · 34 · 42</td></tr>
    <tr><td>Espaciado</td><td>Números de Fibonacci sobre una cuadrícula de 4 px (1, 2, 3, 5 y 8 por 4), con 2 y 6, las mitades de 4 y 12, por debajo. A partir de 8, los vecinos guardan razones de 1,5; 1,67 y 1,6, cercanas a φ; los pasos pequeños suben de 2 en 2 px, porque ahí una razón de φ no cae en números pares. Las densidades <code>classic</code> y <code>compact</code> conservan los números de Fibonacci tal cual, 2 · 3 · 5 · 8 · 13 · 21 · 34.</td><td>2 · 4 · 6 · 8 · 12 · 20 · 32</td></tr>
    <tr><td>Esquinas</td><td>
      Números de Fibonacci. Una esquina anidada es la que la rodea menos el relleno que hay entre ambas, así las
      curvas van paralelas: el 5 de un menú es el 1 de sus filas más sus 4 de relleno.
    </td><td>1 · 2 · 3 · 5 · 8</td></tr>
    <tr><td>Texto</td><td>
      Pasos de la raíz cúbica de φ, así que cada tercer tamaño es φ veces mayor: el título de un diálogo es φ veces su
      texto. Nunca baja de 10 px, donde las letras con dos marcas (en vietnamita, ế, ộ) dejan de leerse.
    </td><td>10 · 11 · 13 · 15 · 18 · 21</td></tr>
  </tbody>
</table>
<p>
  Los pasos del texto siguen el tamaño base que fijes (<code>font.size</code>); una línea de texto base tiene una
  altura par (18 px a 13 px). <code>density</code> mueve los tamaños medio paso hacia abajo o hacia arriba.
  <code>PHI</code>, <code>FIBONACCI</code>, <code>phiStep(base, steps, perPhi)</code> y <code>evenPx(n)</code> vienen de
  <code>@tradecanvas/commons</code> para un aspecto propio.
</p>

<h3 id="wide-screens">En pantallas anchas</h3>
<p>
  El widget dibuja sus barras, botones, iconos y textos más grandes a medida que se ensancha, para que una pantalla 4K
  no sea toda letra pequeña: como está hasta full HD, luego un sexto de φ más grande desde 1800 px, un tercio desde
  2560 (4K al 150%) y la mitad desde 3400 (4K al 100%), cada tamaño al número par más cercano. El texto de los ejes del gráfico crece con él.
  <code>ui.scale</code> fija una escala propia en todos los anchos; <code>1</code> mantiene los tamaños.
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
  density: 'compact',                                // compact · classic · comfortable · spacious · airy
  sizes: { toolbar: 40 },                            // px; wins over density
  scale: 'auto',                                     // or a number; 'auto' grows with the widget's width
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
  iconStroke: 1,                                     // icon lines, CSS px at every size (0: as drawn)
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
      <code>spacious</code> son los tamaños de Print medio paso de φ más abajo o más arriba, y <code>classic</code> es el
      widget como era antes de la 2.0 (véase <a href="#density">Densidad</a>, que también fija el espaciado y el aire del gráfico). Los botones e iconos de las
      herramientas de dibujo van medio paso de φ por encima de <code>control</code> e <code>icon</code> (iguales en
      <code>compact</code>). Dejan espacio a cada lado en la columna <code>sidebar</code> y, si la columna es demasiado
      baja para todas, se encogen, hasta el tamaño de <code>icon</code> más 2 px a cada lado, antes de que la columna se desplace.
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
    <tr><td><code>iconStroke</code></td><td>
      Las líneas de los iconos, en px CSS de 0.5 a 3, del mismo grosor en cualquier tamaño de icono (como mucho 1 px en iconos de menos de 14 px). <code>0</code> los
      dibuja como el juego de iconos, más gruesos cuanto mayor es el icono. Los de Print son de 1; los demás aspectos
      los dibujan tal cual.
    </td></tr>
  </tbody>
</table>
<p>Los valores que no puede usar (fuera de rango, o CSS que podría salirse de su declaración) se ignoran y se conserva el del preajuste.</p>

<h2>Fuentes</h2>
<p>
  El widget no carga ninguna fuente: las nombra, y el navegador recorre cada lista hasta dar con una disponible. Print
  nombra las fuentes que trae cualquier sistema: Segoe UI, San Francisco o Roboto para los textos y, para las cifras,
  Segoe UI, Roboto, Helvetica Neue o Arial, cuyos dígitos tienen todos el mismo ancho, así que no necesita cargar nada;
  Desk nombra Tahoma y después Verdana, que también vienen con el sistema. Studio nombra Manrope y después Inter;
  Terminal, IBM Plex Sans Condensed e IBM Plex Mono; Capsule, Sora. Carga las que quieras:
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
    <tr><td><code>--tcw-space-1</code> … <code>--tcw-space-7</code></td><td><code>density</code>: espaciado, de 2 a 32 px (de 2 a 34 en <code>classic</code> y <code>compact</code>)</td></tr>
    <tr><td><code>--tcw-control-pad</code>, <code>--tcw-bar-pad</code>, <code>--tcw-menu-row-pad</code></td><td><code>density</code>: el espacio junto al rótulo de un botón, junto al primer botón de una barra y junto al texto de una fila de menú</td></tr>
    <tr><td><code>--tcw-line-height</code>, <code>--tcw-line-xs</code>, <code>--tcw-legend-line</code>, <code>--tcw-legend-line-pane</code></td><td><code>density</code>: la altura de una línea de texto base, de una del texto más pequeño y de la fila de un indicador en el gráfico y en un panel</td></tr>
    <tr><td><code>--tcw-text-w</code></td><td><code>density</code>: los botones de texto de las barras con un número entero de píxeles de ancho (<code>auto</code>: tan anchos como su texto)</td></tr>
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
  oculto, y casi todos toman el trazo de sus plots; unos pocos que dibujan formas propias (Zig Zag, los perfiles
  de volumen, las marcas de patrones de velas) mantienen su propio trazo. Las líneas que un indicador dibuja
  discontinuas (Chandelier Exit, los niveles pivote, las bandas de Session VWAP) siguen así hasta que el estilo
  de su plot diga otra cosa.
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
  ground: false,                                     // sin fondo translúcido bajo las filas
})

// The widget: no legend, and no switch for it in its Settings
new ChartWidget(host, { chartOptions: { features: { legend: false } } })
// Off to start, for the user to turn on in Settings
new ChartWidget(host).setSettings({ legendVisible: false })`}</code></pre>

<p>
  Cada fila de la leyenda se apoya en un fondo translúcido del color del gráfico, así que las líneas que cruzan la parte de arriba del gráfico (medias móviles, un VWAP) pasan por detrás del texto en vez de atravesarlo. <code>ground: false</code> lo quita. Las filas de indicadores del widget, debajo, tienen el mismo fondo, la variable CSS <code>--tcw-legend-ground</code> (<code>transparent</code> para ninguno).
</p>

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
