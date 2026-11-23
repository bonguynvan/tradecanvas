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
<p>
  Una posición sin stop-loss o sin take-profit tiene un botón <strong>SL</strong> o <strong>TP</strong> en la etiqueta
  de su entrada. Púlsalo y arrastra la nueva línea adonde la quieras, o haz clic sin más para dejarla donde empieza. Un
  stop empieza a un 1% de la entrada y un objetivo al doble de la distancia del stop, como hace un bracket, y ambos
  empiezan al menos un 1% más allá del precio actual, para que ninguno se active nada más ponerlo. Al soltar se envía
  <code>positionModify</code>, como al arrastrar un stop, de modo que un adaptador de ejecución conectado lo aplica.
  <code>lineButtons: {'{'} addStops: false {'}'}</code> deja fuera los botones.
  Mientras se arrastra una línea hasta un precio, la cruz no dibuja línea horizontal ni escribe el precio en el eje: la
  etiqueta de la propia línea ya lo lleva.
  Un precio fijado a mano se ajusta a la rejilla del mercado: una orden, un stop, un objetivo o un nivel arrastrados, las líneas de un bracket y de una orden en borrador, una alerta arrastrada, el precio que da un clic derecho o el “+” junto al eje. Queda en el paso de precio del mercado (<code>setMarket</code>, o el <code>minTick</code> del símbolo); si no, en los decimales que muestra el eje de precios: <code>chart.roundPrice</code>. La cruz escribe el precio bajo el puntero en la misma rejilla, así que lo que marca es donde coloca el “+” de al lado.
  En un mercado con techo y suelo para el día (<code>setPriceLimits</code>), el precio propio de una orden también se mantiene dentro: su línea se detiene en el límite al arrastrarla más allá, la entrada de un bracket y una orden en borrador empiezan y se quedan dentro, y el menú no ofrece ninguna orden fuera de ellos, ni la escalera de profundidad coloca una. El stop, el objetivo y los niveles de una posición no quedan sujetos: no son órdenes de hoy.
</p>
<p>
  Las posiciones, las órdenes y sus ejecuciones se pueden ocultar, y sus líneas bloquear. Ocultas, ninguna se dibuja ni
  se puede pulsar; se siguen guardando y siguen al adaptador de ejecución, y un bracket o una orden que se está colocando
  se sigue viendo. Bloqueadas, no se puede arrastrar ninguna de sus líneas ni etiquetas, y una posición no ofrece SL ni TP
  que sacar; sus botones (cerrar, cancelar, invertir, trailing, quitar un stop) siguen funcionando. En el widget lo hacen
  los menús de los botones de ocultar y bloquear de la barra lateral de dibujo.
</p>
<pre><code>{`chart.setTradingVisible(false)   // isTradingVisible()
chart.setTradingLocked(true)     // isTradingLocked()
chart.setIndicatorsVisible(ids, false)   // varios indicadores a la vez, un paso de deshacer`}</code></pre>

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

chart.on('executionError', (e) => toast(e.payload.message))   // e.payload.command: the intent that failed
// A confirmed bracket goes to it too: see Bracket orders
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

<h3 id="order-outcome">Qué fue de una orden</h3>
<p>
  Toda orden pedida sale con un <code>clientOrderId</code>, un identificador propio: el que traía o, si no, uno que le da
  el gráfico, y <code>placeOrderIntent</code> devuelve la orden tal como se envió. Hasta que el adaptador responde, la orden
  está en camino. <code>orderPlaced</code> dice que el adaptador la aceptó, con la orden que hizo de ella;
  <code>executionError</code> con <code>command: 'orderPlace'</code> y el mismo <code>clientOrderId</code> dice que fue
  rechazada. El <code>placeOrder</code> de un adaptador debe terminar de una de las dos formas: resolver con la orden o
  rechazar con el motivo. Pasa el identificador al bróker que lo acepte y responde a una repetición con la orden ya creada,
  para que una pulsación enviada dos veces sea una sola orden (la cuenta de simulación lo hace).
</p>
<pre><code>{`const sent = chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 63_500, quantity: 1 })
chart.on('orderPlaced', (e) => { if (e.payload.intent.clientOrderId === sent?.clientOrderId) done(e.payload.order) })
chart.on('executionError', (e) => { if (e.payload.clientOrderId === sent?.clientOrderId) failed(e.payload.cause) })`}</code></pre>

<h3 id="order-kinds">Órdenes que funcionan juntas, y durante cuánto tiempo</h3>
<p>
  La intención de una orden (<code>chart.placeOrderIntent</code>, el <code>placeOrder</code> del adaptador) dice más que
  su precio:
