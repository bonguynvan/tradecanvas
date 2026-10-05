<p align="center">
  <a href="https://bonguynvan.github.io/tradecanvas/zh/"><img src=".github/assets/banner.png" alt="TradeCanvas，为交易应用打造的图表引擎" width="100%"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@tradecanvas/chart"><img src="https://img.shields.io/npm/v/@tradecanvas/chart?style=flat-square&labelColor=0b0e13&color=f2a93b&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@tradecanvas/chart"><img src="https://img.shields.io/npm/dm/@tradecanvas/chart?style=flat-square&labelColor=0b0e13&color=3ccf91" alt="npm downloads"></a>
  <a href="https://github.com/bonguynvan/tradecanvas/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/bonguynvan/tradecanvas/ci.yml?branch=main&style=flat-square&labelColor=0b0e13&label=CI" alt="CI status"></a>
  <img src="https://img.shields.io/badge/third--party%20deps-0-3ccf91?style=flat-square&labelColor=0b0e13" alt="No third-party dependencies">
  <img src="https://img.shields.io/badge/TypeScript-strict-4c8dff?style=flat-square&labelColor=0b0e13" alt="TypeScript">
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/bonguynvan/tradecanvas?style=flat-square&labelColor=0b0e13&color=a9b0bd" alt="MIT license"></a>
  <a href="https://github.com/bonguynvan/tradecanvas/stargazers"><img src="https://img.shields.io/github/stars/bonguynvan/tradecanvas?style=flat-square&labelColor=0b0e13&color=f2a93b" alt="GitHub stars"></a>
</p>

<p align="center">
  <b><a href="https://bonguynvan.github.io/tradecanvas/zh/">在线演示</a></b> ·
  <a href="https://bonguynvan.github.io/tradecanvas/zh/docs/getting-started/">文档</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/zh/examples/">示例</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/zh/playground/">Playground</a> ·
  <a href="./CHANGELOG.md">更新日志</a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.vi.md">Tiếng Việt</a> · <b>简体中文</b> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a>
</p>

**一套完整的 Web 交易图表。** 从K线到砖形图（Renko），95 个指标、69 种画线工具、交易所实时行情和图上下单，全部基于 Canvas2D 绘制，零依赖。可以直接使用完整的 `ChartWidget`，也可以在无界面的 `Chart` 上构建自己的 UI，支持原生 TypeScript、React、Vue 和 Svelte。

<p align="center">
  <a href="https://bonguynvan.github.io/tradecanvas/zh/"><img src=".github/assets/hero.png" alt="ChartWidget 显示来自 Binance 的 BTCUSDT 实时行情：EMA 21 和 55、RSI、一条趋势线、一个多头仓位，以及带实时报价的自选列表" width="100%"></a>
</p>

## 快速开始

```bash
npm install @tradecanvas/chart     # 或：pnpm add / yarn add
```

`ChartWidget` 把完整的交易界面装进一个组件：工具栏、画线侧边栏、设置对话框和状态栏。

```typescript
import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(), // 实时数据，无需 API key
  trading: true,
})
```

就这么简单。实时数据、全部 95 个指标、全部 69 种画线工具、命令面板（`Ctrl+K`）、代码搜索（`Ctrl+P`）、快捷键列表（`?`）、Shift 拖动测量、Alt 点击固定提示，以及拖放加载 CSV/JSON。

