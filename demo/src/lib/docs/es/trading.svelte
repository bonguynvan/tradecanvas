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
<pre><code>{`chart.addPosition({
  id: 'pos-1',
  side: 'long',
  entry: 65_200,
  quantity: 0.5,
  closedQuantity: 0.1,   // partial-close band on the left edge
  stopLoss: 64_800,
  takeProfit: 66_000,
})`}</code></pre>

<h2>Órdenes</h2>
<pre><code>{`chart.addOrder({
  id: 'ord-1',
  side: 'sell',
  type: 'limit',
  price: 65_500,
  quantity: 0.25,
})`}</code></pre>

<p>Arrastra la línea de precio para modificarla; suscríbete con <code>chart.on('orderModify', ...)</code>.</p>

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
// low-level: chart.pushDepthSnapshot(orderBook) · chart.clearDepthHeatmap()`}</code></pre>

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
})`}</code></pre>

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
  Personaliza la etiqueta de cada posición en el gráfico. <code>positionLabel</code>
  acepta una cadena de plantilla o una función que devuelva una cadena.
</p>
<pre><code>{`new ChartWidget(host, {
  trading: true,
  positionLabel: '{side} {qty} @ {entry} · {pnlSign}{pnlPct}%',
})`}</code></pre>

<p>
  Tokens disponibles:
  <code>{'{side}'}</code>, <code>{'{qty}'}</code>, <code>{'{openQty}'}</code>,
  <code>{'{closedQty}'}</code>, <code>{'{entry}'}</code>, <code>{'{price}'}</code>,
  <code>{'{pnl}'}</code>, <code>{'{pnlPct}'}</code>, <code>{'{pnlSign}'}</code>.
</p>

<h2>Puntos del degradado de P&amp;L</h2>
<pre><code>{`new ChartWidget(host, {
  trading: true,
  pnlThresholds: [
    { pnlPct: -0.02, color: '#ef4444' },
    { pnlPct: 0,     color: '#94a3b8' },
    { pnlPct: 0.02,  color: '#10b981' },
  ],
})`}</code></pre>
