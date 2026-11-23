<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Migrar a la 3.0 — Documentación de TradeCanvas</title>
  <meta name="description" content="Lo que cambia para tu código entre TradeCanvas 2.x y 3.0: cada comportamiento que ha cambiado y la opción que conserva el anterior. La 3.0 está en desarrollo en su propia rama." />
</svelte:head>

<h1>Migrar a la 3.0</h1>
<p>
  La 3.0 está en desarrollo en la rama <code>3.0</code>: todavía no está en npm, y esta página crece con ella. Recoge
  cada cambio que puede romper código escrito para la 2.x y qué hacer al respecto. Para pasar de la 1.x a la 2.0,
  consulta <a href={href('/docs/migration')}>Migrar a la 2.0</a>.
</p>

<h2 id="behaviour">Comportamiento que ha cambiado</h2>

<h3 id="brackets">Un bracket confirmado se envía al adaptador de ejecución</h3>
<p>
  Con un adaptador de ejecución conectado (<code>chart.connectExecution(adapter)</code>), un bracket confirmado se
  envía ahora al adaptador como una sola orden: la entrada con su cantidad, su stop-loss y su take-profit. En la 2.x
  se quedaba en el evento <code>bracketPlace</code>, salvo que el adaptador se conectara con
  <code>brackets: 'place'</code>, y el gráfico avisaba una vez en la consola de que no se había enviado.
</p>
<ul>
  <li>
    <strong>Tu código coloca por su cuenta el bracket del evento.</strong> Conecta con
    <code>brackets: 'event'</code>, o el bracket se colocará dos veces: una por el gráfico y otra por ti.
  </li>
  <li>
    <strong>Pasabas <code>brackets: 'place'</code>.</strong> No hay nada que hacer; la opción se puede quitar.
  </li>
  <li>
    <strong>Sin adaptador conectado.</strong> No cambia nada: el bracket es el evento <code>bracketPlace</code>.
  </li>
</ul>
<pre><code>{`// 2.x: un evento, salvo que se pida      // 3.0: una orden, salvo que se pida
chart.connectExecution(broker)             chart.connectExecution(broker, { brackets: 'event' })
chart.connectExecution(broker, { brackets: 'place' })   →   chart.connectExecution(broker)`}</code></pre>
<p>
  Un bracket se envía con la cantidad que le da su tamaño. Uno sin cantidad no se confirma: se queda en el gráfico, y
  <code>executionError</code> lo indica (<code>reason: 'noQuantity'</code>). La barra de bracket del widget tiene
  ahora un campo de cantidad, así que los brackets que inicia su barra de herramientas la tienen; un bracket que
  inicia tu código recibe un tamaño como tercer argumento (consulta <a href={href('/docs/trading')}>Trading</a>):
</p>
<pre><code>{`chart.startBracket('buy', undefined, { quantity: 2 })
chart.startBracket('buy', undefined, { risk: 50 })   // la cantidad que pierde 50 en el stop`}</code></pre>

<h3 id="trade-buttons">Vender y Comprar aparecen en el gráfico con un adaptador de ejecución</h3>
<p>
  Con un adaptador de ejecución conectado y el ticket de orden activo, el widget muestra ahora Vender y Comprar bajo la
  leyenda del gráfico. Un host que conecta un adaptador solo para dibujar sus órdenes y posiciones los apaga:
</p>
<pre><code>{`new ChartWidget(el, { features: { tradeButtons: false } });`}</code></pre>
<p>
  Con <code>orderTicket</code> apagado, o sin adaptador, nunca aparecen. Un host que apaga por su nombre cada interruptor
  de órdenes tiene uno más que nombrar: <code>tradeButtons</code> es nuevo, y está encendido si no se indica.
</p>

<h3 id="stop-limit">La cuenta de simulación ejecuta una stop-limit dentro de su límite</h3>
<p>
  <code>PaperExecutionAdapter</code> ejecutaba una orden <code>stopLimit</code> en su stop, como una orden stop.
  Ahora, cuando el precio alcanza el stop, pasa a ser una orden limitada a su <code>price</code>: la orden sigue
  activa (su tipo pasa a <code>'limit'</code>) hasta que el precio está dentro del límite. Una prueba que esperaba
  una posición en cuanto se alcanzaba el stop debe llevar antes el precio dentro del límite, o usar una orden
  <code>'stop'</code>.