使用框架？[`@tradecanvas/react`](./packages/react/)、[`@tradecanvas/vue`](./packages/vue/) 和 [`@tradecanvas/svelte`](./packages/svelte/) 把无界面的 `Chart` 封装成组件，上面的 widget 在任何框架里也能用同样的方式挂载，参见[框架集成](#框架集成)。也可以 fork 一个 [StackBlitz 沙盒](https://bonguynvan.github.io/tradecanvas/zh/examples/)直接上手。

## 功能一览

<table>
  <tr>
    <td width="50%" valign="top">
      <a href=".github/assets/drawings.png"><img src=".github/assets/drawings.png" alt="画线工具：带注释的斐波那契回撤、一条趋势线、艾略特推动浪和一个多头仓位"></a>
      <br><b>69 种画线工具</b><br>
      斐波那契、江恩、音叉、艾略特波浪、谐波形态、注释和画笔，以及能自动计算仓位大小的多空仓位工具。趋势线警报、分组、撤销与重做。
    </td>
    <td width="50%" valign="top">
      <a href=".github/assets/trading.png"><img src=".github/assets/trading.png" alt="图上交易：带止损和止盈的多头仓位、一张买入止损单和一张卖出限价单，以及账户面板"></a>
      <br><b>在图表上交易</b><br>
      实时盈亏的持仓、可拖动改价的订单、止损和止盈、反手和平仓按钮、下单面板和账户面板。内置模拟交易经纪商，也可以接入你自己的。
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <a href=".github/assets/grid.png"><img src=".github/assets/grid.png" alt="2×2 工作区：多种周期的 BTC、ETH、SOL 和 BNB 图表"></a>
      <br><b>多图表工作区</b><br>
      最多六个完整图表并排显示，可按代码、周期、十字光标、时间或画线联动，并保存为一个布局。
    </td>
    <td width="50%" valign="top">
      <a href=".github/assets/looks.png"><img src=".github/assets/looks.png" alt="同一图表的三种外观：studio、terminal，以及浅色主题下的 capsule"></a>
      <br><b>自定义外观</b><br>
      三种预设（studio、terminal、capsule），或自定义圆角、密度、字体、工具栏和价格标签，深色和浅色主题皆可。
    </td>
  </tr>
</table>

## 为什么选择 TradeCanvas？

大多数图表库都要你二选一：要么图表漂亮却没有交易功能，要么有交易功能但 API 难用。TradeCanvas 两者兼得。

- **95 个内置指标**——SMA、EMA、TEMA、VWMA、Hull MA、RSI、MACD、Bollinger、Envelope、Ichimoku、Pivot Points、Anchored VWAP、ZigZag、Linear Regression Channel、Awesome / Chaikin Oscillator 等。任何指标都能读取另一个指标的线（例如 RSI 的 SMA）。无需单独的计算库。
- **69 种画线工具**——趋势线（信息线、趋势角度、十字线）、斐波那契（回撤、扩展、通道、时间周期、速度阻力扇与弧、圆、螺旋、楔形）、水平/垂直线、通道、音叉与音叉扇、江恩扇 / 江恩箱 / 江恩正方、周期、谐波形态（XABCD、Cypher、ABCD、三驱动、头肩形态）、艾略特波浪、注释、标注与标记、画笔与路径、预测与投影、带仓位计算的多/空仓位、成交量分布区间。每种工具都有自己的设置，支持趋势线警报、分组与图层、撤销/重做和完整序列化。
- **18 种图表类型**——蜡烛图、折线、面积图、美国线、空心蜡烛图、基准线、高低图、平均K线（Heikin-Ashi）、Renko、Kagi、Line Break、Point & Figure、Range Bars、成交量蜡烛图、**等量图（Equivolume）**、HLC 面积图、阶梯线、带标记的折线。Renko 的砖块大小、Kagi 的反转幅度等参数都可以自行设置。
- **专业级交互**——可自由平移，越过最后一根K线进入右侧空白的未来区域（画线也能放在那里）；拖动价格/时间轴进行缩放；双击自动适配；`Ctrl/⌘+drag` 选择多个画线（之后可一起移动、修改样式或删除）；`Shift+drag` 测量（K线数 × 价差 × %）；`Alt+click` 固定对比提示；上下文光标（十字光标、抓手、调整大小箭头）；光标下随坐标轴移动的价格/时间胶囊标签；K线悬停高亮。
- **交易叠加层**——渲染持仓的开仓价线、盈亏区域以及 SL/TP 标记。订单显示为虚线。拖动 SL/TP 即可修改，通过每条线上的按钮撤单 / 平仓 / 反手，每笔成交都会标记在所在的K线上。ChartWidget 还提供边填写边校验订单的下单面板，以及包含持仓、挂单和历史记录的账户面板。非交易类项目可通过 `features.trading: false` 干净地关闭。
- **实时数据流**——内置 Binance、Coinbase、Bybit 和 Kraken 适配器，另有通用的 `WebSocketAdapter` / `PollingAdapter` 基类，约 20 行代码即可接入任意数据源。回看历史时自动加载更早的K线，任意周期（`7m`、`90m`、`2d`）都能由数据源自带的周期合成，Tick 图（`100T`）由它的成交合成，代码搜索和报价也直接来自数据源。
- **时区**——支持任意带夏令时的 IANA 时区（`'America/New_York'`）、固定偏移量或交易所自身的时区，作用于坐标轴、十字光标、日分隔线和交易时段。
- **16 种语言**——`ChartWidget` 支持英语、越南语、简体中文和繁体中文、日语、韩语、西班牙语、葡萄牙语、法语、德语、俄语、土耳其语、印尼语、泰语、阿拉伯语和希伯来语；阿拉伯语和希伯来语会从右到左镜像显示。
- **无障碍**——键盘导航、图表上的缩放和滚动按钮，以及供屏幕阅读器使用的摘要，可朗读当前视图并逐根朗读K线。
- **实盘执行**——连接 `ExecutionAdapter`，把交易叠加层变成真正的交易界面：在图表上拖动即可创建订单，并核对成交回报。附带 `PaperExecutionAdapter` 沙盒。
- **插件 SDK**——注册自定义指标、画线工具、图表类型和叠加层——可全局注册，也可按图表注册。
- **策略回测器**——`@tradecanvas/analytics` 提供逐K线运行的 `Backtester`，具备虚拟成交、手续费/滑点模型、投资组合跟踪和风险指标（Sharpe、Sortino、Calmar、最大回撤）。**现已附带 4 个开箱即用的参考策略 + 蒙特卡洛路径依赖分析。**
- **回放模式**——从任意位置回放图表自身的K线，也可以按更细的步长回放（小时图由 5 分钟K线逐步形成），支持播放 / 暂停 / 单步 / 跳转 / 速度，还能在回放的价格上模拟交易。组件为此提供了回放栏；`ReplayController` 也能在无界面的情况下驱动K线。
- **提醒**——可基于价格水平、指标线、画线，或一条线穿越另一条线；可在若干根K线内涨跌达到一定百分比时触发；可只看已收盘的K线；可设置到期时间。组件的提醒面板可以设置以上全部。
- **对比与价差**——在价格坐标上以百分比显示其他品种，或放在独立坐标、独立窗格中，或显示为价差或比值，并按时间与图表对齐。
- **价格格式**——每个标签上的价格都可使用你自己的格式或点的分数（以 1/32 报价的债券：110'165）；时间格式也可自定义；延长交易时段可开可关；导出数据时可带上指标线。
- **成交量分布**——可选的水平成交量直方图，按价格对可见范围内的成交量分桶，并高亮控制点（POC）。
- **自选列表与品种信息**——多个可切换、编辑和排序的代码列表，带实时报价；品种面板显示价格、市场状态、当日数据、交易时段和新闻。
- **CSV / JSON 拖放导入**——把文件拖到图表上，立即解析并加载。可识别表头布局、ISO/unix 秒/unix 毫秒时间戳，以及数组与对象两种 JSON 结构。
- **命名布局**——以名称保存图表（代码、周期、价格坐标、指标、画线、提醒），可打开、重命名、删除、自动保存当前打开的布局，支持 `Ctrl/⌘+S`。可保存在浏览器中，也可通过只需四个方法的 `LayoutStorage` 保存到你自己的服务器。按代码自动持久化（`persistLayouts`）也依然可用。
- **多图表**——`ChartWidgetGrid` 可并排放置最多六个完整组件，按需通过代码、周期、十字光标、时间或画线联动，并作为一个布局整体保存。`ChartGrid` 为不带组件的纯图表提供同样的能力。
- **信号标记与交易区域**——将机器人/算法的输出（方向箭头、入场→出场矩形）作为一等图表图层渲染。
- **快捷键列表**——在组件中按 `?` 打开分类的键盘快捷键参考。
- **可扩展的组件**——添加你自己的工具栏按钮和右键菜单项（`addToolbarButton`、`chartMenuItems`）。
- **保存/加载图表状态**——将画线、指标、主题和图表类型持久化为 JSON。一次调用即可恢复。
- **零依赖**——整个库完全自包含。没有 `d3`，没有 `chart.js`，也没有 `fancy-canvas`。

## 无界面 Chart

如果项目想自己掌控周边界面（自定义工具栏、框架专属控件），可以直接使用更底层的 `Chart` 类：

```typescript
import { Chart, BinanceAdapter } from '@tradecanvas/chart'

const chart = new Chart(document.getElementById('chart')!, {
  theme: 'dark',
  autoScale: true,
  features: {
    drawings: true,
    indicators: true,
    trading: true,           // set false to disable orders/positions entirely
    tradingContextMenu: true, // opt-in right-click order menu (off by default)
    volume: true,
  },
})

const adapter = new BinanceAdapter()
chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '5m', historyLimit: 300 })
```

### 组件选项

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `symbol` | `string` | `'BTCUSDT'` | 初始交易代码 |
| `timeframe` | `TimeFrame` | `'5m'` | 初始周期 |
| `theme` | `'dark' \| 'light' \| Theme` | `'dark'` | 图表主题 |
| `adapter` | `DataAdapter` | — | 数据源适配器 |
| `toolbar` | `boolean` | `true` | 显示顶部工具栏 |
| `drawingTools` | `boolean` | `true` | 显示左侧画线侧边栏 |
| `settings` | `boolean` | `true` | 显示设置按钮 |
| `trading` | `boolean` | `true` | 启用交易叠加层 |
| `statusBar` | `boolean` | `true` | 显示底部状态栏 |
| `rangeBar` | `boolean` | `true` | 状态栏上的范围预设（1D … All）和跳转到日期（Alt+G） |
| `indicatorLegend` | `boolean` | `true` | 在图表上列出指标（位于 OHLCV 图例下方及各自副图顶部），可显示 / 设置 / 删除 |
| `fullscreen` | `boolean` | `true` | 工具栏中的全屏按钮 |
| `symbols` | `string[]` | BTC/ETH/SOL/BNB | 可搜索的代码列表 |
| `timeframes` | `TimeFrame[]` | 1m 至 1M | 可选的周期；可在 ▾ 菜单中固定常用周期 |
| `chartTypes` | `ChartType[]` | 18 种 | 可用的图表类型 |
| `watchlist` | `boolean` | `false` | 右侧自选列表侧边栏 |
| `dragDropImport` | `boolean` | `true` | 将 CSV / JSON 文件拖到图表上加载数据 |
| `persistLayouts` | `boolean \| { keyPrefix, debounceMs }` | `false` | 按代码将指标 / 画线 / 图表类型保存到 localStorage |
| `onSymbolChange` | `(symbol) => void` | — | 代码切换回调 |
| `onTimeframeChange` | `(tf) => void` | — | 周期切换回调 |
| `onReady` | `(chart) => void` | — | 图表就绪时触发 |
| `locale` | `string` | `'en'` | 界面语言——内置 `'en'` 和 `'vi'`，另外 12 种可从 locales 入口加载，见下文 **组件国际化** |
| `messages` | `Partial<Record<MessageKey, string>>` | — | 在 `locale` 基础上覆盖或新增单条界面文案 |

### 图标

组件的图标集也已导出，可用于你自己的界面：`createIcon(name)`、
`createToolIcon(drawingTool)`、`createChartTypeIcon(chartType)` 返回以
`currentColor` 绘制的内联 SVG 字符串（24 px 网格，1.75 px 描边）。

```ts
import { createToolIcon } from '@tradecanvas/chart/widget'
button.innerHTML = createToolIcon('fibRetracement', 16)
```

### 组件国际化

`ChartWidget` 支持 16 种语言：英语、越南语、简体中文和繁体中文、日语、韩语、西班牙语、葡萄牙语、法语、德语、俄语、土耳其语、印尼语、泰语、阿拉伯语和希伯来语（后两种从右到左；可用 `dir` 自行设置方向）。它显示的每一条文案都已翻译：工具栏、设置、画线工具、提醒、对话框、命令面板、快捷键列表和通知。指标名称（SMA、RSI…）保持原样。语言在构造时设置。

英语和越南语为内置语言。其他语言从 `@tradecanvas/chart/widget/locales` 加载，因此页面只会打包它导入的语言：

```ts
import { ja } from '@tradecanvas/chart/widget/locales'

new ChartWidget(el, {
  locale: 'ja',
  messages: ja,                               // or registerWidgetLocales() for all of them
  chartOptions: { numberLocale: 'ja-JP' },    // separate: number/date formatting (see below)
});
```

`messages` 还可以在 `locale` 基础上覆盖单个键（`{ 'watchlist.title': 'Theo dõi' }`）。带地区的 locale 会回退到其语言（`ja-JP` → `ja`；`zh-TW` → 繁体中文）。

`locale`/`messages` 负责**文本**；`chartOptions.numberLocale` 则通过 `Intl` 控制数字和日期的**格式**（价格轴、图例、自选列表价格、当前价格标签、交易时段分隔日期）。

完整的键列表（`MessageKey`）见 `packages/library/src/widget/locales/en.ts`。

### 组件与无界面模式

| | `Chart`（无界面） | `ChartWidget` |
|---|---|---|
| 导入 | `@tradecanvas/chart` | `@tradecanvas/chart/widget` |
| 包含的界面 | 无——自行构建 | 完整的工具栏、侧边栏、设置 |
| 包体积影响 | ~50 KB gzip | ~65 KB gzip（含界面） |
| 框架 | 任意（React、Vue、Svelte、原生） | 原生 JS DOM（随处可用） |
| 定制 | 完全掌控 | 按区块开关 |
| 高级访问 | 直接调用 API | 通过 `widget.getChart()` 直接调用 API |

### 组件外观

组件的形状与尺寸——圆角、控件高度、字体、边框、阴影、选中按钮的样式、工具栏停靠还是悬浮——自成一套外观，与颜色相互独立。共有三套预设：**Studio**（默认）、**Terminal**（紧凑方正）和 **Capsule**（胶囊形、悬浮工具栏）。从其中一套出发，想改哪里就改哪里：

```ts
const widget = new ChartWidget(host, { ui: 'terminal' });
widget.setUI({ preset: 'studio', radius: { md: 10 }, density: 'compact', toolbar: 'floating', active: 'solid' });
```

图表上的价格标签也采用同样的圆角（`tagRadius`；直接使用 `Chart` 时，调用 `chart.setShapes({ tagRadius })`）。组件不会加载任何字体：请自行加载外观中指定的字体。参见[样式](https://bonguynvan.github.io/tradecanvas/docs/styling)。

### 组件主题

`ChartWidget` 自身的外围界面（工具栏、侧边栏、设置面板、自选列表——画布*之外*的所有部分）完全通过 `.tcw-root`（组件自己的根元素）上的 CSS 自定义属性设置样式。这些属性是**稳定且有文档的约定**：在次版本/补丁版本中只增不减——不升主版本号，就绝不会重命名或删除任何属性。从宿主页面覆盖它们即可；无需构建步骤，也无需主题对象。

```css
/* Dark is the default (no attribute needed); light sets data-tcw-theme="light" */
.my-app .tcw-root:not([data-tcw-theme="light"]) {
  --tcw-bg: #0a0a0f;
  --tcw-accent: #7c5cff;
  --tcw-radius: 0px;
  --tcw-radius-lg: 0px;
}
```

| 变量 | 默认值（深色） | 用途 |
|---|---|---|
| `--tcw-bg` | `#080b10` | 根背景 |
| `--tcw-bg-surface` | `#0c1016` | 面板 / 工具栏表面 |
| `--tcw-bg-elevated` | `#141922` | 弹出框、下拉菜单、模态框 |
| `--tcw-bg-overlay` | `rgba(20,25,34,.5)` | 浮层背后的遮罩 |
| `--tcw-border` | `#1f2630` | 默认边框 |
| `--tcw-border-strong` | `#2a323e` | 强调边框（焦点环、分隔线） |
| `--tcw-text` | `#e7e9ee` | 主要文字 |
| `--tcw-text-dim` | `#aab1bd` | 次要文字 |
| `--tcw-text-muted` | `#758091` | 第三级 / 占位文字 |
| `--tcw-accent` | `#f2a93b` | 主强调色（当前选项卡、焦点、链接） |
| `--tcw-accent-ink` | `#1a1204` | 强调色填充上的文字和图标 |
| `--tcw-accent-hover` | `#f5b95c` | 强调色悬停状态 |
| `--tcw-accent-soft` | `rgba(242,169,59,.14)` | 强调色浅色调（选中行背景） |
| `--tcw-accent-glow` | `rgba(242,169,59,.22)` | 强调色光晕（焦点光圈） |
| `--tcw-accent-line` | `rgba(242,169,59,.55)` | 强调色边框/下划线 |
| `--tcw-red` / `--tcw-red-soft` | `#e8505b` / 浅色调 | 下跌/卖出/负值 |
| `--tcw-green` / `--tcw-green-soft` | `#1fa874` / 浅色调 | 上涨/买入/正值 |
| `--tcw-amber` | `#ff9f43` | 警告 |
| `--tcw-hover-bg` | `rgba(255,255,255,.05)` | 行/按钮悬停背景 |
| `--tcw-active-bg` | `rgba(255,255,255,.08)` | 行/按钮按下背景 |
| `--tcw-divider` | `rgba(255,255,255,.06)` | 细分隔线 |
| `--tcw-ease` / `--tcw-ease-out` | cubic-bezier | 过渡缓动 |
| `--tcw-dur-fast` / `-normal` / `-slow` | `120ms` / `180ms` / `260ms` | 过渡时长 |
| `--tcw-radius-xs` / `-sm` / `--tcw-radius` / `-lg` / `-xl` | `3px` / `5px` / `7px` / `11px` / `16px` | 圆角刻度——设为 `0` 即为直角外观 |
| `--tcw-control-radius` / `--tcw-input-radius` / `--tcw-menu-radius` / `--tcw-dialog-radius` / `--tcw-panel-radius` / `--tcw-tooltip-radius` / `--tcw-tag-radius` / `--tcw-toast-radius` | 取自刻度 | 各类部件的圆角 |
| `--tcw-toolbar-h` / `--tcw-control-h` / `--tcw-control-h-sm` / `--tcw-icon` / `--tcw-sidebar-w` / `--tcw-menu-item-h` | `46px` / `30px` / `24px` / `18px` / `48px` / `30px` | 尺寸 |
| `--tcw-font` / `--tcw-font-size` / `--tcw-weight` / `--tcw-weight-strong` | `'Manrope', 'Inter', …` / `13px` / `500` / `600` | 字体 |
| `--tcw-label-case` / `--tcw-label-tracking` | `none` / `0em` | 小标签（分区标题） |
| `--tcw-border-w` / `--tcw-sep-w` | `1px` / `0px` | 边框宽度；工具栏分组之间的分隔线 |
| `--tcw-menu-shadow` / `--tcw-dialog-shadow` / `--tcw-tooltip-shadow` | 对应层级的阴影 | 菜单、对话框、提示框的阴影 |
| `--tcw-blur` / `--tcw-surface-opacity` | `0px` / `100%` | 磨砂效果的菜单 |
| `--tcw-shadow-sm` / `-md` / `-lg` / `-xl` | box-shadow 值 | 层级阴影 |
| `--tcw-ring` | `0 0 0 2px rgba(242,169,59,.45)` | 焦点环 |
| `--tcw-font-mono` | `'JetBrains Mono', …` | 等宽字体栈（盘口深度、代码） |

浅色主题（`[data-tcw-theme="light"]`）用自己的默认值重新定义了颜色组（`--tcw-bg*`、`--tcw-border*`、`--tcw-text*`、`--tcw-accent*`、`--tcw-hover-bg`、`--tcw-active-bg`、`--tcw-divider`、`--tcw-shadow*`）——如果同时支持两种主题，请同时覆盖这两个选择器。设置了 `ui` 选项时，组件会把外观的变量直接写到元素上，因此它们会覆盖你的 CSS；不设置时，这些变量仍由你自行设置。

## 功能

### 图表类型

| 类型 | 说明 |
|---|---|
| 蜡烛图（Candlestick） | 标准 OHLC 蜡烛 |
| 空心蜡烛图（Hollow Candle） | 由开盘/收盘决定是否填充 |
| 美国线（Bar，OHLC） | 经典的开-高-低-收K线 |
| 折线（Line） | 收盘价折线 |
| 面积图（Area） | 收盘价下方填充的面积 |
| 基准线（Baseline） | 以参考价格为界分成两种颜色的面积 |
| 平均K线（Heikin-Ashi） | 平滑后的蜡烛，便于识别趋势 |
| 砖形图（Renko） | 忽略时间的固定大小砖块 |
| 卡吉图（Kagi） | 基于反转的折线图 |
| 点数图（Point & Figure） | 用于供需分析的 X/O 列 |
| 新价线（Line Break） | 三线突破图 |
| 区间K线（Range Bars） | 固定价格区间的K线——每根K线的最高价 − 最低价等于设定的区间 |
| 成交量蜡烛图（Volume Candles） | 宽度与成交量成正比的蜡烛 |
| 等量图（Equivolume） | 覆盖全价格区间的方框，宽度与成交量占比成正比（Richard Arms 风格） |
| HLC 面积图（HLC Area） | 带收盘价线的高-低-收面积带 |
| 阶梯线（Step Line） | 由收盘价构成的阶梯形状 |
| 带标记的折线（Line with Markers） | 收盘价折线，每个数据点带圆形标记 |

### 多图表网格

并排显示多个同步的图表，十字光标与时间轴联动：

```typescript
import { ChartGrid, BinanceAdapter } from '@tradecanvas/chart'

const grid = new ChartGrid(document.getElementById('grid')!, {
  layout: '2x2',
  syncCrosshair: true,
  syncTimeAxis: true,
})

// An adapter keeps one stream: give each chart its own
grid.connectAll(() => new BinanceAdapter(), ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'], '5m')
```

如果希望每个图表都带完整组件、用一个工具条选择排列方式和同步项，并把整个网格保存为命名布局：

```typescript
import { ChartWidgetGrid } from '@tradecanvas/chart/widget'

const workspace = new ChartWidgetGrid(document.getElementById('grid')!, {
  layout: '1x2',
  adapter: () => new BinanceAdapter(),
  cells: [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT', timeframe: '1h' }],
  sync: { crosshair: true, interval: false, symbol: false, time: false, drawings: false },
})
workspace.setSync({ time: true })
```

支持的布局：`'1x1'`、`'1x2'`、`'2x1'`、`'2x2'`、`'1x3'`、`'3x1'`、`'2x3'`、`'3x2'`。

### 命令面板

在 ChartWidget 中按 `Ctrl+K`（或 `Cmd+K`）打开可搜索的命令面板。可快速查找并开关指标、更改图表类型、启用画线工具、切换周期，或触发操作（截图、切换主题、设置）。

### 金融图表

| 图表 | 说明 |
|---|---|
| SparklineChart | 由数字数组生成的小型内联折线/面积图——用于仪表盘和 KPI 卡片 |
| DepthChart | 买卖盘订单簿可视化，带累计成交量面积 |
| EquityCurveChart | 投资组合权益曲线，带回撤阴影和基准对比 |
| HeatmapChart | 采用矩形树图布局的彩色单元格网格——用于板块/市场表现 |
| WaterfallChart | 逐步累计的柱形——盈亏归因、收入桥、现金流 |
| GaugeChart | 速度表式仪表——KPI、风险评分、恐惧与贪婪指数 |

```typescript
import {
  SparklineChart, DepthChart, EquityCurveChart, HeatmapChart,
  WaterfallChart, GaugeChart,
} from '@tradecanvas/chart'

// Sparkline in a 120x48 container
new SparklineChart(el, { data: [100, 102, 98, 105, 103], mode: 'area', color: '#1fa874' })

// Equity curve with drawdown
new EquityCurveChart(el, { data: equityPoints, drawdown: true, benchmark: spyData })

// Order book depth
new DepthChart(el, { data: { bids, asks }, crosshair: true })

// Market heatmap (treemap weighted by market cap)
new HeatmapChart(el, { data: cells, weighted: true })

// P&L waterfall
new WaterfallChart(el, {
  data: [
    { label: 'Start', value: 10000, type: 'total' },
    { label: 'Gain', value: 1850 },
    { label: 'Loss', value: -620 },
    { label: 'End', value: 11230, type: 'total' },
  ],
})

// Fear & Greed gauge: zones light up to the value, the label shows the current zone
const gauge = new GaugeChart(el, {
  value: 72,
  label: 'Fear & Greed',
  zones: [
    { from: 0, to: 25, color: '#e8505b', label: 'Extreme fear' },
    { from: 25, to: 45, color: '#f2a93b', label: 'Fear' },
    { from: 45, to: 55, color: '#8a93a3', label: 'Neutral' },
    { from: 55, to: 75, color: '#62c895', label: 'Greed' },
    { from: 75, to: 100, color: '#1fa874', label: 'Extreme greed' },
  ],
  // pointer: 'needle',  // classic needle instead of the ring marker
})
gauge.setValue(85) // animates smoothly
```

### 指标（内置）

95 个指标——价格图上有：移动平均线（SMA、EMA、WMA、Hull、DEMA、TEMA、ALMA、KAMA、
LSMA、McGinley、SMMA、MA Cross、MTF MA）、带状与通道（Bollinger、
Keltner、Donchian、Envelope、Linear Regression）、趋势与止损（Ichimoku、
Supertrend、Parabolic SAR、Chandelier、Chande Kroll Stop、Alligator、ZigZag、
Fractals、Pivot Points）、VWAP 系列和 Volume Profile；副图中有：RSI、MACD、
Stochastic、ATR、ADX、CCI、OBV、MFI、Bollinger %B 和 BandWidth、Historical
Volatility、Ulcer Index，以及另外 40 个振荡器、成交量和波动率指标。
[指标目录](https://bonguynvan.github.io/tradecanvas/docs/indicators)
列出了每个 id 及其参数、线和水平线。

```typescript
import { indicatorSource } from '@tradecanvas/chart'

const rsi = chart.addIndicator('rsi', { period: 14 })!
chart.addIndicator('ema', { period: 21, source: 'hlc3' })                     // another price
chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') }) // RSI's own average, in RSI's pane
chart.setIndicatorLevels(rsi, [20, 50, 80])
```

- **数据源**：close、open、high、low、hl2、hlc3、ohlc4、hlcc4，或另一个指标的线。
- **副图**：每个副图一个数值坐标，供线、水平线、坐标轴和十字光标使用；可把指标移到另一个副图、新副图或移回主图；可收起、最大化副图并调整其顺序（`moveIndicatorToPane`、`setPaneCollapsed`、`setMaximizedPane`、`movePane`）。
- **撤销与模板**：Ctrl/Cmd+Z 可撤销对指标的修改，与画线共用同一份历史记录；ChartWidget 可把指标保存为命名模板（`getIndicatorSetup` / `applyIndicatorSetup`）。
- **水平线**：每个实例可单独编辑（RSI 30/70、CCI ±100 …），并保存在布局中。
- **数值标签**：每条线的最新值以该线的颜色显示在其坐标轴上。
- **自定义指标**声明自己的线（`plots`）、坐标、水平线和参数；图表负责绘制和标注。

无效参数（NaN、Infinity、非数字字符串、缺失的键）会回退为默认值，
而不会进入计算。

### 画线工具

趋势线、水平线、垂直线、射线、延长线、平行通道、斐波那契回撤、斐波那契扩展、**斐波那契时间周期**、矩形、椭圆、三角形、箭头、音叉、江恩扇、江恩箱、艾略特波浪、回归通道、日期区间、价格区间、测量、锚定 VWAP、固定区间成交量分布、文本标注

所有画线工具均支持：
- 点击放置，并可磁吸到 OHLC 值
- 撤销 / 重做（Ctrl+Z / Ctrl+Y）
- 序列化，便于保存/加载
- 自定义样式（颜色、线宽、虚线样式）

### 交易叠加层

直接在图表上渲染持仓和挂单，就像 MT4/MT5 那样。

```typescript
import type { TradingPosition, TradingOrder } from '@tradecanvas/chart'

chart.setPositions([{
  id: 'pos-1',
  side: 'buy',
  entryPrice: 3500,
  quantity: 1.5,
  closedQuantity: 0.5,   // partial close — visualized as a left-edge dim band
  stopLoss: 3400,
  takeProfit: 3700,
}])

chart.setOrders([{
  id: 'order-1',
  side: 'sell',
  type: 'limit',
  price: 3800,
  quantity: 0.5,
  label: 'TP',
  draggable: true,
}])

// Customize the position zone color via P&L thresholds
chart.setTradingConfig({
  pnlThresholds: [
    { pnl: -Infinity, color: '#b91c1c' },
    { pnl: 0,         color: '#94a3b8' },
    { pnl: 50,        color: '#16a34a' },
    { pnl: 200,       color: '#15803d' },
  ],
  // Custom label template — tokens: {side} {qty} {openQty} {closedQty} {entry} {price} {pnl} {pnlPct} {pnlSign}
  positionLabel: '{side} {openQty}/{qty} @ {entry} | {pnlSign}{pnl} ({pnlPct})',
})

// Listen for user drag-to-modify
chart.on('positionModify', (e) => console.log('SL/TP moved:', e.payload))
chart.on('orderModify', (e) => console.log('Order moved:', e.payload))

// The × and ⇅ buttons on the lines raise these; so can your own UI
chart.cancelOrderIntent('order-1')
chart.reversePositionIntent('pos-1')
chart.on('executionFill', (e) => console.log(e.payload.reason, e.payload.pnl))
```

### 信号标记

可视化来自机器人、指标或人工分析的买入/卖出信号。

```typescript
chart.addSignalMarker({
  time: 1715692800000,
  price: 62500,
  direction: 'long',
  confidence: 0.85,
  source: 'ema-crossover',
  label: 'EMA Cross',
})

// Color-code by source
chart.setSignalMarkerStyle({
  sourceColors: {
    'ema-crossover': '#4c8dff',
    'rsi-divergence': '#f2a93b',
    'whale-flow': '#9C27B0',
  },
})
```

### 交易区域

为已执行的交易渲染入场→出场矩形，并按盈亏着色。

```typescript
const zoneId = chart.addTradeZone({
  entryTime: 1715692800000,
  entryPrice: 62500,
  exitTime: 1715700000000,
  exitPrice: 63200,
  direction: 'long',
  pnl: 140,
  pnlPercent: 1.12,
})

// Update a live trade when it closes
chart.updateTradeZone(zoneId, {
  exitTime: Date.now(),
  exitPrice: 63500,
  pnl: 200,
})
```

### 实时数据流

```typescript
// Built-in Binance adapter (free, no API key)
chart.connect({
  adapter: new BinanceAdapter(),
  symbol: 'ETHUSDT',
  timeframe: '1m',
  historyLimit: 500,
})

// Or manual data feed
chart.setData(historicalBars)
chart.appendBar(newBar)
chart.updateLastBar(updatedBar)
chart.setCurrentPrice(3500.42)
```

**内置适配器**（全部免费，无需 API key）：`BinanceAdapter`、`CoinbaseAdapter`、`BybitAdapter`、`KrakenAdapter`，另有用于离线/测试的 `MockAdapter`。

```typescript
import { BybitAdapter, KrakenAdapter, CoinbaseAdapter } from '@tradecanvas/chart'

chart.connect({ adapter: new BybitAdapter(),    symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new KrakenAdapter(),   symbol: 'BTC/USD', timeframe: '5m' })
chart.connect({ adapter: new CoinbaseAdapter(), symbol: 'BTC-USD', timeframe: '15m' })
```

**约 20 行代码接入任意数据源。** 继承 `WebSocketAdapter`（实时 + REST 历史）或 `PollingAdapter`（仅 REST 的数据源）——基类负责连接生命周期、重连、解码和事件派发。你只需提供一个 URL 和一个解析函数：

```typescript
import { WebSocketAdapter } from '@tradecanvas/chart'

const myAdapter = new WebSocketAdapter({
  name: 'myexchange',
  wsUrl: (c) => `wss://api.myexchange.com/ws/${c.symbol}@kline_${c.timeframe}`,
  fetchHistory: (symbol, tf, limit) => fetch(`/candles?...`).then((r) => r.json()),
  parseMessage: (raw) => ({ bar: toBar(raw), closed: raw.k.x }),
})
```

### 实盘执行

连接 `ExecutionAdapter`，把仅用于展示的交易叠加层变成真正的交易界面。图表将订单/持仓意图转发给适配器，并渲染适配器回传的权威 `orders` / `positions`——**适配器是唯一的事实来源**。未连接适配器时，这些意图仍是普通事件（向后兼容）。

```typescript
import { PaperExecutionAdapter } from '@tradecanvas/chart'

chart.connectExecution(new PaperExecutionAdapter({ markPrice: 64000 }))

// Drag-to-create an order, then confirm:
chart.startOrderDraft('buy')   // draggable line at the latest close
chart.confirmOrderDraft()      // emits orderPlace → adapter fills → chart renders the position
// chart.cancelOrderDraft()

// One channel for failures (adapter-reported or a failed command):
chart.on('executionError', (e) => toast(e.payload.message))
```

实现 `ExecutionAdapter`（它与 `DataAdapter` 相对应）即可接入真实的券商 / OMS：`placeOrder`、`modifyOrder`、`cancelOrder`、`modifyPosition`、`closePosition`，以及 `orders` / `positions` / `fill` / `error` 事件。`PaperExecutionAdapter` 是用于演示和测试的虚拟成交沙盒。拖动创建的订单类型（限价或止损）根据你放下线条的位置相对于当前价格来推断。

### 插件——扩展图表

注册自定义**指标**、**画线工具**、**图表类型**和**叠加层**——可全局注册（之后创建的每个图表都会继承），也可按图表注册。

```typescript
import { Chart, registerPlugin, IndicatorBase } from '@tradecanvas/chart'

class MyIndicator extends IndicatorBase { /* descriptor, calculate(), render() */ }

// 1) Global — available to every chart created afterward:
registerPlugin({ kind: 'indicator', plugin: new MyIndicator() })

// 2) Per-chart at construction:
const chart = new Chart(el, { plugins: [{ kind: 'overlay', plugin: myHeatmap }] })

// 3) Imperative on an instance:
chart.plugins.register({ kind: 'chartType', plugin: myCustomCandles })
chart.setChartType('my-custom-candles')   // custom chart types render via the plugin
```

| 插件类型 | 约定 |
|---|---|
| `indicator` | `IndicatorPlugin` — `calculate()` + `render()` |
| `drawing` | `DrawingPlugin` — `render()` + `hitTest()` |
| `chartType` | `ChartTypePlugin` — `createRenderer()` + 可选的 `transform()` |
| `overlay` | `OverlayPlugin` — 在 `main` / `overlay` / `ui` 图层上执行 `render(ctx, { viewport, data, theme })` |

### 在图表之外计算指标

`IndicatorWorkerHost` 使用与 Web Worker 相同的消息，根据K线计算指标。
worker 脚本尚未包含在已发布的包中；传入 `null` 并注册插件，即可就地计算
（SSR、测试、脚本）：

```typescript
import { IndicatorWorkerHost, RSIIndicator } from '@tradecanvas/core'

const host = new IndicatorWorkerHost(null)
host.registerFallbackPlugin(new RSIIndicator())
const output = await host.calculate('rsi', { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } }, bars)
```

### 保存 / 加载

```typescript
const json = chart.saveState()
localStorage.setItem('my-chart', json!)

