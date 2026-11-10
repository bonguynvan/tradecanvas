<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';
  import Diagram, { type DiagramWords } from '../Diagram.svelte';
  import { DATA_FLOW, REPLAY, WIDGET_PARTS } from '../diagrams';

  const { href } = useI18n();

  const dataSteps = [
    { nodes: ['feed', 'adapter', 'stream'], title: 'K 线进入', text: 'DataFeed 被请求历史数据（getBars）并被订阅以获取实时 K 线；DataAdapter（例如 BinanceAdapter）则以事件推送一切。StreamManager 把 feed 转换为 adapter，按图表的周期重新采样，并由 tick 生成 K 线。' },
    { nodes: ['chart', 'stream', 'code'], title: '图表接收', text: 'chart.connect() 监听 snapshot、barUpdate、barClose 和 barCorrection 事件。你自己的代码用 setData、appendBar、updateLastBar 或 updateBar 写入同样的 K 线，完全不需要 feed。' },
    { nodes: ['store', 'chart'], title: '一个存储', text: '每次写入都经过 SeriesStore。它保存当前显示的 K 线、隐藏盘外 K 线时的完整序列，以及回放期间搁置的实时序列，并告诉图表每次写入做了什么。' },
    { nodes: ['display', 'store', 'indicators', 'fit'], title: '计算出要绘制的内容', text: 'DisplaySeries 生成当前图表类型要绘制的序列（平均 K 线、砖形图、卡吉图……），在 K 线变化前一直缓存。IndicatorEngine 只从第一根变化的 K 线开始重新计算。PriceFit 适配价格刻度，PaneLayout 确定各窗格的大小。' },
    { nodes: ['viewport', 'input', 'fit'], title: '视图', text: 'Viewport 记录哪些 K 线可见、每根有多宽以及滚动到了哪里。拖动、滚轮和按键通过 InteractionManager 滚动和缩放它。' },
    { nodes: ['engine', 'display', 'indicators', 'viewport', 'scene', 'top'], title: '一帧', text: 'RenderEngine 标记发生变化的图层，并在下一个动画帧中绘制；实时 tick 会先被合并，所以一阵突发只算一帧。scene 画布包含网格、序列、指标、绘图和坐标轴；top 画布包含十字光标和图例，所以移动指针只会重绘它。使用 renderer: \'webgl\' 时，下方由一个 GPU 画布绘制 K 线和成交量。' },
    { nodes: ['events', 'chart'], title: '回到你的应用', text: '图表通过事件报告：crosshairMove、dataUpdate、visibleRangeChange、symbolChange 等，完整列表见 API 参考。' },
  ];

  const widgetSteps = [
    { nodes: ['widget'], title: '一个公开类', text: 'ChartWidget 保留公开方法和初始化。它的构造函数是一串步骤，按各部分相互依赖的顺序排列：readOptions、buildRoot、buildToolbar、buildBody、buildChart … finishSetup。' },
    { nodes: ['areas', 'hosts', 'widget'], title: '每个区域通过一个 host', text: '回放、交易、提醒、对比、自选列表、图例、菜单、命令、布局、停靠栏、Chart Settings、绘图编辑和周期都是独立的类。每个类得到一个 host 接口，准确列出它从 widget 使用的内容；ChartWidget 上的公开方法再转交给对应的区域。' },
    { nodes: ['chart', 'areas'], title: '一个图表', text: 'buildChart 创建 widget 包裹的唯一一个 Chart。每个区域都通过自己的 host 访问它，没有区域拥有自己的图表。widget 监听图表事件，让工具栏和图例保持同步。' },
    { nodes: ['signals', 'ui', 'widget'], title: 'Signal', text: '多个部分共同显示的状态是一个 signal：主题（look）、工具栏中哪些按钮处于打开状态（openRoles）以及 Chart Settings。一个 effect 更新所有显示它的地方，写入方无需逐一调用更新。' },
    { nodes: ['dialogs', 'overlay', 'widget'], title: '对话框首次打开时加载', text: '较大的对话框、指标对话框、命令面板和代码搜索都在 DIALOGS 中，第一次打开时才加载代码。它们在 overlayHost 中打开，全屏时 overlayHost 会移到 widget 内部。' },
  ];

  const replaySteps = [
    { nodes: ['ui'], title: '选择一根 K 线', text: '回放按钮打开回放栏；点击一根 K 线或调用 replayFrom() 来选择回放的起点。' },
    { nodes: ['chart', 'store', 'manager'], title: '开始', text: 'chart.replayStart() 让 SeriesStore 把实时 K 线搁置，然后把要播放的 K 线载入 ReplayManager，它在起点暂停等待。' },
    { nodes: ['manager', 'chart', 'store'], title: '逐步', text: '播放、暂停、前进或后退一步以及速度都交给 ReplayManager。每一步发出一个 bar 事件；图表显示到该处为止的 K 线（showReplayed，向前时用 appendReplayed）。' },
    { nodes: ['indicators', 'store', 'paper', 'chart'], title: '跟随回放的内容', text: '指标从变化的那根 K 线开始重新计算，价格线显示回放中的收盘价，模拟账户以回放价格成交。实盘账户的订单和提醒仍按实时行情运行。' },
    { nodes: ['stop', 'store', 'ui'], title: '结束', text: '到达最后一根 K 线时回放暂停。退出时调用 replayStop()：SeriesStore 放回实时序列，图表重新进入实时状态。' },
  ];

  const dataWords: DiagramWords = {
    code: { title: '你的代码' },
    stream: { note: '重新采样 · TickAggregator' },
    store: { note: '显示 · 完整 · 搁置' },
    display: { note: '按图表类型' },
    engine: { note: '脏图层 · rAF' },
    scene: { title: 'scene 画布', note: '序列 · 坐标轴 · 绘图' },
    top: { title: 'top 画布', note: '十字光标 · 图例' },
    input: { title: '指针 · 滚轮 · 按键' },
  };

  const widgetWords: DiagramWords = {
    widget: { note: '公开 API · 初始化' },
    hosts: { note: '每个区域一个接口' },
    dialogs: { note: 'LazyPart · 首次打开' },
    ui: { title: '工具栏 · 主题', note: '各一个 effect' },
    areas: { title: 'Widget… 区域', note: 'Replay · Trading · Alerts…' },
    overlay: { note: 'portal · 全屏' },
    chart: { note: '每个 widget 一个' },
  };

  const replayWords: DiagramWords = {
    ui: { note: 'toggleReplay · 点击 K 线' },
    store: { note: '实时序列搁置' },
    paper: { title: '模拟账户' },
  };
