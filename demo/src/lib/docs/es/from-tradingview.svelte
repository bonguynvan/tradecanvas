<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Pasar desde TradingView — Documentación de TradeCanvas</title>
  <meta name="description" content="Pasa una app de la librería de gráficos de TradingView (Advanced Charts, Trading Platform) o de Lightweight Charts a TradeCanvas: conserva el datafeed con feedFromJsApi o udfFeed, deja que un agente de código traduzca los nombres y las opciones con el servidor MCP y conoce lo que no se traslada." />
</svelte:head>

<h1>Pasar desde TradingView</h1>
<p>
  Una app hecha con la librería de gráficos de TradingView (Advanced Charts o Trading Platform) o con Lightweight
  Charts pasa a TradeCanvas sin que cambie su backend. El datafeed se queda como está, detrás de un puente. Los
  nombres que sí cambian, opciones, featuresets, overrides, studies, dibujos y métodos, están en tablas con las que
  responde el <a href={href('/docs/getting-started#ai')}>servidor MCP</a>, así que un agente de código busca cada
  uno en lugar de adivinarlo. Esta página dice qué se conserva, qué cambia y qué no se traslada.
</p>

<h2 id="datafeed">Conserva el datafeed</h2>
<p>
  <code>feedFromJsApi</code> convierte un datafeed escrito para la JS API (<code>onReady</code>,
  <code>resolveSymbol</code>, <code>getBars</code>, <code>subscribeBars</code>, y <code>searchSymbols</code>,
  <code>getQuotes</code>, <code>subscribeQuotes</code> cuando los tiene) en un <code>DataFeed</code>:
</p>
<pre><code>{`import { feedFromJsApi } from '@tradecanvas/chart'
import { ChartWidget } from '@tradecanvas/chart/widget'

const feed = feedFromJsApi(datafeed)   // el datafeed de la app, sin cambios
await feed.ready()                      // onReady ha respondido: ya se conocen las temporalidades que sirve

const widget = new ChartWidget(document.getElementById('chart'), { feed, symbol: 'AAPL', timeframe: '1d' })`}</code></pre>
<p>Lo que hace el puente por el datafeed:</p>
<ul>
  <li>resuelve cada símbolo una sola vez y devuelve su symbol info a <code>getBars</code> y <code>subscribeBars</code>;</li>
  <li>
    convierte las temporalidades del gráfico en resoluciones (<code>'1h'</code> → <code>'60'</code>, <code>'1d'</code> →
    <code>'1D'</code>), y su <code>countBack</code> y <code>before</code> en <code>from</code>, <code>to</code>
    y <code>countBack</code> en segundos;
  </li>
  <li>pide una vez más desde <code>nextTime</code> cuando un rango no tenía barras;</li>
  <li>
    cancela la suscripción con el guid con el que se suscribió, y vuelve a cargar la serie cuando el datafeed llama a
    <code>onResetCacheNeeded</code>;
  </li>
  <li>
    lee el <code>pricescale</code> y el <code>minmov</code> del símbolo como su paso de precio, su <code>session</code>
    como su horario de negociación, y las temporalidades que sirve de <code>supported_resolutions</code>.
  </li>
</ul>
<p>
  El gráfico lee las temporalidades que sirve un feed al conectarse, y construye las demás a partir de ellas (un
  gráfico de 7 minutos con barras de 1 minuto). <code>onReady</code> responde más tarde, así que espera a
  <code>feed.ready()</code> con <code>await</code> antes de crear el widget, o dalas tú mismo: <code>feedFromJsApi(datafeed, {'{'} supportedTimeframes: ['1m', '1h', '1d'] {'}'})</code>.
</p>

<h3 id="udf">Un servidor UDF</h3>
<p>Un servidor que habla UDF no necesita ningún código de datafeed:</p>
<pre><code>{`import { udfFeed } from '@tradecanvas/chart'

const feed = udfFeed({ url: 'https://data.example.com/udf', updateFrequency: 10_000 })
await feed.ready()   // las temporalidades de su /config

new ChartWidget(el, { feed, symbol: 'AAPL', timeframe: '1d' })`}</code></pre>
<p>
  Lee <code>/config</code>, <code>/symbols</code>, <code>/search</code>, <code>/history</code> y
  <code>/quotes</code>. UDF no tiene push, así que las barras y cotizaciones en vivo se vuelven a pedir cada
  <code>updateFrequency</code> ms (10 s por defecto). Los <code>headers</code> se envían con cada petición.
</p>