</p>
<ul>
  <li>
    <strong><code>ocoGroup</code></strong>: un nombre que comparten órdenes de las que una cancela a las demás, como un
    objetivo y un stop para la misma salida. Cuando una se ejecuta, el resto del grupo se cancela. Sus etiquetas en el
    gráfico dicen OCO.
  </li>
  <li>
    <strong><code>timeInForce</code></strong>: <code>'gtc'</code> (válida hasta cancelar), <code>'day'</code>,
    <code>'gtd'</code> (válida hasta una fecha: <code>expireTime</code>, en milisegundos), e <code>'ioc'</code> o
    <code>'fok'</code> para una orden que se ejecuta al instante o no se ejecuta.
  </li>
  <li>
    <strong><code>type: 'stopLimit'</code></strong>: <code>stopPrice</code> es donde empieza a funcionar y
    <code>price</code> el límite al que funciona después. Su línea en el gráfico es su límite, y su stop tiene una línea propia de rayas y puntos, con la etiqueta STOP y su precio en el
    eje. Arrastrar la línea de la orden mueve ambos, con la misma separación; arrastrar la del stop, o su etiqueta, mueve solo el stop.
    <code>orderModify</code> lleva entonces <code>newStopPrice</code> junto a <code>newPrice</code>, y la cuenta de simulación lo sigue.
  </li>
</ul>
<pre><code>{`// A target and a stop for one exit: whichever fills first takes the other off
chart.placeOrderIntent({ side: 'sell', type: 'limit', price: 66_000, quantity: 1, ocoGroup: 'exit' })
chart.placeOrderIntent({ side: 'sell', type: 'stop', price: 63_000, stopPrice: 63_000, quantity: 1, ocoGroup: 'exit' })

// Works until midnight UTC
chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 63_500, quantity: 1, timeInForce: 'gtd', expireTime: Date.UTC(2027, 0, 1) })`}</code></pre>
<p>
  La cuenta de simulación hace con cada una lo que haría un bróker. De un grupo, la primera que se ejecuta cancela el
  resto. Una stop-limit pasa a ser una orden límite a su <code>price</code> una vez que el precio alcanza su stop, y se
  ejecuta solo dentro de ese límite (al precio que alcanzó el stop, cuando está dentro de él). Una orden <code>'gtd'</code>
  se retira cuando la hora dada con <code>setMarkPrice</code> alcanza su fecha (la del reloj, si no se da ninguna
  hora), y una cuya fecha ya pasó se rechaza. Una límite <code>'ioc'</code> o <code>'fok'</code> se ejecuta al
  instante, al precio que hay, cuando este está dentro de ella, y se rechaza cuando no lo está (<code>executionError</code>). El mercado de simulación no tiene tamaño propio, así que allí las dos son
  iguales, salvo que se le dé uno (<a href="#partial-fills">más abajo</a>). El ticket de orden del widget ofrece ambas para una orden límite, y su panel de cuenta escribe OCO junto a
  una orden de un grupo y la fecha de una orden con fecha. Deja <code>'day'</code> a la aplicación, que sabe cuándo termina el día de su mercado.
  El ticket ofrece válida hasta una fecha para una orden límite y una orden stop: una fecha y una hora en el reloj del propio gráfico, un día desde ahora para empezar, y no envía ninguna orden que terminaría en el pasado.
  Una orden límite IOC o FOK puede llevar un precio que atraviese el mercado: se ejecuta al precio de mercado, y el ticket calcula su valor, su riesgo y sus objetivos desde ahí.
  El ticket acepta también una orden stop-límite, con un precio stop y un precio límite, válida hasta cancelar, por el día o hasta una fecha. Puede ejecutarse en cualquier precio entre su stop y su límite, así que su stop-loss va más allá del stop y su take-profit más allá del límite; el panel de cuenta la nombra y escribe ambos precios, el stop primero.
</p>
<p>
  <strong>Una sola posición neta.</strong> Por defecto, la cuenta de simulación abre una posición por cada orden ejecutada, una compra
  junto a una venta (<code>positions: 'hedge'</code>). <code>{`new PaperExecutionAdapter({ positions: 'net' })`}</code>
  mantiene una sola posición, como una cuenta de futuros: una ejecución en el mismo sentido la aumenta al promedio de sus precios, una
  en sentido contrario le resta y realiza esa parte (<code>pnl</code> en la ejecución), y una mayor le da
  la vuelta, y el resto se abre al precio de la ejecución. Una ejecución que la aumenta trae sus stops cuando los tiene; una
  que le resta deja los stops de la posición como están; una que le da la vuelta trae los suyos.
