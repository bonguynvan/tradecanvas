<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Capa de trading — Documentación de TradeCanvas</title>
  <meta name="description" content="Muestra posiciones, órdenes, marcadores de señales y zonas de operación directamente en el gráfico con la capa de trading de TradeCanvas." />
</svelte:head>

<h1>Capa de trading</h1>
<p>
  Muestra posiciones, órdenes, marcadores de señales y zonas de operación
  directamente en el gráfico. Diseñada para integrarse tanto en flujos de trading
  manual como algorítmico.
</p>

<h2>Desactivar el trading</h2>
<p>
  La capa de trading está activada por defecto; el menú de órdenes del clic derecho no (desde la 1.3).
</p>
<pre><code>{`// Drop the entire trading subsystem (no orders, no positions, no overlay)
new Chart(host, { features: { trading: false } })

// Opt in to the right-click "Buy / Sell here" order menu
new Chart(host, { features: { tradingContextMenu: true } })
new ChartWidget(host, { chartOptions: { features: { tradingContextMenu: true } } })`}</code></pre>

<p>
  Sin el menú, el clic derecho nativo del navegador funciona en el gráfico como cabe esperar.
</p>

<h2>Posiciones</h2>
<pre><code>{`chart.setPositions([{
  id: 'pos-1',
  side: 'buy',
  entryPrice: 65_200,
  quantity: 0.5,
  closedQuantity: 0.1,   // partial-close band on the left edge
  stopLoss: 64_800,
  takeProfit: 66_000,
}])`}</code></pre>

<p>
  Cada línea lleva una etiqueta en su extremo derecho, junto al eje de precio. La de la entrada da la
  cantidad, el lado y la ganancia o pérdida abierta, y luego <strong>⇅</strong> y <strong>×</strong>; las del stop y
  el objetivo dicen cuánto ganaría o perdería la posición allí. Cada precio figura también en el eje. Las etiquetas
  que se taparían se ponen una al lado de otra, y las del eje se separan. Arrastra un stop o un objetivo por su línea
  o por su etiqueta.
</p>

<h2>Órdenes</h2>
<pre><code>{`chart.setOrders([{
  id: 'ord-1',
  side: 'sell',
  type: 'limit',
  price: 65_500,
  quantity: 0.25,
  stopLoss: 66_000,      // dotted until it fills
  takeProfit: 64_500,
}])`}</code></pre>

<p>
  La etiqueta de la orden da su cantidad y su tipo (<code>0.25</code>, <code>Sell limit</code>), y luego
  <strong>×</strong> para cancelarla; su etiqueta en el eje de precio lleva el precio, escrito como lo escribe el eje.
  Una orden que abre con stop y objetivo los muestra como líneas punteadas, con lo que darían. Arrastra la línea, o su
  etiqueta, para modificarla; suscríbete con <code>chart.on('orderModify', ...)</code>.
</p>

<h2>Ejecución en vivo (conecta un adaptador)</h2>
<p>
  Por defecto, el gráfico <em>emite</em> intenciones de orden/posición
  (<code>orderPlace</code>, <code>orderModify</code>, <code>orderCancel</code>,
  <code>positionModify</code>, <code>positionClose</code>) para tu backend; nunca
  opera por sí mismo. Si conectas un <code>ExecutionAdapter</code>, el gráfico
  envía esas intenciones al adaptador y muestra las órdenes/posiciones
  definitivas que este le devuelve (el adaptador es la única fuente de verdad).
</p>
<pre><code>{`import { PaperExecutionAdapter } from '@tradecanvas/chart'

chart.connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))

chart.on('executionError', (e) => toast(e.payload.message))
// chart.disconnectExecution()`}</code></pre>
<p>
  Implementa <code>ExecutionAdapter</code> (es el equivalente de
  <code>DataAdapter</code>) para conectar un bróker / OMS real:
  <code>placeOrder</code>, <code>modifyOrder</code>, <code>cancelOrder</code>,
  <code>modifyPosition</code>, <code>closePosition</code>, más los eventos
  <code>orders</code> / <code>positions</code> / <code>fill</code> /
  <code>error</code>. <code>PaperExecutionAdapter</code> es un entorno de pruebas
  con ejecuciones virtuales para demos y tests.
</p>

<h2>Actuar sobre órdenes y posiciones desde el gráfico</h2>
<p>
  Las líneas de órdenes y de posiciones llevan pequeños botones en su extremo
  derecho: <strong>×</strong> cancela una orden o cierra una posición,
  <strong>⇅</strong> invierte una posición, y una × en una línea de stop-loss o
  take-profit la quita. Generan las mismas intenciones que la API
  (<code>orderCancel</code>, <code>positionClose</code>, <code>positionReverse</code>,
  <code>positionModify</code> con <code>null</code>), así que un adaptador conectado
  actúa sobre ellas y una aplicación sin adaptador recibe los eventos. Un botón actúa
  cuando se suelta sobre él: una pulsación que se desliza fuera no hace nada. Desactiva
  cualquiera de ellos con <code>lineButtons</code> en <code>setTradingConfig</code>.
