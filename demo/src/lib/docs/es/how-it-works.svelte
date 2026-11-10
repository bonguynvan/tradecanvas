<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';
  import Diagram, { type DiagramWords } from '../Diagram.svelte';
  import { DATA_FLOW, REPLAY, WIDGET_PARTS } from '../diagrams';

  const { href } = useI18n();

  const dataSteps = [
    { nodes: ['feed', 'adapter', 'stream'], title: 'Entran las velas', text: 'A un DataFeed se le pide el histórico (getBars) y se le suscribe para las velas en vivo; un DataAdapter, como BinanceAdapter, lo envía todo como eventos. StreamManager convierte un feed en un adapter, remuestrea al intervalo del gráfico y construye velas a partir de ticks.' },
    { nodes: ['chart', 'stream', 'code'], title: 'El gráfico las recibe', text: 'chart.connect() escucha los eventos snapshot, barUpdate, barClose y barCorrection. Tu propio código escribe las mismas velas con setData, appendBar, updateLastBar o updateBar, sin necesidad de ningún feed.' },
    { nodes: ['store', 'chart'], title: 'Un solo almacén', text: 'Toda escritura pasa por SeriesStore. Guarda las velas que se muestran, la serie completa mientras se ocultan las velas fuera de horario y la serie en vivo apartada durante una repetición, y le dice al gráfico qué hizo cada escritura.' },
    { nodes: ['display', 'store', 'indicators', 'fit'], title: 'Se calcula lo que se dibuja', text: 'DisplaySeries construye lo que dibuja el tipo de gráfico (Heikin Ashi, Renko, Kagi…), en caché hasta que cambian las velas. IndicatorEngine recalcula solo desde la primera vela que cambió. PriceFit ajusta la escala de precios y PaneLayout da tamaño a los paneles.' },
    { nodes: ['viewport', 'input', 'fit'], title: 'La vista', text: 'Viewport guarda qué velas se ven, qué ancho tiene cada una y cuánto se ha desplazado. Arrastrar, la rueda y las teclas la desplazan y la amplían a través de InteractionManager.' },
    { nodes: ['engine', 'display', 'indicators', 'viewport', 'scene', 'top'], title: 'Un fotograma', text: 'RenderEngine marca las capas que cambiaron y las dibuja en el siguiente fotograma de animación; los ticks en vivo se agrupan antes, así que una ráfaga es un solo fotograma. El canvas scene tiene la cuadrícula, las series, los indicadores, los dibujos y los ejes; el canvas top, la cruz y la leyenda, así que mover el puntero solo redibuja ese. Con renderer: \'webgl\', un canvas de GPU dibuja debajo las velas y el volumen.' },
    { nodes: ['events', 'chart'], title: 'De vuelta a tu app', text: 'El gráfico informa mediante eventos: crosshairMove, dataUpdate, visibleRangeChange, symbolChange y los demás, listados en la referencia de la API.' },
  ];

  const widgetSteps = [
    { nodes: ['widget'], title: 'Una clase pública', text: 'ChartWidget guarda los métodos públicos y la puesta en marcha. Su constructor es una lista de pasos en el orden en que las partes se necesitan: readOptions, buildRoot, buildToolbar, buildBody, buildChart … finishSetup.' },
    { nodes: ['areas', 'hosts', 'widget'], title: 'Áreas, cada una a través de un host', text: 'La repetición, el trading, las alertas, las comparaciones, las listas de seguimiento, la leyenda, los menús, los comandos, los layouts, el dock, Chart Settings, la edición de dibujos y los intervalos son clases propias. Cada una recibe una interfaz host que enumera exactamente lo que usa del widget, y un método público de ChartWidget pasa la llamada a su área.' },
    { nodes: ['chart', 'areas'], title: 'Un gráfico', text: 'buildChart crea el único Chart que envuelve el widget. Cada área llega a él a través de su host; ninguna tiene un gráfico propio. El widget escucha los eventos del gráfico para mantener al día la barra de herramientas y la leyenda.' },
    { nodes: ['signals', 'ui', 'widget'], title: 'Signals', text: 'El estado que muestran varias partes es un signal: el tema (look), qué botones de la barra están abiertos (openRoles) y Chart Settings. Un effect actualiza todo lo que lo muestra, así que quien escribe nunca llama a cada actualización a mano.' },
    { nodes: ['dialogs', 'overlay', 'widget'], title: 'Diálogos al abrirse por primera vez', text: 'Los diálogos grandes, el de indicadores, la paleta de comandos y la búsqueda de símbolos están en DIALOGS y cargan su código la primera vez que se abren. Se abren en overlayHost, que pasa dentro del widget en pantalla completa.' },
  ];

  const replaySteps = [
    { nodes: ['ui'], title: 'Elegir una vela', text: 'El botón de repetición abre la barra de repetición; hacer clic en una vela, o llamar a replayFrom(), elige dónde empieza.' },
    { nodes: ['chart', 'store', 'manager'], title: 'Empezar', text: 'chart.replayStart() hace que SeriesStore aparte las velas en vivo y luego carga las velas a reproducir en ReplayManager, que espera en pausa al principio.' },
    { nodes: ['manager', 'chart', 'store'], title: 'Paso a paso', text: 'Reproducir, pausar, avanzar o retroceder una vela y la velocidad van a ReplayManager. Cada paso envía un evento bar; el gráfico muestra las velas hasta ahí (showReplayed, o appendReplayed al avanzar).' },
    { nodes: ['indicators', 'store', 'paper', 'chart'], title: 'Lo que sigue a la repetición', text: 'Los indicadores se recalculan desde la vela que cambió, la línea de precio muestra el cierre reproducido y una cuenta de papel opera a los precios reproducidos. Las órdenes y alertas de una cuenta real siguen en vivo.' },
    { nodes: ['stop', 'store', 'ui'], title: 'Terminar', text: 'En la última vela la repetición se pausa. Al salir se llama a replayStop(): SeriesStore devuelve la serie en vivo y el gráfico vuelve a estar en vivo.' },
  ];

  const dataWords: DiagramWords = {
    code: { title: 'tu código' },
    stream: { note: 'remuestreo · TickAggregator' },
    store: { note: 'visible · completa · aparte' },
    display: { note: 'según el tipo de gráfico' },
    engine: { note: 'capas cambiadas · rAF' },
    scene: { title: 'canvas scene', note: 'series · ejes · dibujos' },
    top: { title: 'canvas top', note: 'cruz · leyenda' },
    input: { title: 'ratón · rueda · teclas' },
  };

  const widgetWords: DiagramWords = {
    widget: { note: 'API pública · puesta en marcha' },
    hosts: { note: 'una interfaz por área' },
    dialogs: { note: 'LazyPart · al abrir' },
    ui: { title: 'barra · tema', note: 'un effect cada uno' },
    areas: { title: 'áreas Widget…', note: 'Replay · Trading · Alerts…' },
    overlay: { note: 'portal · pantalla completa' },
    chart: { note: 'uno por widget' },
  };

  const replayWords: DiagramWords = {
    ui: { note: 'toggleReplay · clic en vela' },
    store: { note: 'serie en vivo aparte' },
    paper: { title: 'cuenta de papel' },
  };
