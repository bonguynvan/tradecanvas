<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';
  import Diagram from '../Diagram.svelte';
  import { DATA_FLOW, REPLAY, WIDGET_PARTS } from '../diagrams';

  const { href } = useI18n();

  const dataSteps = [
    { nodes: ['feed', 'adapter', 'stream'], title: 'Bars come in', text: 'A DataFeed is asked for history (getBars) and subscribed to for live bars; a DataAdapter, such as BinanceAdapter, pushes everything as events. StreamManager turns a feed into an adapter, resamples to the chart’s interval and builds bars from ticks.' },
    { nodes: ['chart', 'stream', 'code'], title: 'The chart takes them', text: 'chart.connect() listens for the snapshot, barUpdate, barClose and barCorrection events. Your own code writes the same bars with setData, appendBar, updateLastBar or updateBar, and needs no feed at all.' },
    { nodes: ['store', 'chart'], title: 'One store', text: 'Every write goes through SeriesStore. It keeps the bars shown, the whole series while out-of-hours bars are hidden, and the live series set aside during a replay, and tells the chart what each write did.' },
    { nodes: ['display', 'store', 'indicators', 'fit'], title: 'What is drawn is worked out', text: 'DisplaySeries builds what the chart type draws (Heikin Ashi, Renko, Kagi…), cached until the bars change. IndicatorEngine recomputes only from the first bar that changed. PriceFit fits the price scale and PaneLayout sizes the panes.' },
    { nodes: ['viewport', 'input', 'fit'], title: 'The view', text: 'Viewport holds which bars are visible, how wide each is and how far it is scrolled. Dragging, the wheel and the keys scroll and zoom it through InteractionManager.' },
    { nodes: ['engine', 'display', 'indicators', 'viewport', 'scene', 'top'], title: 'A frame', text: 'RenderEngine marks the layers that changed and draws them in the next animation frame; live ticks are gathered first, so a burst is one frame. The scene canvas holds the grid, series, indicators, drawings and axes; the top canvas holds the crosshair and legend, so moving the pointer redraws only that one. With renderer: \'webgl\', a GPU canvas draws the candles and volume underneath.' },
    { nodes: ['events', 'chart'], title: 'Back to your app', text: 'The chart reports through events: crosshairMove, dataUpdate, visibleRangeChange, symbolChange and the rest, listed in the API reference.' },
  ];

  const widgetSteps = [
    { nodes: ['widget'], title: 'One public class', text: 'ChartWidget keeps the public methods and the setup. Its constructor is a list of steps in the order the parts need each other: readOptions, buildRoot, buildToolbar, buildBody, buildChart … finishSetup.' },
    { nodes: ['areas', 'hosts', 'widget'], title: 'Areas, each through a host', text: 'Replay, trading, alerts, compares, watchlists, the legend, menus, commands, layouts, the dock, Chart Settings, drawing editing and intervals are classes of their own. Each is given a host interface that lists exactly what it uses from the widget, and a public method on ChartWidget hands on to its area.' },
    { nodes: ['chart', 'areas'], title: 'One chart', text: 'buildChart makes the one Chart the widget wraps. Every area reaches it through its host; none owns a chart of its own. The widget listens to the chart’s events to keep the toolbar and legend in step.' },
    { nodes: ['signals', 'ui', 'widget'], title: 'Signals', text: 'State that several parts show is a signal: the theme (look), which toolbar buttons are open (openRoles) and the Chart Settings. One effect updates whatever shows it, so a writer never calls each update by hand.' },
    { nodes: ['dialogs', 'overlay', 'widget'], title: 'Dialogs when first opened', text: 'The larger dialogs, the indicators dialog, the command palette and the symbol search are in DIALOGS and load their code the first time they open. They open in overlayHost, which moves inside the widget in fullscreen.' },
  ];

  const replaySteps = [
    { nodes: ['ui'], title: 'Pick a bar', text: 'The replay button opens the replay bar; clicking a bar, or calling replayFrom(), picks where the replay starts.' },
    { nodes: ['chart', 'store', 'manager'], title: 'Start', text: 'chart.replayStart() has SeriesStore set the live bars aside, then loads the bars to play into ReplayManager, which waits paused at the start.' },
    { nodes: ['manager', 'chart', 'store'], title: 'Step', text: 'Play, pause, step forward or back and the speed go to ReplayManager. Each step sends a bar event; the chart shows the bars up to it (showReplayed, or appendReplayed going forward).' },
    { nodes: ['indicators', 'store', 'paper', 'chart'], title: 'What follows the replay', text: 'Indicators recompute from the bar that changed, the price line shows the replayed close, and a paper account trades at the replayed prices. Orders and alerts on a live account stay live.' },
    { nodes: ['stop', 'store', 'ui'], title: 'End', text: 'At the last bar the replay pauses. Leaving it calls replayStop(): SeriesStore puts the live series back and the chart is live again.' },
  ];
</script>

<svelte:head>
  <title>How it works — TradeCanvas docs</title>
  <meta name="description" content="How TradeCanvas works inside: bars from a feed to the screen, what ChartWidget is made of, and how a bar replay runs. Three diagrams with the names used in the code." />
</svelte:head>

<h1>How it works</h1>
<p>Three diagrams of the library from the inside, with the names used in the code, so you can find
  each piece in the source. Point at a step, or tab to it, to see the boxes it is about. You don’t
  need any of this to use the chart; it helps when you write a feed, a plugin or a change to the
  library itself.</p>

<h2 id="data-flow">From a feed to the screen</h2>
<p>A bar takes the same path whether it comes from an exchange or from your own code, and one store
  holds it. Everything drawn is worked out from that store and the view.</p>
<Diagram {...DATA_FLOW} label="Bars from a data source to the two canvases, through SeriesStore" steps={dataSteps} />
<p>Write a source of your own in <a href={href('/docs/realtime')}>Realtime &amp; Replay</a>; the frame
  costs are in <a href={href('/docs/performance')}>Performance</a>.</p>

<h2 id="widget">What ChartWidget is made of</h2>
<p><code>ChartWidget</code> is the whole trading screen around one <code>Chart</code>. Its parts
  are small classes that see only what they are handed.</p>
<Diagram {...WIDGET_PARTS} label="ChartWidget, its areas, signals and dialogs, around one Chart" steps={widgetSteps} />

<h2 id="replay">A bar replay</h2>
<p>A replay plays the past bar by bar on the same chart, with the live bars kept aside until it ends.</p>
<Diagram {...REPLAY} label="A bar replay from the first click back to the live chart" steps={replaySteps} />
<p>The options and events are in <a href={href('/docs/realtime')}>Realtime &amp; Replay</a>.</p>