</p>
<pre><code>{`chart.setTradingConfig({ lineButtons: { reverse: false } })  // keep cancel, close and remove-stops

chart.cancelOrderIntent('ord-1')
chart.closePositionIntent('pos-1')
chart.reversePositionIntent('pos-1')                 // close, then the same size the other way
chart.modifyPositionIntent({ positionId: 'pos-1', stopLoss: null }) // null removes the stop`}</code></pre>
<p>
  Un adaptador que pueda invertir en un solo paso implementa
  <code>reversePosition</code>; si no lo hace, el gráfico cierra la posición y envía
  una orden de mercado en sentido contrario. Las órdenes aceptan un
  <code>stopLoss</code>, un <code>takeProfit</code> y un <code>timeInForce</code>
  (<code>'gtc'</code> o <code>'day'</code>) que se trasladan a la posición que abren.
</p>
<p>
  <strong>Para autores de adaptadores:</strong> en <code>PositionModifyIntent</code>,
  <code>stopLoss: null</code> (o <code>takeProfit: null</code>) significa quitarlo,
  mientras que un campo ausente significa dejarlo como está. Un código escrito como
  <code>intent.stopLoss ?? position.stopLoss</code> mantendría un stop que el usuario
  ha quitado.
</p>

<h2>Ejecuciones en el gráfico</h2>
<p>
  Cada ejecución aparece como una pequeña marca en su barra: rellena donde abrió una
  posición y hueca donde la cerró. El gráfico registra las ejecuciones que informa el
  adaptador y emite <code>executionFill</code> con el motivo (<code>'order'</code>,
  <code>'close'</code>, <code>'reverse'</code>, <code>'stopLoss'</code>,
  <code>'takeProfit'</code>) y la ganancia o pérdida realizada.
</p>
<pre><code>{`chart.on('executionFill', (e) => {
  const { side, price, quantity, reason, pnl } = e.payload
})

chart.addFill({ orderId: 'o-7', side: 'buy', price: 64_150, quantity: 1, time: Date.now() })
chart.getFills()        // the latest 1000
chart.getRealisedPnl()  // every fill's P&L since the last clearFills
chart.clearFills()
chart.setTradingConfig({ fillMarks: false })  // no marks`}</code></pre>

<h2>Menús del clic derecho y el “+” junto al eje de precio</h2>
<p>
  Un clic derecho en el gráfico emite <code>chartContextMenu</code> con la parte en la
  que se hizo clic (<code>'plot'</code>, <code>'pane'</code>, <code>'priceAxis'</code>
  o <code>'timeAxis'</code>) y el precio y la hora en ese punto. Con
  <code>features.priceAxisAddButton</code>, un “+” sigue a la cruz a lo largo del eje
  de precio; al pulsarlo se emite <code>priceAxisAdd</code> con su precio.
</p>
<pre><code>{`const chart = new Chart(host, { features: { priceAxisAddButton: true } })

chart.on('chartContextMenu', (e) => {
  const { area, x, y, price, time } = e.payload
  openMyMenu(x, y)
})
chart.on('priceAxisAdd', (e) => openMyMenu(e.payload.x, e.payload.y, e.payload.price))`}</code></pre>
<p>
  ChartWidget construye sus menús sobre estos eventos. Haz clic derecho en el área del
  gráfico para una alerta, una compra y una venta a ese precio (una orden límite en el
  lado del mercado donde quedaría a la espera, una stop en el otro), un ticket de
  orden y una línea horizontal; después, restablecer la vista, pegar los dibujos que
  copiaste, ocultar o eliminar los dibujos, eliminar los indicadores (una comparación
  con otro símbolo se queda), exportar los datos y abrir la configuración.
</p>
<p>
  Haz clic derecho en el eje de precio para restablecerlo y para la escala automática,
  la escala invertida y la de la izquierda, uno de sus cuatro modos (normal,
  logarítmica, porcentaje, indexada a 100), las etiquetas sobre el eje y las líneas que
  cruzan el gráfico en dos submenús, una alerta a ese precio y la configuración abierta
  en su pestaña Escalas. El eje de tiempo ofrece restablecerlo, ir a una fecha y la
  zona horaria.
