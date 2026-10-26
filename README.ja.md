<p align="center">
  <a href="https://tradecanvas.dev/ja/"><img src=".github/assets/banner.png" alt="TradeCanvas：トレーディングアプリのためのチャートエンジン" width="100%"></a>
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
  <b><a href="https://tradecanvas.dev/ja/chart/">ライブデモ</a></b> ·
  <a href="https://tradecanvas.dev/ja/docs/getting-started/">ドキュメント</a> ·
  <a href="https://tradecanvas.dev/ja/examples/">サンプル</a> ·
  <a href="https://tradecanvas.dev/ja/audit/">システム監査</a> ·
  <a href="./CHANGELOG.md">変更履歴</a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.zh-CN.md">简体中文</a> · <b>日本語</b> · <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a>
</p>

**Web のための完全なトレーディングチャート。** ローソク足から練行足（Renko）まで、134 種類のインジケーター、69 種類の描画ツール、取引所のライブフィード、チャート上での注文を Canvas 2D または WebGL で描画し、サードパーティの依存関係はありません。完全な `ChartWidget` をそのまま組み込むことも、ヘッドレスな `Chart` の上に独自の UI を作ることもでき、TypeScript、React、Vue、Svelte に対応しています。

<p align="center">
  <a href="https://tradecanvas.dev/ja/chart/"><img src=".github/assets/clips/hero.webp" alt="ライブ相場上の ChartWidget：EMA 21 と 55、RSI、クロスヘア、マウスで描いたトレンドライン" width="100%"></a>
</p>

## 特長

- **18 種類のチャート、134 のインジケーター、69 の描画ツール**。インジケーターの重ね掛け、ラインへのアラート、元に戻す・やり直し。
- **チャート上で取引**：損益がリアルタイムに動くポジション、ドラッグできる注文と損切り、ペーパーブローカーまたは自前の接続。
- **ライブデータ**：Binance、Bybit、Coinbase、Kraken を内蔵。独自のフィードも約 20 行で。
- **速い**：WebGL で 100 万本のバーを 60 fps でパン。ライブのティックは約 1 マイクロ秒。
- **ワークスペース**：チャートのグリッド、レイアウト、バーリプレイ、バックテスト。
- **自由にカスタマイズ**：テーマ、3 つのルック、114 のスイッチ、プラグイン。30 言語。スマートフォンとアプリ。

<table>
  <tr>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/trading.webp" alt="ロングポジションの利確と損切りをドラッグ。価格に合わせて損益が更新される">
      <br><b>ドラッグできる注文</b>：損切り、目標、指値がマウスで動きます。
    </td>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/replay.webp" alt="ボリンジャーバンド付きの相場をリプレイ">
      <br><b>バーリプレイ</b>：相場を再生し、その上でペーパートレード。
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/grid.webp" alt="時間足の異なる 4 つのチャートを 2×2 のグリッドに並べ、クロスヘアが全チャートに追従">
      <br><b>グリッド</b>：最大 6 チャートを銘柄、時間足、クロスヘア、時刻で連動。
    </td>
    <td width="50%" valign="top">
      <img src=".github/assets/clips/looks.webp" alt="1 つのチャートが Print、Terminal、Capsule、Studio のルックとダーク・ライトを切り替える">
      <br><b>あなたのルック</b>：Print（紙とインク、黄金比で）、Studio、Terminal、Capsule、ライトかダーク、または独自のトークン。
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top" align="center">
      <img src=".github/assets/clips/phone.webp" alt="スマートフォン上のウィジェット：指でチャートをパンし、トレンドラインを描く" width="46%">
    </td>
    <td width="50%" valign="top">
      <br><b>スマートフォンで</b>：指でパン、ズーム、描画、注文のドラッグができ、ウィジェットは小さな画面に合わせて配置を変えます。WebView、React Native、Capacitor、Tauri でも動きます。
    </td>
  </tr>
</table>

