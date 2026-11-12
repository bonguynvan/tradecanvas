<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Migrar a la 2.0 — Documentación de TradeCanvas</title>
  <meta name="description" content="Qué cambia para tu código entre TradeCanvas 1.x y 2.0: instalar la beta, el aspecto por defecto y la opción que conserva el de la 1.x, los nombres eliminados y qué usar en su lugar, y el comportamiento que ha cambiado." />
</svelte:head>

<h1>Migrar a la 2.0</h1>
<p>
  La 2.0 cambia el aspecto por defecto del gráfico y del widget, elimina los nombres que la 1.x había marcado como
  obsoletos y cambia cuatro comportamientos. Los datos, los diseños guardados, los indicadores, los dibujos, el
  trading y los temas siguen como estaban. Esta página recoge cada cambio y qué hacer con él.
</p>

<h2 id="install">Instalación</h2>
<p>
  La 2.0 está en beta. Todos los paquetes se publican como <code>2.0.0-beta.N</code> con la etiqueta
  <code>beta</code>; <code>latest</code> sigue siendo la 1.x hasta que la 2.0 sea definitiva.
</p>
<pre><code>{`npm install @tradecanvas/chart@beta

# con un componente de framework, también su paquete
npm install @tradecanvas/react@beta
npm install @tradecanvas/vue@beta
npm install @tradecanvas/svelte@beta`}</code></pre>

<h2 id="look">El aspecto por defecto</h2>
<p>
  El gráfico y el widget se abren con más aire alrededor de lo que dibujan. Una sola opción conserva el aspecto de
  la 1.x:
</p>
<pre><code>{`// El widget como era en la 1.x
new ChartWidget(host, { ui: { density: 'classic' } })
widget.setUI({ density: 'classic' })

// Un gráfico propio como era en la 1.x
new Chart(host, { density: 'compact' })`}</code></pre>
<p>
  <code>ui: {'{'} density: 'compact' {'}'}</code> (controles más pequeños) no cambia.
</p>
<p>Lo que es distinto por defecto:</p>
<table>
  <thead><tr><th>Qué</th><th>1.x</th><th>2.0</th></tr></thead>
  <tbody>
    <tr><td>Espacio tras la barra más reciente</td><td>5 huecos</td><td>8 huecos</td></tr>
    <tr><td>Libre por encima y por debajo de los precios</td><td>9% de la altura</td><td>11,5% de la altura</td></tr>
    <tr><td>Las barras de un <code>Chart</code> por sí solo</td><td>classic</td><td>golden, con el cuerpo al 62% de su hueco, como ya las dibujaba el widget</td></tr>
    <tr><td>La leyenda, desde la esquina del área de dibujo</td><td>8 px hacia dentro</td><td>12 px hacia dentro</td></tr>
    <tr><td>El espaciado del widget, <code>--tcw-space-1</code> … <code>-7</code></td><td>2 · 3 · 5 · 8 · 13 · 21 · 34 px</td><td>2 · 4 · 6 · 8 · 12 · 20 · 32 px</td></tr>
    <tr><td>El botón de Print</td><td>33 px</td><td>34 px</td></tr>
    <tr><td>Relleno a cada lado del texto de un botón</td><td>8 px</td><td>12 px</td></tr>
  </tbody>
</table>
<p>
  Todos los tamaños y espacios del widget son ahora un número par de píxeles, y las líneas finas miden un píxel de
  dispositivo de ancho con la pantalla al 125% y al 150% de escala.
</p>
<p>Revisa esto en tu código:</p>
<ul>
  <li>CSS que sobrescribe <code>--tcw-space-*</code>, o que da por hecho un control de 33 px.</li>
  <li>Código que pasa <code>rightMargin</code>. Cuando se fija, sigue teniendo prioridad.</li>
  <li>
    Los componentes de React, Vue y Svelte ya no fijan <code>rightMargin: 5</code> por su cuenta. Para conservarlo,
    pasa <code>density: 'compact'</code> o <code>rightMargin: 5</code> en <code>options</code>.
  </li>
  <li>
    Código que lee <code>PRICE_SCALE_MARGIN</code> de <code>@tradecanvas/core</code> o
    <code>DEFAULT_CHART_OPTIONS.rightMargin</code>: ambos han cambiado de valor.
  </li>
</ul>
<pre><code>{`// React; los componentes de Vue y Svelte reciben las mismas options
<TradeCanvas options={{ density: 'compact' }} />
<TradeCanvas options={{ rightMargin: 5 }} />`}</code></pre>
<p>
  Todo lo que fija cada densidad está en <a href={href('/docs/styling#density')}>Estilos → Densidad</a>.
</p>

