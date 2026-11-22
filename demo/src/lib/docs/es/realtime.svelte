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
<pre><code>{`import { BinanceAdapter, CoinbaseAdapter, BybitAdapter, KrakenAdapter, UpbitAdapter } from '@tradecanvas/chart'

chart.connect({ adapter: new BinanceAdapter(),  symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new BybitAdapter(),    symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new KrakenAdapter(),   symbol: 'BTC/USD', timeframe: '5m' })
chart.connect({ adapter: new CoinbaseAdapter(), symbol: 'BTC-USD', timeframe: '15m' })
chart.connect({ adapter: new UpbitAdapter(),   symbol: 'KRW-BTC', timeframe: '1m' })`}</code></pre>
<p>
  <code>UpbitAdapter</code> usa los mercados de Upbit (<code>KRW-BTC</code>, <code>BTC-ETH</code>):
  las velas llegan en streaming hasta 4 horas, el día sale del ticker y las barras más largas
  se construyen con días. Su API REST da 200 velas por llamada y permite a un navegador una
  llamada cada diez segundos, así que una página web pasa <code>restBase</code> apuntando a
  un proxy propio. Los datos son de Upbit, bajo los términos de su Open API.
  <code>MARKET_UPBIT_KRW</code> da los pasos y colores del mercado KRW.
</p>

<h2 id="data-feed">Un feed del que tira el gráfico</h2>
<p>
  Un <code>DataFeed</code> es la forma más corta de conectar tus datos: dos métodos, con Promises.
  El gráfico pide barras (<code>getBars</code>) y se suscribe a las de en vivo (<code>subscribeBars</code>);
  pagina hacia atrás, se reconecta, construye las temporalidades que le faltan al feed y se suscribe de nuevo
  al cambiar, así que el feed solo responde. Pásalo a <code>connect</code> o a la opción <code>feed</code>
  de un widget, donde iría un adaptador.
</p>
<pre><code>{`import type { DataFeed } from '@tradecanvas/chart'

const feed: DataFeed = {
  name: 'my-api',
  // Las countBack barras más recientes, o las anteriores a \`before\` cuando el gráfico pagina hacia atrás.
  // Un array vacío: no hay más.
  getBars: ({ symbol, timeframe, countBack, before, signal }) =>
    fetch(\`/candles?s=\${symbol}&tf=\${timeframe}&n=\${countBack}&before=\${before ?? ''}\`, { signal })
      .then((r) => r.json()),
  subscribeBars: ({ symbol, timeframe }, on) => {
    const ws = new WebSocket(\`wss://example.com/\${symbol}/\${timeframe}\`)
    ws.onmessage = (m) => {
      const k = JSON.parse(m.data)
      on.bar(k.bar, k.closed)   // de nuevo la barra en formación, una nueva, o sus valores definitivos
    }
    ws.onclose = () => on.connection('disconnected')   // el gráfico carga y se suscribe de nuevo
    return () => ws.close()
  },
}

chart.connect({ feed, symbol: 'AAPL', timeframe: '1d' })
new ChartWidget(el, { feed, symbol: 'AAPL' })`}</code></pre>
<p>
  El suscriptor también recibe <code>tick</code> (operaciones y cotizaciones), <code>connection</code>
  (un feed que nunca lo llama se da por conectado en cuanto <code>subscribeBars</code> devuelve),
  <code>symbolInfo</code> y <code>error</code>. La <code>signal</code> se aborta cuando el gráfico ya no necesita
  la respuesta: un cambio de símbolo o una desconexión. Lo que una suscripción envía después de cancelarse se
  descarta, así que un socket que se cierra tarde no puede poner las barras del símbolo anterior en el nuevo.
  Los métodos opcionales son los de un adaptador: <code>supportedTimeframes</code>,
  <code>resolveSymbol</code>, <code>searchSymbols</code>, <code>subscribeQuotes</code>,
  <code>fetchNews</code>, <code>fetchTrades</code> y <code>subscribeTrades</code>. Un feed que solo tiene las barras más recientes pone <code>pagesBack: false</code>, y el gráfico no le pide barras anteriores. El gráfico no toma un feed callado por uno caído (un gráfico diario, un mercado cerrado): un feed cuyo socket puede cortarse sin aviso lo informa con <code>connection</code>.
