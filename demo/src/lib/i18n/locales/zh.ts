import type { SiteMessages } from '../messages';

/** 简体中文 */
const zh: SiteMessages = {
  meta: {
    title: 'TradeCanvas · 面向 Web 的 Canvas 交易图表',
    description:
      'TradeCanvas 是一个面向 Web 的交易图表库，可用 Canvas 2D 或 WebGL 绘制：18 种图表类型、111 个指标、69 种画线工具、交易所实时行情、图表上直接下单、回放与回测，支持 30 种语言。零依赖，MIT 许可。',
  },

  nav: {
    main: '主导航',
    docs: '文档',
    examples: '示例',
    playground: '演练场',
    changelog: '更新日志',
    audit: '审计',
    business: '企业',
    toLight: '切换到浅色主题',
    toDark: '切换到深色主题',
    github: 'GitHub 上的 TradeCanvas',
    sponsor: '赞助',
    sponsorLabel: '在 GitHub 上赞助 TradeCanvas',
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
    menu: '菜单',
    language: '语言',
  },

  footer: {
    tagline: '面向 Web 的交易图表，用 Canvas 2D 或 WebGL 绘制。零依赖，MIT 许可。',
    library: '库',
    packages: '包',
    project: '项目',
    gettingStarted: '快速开始',
    apiReference: 'API 参考',
    examples: '示例',
    changelog: '更新日志',
    audit: '系统审计',
    business: '面向企业',
    issues: '问题反馈',
    discussions: '讨论区',
    boGrid: 'bo-grid（数据表格）',
    builtWith: '基于 TradeCanvas 构建',
  },

  home: {
    release: 'WebGL 渲染器，30 种语言',
    title: '为交易应用打造的图表引擎。',
    ledeHtml:
      '从蜡烛图到 Renko，111 个指标、69 种画线工具、交易所实时行情，还能直接在图表上下单。用 Canvas 2D 或 WebGL 绘制，零依赖。可以直接放入完整的 <code>ChartWidget</code>，也可以在无界面的 <code>Chart</code> 之上构建自己的界面。',
    getStarted: '开始使用',
    browseExamples: '浏览示例',
    specsLabel: '关键数据',
    specs: [
      '指标',
      '画线工具',
      '图表类型',
      '组件语言',
      '根K线，WebGL 下 60 fps',
      '第三方运行时依赖',
    ],
    tape: '来自 Binance 的实时价格',
    tapePause: '暂停行情',
    tapePlay: '播放行情',
    story: {
      eyebrow: '从第一眼到成交',
      title: '一张图表，贯穿整笔交易',
      subtitle: '四张实时图表，各自演示一部分。可以拖动、缩放，也可以在上面画线。',
      chapters: [
        {
          title: '读懂行情',
          text: 'K线上叠加通道、均线和振荡指标，再在上面画斐波那契和趋势线，每一项都有自己的设置和提醒。',
          points: [
            '111 个指标，可以互相叠加，比如 RSI 的均线',
            '69 种画线工具，带磁吸、分组和撤销',
            '价格、画线和指标交叉都能提醒',
          ],
        },
        {
          title: '在图表上交易',
          text: '订单、持仓及其止盈止损都显示在价格轴上。拖动止损即可移动它；模拟经纪商负责成交，所以接入实盘前就能先做出来。',
          points: [
            '拖动下单，拖动止损线和止盈线来调整',
            '成交标记和盈亏直接显示在图表上',
            '你的经纪商通过一个适配器接入',
          ],
        },
        {
          title: '回放历史',
          text: '逐根K线翻看历史，或让它自动播放：指标、画线和模拟订单都跟随回放的价格。',
          points: [
            '任意起始K线，任意速度',
            '每根K线可由更细的K线逐步形成',
            '回放时用模拟经纪商交易',
          ],
        },
        {
          title: '数据再多也不卡',
          text: '这里有 200,000 根K线和四个指标，正在自动平移。切换渲染器，看看每帧耗时：使用 WebGL 时，K线和线条都由 GPU 绘制。',
          points: [
            'WebGL 下 1,000,000 根K线全部缩小显示也有 60 fps',
            '没有 WebGL 时用 Canvas 2D，外观一致',
            '只绘制屏幕上的K线',
          ],
        },
      ],
      frameTime: '每帧 {ms} ms',
      panning: '自动平移，直到你接手',
      renderer: '渲染器',
      replaying: '回放中',
    },
    trust: {
      label: '开源',
      downloads: '每月 npm 下载 {n} 次',
      license: '{n} 许可',
      dependencies: '{n} 个运行时依赖',
      typescript: '所有 API 均提供 {n} 类型',
    },
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
        text: 'ChartWidget 自带工具栏、画线侧边栏、自选列表、价格提醒、对象列表、数据窗口、K线回放和命令面板（Ctrl+K），支持 30 种语言，从英语、越南语到中文、日语、韩语和阿拉伯语。',
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
    widgetLook: '组件外观',
    widgetRenderer: '渲染器',
    idle: '滚动到此处即可启动实时图表',
    metricHint: '切换品种或周期即可计时',
    metricSwitch: '→ {label}：{ms} · {bars} 根K线',
    metricSetData: 'setData({bars} 根K线)：{ms}',
    metricLook: "setUI('{name}'): {ms}",
    metricRenderer: '{name}：平移时每帧 {ms}',
    metricRendererMissing: '此处没有 WebGL 2：使用 Canvas 2D 绘制',
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
      stat: '111 个内置',
      blurb:
        '叠加指标和副图指标全部自行计算，数学运算零依赖。实时 tick 只重算正在形成的K线——10 万根K线、四个指标下，每个 tick 仅需 0.001 ms。',
      tryThis: [
        '点击“指标”按钮（或按 Ctrl+K），搜索 111 个指标中的任意一个',
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
        '在回放栏的“步长”中选择更小的周期（15m），看每根K线逐步形成',
        '买卖标记和交易只在回放到达时才出现',
      ],
    },
    compare: {
      title: '对比、价差、比值',
      stat: '多品种',
      blurb:
        'ETH 显示在 BTC 旁边的独立价格坐标上，BTC ÷ ETH 显示在副图中。其他品种按时间与图表对齐；价差或比值和任何指标一样带有图例、数值标签和提醒。屏幕上的最高价和最低价会被标出。',
      tryThis: [
        '打开对象列表，点击“对比”旁的 +：先选品种，再选对比方式',
        '右击比值副图，可切换为百分比坐标',
        '右击图表：“导出数据 (CSV)”会带上每一条指标线',
        '切换周期：另一个品种的K线会重新获取',
      ],
    },
    bonds: {
      title: '以 1/32 报价的债券',
      stat: '格式',
      blurb:
        '一只以 1/32 及半个 1/32 报价的债券（110’165 即 110 又 16½/32），以高低图显示。图表上的每个价格——坐标轴、十字光标、图例、委托、画线——都采用同样的格式，坐标轴刻度也恰好落在整分数上。',
      tryThis: [
        '悬停：十字光标和图例以 1/32 显示',
        '设置 → 显示 → 关闭“延长交易时段”，只看常规交易时段',
        '切换到砖形图或卡吉图，在“设置”中设定方块大小或反转幅度',
        '画一条水平线：它的标签同样以 1/32 显示',
      ],
    },
    vnmarket: {
      title: '越南市场',
      stat: 'HOSE · VN30F',
      blurb:
        '按交易所的实际规则呈现 HOSE 和 VN30 期货：按价格区间以 10、50 或 100 越南盾为最小变动价位，当日的涨停价、跌停价和参考价，每手 100 股，越南时区的交易时段，以及行情报价板的配色。',
      tryThis: [
        '右键点击图表：给出的价格都落在最小变动价位上，HPG 为 50 越南盾',
        '从账户面板新建委托：数量从 100 股起，超过涨停价的价格会被拒绝',
        '切换到 FPT（最小变动价位 100 越南盾）或 VN30F 合约（8:45 开盘）',
        '紫色、青色和黄色的线分别是涨停价、跌停价和参考价',
      ],
    },
    subcent: {
      title: '30 种语言，低于一美分的价格',
      stat: 'i18n',
      blurb:
        '整个组件支持 30 种语言——菜单、设置、画线工具、对话框，阿拉伯语、希伯来语和波斯语从右到左显示——数字采用各语言自己的格式。PEPE 的价格约为 0.000004：每个标签都遵循价格坐标的精度，坐标轴也会自动加宽以完整显示。',
      tryThis: [
        '在图表上方选择语言：日本語、한국어、简体中文、Deutsch…',
        'Ctrl+P 边输入边搜索所有 Binance 代码，并显示名称',
        '打开“设置”或画线工具，即可看到翻译后的界面',
        '悬停：十字光标的价格标签保持完整精度，并使用该语言的数字格式',
      ],
    },
    looks: {
      title: '你的专属外观',
      stat: '3 套预设',
      blurb:
        '组件的形状与尺寸都由 token 决定：圆角、控件高度、字体、边框、阴影、选中按钮的样式，以及工具栏是停靠还是悬浮。从 Studio、Terminal 或 Capsule 出发，想改哪里就改哪里；图表上的价格标签也采用同样的圆角。',
      tryThis: [
        '在图表上方切换外观：原地生效，不会重建任何东西',
        '在每种外观下打开“设置”、菜单或画线工具看看',
        'Capsule 让工具栏和画线工具像小岛一样悬浮，价格标签也变成胶囊形',
        'Terminal 紧凑方正：标签全部大写，选中的周期下方有一条下划线',
      ],
    },
    overrides: {
      title: '样式覆盖',
      stat: '101 个键',
      blurb:
        '按键单独设置图表外观的任何部分，不受主题限制：每个方向的网格、十字光标、坐标轴、面板、图例、最新价、成交量以及每种图表类型的颜色。这里关闭了竖向网格，横向网格为点线，十字光标为实线，MACD 的信号线在拥有自己分隔线的面板中显示为虚线。',
      tryThis: [
        '切换图表类型：美国线和 Heikin-Ashi 若没有自己的颜色，就沿用K线的颜色',
        '切换网站主题：没有覆盖的部分会跟随主题',
        '打开设置：“样式”页可设置每个键，包括当前图表类型的颜色；“交易”页设置订单、标记和区域的颜色，选择前为“自动”',
      ],
    },
    parts: {
      title: '你的组件，部件由你定',
      stat: '112 个开关',
      blurb:
        '组件的每个部分都有开关，默认开启，运行时可随时切换：可以是整项功能（警报、设置、快捷键），也可以是一个位置（工具栏上的某个按钮、某个菜单项、某组绘图工具）。你自己的按钮、菜单和状态项就放在组件的各个栏里。这里关闭了回放、两组绘图工具和数据下载，工具栏上多了一个开关菜单。',
      tryThis: [
        '打开工具栏上的“features”，逐个开关各部分',
        '绘图栏底部的眼睛按钮会隐藏工具栏和状态栏，再按一次恢复 (Alt+X)',
        '右键点击一个绘图：最后一项是页面自己的',
      ],
    },
    markets: {
      title: '自选列表与行情',
      stat: '实时报价',
      blurb:
        '带有数据源实时报价的代码列表，一个显示代码价格、市场状态和当日数据的面板，还有 Tick 图：每 100 笔成交一根K线。',
      tryThis: [
        '打开自选列表的菜单：切换到 Memes，新建你自己的列表，再给它重命名',
        '用 + 添加代码，拖动行重新排序，或在某一行上按 Delete',
        '在图表上输入 100T，每 100 笔成交画一根K线，再输入 1m 回到原样',
        '把鼠标移到图表上，底部会出现缩放和滚动按钮',
      ],
    },
    bigdata: {
      title: '20 万根K线',
      stat: '性能',
      blurb:
        '20 万根 1 分钟K线，外加四个指标。渲染只涉及可见的K线；更大的周期在本地重新采样，耗时超过几帧时会显示加载遮罩。',
      tryThis: [
        '在图表上方切换 Canvas 2D 与 WebGL：每次切换都会测一次短暂平移',
        '开启 WebGL 后，把图表类型切换为基准线、卡吉图或点数图：它们同样在 GPU 上绘制',
        '切换到 1H、4H，再切回 1m——耗时会显示在图表下方',
        '一直缩小到底再平移：每帧开销保持不变',
        '再添加一个指标，观察切换耗时',
      ],
    },
    heatmap: {
      title: '流动性热力图',
      stat: '240 × 80 格',
      blurb:
        '240 个订单簿快照，每个 80 档价格，在K线背后组成热力图：挂单量按价位点亮，买盘绿色、卖盘红色，长时间停留的挂单墙一目了然。使用 WebGL 时，这 19,200 个格子在 GPU 上绘制于K线之下。',
      tryThis: [
        '在图表上方切换 Canvas 2D 与 WebGL：每次切换都会测一次短暂平移',
        '寻找明亮的横行：长时间停在同一价位的挂单墙',
        '放大某一堵挂单墙后来回平移：格子与K线同步移动',
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

  engage: {
    click: '点击以操作图表',
    tap: '轻触以操作图表',
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
    drawnWith: '使用 {renderer} 绘制',
    live: '实时',
    offline: '离线',
    connecting: '连接中',
    hints: [
      ['拖动', '平移'],
      ['点击后滚轮', '缩放'],
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
        blurb: '一次调用即得完整交易界面：工具栏、69 种画线工具、自选列表、交易、K线回放，支持 30 种语言。',
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

  audit: {
    metaTitle: '系统审计 — TradeCanvas',
    description:
      'TradeCanvas 能做什么、有多快：按领域列出的全部功能、集成显卡上的帧时间、数据路径、下载体积、测试方式，以及已知的限制。',
    eyebrow: '系统审计',
    title: '它能做什么，又做得多快。',
    ledeHtml:
      '本页所列的一切都包含在 <code>@tradecanvas/chart</code> {version} 中。帧时间是在一台集成显卡（Intel UHD）的笔记本电脑上用 Chrome 测得的；在仓库中运行 <code>node scripts/bench-render.mjs</code>，即可在你自己的机器上跑同样的场景。',
    numbersTitle: '数字一览',
    numbers: [
      '图表类型',
      '内置指标',
      '画线工具',
      '组件语言',
      '样式键',
      '组件功能开关',
      '第三方运行时依赖',
      '单元测试',
    ],

    perfTitle: '帧时间',
    perfLede: '平移时绘制一帧所需的时间。16.7 ms 即每秒 60 帧。',
    perfChart: '图表',
    perfRatio: '像素比',
    perf: [
      '1600×900，500 根K线 + 4 个指标',
      '1600×900，缩小显示 200,000 根K线 + 4 个指标',
      '1600×900，缩小显示 1,000,000 根K线 + 4 个指标',
      '1600×900，深度热力图，240 个快照 × 80 档',
      '六个图表，各有 500 根K线和 2 个指标',
      '2560×1400，2,000 根K线 + 4 个指标',
      '2560×1400，2,000 根K线 + 4 个指标',
      '2560×1400，2,000 根K线 + 4 个指标',
    ],
    perfNoteHtml:
      '默认使用 Canvas 2D。<code>renderer: \'webgl\'</code>（或 <code>\'auto\'</code>）用 WebGL 2 绘制绘图区；没有 WebGL 2 或其上下文丢失时，回退到 Canvas 2D。',

    dataTitle: '数据路径',
    data: [
      '在 100,000 根K线上带布林带、EMA、RSI 和 MACD 时处理一个实时 tick',
      '在 100,000 根K线上完整重算这四个指标',
      '一条 1,000,000 个可见点的折线，为一帧降采样',
      '一次悬停重绘（十字光标、图例）',
      '切换代码或周期时，超过此时长才显示加载遮罩',
    ],

    sizeTitle: '下载体积',
    sizeLede: '压缩并经 gzip 后的大小，包含其导入的全部内容。',
    size: ['Chart，无界面 API', 'ChartWidget，完整界面', 'WebGL 渲染器，首次使用时加载'],

    qualityTitle: '如何检验',
    quality: [
      '七个包共 3,000 多个单元测试，每个拉取请求都会在 CI 中运行。',
      'WebGL 渲染器把K线画在与 Canvas 2D 相同的设备像素上；线条和填充只在少数抗锯齿边缘像素上有差异。',
      'WebGL 渲染器已在 Chromium、Firefox 和 WebKit 中检验。没有 WebGL 2 或其上下文丢失时，图表会继续用 Canvas 2D 绘制。',
      '文档和智能体技能中的代码示例都会对照真实 API 进行类型检查。',
      '图表可由屏幕阅读器朗读，也能完全用键盘操作；组件在阿拉伯语、希伯来语和波斯语下从右到左显示。',
    ],

    catalogTitle: '功能',
    catalogLede: '按领域筛选，或按名称或 API 搜索。',
    search: '搜索功能',
    searchPlaceholder: 'replay、webgl、提醒…',
    all: '全部',
    count: '{shown} / {total}',
    colCapability: '功能',
    colArea: '领域',
    colDetail: '详情与 API',
    areas: {
      chartTypes: '图表类型',
      rendering: '渲染',
      indicators: '指标',
      drawings: '画线工具',
      scales: '坐标与时间',
      data: '数据与实时行情',
      trading: '交易',
      alerts: '提醒与回放',
      workspace: '工作区',
      customization: '自定义',
      access: '语言与无障碍',
      developers: '开发者',
    },
    catalog: {
      chartTypes: [
        { name: '蜡烛图、美国线、折线、面积图、基准线、平均K线、空心蜡烛图', detail: 'candlestick, bar, line, area, baseline, heikinAshi, hollowCandle' },
        { name: 'Renko、新价线、Kagi、点数图、区间K线', detail: '砖块大小或 ATR、突破所需的线数、按百分比或价格的反转幅度、每根K线的区间' },
        { name: '成交量蜡烛图、等量图、HLC 面积图、阶梯线、带标记的折线、高低图', detail: '共 18 种图表类型' },
        { name: '隐藏主序列', detail: '只保留指标和画线' },
      ],
      rendering: [
        { name: 'Canvas 2D 或 WebGL 2', detail: "renderer: 'canvas' | 'webgl' | 'auto'、setRenderer、rendererChange 事件" },
        { name: '缩小时每个像素列只画一段', detail: '每根K线不足一个像素时的指标线、通道带和柱状图' },
        { name: '流畅平移一百万根K线', detail: '带四个指标，像素比为 2' },
        { name: '在 GPU 上绘制深度热力图、成交量分布和市场轮廓', detail: 'pushDepthSnapshot(book, time)' },
        { name: '一个页面上的多个 WebGL 图表', detail: '最多 8 个（setMaxWebGLCharts）；其余用 Canvas 2D 绘制；上下文恢复后切回 WebGL' },
        { name: '任何屏幕缩放比例下都清晰', detail: '在 100%、125% 和 200% 下，K线、成交量和画线都对齐设备像素' },
        { name: '无第三方运行时依赖', detail: '无需额外安装或审计任何东西' },
      ],
      indicators: [
        { name: '111 个内置指标', detail: '六种枢轴点、MA Cross、与另一品种的相关性' },
        { name: '价格来源', detail: 'open, high, low, hl2, hlc3, ohlc4, hlcc4' },
        { name: '基于指标的指标', detail: '例如 RSI 的移动平均，每个 tick 都会更新' },
        { name: '一个副图中放多个指标，并可在副图间移动', detail: 'moveIndicatorToPane' },
        { name: '同一指标添加多次', detail: 'EMA 20 和 EMA 50 并排显示' },
        { name: '水平线与阈值', detail: 'RSI 30/70、CCI ±100，随布局一起保存' },
        { name: '坐标轴上的最新值', detail: '显示在价格轴和各副图的坐标轴上，颜色与线条一致' },
        { name: '副图的折叠、最大化与重新排序', detail: '随布局一起保存' },
        { name: '指标模板', detail: '输入参数、样式、水平线和副图一并保存、一并应用' },
        { name: '每条线的样式与可见性', detail: '隐藏的线不会拉伸坐标；setIndicatorDefaults' },
        { name: '成交量差与 CVD', detail: '根据K线估算' },
        { name: '导出指标数值', detail: 'CSV 或 JSON，每条线一列' },
        { name: '实时 tick 的增量更新', detail: 'update() 只重新计算正在形成的K线' },
      ],
      drawings: [
        { name: '69 种画线工具', detail: '直线、通道、斐波那契、江恩、叉形线、艾略特波浪、形态、周期、投影' },
        { name: '每种工具各自的设置', detail: '样式、属性，以及落在市场价格网格上的坐标' },
        { name: '多头与空头仓位', detail: '风险回报比，按风险百分比或金额计算数量' },
        { name: '画线上的提醒', detail: '价格穿越所画的趋势线或通道时触发，对数坐标同样适用' },
        { name: '层级、分组与模板', detail: '上移、下移、分组、锁定、隐藏' },
        { name: '注释、标注、箭头、旗标、画笔、路径、曲线', detail: '手绘与多点绘制' },
        { name: '锚定 VWAP 与固定区间成交量分布', detail: '读取图表自身的K线' },
        { name: '橡皮擦、缩放框、强磁吸、键盘快捷键', detail: 'Alt+T, Alt+H, Alt+J, Alt+V, Alt+C, Alt+F' },
      ],
      scales: [
        { name: '跳转到日期；从 1D 到 All 的时间范围', detail: '缩小不设上限' },
        { name: '支持夏令时的 IANA 时区', detail: '或使用交易所自己的时区' },
        { name: '任意周期，以及 tick K线', detail: '7m、90m、2d 由行情源提供的数据合成；100T 由其成交合成' },
        { name: '左右两侧坐标；每个副图可设对数、反转和百分比', detail: '左侧坐标可用于叠加层，或作为价格坐标的副本' },
        { name: '品种对比、价差与比值', detail: '使用独立的坐标或副图，按时间对齐' },
        { name: '延长交易时段', detail: '依据品种的交易时段' },
        { name: '价格与时间格式', detail: 'priceFormat 可以是函数，或 1/32 这样的分数；timeFormatter' },
        { name: '按品种的小数位和最小变动价位显示坐标', detail: 'pricePrecision、minTick：以 10 为单位变动的股票绝不会显示 21,705' },
        { name: '最高价与最低价线、买价与卖价', detail: '买卖价来自行情源的 tick' },
        { name: '图表上的事件标记', detail: 'signalMarkerHover, signalMarkerClick' },
      ],
      data: [
        { name: '现成的行情源，也可接入你自己的', detail: 'Binance、Bybit、Coinbase、Kraken、mock；WebSocketAdapter、PollingAdapter' },
        { name: '向左滚动时加载更早的历史', detail: 'fetchHistoryBefore' },
        { name: '带详细信息的品种搜索', detail: 'searchSymbols、resolveSymbol：小数位、最小变动价位、交易时段、时区' },
        { name: '连接后才获知的品种详情', detail: '适配器的 symbolInfo 事件' },
        { name: '深度报价阶梯', detail: '按价格显示买卖挂单量；点击即可交易' },
        { name: '自选列表的实时报价', detail: 'subscribeQuotes, setQuotes, getQuote' },
        { name: '新闻与市场状态', detail: 'fetchNews；距离开盘或收盘的倒计时' },
        { name: '交易所规则', detail: 'setMarket：按价格区间的最小变动价位、每日涨跌停价、每手股数、交易时段；HOSE、HNX、UPCoM 和 VN30 期货' },
      ],
      trading: [
        { name: '图表上的订单与持仓', detail: '拖动即可修改；直接在线上撤单、平仓和反手' },
        { name: '成交标记', detail: 'executionFill 中带有原因和盈亏' },
        { name: '下单面板', detail: '数量、类型、止损与止盈、有效期，输入时即时校验；以及交易所的最小变动价位、涨停价、跌停价和每手股数' },
        { name: '账户面板', detail: '带实时盈亏的持仓、挂单、成交记录' },
        { name: '信号与交易区域', detail: 'markers.*、tradeZones.* 样式键' },
        { name: '回测与风险指标', detail: '@tradecanvas/analytics：手续费、滑点、Sharpe、Sortino、Calmar、回撤' },
      ],
      alerts: [
        { name: '不止于价格水平的提醒', detail: '线与线交叉、N 根K线内涨跌 N%、K线收盘时触发、可设到期时间' },
        { name: '更细步长的K线回放', detail: '用更小周期的K线回放更大的周期' },
        { name: '在回放中模拟交易', detail: '订单按回放的价格成交' },
        { name: '在图表网格中同步回放', detail: '各图表保持同步' },
        { name: '面向应用的回放', detail: 'startTime、hideHistory、duration，随播放逐步显示的标记，replayComplete' },
      ],
      workspace: [
        { name: '同步联动的组件网格', detail: '最多 6 个，共享代码、周期、十字光标、时间和画线' },
        { name: '保存在你自己存储中的命名布局', detail: '保存、打开、重命名、自动保存；用 LayoutStorage 接入服务器' },
        { name: '一切皆可撤销与重做', detail: '画线、指标、设置和图表类型；recordUndo' },
        { name: '按区域划分的右键菜单', detail: '画线、绘图区、副图、价格轴、时间轴' },
        { name: '自选列表', detail: '可建多个列表，拖动即可排序' },
        { name: '供宿主应用使用的事件', detail: 'symbolChange、timeframeChange、ordersChange、executionFill、styleChange 等' },
      ],
      customization: [
        { name: '组件的三种外观', detail: 'Studio、Terminal、Capsule；ui 与 setUI；--tcw-* CSS 变量' },
        { name: '按键定制图表外观', detail: 'applyOverrides 覆盖 101 个带类型的键，分为宿主层和用户层' },
        { name: '覆盖每个键的设置', detail: '当前图表类型的样式选项卡，以及交易选项卡' },
        { name: '112 个功能开关', detail: 'features、setFeatures、isFeatureOn；运行时可更改' },
        { name: '在组件中加入你自己的部件', detail: '工具栏按钮和下拉菜单、侧边栏按钮、状态栏项、插槽、菜单项' },
        { name: '自定义快捷键', detail: 'addHotkey，按键盘布局识别' },
      ],
      access: [
        { name: '组件支持 30 种语言', detail: '阿拉伯语、希伯来语和波斯语从右到左显示' },
        { name: '屏幕阅读器与键盘', detail: '图表摘要、逐根朗读K线、对话框可用键盘操作' },
        { name: '文档提供六种语言，本站提供十四种', detail: 'English, Tiếng Việt, 简体中文, 日本語, 한국어, Español' },
      ],
      developers: [
        { name: 'React、Vue 和 Svelte 组件', detail: '响应式 props：overrides、indicators、features' },
        { name: '插件', detail: '指标、画线工具、图表类型和叠加层；用 overlayScale 和 getPriceStep 在价格网格上绘制' },
        { name: '面向编程智能体的文档', detail: 'llms.txt、llms-full.txt，以及一个智能体技能' },
      ],
    },

    limitsTitle: '已知限制',
    limits: [
      '在 WebGL 经过更多设备试用之前，Canvas 2D 仍是默认渲染器；WebGL 在 Safari 和 5K 屏幕上的帧率尚未测量。',
      '在 2560×1400 的图表上、像素比为 2 时，仅浏览器的合成在集成显卡上就要约 23 ms，因此那里的 WebGL 帧平均为 29 ms。',
      'tick 周期由行情源返回的近期成交合成；无法加载更早的 tick 历史。',
      '成交量差和 CVD 根据K线估算，而非依据每笔成交的买卖方向。',
      '一个页面上最多 8 个图表同时用 WebGL 绘制；其余用 Canvas 2D 绘制。',
    ],
  },

  business: {
    metaTitle: '面向企业 — TradeCanvas',
    description:
      '在商业产品中使用 TradeCanvas：MIT 许可，图表上没有标志，无需注册，不向任何地方发送数据。IT 审查会问的问题及其出处，以及首批合作伙伴计划。',
    eyebrow: '面向企业',
    title: '你的交易图表，打上你自己的品牌。',
    lede: 'TradeCanvas 采用 MIT 许可。可以放进商业产品、自行修改、自行托管：你的客户看到的是你的品牌，你的数据留在你自己的服务器上。',
    ctaContact: '联系我们',
    ctaAudit: '阅读系统审计',

    freeTitle: '免费，任何用途',
    free: [
      {
        title: '图表上没有标志',
        body: 'TradeCanvas 不会在图表或组件中绘制任何自己的内容。MIT 许可只要求许可文本随代码一同保留。',
      },
      {
        title: '不向任何地方发送数据',
        body: '库中没有任何遥测。它只通过你启动的数据适配器建立连接：内置的交易所数据源之一，或你自己的。',
      },
      {
        title: '无需申请，无需审批',
        body: '执行 npm install，系统审计中的每项功能都归你使用，包括深度报价阶梯、深度图和热力图。',
      },
      {
        title: '全部源代码',
        body: '阅读、修改、fork 均可。MIT 对你自己的代码没有任何要求：代码仍归你所有，你愿意的话也可以保持闭源。',
      },
    ],

    reviewTitle: '为 IT 审查做好准备',
    reviewLede: '安全审查或供应商审查通常会问的问题，以及每个答案可以在哪里核实。',
    reviewHtml: [
      '无第三方运行时依赖：图表包只依赖 TradeCanvas 自己的 core 和 commons。',
      '不使用 <code>eval</code> 和 <code>new Function</code>，因此可以在不含 <code>unsafe-eval</code> 的 Content Security Policy 下运行。',
      "组件会添加一个 <code>&lt;style&gt;</code> 元素，因此其所在页面需要 <code>style-src 'unsafe-inline'</code>；无界面的 <code>Chart</code> 不添加任何元素。",
      '安全问题通过私密渠道报告，一周内答复。',
      '每个拉取请求都会在 CI 中构建、类型检查和测试：超过 3,000 个单元测试。',
      '版本由 GitHub Actions 从代码仓库发布，而不是从开发者的电脑发布。',
      'Chrome 80+、Firefox 80+、Safari 14+ 和 Edge 80+。',
      '许可：MIT，一页纸。',
    ],
    source: '出处',

    dataTitle: '你的数据，你的服务器',
    dataHtml:
      '图表只绘制你交给它的 K 线、tick 和订单。用 <code>DataAdapter</code> 接入你自己的后端，或用 <code>WebSocketAdapter</code>，只需提供 URL、历史数据函数和消息解析函数；订单通过你自己的执行适配器发出。Realtime 和 Trading 文档介绍了具体做法。',
    dataDocs: 'Realtime 文档',
    tradingDocs: 'Trading 文档',

    partnerTitle: '首批合作伙伴',
    partnerLede:
      '我们正在寻找首批将 TradeCanvas 提供给客户的券商、交易平台和金融科技团队。',
    partnerGetTitle: '你将获得',
    partnerGet: [
      '协助接入你的数据源和订单',
      '你遇到的问题优先修复',
      '参与决定接下来开发什么',
    ],
    partnerGiveTitle: '我们希望你',
    partnerGive: ['在开发过程中提供反馈', '上线后允许我们将你列为用户'],
    partnerNote:
      '付费支持（合同约定响应时间、大版本长期支持、为你定制的模块）将在之后推出。如果你现在就需要，请告诉我们。',

    contactTitle: '联系我们',
    contactLede: '告诉我们你是谁、在构建什么、面向哪些市场。',
    contactPublic: '关于代码的问题，最好在 GitHub issues 中公开提问。',

    faqTitle: '常见问题',
    faq: [
      {
        q: '我们必须显示 TradeCanvas 的名称或标志吗？',
        a: '不必。只需让许可文本随代码保留，它本来就在 node_modules 里；屏幕上无需显示任何内容。',
      },
      {
        q: '我们必须公开自己的代码吗？',
        a: '不必。MIT 对周围的代码没有任何条件。',
      },
      {
        q: '许可会不会突然改变？',
        a: '每个已发布的版本都是 MIT，并且始终是 MIT：已发布版本的许可无法收回。',
      },
    ],
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
      styling: '样式',
      customization: '定制',
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