## クイックスタート

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
  adapter: new BinanceAdapter(), // ライブデータ、API キー不要
  trading: true,
})
```

ヘッドレスの `Chart` は自前のバー（`chart.setData(bars)`）を受け取り、画面づくりはあなたに任せます。React、Vue、Svelte では `@tradecanvas/react`、`/vue`、`/svelte` が同じ props のコンポーネントとして包みます。

## ドキュメント

[はじめに](https://tradecanvas.dev/ja/docs/getting-started/) · [API](https://tradecanvas.dev/ja/docs/api/) · [インジケーター](https://tradecanvas.dev/ja/docs/indicators/) · [描画ツール](https://tradecanvas.dev/ja/docs/drawing-tools/) · [リアルタイム](https://tradecanvas.dev/ja/docs/realtime/) · [取引](https://tradecanvas.dev/ja/docs/trading/) · [スタイル](https://tradecanvas.dev/ja/docs/styling/) · [フレームワーク](https://tradecanvas.dev/ja/docs/frameworks/) · [プラグイン](https://tradecanvas.dev/ja/docs/plugins/) · [スマートフォンとアプリ](https://tradecanvas.dev/ja/docs/embed/#mobile-app) · [パフォーマンス](https://tradecanvas.dev/ja/docs/performance/)

ドキュメントは English、Tiếng Việt、简体中文、日本語、한국어、Español で読めます。計測値、制限、テストの方法は[システム監査](https://tradecanvas.dev/ja/audit/)にあります。

## AI コーディングツール

[`skills/tradecanvas`](skills/tradecanvas/SKILL.md) のエージェントスキルは、CI が型チェックするサンプルでコーディングエージェントに API を教えます。Claude Code では:

```text
/plugin marketplace add bonguynvan/tradecanvas
/plugin install tradecanvas@tradecanvas
```

ほかのエージェント（Cursor、Codex、Copilot など）: `npx skills add bonguynvan/tradecanvas`。スキルを使わない場合は、[`llms.txt`](https://tradecanvas.dev/llms.txt) と [`llms-full.txt`](https://tradecanvas.dev/llms-full.txt) がドキュメントを 1 ファイルでアシスタントに渡します。エージェントで TradeCanvas 自体を変更するなら、リポジトリのルールは [AGENTS.md](AGENTS.md) にあります。

MCP サーバー `@tradecanvas/mcp` は、インジケーター、描画ツール、オプション、機能スイッチ、スタイルキーをライブラリ自身のカタログから調べ、使う前にオプションのオブジェクトを確かめます ([ほかのクライアントでの設定](https://tradecanvas.dev/ja/docs/getting-started/#ai)):

```bash
claude mcp add tradecanvas -- npx -y @tradecanvas/mcp
```

WSL を使わない Windows では: `claude mcp add tradecanvas -- cmd /c npx -y @tradecanvas/mcp`. Git Bash（Windows で Claude Code の `!` コマンドを実行するシェル）では `//c` と書きます。`/c` がパスに書き換えられるためです。

## その他

- **パッケージ**：[`@tradecanvas/chart`](https://www.npmjs.com/package/@tradecanvas/chart)（チャートとウィジェット）、[`react`](https://www.npmjs.com/package/@tradecanvas/react) · [`vue`](https://www.npmjs.com/package/@tradecanvas/vue) · [`svelte`](https://www.npmjs.com/package/@tradecanvas/svelte)、バックテスト用の [`analytics`](https://www.npmjs.com/package/@tradecanvas/analytics)、コーディングエージェント用の [`mcp`](https://www.npmjs.com/package/@tradecanvas/mcp)。
- **プレビュー**：すべての pull request と `main` のコミットが [pkg.pr.new](https://pkg.pr.new/~/bonguynvan/tradecanvas) に公開され、リリース前にインストールできます。
- **ブラウザー**：Chrome 80 以降、Edge 80 以降、Firefox 80 以降、Safari 14 以降。
- **法人の方へ**：表示すべきロゴも申請もありません。[法人の方へ](https://tradecanvas.dev/ja/business/)のページが IT 審査の質問に答えます。business@tradecanvas.dev
- **関連プロジェクト**：[bo-grid](https://github.com/bonguynvan/bo-grid)、トレーディングデスクの表を担う高速な Svelte データグリッド。
- **コントリビュート**：質問は [Discussions](https://github.com/bonguynvan/tradecanvas/discussions)、バグは issue へ。pull request は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照。セキュリティの問題は [SECURITY.md](./SECURITY.md)。
- **スポンサー**：TradeCanvas は無料で、オープンに開発しています。[GitHub Sponsors](https://github.com/sponsors/bonguynvan) が開発を支えます。

[MIT](./LICENSE)
