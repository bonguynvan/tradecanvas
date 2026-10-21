<p align="center">
  <a href="https://bonguynvan.github.io/tradecanvas/zh/"><img src=".github/assets/banner.png" alt="TradeCanvas，为交易应用打造的图表引擎" width="100%"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@tradecanvas/chart"><img src="https://img.shields.io/npm/v/@tradecanvas/chart?style=flat-square&labelColor=0b0e13&color=f2a93b&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@tradecanvas/chart"><img src="https://img.shields.io/npm/dm/@tradecanvas/chart?style=flat-square&labelColor=0b0e13&color=3ccf91" alt="npm downloads"></a>
  <a href="https://github.com/bonguynvan/tradecanvas/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/bonguynvan/tradecanvas/ci.yml?branch=main&style=flat-square&labelColor=0b0e13&label=CI" alt="CI status"></a>
  <a href="https://pkg.pr.new/~/bonguynvan/tradecanvas"><img src="https://pkg.pr.new/badge/bonguynvan/tradecanvas" alt="pkg.pr.new previews"></a>
  <img src="https://img.shields.io/badge/third--party%20deps-0-3ccf91?style=flat-square&labelColor=0b0e13" alt="No third-party dependencies">
  <img src="https://img.shields.io/badge/TypeScript-strict-4c8dff?style=flat-square&labelColor=0b0e13" alt="TypeScript">
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/bonguynvan/tradecanvas?style=flat-square&labelColor=0b0e13&color=a9b0bd" alt="MIT license"></a>
  <a href="https://github.com/bonguynvan/tradecanvas/stargazers"><img src="https://img.shields.io/github/stars/bonguynvan/tradecanvas?style=flat-square&labelColor=0b0e13&color=f2a93b" alt="GitHub stars"></a>
  <a href="https://github.com/sponsors/bonguynvan"><img src="https://img.shields.io/github/sponsors/bonguynvan?style=flat-square&labelColor=0b0e13&color=db61a2&label=sponsors&logo=githubsponsors&logoColor=db61a2" alt="GitHub Sponsors"></a>
</p>

<p align="center">
  <b><a href="https://bonguynvan.github.io/tradecanvas/zh/">在线演示</a></b> ·
  <a href="https://bonguynvan.github.io/tradecanvas/zh/docs/getting-started/">文档</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/zh/examples/">示例</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/zh/playground/">Playground</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/zh/audit/">系统审计</a> ·
  <a href="./CHANGELOG.md">更新日志</a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.vi.md">Tiếng Việt</a> · <b>简体中文</b> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a>
</p>

**一套完整的 Web 交易图表。** 从K线到砖形图（Renko），134 个指标、69 种画线工具、交易所实时行情和图上下单，用 Canvas 2D 或 WebGL 绘制，不依赖任何第三方库。可以直接使用完整的 `ChartWidget`，也可以在无界面的 `Chart` 上构建自己的界面，支持 TypeScript、React、Vue 和 Svelte。

<p align="center">
  <a href="https://bonguynvan.github.io/tradecanvas/zh/"><img src=".github/assets/hero.png" alt="ChartWidget 显示来自 Binance 的 BTCUSDT 实时行情：EMA 21 和 55、RSI、一条趋势线、一个多头仓位，以及带实时报价的自选列表" width="100%"></a>
</p>

## 亮点

- **18 种图表类型**，从蜡烛图和平均K线（Heikin-Ashi）到 Renko、Kagi、Point & Figure 和等量图（Equivolume），另有六种金融图表（迷你走势图、深度图、权益曲线、热力图、瀑布图、仪表盘）。
- **134 个指标和 69 种画线工具**：指标可叠加在指标上，趋势线可设警报，支持模板、分组、撤销与重做。
- **在图表上交易**：实时盈亏的持仓，可拖动的订单和止损/止盈，下单面板、账户面板，以及模拟交易经纪商或你自己的执行适配器。
- **实时数据**：内置 Binance、Bybit、Coinbase 和 Kraken，其他数据源约二十行代码即可接入；回看时自动加载更早的历史，支持任意周期和 Tick 图。
- **Canvas 2D 或 WebGL**：一百万根K线以 60 fps 平移，在任何屏幕缩放比例下都清晰锐利。
- **完整的工作区**：多图表网格、命名布局、可模拟交易的K线回放，以及 `@tradecanvas/analytics` 中的回测器。
- **按你的需要定制**：101 个样式键、112 个功能开关、三种外观，以及用于指标、画线工具、图表类型和叠加层的插件。
- **人人可用**：组件支持 30 种语言（包括从右到左的语言），并支持屏幕阅读器和键盘操作。