chart.loadState(localStorage.getItem('my-chart')!)

// Download / upload files
chart.downloadState('my-chart.json')
await chart.loadStateFromFile()

// Or keep a layout saved as it changes (debounced)
chart.setAutoSave('my-chart', 1500)
```

保存的布局包含图表类型、主题、画线、指标（参数、副图、颜色、可见性）
和提醒，也包括指标线上的提醒。

### 主题

```typescript
import { DARK_THEME, LIGHT_THEME, DARK_TERMINAL, volumeColor } from '@tradecanvas/chart'

// Built-in presets: DARK_THEME, LIGHT_THEME, DARK_TERMINAL
chart.setTheme(DARK_TERMINAL)  // fintech terminal: #0E0E0E bg, #00FF87/#FF3B4D candles, monospace

// Or customize any preset
chart.setTheme({
  ...DARK_THEME,
  candleUp: '#1fa874',
  candleDown: '#e8505b',
  volumeUp: volumeColor('#1fa874'),    // 成交量柱：K线颜色，半透明
  volumeDown: volumeColor('#e8505b'),
  background: '#0a0a0f',
})
```

### 事件

```typescript
chart.on('crosshairMove', (e) => { /* { point, bar, barIndex, indicatorValues } — also over indicator panes */ })
chart.on('crosshairLeave', () => { /* the pointer left the plot */ })
chart.on('drawingToolChange', (e) => { /* { tool } — null once a drawing is finished or cancelled */ })
chart.on('indicatorUpdate', (e) => { /* { from } — indicator values recomputed from this bar on */ })
chart.on('paneResize', (e) => { /* { instanceId, size } — an indicator pane was resized */ })
chart.on('indicatorChange', (e) => { /* { instanceId, change } — shown/hidden, restyled, levels, inputs or pane changed */ })
chart.on('barClick', (e) => { /* { bar, barIndex, point } */ })
chart.on('visibleRangeChange', (e) => { /* { from, to } — bar indices, not timestamps */ })
chart.on('priceRangeChange', (e) => { /* { min, max } — visible price bounds */ })
chart.on('zoomChange', (e) => { /* { barWidth } — pixels per bar */ })
chart.on('drawingCreate', (e) => { /* ... */ })
chart.on('orderModify', (e) => { /* ... */ })
chart.on('positionModify', (e) => { /* ... */ })
```

`visibleRangeChange`、`priceRangeChange` 和 `zoomChange` 会在每次平移、
缩放、调整尺寸和数据更新时触发——但只在相应的视口状态确实发生变化时才触发。
可用 `chart.getData()[e.payload.from].time` 将 `visibleRangeChange` 的索引
解析为时间。

### 回放模式

`ReplayController` 以可控速度向前播放历史 `DataSeries`。它与 `Chart` 解耦——可接入任意接收端（用于界面回放的图表，或用于无界面回测的策略函数）。

```typescript
import { ReplayController } from '@tradecanvas/chart'

