<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Tiempo real y repetición — Documentación de TradeCanvas</title>
  <meta name="description" content="Adaptadores de datos en streaming, agregación de ticks, lógica de reconexión y el nuevo ReplayController para reproducir datos históricos." />
</svelte:head>

<h1>Tiempo real y repetición</h1>
<p>Transmite datos en vivo, agrega ticks en barras y repite datos históricos a una velocidad controlada.</p>

<h2>Adaptadores integrados</h2>
<p>Todos gratuitos y sin clave de API; se conectan todos de la misma forma:</p>
<pre><code>{`import { BinanceAdapter, CoinbaseAdapter, BybitAdapter, KrakenAdapter } from '@tradecanvas/chart'

chart.connect({ adapter: new BinanceAdapter(),  symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new BybitAdapter(),    symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new KrakenAdapter(),   symbol: 'BTC/USD', timeframe: '5m' })
chart.connect({ adapter: new CoinbaseAdapter(), symbol: 'BTC-USD', timeframe: '15m' })`}</code></pre>

<h2>Interfaz DataAdapter</h2>
<pre><code>{`interface DataAdapter {
  name: string
  supportedTimeframes?: TimeFrame[]   // left out: it serves every timeframe
  connect(config): void
  disconnect(): void
  getConnectionState(): ConnectionState
  fetchHistory(symbol, timeframe, limit?): Promise<OHLCBar[]>
  on(event, listener): void   // 'bar' | 'tick' | 'connectionChange' | 'error' | 'symbolInfo'
  off(event, listener): void
  dispose(): void

  // Optional
  fetchHistoryBefore?(symbol, timeframe, before, limit): Promise<OHLCBar[]>
  searchSymbols?(query, options?): Promise<SymbolInfo[]>
  resolveSymbol?(symbol): Promise<SymbolInfo | null>
  subscribeQuotes?(symbols, onQuotes): () => void      // a watchlist's rows
  fetchNews?(symbol, limit?): Promise<NewsItem[]>       // the symbol info panel
  fetchTrades?(symbol, limit?): Promise<Trade[]>        // tick charts, with
  subscribeTrades?(symbol, onTrades): () => void        // subscribeTrades
}`}</code></pre>

<h2 id="built-timeframes">Temporalidades que el feed no tiene</h2>
<p>
  Un feed que indica sus <code>supportedTimeframes</code> recibe las demás temporalidades construidas a
  partir de la más gruesa de ellas que las divide: 7m a partir de 1m, 4h y 1D a partir de 1h. Los días,
  las semanas, los meses y las temporalidades en horas que dividen un día (2h, 3h, 4h, 6h, 8h, 12h)
  empiezan a la medianoche de la bolsa del símbolo, en el <code>timeZone</code> que da su
  <code>resolveSymbol</code>. El gráfico pregunta una vez por símbolo, antes del primer historial de esa
  temporalidad, y conserva la zona; las de 1h o menos no la esperan. Un feed sin
  <code>resolveSymbol</code>, que no da zona o da UTC, o cuyas temporalidades no pueden alinearse con
  esa medianoche (solo barras de 4h para una zona a 7 horas de UTC) recibe días de UTC, como antes. Lo mismo ocurre con un feed que falla al responder o tarda
  más de 5 segundos, y los días del símbolo siguen entonces siendo de UTC hasta que el gráfico vuelve a cargar el símbolo desde cero (al conectarse a él, o al llegar a él desde otro símbolo o temporalidad), así que las páginas más
  antiguas y el historial tras una reconexión nunca tienen un día dos veces; esa carga nueva construye los días en la zona que el feed haya nombrado desde entonces, o vuelve a preguntarle. La zona del mercado
  (<code>setMarket</code>) no mueve estas barras. Las
  barras diarias con sello de las 00:00 UTC se leen como la fecha que indican. Una zona que el feed
  envíe después en un evento <code>symbolInfo</code> cambia las horas que se muestran, no dónde empiezan
  los días ya construidos.
</p>

