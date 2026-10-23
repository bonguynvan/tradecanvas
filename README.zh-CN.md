<p align="center">
  <a href="https://tradecanvas.dev/zh/"><img src=".github/assets/banner.png" alt="TradeCanvas，为交易应用打造的图表引擎" width="100%"></a>
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
  <b><a href="https://tradecanvas.dev/zh/chart/">在线演示</a></b> ·
  <a href="https://tradecanvas.dev/zh/docs/getting-started/">文档</a> ·
  <a href="https://tradecanvas.dev/zh/examples/">示例</a> ·
  <a href="https://tradecanvas.dev/zh/audit/">系统审计</a> ·
  <a href="./CHANGELOG.md">更新日志</a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.vi.md">Tiếng Việt</a> · <b>简体中文</b> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a>
</p>

**一套完整的 Web 交易图表。** 从K线到砖形图（Renko），134 个指标、69 种画线工具、交易所实时行情和图上下单，用 Canvas 2D 或 WebGL 绘制，不依赖任何第三方库。可以直接使用完整的 `ChartWidget`，也可以在无界面的 `Chart` 上构建自己的界面，支持 TypeScript、React、Vue 和 Svelte。

<p align="center">
  <a href="https://tradecanvas.dev/zh/chart/"><img src=".github/assets/clips/hero.webp" alt="实时行情上的 ChartWidget：EMA 21 和 55、RSI、十字光标，以及用鼠标画出的趋势线" width="100%"></a>
</p>

## 亮点

- **18 种图表、134 个指标、69 种画线工具**，指标叠加指标、画线预警、撤销与重做。
- **在图表上交易**：实时盈亏的持仓、可拖动的委托和止损止盈，模拟经纪商或你自己的接口。
- **实时数据**：内置 Binance、Bybit、Coinbase 和 Kraken，自己的数据源约二十行即可接入。
- **快**：WebGL 下百万根 K 线 60 fps 平移；一次实时 tick 约一微秒。
- **工作区**：多图网格、布局、K 线回放、回测。
- **随你定制**：主题、三种外观、112 个开关、插件；30 种语言；手机与应用。

<table>
  <tr>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/trading.webp" alt="拖动多头持仓的止盈和止损，盈亏随价格更新">
      <br><b>可拖动的委托</b>：止损、目标价和限价单跟随鼠标移动。
    </td>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/replay.webp" alt="回放带布林带的行情">
      <br><b>K 线回放</b>：回放行情，再在上面模拟交易。
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/grid.webp" alt="二乘二网格中四个不同周期的图表，十字光标在所有图表上同步">
      <br><b>网格</b>：最多六个图表，按品种、周期、十字光标或时间联动。
    </td>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/looks.webp" alt="同一图表在 Terminal、Capsule 和 Studio 外观之间切换，深色与浅色">
      <br><b>你的外观</b>：Studio、Terminal、Capsule，浅色或深色，或你自己的 token。
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top" align="center">
      <img src=".github/assets/clips/phone.webp" alt="手机上的组件：手指平移图表并画出一条趋势线" width="46%">
    </td>
    <td width="50%" valign="top">
      <br><b>手机上</b>：手指可以平移、缩放、画线和拖动委托，组件会为小屏幕重新排布。也能在 WebView、React Native、Capacitor 或 Tauri 中运行。
    </td>
  </tr>
</table>

## 快速开始

```bash
npm install @tradecanvas/chart
```

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

无界面的 `Chart` 接收你自己的 K 线（`chart.setData(bars)`），界面由你决定。React、Vue 和 Svelte 用户可使用 `@tradecanvas/react`、`/vue` 和 `/svelte`，它们以相同的 props 封装成组件。

## 文档

[快速开始](https://tradecanvas.dev/zh/docs/getting-started/) · [API](https://tradecanvas.dev/zh/docs/api/) · [指标](https://tradecanvas.dev/zh/docs/indicators/) · [画线工具](https://tradecanvas.dev/zh/docs/drawing-tools/) · [实时数据](https://tradecanvas.dev/zh/docs/realtime/) · [交易](https://tradecanvas.dev/zh/docs/trading/) · [样式](https://tradecanvas.dev/zh/docs/styling/) · [框架](https://tradecanvas.dev/zh/docs/frameworks/) · [插件](https://tradecanvas.dev/zh/docs/plugins/) · [手机与应用](https://tradecanvas.dev/zh/docs/embed/#mobile-app) · [性能](https://tradecanvas.dev/zh/docs/performance/)

文档提供 English、Tiếng Việt、简体中文、日本語、한국어 和 Español 版本。测量数据、限制和测试方式见[系统审计](https://tradecanvas.dev/zh/audit/)。

## AI 编程工具

[`skills/tradecanvas`](skills/tradecanvas/SKILL.md) 中的 agent 技能通过经 CI 类型检查的示例，教编程 agent 使用 API。在 Claude Code 中：

```text
/plugin marketplace add bonguynvan/tradecanvas
/plugin install tradecanvas@tradecanvas
```

其他 agent（Cursor、Codex、Copilot 等）：`npx skills add bonguynvan/tradecanvas`。不用技能时，[`llms.txt`](https://tradecanvas.dev/llms.txt) 和 [`llms-full.txt`](https://tradecanvas.dev/llms-full.txt) 把文档集中在一个文件里提供给 AI 助手。想用 agent 修改 TradeCanvas 本身？仓库的规则见 [AGENTS.md](AGENTS.md)。

## 更多

- **包**：[`@tradecanvas/chart`](https://www.npmjs.com/package/@tradecanvas/chart)（图表与组件）、[`react`](https://www.npmjs.com/package/@tradecanvas/react) · [`vue`](https://www.npmjs.com/package/@tradecanvas/vue) · [`svelte`](https://www.npmjs.com/package/@tradecanvas/svelte)，以及用于回测的 [`analytics`](https://www.npmjs.com/package/@tradecanvas/analytics)。
- **预览构建**：每个 pull request 和 `main` 上的每个提交都发布在 [pkg.pr.new](https://pkg.pr.new/~/bonguynvan/tradecanvas)，发布前即可安装。
- **浏览器**：Chrome 80+、Edge 80+、Firefox 80+、Safari 14+。
- **企业使用**：无需展示标志，无需申请；[企业使用](https://tradecanvas.dev/zh/business/)页面回答 IT 评审会问的问题。business@tradecanvas.dev
- **相关项目**：[bo-grid](https://github.com/bonguynvan/bo-grid)，一个快速的 Svelte 数据表格，交易台的表格部分。
- **参与贡献**：提问请到 [Discussions](https://github.com/bonguynvan/tradecanvas/discussions)，问题请提 issue，pull request 见 [CONTRIBUTING.md](./CONTRIBUTING.md)。安全问题：[SECURITY.md](./SECURITY.md)。
- **赞助**：TradeCanvas 免费且公开开发；[GitHub Sponsors](https://github.com/sponsors/bonguynvan) 让它持续下去。

[MIT](./LICENSE)
