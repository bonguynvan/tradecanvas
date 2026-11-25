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
    <tr><td><code>PayoffChart</code></td><td>原資産の価格ごとに見た、オプションのポジションの満期時の損益：スプレッド、ストラドル、コンドル。</td></tr>
    <tr><td><code>CurveChart</code></td><td>権利行使価格や期間に対する値を、系列ごとに 1 本の線で：ボラティリティ・スマイル、期間構造、イールドカーブ。</td></tr>
    <tr><td><code>BoxPlotChart</code></td><td>グループごとの値の散らばり：曜日別、月別、戦略別のリターン。</td></tr>
    <tr><td><code>RadarChart</code></td><td>複数の指標を一度に、指標ごとに 1 本の軸で：戦略のスコアカードをベンチマークのものと並べて。</td></tr>
    <tr><td><code>SunburstChart</code></td><td>全体の内訳と、その内訳の中の内訳：資産クラス、次にセクター、次に保有銘柄ごとの配分。</td></tr>
    <tr><td><code>StackedAreaChart</code></td><td>時間に沿って積み重ねた複数の系列：合計が何でできているか、またはその構成がどう変わるか。</td></tr>
    <tr><td><code>SurfaceChart</code></td><td>2 つの軸にまたがる値を、ドラッグで回せる 3D の箱の中の面として：権利行使価格と満期ごとのインプライド・ボラティリティ、価格と日ごとの利益、またはスライスとして、時間に沿ったオーダーブックの厚み。</td></tr>
    <tr><td><code>Bar3DChart</code></td><td>同じ箱の中に、値ごとに 1 本の柱を、系列ごとに 1 列ずつ奥へ並べて：四半期と資産クラスごとのリターン、時間帯と曜日ごとの出来高。</td></tr>
    <tr><td><code>PerformanceDashboard</code></td><td>バックテストから作る戦略レポート：統計、エクイティ、ドローダウン、月次リターン。</td></tr>
  </tbody>
</table>

<h2>共通の機能</h2>
<pre><code>{`const chart = new BarChart(element, { categories, series, theme: 'dark' })

chart.setOptions({ mode: 'stacked' })   // どのオプションでも、マージされる
chart.setTheme('light')                 // 'dark' | 'light' | Theme
chart.screenshot('flows', { pixelRatio: 2 })   // 画像：下記を参照
chart.destroy()                       // キャンバスとそのリスナーを取り除く`}</code></pre>
<p>
  タッチ画面では、タップするとツールチップが表示され、別の場所をタップするまで残ります。ドラッグすればページはそのままスクロールします。チャートは画面そのもののピクセルに合わせて描画されるため、どの拡大率でも線がくっきり表示されます。デプス、エクイティ、ウォーターフォールの各チャートは、新しいチャートと同じく、ラベルに合わせて余白を決めます。
</p>
<p>
  テキストはシステムのサンセリフ体で描かれ、ウィジェットの数字と同じ書体です。<code>font</code> で別の書体を指定でき（<code>{'{'} family: MONO_FONT_FAMILY {'}'}</code> で等幅に戻せます）、独自の書体を持つテーマはその書体のままです。<code>locale</code>（<code>'vi'</code> のような BCP 47 タグ）で数値と日付の表記言語を指定します。省略時はブラウザーの言語です。各チャートはスクリーンリーダーに英語で自身を説明しますが、<code>ariaLabel</code> で自分の言葉に置き換えられます。デプスチャートの <code>spreadLabel</code> とエクイティカーブの <code>benchmarkLabel</code> はチャート上に描く文字を、ダッシュボードの <code>labels</code> はタイトルと統計値の名前を指定します。
</p>
<p>
  どのチャートも要素いっぱいに広がり、要素のサイズが変わると再描画します。ホバー時のツールチップがあるチャートでは、
  <code>crosshair: false</code> で無効にできます。棒グラフ、ドーナツ、散布図、ヒストグラム、カレンダー、行列は、何を表示しているかを
  スクリーンリーダーに伝えます（キャンバスに image ロールとラベルが付きます）。<code>ariaLabel</code> を使うと、
  たとえばページの言語で、その内容を自分の言葉にできます。数値は <code>valueFormat</code>（または
  <code>xFormat</code> / <code>yFormat</code>）で表示し、指定がなければ 1,234.5、1 万を超えると 12.3K のように表示します。