<h2 id="symbol-info">Datos del símbolo que el feed conoce más tarde</h2>
<p>
  Un gráfico conectado llama a <code>resolveSymbol</code> una vez. Un feed que conoce los datos del símbolo solo más tarde (en su primer mensaje, por ejemplo) los envía con un evento <code>symbolInfo</code>, y el gráfico los aplica: los decimales del símbolo (<code>pricePrecision</code>) en la escala de precios, la leyenda y las etiquetas, y también en las etiquetas de los dibujos, los límites de precio del día, las etiquetas de los pivotes, la medición y el perfil de mercado; en el widget, en la ventana de datos, la lista de alertas, el ticket de orden y el panel de cuenta; las marcas de la escala en su paso de precio (<code>minTick</code>) y el horario de la bolsa. Los decimales de un mercado (<code>setMarket</code>) llegan a los mismos sitios y van antes que los del símbolo. Sin ninguno de los dos, la etiqueta de un dibujo conserva los decimales según el tamaño de su precio, agrupados en el locale numérico como en el eje.
</p>
<pre><code>{`emit('symbolInfo', { symbol: 'VNM', pricePrecision: 0, minTick: 10, currency: 'VND' })   // como tu adaptador envía sus otros eventos`}</code></pre>

<h2 id="corrections">Una barra que el feed corrige</h2>
<p>
  Un feed corrige una barra enviándola de nuevo, cerrada, con su propio tiempo: <code>{'{'} bar, closed: true {'}'}</code> desde <code>parseMessage</code>, o un evento <code>bar</code>. Una barra cerrada más antigua que la más reciente que ha visto el flujo es la última palabra del feed sobre ella, el cierre definitivo de un mercado llegado tras el primer fotograma de la barra siguiente o una revisión: el gráfico reemplaza la barra con ese tiempo esté donde esté (<code>updateBar</code>), calcula de nuevo sus indicadores desde ella y mantiene la vista. No es un precio en vivo: la línea de precio, las órdenes y las alertas siguen con el mercado. Un fotograma en formación más antiguo que la barra más reciente está desfasado y se descarta; no mueve nada. Los adaptadores incluidos (<code>WebSocketAdapter</code>, <code>PollingAdapter</code>, los feeds basados en ellos y <code>BinanceAdapter</code>) solo crean un tick a partir del cierre de una barra cuando es la más reciente; un adaptador propio que cree ticks a partir de sus barras también debería descartar las más antiguas. Sin adaptador, llama a <code>chart.updateBar(bar)</code>.
</p>
<p>
  Con <code>aggregateTicks</code>, la última barra del historial es la que las operaciones siguen construyendo: la primera operación tras conectar conserva su apertura, máximo, mínimo y volumen. Una operación de una barra ya pasada que llega tarde se descarta, y una barra cerrada para ella la corrige, mientras la barra en formación conserva sus operaciones. En una temporalidad construida a partir de otra más fina, una barra base corregida vuelve a construir su barra, para las dos últimas barras construidas antes de la que está en formación; una corrección más atrás se descarta.
</p>
<pre><code>{`// en un adaptador: el cierre definitivo de un mercado para una barra que ya está en el gráfico
parseMessage: (raw) => ({ bar: toBar(raw), closed: true })

// tus propias barras, sin adaptador
const corrected = chart.updateBar(bar)   // false: ninguna barra cargada tiene bar.time`}</code></pre>

<h2>Cualquier fuente de datos en ~20 líneas</h2>
<p>
  Extiende <code>WebSocketAdapter</code> (en vivo + historial por REST) o
  <code>PollingAdapter</code> (fuentes solo REST). La clase base se encarga del
  ciclo de vida de la conexión, la reconexión, la decodificación y la emisión de
  eventos; tú solo aportas una URL y una función de análisis.
</p>
<pre><code>{`import { WebSocketAdapter } from '@tradecanvas/chart'

const myAdapter = new WebSocketAdapter({
  name: 'myexchange',
  wsUrl: (c) => 'wss://api.myexchange.com/ws/' + c.symbol + '@kline_' + c.timeframe,
  fetchHistory: (symbol, tf, limit) => fetch('/candles?...').then((r) => r.json()),
  parseMessage: (raw) => ({ bar: toBar(raw), closed: raw.k.x }),
})`}</code></pre>