</p>
<p>
  Una entrada muestra el atajo del widget que le corresponde mientras esa tecla está
  activada: <kbd>Alt</kbd> + <kbd>R</kbd> restablece la vista, <kbd>Alt</kbd> +
  <kbd>I</kbd> invierte la escala, <kbd>Alt</kbd> + <kbd>G</kbd> va a una fecha. Un
  submenú se abre con un clic, <kbd>Enter</kbd>, <kbd>→</kbd> o el puntero detenido
  sobre él, y <kbd>←</kbd> o <kbd>Escape</kbd> vuelve atrás; en un móvil, donde los
  menús se abren desde abajo, su primera fila lleva de vuelta. Añade tus propias
  entradas con <code>chartMenuItems</code> (consulta la
  <a href={href('/docs/api')}>referencia de la API</a>).
</p>

<h2>Ticket de orden y panel de cuenta (ChartWidget)</h2>
<p>
  <strong>Cuenta</strong>, en el menú <strong>Operar</strong> de la barra, abre un panel de cuenta bajo el gráfico: las
  posiciones abiertas con su ganancia o pérdida, las órdenes pendientes y las
  ejecuciones hasta el momento con el P&amp;L realizado. Cada fila permite cerrar,
  invertir o cancelar. <strong>Nueva orden</strong> abre un ticket de orden: compra o
  venta, a mercado, límite o stop, cantidad, precio, un stop-loss y un take-profit
  opcionales, y la vigencia. Revisa la orden mientras la rellenas (una compra límite
  va por debajo del mercado, un stop-loss en el lado perdedor de la entrada…) y
  muestra la relación beneficio:riesgo. Al enviarla se emite una intención
  <code>orderPlace</code>.
  Con un mercado definido (<code>chart.setMarket</code>), además mantiene sus precios en la
  fluctuación mínima del mercado y el precio de la orden dentro del techo y el suelo del día, empieza en un lote y, por
  encima de uno, acepta solo lotes completos (las acciones sueltas van en una orden de lote
  incompleto aparte).
</p>
<p>
  El ticket muestra el símbolo junto al título. El tipo y la vigencia son opciones en una fila (las flechas
  pasan de una a otra); − y + mueven la cantidad de lote en lote y el precio según la fluctuación mínima del mercado, y
  un precio tomado del gráfico empieza redondeado a ella. Un stop-loss o un take-profit activado dice a qué distancia
  está de la entrada en porcentaje y cuánto ganaría o perdería; debajo, un recibo resume la orden: su valor, su riesgo,
  su beneficio y la relación entre ambos. Cambiar entre compra y venta deja una orden en espera donde se puso (una
  compra stop sobre el mercado pasa a venta límite), y el botón de enviar toma el color del lado.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  trading: true,         // default
  accountPanel: true,    // default when trading is on
})
widget.getChart().connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))
widget.toggleAccountPanel(true)
// The panel follows ordersChange, positionsChange, executionFill and each tick.`}</code></pre>
<p>
  Las marcas de ejecución pertenecen al símbolo del gráfico: al cambiar de símbolo en
  el widget, el siguiente empieza sin ninguna.
</p>

<h2>Crear órdenes arrastrando</h2>
<p>
  Crea una línea de orden arrastrable, llévala a un precio y confirma: el tipo de
  orden (límite o stop) se deduce de dónde la sueltas respecto al precio actual.
  Combínalo con <code>connectExecution</code> para que un borrador confirmado se
  ejecute al instante.
</p>
<pre><code>{`chart.startOrderDraft('buy')   // draggable line at the latest close
chart.confirmOrderDraft()      // emits orderPlace -> a connected adapter fills it
chart.cancelOrderDraft()`}</code></pre>

<h2>Órdenes bracket (arrastrar para enviar)</h2>
<p>
  Crea un bracket arrastrable —entrada más zonas de stop-loss y take-profit— y
  arrastra las tres líneas para ajustar la entrada, el riesgo y el beneficio.
  Confirma con <kbd>Enter</kbd> (o con el botón Enviar) y cancela con
  <kbd>Esc</kbd>. En el widget, las flechas verde/roja de la barra de
  herramientas inician un bracket largo/corto. El gráfico emite un único evento
  <code>bracketPlace</code> para que tu backend actúe; nunca envía órdenes por sí
  mismo.
</p>
<pre><code>{`chart.startBracket('buy')          // entry defaults to the latest close
chart.startBracket('sell', 64_800) // or pin the entry price

chart.on('bracketPlace', (e) => {
  const { side, entry, stopLoss, takeProfit, riskReward } = e.payload
  // submit to your OMS, then reflect fills back via chart.setOrders/setPositions
})

chart.confirmBracket()  // same as Enter
chart.cancelBracket()   // same as Esc`}</code></pre>

