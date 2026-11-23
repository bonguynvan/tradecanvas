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
