<script lang="ts">
  // Generated from the indicator registry by `pnpm docs:gen`: always the real ids.
  import catalog from '$lib/generated/indicators.json';

  type Entry = (typeof catalog)[number];
  const overlays = catalog.filter((i) => i.placement === 'overlay');
  const panes = catalog.filter((i) => i.placement === 'panel');
  const params = (i: Entry) =>
    Object.entries(i.params).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
  const lines = (i: Entry) => i.plots.map((p) => p.title).join(', ');
  const hasSource = (i: Entry) => 'inputs' in i && Object.values(i.inputs ?? {}).some((x) => (x as { source?: boolean }).source);
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
  El último valor de cada línea se marca en su eje con el color de la línea;
  desactiva estas etiquetas con <code>features.indicatorValueLabels: false</code> o
  <code>setIndicatorValueLabelsVisible(false)</code>. Las líneas, los niveles, el
  eje y la cruz de un panel comparten una misma escala.
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
  <code>voldelta</code> (Volume Delta) aproxima la presión compradora/vendedora a
  partir de OHLCV: las barras que cierran al alza suman volumen positivo y las
  bajistas, negativo. <code>mode: 0</code> es el histograma por barra y
  <code>mode: 1</code> el delta acumulado. (Un delta real por tick necesita datos
  de compra/venta de cada operación, que una serie OHLCV no incluye).
</p>

<h2>Tu propio indicador</h2>
<p>
  Extiende <code>IndicatorBase</code> y declara lo que dibuja (<code>plots</code>),
  la escala de su panel, sus niveles y sus parámetros; el gráfico lo dibuja,
  escala su panel, etiqueta sus valores y lo muestra en la leyenda y la
  configuración del widget sin que tengas que escribir código de renderizado.
  Consulta la
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">receta de indicador personalizado</a>.
</p>

<h2>Paneles redimensionables</h2>
<p>
  <strong>Arrastra el divisor</strong> que hay sobre un panel para cambiar su tamaño, o fija su altura:
</p>
<pre><code>{`chart.setPanelSize(rsi, 180)   // px, clamped to a minimum`}</code></pre>

<h2>Cálculo fuera del gráfico</h2>
<p>
  <code>IndicatorWorkerHost</code> calcula un indicador a partir de las barras con
  los mismos mensajes que usaría un Web Worker. El script del worker todavía no
  forma parte de los paquetes publicados, así que pasa <code>null</code> y registra
  los plugins para calcular en el mismo hilo (SSR, tests, scripts):
</p>
<pre><code>{`import { IndicatorWorkerHost, RSIIndicator } from '@tradecanvas/core'

const host = new IndicatorWorkerHost(null)
host.registerFallbackPlugin(new RSIIndicator())
const output = await host.calculate('rsi', { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } }, bars)`}</code></pre>