const replay = new ReplayController({
  data: historicalBars,
  speed: 10,        // bars per second
  startIndex: 0,
})

// Seed the chart with the prefix before replay starts
chart.setData(replay.getPrefix())

// Each emitted bar drives the chart forward
replay.on('bar', ({ bar }) => chart.appendBar(bar))
replay.on('finished', () => console.log('done'))

replay.start()
// replay.pause(); replay.resume(); replay.step(5); replay.seek(200); replay.setSpeed(20)
```

### 图表交互

桌面交易图表应有的手势一应俱全：

| 手势 | 效果 |
|---|---|
| 左右拖动图表主体 | 沿时间平移 |
| 上下拖动图表主体 | 平移价格坐标（冻结自动缩放；双击价格轴恢复） |
| 上下拖动价格轴 | 压缩 / 拉伸纵轴（冻结自动缩放） |
| 左右拖动时间轴 | 缩放时间轴 |
| 双击价格轴 | 重新启用自动缩放 |
| 双击时间轴 | 让全部数据适配视口 |
| 滚轮 | 以光标为中心缩放 |
| 拖动副图分隔线 | 调整指标副图大小（悬停时显示 `ns-resize` 光标） |
| `Shift` + 拖动 | 测量尺（K线数 × 时间 × 价差 × %） |
| `Alt` + 点击 | 固定 OHLC 提示；实时十字光标显示与固定K线之间的 Δ |
| 悬停 | 价格 + 时间胶囊标签在两个坐标轴上跟随 |
| `Esc` | 取消固定提示 / 取消画线 |
| `?` | 显示键盘快捷键列表 *（组件）* |
| `Ctrl/⌘ + K` | 命令面板 *（组件）* |
| `Ctrl/⌘ + P` | 代码搜索 *（组件）* |
| `Ctrl/⌘ + Z` / `Shift + Z` | 撤销 / 重做画线 |

### 数据导入——拖放或编程方式

```typescript
import { parseOHLCV } from '@tradecanvas/chart'