</p>
<h3 id="partial-fills">Órdenes que se ejecutan por partes</h3>
<p>
  Una orden límite descansa en el mercado y se ejecuta a medida que otros llegan a ella, a menudo una parte cada vez. Con un
  <code>fillSize</code>, la cuenta de simulación ejecuta como mucho esa cantidad de una orden límite a un mismo precio: una mayor
  ejecuta una parte en cada precio que alcanza su límite (cada <code>setMarkPrice</code>), y sigue activa por el
  resto. La orden permanece en <code>chart.getOrders()</code> con su <code>filledQuantity</code>; cada parte es una
  ejecución propia (<code>executionFill</code>), cuyo <code>remaining</code> es lo que dejó activo, y la
  última parte retira la orden. El gráfico escribe lo ejecutado en la etiqueta de la orden (<code>2/5</code>), y
  el panel de cuenta del widget en su fila; las etiquetas del stop y del objetivo de la orden dicen lo que daría el resto,
  ya que lo ejecutado es una posición con etiquetas propias.
</p>
<pre><code>{`const broker = new PaperExecutionAdapter({ fillSize: 2 })   // two of a limit order at each price
chart.connectExecution(broker)
chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 95, quantity: 5 })

chart.on('executionFill', (e) => console.log(e.payload.quantity, e.payload.remaining))   // 2 3, then 2 1, then 1 undefined
chart.on('ordersChange', (e) => console.log(e.payload.orders[0]?.filledQuantity))        // 2, 4, then no order`}</code></pre>
<p>
  Las partes de una orden forman una sola posición, al promedio de sus precios; en una cuenta neta se suman a su
  posición, o le restan. La posición tiene el stop-loss, el take-profit y los niveles de la orden desde su primera
  parte, y una parte posterior no los trae una segunda vez: un stop que moviste desde entonces, o que quitaste, se queda como lo
  dejaste. Una parte que se ejecuta después de que su posición se cerró abre otra, de nuevo con los stops de la orden. Un nivel es
  un tamaño del plan completo, así que puede que las primeras partes no lo cubran: no toma más de lo que está abierto. Una stop-limit
  también se ejecuta por partes, una vez que funciona como límite. Una parte paga su propia comisión, y una que la cuenta ya no puede sostener cancela lo que queda de la
  orden (<code>executionError</code>). Lo que queda se puede mover, cancelar, o terminar en su fecha, y la primera
  parte cancela el resto del grupo de la orden. De una orden <code>'ioc'</code>, lo que se ejecuta al instante se ejecuta y el
  resto se descarta (su ejecución dice cuánto: su <code>dropped</code>, junto a una <code>quantity</code> menor que la pedida, y la
  orden que devuelve <code>placeOrder</code> lleva su <code>filledQuantity</code>; el registro anota el
  resto como cancelado, y el widget dice cuánto se ejecutó); una orden <code>'fok'</code> mayor que el tamaño se rechaza. Una orden a mercado y
  una stop se ejecutan enteras, igual que los cierres: el mercado de simulación las toma al precio que hay, y no modela ningún deslizamiento.
  Un adaptador propio informa de las partes de su bróker de la misma manera: la orden con su
  <code>filledQuantity</code> en <code>orders</code>, y un <code>fill</code> por cada una.
</p>

<h3 id="take-profit-levels">Tomar beneficios por partes</h3>
<p>
  Una posición se puede cerrar por partes. <code>takeProfits</code> en la intención de una orden, o en una posición
  (<code>chart.modifyPositionIntent</code>), es una lista de niveles, cada uno un <code>price</code> y la
  <code>quantity</code> que se cierra allí. Cuando el precio alcanza un nivel, su parte se cierra al precio del nivel
  y el nivel desaparece; lo que dejan los niveles sigue abierto para que lo cierre <code>takeProfit</code>, o el stop-loss.
  El stop-loss cierra todo lo que queda, esperasen los niveles que esperasen, un nivel más allá del take-profit nunca se
  alcanza, y un nivel no toma más de lo que sigue abierto.
  El gráfico dibuja una línea y una etiqueta para cada uno (TP1 es el más cercano), con su parte y lo que daría, y
  el panel de cuenta del widget escribe el nivel más cercano y cuántos más hay.
</p>
<pre><code>{`chart.placeOrderIntent({
  side: 'buy', type: 'market', price: 64_000, quantity: 3,
  stopLoss: 63_000,
  takeProfits: [{ price: 65_000, quantity: 1 }, { price: 66_000, quantity: 1 }],   // a third at each
  takeProfit: 67_000,                                                              // the rest
})

chart.modifyPositionIntent({ positionId: 'pos-1', takeProfits: [{ price: 65_500, quantity: 2 }] })   // all of them, anew
chart.modifyPositionIntent({ positionId: 'pos-1', takeProfits: null })                               // none`}</code></pre>
<p>
  La cuenta de simulación cierra las partes (una ejecución cada una, con <code>reason: 'takeProfit'</code> y lo que
  realizó) y las cuenta en el <code>closedQuantity</code> de la posición. Solo acepta niveles que son una
  ganancia respecto a la entrada, y en una cuenta neta una orden que trae niveles da a la posición sus niveles, como
  le da sus stops. TP1 en el gráfico es el nivel más cercano que sigue esperando. Un adaptador propio informa de los de su
  bróker. En el ticket de orden del widget, un take-profit se puede alcanzar en uno, dos o tres
  <strong>Objetivos</strong>: con más de uno, una parte igual de la cantidad se cierra en cada objetivo del
  camino, a distancias iguales desde la entrada, y el take-profit cierra lo que queda. El ticket lista qué se cierra
  y dónde antes de enviar la orden.