</p>

<h2 id="pictures">画像、紙、ページなしでの描画</h2>
<p>
  どのチャートも、価格チャートと同じく自分の画像を返します：<code>screenshot(filename, options)</code> は画像を保存し、
  <code>copyScreenshot()</code> は PNG をクリップボードに置き、<code>screenshotDataURL()</code>、
  <code>screenshotBlob()</code>、<code>toCanvas()</code> は画像を渡します。チャートは画像のために描き直され、
  ポインターに追従するものは入りません：自身の大きさに画面のピクセル比を掛けて描くか、オプションで指定した
  <code>pixelRatio</code>、<code>theme</code>、<code>width</code> と <code>height</code> で描きます（別の大きさではレイアウトし直します）。
  <code>print()</code> はチャートだけを対象に印刷ダイアログを開き、<code>toPdf()</code> は 1 ページの PDF を返します。
  どちらも、指定しない限りライトテーマで 2 倍のピクセル数です。<code>chartsToPdf</code> は複数のチャートから 1 つの PDF を作ります
  （オプションは<a href={href('/docs/api')}>画像、印刷、PDF</a>にあります）。
</p>
<pre><code>{`import { chartsToPdf } from '@tradecanvas/chart'

equity.screenshot('equity', { pixelRatio: 3 })                 // equity.png
const wide = flows.screenshotDataURL({ width: 1200, height: 400, type: 'jpeg' })
allocation.print({ title: 'Allocation' })
const report = await chartsToPdf([equity, flows, allocation], { title: 'March' })`}</code></pre>
<p>
  <code>renderFinanceChart</code> は、ページなしで、あなたが用意した 2D コンテキストにチャートを描きます：
  メール、レポート、ボットのメッセージに入れる画像のために Node で作ったキャンバスや、ワーカー内の
  <code>OffscreenCanvas</code> です。2 番目の引数でチャートを指定します。クラス名から <code>Chart</code> を除き、
  先頭を小文字にした名前です（<code>'bar'</code>、<code>'equityCurve'</code>、<code>'boxPlot'</code>、
  <code>'surface'</code>、<code>'bar3d'</code>。<code>FINANCE_CHART_KINDS</code> に一覧があります）。
  3 番目の引数はそのチャート自身のオプションです。指定した大きさを、コンテキスト自身の単位で、テーマの背景の上に描きます：
  ピクセル数を増やすには、先にコンテキストをスケールしてください。
</p>
<pre><code>{`import { createCanvas } from '@napi-rs/canvas'        // または別の Node 用キャンバス
import { renderFinanceChart } from '@tradecanvas/chart'

const canvas = createCanvas(1600, 800)
const ctx = canvas.getContext('2d')
ctx.scale(2, 2)                                        // 800 × 400 のチャートを 2 倍のピクセル数で
renderFinanceChart(ctx, 'equityCurve', { data: equity, theme: 'light', font: { family: 'Inter' } }, { width: 800, height: 400 })
const png = canvas.toBuffer('image/png')`}</code></pre>
<p>
  コンテキストには、ブラウザーのコンテキストが持つものが必要です：パス、テキストとその計測、
  <code>getTransform</code>。テキストはテーマのフォントで描かれるので、キャンバスが持っているフォントを
  <code>font</code> で指定してください。ポインターに追従するものはなく、動くものもありません：ゲージはその値の位置にあります。
  パフォーマンスダッシュボードはページの要素で作られているため、この方法では描かれません。その中のチャートは描かれます。
  価格チャートには専用のものがあります：API ページの <code>renderPriceChart</code> です。
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
<p>
  列の少ない表（期間ごとの財務諸表の各行など）には <code>cellWidth: 'fill'</code> を指定します。列が行名の横の幅を分け合い、行の高さはそのままなので、マトリクスが中央に小さく収まらずチャート全体を使います。数値を渡すと各列の幅をピクセルで指定でき、空いている幅を超えることはありません。
</p>