const { data, rowCount, skipped } = parseOHLCV(csvText)
chart.setData(data)
```

把 CSV 或 JSON 文件拖到组件上即可立即加载。自动识别分隔符
（`,` / `;` / 制表符 / `|`）、有无表头、ISO 8601 时间戳，
以及数组的数组与对象数组两种 JSON 格式。

### 回测（`@tradecanvas/analytics`）

逐K线运行的策略回测器，具备虚拟成交、手续费/滑点模型和完整的风险指标报告。

```typescript
import { Backtester, PercentCommission, PercentSlippage } from '@tradecanvas/analytics'

const bt = new Backtester({
  initialCash: 10_000,
  commission: new PercentCommission(0.0005),
  slippage: new PercentSlippage(0.0003),
})

const result = bt.run(historicalBars, (ctx) => {
  // Strategy fn runs at close of each bar; orders fill on the NEXT bar.
  if (!ctx.position && smaFast > smaSlow) {
    ctx.placeOrder({ side: 'long', type: 'market', quantity: 1 })
  } else if (ctx.position && smaFast < smaSlow) {
    ctx.close()
  }
})

console.log(result.metrics.sharpe)         // 1.42
console.log(result.metrics.maxDrawdownPct) // 0.087
console.log(result.equityCurve)            // → feed into the chart via EquityCurveRenderer
```

返回：`fills`、已平仓的 `trades`、`equityCurve`、`metrics`（Sharpe、Sortino、Calmar、CAGR、最大回撤、胜率、盈利因子、期望值）。参见[在线回测演示](https://bonguynvan.github.io/tradecanvas/docs/analytics/)。

#### 策略库
四个即插即用的参考策略——每个都返回一个 `StrategyFn`，可直接传给
`Backtester.run()`：

```typescript
import {
  Backtester,
  smaCrossStrategy,
  rsiReversionStrategy,
  donchianBreakoutStrategy,
  bollingerReversionStrategy,
} from '@tradecanvas/analytics'