</p>
<p>
  El nivel de una posición se arrastra en el gráfico como su stop-loss y su take-profit, por su línea o por su etiqueta:
  la línea sigue al puntero, con el lugar donde quedó, tenue, detrás de ella, y al soltar se emite
  <code>positionModify</code> con todos los <code>takeProfits</code> de la posición, ese movido, el más cercano
  primero. Un nivel es una ganancia, así que uno soltado en la entrada o más allá de ella por el lado perdedor vuelve a donde estaba, y
  no se emite nada. De dos niveles al alcance de una pulsación se toma el más cercano; la línea de una orden, el stop-loss
  o el take-profit en el mismo lugar se toman antes que un nivel, que su etiqueta sigue moviendo. Los niveles de una
  orden que aún espera son un plan que la orden trae y no son tiradores; tampoco lo es ninguno mientras las líneas están
  bloqueadas.
</p>

<h3 id="account">Una cuenta con dinero</h3>
<p>
  Con un <code>balance</code>, la cuenta de simulación lleva su dinero como un bróker. Lo que un cierre gana o pierde
  va al saldo, las posiciones abiertas retienen margen (su valor, entre <code>leverage</code>), y cada ejecución
  paga su <code>commission</code>. Una orden que el margen libre no puede sostener se rechaza
  (<code>executionError</code>), y también una inversión; una orden en espera cuyo dinero ya no está cuando llega su
  precio se cancela, lo que también dice <code>executionError</code>. <code>multiplier</code> es lo que vale para una unidad un movimiento
  de uno en el precio, para un contrato de futuros: dale el
  <code>contractMultiplier</code> del mercado, con el que el panel del widget cuenta la ganancia de las posiciones. La cuenta se comunica
  antes que la ejecución que la cambió, así que <code>chart.getAccount()</code> en un listener de <code>executionFill</code>
  la lee tal como la dejó la ejecución. Sin un <code>balance</code> no hay cuenta, y se acepta cualquier orden, como
  antes.
</p>
<p>
  Mientras las posiciones retienen margen, la cuenta dice cómo está su patrimonio respecto a él: <code>marginLevel</code>, el
  patrimonio como parte del margen usado (<code>1.5</code> es el 150%). Dos niveles actúan sobre él, y cada uno queda fuera salvo que
  se dé. Por debajo de <code>marginCallLevel</code> la cuenta avisa una vez, el evento <code>marginCall</code>, y
  de nuevo solo después de que el patrimonio haya vuelto a estar por encima del nivel; no cierra nada. Por debajo de
  <code>stopOutLevel</code> cierra posiciones al precio que hay, primero la que más pierde, hasta
  volver a estar por encima del nivel o no tener ninguna: cerrar una libera su margen, lo que puede bastar. Cada una es una ejecución con
  <code>reason: 'liquidation'</code>. Ambos se calculan con cada precio que llega, después de las órdenes y los stops que
  alcanzó, así que un stop-loss cierra primero su posición, y sobre una ejecución que lleva el patrimonio por debajo de un nivel se actúa
  en el siguiente precio. El margen de una posición se retiene al precio de su entrada, así que el nivel se mueve solo con el patrimonio.
  Un stop-out deja activas las órdenes que esperan: una cuyo dinero ya no está se cancela cuando llega su precio.
  Sin ninguno de los dos niveles, no se cierra nada y un saldo puede bajar de cero.
</p>
<pre><code>{`const broker = new PaperExecutionAdapter({
  balance: 10_000,
  leverage: 10,                                 // a position holds a tenth of its value
  commission: { rate: 0.0004, min: 0.1 },       // 0.04% of each fill's value, no less than 0.1; perUnit: an amount a unit
  positions: 'net',
  marginCallLevel: 1,                           // warn when the equity falls under the margin held
  stopOutLevel: 0.5,                            // close positions when it falls under half of it
})
chart.connectExecution(broker)

chart.getAccount()   // { balance, equity, unrealisedPnl, realisedPnl, marginUsed, freeMargin, commission, marginLevel? } or null
chart.on('accountChange', (e) => console.log(e.payload.account?.equity))
chart.on('executionFill', (e) => console.log(e.payload.commission, e.payload.reason))   // 'liquidation' for a stop-out
chart.on('marginCall', (e) => warn(e.payload))   // { marginLevel: 0.9, level: 1, equity, marginUsed }`}</code></pre>
<p>
  El panel de cuenta del widget encabeza sus totales con el saldo, el patrimonio y el margen libre, y el nivel de
  margen mientras lo hay; muestra un margin call como una advertencia, y nombra la ejecución de un stop-out en su historial. Un
  adaptador propio hace lo mismo implementando <code>getAccount()</code> y emitiendo <code>account</code>
  con un <code>AccountSummary</code> cuando su dinero cambia, y <code>marginCall</code> cuando su bróker avisa.
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
chart.modifyPositionIntent({ positionId: 'pos-1', stopLoss: null }) // null removes the stop
chart.modifyPositionIntent({ positionId: 'pos-1', trailingStop: 150 }) // the stop trails the price by 150; null ends the trail`}</code></pre>
<p>
  Un adaptador que pueda invertir en un solo paso implementa
  <code>reversePosition</code>; si no lo hace, el gráfico cierra la posición y envía
  una orden de mercado en sentido contrario. Las órdenes aceptan un
  <code>stopLoss</code>, un <code>takeProfit</code> y una distancia de seguimiento
  que se trasladan a la posición que abren.