</p>

<h3 id="hand-prices">Un precio fijado a mano queda en la rejilla del mercado</h3>
<p>
  <code>orderModify</code>, <code>positionModify</code>, <code>bracketPlace</code>, el <code>orderPlace</code> de una orden en borrador o del
  menú del botón derecho, <code>priceAxisAdd</code> y <code>chartContextMenu</code> llevaban el precio bajo el puntero tal como lo da un píxel
  (<code>62549.71592675613</code>). Ahora lo llevan en el paso de precio del mercado; si no, en los decimales que muestra el eje de
  precios: lo que da <code>chart.roundPrice</code>. Un bracket y una orden en borrador también empiezan en la rejilla, sea cual sea el precio con que se inicien, y una alerta arrastrada queda en ella. Una línea soltada en el mismo paso en que estaba no avisa de nada. El código que
  redondeaba estos precios puede dejar de hacerlo.
  En un mercado con techo y suelo para el día, el precio propio de una orden también se mantiene dentro: arrastrada más allá, se comunica en el límite.
</p>

<h3 id="finger">Bajo un dedo, ningún control mide menos de 32 px</h3>
<p>
  En un dispositivo cuyo puntero principal es grueso (un teléfono, una tableta), los controles del widget miden ahora
  al menos 32 px por lado, en cualquier aspecto y <code>density</code>: un widget <code>compact</code> en una tableta ya no
  tiene botones de 24 px, y cada fila de la leyenda de indicadores mide 32 px de alto donde medía 20. Bajo un ratón el
  dibujo queda como estaba y solo cambia lo que toma una pulsación: al menos 20 px por lado. Una página que medía las
  partes del widget en una pantalla táctil (la altura de una leyenda, la de un diálogo) lee números mayores.
</p>

<h3 id="order-answer">Una orden del ticket espera la respuesta del adaptador</h3>
<p>
  Con un adaptador de ejecución conectado, el ticket de orden ya no se cierra al enviar: espera a que el
  <code>placeOrder</code> del adaptador resuelva (se cierra) o rechace (se queda y dice por qué). Un adaptador cuyo
  <code>placeOrder</code> nunca termina deja el ticket esperando: resuelve con la orden o rechaza con el motivo. Con esto
  cambiaron tres cosas más. Todo payload de <code>orderPlace</code> lleva ahora un <code>clientOrderId</code>, y
  <code>placeOrderIntent</code> devuelve la orden tal como se envió (no devolvía nada). Una orden de mercado del ticket
  lleva como <code>price</code> el ask en una compra y el bid en una venta, cuando el feed da ambos (era el último precio).
  Y una orden pedida con una sola pulsación, desde el menú del botón derecho o la escalera de profundidad, es por el lote
  del mercado donde lo hay (era por 1, y la de la escalera no llevaba cantidad).
</p>

<h3 id="orders-by-symbol">Órdenes, posiciones y ejecuciones se dibujan en su propio símbolo</h3>
<p>
  Una orden, una posición o una ejecución que nombra su <code>symbol</code> se dibuja solo mientras el gráfico
  muestra ese símbolo. En otro se guarda: <code>getOrders()</code>, <code>getPositions()</code> y
  <code>getFills()</code> dan toda la cuenta, y <code>chart.getSymbol()</code> dice cuáles se dibujan. El gráfico
  nombra ahora el símbolo que muestra en cada carga de <code>orderPlace</code> y la cuenta de simulación lo
  conserva, así que una posición abierta en un símbolo ya no se dibuja en el siguiente, como antes, con un
  resultado calculado con el precio equivocado. Lo que no nombra símbolo se dibuja en todos los símbolos, como
  antes: un adaptador propio para una cuenta de varios símbolos lo nombra en sus órdenes, posiciones y ejecuciones.
</p>
<p>
  Con esto cambiaron tres cosas. Cada ejecución que dan <code>executionFill</code> y <code>getFills()</code> tiene
  un <code>symbol</code> cuando el gráfico muestra uno, y <code>ChartWidget</code> ya no olvida las ejecuciones al
  cambiar de símbolo: el historial y el resultado realizado son de la cuenta, y las marcas vuelven con su símbolo.
  <code>setMarkPrice</code> recibe el símbolo como tercer argumento, que el gráfico da en una repetición: con
  precios que nombran su símbolo, la cuenta de simulación trabaja y valora cada símbolo con el suyo; con precios
  que no nombran ninguno, es un solo mercado, como era. Y con barras puestas a mano el gráfico no conoce ningún
  símbolo hasta que se le dice: <code>chart.setSymbol(symbol)</code>, que <code>ChartWidget</code> llama por sí
  mismo.