<h2>セクターマップ</h2>
<pre><code>{`import { HeatmapChart } from '@tradecanvas/chart'

new HeatmapChart(el, {
  data: [
    { id: 'vcb', label: 'VCB', value: 0.8, weight: 480, group: '銀行', logo: '/logos/vcb.png' },
    { id: 'hpg', label: 'HPG', value: 1.9, weight: 160, group: '鉄鋼' },
    { id: 'vhm', label: 'VHM', value: -2.4, weight: 170, group: '不動産' },
  ],
  grouped: true,                        // まずセクター、次に銘柄でタイルを配置
  valueFormat: (v) => v.toFixed(1) + '%',
})`}</code></pre>
<p>
  各セクターは銘柄のウェイトの合計に応じた広さを占め、収まるときはタイルの上部にセクター名と加重平均の騰落を表示します。ヒートマップの色は <code>colorScale</code> で <code>min</code> と <code>max</code> を指定しない限り -5 から 5 です。
</p>
<p>
  <code>logo</code> を持つセルは、収まるときに名前の上の白いプレートにロゴを描きます。セルが小さくなると、
  名前と値より先にロゴがなくなります。アドレスはシンボルの <code>logo</code> と同じもの（<code>https:</code> のアドレス、
  サイト内のパス、<code>blob:</code> または <code>data:image/…</code> の URL）を受け付け、読み込みは一度だけで、
  ロゴの読み込みに失敗したセルはロゴなしのセルとして描かれます。ほかのサイトのロゴは CORS ヘッダー付きで配信されている
  必要があります。チャートを画像として保存できるようにするためで、付いていないものは描かれません。
  <code>showLogos: false</code> でロゴを描かなくなります。ページなしで描く場合（<code>renderFinanceChart</code>）、ヒートマップにロゴはありません。
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
<p>
  資産曲線は <strong>levels</strong>（固定値でプロットを横切る線。値は軸のタグに書かれます）と
  <strong>bands</strong>（曲線の下に色を付けた値の範囲）も受け取ります。level には右端に書く <code>label</code>（<code>labelAt: 'start'</code> なら曲線の最新の点から離れた左端）、
  <code>color</code>、<code>dash</code>（<code>[]</code> で実線）があり、band には角に書く <code>label</code> と、そのまま
  使われる <code>color</code> があるので、透明度のある色を渡してください。色がなければどちらもテーマの色になります。
  level の値は省略せずに書かれ、<code>valueFormat</code> があればそれに従います。
  近すぎて両方は収まらない level のタグは互いに離れ（全部を置く余地がなければ、いちばん低い level のタグが省かれます）、
  プロット内の名前も重なりません。値の目盛りはすべてが見えるように
  広がります。<code>fitLevels: false</code> では目盛りを曲線に合わせ、外れた level は描かず、band は重なる部分だけ描きます。
  <code>setOptions</code> でチャートをそのままにして変えられます。
</p>
<pre><code>{`const chart = new EquityCurveChart(el, {
  data: closes,
  levels: [{ value: 41_250, label: 'BOS', color: '#e0a030' }, { value: 38_900, label: 'Equilibrium' }],
  bands: [
    { from: 38_900, to: 44_100, label: 'Premium', color: 'rgba(232, 80, 91, 0.10)' },
    { from: 33_700, to: 38_900, label: 'Discount', color: 'rgba(31, 168, 116, 0.10)' },
  ],
})
chart.setOptions({ levels: [{ value: 42_000, label: 'CHoCH' }] })`}</code></pre>

<h2>オプションのペイオフ</h2>
<p>
  <code>PayoffChart</code> は、オプションのポジションが満期に生む損益を、原資産の価格に対して描きます：
  ゼロより上の利益とゼロより下の損失に色を付け、各損益分岐点と、現在の価格である <code>spot</code> に破線を引きます。
  レッグは <code>'call'</code> または <code>'put'</code> で、買い（<code>'long'</code>）か売り（<code>'short'</code>）、
  それに <code>strike</code> と 1 単位あたりの <code>premium</code> を持ちます。
  <code>'underlying'</code> のレッグは、それらと並べて保有する原資産で、<code>entry</code> の価格で持ちます。
  <code>multiplier</code> は 1 枚の契約が対象とする単位数です。描かれる価格は権利行使価格の周辺、または指定した
  <code>range</code> です。ポインターは、その位置の価格での損益を読み取ります。