</p>
<p>
  <strong>Para autores de adaptadores:</strong> en <code>PositionModifyIntent</code>,
  <code>stopLoss: null</code> (o <code>takeProfit: null</code>) significa quitarlo,
  mientras que un campo ausente significa dejarlo como está. Un código escrito como
  <code>intent.stopLoss ?? position.stopLoss</code> mantendría un stop que el usuario
  ha quitado.
</p>
<p>
  Un <strong>trailing stop</strong> es un stop-loss que sigue al precio: el <code>trailingStop</code> de una posición es la distancia, en precio, que su stop mantiene detrás del mejor precio, hacia arriba en un largo y hacia abajo en un corto, y nunca retrocede. En el gráfico su etiqueta dice TSL. Un botón en la etiqueta del stop inicia el seguimiento a la distancia actual entre el stop y el precio, o lo termina; <code>lineButtons: {'{'} trailStop: false {'}'}</code> lo oculta. La cuenta de simulación mueve el stop por sí misma. Un adaptador para un bróker pasa <code>trailingStop</code> desde <code>modifyPosition</code> (un número inicia el seguimiento, <code>null</code> lo termina y deja el stop donde está) e informa del <code>stopLoss</code> de la posición a medida que el bróker lo mueve. Una orden también lo lleva: <code>trailingStop</code> en una orden hace que la posición que abre siga al precio desde el principio, y el stop de una orden en espera dice TSL. En el ticket de órdenes es el interruptor Stop dinámico bajo el stop-loss, que sigue a la distancia entre el stop y la entrada. El botón de seguimiento en la etiqueta de un stop aparece relleno mientras su stop sigue al precio.
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
  de precio; al pulsarlo se emite <code>priceAxisAdd</code> con su precio. Mientras se ve, las
  etiquetas de órdenes y posiciones terminan a su izquierda, así que nunca tapa sus botones.
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
  posiciones abiertas con su ganancia o pérdida, las órdenes pendientes, las
  ejecuciones hasta el momento con el P&amp;L realizado, y un registro de lo que pasó con las órdenes. Cada fila permite cerrar,
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
  Cuando el feed da bid y ask, el ticket valora, comprueba y envía una compra al ask y una venta al bid; si no, ambas al
  último precio. Con un adaptador de ejecución conectado espera su respuesta: sigue abierto, con <strong>Enviando…</strong>
  en lugar de su botón y sin nada que se pueda cambiar; se cierra cuando la orden es aceptada, y si es rechazada conserva
  lo escrito y dice por qué hasta que la orden se cambia. Tras diez segundos sin respuesta lo dice y sigue esperando: revisa tus órdenes antes de enviarla de nuevo. Una pulsación fuera del ticket no lo cierra; Escape, Cancelar y
  el aspa sí. Una orden pedida con una sola pulsación, desde el menú del botón derecho o un peldaño de la escalera de
  profundidad, es por el lote del mercado (<code>volumeUnit</code>) donde lo hay, y si no por uno.
</p>
<p>
  El ticket muestra el símbolo junto al título. El tipo y la vigencia son opciones en una fila (las flechas
  pasan de una a otra); − y + mueven la cantidad de lote en lote y el precio según la fluctuación mínima del mercado, y
  un precio tomado del gráfico empieza redondeado a ella. Un stop-loss o un take-profit activado dice a qué distancia
  está de la entrada en porcentaje y cuánto ganaría o perdería; debajo, un recibo resume la orden: su valor, su riesgo,
  su beneficio y la relación entre ambos. Cambiar entre compra y venta deja una orden en espera donde se puso (una
  compra stop sobre el mercado pasa a venta límite), y el botón de enviar toma el color del lado.