<h2>Agregación de ticks</h2>
<p>Agrupa los ticks sin procesar en barras OHLC para cada temporalidad:</p>
<pre><code>{`import { TickAggregator } from '@tradecanvas/chart'

const agg = new TickAggregator('1d')
agg.setTimeZone('Asia/Ho_Chi_Minh')         // days start at the exchange's midnight
agg.seed(history.at(-1).time)               // a bar older than the history's last is past
agg.on('barClose', (bar) => console.log(bar))   // a bar whose interval is over
agg.on('correction', (bar) => console.log(bar)) // a closed bar older than the newest
agg.processTick({ time, price, volume })

const current = agg.getCurrentBar()         // forming bar`}</code></pre>
<p>Las semanas empiezan el lunes y los meses el día 1. Con <code>setTimeZone</code>, los días, las semanas, los meses y las temporalidades en horas que dividen un día empiezan a la medianoche de la bolsa; un gráfico lo fija para los ticks de su stream (<code>aggregateTicks</code>) según la zona del símbolo, o si no la de su mercado, y hace coincidir sus barras con las del historial: sella los días a las 00:00 UTC cuando el historial lo hace, y las barras de 2h a 12h empiezan a la medianoche de la bolsa solo cuando las del historial empiezan ahí, así que las barras de 4h propias del feed (00:00, 04:00… UTC) conservan su hora. En una temporalidad construida a partir de otra más fina del feed, empiezan donde empiezan las barras construidas: a la medianoche de la zona que nombró su <code>resolveSymbol</code>, o si no a la de UTC, sea cual sea la zona del gráfico.</p>
<p>Una barra más antigua que la más reciente vista ya ha pasado: <code>processBar</code> envía una cerrada como <code>correction</code> y descarta un fotograma en formación, y <code>processTick</code> descarta una operación de ella, así que un fotograma o una operación con retraso no pueden cerrar antes de tiempo la barra en formación ni mover el precio. <code>seed(time)</code> parte de la última barra de un historial y nunca retrocede, y <code>resume(bar)</code> hace de esa barra, aún en formación, la que las siguientes operaciones siguen construyendo, salvo que las operaciones ya hayan llegado a una más reciente; el flujo de un gráfico hace ambas cosas en cada conexión, así que una reconexión cuyo historial acaba en la barra anterior conserva las operaciones de la barra en formación. <code>StreamManager</code> envía una corrección como <code>barCorrection</code>.</p>

<h2>Cotizaciones de muchos símbolos</h2>
<p>
  Una fuente con <code>subscribeQuotes</code> envía cotizaciones (último precio, variación del día, máximo, mínimo,
  volumen, compra y venta) de muchos símbolos a la vez hasta que la detienes. <code>BinanceAdapter</code> envía
  una instantánea de 24 h y luego su flujo mini-ticker; <code>MockAdapter</code> se inventa las cotizaciones. La
  lista de seguimiento de un widget llena sus filas con ellas.
</p>
<pre><code>{`const stop = new BinanceAdapter().subscribeQuotes(['BTCUSDT', 'ETHUSDT'], (quotes) => {
  for (const q of quotes) console.log(q.symbol, q.last, q.changePercent)
})
stop()

readQuote({ symbol: 'AAPL', last: 190, prevClose: 188 })   // → change 2, changePercent 1.06`}</code></pre>

<h2>Gráficos de ticks</h2>
<p>
  Una temporalidad de ticks — <code>'100T'</code> — dibuja una barra cada 100 operaciones. Se construye con las
  operaciones de la fuente: las recientes para el historial (<code>fetchTrades</code>) y después las que llegan en vivo
  (<code>subscribeTrades</code>). <code>BinanceAdapter</code> transmite operaciones agregadas. Un gráfico de ticks no
  tiene cuenta atrás ni carga historial más antiguo; una fuente sin operaciones rechaza las temporalidades de ticks.
  Las barras de ticks no están espaciadas por igual en el tiempo, así que el eje de tiempo y la cruz solo dan hora
  a las barras, no al espacio vacío a su lado.