const bt = new Backtester({ initialCash: 10_000 })
bt.run(bars, smaCrossStrategy({ fastPeriod: 10, slowPeriod: 30 }))
bt.run(bars, donchianBreakoutStrategy({ entryPeriod: 20, exitPeriod: 10 }))
```

#### 蒙特卡洛路径依赖分析
将已实现交易的顺序随机打乱 N 次，揭示策略是否依赖于幸运的交易顺序。
P5/P95 区间窄 = 优势稳健；区间宽 = 依赖路径。

```typescript
import { runMonteCarlo } from '@tradecanvas/analytics'

const result = bt.run(bars, smaCrossStrategy())
const mc = runMonteCarlo(10_000, result.trades, { simulations: 1000, seed: 42 })

mc.equityBands              // [{ step, p5, p25, p50, p75, p95 }, …]
mc.finalEquityPercentiles   // { p5, p25, p50, p75, p95 }
mc.probabilityProfitable    // 0..1
mc.worstMaxDrawdownPct
```

## 对比

| 功能 | @tradecanvas/chart | lightweight-charts | chart.js | Highcharts Stock |
|---|---|---|---|---|
| 图表类型 | 18 + 6 种金融图表 | 4 | 8（非金融） | 10+ |
| 金融图表 | 迷你走势图、深度图、权益曲线、热力图、瀑布图、仪表图 | 无 | 无 | 部分 |
| 内置指标 | 95 | 0 | 0 | ~30 |
| 画线工具 | 69 | 0 | 0 | 部分 |
| 交易叠加层 | 完整（持仓 + 订单 + 拖动） | 无 | 无 | 无 |
| 实时数据流 | 内置（Binance） | 手动 | 手动 | 内置 |
| 保存/加载状态 | 是 | 否 | 否 | 是 |
| 回放模式 | 是（`ReplayController`） | 否 | 否 | 否 |
| 回测器 | 是（`@tradecanvas/analytics`） | 否 | 否 | 否 |
| 多图表网格 | 是（`ChartGrid`） | 否 | 否 | 是 |
| 包体积（gzip） | ~100 KB 核心 | ~45 KB | ~70 KB | ~200 KB |
| 依赖 | 0 | 1 | 0 | 0 |
| 组件（完整界面） | 是（`ChartWidget`） | 否 | 否 | 否 |
| 许可证 | MIT | Apache 2.0 | MIT | 商业许可 |

## API 概览

### `new Chart(container, options)`

```typescript
const chart = new Chart(element, {
  chartType: 'candlestick',
  theme: DARK_THEME,
  autoScale: true,
  rightMargin: 5,
  numberLocale: 'en-US',  // or 'de-DE', 'vi-VN', etc. — BCP 47 locale
  crosshair: { mode: 'magnet' },
  features: { drawings: true, indicators: true, trading: true, volume: true },
})