</p>
<p>
  En el widget, un dibujo de Posición larga/corta seleccionado ofrece <b>Crear orden</b> en su barra de herramientas
  mientras el trading está activado. Abre este ticket relleno a partir del dibujo: su lado, la entrada como precio, el
  stop-loss y el take-profit, y la cantidad que compra su riesgo, recortada a los decimales con que la escribe el
  dibujo. El tipo de orden sigue la posición de la entrada respecto al mercado, y no se envía nada hasta pulsar Enviar.
</p>
<p>
  La cabecera del panel de cuenta muestra en todas las pestañas el P&amp;L abierto y el realizado. Sus cifras van
  alineadas a la derecha en tipo monoespaciado, el dinero con los decimales del paso de precio y en el formato numérico
  del idioma; en el móvil cada fila es una tarjeta con sus cifras rotuladas.
</p>
<p>
  El widget dice qué fue de una orden que envió: la que el adaptador rechazó, con las palabras del propio adaptador, y la
  que se ejecutó en parte y descartó el resto, cuánto se ejecutó.
</p>
<p>
  <strong>La pestaña Registro</strong> lista lo que pasó con las órdenes, lo más reciente primero: cada una colocada, movida,
  cancelada o ejecutada, y lo que el bróker rechazó con su motivo. Lo lleva el gráfico, también para un gráfico
  propio: <code>chart.getActivityLog()</code> da las últimas 200 entradas, la más antigua primero, cada una
  <code>{`{ time, kind, orderId, side, type, quantity, price, reason, pnl, message }`}</code> con lo que tiene su
  <code>kind</code> (<code>'placed'</code>, <code>'moved'</code>, <code>'cancelled'</code>,
  <code>'filled'</code>, <code>'rejected'</code>). Se lee de las órdenes, ejecuciones y errores que se comunican al gráfico,
  por un adaptador de ejecución o por <code>setOrders</code> y <code>addFill</code>. Las órdenes que había cuando empezó
  no están en él, ni las que hay cuando se conecta o se retira un adaptador, o (sin adaptador) cuando cambia el
  símbolo: son lo que hay, no órdenes colocadas. Una orden ejecutada en parte y luego retirada se registra como
  cancelada. <code>chart.clearActivityLog()</code> lo vacía.
</p>
<p>
  <strong>Vender y Comprar en el gráfico.</strong> Mientras hay un adaptador de ejecución conectado, el widget muestra dos
  botones bajo la leyenda del gráfico, cada uno con el precio al que operaría: el mejor bid en Vender y el mejor ask
  en Comprar con el diferencial entre ellos (<code>chart.setBidAsk</code>, o un feed cuyos ticks los traen), si no el
  último precio en ambos, como en una repetición o cuando el feed solo da un lado. Una pulsación abre el ticket de orden en ese
  lado. <code>executionChange</code> dice cuándo se conecta o se retira un adaptador, <code>bidAskChange</code>
  cuándo cambian el bid y el ask, y el interruptor <code>tradeButtons</code> apaga los botones.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  trading: true,         // default
  accountPanel: true,    // default when trading is on
  features: { tradeButtons: true },   // default: Sell and Buy under the legend, with a broker connected
})
widget.getChart().connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))
widget.toggleAccountPanel(true)
// The panel follows ordersChange, positionsChange, executionFill and each tick.

widget.getChart().getActivityLog().at(-1)   // { time, kind: 'filled', side: 'buy', quantity: 1, price: 64_000, reason: 'order' }`}</code></pre>
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
  <code>bracketPlace</code>, y envía el bracket a un adaptador de ejecución conectado
  (más abajo); sin ninguno, el evento es para que tu backend actúe.
</p>
<p>
  <strong>Su tamaño.</strong> Un bracket es por la cantidad que le da su tamaño. <code>{`{ quantity: 2 }`}</code>
  es esa cantidad. <code>{`{ risk: 50 }`}</code> es el dinero que se pierde en el stop: la cantidad es entonces 50
  entre la distancia del stop a la entrada (por <code>multiplier</code>, lo que vale para una unidad un movimiento
  de uno en el precio), redondeada hacia abajo a <code>quantityStep</code>, y sigue a las líneas cuando se
  arrastran. La cantidad se escribe en la etiqueta de la entrada, y <code>bracketPlace</code> la lleva. En el
  widget se escribe en un campo de la barra del bracket, que empieza en la última cantidad escrita y, si no la hay,
  en el lote del mercado. <code>widget.startBracket(side, size)</code> también recibe un tamaño: un bracket
  dimensionado por su riesgo no tiene campo. <code>bracketQuantity(bracket, size)</code> es la misma cuenta para
  tu propio código.