</p>
<pre><code>{`chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '100T' })
await chart.setTimeframe('500T')

// Your own trades into tick bars
const builder = new TickBarBuilder(100)
builder.push([{ time, price, volume }])   // → [{ bar, closed }]`}</code></pre>

<h2>Estado del mercado y noticias</h2>
<p>
  <code>marketStatus(info, now)</code> indica si el mercado de un símbolo está abierto en un momento dado, a partir de su
  horario en la zona de su bolsa (con los cambios de hora incluidos), y cuándo cambia eso. Las sesiones pueden indicar los
  días de la semana en que abren. El <code>fetchNews</code> de una fuente da titulares para el panel de información del
  símbolo del widget; <code>readNews</code> solo conserva los elementos con título y hora, y solo los enlaces a páginas web.
</p>
<pre><code>{`const info = {
  symbol: 'AAPL',
  timeZone: 'America/New_York',
  sessions: [{ start: '09:30', end: '16:00', days: [1, 2, 3, 4, 5] }],
}
marketStatus(info, Date.now())   // { state: 'closed', next: <next open, ms> } · 'open' · 'always' (24/7)`}</code></pre>

<h2>Reconexión</h2>
<p><code>ReconnectManager</code> gestiona un retroceso exponencial con un límite y una renuncia final.</p>
<pre><code>{`import { ReconnectManager } from '@tradecanvas/chart'

const rm = new ReconnectManager({ maxRetries: 6, baseDelay: 500, maxDelay: 30_000 })

rm.start()
rm.schedule(() => connectWebsocket())   // call on disconnect; backs off automatically
rm.onConnected()                        // call on a successful connect to reset`}</code></pre>

<h2>Modo de repetición</h2>
<p>
  Hace avanzar una <code>DataSeries</code> histórica a una velocidad controlada.
  Está desacoplado de <code>Chart</code>, así que sirve tanto para la repetición
  en la interfaz como para backtests sin interfaz.
</p>

<pre><code>{`import { ReplayController } from '@tradecanvas/chart'

const replay = new ReplayController({
  data: historicalBars,
  speed: 10,      // bars per second
  startIndex: 0,
})

// Seed the chart with everything before startIndex
chart.setData(replay.getPrefix())

// Wire each emitted bar into the chart
replay.on('bar', ({ bar }) => chart.appendBar(bar))
replay.on('finished', () => console.log('done'))

replay.start()
// replay.pause(); replay.resume(); replay.step(5); replay.seek(200); replay.setSpeed(20)
`}</code></pre>

<p>
  En el modo de repetición del widget, <strong>haz clic en cualquier barra ya
  mostrada para llevar ahí el cursor de la repetición</strong>. De forma más
  general, el gráfico emite ahora los eventos <code>click</code> y
  <code>barClick</code> con los clics izquierdos simples (pulsar y soltar sin
  arrastrar):
</p>
<pre><code>{`chart.on('barClick', (e) => {
  const { bar, barIndex, point } = e.payload
})`}</code></pre>

<h3>Repetición en el gráfico, en pasos más finos</h3>
<p>
  <code>chart.replayStart()</code> repite la propia serie del gráfico. Pásale barras más
  finas como <code>steps</code> (barras de 5 minutos bajo un gráfico horario) y cada paso
  hace crecer con ellas la barra en formación, tal como creció en el mercado; las barras
  cerradas se muestran tal como están en la serie. <code>startIndex</code> y
  <code>replaySeekToBar</code> cuentan las barras del gráfico. En ChartWidget, el menú
  <strong>Paso</strong> de la barra de repetición ofrece los intervalos más finos que tiene
  la fuente (o que se pueden construir con las barras que cargaste).