</p>
<pre><code>{`import { PayoffChart, payoffStats, optionPayoff } from '@tradecanvas/chart'

const condor = [
  { type: 'put', side: 'long', strike: 90, premium: 1 },
  { type: 'put', side: 'short', strike: 95, premium: 2.5 },
  { type: 'call', side: 'short', strike: 105, premium: 2.5 },
  { type: 'call', side: 'long', strike: 110, premium: 1 },
]
const chart = new PayoffChart(el, { legs: condor, multiplier: 100, spot: 101.4, spotLabel: 'Spot' })
chart.update(otherLegs)

payoffStats(condor, 100)    // { maxProfit: 300, maxLoss: -200, breakevens: [92, 108] }
optionPayoff(condor, 100, 100)   // 300：原資産が 100 のときにレッグ全体が生む損益

// 満期前：モデルによる 2 本目の破線
chart.setOptions({ model: { daysToExpiry: 30, volatility: 0.25, rate: 0.03 } })
positionValue(condor, 100, { daysToExpiry: 30, volatility: 0.25 }, 100)   // 満期まで 30 日のときにレッグ全体が生む損益
optionPrice('call', 100, 105, { years: 30 / 365, volatility: 0.25 })      // オプション 1 つの価格`}</code></pre>
<p>
  <code>payoffStats</code> は、レッグ全体の満期時の最大利益と最大損失（限度がない場合は <code>null</code>：
  コールの買い、単独のコールの売り）、および損益分岐点の価格を返します。権利行使価格のないレッグや、
  エントリーのない原資産は、計算に入りません。
</p>
<p>
  <code>model</code> を指定すると、チャートは、満期までその日数が残っているときのポジションの損益を、
  ペイオフに重ねて破線で描き、プロットの上に 2 本の線の名前を、それぞれ自分の線の一部の横に書き（<code>expiryLabel</code> と
  <code>model.label</code> で自分の言葉にできます）、ポインターの位置で両方を読み取ります。
  各オプションは、ヨーロピアン・オプションとしてブラック・ショールズで、
  モデルの <code>volatility</code>（年率、割合で指定：<code>0.25</code> は 25%）で評価され、指定があれば <code>rate</code> と
  <code>dividendYield</code> も使います。レッグ自身の <code>volatility</code> と <code>daysToExpiry</code> は、
  スキューやカレンダー・スプレッドのために、モデルの値の代わりになります。これはモデルの答えであり、気配値ではありません：
  アメリカン・オプションや、ボラティリティが価格とともに動くオプションの価値は、別の値になります。
  <code>positionValue</code> と <code>optionPrice</code> がその計算で、価格の約 100 万分の 1 まで正確です。
  残り日数がなければ <code>positionValue</code> は <code>optionPayoff</code> になり、原資産が 0 のとき、
  プットの価値は割り引いた権利行使価格です。
</p>

<h2>カーブ：ボラティリティ・スマイル、期間構造</h2>
<p>
  <code>CurveChart</code> は、権利行使価格、期間、満期に対する値を、系列ごとに 1 本の線で描きます。
  線は各点を通る滑らかな曲線で、点が達していない値を通ることはありません（<code>smooth: false</code> で直線で結びます）。
  <code>dashed</code> を付けた系列は、今日のものの横に並べる昨日のもので、<code>markers</code> はある x の位置に引くラベル付きの線です。
  <code>ticks</code> を指定すると、x 軸の名前を自分で付けられ、日数ごとに期間を書けます。
  ポインターは値のある最も近い x に吸着し、そこでのすべてのカーブを、描かれている線に沿って読み取ります。
  <code>curveValueAt(points, x)</code> はコードからカーブを読み取ります。点と点の間は直線で、
  3 番目の引数に <code>true</code> を渡すと滑らかな線に沿って読み取ります。
