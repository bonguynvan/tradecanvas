<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>金融チャート — TradeCanvas ドキュメント</title>
  <meta name="description" content="ローソク足チャートと並べて使う金融ダッシュボード向けのチャート：棒グラフ、ドーナツ、散布図とバブル、ヒストグラム、カレンダー、相関行列、スパークライン、ゲージ、ヒートマップとツリーマップ、ウォーターフォール、板の厚み、エクイティカーブ、パフォーマンスレポート。" />
</svelte:head>

<h1>金融チャート</h1>
<p>
  ローソク足チャートと並べて使う、ダッシュボードやレポート向けのチャートです。どれも要素とオプションを受け取るクラスで、
  要素に合わせてサイズを決め、チャートのダークテーマまたはライトテーマで描画します。多くはポインターに沿ってツールチップを表示します。
</p>

<h2>チャート一覧</h2>
<table>
  <thead><tr><th>クラス</th><th>用途</th></tr></thead>
  <tbody>
    <tr><td><code>BarChart</code></td><td>カテゴリごとの値：資金の純流入、セッションごとの出来高、月次リターン。グループ化または積み上げ、縦向きまたは横向きで、ゼロから上下に伸びます。</td></tr>
    <tr><td><code>DonutChart</code></td><td>全体に占める内訳：資産配分、セクター別のエクスポージャー。<code>innerRadius: 0</code> で円グラフになります。</td></tr>
    <tr><td><code>ScatterChart</code></td><td>項目ごとに 2 つの値：リスクとリターン、バリュエーションと成長率。点にサイズがあればバブルになります。</td></tr>
    <tr><td><code>HistogramChart</code></td><td>値の分布：日次リターン、トレードの結果。平均や VaR の位置に線を引けます。</td></tr>
    <tr><td><code>CalendarChart</code></td><td>カレンダー上に 1 日 1 つの値：日次リターン、損益、取引日誌。</td></tr>
    <tr><td><code>MatrixChart</code></td><td>行と列の組ごとに 1 つの値：相関、時間帯と曜日ごとの出来高。</td></tr>
    <tr><td><code>CounterClockChart</code></td><td>平均価格と平均出来高を足ごとに結んだ、銘柄の逆ウォッチ曲線。</td></tr>
    <tr><td><code>SparklineChart</code></td><td>ウォッチリストの行や KPI タイルに置く小さなライン。</td></tr>
    <tr><td><code>GaugeChart</code></td><td>帯と照らし合わせて見る 1 つの値：センチメント、リスク、証拠金の使用率。</td></tr>
    <tr><td><code>HeatmapChart</code></td><td>変化率で色分けしたセル。グリッド、またはウェイト（時価総額）で大きさを決めたツリーマップ。<code>grouped</code> を指定するとセクターマップになります。</td></tr>
    <tr><td><code>WaterfallChart</code></td><td>始点から終点までの段階：損益の要因分解、キャッシュフロー。</td></tr>
    <tr><td><code>DepthChart</code></td><td>オーダーブックの買いと売りの累積。</td></tr>
    <tr><td><code>EquityCurveChart</code></td><td>口座の価値の推移。ドローダウンとベンチマーク付き。</td></tr>
    <tr><td><code>PerformanceDashboard</code></td><td>バックテストから作る戦略レポート：統計、エクイティ、ドローダウン、月次リターン。</td></tr>
  </tbody>
</table>

<h2>共通の機能</h2>
<pre><code>{`const chart = new BarChart(element, { categories, series, theme: 'dark' })

chart.setOptions({ mode: 'stacked' })   // どのオプションでも、マージされる
chart.setTheme('light')                 // 'dark' | 'light' | Theme
chart.destroy()                         // キャンバスとそのリスナーを取り除く`}</code></pre>
<p>
  どのチャートも要素いっぱいに広がり、要素のサイズが変わると再描画します。ホバー時のツールチップがあるチャートでは、
  <code>crosshair: false</code> で無効にできます。棒グラフ、ドーナツ、散布図、ヒストグラム、カレンダー、行列は、何を表示しているかを
  スクリーンリーダーに伝えます（キャンバスに image ロールとラベルが付きます）。<code>ariaLabel</code> を使うと、
  たとえばページの言語で、その内容を自分の言葉にできます。数値は <code>valueFormat</code>（または
  <code>xFormat</code> / <code>yFormat</code>）で表示し、指定がなければ 1,234.5、1 万を超えると 12.3K のように表示します。
</p>