<h3 id="hold-tooltip">Mantener pulsado sobre el gráfico muestra la ventana de precio</h3>
<p>
  En <code>ChartWidget</code>, mantener el botón del ratón quieto sobre el área del gráfico durante medio segundo muestra
  la información OHLCV flotante de la barra bajo el cursor, hasta soltar el botón: sigue al cursor y el gráfico no se
  desplaza mientras tanto. Una pulsación tan larga ya no es, por tanto, un clic ni el comienzo de un desplazamiento. La
  función <code>crosshairTooltip</code> del widget es ahora <code>'hold'</code>, donde era <code>false</code>: pasa
  <code>{`chartOptions: { features: { crosshairTooltip: false } }`}</code> para no tener ventana, como antes, o
  <code>true</code> para tenerla bajo un cursor que solo pasa por encima. El <code>Chart</code> sin interfaz no cambia:
  su información sigue al cursor salvo que se indique otra cosa, y también acepta <code>'hold'</code>.
</p>

<h3 id="live-price">Las órdenes de una pulsación esperan un precio en vivo</h3>
<p>
  Con un feed propio (<code>adapter</code>), <code>ChartWidget</code> ya no envía una orden pedida con una sola
  pulsación (el menú del botón derecho, la escalera de profundidad), ni una orden bracket o un borrador confirmados,
  mientras ese feed no está conectado: dice por qué. Mientras el feed no está conectado, o no ha enviado nada en un
  minuto (<code>feedQuietAfter</code>), el ticket no envía órdenes a mercado, y la barra de estado dice «Sin
  actualizaciones de precio» donde decía «Live» sobre un stream detenido. Con <code>feedQuietAfter: 0</code> un feed
  conectado nunca se considera silencioso; un feed sin conexión retiene las órdenes igualmente.
</p>

<h3 id="confirmations">Las operaciones de una pulsación se confirman, y un bid de la escalera es precio de compra</h3>
<p>
  <code>ChartWidget</code> pregunta ahora antes de cerrar o invertir una posición (el panel de cuenta, los botones del
  gráfico) y antes de enviar una orden del menú del botón derecho o de la escalera de profundidad: salían con una sola
  pulsación. <code>confirmOrders: false</code> mantiene la pulsación única. En la escalera de profundidad, pulsar un
  bid coloca ahora una orden limitada de <strong>compra</strong> a ese precio, y pulsar un ask una limitada de
  <strong>venta</strong>, donde antes se vendía al bid y se compraba al ask: <code>orderPlace</code> lleva desde la
  misma celda el lado contrario al de antes. Una prueba o un script que pulsaba esas celdas, o esperaba una orden al
  instante, necesita el botón de la confirmación (<code>.tcw-confirm .tcw-done-btn</code>) o la opción.
</p>

<h2 id="types">Tipos que han crecido</h2>
<p>
  <code>TimeInForce</code> es ahora <code>'gtc' | 'day' | 'gtd' | 'ioc' | 'fok'</code>. El código que trata todos
  sus miembros (un <code>switch</code> sin default, un <code>Record&lt;TimeInForce, …&gt;</code>) necesita los tres
  nuevos; un adaptador de ejecución propio puede rechazar los que no acepte.
</p>
<p>
  <code>FillReason</code> tiene también <code>'liquidation'</code>, para una posición que la cuenta de simulación cerró en un
  stop-out, y <code>ExecutionEventType</code> tiene <code>'marginCall'</code>. Ninguno de los dos ocurre salvo que a la
  cuenta de simulación se le dé <code>stopOutLevel</code> o <code>marginCallLevel</code>, pero el código que trata todos los
  miembros los necesita.
</p>

<h2 id="unchanged">Sin cambios</h2>
<ul>
  <li>Los datos, y los diseños y ajustes guardados en la 2.x, se cargan como antes.</li>
  <li>Los indicadores, los dibujos, los temas y las claves de estilo conservan sus nombres.</li>
</ul>