</p>
<pre><code>{`import { CurveChart } from '@tradecanvas/chart'

// スマイル：権利行使価格に対するインプライド・ボラティリティ、満期ごとに 1 本の線。
new CurveChart(el, {
  series: [
    { name: '1M', points: [{ x: 90, y: 31 }, { x: 100, y: 24 }, { x: 110, y: 27 }] },
    { name: '3M', points: [{ x: 90, y: 28 }, { x: 100, y: 25 }, { x: 110, y: 26 }] },
  ],
  markers: [{ x: 101.4, label: 'ATM' }],
  valueFormat: (v) => v.toFixed(1) + '%',
})

// 期間構造：x に沿って期間を、日数で。
new CurveChart(el, {
  series: [
    { name: 'Today', points: [{ x: 30, y: 26 }, { x: 90, y: 25 }, { x: 365, y: 27 }] },
    { name: 'A week ago', points: [{ x: 30, y: 24 }, { x: 90, y: 25 }, { x: 365, y: 26 }], dashed: true },
  ],
  ticks: [{ x: 30, label: '1M' }, { x: 90, label: '3M' }, { x: 365, label: '1Y' }],
})`}</code></pre>

<h2>箱ひげ図</h2>
<p>
  <code>BoxPlotChart</code> は、グループごとの値の散らばりを示します：第 1 四分位数から第 3 四分位数までの箱と中央値の線、
  箱から箱の高さの <code>whiskers</code> 倍以内にある最も遠い値までのひげ（省略時は 1.5。<code>Infinity</code> で
  最小値と最大値まで）、そしてそれより外にある値ごとの輪です。グループは生の <code>values</code> を渡すか、
  別の場所で計算済みなら、その数値を <code>stats</code> で渡します。<code>boxPlotStats(values)</code> は
  同じ計算をコードで行い、<code>labels</code> で読み取り表示の言葉を別の言語にできます。
  <code>onBoxClick</code> は、クリックが当たったグループとその 5 つの数値を返します：
  プロットを横切るそのグループの位置であれば上下のどこでもよく、読み取り表示がグループを選ぶのと同じです。
</p>
<pre><code>{`import { BoxPlotChart, boxPlotStats } from '@tradecanvas/chart'

new BoxPlotChart(el, {
  data: [{ label: 'Mon', values: mondayReturns }, { label: 'Tue', values: tuesdayReturns }],
  colorBySign: true,                     // 各箱の中央値で
  valueFormat: (v) => v.toFixed(1) + '%',
  onBoxClick: (group, stats) => openDay(group.label, stats.median),
})

boxPlotStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 100])
// { min: 1, q1: 3.25, median: 5.5, q3: 7.75, max: 9, outliers: [100] }`}</code></pre>

<h2>レーダーチャート</h2>
<p>
  <code>RadarChart</code> は、複数の指標を中心のまわりの軸に、12 時の位置から時計回りに並べ、
  各系列の値を結んで図形にします。軸は中心の <code>min</code>（省略時は 0、その軸の最小値がゼロ未満ならその値）から
  縁の <code>max</code> まで伸び、指定がなければその軸の最大値が縁になります：
  指標の大きさが異なるときは、軸ごとに指定してください。軸は 3 本必要です。ポインターは最も近い軸のすべての系列を読み取り、
  <code>onAxisClick</code> はクリックに対してその軸を返します：ラベル、
  <code>axes</code> の中での位置、その軸での各系列の値です。
</p>
<pre><code>{`import { RadarChart } from '@tradecanvas/chart'

new RadarChart(el, {
  axes: [{ label: 'Sharpe', max: 3 }, { label: 'Sortino', max: 3 }, { label: 'Calmar', max: 3 }, { label: 'Win rate', max: 100 }],
  series: [{ name: 'Strategy', values: [1.8, 2.4, 1.5, 58] }, { name: 'Benchmark', values: [1.0, 1.3, 0.7, 51] }],
  onAxisClick: ({ axis, index, values }) => explain(axis, values),   // 'Sortino', 1, [{ series: 'Strategy', value: 2.4 }, …]
})`}</code></pre>

<h2>サンバースト</h2>
<p>
  <code>SunburstChart</code> は、全体の内訳と、その内訳の中の内訳を、階層ごとに 1 つのリングで描きます。
  <code>children</code> を持つ部分の大きさは子の合計で、持たない部分は自身の <code>value</code> です。
  最初のリングはパレットの色を使い、その外側の各リングは親の色を薄くした色を使います。描かれるリングは最大 4 つで
  （<code>maxDepth</code> で減らすか増やせます）、<code>innerRadius: 0</code> で穴を閉じ、
  <code>centerLabel</code> と <code>centerValue</code> は穴の中に書かれます。クリックすると、その部分と、
  そこに至るまでのラベルが返ります。名前は、収まる場合にリングに沿って書かれます。