</p>
<p>
  Un feed sirve a cualquier número de gráficos: cada uno se suscribe por su cuenta, así que una cuadrícula
  toma un solo feed para todos sus gráficos (<code>widget: {'{'} feed {'}'}</code> en <code>ChartWidgetGrid</code>,
  <code>grid.connectAll(feed, symbols, '1h')</code>), donde toma un adaptador por gráfico. Los adaptadores siguen
  funcionando en todas partes, y uno se convierte en el otro: <code>feedFromAdapter(new BinanceAdapter())</code>
  es un feed y <code>adapterFromFeed(feed)</code> un adaptador. Un <code>connect</code> con un adaptador y un feed a la vez lanza un error.
</p>

<h3 id="manual-feed">Barras que empujas tú: ManualFeed</h3>
<p>
  Para las barras que tu aplicación ya tiene, <code>ManualFeed</code> guarda el historial de cada símbolo y
  temporalidad y envía las barras que empujas a los gráficos suscritos a esa serie. Las cargas posteriores (una
  reconexión, volver a cambiar) las incluyen, así que las barras tienen un solo escritor, el feed, en lugar de
  llamadas a <code>setData</code> y <code>appendBar</code> junto a un stream. Una barra empujada más antigua que
  la más reciente da los valores definitivos de la barra de su hora; una para la que la serie no tiene barra lanza un error.
</p>
<pre><code>{`import { ManualFeed } from '@tradecanvas/chart'

const feed = new ManualFeed()
feed.setBars('AAPL', '1d', history)
chart.connect({ feed, symbol: 'AAPL', timeframe: '1d' })

feed.pushBar('AAPL', '1d', formingBar)        // una y otra vez mientras se forma
feed.pushBar('AAPL', '1d', finalBar, true)    // cerrada`}</code></pre>

