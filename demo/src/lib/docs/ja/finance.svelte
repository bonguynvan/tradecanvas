<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>金融チャート — TradeCanvas ドキュメント</title>
  <meta name="description" content="金融向けの専用レンダラー：ゲージ、ヒートマップ、板の厚み、スパークライン、エクイティカーブ、ウォーターフォール。" />
</svelte:head>

<h1>金融チャート</h1>
<p>メインのローソク足チャートと並べて使う、金融ダッシュボード向けの専用レンダラーです。</p>

<h2>利用できるレンダラー</h2>
<table>
  <thead><tr><th>レンダラー</th><th>用途</th></tr></thead>
  <tbody>
    <tr><td><code>SparklineRenderer</code></td><td>コンパクトなティッカー、ウォッチリスト、KPI のセル。</td></tr>
    <tr><td><code>GaugeRenderer</code></td><td>単一の値を示すゲージ — センチメント、リスク、エクスポージャー。</td></tr>
    <tr><td><code>HeatmapRenderer</code></td><td>セクター / 資産の相関行列。</td></tr>
    <tr><td><code>DepthChartRenderer</code></td><td>L2 オーダーブックの板の厚み、買い / 売りの累積。</td></tr>
    <tr><td><code>WaterfallRenderer</code></td><td>損益の要因分解、加算的なフロー。</td></tr>
    <tr><td><code>EquityCurveRenderer</code></td><td>ドローダウンを網掛けしたバックテストのエクイティカーブ。</td></tr>
    <tr><td><code>FinanceCrosshair</code></td><td>金融チャート向けの複数軸のクロスヘア。</td></tr>
  </tbody>
</table>

<h2>エクイティカーブの例</h2>
<p><a href={href('/docs/analytics')}>分析</a>のバックテスターと組み合わせて使います：</p>

<pre><code>{`import { Backtester } from '@tradecanvas/analytics'
import { EquityCurveRenderer } from '@tradecanvas/chart'

const result = new Backtester({ initialCash: 10_000 }).run(bars, myStrategy)

const renderer = new EquityCurveRenderer(canvas.getContext('2d')!)
renderer.render(result.equityCurve)`}</code></pre>

<h2>パフォーマンスダッシュボード</h2>
<p>
  <code>PerformanceDashboard</code> は金融レンダラーを組み合わせ、テーマに沿った 1 つの戦略レポートにまとめます。
  主要な統計の帯、エクイティカーブ、ドローダウンを示すアンダーウォーターパネル、月次リターンのカレンダー
  ヒートマップで構成され、バックテストの結果から直接作成されます。
</p>

<pre><code>{`import { Backtester } from '@tradecanvas/analytics'
import { PerformanceDashboard } from '@tradecanvas/chart'

const result = new Backtester({ initialCash: 10_000 }).run(bars, myStrategy)

const dash = new PerformanceDashboard(document.getElementById('report')!, {
  result,            // any { equityCurve, metrics } — Backtester output fits
  theme: 'dark',
  title: 'SMA Crossover',
  subtitle: 'BTC/USDT · 1h · 2023',
})

// later: dash.update(newResult) · dash.setTheme('light') · dash.destroy()`}</code></pre>

<p>
  独自のレイアウトを作りたい場合のために、純粋な計算関数もエクスポートされています：
  <code>computeMonthlyReturns</code>、<code>computeDrawdownCurve</code>、
  <code>toEquityPoints</code>、<code>selectKeyStats</code>。
</p>

<h2>ヒートマップのレイアウト</h2>
<p><code>HeatmapLayout</code> は、任意の指標の行列に対して、正方形のグリッドとカラースケールを計算するのに役立ちます。</p>
