<p align="center">
  <a href="https://tradecanvas.dev/"><img src=".github/assets/banner.png" alt="TradeCanvas, the chart engine for trading apps" width="100%"></a>
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
  <b><a href="https://tradecanvas.dev/chart/">Live demo</a></b> ·
  <a href="https://tradecanvas.dev/docs/getting-started/">Docs</a> ·
  <a href="https://tradecanvas.dev/examples/">Examples</a> ·
  <a href="https://tradecanvas.dev/audit/">System audit</a> ·
  <a href="./CHANGELOG.md">Changelog</a>
</p>

<p align="center">
  <b>English</b> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a>
</p>

**A complete trading chart for the web.** Candlesticks to Renko, 134 indicators, 69 drawing tools, live feeds and orders on the chart, on Canvas 2D or WebGL, with no third-party dependencies. Use the full `ChartWidget`, or build your own interface on the headless `Chart`, in TypeScript, React, Vue or Svelte.

<p align="center">
  <a href="https://tradecanvas.dev/chart/"><img src=".github/assets/clips/hero.webp" alt="ChartWidget on a live market: EMA 21 and 55 and RSI, the crosshair, and a trend line drawn with the mouse" width="100%"></a>
</p>

## Highlights

- **18 chart types, 134 indicators, 69 drawing tools**, indicators on indicators, alerts on lines, undo and redo.
- **Trading on the chart**: positions with live P&L, orders and stops you drag, a paper broker or your own.
- **Live data** from Binance, Bybit, Coinbase and Kraken, or your own feed in about twenty lines.
- **Fast**: a million bars panned at 60 fps with WebGL; a live tick in about a microsecond.
- **A workspace**: grids of charts, layouts, bar replay, backtesting.
- **Yours to shape**: themes, three looks, 114 switches, plugins; 30 languages; phones and apps.

<table>
  <tr>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/trading.webp" alt="Dragging the take-profit and stop-loss of a long position; its P&amp;L updates as the price moves">
      <br><b>Orders you drag</b>: stops, targets and limits move with the mouse.
    </td>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/replay.webp" alt="Bar replay playing a market back with Bollinger Bands">
      <br><b>Bar replay</b>: play a market back, then trade it on paper.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/grid.webp" alt="Four charts in a two-by-two grid on different intervals, the crosshair following across all of them">
      <br><b>Grids</b>: up to six charts, linked by symbol, interval, crosshair or time.
    </td>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/looks.webp" alt="One chart switching between the Terminal, Capsule and Studio looks, dark and light">
      <br><b>Your look</b>: Studio, Terminal, Capsule, light or dark, or your own tokens.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top" align="center">
      <img src=".github/assets/clips/phone.webp" alt="The widget on a phone: a finger pans the chart and draws a trend line" width="46%">
    </td>
    <td width="50%" valign="top">
      <br><b>On phones</b>: a finger pans, zooms, draws and drags orders, and the widget lays itself out for a small screen. It also runs in a WebView, React Native, Capacitor or Tauri.
    </td>
  </tr>
</table>

## Quick start

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
  adapter: new BinanceAdapter(), // live data, no API key
  trading: true,
})
```

The headless `Chart` takes your own bars (`chart.setData(bars)`) and leaves the interface to you. For React, Vue and Svelte, `@tradecanvas/react`, `/vue` and `/svelte` wrap it in a component with the same props.

## Documentation

[Getting started](https://tradecanvas.dev/docs/getting-started/) · [API](https://tradecanvas.dev/docs/api/) · [Indicators](https://tradecanvas.dev/docs/indicators/) · [Drawing tools](https://tradecanvas.dev/docs/drawing-tools/) · [Realtime](https://tradecanvas.dev/docs/realtime/) · [Trading](https://tradecanvas.dev/docs/trading/) · [Styling](https://tradecanvas.dev/docs/styling/) · [Frameworks](https://tradecanvas.dev/docs/frameworks/) · [Plugins](https://tradecanvas.dev/docs/plugins/) · [Phones and apps](https://tradecanvas.dev/docs/embed/#mobile-app) · [Performance](https://tradecanvas.dev/docs/performance/)

The docs are in English, Tiếng Việt, 简体中文, 日本語, 한국어 and Español. Measurements, limits and how it is tested are on the [system audit](https://tradecanvas.dev/audit/).

## AI coding tools

The agent skill in [`skills/tradecanvas`](skills/tradecanvas/SKILL.md) teaches coding agents the API, with examples that CI type-checks. In Claude Code:

```text
/plugin marketplace add bonguynvan/tradecanvas
/plugin install tradecanvas@tradecanvas
```

Other agents (Cursor, Codex, Copilot and more): `npx skills add bonguynvan/tradecanvas`. Without a skill, [`llms.txt`](https://tradecanvas.dev/llms.txt) and [`llms-full.txt`](https://tradecanvas.dev/llms-full.txt) give an assistant the docs in one file. Changing TradeCanvas itself with an agent? [AGENTS.md](AGENTS.md) holds the repo's rules.

The MCP server `@tradecanvas/mcp` looks up indicators, drawing tools, options, feature switches and style keys in the library's own catalog, and checks an options object before it is used ([set it up in other clients](https://tradecanvas.dev/docs/getting-started/#ai)):

```bash
claude mcp add tradecanvas -- npx -y @tradecanvas/mcp
```

On Windows outside WSL: `claude mcp add tradecanvas -- cmd /c npx -y @tradecanvas/mcp`.

## More

- **Packages**: [`@tradecanvas/chart`](https://www.npmjs.com/package/@tradecanvas/chart) (the chart and the widget), [`react`](https://www.npmjs.com/package/@tradecanvas/react) · [`vue`](https://www.npmjs.com/package/@tradecanvas/vue) · [`svelte`](https://www.npmjs.com/package/@tradecanvas/svelte), and [`analytics`](https://www.npmjs.com/package/@tradecanvas/analytics) for backtests, and [`mcp`](https://www.npmjs.com/package/@tradecanvas/mcp) for coding agents.
- **Previews**: every pull request and commit on `main` is on [pkg.pr.new](https://pkg.pr.new/~/bonguynvan/tradecanvas), installable before a release.
- **Browsers**: Chrome 80+, Edge 80+, Firefox 80+, Safari 14+.
- **For businesses**: no logo to show, nothing to apply for; the [For businesses](https://tradecanvas.dev/business/) page answers an IT review. business@tradecanvas.dev
- **Related**: [bo-grid](https://github.com/bonguynvan/bo-grid), a fast Svelte data grid for the table half of a trading desk.
- **Contributing**: questions in [Discussions](https://github.com/bonguynvan/tradecanvas/discussions), bugs in the issues, and [CONTRIBUTING.md](./CONTRIBUTING.md) for pull requests. Security issues: [SECURITY.md](./SECURITY.md).
- **Sponsor**: TradeCanvas is free and built in the open; [GitHub Sponsors](https://github.com/sponsors/bonguynvan) keeps it going.

[MIT](./LICENSE)