<h2>Interfaz DataAdapter</h2>
<pre><code>{`interface DataAdapter {
  name: string
  supportedTimeframes?: TimeFrame[]   // left out: it serves every timeframe
  connect(config): void
  disconnect(): void
  getConnectionState(): ConnectionState
  fetchHistory(symbol, timeframe, limit?): Promise<OHLCBar[]>
  on(event, listener): void   // 'bar' | 'barClose' | 'tick' | 'snapshot' | 'connectionChange' | 'error' | 'symbolInfo'
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
<p>
  <code>searchSymbols</code> y <code>resolveSymbol</code> responden con <code>SymbolInfo</code>: el <code>symbol</code>, y
  lo que el feed sepa del resto: un nombre legible (<code>description</code>), el <code>exchange</code>, el
  <code>type</code> con las palabras del propio feed (<code>'stock'</code>, <code>'futures'</code>, <code>'Cổ phiếu'</code>…),
  un <code>logo</code> que muestra la búsqueda de símbolos del widget, <code>pricePrecision</code>, <code>minTick</code>,
  <code>currency</code>, <code>timeZone</code> y <code>sessions</code>. Un feed cuyos precios van por detrás del mercado dice cuánto en <code>delayMinutes</code> (15 en los datos gratuitos de la mayoría de las bolsas): la barra de estado del widget muestra entonces "Retraso de 15 min" en lugar de "En vivo", con un punto propio.
</p>

<h2 id="built-timeframes">Temporalidades que el feed no tiene</h2>
<p>
  Un feed que indica sus <code>supportedTimeframes</code> recibe las demás temporalidades construidas a
  partir de la más gruesa de ellas que las divide: 7m a partir de 1m, 4h y 1D a partir de 1h. Los días,
  las semanas, los meses y las temporalidades en horas que dividen un día (2h, 3h, 4h, 6h, 8h, 12h)
  empiezan a la medianoche de la bolsa del símbolo, en el <code>timeZone</code> que da su
  <code>resolveSymbol</code>. El gráfico pregunta una vez por símbolo, mientras pide el primer historial de esa
  temporalidad, construye ese historial cuando llega la respuesta y conserva la zona; las de 1h o menos
  no la esperan. Una zona cuyos días necesitan una temporalidad más fina que los de UTC (los de Ciudad Ho
  Chi Minh en un feed de barras de 4h) hace pedir ese historial otra vez en ella. Un feed sin
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
  Un gráfico conectado llama a <code>resolveSymbol</code> una vez. Un feed que conoce los datos del símbolo solo más tarde (en su primer mensaje, por ejemplo) los envía con un evento <code>symbolInfo</code>, y el gráfico los aplica: los decimales del símbolo (<code>pricePrecision</code>) en la escala de precios, la leyenda y las etiquetas, y también en las etiquetas de los dibujos, los límites de precio del día, las etiquetas de los pivotes, la medición y el perfil de mercado; en el widget, en la ventana de datos, la lista de alertas, el ticket de orden y el panel de cuenta; las marcas de la escala en su paso de precio (<code>minTick</code>) y el horario de la bolsa. Los decimales de un mercado (<code>setMarket</code>) llegan a los mismos sitios y van antes que los del símbolo. Sin ninguno de los dos, la etiqueta de un dibujo conserva los decimales según el tamaño de su precio, agrupados en el locale numérico como en el eje. La lista de seguimiento del widget escribe cada símbolo con el <code>pricePrecision</code> que da su entrada en <code>symbols</code>, y sin él según el tamaño de su precio: dos decimales desde 1.000, cuatro desde 1 y cuatro cifras significativas por debajo de 1, por pequeño que sea.
</p>
<pre><code>{`emit('symbolInfo', { symbol: 'VNM', pricePrecision: 0, minTick: 10, currency: 'VND' })   // como tu adaptador envía sus otros eventos`}</code></pre>

<h2 id="corrections">Una barra que el feed corrige</h2>
<p>
  Un feed corrige una barra enviándola de nuevo, cerrada, con su propio tiempo: <code>{'{'} bar, closed: true {'}'}</code> desde <code>parseMessage</code>, o un evento <code>bar</code>. Una barra cerrada más antigua que la más reciente que ha visto el flujo es la última palabra del feed sobre ella, el cierre definitivo de un mercado llegado tras el primer fotograma de la barra siguiente o una revisión: el gráfico reemplaza la barra con ese tiempo esté donde esté (<code>updateBar</code>), calcula de nuevo sus indicadores desde ella y mantiene la vista. No es un precio en vivo: la línea de precio, las órdenes y las alertas siguen con el mercado. Un fotograma en formación más antiguo que la barra más reciente está desfasado y se descarta; no mueve nada. Los adaptadores incluidos (<code>WebSocketAdapter</code>, <code>PollingAdapter</code>, los feeds basados en ellos y <code>BinanceAdapter</code>) solo crean un tick a partir del cierre de una barra cuando es la más reciente, contando la última barra del historial que sirvieron, así que la última barra cerrada que una fuente reenvía al suscribirse no crea ninguno; un adaptador propio que cree ticks a partir de sus barras también debería descartar las más antiguas. Sin adaptador, llama a <code>chart.updateBar(bar)</code>.
</p>
<p>
  Con <code>aggregateTicks</code>, la última barra del historial es la que las operaciones siguen construyendo: la primera operación tras conectar conserva su apertura, máximo, mínimo y volumen. Una operación de una barra ya pasada que llega tarde se descarta, y una barra cerrada para ella la corrige, mientras la barra en formación conserva sus operaciones. Una operación posterior al inicio de la barra más reciente entra en esa barra aunque los intervalos la hagan empezar antes (barras diarias selladas a otra hora que la medianoche, o un símbolo cuya zona llega después de la primera operación), así que el precio sigue cada operación. En una temporalidad construida a partir de otra más fina, una barra base corregida vuelve a construir su barra, para las dos últimas barras construidas antes de la que está en formación; una corrección más atrás se descarta.
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
<p>Las semanas empiezan el lunes y los meses el día 1. Con <code>setTimeZone</code>, los días, las semanas, los meses y las temporalidades en horas que dividen un día empiezan a la medianoche de la bolsa; un gráfico lo fija para los ticks de su stream (<code>aggregateTicks</code>) según la zona del símbolo, o si no la de su mercado, y hace coincidir sus barras con las del historial: sella los días a las 00:00 UTC cuando el historial lo hace, y las barras de 2h a 12h empiezan a la medianoche de la bolsa solo cuando las del historial empiezan ahí, así que las barras de 4h propias del feed (00:00, 04:00… UTC) conservan su hora. En una temporalidad construida a partir de otra más fina del feed, empiezan donde empiezan las barras construidas. Construidas a partir de horas, empiezan a la medianoche de la zona que nombró su <code>resolveSymbol</code>, o si no a la de UTC, sea cual sea la zona del gráfico; construidas a partir de los días del feed sellados a las 00:00 UTC, las semanas y los meses conservan sus fechas, y una operación se fecha en la zona que nombró, o si no en la del gráfico, como en los días propios del feed.</p>
<p>Una barra más antigua que la más reciente vista ya ha pasado: <code>processBar</code> envía una cerrada como <code>correction</code> y descarta un fotograma en formación, y <code>processTick</code> descarta una operación de ella, así que un fotograma o una operación con retraso no pueden cerrar antes de tiempo la barra en formación ni mover el precio. <code>seed(time)</code> parte de la última barra de un historial y no retrocede (salvo que las operaciones hayan construido la barra más reciente con intervalos con los que ya no empiezan, porque la zona horaria de la bolsa llegó después: esa barra se abandona, o las siguientes operaciones se descartarían hasta el siguiente intervalo), y <code>resume(bar)</code> hace de esa barra, aún en formación, la que las siguientes operaciones siguen construyendo, salvo que las operaciones ya hayan llegado a una más reciente; el flujo de un gráfico hace ambas cosas en cada conexión, así que una reconexión cuyo historial acaba en la barra anterior conserva las operaciones de la barra en formación. <code>StreamManager</code> pone entonces la barra en formación, construida con operaciones o con los fotogramas de la fuente, encima del historial que envía como <code>snapshot</code>, y no envía <code>priceChange</code> con el cierre de la última barra del historial, un precio más antiguo. Envía una corrección como <code>barCorrection</code>.</p>

<h2>Cotizaciones de muchos símbolos</h2>
<p>
  Una fuente con <code>subscribeQuotes</code> envía cotizaciones (último precio, variación del día, máximo, mínimo,
  volumen, compra y venta) de muchos símbolos a la vez hasta que la detienes. <code>BinanceAdapter</code> envía
  una instantánea de 24 h y luego su flujo mini-ticker; <code>MockAdapter</code> se inventa las cotizaciones. La
  lista de seguimiento de un widget llena sus filas con ellas. Sin cotización, la fila del propio símbolo del
  gráfico lee su precio y la variación del día de las barras del gráfico, como hace el panel de información del
  símbolo: frente al cierre anterior al último día, en la zona horaria de la bolsa, y sin variación cuando las barras
  no tienen ningún día antes de ese.
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

<h2 id="order-flow">Quién tomó las operaciones</h2>
<p>
  Un feed puede decir qué lado tomó cada operación, el que cruzó el spread: <code>side</code> en una
  operación (<code>'buy'</code> cuando el comprador tomó el ask, <code>'sell'</code> cuando el vendedor
  golpeó el bid) y <code>buyVolume</code> en una barra, la parte de su <code>volume</code> que tomaron
  los compradores. Ambos son opcionales. Con <code>buyVolume</code> una barra tiene un delta, lo comprado
  menos lo vendido: <code>barDelta(bar)</code> lo da, o <code>null</code> para una barra que no lo dice, y
  el indicador Volume Delta (<code>voldelta</code>) lo dibuja, con su suma acumulada, en lugar de su
  estimación. <code>BinanceAdapter</code> rellena ambos, a partir del volumen de compra taker del exchange
  y de sus operaciones agregadas; <code>MockAdapter</code> los inventa.
</p>
<pre><code>{`chart.setData([{ time, open, high, low, close, volume: 1200, buyVolume: 700 }])
chart.addIndicator('voldelta', { mode: 1, anchor: 'session' })   // the cumulative delta, from each session's start

barDelta({ volume: 1200, buyVolume: 700 })   // 200: 700 bought, 500 sold`}</code></pre>
<p>
  El gráfico lleva <code>buyVolume</code> allí donde lleva el volumen. Las barras hechas de otras barras
  (<code>resampleBars</code>, una temporalidad que el feed no tiene) lo suman; las barras de ticks, y las
  agregadas a partir de ticks, lo cuentan de las operaciones que dicen su <code>side</code>; una barra en
  replay lo tiene al paso de su volumen; las exportaciones CSV y JSON lo escriben en una columna propia
  (<code>Buy Volume</code>), que la importación vuelve a leer. Una barra con una parte que no lo dice no
  lo tiene: medio reparto no es un reparto.
</p>
<p>
  Tres cosas a saber. Una operación enviada con <code>chart.updateLastBarFromTick</code> también cuenta
  cuando lleva su <code>side</code>; una con volumen y sin side deja la barra en formación sin
  <code>buyVolume</code>. Renko, Kagi, line break, punto y figura y las barras de rango son barras
  dibujadas, no las del feed: los indicadores de esos gráficos leen las barras dibujadas, que no tienen
  reparto, así que allí el delta es la estimación. Y cuando solo algunas barras de una serie lo dicen, el
  delta acumulado suma deltas reales con estimaciones, cada una de las cuales es todo el volumen de una
  barra: da un escalón donde se encuentran. Los puentes JS API y UDF no tienen un campo para ello.
</p>

<h2 id="footprint">El gráfico footprint</h2>
<p>
  <code>chartType: 'footprint'</code> dibuja, junto a cada barra, lo que se negoció en cada precio dentro de
  ella: a la izquierda lo que los vendedores tomaron en el bid, a la derecha lo que los compradores tomaron en el
  ask. Una fila en la que un lado superó al otro va en negrita sobre un tinte más fuerte, la fila más negociada
  lleva una línea alrededor, y una vela delgada se alza a la izquierda de cada barra. En el widget es Footprint
  en el menú de tipos de gráfico, con su configuración en Chart Settings.
</p>
<pre><code>{`const chart = new Chart(el, { chartType: 'footprint' })
await chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '1m' })`}</code></pre>
<p>
  Eso es todo lo que necesita un feed con operaciones (<code>fetchTrades</code> y <code>subscribeTrades</code>,
  como tienen <code>BinanceAdapter</code> y <code>MockAdapter</code>): mientras el gráfico muestra un footprint
  pide al feed sus operaciones recientes, mil de ellas, y sigue las que llegan en vivo, y se detiene cuando cambia
  el tipo de gráfico. Un feed conserva pocas operaciones, así que al principio solo las barras más nuevas tienen
  footprint: la barra en la que las operaciones recientes empezaron a medias se deja fuera, las barras anteriores
  son velas delgadas, y desde ahí el footprint crece con las operaciones en vivo. Otro símbolo u otro marco
  temporal lo empieza de nuevo.
</p>
<p>
  Un host con operaciones propias las da con <code>chart.addTrades(trades)</code>, en cualquier tipo de
  gráfico: cada una se cuenta en la barra de su tiempo y en la fila de su precio, en el lado que la tomó. Una
  operación sin <code>side</code> se deduce de la operación anterior (comprada cuando el precio subió hasta ella,
  vendida cuando bajó): una estimación, como lo es el delta de una barra sin <code>buyVolume</code>. Un host que
  guarda las filas da esas, barra por barra, y <code>footprintOf</code> las crea a partir de operaciones en una
  sola llamada.
</p>
<pre><code>{`import { footprintOf, footprintStats } from '@tradecanvas/chart'

chart.setChartTypeOptions({ footprint: { rowSize: 0.5, collect: false } })   // las filas son del host
chart.setFootprint([
  { time: bar.time, levels: [{ price: 100, buy: 12, sell: 30 }, { price: 100.5, buy: 41, sell: 9 }] },
])
chart.setFootprint(footprintOf(trades, '1m', 0.5))    // o creadas a partir de operaciones

const rows = chart.getFootprint(bar.time)             // { time, levels }, o null para una barra sin ninguno
if (rows) footprintStats(rows.levels)                 // { buy, sell, volume, delta, poc, … }
chart.clearFootprint()                                // antes de las filas de otra serie`}</code></pre>
<table>
  <thead><tr><th>Ajuste</th><th>Por defecto</th><th>Qué hace</th></tr></thead>
  <tbody>
    <tr><td><code>rowSize</code></td><td><code>'auto'</code></td><td>La altura de una fila en precio. Auto es aproximadamente una diezmilésima del último precio, redondeada a 1, 2 o 5 (5 en 60.000), en pasos enteros del paso de precio del símbolo; con filas dadas a mano, el paso más pequeño entre sus precios. Otro tamaño empieza el footprint de nuevo.</td></tr>
    <tr><td><code>cells</code></td><td><code>'bidAsk'</code></td><td><code>'bidAsk'</code>: los dos lados por separado. <code>'delta'</code>: lo comprado menos lo vendido. <code>'volume'</code>: ambos juntos.</td></tr>
    <tr><td><code>imbalance</code></td><td><code>3</code></td><td>Cuántas veces un lado tiene que superar al otro, a una fila de distancia, para quedar marcado: lo comprado en un precio frente a lo vendido una fila más abajo, y lo vendido frente a lo comprado una fila más arriba. 0 no marca ninguna.</td></tr>
    <tr><td><code>collect</code></td><td><code>true</code></td><td>false: el gráfico no pide operaciones a su feed.</td></tr>
  </tbody>
</table>
<p>
  El zoom decide qué lleva una barra. Elegir el footprint acerca el zoom hasta donde los números se leen, y
  sus barras pueden hacerse mucho más anchas que las velas; al alejar, los números dan paso a una barra por cada
  lado, y luego a velas normales. Las filas demasiado finas para leerse se dibujan de 2, 5, 10… en una, en precios
  redondos. El footprint se conserva para las 500 barras más nuevas y no se guarda con el estado del gráfico.
  Durante un replay, las barras aún no mostradas no llevan celdas, ni tampoco una que aún se forma a
  partir de barras más finas. En un gráfico de ticks, una operación se cuenta en la última barra que se
  había abierto cuando llegó, así que la primera operación de una barra puede caer en la anterior. Se dibuja en Canvas 2D, también con el
  renderizador WebGL. <code>renderPriceChart</code> lo dibuja a partir de <code>footprint</code>, las filas tal
  como las da <code>chart.getFootprint()</code>.
</p>

<h2 id="tape">La cinta, y las operaciones mismas</h2>
<p>
  <code>chart.followTrades()</code> sigue las operaciones del símbolo del gráfico hasta que se llama a la
  función que devuelve: las operaciones recientes del feed y después las que llegan en vivo, como eventos
  <code>trades</code>. Al feed se le pide una sola vez sea cual sea el número de seguidores, y un gráfico que
  muestra un footprint las sigue por sí mismo. Las operaciones dadas con <code>chart.addTrades()</code> se
  comunican del mismo modo. Ninguna operación del feed se comunica dos veces: ni en otro marco temporal del
  símbolo, ni tras una reconexión, cuando solo se comunican las que se perdieron.
</p>
<pre><code>{`const stop = chart.followTrades()
chart.on('trades', (e) => {
  // e.payload.trades: de la más antigua a la más nueva
  // e.payload.recent: las operaciones recientes del feed, no operaciones hechas ahora mismo
  for (const trade of e.payload.trades) log(trade.time, trade.price, trade.volume, trade.side)
})
stop()   // el feed se suelta cuando nadie lo sigue y el gráfico no es un footprint`}</code></pre>
<p>
  En el widget, <code>tape: true</code> añade la cinta (time and sales) al dock: las operaciones más nuevas
  arriba, cada una con su hora, su precio y su tamaño, el precio en el color de quien la tomó. Una barra sobre
  la lista dice cuánto de las filas tomaron los compradores y cuánto los vendedores, una operación de diez veces
  el tamaño habitual destaca, y las operaciones por debajo de un tamaño mínimo pueden dejarse fuera
  (<code>{`tape: { minSize: 0.5 }`}</code>, o escrito en el panel). El widget sigue las operaciones del feed
  solo mientras la cinta está abierta. <code>widget.openPanel('tape')</code> la abre; sus interruptores son
  <code>tape</code> y <code>dock.tape</code>.
</p>

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
<pre><code>{`chart.replayStart({ animate: true, step: 'auto', startIndex: 120, paused: true })
// o barras más finas que ya tienes para las barras que se reproducen: { steps, startIndex: 120 }
chart.replayResume()
chart.getReplayBarIndex()      // the chart bar forming now
chart.replaySeekToBar(150)     // to the end of bar 150
chart.replaySeekToTime(t)      // to the bars that closed by t
chart.on('replayStep', (e) => e.payload)    // { barIndex, time, stepTime, until, total, cause }
chart.on('replayComplete', (e) => e.payload) // { barIndex, time }
chart.on('replayState', (e) => e.payload)   // { state: 'playing' | 'paused' | 'stopped' }
chart.replayStop()             // back to the live series`}</code></pre>

<h3>Barras que se forman al reproducir</h3>
<p>
  Con <code>animate: true</code> cada barra crece durante su tiempo, como una barra en vivo: de su
  apertura al extremo que su dirección indica que llegó primero (una barra alcista baja primero), el otro
  y su cierre. Con <code>step</code> (<code>'auto'</code> o un intervalo como <code>'1m'</code>) el gráfico pide
  las barras más finas de las barras que va a reproducir con el <code>fetchHistoryBefore</code> de la fuente
  conectada, una página cada vez y solo mientras reproduce, y cada barra se forma siguiéndolas;
  <code>'auto'</code> es el intervalo más fino que sirve la fuente con 60 como mucho por barra. El último
  fotograma es siempre la barra tal como está en la serie. Los <code>steps</code> que pases se usan igual. El
  reloj sigue contando las barras del gráfico: <code>speed</code>, <code>duration</code> y los índices son
  barras, y <code>getReplayBarIndex()</code> es la barra que se forma. Una pausa conserva la barra a medio
  dibujar; un salto o un paso muestra barras completas. Una cuenta simulada se ejecuta cuando el precio dibujado
  llega a una orden. Las barras de menos de tres fotogramas llegan completas y, con movimiento reducido, la
  barra salta de un precio al siguiente. <code>replayStepsLoad</code> avisa <code>loading</code>,
  <code>loaded</code>, <code>end</code> o <code>error</code>; una barra sin barras más finas se forma con sus
  propios precios. ChartWidget lo hace por defecto: su menú Paso empieza en <strong>Auto</strong>;
  <code>replayStep</code> (<code>'auto'</code>, <code>'bar'</code> o un intervalo) y
  <code>replayAnimate: false</code> lo cambian. Con una fuente sin
  <code>fetchHistoryBefore</code>, el widget obtiene las barras más finas en una sola petición antes de que empiece la reproducción.
  Con <code>replayAnimate: false</code>, Auto reproduce barras enteras; un intervalo más fino elegido avanza en pasos propios.
</p>

<h3>La barra de repetición en ChartWidget</h3>
<p>
  El botón <strong>Repetición de barras</strong> de la barra de herramientas abre una barra bajo el gráfico,
  a todo el ancho del widget y encima de la barra de estado: el gráfico le hace sitio, así que el volumen,
  los paneles de abajo y el eje de tiempo siguen a la vista. Primero elige la vela de inicio: haz clic en ella o pulsa
  <strong>Barra aleatoria</strong>; <strong>Cancelar</strong> (o <kbd>Esc</kbd>) sale. Después: retroceder,
  <strong>Reproducir</strong>/<strong>Pausa</strong> y avanzar; la fecha y la hora del paso mostrado, en la zona horaria de la
  pantalla (el año solo cuando no es el actual), y una pista con la parte reproducida rellena; <strong>Velocidad</strong> en
  múltiplos de 0.1× a 50× (1× reproduce una vela del gráfico por segundo, sea cual sea el paso; por defecto 1×);
  <strong>Paso</strong>; <strong>Elegir barra</strong>, que pausa y elige otro inicio entre las velas mostradas sin mostrar las que
  vienen (<strong>Cancelar</strong> o <kbd>Esc</kbd> vuelve al mismo sitio); y <strong>Volver al tiempo real</strong>. En un móvil
  o un gráfico estrecho ocupa dos filas, con la fecha y la pista arriba. Teclas, para el widget usado por último:
  <kbd>Shift</kbd>+<kbd>←</kbd>/<kbd>→</kbd> avanza o retrocede, <kbd>Space</kbd> en el gráfico o la pista reproduce o pausa
  (fuera de una repetición ajusta el gráfico) y <kbd>Esc</kbd> deja de elegir. Un atajo que añadas con <code>addHotkey</code>
  en las mismas teclas va primero. La barra usa los tokens <code>--tcw-*</code> del aspecto y del tema; el anfitrión también
  puede fijar <code>--tcw-replay-btn</code>, <code>--tcw-replay-play</code> o <code>--tcw-replay-track-w</code> en
  <code>.tcw-replay-bar</code>. La fecha viene de <code>stepTime</code> de <code>replayStep</code>, la hora del paso mostrado.
</p>

<h3>Una repetición sobrevive al cambio de velas</h3>
<p>
  Una repetición es un instante sobre la serie en vivo. Cuando las velas cambian — otro
  símbolo o temporalidad con <code>connect</code> o <code>switchStream</code>,
  <code>setData</code>, velas más antiguas cargadas, el horario extendido, una vela corregida —
  sigue sobre las velas nuevas en el instante al que había llegado, y solo muestra velas
  cerradas hasta entonces. Mientras carga una serie nueva, la repetición espera, reproduciendo
  o en pausa como estaba. Los índices (<code>barIndex</code>, <code>total</code>,
  <code>replaySeekToBar</code>) son de las velas que se repiten ahora y cambian con ellas;
  guarda una posición por tiempo. Una repetición en la que opera una cuenta de papel termina
  cuando cambia el símbolo. En ChartWidget la barra de repetición sigue abierta, dice
  <em>Cargando gráfico</em> y espera mientras cargan las velas, y luego sigue su total y los
  pasos de la nueva temporalidad.
</p>
<pre><code>{`chart.replayStart({ startIndex: 300, paused: true })
await chart.setTimeframe('1h')        // the replay waits, then goes on at the same time
const { until } = chart.getReplayProgress()   // keep a position by time, not by index
if (until !== null) chart.replaySeekToTime(until)   // back to it, on any interval
chart.on('replayStep', (e) => {
  if (e.payload.cause === 'series') {}  // carried over: barIndex and total are the new bars'
})
chart.replayStop()                    // call it first to end the replay as before`}</code></pre>

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