## 安装

```bash
npm install @tradecanvas/chart
```

## 快速开始

`ChartWidget` 一次调用即可得到完整的交易界面：工具栏、画线侧边栏、设置和状态栏。

```typescript
import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(), // 实时数据，无需 API key
  trading: true,
})
```

想自己掌控界面，就使用无界面的 `Chart` 及其 API：

```typescript
import { Chart } from '@tradecanvas/chart'

const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' })
chart.setData(bars) // [{ time, open, high, low, close, volume }, …]
chart.addIndicator('ema', { period: 50 })
chart.addIndicator('rsi')
```

你自己的数据源可通过 `WebSocketAdapter` 或 `PollingAdapter` 接入，参见[实时数据](https://bonguynvan.github.io/tradecanvas/zh/docs/realtime/)。

## 框架

```bash
npm install @tradecanvas/react    # 或 @tradecanvas/vue、@tradecanvas/svelte
```

```tsx
import { TradeCanvas } from '@tradecanvas/react'

<TradeCanvas symbol="BTCUSDT" timeframe="5m" indicators={['rsi', { id: 'ema', params: { period: 50 } }]} />
```

三个组件共享相同的 props，并把底层的 `Chart` 交给你。参见[框架](https://bonguynvan.github.io/tradecanvas/zh/docs/frameworks/)。

## 功能一览

<table>
  <tr>
    <td width="50%" valign="top">
      <a href=".github/assets/drawings.png"><img src=".github/assets/drawings.png" alt="画线工具：带注释的斐波那契回撤、一条趋势线、艾略特推动浪和一个多头仓位"></a>
      <br><b>69 种画线工具</b><br>
      斐波那契、江恩、音叉、艾略特波浪、谐波形态、注释，以及能自动计算仓位大小的多空仓位工具。
    </td>
    <td width="50%" valign="top">
      <a href=".github/assets/trading.png"><img src=".github/assets/trading.png" alt="图上交易：带止损和止盈的多头仓位、一张买入止损单和一张卖出限价单，以及账户面板"></a>
      <br><b>在图表上交易</b><br>
      实时盈亏的持仓、可拖动改价的订单、下单面板和账户面板。
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <a href=".github/assets/grid.png"><img src=".github/assets/grid.png" alt="2×2 工作区：多种周期的 BTC、ETH、SOL 和 BNB 图表"></a>
      <br><b>多图表工作区</b><br>
      最多六个图表并排显示，可按代码、周期、十字光标、时间或画线联动。
    </td>
    <td width="50%" valign="top">
      <a href=".github/assets/looks.png"><img src=".github/assets/looks.png" alt="同一图表的三种外观：studio、terminal，以及浅色主题下的 capsule"></a>
      <br><b>自定义外观</b><br>
      三种预设，或自定义圆角、密度、字体和价格标签，深色和浅色主题皆可。
    </td>
  </tr>
</table>

## 文档

| 主题 | |
|---|---|
| [入门](https://bonguynvan.github.io/tradecanvas/zh/docs/getting-started/) | 安装、组件、无界面图表 |
| [图表类型](https://bonguynvan.github.io/tradecanvas/zh/docs/chart-types/) · [指标](https://bonguynvan.github.io/tradecanvas/zh/docs/indicators/) · [画线工具](https://bonguynvan.github.io/tradecanvas/zh/docs/drawing-tools/) | 图表能绘制什么，以及各自的设置 |
| [实时数据](https://bonguynvan.github.io/tradecanvas/zh/docs/realtime/) | 内置数据源、自定义适配器、历史数据、Tick 图 |
| [交易](https://bonguynvan.github.io/tradecanvas/zh/docs/trading/) | 订单、持仓、执行适配器、回放 |
| [样式](https://bonguynvan.github.io/tradecanvas/zh/docs/styling/) · [自定义](https://bonguynvan.github.io/tradecanvas/zh/docs/customization/) | 主题、样式键、外观、功能开关、自定义部件 |
| [插件](https://bonguynvan.github.io/tradecanvas/zh/docs/plugins/) | 自定义指标、画线工具、图表类型和叠加层 |
| [分析](https://bonguynvan.github.io/tradecanvas/zh/docs/analytics/) · [金融图表](https://bonguynvan.github.io/tradecanvas/zh/docs/finance/) | 回测与风险指标；深度图、权益曲线等图表 |
| [性能](https://bonguynvan.github.io/tradecanvas/zh/docs/performance/) · [API 参考](https://bonguynvan.github.io/tradecanvas/zh/docs/api/) | 性能测量与完整 API |

文档也提供 English、Tiếng Việt、日本語、한국어 和 Español 版本。

## 性能

在使用集成显卡（Intel UHD）的 Chrome 中测得；完整表格见[系统审计](https://bonguynvan.github.io/tradecanvas/zh/audit/)。

| | |
|---|---|
| 1,000,000 根K线 + 4 个指标，缩小视图，WebGL | 每帧 16.7 ms（60 fps） |
| 100,000 根K线、四个指标时的一次实时 tick | ~0.001 ms |
| `Chart` / `ChartWidget`，压缩并 gzip 后 | 176 KB / 315 KB |

## 包

| 包 | |
|---|---|
| [`@tradecanvas/chart`](https://www.npmjs.com/package/@tradecanvas/chart) | 图表和 `ChartWidget`（`/widget`） |
| [`@tradecanvas/react`](https://www.npmjs.com/package/@tradecanvas/react) · [`/vue`](https://www.npmjs.com/package/@tradecanvas/vue) · [`/svelte`](https://www.npmjs.com/package/@tradecanvas/svelte) | 框架组件 |
| [`@tradecanvas/analytics`](https://www.npmjs.com/package/@tradecanvas/analytics) | 回测器与风险指标 |
| `@tradecanvas/core` · `@tradecanvas/commons` | 引擎与共享类型，随图表一起安装 |

## 预览构建

每个 pull request 和 `main` 上的每次提交都会发布到 [pkg.pr.new](https://pkg.pr.new)，因此修复或新功能在正式发布前就能试用。按 pull request 编号或提交安装预览版：

```bash
npm install https://pkg.pr.new/@tradecanvas/chart@123      # pull request #123
npm install https://pkg.pr.new/@tradecanvas/chart@a1b2c3d  # main 上的一次提交
```

每个 pull request 都会收到一条评论，列出每个包的确切安装命令。

## 浏览器支持

Chrome 80+、Firefox 80+、Safari 14+、Edge 80+。

## AI 编程工具

[`llms.txt`](https://bonguynvan.github.io/tradecanvas/llms.txt) 和 [`llms-full.txt`](https://bonguynvan.github.io/tradecanvas/llms-full.txt) 把文档集中在一个文件里提供给 AI 助手；[`skills/tradecanvas`](skills/tradecanvas/SKILL.md) 中的 agent 技能则通过经 CI 类型检查的示例，教编程 agent 使用 API。

## 相关项目

- **[bo-grid](https://github.com/bonguynvan/bo-grid)**：面向金融科技界面的小巧、快速的 Svelte 5 数据表格，是交易台中的表格部分。[在线演示](https://bonguynvan.github.io/bo-grid/)

## 企业使用

要把 TradeCanvas 交到您的客户手中？无需显示任何标志，也无需提交申请。[企业页面](https://bonguynvan.github.io/tradecanvas/zh/business/)逐条回答 IT 审查常问的问题并附上出处，还介绍了首批合作伙伴计划。联系方式：business@tradecanvas.dev。

## 参与贡献

问题、想法以及你用 TradeCanvas 做的作品，请发到 [Discussions](https://github.com/bonguynvan/tradecanvas/discussions)；bug 请提 issue，也欢迎 pull request。[CONTRIBUTING.md](./CONTRIBUTING.md) 介绍了环境搭建（`pnpm install && pnpm build && pnpm test`）以及 pull request 的要求。发现安全问题？请按照 [SECURITY.md](./SECURITY.md) 报告，不要公开提 issue。

## 赞助

TradeCanvas 免费、采用 MIT 许可，公开开发和维护。如果它对你的产品有帮助，可以通过 [GitHub Sponsors](https://github.com/sponsors/bonguynvan) 支持它的开发。

## 许可证

[MIT](./LICENSE)