</p>
<pre><code>{`const steps = await adapter.fetchHistory('BTCUSDT', '5m', 2000)
chart.replayStart({ steps, startIndex: 120, paused: true, speed: 5 })
chart.replayResume()
chart.getReplayBarIndex()      // the chart bar forming now
chart.replaySeekToBar(150)     // to the end of bar 150
chart.replaySeekToTime(t)      // to the bars that opened before t
chart.on('replayStep', (e) => e.payload)    // { barIndex, time, until, total }
chart.on('replayComplete', (e) => e.payload) // { barIndex, time }
chart.on('replayState', (e) => e.payload)   // { state: 'playing' | 'paused' | 'stopped' }
chart.replayStop()             // back to the live series`}</code></pre>

<h3>Una repetición en tu propia app</h3>
<p>
  Las marcas de compra y venta y las zonas de operación aparecen cuando la repetición llega a ellas: una marca cuando se muestra su vela, una operación cuando se entra, dibujada abierta hasta que se llega a su salida (<code>revealMarks: false</code>, ChartWidget: <code>replayRevealMarks: false</code> las muestra todas). <code>startTime</code> empieza en un momento en lugar de en una vela; <code>hideHistory</code> deja fuera las velas anteriores al inicio hasta que la repetición se detiene; <code>duration</code> llega al final en más o menos ese tiempo, haya las velas que haya, varias por fotograma, y un fotograma tardío la frena en lugar de saltar.
</p>
<pre><code>{`chart.setSignalMarkers(signals)          // todo el backtest, se conserva
chart.setTradeZones(trades)
chart.replayStart({
  startTime: Date.now() - 30 * 86_400_000,   // los últimos 30 días
  hideHistory: true,                          // solo ellos en el gráfico
  duration: 3500,                             // en unos 3,5 s
})
chart.on('replayComplete', () => chart.replayStop())   // y luego la serie completa
chart.replayStart({ startIndex: 100, revealMarks: false })   // todas las marcas desde el inicio`}</code></pre>

<h3>Trading simulado en una repetición</h3>
<p>
  Un adaptador de ejecución con <code>setMarkPrice(price, time)</code> (como
  <code>PaperExecutionAdapter</code>) opera sobre la repetición: durante una repetición, el
  gráfico le pasa cada precio y hora repetidos, así que las órdenes y los stops se ejecutan
  cuando la repetición pasa por ellos y las ejecuciones quedan sobre las barras repetidas.
  Cuentan el mínimo y el máximo de cada paso, y un salto hacia delante pasa por todos los
  pasos intermedios. Solo avanza: tras un salto hacia atrás, espera a que la repetición
  supere el punto más lejano que ha visto. Mientras tanto, el precio en vivo no lo mueve;
  cuando termina la repetición vuelve al precio en vivo, y las ejecuciones, a la hora real.
  Las alertas de precio siguen vigilando el mercado en vivo todo el tiempo; las alertas
  sobre líneas de indicador esperan a que termine la repetición.
</p>
<pre><code>{`chart.connectExecution(new PaperExecutionAdapter())
chart.replayStart({ startIndex: 300, paused: true })
// place orders from the chart or the order ticket, then play`}</code></pre>

<h3>API</h3>
<table>
  <thead><tr><th>Método</th><th>Función</th></tr></thead>
  <tbody>
    <tr><td><code>start()</code></td><td>Empieza a emitir desde el índice actual.</td></tr>
    <tr><td><code>pause()</code> / <code>resume()</code></td><td>Pausa/reanuda el temporizador.</td></tr>
    <tr><td><code>step(n)</code></td><td>Emite N barras de forma síncrona, sin el temporizador.</td></tr>
    <tr><td><code>seek(index)</code></td><td>Salta sin emitir las barras intermedias.</td></tr>
    <tr><td><code>setSpeed(bps)</code></td><td>Barras por segundo (con un mínimo de 0.01).</td></tr>
    <tr><td><code>destroy()</code></td><td>Elimina el temporizador y los listeners.</td></tr>
  </tbody>
</table>

<p>Consulta <a href={href('/docs/analytics')}>Análisis</a> para usar la repetición junto con el backtester.</p>
