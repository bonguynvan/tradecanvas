<p align="center">
  <a href="https://bonguynvan.github.io/tradecanvas/ja/"><img src=".github/assets/banner.png" alt="TradeCanvas：トレーディングアプリのためのチャートエンジン" width="100%"></a>
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
  <b><a href="https://bonguynvan.github.io/tradecanvas/ja/">ライブデモ</a></b> ·
  <a href="https://bonguynvan.github.io/tradecanvas/ja/docs/getting-started/">ドキュメント</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/ja/examples/">サンプル</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/ja/playground/">Playground</a> ·
  <a href="https://bonguynvan.github.io/tradecanvas/ja/audit/">システム監査</a> ·
  <a href="./CHANGELOG.md">変更履歴</a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.zh-CN.md">简体中文</a> · <b>日本語</b> · <a href="README.ko.md">한국어</a> · <a href="README.es.md">Español</a>
</p>

**Web のための完全なトレーディングチャート。** ローソク足から練行足（Renko）まで、133 種類のインジケーター、69 種類の描画ツール、取引所のライブフィード、チャート上での注文を Canvas 2D または WebGL で描画し、サードパーティの依存関係はありません。完全な `ChartWidget` をそのまま組み込むことも、ヘッドレスな `Chart` の上に独自の UI を作ることもでき、TypeScript、React、Vue、Svelte に対応しています。

<p align="center">
  <a href="https://bonguynvan.github.io/tradecanvas/ja/"><img src=".github/assets/hero.png" alt="Binance のライブ BTCUSDT を表示する ChartWidget：EMA 21 と 55、RSI、トレンドライン、ロングポジション、ライブのクオート付きのウォッチリスト" width="100%"></a>
</p>

## 特長

- **18 種類のチャートタイプ**：ローソク足や平均足から Renko、Kagi、Point & Figure、エクイボリュームまで。さらに 6 種類の金融チャート（スパークライン、板の深さ、資産曲線、ヒートマップ、ウォーターフォール、ゲージ）。
- **133 種類のインジケーターと 69 種類の描画ツール**：インジケーターの上にインジケーター、トレンドラインのアラート、テンプレート、グループ、元に戻す / やり直す。
- **チャート上で取引**：損益がリアルタイムに動くポジション、ドラッグで動かせる注文と損切り / 利確、注文チケット、口座パネル、そしてペーパートレードのブローカーまたは独自の執行アダプター。
- **ライブデータ**：Binance、Bybit、Coinbase、Kraken を内蔵し、その他のフィードも約 20 行で接続できます。過去へスクロールすると古い履歴を読み込み、任意の時間足とティックチャートに対応します。
- **Canvas 2D または WebGL**：100 万本のバーを 60 fps でパンでき、どの画面倍率でもくっきり表示されます。
- **本格的なワークスペース**：マルチチャートのグリッド、名前付きレイアウト、ペーパートレードができるバーリプレイ、そして `@tradecanvas/analytics` のバックテスター。
- **思いどおりにカスタマイズ**：101 個のスタイルキー、112 個の機能スイッチ、3 つの見た目、そしてインジケーター、描画ツール、チャートタイプ、オーバーレイのためのプラグイン。
- **誰にでも使える**：ウィジェットは右から左に書く言語を含む 30 言語に対応し、スクリーンリーダーとキーボード操作もサポートしています。

## インストール

```bash
npm install @tradecanvas/chart
```

## クイックスタート

`ChartWidget` は、ツールバー、描画サイドバー、設定、ステータスバーを備えたトレーディング UI 一式を一度の呼び出しで用意します。

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

UI を自分で作るなら、ヘッドレスな `Chart` とその API を使います。

```typescript
import { Chart } from '@tradecanvas/chart'

const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' })
chart.setData(bars) // [{ time, open, high, low, close, volume }, …]
chart.addIndicator('ema', { period: 50 })
chart.addIndicator('rsi')
```