</script>

<svelte:head>
  <title>Cómo funciona — Documentación de TradeCanvas</title>
  <meta name="description" content="Cómo funciona TradeCanvas por dentro: las velas desde una fuente de datos hasta la pantalla, de qué está hecho ChartWidget y cómo se ejecuta una repetición de velas. Tres diagramas con los nombres del código." />
</svelte:head>

<h1>Cómo funciona</h1>
<p>Tres diagramas de la biblioteca vista por dentro, con los nombres que usa el código, para que encuentres
  cada pieza en el fuente. Pasa el puntero por un paso, o llega a él con Tab, para ver las cajas de las que habla.
  No necesitas nada de esto para usar el gráfico; ayuda cuando escribes una fuente de datos, un plugin o un cambio
  en la propia biblioteca.</p>

<h2 id="data-flow">De una fuente de datos a la pantalla</h2>
<p>Una vela recorre el mismo camino tanto si viene de un exchange como de tu propio código, y un único
  almacén la guarda. Todo lo que se dibuja se calcula a partir de ese almacén y de la vista.</p>
<Diagram {...DATA_FLOW} label="Las velas desde una fuente de datos hasta los dos canvas, a través de SeriesStore" steps={dataSteps} words={dataWords} />
<p>Cómo escribir tu propia fuente, en <a href={href('/docs/realtime')}>Tiempo real y repetición</a>; el
  coste de cada fotograma, en <a href={href('/docs/performance')}>Rendimiento</a>.</p>

<h2 id="widget">De qué está hecho ChartWidget</h2>
<p><code>ChartWidget</code> es toda la pantalla de trading alrededor de un <code>Chart</code>. Sus partes
  son clases pequeñas que solo ven lo que se les entrega.</p>
<Diagram {...WIDGET_PARTS} label="ChartWidget, sus áreas, signals y diálogos, alrededor de un Chart" steps={widgetSteps} words={widgetWords} />

<h2 id="replay">Una repetición de velas</h2>
<p>Una repetición reproduce el pasado vela a vela en el mismo gráfico, con las velas en vivo apartadas hasta que termina.</p>
<Diagram {...REPLAY} label="Una repetición de velas, desde el primer clic hasta volver al gráfico en vivo" steps={replaySteps} words={replayWords} />
<p>Las opciones y los eventos están en <a href={href('/docs/realtime')}>Tiempo real y repetición</a>.</p>
