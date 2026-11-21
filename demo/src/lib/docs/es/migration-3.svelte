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
  Un bracket se envía con la cantidad que le da su tamaño. Uno sin cantidad no se envía, y
  <code>executionError</code> lo indica (<code>reason: 'noQuantity'</code>). La barra de bracket del widget tiene
  ahora un campo de cantidad, así que los brackets que inicia su barra de herramientas la tienen; un bracket que
  inicia tu código recibe un tamaño como tercer argumento (consulta <a href={href('/docs/trading')}>Trading</a>):
</p>
<pre><code>{`chart.startBracket('buy', undefined, { quantity: 2 })
chart.startBracket('buy', undefined, { risk: 50 })   // la cantidad que pierde 50 en el stop`}</code></pre>

<h2 id="unchanged">Sin cambios</h2>
<ul>
  <li>Los datos, y los diseños y ajustes guardados en la 2.x, se cargan como antes.</li>
  <li>Los indicadores, los dibujos, los temas y las claves de estilo conservan sus nombres.</li>
</ul>