// Change locale at runtime
chart.setNumberLocale('de-DE')  // 65.234,00
```

### 主要方法

| 方法 | 说明 |
|---|---|
| `setData(bars)` | 加载历史 OHLCV 数据 |
| `appendBar(bar)` | 追加一根新K线 |
| `appendBars(bars)` | 批量追加（重连后补齐数据） |
| `updateLastBar(bar)` | 更新正在形成的K线 |
| `setCurrentPrice(price, pulseColor?)` | 显示实时价格线 |
| `connect(config)` | 连接实时数据源 |
| `setTimeframe(tf)` | 在当前数据流上切换周期 |
| `setChartType(type)` | 切换图表类型 |
| `setTheme(theme)` | 应用主题（DARK_THEME、LIGHT_THEME、DARK_TERMINAL） |
| `setNumberLocale(locale)` | 设置数字格式的 locale（en-US、de-DE、vi-VN） |
| `setStatusText(text)` | 在图例区域显示状态（"LIVE · 8ms"） |
| `addIndicator(id, params?)` | 添加技术指标 |
| `removeIndicator(instanceId)` | 删除指标 |
| `setDrawingTool(tool)` | 启用画线工具 |
| `setPositions(positions)` | 渲染持仓 |
| `setOrders(orders)` | 渲染挂单 |
| `setVolumeProfileVisible(v)` | 开关水平成交量分布叠加层 |
| `setVolumeProfileConfig({ buckets, widthRatio, opacity, highlightPoC })` | 调整成交量分布 |
| `setAutoScale(v)` / `setLogScale(v)` | 锁定或更改价格坐标模式 |
| `setInvertScale(v)` | 上下翻转价格坐标 |
| `fitContent()` / `scrollToEnd()` | 适配全部数据 / 跳到最新的实时位置 |
| `setVisibleRangePreset(p)` | 显示 `1D`、`5D`、`1M`、`3M`、`6M`、`YTD`、`1Y`、`5Y` 或 `All` |
| `goToTime(time)` | 将某一时间的K线居中 |
| `setCrosshairTime(time)` | 同步另一个图表的十字光标（仅竖线） |
| `copyDrawings()` / `pasteDrawings()` | 复制选中的画线，粘贴到当前或另一个图表 |
| `setStayInDrawingMode(v)` | 每次画完后保持当前画线工具 |
| `saveState(key?)` | 序列化图表状态 |
| `loadState(json)` | 恢复图表状态 |
| `screenshot()` | 将图表下载为图片 |
| `setRenderer(mode)` | 用 `'canvas'`（默认）、`'webgl'` 或 `'auto'` 绘制；返回当前实际使用的渲染器 |
| `getRenderer()` | `'canvas'` 或 `'webgl'` |
| `on(event, handler)` | 订阅事件 |
| `destroy()` | 清理所有资源 |

### 数据格式

```typescript
interface OHLCBar {
  time: number    // Unix time in ms or seconds (up to 1e12 is read as seconds); ascending
  open: number
  high: number
  low: number
  close: number
  volume: number
}
```

## 示例

| 示例 | 说明 |
|---|---|
| [在线演示](https://bonguynvan.github.io/tradecanvas/) | 功能实验室：画线工具、指标、交易、范围、分页历史、K线回放、支持低于一美分价格的 16 种语言、带实时报价的自选列表、20 万根K线、慢速网络下的切换——每一项都在实时图表上。网站和文档也提供越南语、中文、日语、韩语和西班牙语版本 |
| [StackBlitz 沙盒](https://bonguynvan.github.io/tradecanvas/examples/) | 一键即可 fork：原生 `Chart`、`ChartWidget`、React / Vue / Svelte 封装、金融图表 |
| [`@tradecanvas/react`](./packages/react/) · [`/vue`](./packages/vue/) · [`/svelte`](./packages/svelte/) | 框架组件——响应式 props，带类型，零样板代码 |

## AI 编程工具

- [`llms.txt`](https://bonguynvan.github.io/tradecanvas/llms.txt) 和
  [`llms-full.txt`](https://bonguynvan.github.io/tradecanvas/llms-full.txt)
  把文档集中提供给 AI 助手。
- 一个 agent 技能 [`skills/tradecanvas`](skills/tradecanvas/SKILL.md)，教编程 agent
  使用 TradeCanvas 进行开发：入口点、能避免大多数 bug 的规则，以及经 CI
  针对本库做过类型检查的完整示例。将该文件夹复制到你项目的 `.claude/skills/`
  （或你所用 agent 的技能文件夹）即可使用。

## 浏览器支持

Chrome 80+、Firefox 80+、Safari 14+、Edge 80+

## 框架集成

官方封装组件——响应式 props、ref、零样板代码。与核心库一起以 `1.x` 版本发布：

```bash
npm install @tradecanvas/react    # or @tradecanvas/vue · @tradecanvas/svelte
```

```tsx
import { TradeCanvas } from '@tradecanvas/react'

<TradeCanvas symbol="BTCUSDT" timeframe="5m" theme="dark" indicators={['rsi', 'macd']} />
```

三者共享相同的 props 接口，并通过 `onReady` / ref / `bind:chart` 交给你底层的 `Chart`（用于画线、交易、执行、插件）。参见[框架文档](https://bonguynvan.github.io/tradecanvas/docs/frameworks)。

### 无界面（自行管理生命周期）

`Chart` 类也可以直接接收一个 DOM 元素——与框架无关：

**React：**

```tsx
import { useEffect, useRef } from 'react'
import { Chart, BinanceAdapter } from '@tradecanvas/chart'

function TradingChart() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const chart = new Chart(ref.current!, {
      theme: 'dark',
      features: { indicators: true, drawings: true },
    })
    chart.connect({
      adapter: new BinanceAdapter(),
      symbol: 'BTCUSDT',
      timeframe: '5m',
    })
    return () => chart.destroy()
  }, [])

  return <div ref={ref} style={{ width: '100%', height: 500 }} />
}
```

**Svelte：**

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Chart, BinanceAdapter, DARK_THEME } from '@tradecanvas/chart'
  import type { TimeFrame } from '@tradecanvas/chart'

  interface Props { symbol?: string; timeframe?: TimeFrame }
  let { symbol = 'BTCUSDT', timeframe = '5m' }: Props = $props()

  let container: HTMLDivElement
  let chart: Chart | null = null

  onMount(() => {
    chart = new Chart(container, {
      chartType: 'candlestick',
      theme: DARK_THEME,
      autoScale: true,
      features: { indicators: true, drawings: true, volume: true },
    })
    chart.connect({ adapter: new BinanceAdapter(), symbol, timeframe })
  })

  onDestroy(() => chart?.destroy())

  $effect(() => {
    if (!chart) return
    chart.disconnectStream()
    chart.connect({ adapter: new BinanceAdapter(), symbol, timeframe })
  })
</script>

<div bind:this={container} style="width: 100%; height: 600px" />
```

**Vue：**