<h2>棒グラフ</h2>
<pre><code>{`import { BarChart } from '@tradecanvas/chart'

// 10 セッションの外国人の純買い：ゼロより上は緑、下は赤。
const flows = new BarChart(el, {
  categories: ['6/10', '7/10', '8/10', '9/10'],
  series: [{ name: 'Net', values: [-660, 860, -280, 230] }],
  colorBySign: true,                    // または { positive, negative }
  valueFormat: (v) => v + ' bn',
  onBarClick: ({ category, series, value, index }) => openDay(index),
})

// 複数の系列を横に並べる、または積み上げる：プラスはゼロから上へ、マイナスは下へ。
new BarChart(el, {
  categories: ['Foreign', 'Proprietary', 'Retail'],
  series: [{ name: 'Buy', values: [820, 310, 4200] }, { name: 'Sell', values: [-760, -280, -4290] }],
  mode: 'stacked',
  orientation: 'horizontal',            // 棒は右向き、ラベルは左側
  showValues: true,
})

flows.update(categories, series)`}</code></pre>
<p>
  値の軸には常にゼロが含まれます。カテゴリにホバーすると、そのカテゴリのすべての系列の値が表示されます。
  系列が 2 つ以上あると凡例が表示されます（<code>legend</code> で指定）。下に収まらないラベルは、数カテゴリおきに表示されます。
</p>

<h2>ドーナツチャート</h2>
<pre><code>{`import { DonutChart } from '@tradecanvas/chart'

new DonutChart(el, {
  data: [
    { label: 'Stocks', value: 52 },
    { label: 'Bonds', value: 23 },
    { label: 'Cash', value: 15 },
    { label: 'Gold', value: 10, color: '#d4a017' },
  ],
  innerRadius: 0.6,                     // 0 で円グラフ
  centerLabel: 'Total',
  centerValue: '1.2B ₫',
  onSliceClick: (slice) => filterBy(slice.label),
})`}</code></pre>
<p>
  スライスは 12 時の位置から時計回りに並び、0 以下の値は除かれます。各スライスは余裕があれば割合を表示し、
  凡例には名前と割合が並びます。凡例は、チャートが広いときはリングの横に、そうでないときは下に置かれます。
</p>

<h2>散布図とバブルチャート</h2>
<pre><code>{`import { ScatterChart } from '@tradecanvas/chart'

new ScatterChart(el, {
  series: [{
    name: 'Banks',
    points: [
      { x: 21, y: 9, size: 480, label: 'VCB' },   // size：時価総額。バブルの面積がこれに比例する
      { x: 34, y: 24, size: 170, label: 'TCB' },
    ],
  }],
  xLabel: 'Volatility',
  yLabel: 'Return, a year',
  xFormat: (v) => v + '%',
  yFormat: (v) => v + '%',
  showLabels: true,
  onPointClick: (point, series) => openSymbol(point.label),
})`}</code></pre>
<p>
  軸は最も大きなバブルが収まる余白を取り（<code>maxRadius</code>、既定は 24 px）、軸の範囲が x = 0 や y = 0 をまたぐときは
  その位置に線を引きます（<code>zeroLines: false</code> で非表示）。
</p>

<h2>ヒストグラム</h2>
<pre><code>{`import { HistogramChart, histogramBins } from '@tradecanvas/chart'

new HistogramChart(el, {
  values: dailyReturns,                 // パーセント単位
  binWidth: 0.5,                        // または bins: 20、または 'auto'（スタージェスの公式）
  colorBySign: true,
  valueFormat: (v) => v.toFixed(1) + '%',
  markers: [{ value: mean, label: 'Mean' }, { value: var95, label: 'VaR 95%', color: '#e85a67' }],
})

histogramBins([1, 2, 2, 3, 10], { bins: 3 })
// [{ from: 1, to: 4, count: 4 }, { from: 4, to: 7, count: 0 }, { from: 7, to: 10, count: 1 }]`}</code></pre>

<h2>カレンダー</h2>
<pre><code>{`import { CalendarChart } from '@tradecanvas/chart'

// 1 年分の立会日（月〜金）を、その日の騰落で色分け。
new CalendarChart(el, {
  data: [{ date: '2025-01-02', value: 1.2 }, { date: '2025-01-03', value: -0.8 }],   // YYYY-MM-DD
  weekdays: 5,                          // 7（既定）は毎日。weekStart: 0 で週を日曜始まりに
  locale: 'vi-VN',                      // 月と曜日の名前
  colorScale: { min: -2, max: 2 },      // テーマの赤と緑。±2 で最も濃く
  valueFormat: (v) => v.toFixed(2) + '%',
  onDayClick: (day) => openSession(day.date),
})`}</code></pre>
<p>
  週は左から右へ、曜日は上から下へ並び、暦年ごとに 1 段、最大 10 年です。チャートの高さが足りないときは古い年から省きます。値のない日は空のセルで描き、下のカラーバーが色の目盛りを示します（<code>legend: false</code> で非表示）。
</p>

<h2>相関行列</h2>
<pre><code>{`import { MatrixChart, correlationMatrix } from '@tradecanvas/chart'

// 価格ではなく日次リターンを渡します。銘柄ごとに 1 つの配列で、日付はそろえます。
const names = ['VCB', 'BID', 'CTG', 'TCB']
const values = correlationMatrix(returnsByStock)

new MatrixChart(el, {
  rows: names,                          // 正方でない行列には columns: [...]
  values,                               // values[row][column]
  triangle: 'lower',                    // 相関なら半分で十分
  colorScale: { min: -1, max: 1 },
  onCellClick: ({ row, column, value }) => compare(row, column),
})`}</code></pre>
<p>
  セルは正方形のままで、収まるときは値を表示します（<code>valueFormat</code> がなければ小数 2 桁）。列名がセルの幅に収まらないときは斜めにします。<code>correlationMatrix</code> は両方の系列に値がある日だけを組にし、3 日未満なら NaN を返してセルを空にします。時間帯と曜日ごとの出来高など、ほかの数値表にも使えます。