</p>
<pre><code>{`import { SunburstChart } from '@tradecanvas/chart'

new SunburstChart(el, {
  data: [
    { label: 'Stocks', children: [{ label: 'Banks', value: 22 }, { label: 'Technology', value: 14 }] },
    { label: 'Bonds', value: 23 },
    { label: 'Cash', value: 18 },
  ],
  centerLabel: 'Total', centerValue: '1.2B',
  onNodeClick: (node, path) => openHoldings(path),   // ['Stocks', 'Banks']
})`}</code></pre>

<h2>積み上げ面グラフ</h2>
<p>
  <code>StackedAreaChart</code> は、同じ点の上に複数の系列を積み重ね、最初の系列がいちばん下になります：
  時間に沿って、合計が何でできているかを示します。<code>normalized</code> を指定すると、各点の値は合計に対する割合になり、
  面が高さいっぱいを埋めます：構成がどう変わるかを示します。ゼロ未満の値は、値がないものとして数えます。
  ポインターは、最も近い点でのすべての系列とその合計を読み取ります。
</p>
<pre><code>{`import { StackedAreaChart } from '@tradecanvas/chart'

const chart = new StackedAreaChart(el, {
  categories: ['Jan', 'Feb', 'Mar', 'Apr'],
  series: [{ name: 'Stocks', values: [40, 44, 47, 52] }, { name: 'Bonds', values: [30, 29, 27, 25] }, { name: 'Cash', values: [30, 27, 26, 23] }],
  normalized: true,
})
chart.update(nextSeries, nextCategories)`}</code></pre>

<h2>3D サーフェス</h2>
<p>
  <code>SurfaceChart</code> は、2 つの軸にまたがる値を、箱の中の面として描きます：<code>x</code> は横方向、
  <code>y</code> は奥行き方向、<code>values[yIndex][xIndex]</code> は高さ方向です。軸に沿った数値はその値に応じた位置に置かれ、
  渡した順序に関係なく値の小さい順に描かれます。名前は渡した順に等間隔で並ぶので、期間のリスト
  （<code>'1W'</code>、<code>'1M'</code>、<code>'1Y'</code>）が短い側に詰まることはありません。
  欠けている値や数値でない値は穴になり、軸に沿った位置が数値でない場合は、その値ごと除外されます。
</p>
<pre><code>{`import { SurfaceChart } from '@tradecanvas/chart'

const chart = new SurfaceChart(el, {
  x: [80, 90, 100, 110, 120],              // 権利行使価格
  y: ['1W', '1M', '3M', '6M', '1Y'],       // 満期
  values: impliedVolatility,               // values[expiry][strike]
  xLabel: 'Strike', yLabel: 'Expiry', valueLabel: 'IV',
  valueFormat: (v) => (v * 100).toFixed(1) + '%',
  onPointClick: (point) => openChain(point.x, point.y),
})
chart.update(nextValues)                   // 軸も変わったときは update(values, { x, y })`}</code></pre>
<p>
  ドラッグするとチャートが回ります：マウスでは回転と傾きの両方、指では回転だけなので、その下のページはそのままスクロールします。
  キーボードでは、Tab でチャートまで移動すると、矢印キーで 5 度ずつ（Shift を押しながらだと 15 度ずつ）回転と傾きを変え、
  Home で元に戻ります。スクリーンリーダーにはこれらのキーが伝えられ、キーを押すたびに、チャートをどこから見ているかが伝えられます
  （<code>describeView</code> で自分の言葉にできます）。ダブルクリックすると、オプションで指定した <code>view</code> に戻ります
  （指定がなければ <code>{'{'} yaw: -35, pitch: 28 {'}'}</code>：<code>yaw</code> はチャートを垂直軸のまわりに回し、
  <code>pitch</code> は視点が床からどれだけ上にあるかで、0 から 90 度です）。
  <code>getView()</code> は現在どこから見ているかを読み取り、<code>setView()</code> はそれを設定し、
  <code>onViewChange</code> はそれを追い、<code>rotate: false</code> で固定します。チャートは遠近法なしで描かれるので、
  データ上で平行な線は画面上でも平行のままで、回しても大きさは変わりません。