```vue
<template>
  <div ref="chartContainer" style="width: 100%; height: 600px" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Chart, BinanceAdapter, DARK_THEME } from '@tradecanvas/chart'

const chartContainer = ref<HTMLDivElement>()
let chart: Chart | null = null

onMounted(() => {
  if (!chartContainer.value) return
  chart = new Chart(chartContainer.value, {
    chartType: 'candlestick',
    theme: DARK_THEME,
    autoScale: true,
    features: { indicators: true, drawings: true, volume: true },
  })
  chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '5m' })
})

onUnmounted(() => chart?.destroy())
</script>
```

## 性能

双画布 Canvas2D 管线：悬停时只重绘较薄的顶层画布，从不重绘场景。以下五点让大数据量依然流畅：

- **LTTB 降采样**——当K线数远多于像素时，折线 / 面积图会使用 Largest-Triangle-Three-Buckets 自动将可见范围降采样到每像素约 2 个点。线条在视觉上完全一致，绘制的点却少了几十倍；正常缩放下则不做任何处理。`lttbDownsample` 工具函数也已导出，供你自行使用。
- **缩小时的指标**——当每根K线窄于一个像素时，指标的线、带和柱状图按像素列各画一段，而不是描一条穿过数千个点的线：看起来几乎一样，光栅化工作却少得多（在集成显卡上，200,000 根K线加四个指标缩小时，每帧约从 54 ms 降到 21 ms）。`node scripts/bench-render.mjs` 可在你的机器上测量。
- **可见范围渲染**——每个渲染器只遍历视图内的K线，从不遍历整个序列。已加载K线从 500 根增加到 100,000 根，悬停和平移的每帧开销始终持平。
- **实时 tick 的增量指标**——一个 tick 只会改变正在形成的K线，因此实现了 `update()` 的内置指标（SMA、EMA、WMA、VWMA、Bollinger、Envelope、RSI、MACD、ATR、OBV、Stochastic）只重算这一根K线，而不是整个历史。其他指标回退为完整重算。自定义插件可通过 `IndicatorPlugin.update` 选择启用。
- **低成本的完整加载**——切换代码/周期时，每个指标只重算一次。它们按K线的 `values` 查找表是一个 `IndicatorValueMap`（K线按时间顺序到达时以数组为底层，构建成本比以时间戳为键的 `Map` 低约 3 倍），并且 `setData` 会复用已经格式良好的K线，而不是逐根复制。

BB + EMA + RSI + MACD（`pnpm bench`，单核）：

| 历史长度 | 完整重算（切换 / `setData`） | 增量 `update()`（实时 tick） |
|---|---|---|
| 20,000 根K线 | ~5 ms | ~0.0005 ms |
| 100,000 根K线 | ~27 ms | ~0.001 ms |

降采样吞吐量（`pnpm bench`，单核）：

| 可见点数 → 1600 | 每帧耗时 | 吞吐量 |
|---|---|---|
| 10,000 | ~0.025 ms | 39,600 / s |
| 100,000 | ~0.32 ms | 3,100 / s |
| 1,000,000 | ~2.6 ms | 380 / s |

一个 10 万根K线的折线图降采样约需 0.3 ms——远低于 16.6 ms 的帧预算——之后绘制的点数减少约 62 倍（100k → 1600）。

### WebGL 渲染器（预览）

`renderer: 'webgl'` 用 WebGL 2 绘制图表区和指标窗格，画在 2D 场景下方的一个画布上：网格、交易时段、K线和成交量直接绘制；指标、对比线和大多数图表类型的 Canvas 2D 绘制会被记录成 GPU 上的线条、填充和矩形，边缘像 Canvas 2D 一样抗锯齿。深度热力图、成交量分布和市场轮廓也以同样方式记录，画在K线下方；显示统计框或 TPO 字母的市场轮廓仍用 Canvas 2D 绘制。文字、绘图、订单、坐标轴和十字线仍用 Canvas 2D，GPU 无法画得一致的内容也交给 Canvas 2D（按原顺序绘制，层叠顺序不变）；自定义指标插件无需修改即可使用。K线与 Canvas 2D 落在完全相同的设备像素上；线条和填充只在少数抗锯齿边缘像素上有差别。WebGL 代码是一个独立的 chunk（gzip 后约 17 KB），首次使用时才加载；没有 WebGL 2 或上下文丢失时，图表会继续用 Canvas 2D 绘制。上下文恢复后，图表也会回到 WebGL。一个页面最多同时有 8 个图表用 WebGL 绘制（`setMaxWebGLCharts`），因为 Chrome 和 Safari 每个页面只保留约 16 个 WebGL 上下文，超过后会丢弃最旧的；超出限制的图表先用 Canvas 2D 绘制，直到有上下文被释放。已在 Chrome、Firefox 和 WebKit 中验证。

```typescript
const chart = new Chart(el, { renderer: 'webgl' })   // or 'auto': WebGL on a hardware GPU only

chart.on('rendererChange', (e) => console.log(e.payload))
// { renderer: 'webgl', reason?: 'contextRestored' }, or { renderer: 'canvas', reason: 'unsupported' | 'contextLost' | 'limit' }

await chart.setRenderer('canvas')   // resolves to what draws now

setMaxWebGLCharts(4)   // from '@tradecanvas/chart': at most 4 charts on the page draw with WebGL (8 by default)
```

平移时的每帧耗时，集成显卡（Intel UHD；16.7 ms 即 60 fps）：

| 图表 | 像素比 | Canvas 2D | WebGL |
|---|---|---|---|
| 1600×900，500 根K线 + 4 个指标 | 2 | 27.4 ms | 19.6 ms |
| 1600×900，在 200,000 根K线上缩小 + 4 个指标 | 2 | 34.5 ms | 20.2 ms |
| 1600×900，在 1,000,000 根K线上缩小 + 4 个指标 | 2 | 34.5 ms | 16.7 ms |
| 1600×900，深度热力图，240 个快照 × 80 档 | 2 | 25.5 ms | 16.8 ms |
| 六个图表，每个 500 根K线加两个指标 | 2 | 23.5 ms | 17.2 ms |
| 2560×1400，2,000 根K线 + 4 个指标 | 1 | 41.6 ms | 17.7 ms |
| 2560×1400，2,000 根K线 + 4 个指标 | 1.5 | 70.8 ms | 17.6 ms |
| 2560×1400，2,000 根K线 + 4 个指标 | 2 | 114.5 ms | 29.1 ms |
| 2560×1400，2,000 根K线 | 2 | 33.1 ms | 20.9 ms |

上表中 WebGL 的大多数帧都在 16.7 ms；平均值包含了少数较长的帧。像素比 2、2560×1400 的图表上，仅浏览器合成全尺寸图层就要在这块 GPU 上花约 23 ms。`node scripts/bench-render.mjs --renderer=webgl` 可在你的机器上测出这些数字。

## 架构

两层叠放的画布——悬停时只重绘较薄的顶层画布：

```
  Top canvas    (crosshair + axis pills, legend, countdown, measure)   z=1
  Scene canvas  (grid, candles, indicators, drawings, orders, axes)    z=0
```

## 相关项目

- **[bo-grid](https://github.com/bonguynvan/bo-grid)**——面向金融科技界面的小巧、快速的 **Svelte 5** 数据表格：canvas 迷你走势图、批量实时单元格更新、虚拟滚动、分组 / 透视 / 树形数据，以及 Excel 导出，核心 gzip 后约 32 KB。它是同一套工具包中的表格部分——与 TradeCanvas 搭配即可组成完整的交易台。**[在线演示](https://bonguynvan.github.io/bo-grid/)**

## 参与贡献

欢迎提交 bug 报告、想法和 pull request。[CONTRIBUTING.md](./CONTRIBUTING.md) 介绍了环境搭建（`pnpm install && pnpm build && pnpm test`）、仓库结构以及 pull request 的要求。发现安全问题？请按照 [SECURITY.md](./SECURITY.md) 私下报告，不要公开提 issue。

如果 TradeCanvas 帮你节省了时间，在 GitHub 上点个 star，能让更多开发者发现它。

## 许可证

[MIT](./LICENSE)
