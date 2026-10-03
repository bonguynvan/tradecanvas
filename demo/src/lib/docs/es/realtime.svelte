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
  connect(config): void
  disconnect(): void
  getConnectionState(): ConnectionState
  fetchHistory(symbol, timeframe, limit?): Promise<OHLCBar[]>
  on(event, listener): void   // 'bar' | 'tick' | 'snapshot' | 'connectionChange' | 'error'
  off(event, listener): void
  dispose(): void
}`}</code></pre>

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

const agg = new TickAggregator('1m')
agg.processTick({ time, price, volume })

const current = agg.getCurrentBar()         // forming bar
const closed = agg.flushClosedBars()        // bars that have rolled over`}</code></pre>

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
chart.on('replayStep', (e) => e.payload)    // { barIndex, time, until }
chart.on('replayState', (e) => e.payload)   // { state: 'playing' | 'paused' | 'stopped' }
chart.replayStop()             // back to the live series`}</code></pre>

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