<h2 id="mcp">Deja que un agente traduzca el resto</h2>
<p>El servidor MCP tiene tres herramientas para el cambio:</p>
<table>
  <thead><tr><th>Herramienta</th><th>Qué hace</th></tr></thead>
  <tbody>
    <tr>
      <td><code>migration_plan</code></td>
      <td>Los pasos en orden, qué buscar en el código de la app y qué herramienta traduce lo que encuentra cada búsqueda.</td>
    </tr>
    <tr>
      <td><code>migration_lookup</code></td>
      <td>
        En qué se convierte un nombre: una opción del widget, un featureset, una clave de override, un study, una forma
        de dibujo, un método del widget o del gráfico, un miembro del datafeed o del broker, o una resolución. Da la
        opción, el interruptor de función, la clave de estilo, el id del indicador (con sus valores por defecto y las
        claves de sus líneas), el tipo de dibujo (con sus puntos) o la llamada, y dice claramente cuándo no hay nada
        parecido y qué hacer en su lugar.
      </td>
    </tr>
    <tr>
      <td><code>convert_widget_options</code></td>
      <td>
        El objeto de opciones completo de <code>new TradingView.widget({'{'}...{'}'})</code>, featuresets y overrides
        incluidos, como opciones de <code>ChartWidget</code>; o las opciones de <code>createChart</code> de Lightweight
        Charts como opciones de <code>Chart</code>. También enumera las llamadas que hay que hacer una vez que existe el
        gráfico y lo que no tiene lugar, y comprueba el resultado como lo hace <code>validate_options</code>.
      </td>
    </tr>
  </tbody>
</table>
<p>
  Con el servidor conectado, pide el cambio al agente: llama primero a <code>migration_plan</code> y recorre la app a
  partir de ahí. La skill del agente tiene los mismos pasos para un agente sin el servidor.
</p>

<h2 id="differs">Qué cambia</h2>
<table>
  <thead><tr><th>TradingView</th><th>TradeCanvas</th></tr></thead>
  <tbody>
    <tr><td><code>new TradingView.widget({'{'} container: 'id' {'}'})</code>, <code>library_path</code></td><td><code>new ChartWidget(element, options)</code>; nada que alojar</td></tr>
    <tr><td><code>onChartReady(cb)</code></td><td>La opción <code>onReady</code>, o código después del constructor</td></tr>
    <tr><td><code>widget.activeChart().createStudy(...)</code></td><td><code>widget.getChart().addIndicator(id, params)</code>; los ids son cortos: <code>'rsi'</code>, <code>'bb'</code></td></tr>
    <tr><td><code>createShape({'{'} time, price {'}'}, {'{'} shape {'}'})</code>, tiempo en segundos</td><td><code>addDrawing({'{'} type, anchors: [{'{'} time, price {'}'}] {'}'})</code>, tiempo en milisegundos</td></tr>
    <tr><td>Una resolución: <code>'60'</code>, <code>'1D'</code>, <code>'W'</code></td><td>Una temporalidad: <code>'1h'</code>, <code>'1d'</code>, <code>'1w'</code> (<code>resolutionToTimeframe</code>, <code>timeframeToResolution</code>)</td></tr>
    <tr><td><code>disabled_features</code>, <code>enabled_features</code></td><td><code>features</code>: cada interruptor está activado salvo que se ponga a <code>false</code></td></tr>
    <tr><td><code>overrides</code>, <code>applyOverrides</code></td><td>Claves de estilo, en <code>chartOptions.overrides</code> o <code>chart.applyOverrides()</code>; estilos de línea por nombre</td></tr>
    <tr><td><code>save_load_adapter</code></td><td><code>layouts: {'{'} storage {'}'}</code> con un <code>LayoutStorage</code> (<code>list</code>, <code>load</code>, <code>save</code>, <code>remove</code>)</td></tr>
    <tr><td>Broker API, líneas de órdenes y de posiciones</td><td>Un <code>ExecutionAdapter</code>, <code>setOrders</code>, <code>setPositions</code> y los eventos de órdenes (<a href={href('/docs/trading')}>Trading</a>)</td></tr>
    <tr><td>Lightweight Charts: barras y marcadores en segundos</td><td>Milisegundos: <code>time * 1000</code></td></tr>
  </tbody>
</table>

<h2 id="not-carried">Qué no se traslada</h2>
<ul>
  <li>
    <strong>Gráficos guardados.</strong> Los diseños, dibujos y studies guardados en el formato de TradingView no se
    cargan: los usuarios empiezan diseños nuevos.
  </li>
  <li>
    <strong>Los indicadores personalizados</strong> escritos para <code>custom_indicators_getter</code> se reescriben
    como un <a href={href('/docs/plugins')}>plugin de indicador</a>, salvo que uno de los 134 integrados haga lo mismo.
  </li>
  <li>
    <strong>Algunas herramientas de dibujo y featuresets</strong> no tienen equivalente. <code>migration_lookup</code>
    dice cuáles y nombra la herramienta más cercana.
  </li>
  <li>
    <strong>Trading entre símbolos.</strong> Las órdenes y posiciones de un <code>ExecutionAdapter</code> son las del
    símbolo del gráfico; un gestor de cuentas sobre muchos símbolos y cuentas es cosa de la propia app.
  </li>
</ul>
<p>
  Las tablas están escritas a partir de la documentación pública de TradingView, leída en noviembre de 2026, y se
  comprueban contra los nombres propios de TradeCanvas en cada build. Un nombre que falta o está mal es un bug:
  repórtalo en GitHub.
</p>