<h2>Escalera de profundidad (clic para operar)</h2>
<p>
  Una escalera opcional de profundidad de mercado muestra el libro de órdenes
  como filas de precio con columnas de tamaño de compra/venta: haz clic en una
  celda de venta para comprar, o en una de compra para vender, a ese precio.
  Actívala con <code>depthLadder: true</code> y aliméntala con el libro mediante
  <code>widget.setDepth</code>; los clics emiten intenciones
  <code>orderPlace</code> para tu OMS (el gráfico nunca opera por sí mismo). Los
  mismos datos alimentan también la capa de profundidad sobre el gráfico.
</p>
<pre><code>{`const widget = new ChartWidget(host, { depthLadder: true })

widget.setDepth({
  bids: [{ price: 64_190, volume: 3.1 }, { price: 64_185, volume: 5.4 }],
  asks: [{ price: 64_205, volume: 2.0 }, { price: 64_210, volume: 8.7 }],
})

widget.getChart().on('orderPlace', (e) => {
  // { side, type: 'limit', price } — submit to your backend
})`}</code></pre>

<h2>Mapa de calor de liquidez</h2>
<p>
  Acumula instantáneas del libro de órdenes en un mapa de calor detrás de las
  velas: cada instantánea es una franja vertical en la que el tamaño en espera se
  ilumina por nivel de precio (compras en verde, ventas en rojo). Los muros de
  liquidez que persisten en el tiempo destacan. Actívalo desde la hoja de
  configuración (o con <code>chart.setDepthHeatmapVisible</code>);
  <code>widget.setDepth</code> registra una instantánea en cada actualización del
  libro.
</p>
<pre><code>{`chart.setDepthHeatmapVisible(true)
chart.setDepthHeatmapConfig({ opacity: 0.7, capacity: 240 })

// each book update both draws the overlay/ladder and records a heatmap column
widget.setDepth(orderBook)
// low-level: chart.pushDepthSnapshot(orderBook) · chart.clearDepthHeatmap()
// books recorded for older bars, oldest first: chart.pushDepthSnapshot(orderBook, bar.time)`}</code></pre>

<h2>Marcadores de señales</h2>
<p>Las integraciones con bots o de trading por señales pueden colocar flechas direccionales sobre la capa.</p>
<pre><code>{`chart.addSignalMarker({
  id: 'sig-12',
  time: bar.time,
  price: bar.close,
  direction: 'long',
  confidence: 0.86,
  source: 'momentum-bot',
  label: 'EMA cross',
})

// A marker under the pointer, and a click on one
chart.on('signalMarkerHover', (e) => showNote(e.payload.marker, e.payload.x, e.payload.y))  // marker null: off it
chart.on('signalMarkerClick', (e) => openSignal(e.payload.marker))`}</code></pre>
<p>
  ChartWidget muestra una nota junto al marcador que queda bajo el puntero: su etiqueta y
  su origen, el lado, el precio, la confianza y la hora.
</p>

<h2>Zonas de operación</h2>
<p>Visualiza rectángulos de entrada → salida coloreados según el P&amp;L y con distintivos de dirección.</p>
<pre><code>{`chart.addTradeZone({
  id: 'tz-1',
  side: 'long',
  entryTime: openedAt,
  exitTime: closedAt,
  entryPrice: 65_100,
  exitPrice: 65_800,
  status: 'closed',
})`}</code></pre>

<h2>Tokens de la etiqueta de posición</h2>
<p>
  Escribe la etiqueta de una posición a tu manera: <code>positionLabel</code> ocupa el lugar del lado y la
  ganancia tras su cantidad. Acepta una cadena de plantilla o una función que devuelva una cadena.
</p>
<pre><code>{`chart.setTradingConfig({
  positionLabel: '{side} @ {entry} · {pnlSign}{pnlPct}%',
})`}</code></pre>

<p>
  Tokens disponibles:
  <code>{'{side}'}</code>, <code>{'{qty}'}</code>, <code>{'{openQty}'}</code>,
  <code>{'{closedQty}'}</code>, <code>{'{entry}'}</code>, <code>{'{price}'}</code>,
  <code>{'{pnl}'}</code>, <code>{'{pnlPct}'}</code>, <code>{'{pnlSign}'}</code>.
</p>

<h2>Puntos del degradado de P&amp;L</h2>
<pre><code>{`chart.setTradingConfig({
  pnlThresholds: [
    { pnl: -Infinity, color: '#ef4444' },
    { pnl: 0,         color: '#94a3b8' },
    { pnl: 500,       color: '#10b981' },   // 500 or more in profit
  ],
})`}</code></pre>

<p>
  La ganancia abierta de la etiqueta y la banda hasta el precio toman el color del punto más alto cuyo
  <code>pnl</code> no supera la ganancia o pérdida de la posición, en dinero.
</p>