独自のフィードは `WebSocketAdapter` または `PollingAdapter` で接続できます。[リアルタイム](https://bonguynvan.github.io/tradecanvas/ja/docs/realtime/)を参照してください。

## フレームワーク

```bash
npm install @tradecanvas/react    # または @tradecanvas/vue、@tradecanvas/svelte
```

```tsx
import { TradeCanvas } from '@tradecanvas/react'

<TradeCanvas symbol="BTCUSDT" timeframe="5m" indicators={['rsi', { id: 'ema', params: { period: 50 } }]} />
```

3 つのコンポーネントは同じ props を持ち、内部の `Chart` を渡します。[フレームワーク](https://bonguynvan.github.io/tradecanvas/ja/docs/frameworks/)を参照してください。

## 機能ツアー

<table>
  <tr>
    <td width="50%" valign="top">
      <a href=".github/assets/drawings.png"><img src=".github/assets/drawings.png" alt="描画ツール：ノート付きのフィボナッチ・リトレースメント、トレンドライン、エリオット推進波、ロングポジション"></a>
      <br><b>69 種類の描画ツール</b><br>
      フィボナッチ、ギャン、ピッチフォーク、エリオット波動、ハーモニックパターン、ノート、そして取引サイズを計算するロング／ショートポジション。
    </td>
    <td width="50%" valign="top">
      <a href=".github/assets/trading.png"><img src=".github/assets/trading.png" alt="チャート上の取引：損切りと利確付きのロングポジション、買いの逆指値と売りの指値、口座パネル"></a>
      <br><b>チャート上で取引</b><br>
      損益がリアルタイムに動くポジション、ドラッグで価格を変えられる注文、注文チケットと口座パネル。
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <a href=".github/assets/grid.png"><img src=".github/assets/grid.png" alt="BTC、ETH、SOL、BNB を複数の時間足で並べた 2×2 のワークスペース"></a>
      <br><b>マルチチャートのワークスペース</b><br>
      最大 6 つのチャートを並べ、シンボル、時間足、クロスヘア、時間、描画で連動させられます。
    </td>
    <td width="50%" valign="top">
      <a href=".github/assets/looks.png"><img src=".github/assets/looks.png" alt="ひとつのチャートを 3 つの見た目で：studio、terminal、ライトテーマの capsule"></a>
      <br><b>自分だけの見た目</b><br>
      3 つのプリセット、または角の丸み、密度、フォント、価格タグを自由に設定。ライトとダークの両テーマで使えます。
    </td>
  </tr>
</table>

## ドキュメント

| トピック | |
|---|---|
| [はじめに](https://bonguynvan.github.io/tradecanvas/ja/docs/getting-started/) | インストール、ウィジェット、ヘッドレスチャート |
| [チャートタイプ](https://bonguynvan.github.io/tradecanvas/ja/docs/chart-types/) · [インジケーター](https://bonguynvan.github.io/tradecanvas/ja/docs/indicators/) · [描画ツール](https://bonguynvan.github.io/tradecanvas/ja/docs/drawing-tools/) | チャートが描けるものと、それぞれの設定 |
| [リアルタイム](https://bonguynvan.github.io/tradecanvas/ja/docs/realtime/) | 内蔵フィード、独自のアダプター、履歴、ティックチャート |
| [トレーディング](https://bonguynvan.github.io/tradecanvas/ja/docs/trading/) | 注文、ポジション、執行アダプター、リプレイ |
| [スタイル](https://bonguynvan.github.io/tradecanvas/ja/docs/styling/) · [カスタマイズ](https://bonguynvan.github.io/tradecanvas/ja/docs/customization/) | テーマ、スタイルキー、見た目、機能スイッチ、独自の部品 |
| [プラグイン](https://bonguynvan.github.io/tradecanvas/ja/docs/plugins/) | 独自のインジケーター、描画ツール、チャートタイプ、オーバーレイ |
| [アナリティクス](https://bonguynvan.github.io/tradecanvas/ja/docs/analytics/) · [金融チャート](https://bonguynvan.github.io/tradecanvas/ja/docs/finance/) | バックテストとリスク指標、板の深さ・資産曲線などのチャート |
| [パフォーマンス](https://bonguynvan.github.io/tradecanvas/ja/docs/performance/) · [API リファレンス](https://bonguynvan.github.io/tradecanvas/ja/docs/api/) | 計測結果と API の全体 |

ドキュメントは English、Tiếng Việt、简体中文、한국어、Español でも読めます。

## パフォーマンス

内蔵グラフィックス（Intel UHD）の Chrome で計測しました。全体の表は[システム監査](https://bonguynvan.github.io/tradecanvas/ja/audit/)にあります。

| | |
|---|---|
| 1,000,000 本のバー + 4 つのインジケーター、ズームアウト、WebGL | 1 フレーム 16.7 ms（60 fps） |
| 4 つのインジケーターを載せた 100,000 本のバーでのライブティック 1 回 | ~0.001 ms |
| `Chart` / `ChartWidget`、minify と gzip 後 | 176 KB / 315 KB |

## パッケージ

| パッケージ | |
|---|---|
| [`@tradecanvas/chart`](https://www.npmjs.com/package/@tradecanvas/chart) | チャートと `ChartWidget`（`/widget`） |
| [`@tradecanvas/react`](https://www.npmjs.com/package/@tradecanvas/react) · [`/vue`](https://www.npmjs.com/package/@tradecanvas/vue) · [`/svelte`](https://www.npmjs.com/package/@tradecanvas/svelte) | フレームワーク用コンポーネント |
| [`@tradecanvas/analytics`](https://www.npmjs.com/package/@tradecanvas/analytics) | バックテスターとリスク指標 |
| `@tradecanvas/core` · `@tradecanvas/commons` | エンジンと共有の型。チャートと一緒にインストールされます |

## プレビュービルド

すべてのプルリクエストと `main` へのすべてのコミットは [pkg.pr.new](https://pkg.pr.new) に公開されるので、修正や機能をリリース前に試せます。プルリクエスト番号かコミットを指定してプレビューをインストールします。

```bash
npm install https://pkg.pr.new/@tradecanvas/chart@123      # プルリクエスト #123
npm install https://pkg.pr.new/@tradecanvas/chart@a1b2c3d  # main へのコミット
```

各プルリクエストには、すべてのパッケージの正確なコマンドを載せたコメントが付きます。

## 対応ブラウザー

Chrome 80+、Firefox 80+、Safari 14+、Edge 80+。

## AI コーディングツール

[`llms.txt`](https://bonguynvan.github.io/tradecanvas/llms.txt) と [`llms-full.txt`](https://bonguynvan.github.io/tradecanvas/llms-full.txt) はアシスタントにドキュメントを 1 ファイルで渡し、[`skills/tradecanvas`](skills/tradecanvas/SKILL.md) のエージェントスキルは、CI が型チェックするサンプルでコーディングエージェントに API を教えます。

## 関連プロジェクト

- **[bo-grid](https://github.com/bonguynvan/bo-grid)**：フィンテック UI 向けの小さく高速な Svelte 5 データグリッド。トレーディングデスクのテーブル担当です。[ライブデモ](https://bonguynvan.github.io/bo-grid/)

## 法人の方へ

TradeCanvas をお客様向けの製品に組み込みますか？表示が必要なロゴも、申請手続きもありません。[法人向けページ](https://bonguynvan.github.io/tradecanvas/ja/business/)では、IT 審査でよく聞かれる項目に出典つきで答え、最初のパートナー向けプログラムを紹介しています。お問い合わせは business@tradingdek.com まで。

## コントリビュート

質問やアイデア、TradeCanvas で作ったものは [Discussions](https://github.com/bonguynvan/tradecanvas/discussions) へ、バグは issue へどうぞ。プルリクエストも歓迎します。[CONTRIBUTING.md](./CONTRIBUTING.md) にセットアップ（`pnpm install && pnpm build && pnpm test`）とプルリクエストに必要なことをまとめています。セキュリティ上の問題を見つけた場合は、issue を開かずに [SECURITY.md](./SECURITY.md) の手順に従ってください。

## スポンサー

TradeCanvas は無料の MIT ライセンスで、オープンに開発・保守されています。あなたのプロダクトの役に立っているなら、[GitHub Sponsors](https://github.com/sponsors/bonguynvan) で開発を支援できます。

## ライセンス

[MIT](./LICENSE)