</p>
<p>
  Con un adaptador de ejecución conectado, el gráfico también envía un bracket confirmado al
  adaptador como una sola orden: la entrada, limitada cuando el precio tiene que volver a ella y stop cuando tiene
  que seguir hasta ella, su cantidad, y su stop-loss y take-profit en ella. Cuando el adaptador la acepta, el
  gráfico envía <code>bracketOrder</code> con la orden. Si el adaptador la rechaza, envía
  <code>executionError</code> con <code>command: 'bracketPlace'</code>. Solo entonces el widget dice "colocado",
  y dice por qué cuando fue rechazado. Un bracket sin cantidad no se confirma, porque nadie ha visto un tamaño que
  colocar: <code>confirmBracket()</code> devuelve false, y el bracket se queda en el gráfico hasta recibir una.
  Uno confirmado antes de que el gráfico tenga un precio con el que distinguir una entrada limitada de una stop no
  se envía. <code>executionError</code> da el <code>reason</code> (<code>'noQuantity'</code>,
  <code>'noPrice'</code>), y el widget lo dice. Una app que coloca por su cuenta el bracket del evento conecta con
  <code>brackets: 'event'</code>: el bracket se queda entonces en un evento, y el widget dice que se confirmó.
  Antes de la 3.0 ese era el comportamiento por defecto (consulta
  <a href={href('/docs/migration-3')}>Migrar a la 3.0</a>).