</script>

<svelte:head>
  <title>工作原理 — TradeCanvas 文档</title>
  <meta name="description" content="TradeCanvas 的内部工作方式：K 线如何从数据源到达屏幕，ChartWidget 由哪些部分组成，以及一次 K 线回放如何运行。三张图，使用代码中的名称。" />
</svelte:head>

<h1>工作原理</h1>
<p>三张从内部看这个库的图，使用代码中的名称，方便你在源码中找到每个部分。将指针移到某一步上，
  或用 Tab 键聚焦它，即可看到它涉及的方框。使用图表并不需要了解这些；当你编写数据源、插件或修改库本身时，
  它们会有帮助。</p>

<h2 id="data-flow">从数据源到屏幕</h2>
<p>无论 K 线来自交易所还是你自己的代码，它都走同一条路径，并由同一个存储保存。
  所有绘制的内容都由这个存储和视图计算得出。</p>
<Diagram {...DATA_FLOW} label="K 线经由 SeriesStore 从数据源到达两个画布" steps={dataSteps} words={dataWords} />
<p>编写自己的数据源见 <a href={href('/docs/realtime')}>实时数据与回放</a>；每帧的开销见
  <a href={href('/docs/performance')}>性能</a>。</p>

<h2 id="widget">ChartWidget 由什么组成</h2>
<p><code>ChartWidget</code> 是围绕一个 <code>Chart</code> 的完整交易界面。它的各个部分都是小类，
  每个只能看到交给它的东西。</p>
<Diagram {...WIDGET_PARTS} label="ChartWidget 及其区域、signal 和对话框，围绕一个 Chart" steps={widgetSteps} words={widgetWords} />

<h2 id="replay">一次 K 线回放</h2>
<p>回放在同一个图表上逐根重放过去的 K 线，实时 K 线则被搁置，直到回放结束。</p>
<Diagram {...REPLAY} label="一次 K 线回放，从第一次点击到回到实时图表" steps={replaySteps} words={replayWords} />
<p>选项和事件见 <a href={href('/docs/realtime')}>实时数据与回放</a>。</p>