</p>
<p>
  <code>style</code> は <code>'surface'</code>（陰影の付いた面、既定）、<code>'wireframe'</code>（その線だけ）、
  <code>'slices'</code>（<code>y</code> ごとに塗りつぶした 1 本の線を、前後に並べる）のいずれかです。
  値は <code>colorRamp</code> で色分けされます：既定では、値の範囲にわたって、チャートの背景に近い色から最も濃い色までの 1 つの色相です。
  独自の色分けには、<code>colors</code>（2 色以上、最小値の色が最初）と <code>min</code>、<code>max</code> を渡します。
  たとえば、ゼロの両側に損失の色、中間色、利益の色を置けます。ポインターは、それが乗っているセルの最も近い点を読み取り、
  面が自身の上に折り重なる場所では手前の点を読み取ります。軸に沿って 120 点を超えるグリッドは、両端を保ったまま 120 点に間引かれ、
  回している間は 60 点に間引かれるので、大きなグリッドも滑らかに回ります。
</p>
<p>
  <code>depthSurface(snapshots, {'{'} levels {'}'})</code> は、一連のオーダーブックをサーフェスの
  <code>x</code>、<code>y</code>、<code>values</code> に変換します：横方向に価格、奥行き方向に各オーダーブックの時刻、
  そして各位置に、デプスチャートと同じく、最良価格からその価格までに待っている数量です。
  <code>levels</code> は価格の数（省略時は 48、最大 1,000）で、<code>from</code> と <code>to</code> で価格の範囲を絞れます。
</p>
<pre><code>{`import { SurfaceChart, depthSurface } from '@tradecanvas/chart'

// books: { time, bids: [{ price, volume }], asks: [...] }[]、古い順
const chart = new SurfaceChart(el, {
  ...depthSurface(books, { levels: 48 }),
  style: 'slices',
  xLabel: 'Price', yLabel: 'Time', valueLabel: 'Depth',
  yFormat: (ms) => new Date(ms).toISOString().slice(11, 16),
})`}</code></pre>

<h2>3D 棒グラフ</h2>
<p>
  <code>Bar3DChart</code> は、値ごとに 1 本の柱を立て、系列ごとに 1 列ずつ奥へ並べます：横方向に <code>categories</code>、
  <code>series</code> の各系列に 1 列で、最初の系列が <code>y</code> 軸の手前になります。柱はゼロから始まります。
  ゼロ未満の柱はゼロの高さからぶら下がり、ゼロの高さは箱を横切る面として描かれます。
  回転については、<code>view</code>、<code>rotate</code> など、サーフェスが受け取るものをそのまま受け取り、
  <code>onBarClick</code> はカテゴリ、系列、値を返します。描かれるのは 120 カテゴリ、120 系列までです。
</p>
<pre><code>{`import { Bar3DChart } from '@tradecanvas/chart'

const chart = new Bar3DChart(el, {
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [{ name: 'Stocks', values: [4.2, 6.1, -2.4, 5.3] }, { name: 'Bonds', values: [1.1, 0.8, 1.6, -0.5] }],
  valueFormat: (v) => v.toFixed(1) + '%',
})
chart.update(nextSeries, nextCategories)`}</code></pre>

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
  手で組み立てる指標は <code>@tradecanvas/analytics</code> が返すのと同じく小数で渡します。
  <code>totalReturnPct</code> が <code>0.12</code> なら +12.00% と表示され、パーセントで
  （<code>12</code>）渡すと 100 倍の大きさになります。<code>maxDrawdownPct</code> は符号に関係なく下落として表示されます。
</p>
<p>
  独自のレイアウト向けに計算関数もエクスポートされています：<code>computeMonthlyReturns</code>、
  <code>computeDrawdownCurve</code>、<code>toEquityPoints</code>、<code>selectKeyStats</code>。独自の軸には
  <code>niceScale(min, max)</code> が使えます（目盛りは 1、2、2.5、5 刻み）。
</p>