</p>
<pre><code>{`chart.startBracket('buy')          // entry defaults to the latest close
chart.startBracket('sell', 64_800) // or pin the entry price

chart.startBracket('buy', undefined, { quantity: 2 })                   // for two
chart.startBracket('buy', undefined, { risk: 50, quantityStep: 0.001 }) // for what loses 50 at the stop
chart.setBracketSize({ quantity: 3 })   // while it is placed
chart.getBracket()                      // { side, entry, stopLoss, takeProfit, quantity } or null

chart.on('bracketPlace', (e) => {
  const { side, entry, stopLoss, takeProfit, quantity, riskReward } = e.payload
  // with no adapter (or brackets: 'event'): submit to your OMS, then reflect fills back via chart.setOrders/setPositions
})

// The connected adapter places it
chart.connectExecution(broker)
chart.placesBrackets()   // true
chart.on('bracketOrder', (e) => console.log(e.payload.order.id))
// chart.connectExecution(broker, { brackets: 'event' })   // only the event: your code places it

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
<p>
  La escalera es una página del panel lateral junto al gráfico (una hoja en el móvil): ábrela desde el menú
  Operar, su botón en el riel o <code>widget.openPanel('depthLadder')</code>, y quita su botón con
  <code>dock.depthLadder: false</code>. Las ventas quedan sobre las compras con el diferencial entre ellas, cada tamaño
  sobre una barra que crece desde el precio; las filas donde esperan tus órdenes llevan su cantidad.
</p>
<pre><code>{`const widget = new ChartWidget(host, { depthLadder: true })
widget.openPanel('depthLadder')   // a page of the dock; the Trade menu opens it too

widget.setDepth({
  bids: [{ price: 64_190, volume: 3.1 }, { price: 64_185, volume: 5.4 }],
  asks: [{ price: 64_205, volume: 2.0 }, { price: 64_210, volume: 8.7 }],
})

widget.getChart().on('orderPlace', (e) => {
  // { side, type: 'limit', price } — submit to your backend
})`}</code></pre>

<h2>El libro de órdenes en el gráfico</h2>
<p>
  <code>features.depth</code> dibuja el libro de órdenes en el área del gráfico, desde el borde derecho, para un gráfico que solo muestra
  precios: no necesita órdenes ni interfaz de trading y funciona con <code>trading: false</code>. Aliméntalo con
  <code>chart.setDepthData</code> (<code>widget.setDepth</code> también lo hace); la superposición se activa con
  <code>features.depth</code> y <code>setDepthOverlay</code> cambia su aspecto.
</p>
<ul>
  <li><code>mode</code>: <code>'cumulative'</code> (por defecto) suma cada nivel a los más cercanos al mercado, así que las barras crecen al alejarse; <code>'level'</code> dibuja solo el tamaño de cada precio, así que un muro se ve como una barra larga.</li>
  <li><code>rowSize</code>: la altura de una barra en precio. Los niveles se suman en filas separadas por esa distancia, así que un libro denso en una escala gruesa, o uno con niveles vacíos, se dibuja con barras iguales (ajústalo a las filas de tu footprint). Entonces <code>markBest</code> marca el centro de las mejores filas.</li>
  <li><code>rowOrigin</code>: dónde empiezan las filas, en precio. La fila k va entonces de <code>rowOrigin + k × rowSize</code> al inicio de la siguiente, y un nivel justo en el inicio de una fila queda en ella. Un footprint cuyas celdas empiezan en múltiplos de su tamaño de fila, con cada tick centrado en su precio, se alinea con <code>rowOrigin: -tick / 2</code>. Sin él, cada fila se centra en un múltiplo de <code>rowSize</code>.</li>
  <li><code>markBest</code>: una línea en el mejor bid y en el mejor ask (<code>bestBidColor</code>, <code>bestAskColor</code>).</li>
  <li><code>maxWidth</code>: la barra más larga en píxeles (nunca más que el área del gráfico), <code>bidColor</code>, <code>askColor</code>.</li>
</ul>
<p>
  Las barras quedan sobre las velas más recientes. Para dejar sitio, sube <code>rightMargin</code> y pon <code>maxWidth</code>
  en torno a ese número de barras. Con el trading activado, <code>{`setTradingConfig({ depthOverlay: { enabled: true } })`}</code> sigue activándola como antes.
</p>
<pre><code>{`const chart = new Chart(host, {
  features: { trading: false, depth: true },       // display only: no orders, no trading UI
  depthOverlay: { mode: 'level', markBest: true, maxWidth: 140 },
  rightMargin: 14,                                  // empty slots past the newest bar, room for the bars
})
chart.setDepthData(orderBook)                       // { bids, asks }; null clears it
chart.setDepthOverlay({ mode: 'cumulative' })       // change the look later`}</code></pre>

<h2>Mapa de calor de liquidez</h2>
<p>
  Acumula instantáneas del libro de órdenes en un mapa de calor detrás de las
  velas: cada instantánea es una franja vertical en la que el tamaño en espera se
  ilumina por nivel de precio (compras en verde, ventas en rojo). Los muros de
  liquidez que persisten en el tiempo destacan. Actívalo desde la hoja de
  configuración (o con <code>chart.setDepthHeatmapVisible</code>);
  <code>widget.setDepth</code> registra una instantánea en cada actualización del
  libro.
  Durante una repetición, un libro registrado sin hora pertenece a la última vela de la serie en vivo, el
  mapa de calor muestra solo los libros de las velas que la repetición ya mostró, y el libro de órdenes del
  borde del gráfico, el del mercado en vivo, se oculta hasta que termina la repetición.
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

<h2>Marcas</h2>
<p>
  Lo que ocurrió en un momento (un titular, una fecha de resultados, un dividendo, un split) como
  un pequeño distintivo al pie del panel de precios, sobre la barra que contiene ese momento. El
  puntero sobre un distintivo lee su título y su texto; los distintivos que se solaparían se reúnen
  en uno con un contador. Un replay muestra cada marca cuando llega a ella. Renko, Kagi, line break,
  punto y figura y las barras de rango no dibujan ninguna: sus barras no son tiempos.
</p>
<pre><code>{`chart.setMarks([
  { id: 'q3', time: reportedAt, kind: 'earnings', title: 'Q3 earnings', text: 'EPS 1.42 vs 1.31 expected' },
  { id: 'div', time: exDate, kind: 'dividend', title: 'Dividend 0.24 a share' },
  { id: 'n1', time: publishedAt, kind: 'news', title: headline, text: source, url: 'https://example.com/story' },
])
const id = chart.addMark({ time: Date.now(), title: 'Trading halted', label: 'H', color: '#e5484d' })
chart.removeMark('div')
chart.getMarks()      // earliest first
chart.clearMarks()

chart.on('markClick', (e) => openStory(e.payload.marks))   // one mark, or the several a badge gathers
// a click on a badge is a markClick, not a click or a barClick
chart.on('markHover', (e) => e.payload.marks)              // null: the pointer left the badge
chart.on('marksChange', (e) => e.payload.count)

new Chart(host, { features: { marks: false } })            // or chart.setFeatures({ marks: false })`}</code></pre>
<p>
  <code>kind</code> elige la letra y el color: <code>news</code> N, <code>earnings</code> E,
  <code>dividend</code> D, <code>split</code> S, y <code>event</code> (o ninguno) i.
  <code>label</code> (uno o dos caracteres) y <code>color</code> los sustituyen. Una marca necesita
  <code>title</code> y <code>time</code>; solo se conservan enlaces http(s); un gráfico guarda hasta
  2.000. Las marcas son del feed, no del usuario: <code>saveState</code> no las guarda, así que
  vuelve a ponerlas tras cargar un estado.
</p>
<p>
  ChartWidget pone los titulares del símbolo en el gráfico desde su fuente de noticias
  (<code>news</code>, o <code>fetchNews</code> del adaptador); <code>newsMarks: false</code> los
  deja solo en el panel de información del símbolo. Un clic en una marca abre su enlace en una
  pestaña nueva; en un distintivo con varias, una lista, la más reciente primero. El interruptor de
  función <code>marks</code> del widget oculta todas las marcas. Tus propios <code>setMarks</code> y
  <code>clearMarks</code> dejan los titulares del widget en el gráfico.
</p>

<h2>Zonas de operación</h2>
<p>Visualiza rectángulos de entrada → salida coloreados según el P&amp;L y con distintivos de dirección.</p>
<pre><code>{`chart.addTradeZone({
  id: 'tz-1',
  direction: 'long',
  entryTime: openedAt,
  exitTime: closedAt,
  entryPrice: 65_100,
  exitPrice: 65_800,
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
