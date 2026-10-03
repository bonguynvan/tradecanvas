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
  Las barras de volumen toman <code>volumeUp</code> y <code>volumeDown</code> del tema. <code>volumeColor(candleColor)</code> devuelve el color de la vela con la opacidad del volumen, así en un tema propio las barras siguen siendo un fondo bajo las velas. El widget lo hace solo cuando sus ajustes cambian los colores de las velas.
</p>
<pre><code>{`import { DARK_THEME, volumeColor } from '@tradecanvas/chart'

chart.setTheme({
  ...DARK_THEME,
  candleUp: '#26a17b',
  candleDown: '#e0525f',
  volumeUp: volumeColor('#26a17b'),
  volumeDown: volumeColor('#e0525f'),
})`}</code></pre>