<h2 id="removed">Nombres eliminados</h2>
<p>Todos quedaron obsoletos en la 1.x y ya no existen en la 2.0.</p>
<table>
  <thead><tr><th>Eliminado</th><th>Usa en su lugar</th></tr></thead>
  <tbody>
    <tr><td><code>chart.setTimezone(tz)</code></td><td><code>chart.setTimeZone(tz)</code></td></tr>
    <tr><td><code>chart.getTimezone()</code></td><td><code>chart.getTimeZone()</code></td></tr>
    <tr><td><code>chart.getEffectiveTimezone()</code></td><td><code>chart.getEffectiveTimeZone()</code></td></tr>
    <tr><td><code>chart.getExchangeTimezone()</code></td><td><code>chart.getExchangeTimeZone()</code></td></tr>
    <tr><td><code>chart.setTimezoneOffset(minutes)</code></td><td><code>chart.setTimeZone(minutes)</code>: minutos al este de UTC, o <code>null</code> para la zona del navegador</td></tr>
    <tr><td><code>EXCHANGE_TIMEZONE</code></td><td><code>EXCHANGE_TIME_ZONE</code></td></tr>
    <tr><td><code>SymbolInfo.timezone</code></td><td><code>SymbolInfo.timeZone</code></td></tr>
    <tr><td><code>TimeFormatContext.kind === 'date'</code> en un <code>timeFormatter</code></td><td>El eje da <code>'year'</code>, <code>'month'</code> o <code>'day'</code>. Ya no daba <code>'date'</code> desde la 1.x, y el tipo ha dejado de incluirlo.</td></tr>
    <tr><td><code>SessionBreaks.setLocale()</code> y <code>SessionBreaks.renderLabels()</code> (<code>@tradecanvas/core</code>)</td><td>Quita las llamadas: ninguna de las dos hacía nada.</td></tr>
    <tr><td>La clave de texto del widget <code>replay.barsPerSecond</code></td><td>Quítala de tu <code>messages</code>: no se usaba. El texto de la velocidad de la reproducción es <code>replay.rate</code>.</td></tr>
  </tbody>
</table>

<h3 id="symbol-time-zone">El <code>timezone</code> de un símbolo ya no se lee</h3>
<p>
  El campo antiguo no se lee en absoluto. Un símbolo que solo da <code>timezone</code>, venga de tus
  <code>symbols</code>, de <code>resolveSymbol</code>, de un feed o de un adaptador, se queda sin zona propia:
</p>
<ul>
  <li><code>setTimeZone('exchange')</code> y las fechas de las barras diarias recurren a la zona del mercado, o a UTC;</li>
  <li>sus propias <code>sessions</code> no se sombrean (sí las horas del mercado, cuando hay un mercado puesto);</li>
  <li>su estado se muestra como el de un mercado que opera las 24 horas, y el panel del símbolo no muestra zona horaria.</li>
</ul>
<p>
  Un <code>timezone</code> que sigas pasando se conserva tal cual en <code>getSymbolInfo()</code>, pero nada lo lee.
</p>
<pre><code>{`// 1.x
chart.setSymbolInfo({ symbol: 'AAPL', timezone: 'America/New_York' })

// 2.0
chart.setSymbolInfo({ symbol: 'AAPL', timeZone: 'America/New_York' })`}</code></pre>

<h3 id="kept">Nombres que no han cambiado</h3>
<p>
  Los nombres se parecen, así que cuidado al buscar y reemplazar. El ajuste del widget se sigue escribiendo
  <code>timezone</code>:
</p>
<pre><code>{`widget.setSettings({ timezone: 'exchange' })
widget.getSettings().timezone       // 'exchange'`}</code></pre>
<p>
  Las claves de texto del widget <code>settings.timezone</code> y <code>menu.chart.timezone</code> también conservan
  su nombre.
</p>

<h3 id="find">Cómo encontrarlos</h3>
<p>
  Busca en tu código <code>Timezone(</code> y <code>EXCHANGE_TIMEZONE</code>, y <code>timezone:</code> dentro de los
  objetos de símbolo. TypeScript señala cada nombre eliminado.
</p>

<h2 id="behaviour">Comportamiento que ha cambiado</h2>
<p>Estos cambios no van acompañados de ningún cambio de nombre.</p>
<ul>
  <li>
    <strong>Etiquetas del eje de precios en el borde de un panel.</strong> La etiqueta que el borde superior o
    inferior de su panel cortaría no se dibuja. Su línea de la cuadrícula se mantiene.
  </li>
  <li>
    <strong>El panel de precios entre muchos paneles.</strong> Por muchos paneles de indicadores que haya abiertos,
    el panel de precios conserva al menos el 38,2% de la altura del gráfico, y los paneles abiertos se reparten el
    resto en proporción a sus tamaños. El tamaño fijado para un panel se guarda y vuelve a verse en un gráfico más
    alto. Antes los paneles conservaban su altura y podían dejar sin ninguna al panel de precios.
  </li>
  <li>
    <strong>Anchos de línea entre píxeles enteros.</strong> Una línea con un ancho así ocupa los píxeles de
    dispositivo enteros inmediatamente inferiores: 1,5 px es un píxel de dispositivo al 100%, donde antes eran dos.
  </li>
  <li>
    <strong><code>setBarLayout()</code> y <code>setDensity()</code>.</strong> La disposición de barras fijada con
    <code>chart.setBarLayout()</code> en tiempo de ejecución se conserva tras un <code>setDensity()</code> posterior.
  </li>
</ul>

<h2 id="unchanged">Sin cambios</h2>
<ul>
  <li>
    Datos: <code>DataAdapter</code>, <code>DataFeed</code>, <code>setData</code>, <code>appendBar</code> y
    <code>updateLastBar</code>.
  </li>
  <li>Los diseños y ajustes guardados con la 1.x se cargan como antes.</li>
  <li>Los indicadores, los dibujos, el trading, los temas y las claves de estilo conservan sus nombres.</li>
</ul>
