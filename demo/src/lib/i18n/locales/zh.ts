import type { SiteMessages } from '../messages';

/** 简体中文 */
const zh: SiteMessages = {
  meta: {
    title: 'TradeCanvas · 面向 Web 的 Canvas 交易图表',
    description:
      'TradeCanvas 是一个 Canvas2D 交易图表库：17 种图表类型、85 个指标、69 种画线工具、交易所实时行情、图表上下单、K线回放与回测。零依赖，MIT 许可。',
  },

  nav: {
    main: '主导航',
    docs: '文档',
    examples: '示例',
    playground: '演练场',
    changelog: '更新日志',
    toLight: '切换到浅色主题',
    toDark: '切换到深色主题',
    github: 'GitHub 上的 TradeCanvas',
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
    menu: '菜单',
    language: '语言',
  },

  footer: {
    tagline: '面向 Web 的 Canvas2D 交易图表。零依赖，MIT 许可。',
    library: '库',
    packages: '包',
    project: '项目',
    gettingStarted: '快速开始',
    apiReference: 'API 参考',
    examples: '示例',
    changelog: '更新日志',
    issues: '问题反馈',
    boGrid: 'bo-grid（数据表格）',
    builtWith: '基于 TradeCanvas 构建',
  },

  home: {
    release: '双画布渲染器，自由平移',
    title: '为交易应用打造的图表引擎。',
    ledeHtml:
      '从蜡烛图到 Renko，85 个指标、69 种画线工具、交易所实时行情，还能直接在图表上下单。基于 Canvas2D 绘制，零依赖。可以直接放入完整的 <code>ChartWidget</code>，也可以在无界面的 <code>Chart</code> 之上构建自己的界面。',
    getStarted: '开始使用',
    browseExamples: '浏览示例',
    specsLabel: '关键数据',
    specs: [
      '图表类型',
      '指标',
      '画线工具',
      '运行时依赖',
      'gzip 后的无界面核心',
      '10 万根K线时的悬停帧',
    ],
    hood: {
      eyebrow: '引擎内部',
      title: '有实测，有文档，任你扩展',
      subtitleHtml: '功能实验室背后的引擎。下面每个数字都可以用 <code>pnpm bench</code> 复现。',
      frameBudget: '帧预算',
      perf: [
        '10 万根K线、4 个指标下的一次实时 tick',
        '切换品种后的完整重算，10 万根K线',
        'LTTB 降采样，10 万 → 1,600 个点',
        '悬停帧，从 500 到 10 万根K线始终持平',
      ],
      perfFoot: '两层叠放的画布：悬停时只重绘较薄的顶层画布。每个渲染器只遍历屏幕上的K线。',
      gestures: '手势',
      gestureList: [
        ['拖动', '平移，可越过最后一根K线'],
        ['滚轮', '以指针为中心缩放'],
        ['捏合', '在触摸屏上缩放'],
        ['向右拖动', '边拖动边加载更早的K线'],
        ['拖动坐标轴', '拉伸该坐标轴'],
        ['Ctrl + 拖动', '框选画线'],
        ['Shift + 拖动', '测量'],
        ['Alt + 点击', '固定提示'],
      ],
    },
    capabilities: [
      {
        label: '组件',
        title: '一次调用，完整交易界面',
        text: 'ChartWidget 自带工具栏、画线侧边栏、自选列表、价格提醒、对象列表、数据窗口、K线回放和命令面板（Ctrl+K），支持 14 种语言，从英语、越南语到中文、日语和韩语。',
      },
      {
        label: '数据',
        title: '接入任意行情源',
        text: '内置 Binance、Coinbase、Bybit 和 Kraken 适配器；其他数据源可使用 WebSocketAdapter 和 PollingAdapter。回看历史时自动加载更早的K线；断线后自动重连，并丢弃已被后续切换取代的品种切换。',
      },
      {
        label: '交易',
        title: '在图表上下单',
        text: 'ExecutionAdapter 搭配模拟经纪商，支持拖动创建订单、括号单、可拖动的止损和止盈线，以及推送到 webhook 和桌面通知的提醒。',
      },
      {
        label: '框架',
        title: 'React、Vue 和 Svelte',
        text: '@tradecanvas/react、/vue 和 /svelte 以响应式、带类型的 props 封装同一个引擎。完整的 Chart 实例只需一个 ref 即可拿到。',
      },
      {
        label: '插件',
        title: '每一层都可扩展',
        text: '注册支持增量 update() 的自定义指标、画线工具、图表类型和叠加层，可全局注册，也可按图表注册。',
      },
      {
        label: '分析',
        title: '回测就在图表旁',
        text: '逐K线运行的 Backtester，带蒙特卡洛区间带；Web Worker 指标计算管线让主线程保持空闲。',
      },
    ],
    quickstart: {
      eyebrow: '快速开始',
      title: '同一个图表，五种接入方式',
      subtitle: '完整组件、框架组件或无界面引擎，它们共用同一个渲染器。',
      tabs: '快速开始方式',
    },
    closing: {
      title: '今天就把实时图表放进你的应用。',
      readDocs: '阅读文档',
      star: '在 GitHub 上 Star',
    },
  },

  lab: {
    eyebrow: '功能实验室',
    title: '每项功能，都在实时图表上。',
    subtitleHtml:
      '选择一个场景。每个场景都会把完整的 <code>ChartWidget</code> 启动到展示某一方面功能的状态——之后就交给你随意拖动、画线和切换。',
    scenes: '功能场景',
    widgetLanguage: '组件语言',
    idle: '滚动到此处即可启动实时图表',
    metricHint: '切换品种或周期即可计时',
    metricSwitch: '→ {label}：{ms} · {bars} 根K线',
    metricSetData: 'setData({bars} 根K线)：{ms}',
    tryThis: '试一试',
  },

  scenes: {
    drawings: {
      title: '画线工具',
      stat: '69 种工具',
      blurb:
        '斐波那契与江恩工具可自定义级别，另有艾略特波浪、谐波形态、笔记和画笔。双击画线打开设置，右击打开菜单；提醒会跟随趋势线，多/空仓位工具会算出仓位大小。',
      tryThis: [
        '双击斐波那契回撤，编辑它的级别',
        '右击一条画线：上移一层、分组或添加提醒',
        '选择画笔或路径工具；按 Enter 结束一条路径',
      ],
    },
    indicators: {
      title: '指标',
      stat: '85 个内置',
      blurb:
        '叠加指标和副图指标全部自行计算，数学运算零依赖。实时 tick 只重算正在形成的K线——10 万根K线、四个指标下，每个 tick 仅需 0.001 ms。',
      tryThis: [
        '点击“指标”按钮（或按 Ctrl+K），搜索 85 个指标中的任意一个',
        '点击图例中的指标名称：参数、颜色和水平线',
        '把移动平均线的数据源设为另一个指标的线',
        '拖动副图之间的分隔线来调整大小；副图右上角的按钮可以移动、收起或最大化副图',
        '图例行上的 ⋯ 可以把指标移到上方或下方的副图，或单独的新副图',
        '“指标”菜单 → “将指标保存为模板…”；Ctrl+Z 也能撤销对指标的修改',
        '在图表上直接输入数字（先输 4，再输 h，按 Enter）切换周期；Alt+T 选择趋势线',
      ],
    },
    trading: {
      title: '交易',
      stat: '模拟经纪商',
      blurb:
        '直接在图表上操作订单与持仓：拖动止损和止盈，从线上撤单、平仓或反手，每笔成交都会标记在所在的K线上。图表下方有下单面板和账户面板；一切都经由 ExecutionAdapter 路由——这里使用的是内置的模拟经纪商。',
      tryThis: [
        '在当前多单上点 ⇅ 反手，或点 × 平仓——成交会以标记显示在所在的K线上',
        '在价格下方右击：可在该价格限价买入、止损卖出，或新建委托',
        '图表下方的账户面板列出持仓及其盈亏、委托和历史',
        '拖动当前多单的 SL / TP 线——经纪商会同步更新',
        '价格轴旁的 + 可在该价格添加提醒、委托或水平线',
      ],
    },
    workspace: {
      title: '工作区',
      stat: '多图表',
      blurb:
        '两个图表并排显示，通过十字光标联动——也可按需通过代码、周期、时间和画线联动。把整个工作区保存为命名布局，随时回来继续。',
      tryThis: [
        '在一个图表上移动鼠标：另一个图表会显示同一时间',
        '在“同步”栏中打开“周期”，然后更改其中一个图表的周期',
        '在栏中选择四个图表；同步“代码”时，新图表会以当前活动图表的代码打开',
        '布局 ▾ → 另存为…，做些改动，然后重新打开该布局（Ctrl+S 保存）',
      ],
    },
    navigation: {
      title: '范围与布局',
      stat: '1D … 全部',
      blurb:
        '跳转到某个时间跨度或日期，翻转价格坐标，固定常用的周期，同一指标可多次添加——这一切都能从保存的布局中恢复。',
      tryThis: [
        '点击图表下方的 1M、3M 或 6M；Alt+G 跳转到日期',
        'Alt+I 将价格坐标上下翻转；对数坐标在“设置”中',
        '设置 → 时区：选择纽约或东京——坐标轴、日分隔线和 YTD 都会随之变化，夏令时也已计入',
        '设置 → 坐标 → 左侧价格坐标；在 EMA 的“样式”选项卡中可把它移到该坐标上',
        '在周期按钮旁的 ▾ 菜单中为某个周期加星标',
        '打开左侧工具栏的 ↻ 按钮即可连续画多条线；用 Ctrl+C / Ctrl+V 复制它们',
      ],
    },
    history: {
      title: '回溯历史',
      stat: '分页历史',
      blurb:
        '向最早的K线方向拖动时，更早的K线会逐页加载，屏幕上的内容保持不动。缩小到所有已加载的K线都能放下：每根K线不足一个像素时，蜡烛会按像素列合并，因此数千根K线依然清晰可读。',
      tryThis: [
        '向右拖动图表：左侧的胶囊标签会显示正在加载更早的K线',
        '滚动滚轮缩小，越过几百根K线，直到每根K线只占四分之一像素',
        '点击图表下方的“全部”，显示目前已加载的全部数据',
        '在 ▾ 周期菜单中输入 7 或 90：Binance 没有这两个周期，图表会用 1m 和 30m 的K线自行合成',
      ],
    },
    replay: {
      title: 'K线回放',
      stat: '进度条',
      blurb:
        '逐根K线回看历史，在没有后见之明的情况下练习看盘。回放期间实时数据会暂存一旁；价格坐标会适配每一步。',
      tryThis: [
        '点击播放，或用 Shift+→ / Shift+← 逐根前进或后退',
        '点击任意已显示的K线，光标即跳到该处',
        '“返回实时”回到实时行情',
      ],
    },
    subcent: {
      title: '14 种语言，低于一美分的价格',
      stat: 'i18n',
      blurb:
        '整个组件支持 14 种语言——菜单、设置、画线工具、对话框——数字采用各语言自己的格式。PEPE 的价格约为 0.000004：每个标签都遵循价格坐标的精度，坐标轴也会自动加宽以完整显示。',
      tryThis: [
        '在图表上方选择语言：日本語、한국어、简体中文、Deutsch…',
        'Ctrl+P 边输入边搜索所有 Binance 代码，并显示名称',
        '打开“设置”或画线工具，即可看到翻译后的界面',
        '悬停：十字光标的价格标签保持完整精度，并使用该语言的数字格式',
      ],
    },
    bigdata: {
      title: '20 万根K线',
      stat: '性能',
      blurb:
        '20 万根 1 分钟K线，外加四个指标。渲染只涉及可见的K线；更大的周期在本地重新采样，耗时超过几帧时会显示加载遮罩。',
      tryThis: [
        '切换到 1H、4H，再切回 1m——耗时会显示在图表下方',
        '一直缩小到底再平移：每帧开销保持不变',
        '再添加一个指标，观察切换耗时',
      ],
    },
    switching: {
      title: '慢速网络下的切换',
      stat: '+1.2 s 延迟',
      blurb:
        '这里的每个历史数据请求都会延迟 1.2 s。切换期间上一个图表仍留在屏幕上，只有切换超过 200 ms 才会加上遮罩；连续快速点击时，过期的响应永远不会覆盖最新结果。',
      tryThis: [
        '快速点击多个品种——只有最后一个会生效',
        '切换周期，观察遮罩淡入再淡出',
        '与“指标”场景对比：快速切换从不闪烁',
      ],
    },
  },

  gallery: {
    eyebrow: '图表类型',
    title: '所有图表类型，就在页面里实时运行',
    subtitleHtml:
      '每个图块都是一个真实的 <code>Chart</code> 实例，而不是图片。拖动平移，滚轮缩放，悬停显示十字光标；每个图块都能独立响应。',
    tiles: {
      candlestick: { name: '蜡烛图', tag: 'OHLC' },
      heikinAshi: { name: '平均K线', tag: '趋势' },
      area: { name: '面积图', tag: '收盘价' },
      baseline: { name: '基准线', tag: '高于 / 低于' },
      bar: { name: '美国线', tag: '经典' },
      stepLine: { name: '阶梯线', tag: '离散' },
    },
  },

  finance: {
    eyebrow: '金融图表',
    title: '不止蜡烛图',
    subtitle: '迷你走势图、权益曲线、订单簿深度、板块热力图、瀑布图和仪表图，适用于投资组合与 KPI。',
    portfolio: '投资组合表现',
    depth: '订单簿深度',
    heatmap: '加密市场热力图',
    pnl: '盈亏归因',
    fearGreed: '恐惧与贪婪指数',
    waterfall: {
      start: '期初',
      btcLong: 'BTC 多单',
      ethShort: 'ETH 空单',
      solLong: 'SOL 多单',
      fees: '手续费',
      end: '期末',
    },
    zones: {
      extremeFear: '极度恐惧',
      fear: '恐惧',
      neutral: '中性',
      greed: '贪婪',
      extremeGreed: '极度贪婪',
    },
  },

  terminal: {
    symbol: '代码',
    timeframe: '周期',
    chartType: '图表类型',
    types: {
      candlestick: '蜡烛图',
      heikinAshi: '平均K线',
      area: '面积图',
      bar: '美国线',
      baseline: '基准线',
    },
    unavailable: '实时行情不可用：{error}',
    live: '实时',
    offline: '离线',
    connecting: '连接中',
    hints: [
      ['拖动', '平移'],
      ['滚轮', '缩放'],
      ['拖动坐标轴', '拉伸'],
    ],
  },

  copy: {
    copy: '复制',
    copied: '已复制',
    copiedAnnouncement: '已复制到剪贴板',
    copyLabel: '复制 {label}',
    copyCode: '复制代码',
    codeSample: '代码示例',
    packageManager: '包管理器',
    copyInstall: '复制安装命令',
  },

  examples: {
    metaTitle: '示例 · TradeCanvas',
    description: '可在 StackBlitz 中实时运行的示例，涵盖原生 JS、React、Vue、Svelte、ChartWidget 和金融仪表盘。',
    eyebrow: '示例 · StackBlitz',
    title: '示例',
    subtitleHtml:
      '一键即可 fork 的在线沙盒。每个示例都在 StackBlitz 中打开，并已接好最新的 1.x 包。想免配置体验各项功能，请使用首页的<a href="{lab}">功能实验室</a>。',
    open: '在 StackBlitz 中打开 {title}',
    items: {
      vanilla: {
        title: '原生 JS',
        blurb: '无界面 Chart：Binance 实时数据流、Bollinger + RSI，以及在你自己的界面上使用画线工具。',
      },
      widget: {
        title: 'ChartWidget',
        blurb: '一次调用即得完整交易界面：工具栏、69 种画线工具、自选列表、交易、K线回放，支持 14 种语言。',
      },
      react: {
        title: 'React',
        blurb: '@tradecanvas/react——响应式 props，带类型，通过 ref 访问底层 Chart。',
      },
      vue: {
        title: 'Vue 3',
        blurb: '@tradecanvas/vue——script setup、响应式 props，通过 @ready 获取 Chart。',
      },
      svelte: {
        title: 'Svelte 5',
        blurb: '@tradecanvas/svelte——runes、响应式 props、bind:chart。',
      },
      finance: {
        title: '金融仪表盘',
        blurb: '迷你走势图、仪表图、热力图、深度图和权益曲线渲染器，集中在一个布局中。',
      },
    },
  },

  playground: {
    metaTitle: '演练场 · TradeCanvas',
    description: '在 StackBlitz 中 fork 一个交互式 TradeCanvas 沙盒，马上动手。',
    eyebrow: '演练场 · StackBlitz',
    title: '演练场',
    subtitle: '一个可编辑的 StackBlitz 沙盒，ChartWidget 已连接 Binance 实时数据。',
    launch: '启动演练场',
    more: '更多示例',
    insideTitle: '项目内容',
    insideHtml:
      '一个极简的 Vite + TypeScript 项目，只有一个文件 <code>src/main.ts</code>，它挂载 <code>ChartWidget</code> 并连接 <code>BinanceAdapter</code>。',
  },

  changelog: {
    metaTitle: '更新日志 — TradeCanvas',
    description: 'TradeCanvas 各版本的发布说明。',
    englishOnly: '发布说明以英文撰写。',
  },

  backtest: {
    title: '实时回测 — SMA(10/30) 交叉',
    subtitle: '365 天合成价格数据，初始资金 $10k，手续费 0.05%，滑点 0.03%。',
    play: '播放',
    pause: '暂停',
    replay: '重播',
    end: '末尾',
    running: '正在回测…',
    failed: '失败：{error}',
    bar: 'K线 {index}/{total}',
    totalReturn: '总收益',
    maxDrawdown: '最大回撤',
    winRate: '胜率',
    profitFactor: '盈亏比',
    trades: '交易次数',
  },

  error: {
    notFound: '页面不存在',
    notFoundText: '该页面不存在，或已被移动。',
    other: '出错了',
    otherText: '无法显示该页面。请重试，或从首页开始。',
    home: '返回首页',
    docs: '查看文档',
  },

  docs: {
    titleSuffix: 'TradeCanvas 文档',
    navLabel: '文档导航',
    groups: {
      start: '入门',
      chart: '图表',
      trading: '交易',
    },
    pages: {
      'getting-started': '快速开始',
      frameworks: '框架',
      embed: '可嵌入组件',
      api: 'API 参考',
      'chart-types': '图表类型',
      indicators: '指标',
      'drawing-tools': '画线工具',
      plugins: '插件',
      performance: '性能',
      trading: '交易叠加层',
      finance: '金融图表',
      realtime: '实时数据与回放',
      analytics: '分析',
    },
    notTranslated: '此页面尚未提供{language}版本，暂以英文显示。',
  },
};

export default zh;