</p>

<h2>セクターマップ</h2>
<pre><code>{`import { HeatmapChart } from '@tradecanvas/chart'

new HeatmapChart(el, {
  data: [
    { id: 'vcb', label: 'VCB', value: 0.8, weight: 480, group: '銀行' },
    { id: 'hpg', label: 'HPG', value: 1.9, weight: 160, group: '鉄鋼' },
    { id: 'vhm', label: 'VHM', value: -2.4, weight: 170, group: '不動産' },
  ],
  grouped: true,                        // まずセクター、次に銘柄でタイルを配置
  valueFormat: (v) => v.toFixed(1) + '%',
})`}</code></pre>
<p>
  各セクターは銘柄のウェイトの合計に応じた広さを占め、収まるときはタイルの上部にセクター名と加重平均の騰落を表示します。ヒートマップの色は <code>colorScale</code> で <code>min</code> と <code>max</code> を指定しない限り -5 から 5 です。
</p>

<h2>逆ウォッチ曲線</h2>
<pre><code>{`import { CounterClockChart } from '@tradecanvas/chart'

const clock = new CounterClockChart(el, {
  data: bars,                           // OHLCV の足、古い順
  period: 25,                           // 各平均に含める足の数
  points: 120,                          // 描く最新の点の数
  xLabel: '出来高（平均）', yLabel: '価格（平均）',
  onPointClick: (p) => goTo(p.time),
})

clock.getPhase()                        // 1〜8：最後の動きの方向`}</code></pre>
<p>
  各点は出来高（横）と終値（縦）の 25 本平均で、時間順に結ばれ、古いほど薄くなります。健全な循環は反時計回りに回ります。<code>getPhase()</code>（と <code>counterClockPhase(points)</code>）は最後の動きを返します：1 出来高増、2 価格と出来高がともに上昇、3 価格上昇、4 出来高減の中の価格上昇、5 出来高減、6 ともに下落、7 価格下落、8 出来高増の中の価格下落。
</p>

<h2>スパークライン、ゲージ、ヒートマップ、ウォーターフォール、板の厚み、エクイティカーブ</h2>
<pre><code>{`import { SparklineChart, GaugeChart, HeatmapChart, WaterfallChart, DepthChart, EquityCurveChart } from '@tradecanvas/chart'

new SparklineChart(el, { data: closes, mode: 'area', showLastPoint: true })

const gauge = new GaugeChart(el, {
  value: 72, min: 0, max: 100, label: 'Fear & Greed',
  zones: [{ from: 0, to: 45, color: '#e8505b' }, { from: 45, to: 55, color: '#8a93a3' }, { from: 55, to: 100, color: '#1fa874' }],
})
gauge.setValue(64)

// 時価総額で大きさを、当日の変化率で色を決めたツリーマップ。
new HeatmapChart(el, {
  data: [{ id: 'vcb', label: 'VCB', value: 1.2, weight: 480 }, { id: 'fpt', label: 'FPT', value: -0.8, weight: 170 }],
  weighted: true, showLabels: true, showValues: true,
  onCellClick: (cell) => openSymbol(cell.label),
})

new WaterfallChart(el, { data: [{ label: 'Start', value: 10000, type: 'total' }, { label: 'Fees', value: -85 }, { label: 'End', value: 9915, type: 'total' }] })
new DepthChart(el, { data: { bids, asks }, midPriceLine: true, spreadLabel: true })
new EquityCurveChart(el, { data: equity, benchmark, drawdown: true })`}</code></pre>

<h2>パフォーマンスダッシュボード</h2>
<p>
  <code>PerformanceDashboard</code> はバックテストから戦略レポートを組み立てます。主要な統計の帯、エクイティカーブ、
  その下のドローダウン、月次リターンのカレンダーで構成されます。<a href={href('/docs/analytics')}>分析</a>のバックテスターと組み合わせて使います。
</p>
<pre><code>{`import { Backtester } from '@tradecanvas/analytics'
import { PerformanceDashboard } from '@tradecanvas/chart'

const result = new Backtester({ initialCash: 10_000 }).run(bars, myStrategy)

const dash = new PerformanceDashboard(document.getElementById('report')!, {
  result,            // { equityCurve, metrics } を持つものなら何でも：Backtester の出力がそのまま使える
  theme: 'dark',
  title: 'SMA Crossover',
  subtitle: 'BTC/USDT · 1h · 2023',
})

// あとで：dash.update(newResult) · dash.setTheme('light') · dash.destroy()`}</code></pre>
<p>
  独自のレイアウト向けに計算関数もエクスポートされています：<code>computeMonthlyReturns</code>、
  <code>computeDrawdownCurve</code>、<code>toEquityPoints</code>、<code>selectKeyStats</code>。独自の軸には
  <code>niceScale(min, max)</code> が使えます（目盛りは 1、2、2.5、5 刻み）。
</p>
