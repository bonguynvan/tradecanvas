<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>はじめに — TradeCanvas ドキュメント</title>
  <meta name="description" content="TradeCanvas をインストールして、最初の Canvas トレーディングチャートを 1 分以内に表示します。" />
</svelte:head>

<h1>はじめに</h1>
<p>TradeCanvas をインストールして、1 分以内にチャートを表示しましょう。</p>

<h2>インストール</h2>
<p>お好みのパッケージマネージャーを使ってください：</p>
<pre><code>npm install @tradecanvas/chart
# or
pnpm add @tradecanvas/chart
# or
yarn add @tradecanvas/chart</code></pre>

<h2>すぐに使えるウィジェット</h2>
<p>
  <code>ChartWidget</code> は、動くチャートを最短で用意する方法です。ツールバー、描画サイドバー、
  設定ダイアログ、ステータスバーを備えた本格的なトレーディング UI を任意のホスト要素の中に描画し、
  フレームワークへの依存は一切ありません。
</p>

<pre><code>{`import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  historyLimit: 500,
  trading: true,
  // Optional features
  watchlist: true,         // right-side sparkline panel
  persistLayouts: true,    // remember per-symbol indicators / drawings
  // dragDropImport defaults to true — drop a CSV / JSON onto the chart
})`}</code></pre>

<p>
  ウィジェットは、プロのトレーダー向けのジェスチャーを標準で一通り備えています：
  最後のバーより先の空白（未来の領域）までドラッグ、価格軸・時間軸のドラッグで拡大縮小、
  <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+ドラッグで複数の描画を選択、<kbd>Shift</kbd>+ドラッグで計測、
  <kbd>Alt</kbd>+クリックでツールチップを固定、<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd>
  でコマンドパレット、<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>P</kbd> でシンボル検索、
  そして <kbd>?</kbd> でショートカットの一覧を表示できます。
</p>

<h2>ヘッドレスの Chart</h2>
<p>
  周囲の UI を完全に制御したい場合は、下位レベルの <code>Chart</code>
  クラスを直接使います。ツールバーは自前で用意し、機能はすべてそのまま使えます：
</p>

<pre><code>{`import { Chart } from '@tradecanvas/chart'

const chart = new Chart(host, {
  chartType: 'candlestick',
  theme: 'dark',
})

chart.setData(bars)
chart.addIndicator('sma', { period: 20 })`}</code></pre>

<h2>フレームワーク用ラッパー</h2>
<p>
  React、Vue、Svelte 用のラッパーは
  <a href={href('/docs/frameworks')}>フレームワーク</a>のセクションで紹介しています。
</p>

<h2>次のステップ</h2>
<ul>
  <li><a href={href('/docs/api')}>API リファレンス</a> — <code>Chart</code> と <code>ChartWidget</code> の全 API</li>
  <li><a href={href('/docs/chart-types')}>チャートタイプ</a> — 17 種類の組み込みチャートタイプ</li>
  <li><a href={href('/docs/indicators')}>インジケーター</a> — 85 種類のインジケーター一覧</li>
  <li><a href={href('/docs/realtime')}>リアルタイムとリプレイ</a> — ストリーミングアダプターとリプレイモード</li>
  <li><a href={href('/docs/analytics')}>分析</a> — 戦略バックテスターとリスク指標</li>
</ul>
