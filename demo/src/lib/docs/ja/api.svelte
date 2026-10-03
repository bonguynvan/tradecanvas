<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>API リファレンス — TradeCanvas ドキュメント</title>
  <meta name="description" content="Chart、ChartWidget、ChartGrid と TradeCanvas のコア API のリファレンス。" />
</svelte:head>

<h1>API リファレンス</h1>
<p>トップレベルクラス <code>Chart</code>、<code>ChartWidget</code>、<code>ChartWidgetGrid</code>、<code>ChartGrid</code> の公開 API です。</p>

<h2>Chart</h2>
<p>ヘッドレスなレンダラーです。UI は自前で用意し、イベントを購読し、メソッド呼び出しで状態を変更します。</p>

<h3>コンストラクター</h3>
<pre><code>{`new Chart(host: HTMLElement, options?: ChartOptions)`}</code></pre>

<h3>データ</h3>
<table>
  <thead><tr><th>メソッド</th><th>用途</th></tr></thead>
  <tbody>
    <tr><td><code>setData(data)</code></td><td>系列全体を置き換えます。</td></tr>
    <tr><td><code>appendBar(bar)</code></td><td>新しいバーを追加します。有効な場合は自動スクロールします。</td></tr>
    <tr><td><code>appendBars(bars)</code></td><td>まとめて追加します。インジケーターの再計算は 1 回だけです。</td></tr>
    <tr><td><code>updateLastBar(bar)</code></td><td>形成中の現在のバーを更新します。</td></tr>
    <tr><td><code>updateLastBarFromTick(tick)</code></td><td>ティックを最後のバーに統合します。</td></tr>
    <tr><td><code>getData()</code></td><td>元の OHLC 系列を取得します。</td></tr>
  </tbody>
</table>

<h3>チャートタイプとテーマ</h3>
<table>
  <thead><tr><th>メソッド</th><th>用途</th></tr></thead>
  <tbody>
    <tr><td><code>setChartType(type)</code></td><td>18 種類のいずれか。<a href={href('/docs/chart-types')}>チャートタイプ</a>を参照してください。</td></tr>
    <tr><td><code>setTheme(name)</code></td><td>組み込みテーマを切り替えます。</td></tr>
    <tr><td><code>setTimeframe(tf)</code></td><td>表示中の時間足を切り替え、ライブストリームを接続し直します。</td></tr>
  </tbody>
</table>

<h3>インジケーター</h3>
<table>
  <thead><tr><th>メソッド</th><th>用途</th></tr></thead>
  <tbody>
    <tr><td><code>addIndicator(id, params?, position?)</code></td><td>オーバーレイ型またはパネル型のインジケーターを追加し、インスタンス id を返します。</td></tr>
    <tr><td><code>updateIndicator(instanceId, params)</code></td><td>表示中のインジケーターを変更します。</td></tr>
    <tr><td><code>removeIndicator(instanceId)</code></td><td>削除して破棄します。</td></tr>
  </tbody>
</table>

<h3>軸とスケール</h3>
<p>
  価格軸（右側の帯）と時間軸（下側の帯）は、トレーダーが使い慣れたジェスチャーで
  直接ポインター操作できます：
</p>
<table>
  <thead><tr><th>ジェスチャー</th><th>効果</th></tr></thead>
  <tbody>
    <tr><td>価格軸を上下にドラッグ</td><td>縦方向の価格範囲を縮める / 広げる（自動スケールは無効になります）。</td></tr>
    <tr><td>時間軸を左右にドラッグ</td><td>時間軸を拡大 / 縮小します。</td></tr>
    <tr><td>価格軸をダブルクリック</td><td>自動スケールを再び有効にします。</td></tr>
    <tr><td>時間軸をダブルクリック</td><td>すべてのデータを表示領域に収めます。</td></tr>
  </tbody>
</table>
<p>
  <strong>タイムゾーン。</strong> 時間軸のラベルとクロスヘアの時刻表示は、既定ではブラウザーの
  ローカルタイムゾーンに従います。設定シートから、または直接、固定の UTC オフセットに
  切り替えられます（ローカルに戻すこともできます）：
</p>
<pre><code>{`chart.setTimezoneOffset(-300)  // EST (UTC-5), in minutes
chart.setTimezoneOffset(330)   // IST (UTC+5:30)
chart.setTimezoneOffset(null)  // back to browser-local`}</code></pre>

<p>同じ操作はプログラムからも行えます：</p>
<pre><code>{`chart.setAutoScale(false)  // freeze the current price range
chart.setLogScale(true)    // switch to logarithmic price scale
chart.setInvertScale(true) // upside down (Alt+I in the widget)
chart.fitContent()         // zoom out to all data
chart.scrollToEnd()
chart.setVisibleRangePreset('3M')       // 1D 5D 1M 3M 6M YTD 1Y 5Y All
chart.goToTime(Date.UTC(2025, 0, 1))    // centre that bar (Alt+G in the widget)`}</code></pre>

<p>
  <strong>価格スケールのモード。</strong> 標準と対数のほかに、表示中の最初のバーを基準に
  軸のラベルを付け直すこともできます。<code>percentage</code> は変化率（%）を表示し、
  <code>indexedTo100</code> は基準を 100 にそろえます。標準、パーセント、100 基準は同じ線形の配置を
  共有し、異なるのはラベルだけです。チャート設定パネルから、または直接設定できます：
</p>
<pre><code>{`chart.setScaleMode('percentage')   // axis labels: +12.34% from first visible bar
chart.setScaleMode('indexedTo100') // first visible bar reads as 100
chart.setScaleMode('logarithmic')
chart.getScaleMode()`}</code></pre>

<h3>価格と時刻の書式</h3>
<p>
  価格は独自の書式で表示できるほか、債券やその先物の呼値のように 1 ポイントの分数でも表示できます
  （<code>101'16</code> は 101 と 32 分の 16）。この書式は、価格スケールに沿って価格を表示するすべての箇所に
  適用されます。軸、クロスヘア、現在値タグ、凡例、ツールチップ、注文、アラート、描画のラベルです。軸の目盛りは
  ちょうど分数の区切りに置かれ、<code>roundPrice</code> もその単位で丸めます。インジケーターのペインは
  独自の数値表示のままです。時刻も好きな書式で表示でき、フォーマッターにはそのラベルの種類が渡されます。
</p>
<pre><code>{`new Chart(host, { priceFormat: { denominator: 32 } })                    // 101'16
chart.setPriceFormat({ denominator: 32, subDenominator: 2 })            // 101'165: 16½ 32nds
chart.setPriceFormat((p) => '$' + p.toFixed(2))
chart.setPriceFormat(null)                                              // decimals again

chart.setTimeFormatter((time, { kind, timeZone }) =>
  // kind: 'date' (a daily bar), 'day' (a new day), 'time' (within a day), 'crosshair'
  new Intl.DateTimeFormat('en-GB', { timeZone: timeZone ?? undefined, hour: '2-digit', minute: '2-digit' }).format(time))`}</code></pre>

<h3>シンボルの比較</h3>
<p>
  別のシンボルの変化率を価格スケール上に表示する（<code>addCompareSymbol</code>）ほか、その価格を専用の
  スケールや専用のペインに表示したり、チャートの終値とのスプレッドや比率を表示したりできます。後者は
  インジケーター（<code>compareSymbol</code>、<code>spread</code>）なので、ほかのインジケーターと同じく
  凡例、値ラベル、アラートを持ち、レイアウトにも保存されます。もう一方のシンボルのバーは時刻でチャートのバーに
  揃えられます。チャートは必要なバーを要求するので、時間足を変えたら改めて渡してください。
</p>
<pre><code>{`chart.addCompareSymbol('eth', 'ETHUSDT', ethBars, '#7c4dff')   // percent change, on this scale
chart.addIndicator('compareSymbol', { symbol: 'ETHUSDT' }, 'bottom', { scale: 'left' })  // own scale
chart.addIndicator('spread', { symbol: 'ETHUSDT', mode: 'ratio' })                      // own pane

chart.on('symbolSeriesRequest', async ({ payload }) =>
  chart.setSymbolSeries(payload.symbol, await adapter.fetchHistory(payload.symbol, '1h', 1000)))
chart.getRequiredSymbols()                           // what to fetch again on a new interval
chart.setPaneScale(spreadId, { percent: true })     // a pane in percent of its first value`}</code></pre>
<p>
  ChartWidget では、オブジェクトツリーの比較ボタンでまずシンボルを、次に表示方法（変化率、専用スケール、
  専用サブチャート、スプレッド、比率）を選びます。
</p>

<h3>データのエクスポート</h3>
<p>
  バーを CSV または JSON で書き出します。インジケーターのラインはそれぞれ独立した列になり、列名は凡例での
  名前と同じです。ChartWidget では、チャートの右クリックメニューに<strong>データをエクスポート (CSV)</strong>があります。
</p>
<pre><code>{`chart.exportAllData('csv', 'btc-1h.csv')                 // every bar loaded
chart.exportVisibleData('json', undefined, { indicators: false })
const text = chart.getExportText('csv', { range: 'visible' })
const { bars, columns } = chart.getExportData()          // columns: { name, values }[]`}</code></pre>

<h3>価格帯別出来高</h3>
<p>
  表示範囲の出来高を価格帯ごとに集計した横向きのヒストグラムです。既定ではオフで、
  プログラムから、またはウィジェットの設定シートで切り替えます：
</p>
<pre><code>{`chart.setVolumeProfileVisible(true)
chart.setVolumeProfileConfig({
  buckets: 48,        // resolution of the histogram
  widthRatio: 0.18,   // % of chart width
  opacity: 0.32,
  highlightPoC: true, // mark the highest-volume bucket
})`}</code></pre>

<h3>スイングマーカー（ピボット）</h3>
<p>
  フラクタルなスイング高値・安値を小さな三角形で示します（確定したピボット高値の上に ▼、
  ピボット安値の下に ▲）。強さの値で、左右それぞれ何本のバーがより低くなければならないかを
  指定します。設定シートから切り替えるか、次のようにします：
</p>
<pre><code>{`chart.setPivotMarkersVisible(true)
chart.setPivotMarkersConfig({ left: 5, right: 5, showLabels: true })

// market-structure labels (HH / HL / LH / LL) instead of price
chart.setPivotMarkersConfig({ structureLabels: true })

// pure detection + classification are exported
import { findPivots, classifyPivots } from '@tradecanvas/core'
const pivots = findPivots(bars, 5, 5)        // [{ index, price, type }]
const structure = classifyPivots(pivots)     // adds label: 'HH'|'LH'|'HL'|'LL'`}</code></pre>

<h3>セッションの塗りつぶし（通常取引時間）</h3>
<p>
  通常セッション外のバー（プレマーケット / ポストマーケットや夜間の休止時間）を暗くして、
  レギュラーセッションを際立たせます。既定は米国株式の RTH（ニューヨーク時間 09:30–16:00、
  夏時間を考慮）です。時間帯は 1 日の中の分数と、市場のタイムゾーンで設定します。
  フィードがセッション情報を提供するシンボルでは、自動的に設定されます。
</p>
<pre><code>{`chart.setSessionShadingVisible(true)
chart.setSessionShadingConfig({
  startMinute: 9 * 60 + 30,     // 09:30
  endMinute: 16 * 60,           // 16:00 (end-exclusive; end < start wraps midnight)
  timeZone: 'America/New_York', // or tzOffsetMinutes: -300 for a fixed offset
})`}</code></pre>
<p>
  <strong>時間外取引。</strong>オフにすると、シンボルの通常取引時間（その <code>timezone</code> での
  <code>SymbolInfo.sessions</code>）の外にあるバーがチャートから外れます。外れたバーはライブのバーや履歴のページも
  含めて取り置かれ、オンに戻すと再び表示されます。日足以上のバーはそのままです。
</p>
<pre><code>{`chart.setSymbolInfo({ symbol: 'AAPL', timezone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] })
chart.setExtendedHours(false)     // or new Chart(host, { extendedHours: false })
chart.isExtendedHoursVisible()`}</code></pre>

<h3>前期間のレベル (PDH / PDL / PDC)</h3>
<p>
  前日（または前週）の高値・安値・終値と、当期間の始値を、ラベル付きの水平線で表示します。
  デイトレーダーが注目するサポート / レジスタンスの水準です。設定シートから切り替えるか、
  直接指定します：
</p>
<pre><code>{`chart.setPeriodLevelsVisible(true)
chart.setPeriodLevelsPeriod('week')   // 'day' (PDH/PDL/PDC) | 'week' (PWH/PWL/PWC)

// pure computation is exported
import { computePeriodLevels } from '@tradecanvas/core'
const levels = computePeriodLevels(bars, 'day')  // [{ id, label, price }]`}</code></pre>

<h3>マーケットプロファイル (TPO)</h3>
<p>
  価格ごとの滞在時間を示すヒストグラムです。各バーは、その値幅が触れたすべての価格帯に
  TPO を 1 つずつ加え、POC（Point of Control、最も活発な価格）とバリューエリア
  （TPO の約 70%）を浮かび上がらせます。出来高ではなく時間で重み付けする点で価格帯別出来高とは
  異なり、左端に固定されるため両方を同時に表示できます。既定ではオフで、設定シートから、
  または直接切り替えます：
</p>
<pre><code>{`chart.setMarketProfileVisible(true)
chart.setMarketProfileConfig({
  buckets: 48,
  widthRatio: 0.18,
  opacity: 0.32,
  valueAreaPct: 0.7,  // fraction of TPOs in the value area
  highlightPoC: true, // dashed line at the point of control
})

// split into one mini-profile per calendar-day session
chart.setMarketProfileConfig({ splitBySession: true })

// classic TPO letters per session (when zoomed in enough to be legible)
chart.setMarketProfileConfig({ splitBySession: true, letters: true })

// pure computation is exported too
import { computeMarketProfile, computeSessionProfiles } from '@tradecanvas/core'
const profile = computeMarketProfile(bars, priceMin, priceMax, { buckets: 48 })
const sessions = computeSessionProfiles(bars, priceMin, priceMax)  // per-day TPO`}</code></pre>

<h3>タッチとモバイル</h3>
<table>
  <thead><tr><th>ジェスチャー</th><th>操作</th></tr></thead>
  <tbody>
    <tr><td>1 本指でドラッグ（チャート領域）</td><td>スクロール + クロスヘアを移動</td></tr>
    <tr><td>2 本指でピンチ</td><td>中心点を基準に拡大縮小</td></tr>
    <tr><td>長押し（約 500 ms）</td><td>バーに OHLC ツールチップを固定（Alt+クリックのモバイル版）</td></tr>
    <tr><td>価格軸 / 時間軸の帯の中を 1 本指でドラッグ</td><td>対応する軸を拡大縮小</td></tr>
  </tbody>
</table>
<p>
  画面幅が 640 px 未満では、モーダル（設定、ショートカット一覧、コマンドパレット、シンボル検索）が
  自動的にボトムシート形式に切り替わり、つまみ（グラブハンドル）とセーフエリアを考慮した余白が付きます。
</p>

<h3>計測ツール</h3>
<p>
  <kbd>Shift</kbd> を押しながらチャート上をドラッグすると、2 点間のバー数 × 価格差を計測できます。
  オーバーレイには価格の Δ（絶対値と %）、バー数、時間幅が表示されます。マウスを離すとすぐに消え、
  保存される状態には含まれません。
</p>

<h3>イベント</h3>
<p>すべてのイベントは <code>ChartEventMap</code> で型付けされています：</p>
<pre><code>{`chart.on('orderPlace', e => /* OrderPlacePayload */)
chart.on('orderModify', e => /* OrderModifyPayload */)
chart.on('signalMarkerAdd', e => /* { marker } */)
chart.on('tradeZoneAdd', e => /* { zone } */)
chart.on('dataUpdate', e => /* { length } */)
chart.on('ordersChange', e => /* { orders } */)
chart.on('positionsChange', e => /* { positions } */)
chart.on('executionFill', e => /* { side, price, quantity, reason, pnl } */)
chart.on('chartContextMenu', e => /* { area, x, y, price, time } */)
chart.on('stateChange', () => /* 描画、インジケーター、アラート、チャートタイプ、テーマのいずれかが変わった可能性がある */)
chart.on('paneChange', e => /* { instanceId, change: 'collapsed' | 'maximized' | 'order' } */)`}</code></pre>
<p>
  ポインターの位置から得た価格は、<code>chart.roundPrice(price)</code> で市場の価格刻みに合わせられます。
  シンボルの <code>minTick</code> の倍数に、それがなければシンボルの精度に丸めます。ChartWidget のメニューと注文チケットはこれを使っています。
</p>

<h2>ChartWidget</h2>
<p><code>Chart</code> を完全な UI で包みます。同じインスタンスに <code>widget.chart</code> でアクセスできます。</p>

<pre><code>{`import { ChartWidget } from '@tradecanvas/chart/widget'

const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  historyLimit: 500,
  trading: true,
  features: { drawings: true, indicators: true },
  onReady: (chart) => { /* ... */ },
})

widget.chart.setData(...)
widget.destroy()`}</code></pre>

<h3>ウィジェットのキーボードショートカット</h3>
<table>
  <thead><tr><th>ショートカット</th><th>操作</th></tr></thead>
  <tbody>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd></td><td>コマンドパレット（インジケーター、チャートタイプ、描画など）</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>P</kbd></td><td>シンボル検索 — 設定したシンボル一覧からのあいまい検索</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>S</kbd></td><td>レイアウトを保存（初回は名前を尋ねます）</td></tr>
    <tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>時間足（<code>5</code>、<code>15m</code>、<code>1h</code>、<code>1D</code>）を入力して Enter で切り替え（<code>intervalTyping: false</code> で無効）</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>T</kbd> / <kbd>H</kbd> / <kbd>J</kbd> / <kbd>V</kbd> / <kbd>C</kbd> / <kbd>F</kbd></td><td>トレンドライン、水平線、水平半直線、垂直線、十字線、フィボナッチ・リトレースメント</td></tr>
    <tr><td><kbd>?</kbd></td><td>キーボードショートカットの一覧を表示</td></tr>
    <tr><td><kbd>Alt</kbd> + チャートをクリック</td><td>カーソル位置のバーに OHLC ツールチップを固定（ライブのクロスヘアとの差分を表示）</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>ツールチップの固定を解除 / 描画をキャンセル</td></tr>
    <tr><td>ツールバーのシンボルをクリック</td><td>シンボル検索のモーダルを開きます</td></tr>
    <tr><td>ツールバーの再生ボタンをクリック</td><td>バーリプレイのスクラバーを開きます（再生 / ステップ / シーク / 速度）</td></tr>
  </tbody>
</table>
<p>検索対象の一覧は、実行時に <code>widget.setSymbols(['BTCUSDT', 'ETHUSDT', …])</code> で更新できます。</p>

<h3>データウィンドウ</h3>
<p>
  カーソル位置のバーの正確な O/H/L/C/V、バーの変化、すべての有効なインジケーターの値を表示する
  フローティングパネルです。クロスヘアを動かすとリアルタイムに更新されます。コマンドパレット
  （<kbd>Ctrl/⌘ K</kbd> →「データウィンドウの表示切り替え」）から表示を切り替えます。
</p>

<h3>共有できる表示（ディープリンク）</h3>
<p>
  シンボル、時間足、チャートタイプ、価格スケール、インジケーター（パラメーター込み）、描画を含む
  表示全体を、ディープリンク用のコンパクトで URL セーフな文字列にエンコードします。
  <code>shareUrl: true</code> を指定すると、ウィジェットは読み込み時に <code>#tcw=…</code>
  ハッシュから表示を復元し、コマンドパレットの「表示を共有」アクションでリンクをクリップボードにコピーできます。
</p>
<pre><code>{`const widget = new ChartWidget(host, { shareUrl: true })

const token = widget.exportState()      // portable string
await widget.importState(token)         // restore a view
await widget.copyShareLink()            // copy "<url>#tcw=<token>"`}</code></pre>

<h3>名前付きレイアウト</h3>
<p>
  ツールバーのレイアウトボタンで、チャートに名前を付けて保存できます。保存されるのはシンボル、時間足、
  価格スケール、チャートタイプ、インジケーター、描画、アラートです（テーマは閲覧者ごとのものなので含みません）。
  レイアウトを開く、名前を変更する、削除するといった操作は、このボタンのメニューから行います。
  開いているレイアウトは変更のたびに自動保存され、<kbd>Ctrl/⌘ S</kbd> でも保存できます。
  <code>storage</code> を渡さない限り、レイアウトはこのブラウザーの <code>localStorage</code> に保存されます。
  <code>storage</code> は 4 つのメソッドからなり、どれも Promise を返してかまいません。
</p>
<pre><code>{`import { ChartWidget, type LayoutStorage } from '@tradecanvas/chart/widget'

const server: LayoutStorage = {
  list: () => api.get('/layouts'),              // [{ id, name, symbol, timeframe, updatedAt }]
  load: (id) => api.get(\`/layouts/\${id}\`),     // { ...summary, content } または null
  save: (layout) => api.put(\`/layouts/\${layout.id}\`, layout),
  remove: (id) => api.delete(\`/layouts/\${id}\`),
}

const widget = new ChartWidget(host, {
  layouts: { storage: server, autoSave: true, openLast: true },  // 使わない場合は false
})

const layouts = widget.getLayoutSession()!
await layouts.saveAs('Swing BTC')
await layouts.open(id)
layouts.current()          // { id, name, … } または null
layouts.setAutoSave(false)

// 内容だけを取り出して、好きな場所に保存する
const json = widget.getLayoutContent()
await widget.applyLayoutContent(json)`}</code></pre>
<p>
  同梱のストレージは <code>localStorageLayouts(prefix)</code> と <code>memoryLayouts()</code> の 2 つです。
  保存された内容は慎重に読み込まれ、解析できないレイアウトは中途半端に適用されず、拒否されます。
  各レイアウトは自分の <code>kind</code>（<code>'chart'</code> または <code>'grid'</code>）を記録するため、
  ウィジェットとグリッドで 1 つのストレージを共有しても、それぞれ自分のレイアウトだけを一覧に表示します。
  保存、開く、自動保存は 1 つずつ順に実行されるため、保存がその後に開いたレイアウトに書き込まれることはありません。
</p>

<h3>シンボルごとのレイアウト</h3>
<p>
  これとは別に、シンボルごとのインジケーター構成、描画、アラート、チャートタイプを
  <code>localStorage</code> に自動で保存できます：
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT',
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  adapter: new BinanceAdapter(),
  persistLayouts: true,  // or { keyPrefix: 'myapp:', debounceMs: 2000 }
})

// Reset a single symbol's layout
widget.clearSavedLayout('BTCUSDT')`}</code></pre>
<p>
  レイアウトはシンボルの切り替え時とウィジェットの破棄時に書き出されるため、
  ユーザーがページを離れても何も失われません。
</p>

<h3>ドラッグ＆ドロップでのデータ読み込み</h3>
<p>
  CSV または JSON ファイルをチャートにドロップすると、すぐに読み込まれます。既定で有効で、
  <code>dragDropImport: false</code> で無効にできます。パーサーは一般的な列構成
  （<code>time, open, high, low, close, volume</code>）、ISO 8601 形式のタイムスタンプ、
  UNIX 時間の秒 / ミリ秒に対応しています。
</p>
<pre><code>{`// Programmatic use
import { parseOHLCV } from '@tradecanvas/chart'

const { data, rowCount, skipped } = parseOHLCV(csvText)
chart.setData(data)`}</code></pre>

<h3>時間足のリサンプリング</h3>
<p>
  最も細かい解像度の系列を <code>widget.setData()</code> で渡すと、ツールバーの時間足ボタンが
  クライアント側で集計します。1 つのデータセットですべての解像度をまかなうため、再取得は不要です。
  ライブアダプターが接続されていないときに有効で、<code>resampleTimeframes: false</code> で
  無効にできます。週足の区切りは既定で月曜日起点です（日曜日にするには <code>weekStartsOn: 0</code>）。
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  timeframe: '1h',
  timeframes: ['5m', '15m', '1h', '4h', '1d', '1w'],
})
widget.setData(oneMinuteBars)   // base series; clicking 4h/1d/1w resamples it

// Or use the pure function directly
import { resampleOHLCV, inferTimeframeMs } from '@tradecanvas/chart'

const hourly = resampleOHLCV(oneMinuteBars, '1h')   // OHLC merged, volume summed
const fourHour = resampleOHLCV(oneMinuteBars, '4h', { weekStartsOn: 1 })`}</code></pre>
<p>
  区切りはカレンダーを考慮します。日中足と日足は UTC エポックの境界に、週足は設定した週の開始日に、
  月足 / 四半期足 / 年足はカレンダーの境界にそろえます。入力のバーが変更されることはありません。
</p>

<h3>ウォッチリストのサイドバー</h3>
<p>
  設定したすべてのシンボルを、最新価格、変化率（%）、小さなスパークラインとともに表示する
  右側のパネルです（オプトイン）：
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT',
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  adapter: new BinanceAdapter(),
  watchlist: true,
})

// Feed non-active rows from your own data source
widget.setWatchlistEntry('ETHUSDT', {
  lastPrice: 3245.12,
  refPrice: 3180.50,
  sparkline: [3180, 3195, 3210, ...],
})`}</code></pre>

<h3>お気に入りの描画ツール</h3>
<p>
  よく使う描画ツールを、サイドバー上部の帯に固定できます。ツール（グループのフライアウト内でも、
  帯の中でも）を右クリックすると固定 / 固定解除でき、その設定は localStorage に保存されます。
  最初に固定するツールは <code>drawingFavorites</code> で指定します：
</p>
<pre><code>{`new ChartWidget(host, {
  drawingFavorites: ['trendLine', 'horizontalLine', 'fibRetracement', 'rectangle'],
})`}</code></pre>

<h3>描画スタイルとテンプレート</h3>
<p>
  描画サイドバーのパレットボタンで、スタイルのポップオーバーが開きます。次に描く描画（と選択中の描画）の
  色、線の太さ、線のスタイルを選び、名前付きの<strong>テンプレート</strong>として localStorage に
  保存すれば、ワンクリックで再利用できます。プログラムでは次のようにします：
</p>
<pre><code>{`chart.setDrawingStyle({ color: '#e8505b', lineWidth: 2, lineStyle: 'dashed' })
chart.getDrawingStyle()
chart.setSelectedDrawingStyle({ color: '#1fa874' })  // restyle the selected drawing`}</code></pre>

<h3>オブジェクトツリー</h3>
<p>
  ツールバーのレイヤーボタンで、有効なインジケーターと描画をすべて一覧するオブジェクトツリーの
  パネルが開きます。インジケーターは削除でき、描画は項目ごとに表示 / 非表示、ロック / ロック解除、
  設定、削除ができ、グループはその下に所属する描画とともに一覧表示されます。
  既定で有効で、<code>objectTree: false</code> で無効にできます。
  描画の操作は次のメソッドに対応します：
</p>
<pre><code>{`chart.getDrawings()                 // DrawingState[] (id, type, visible, locked)
chart.setDrawingVisible(id, false)  // hide a single drawing
chart.setDrawingLocked(id, true)    // lock it from edits
chart.removeDrawing(id)
chart.groupDrawings(ids, 'Weekly levels')  // まとめて非表示・ロック・選択される
chart.renameDrawingGroup(groupId, 'Old highs')
chart.getActiveIndicators()         // active indicator instances
chart.updateIndicator(instanceId, { period: 50 })  // re-tune params live
chart.removeIndicator(instanceId)`}</code></pre>
<h3>描画の設定とメニュー</h3>
<p>
  描画をダブルクリックするか、オブジェクトツリーの歯車ボタンを使うと、その描画の設定が開きます。
  扱えるのはスタイル、ツール独自の設定（フィボナッチのレベル、延長、ラベルなど）、
  そしてチャートのタイムゾーンで表した各点です。描画を右クリックするとメニューが開き、
  設定、ラインへのアラート、順序、グループ化、ロック、非表示、複製、削除を選べます。
  サイドバーには消しゴム、ズームツール、そしてオフ・弱・強を切り替えられるマグネットもあります。
  土台となる API は
  <a href={href('/docs/drawing-tools')}>描画ツール</a>を参照してください。
</p>

<p>
  各インジケーター行の歯車ボタンで<strong>設定ダイアログ</strong>が開きます。インジケーターの
  パラメーター（数値、切り替え、色）を自動で読み取り、変更を <code>updateIndicator</code> で
  即座に適用します。期間や色を変えるために、削除して追加し直す必要はありません。
</p>
<p>
  オブジェクトツリーの<strong>比較</strong>セクションでは、他のシンボルを正規化したラインとして
  重ねて表示します。ライブアダプターがある場合、+ ボタンでシンボルの選択画面が開き、
  <code>adapter.fetchHistory</code> でそのシンボルの履歴を取得して、パーセントモードで追加します
  （価格帯の異なるシンボルでも 1 本の軸を共有できます）。比較は時間足を変えると自動で再取得されます。
  プログラムでは次のようにします：
</p>
<pre><code>{`widget.addCompareSymbol('ETHUSDT')   // fetches + overlays (needs an adapter)

// or drive the chart directly with your own data
chart.addCompareSymbol('ETHUSDT', 'ETH', ethBars, '#627eea')
chart.setCompareMode('percent')      // 'percent' | 'absolute'
chart.removeCompareSymbol('ETHUSDT')`}</code></pre>

<h3>価格アラート</h3>
<p>
  アラートは価格レベルだけでなく、ラインと別のラインを比較したり（価格が移動平均線をクロスする、MACD がシグナルをクロスする）、
  一定の本数（2〜500 本）以内に一定のパーセント動いたときに発動したり、確定したバーだけを見たり（戻ってくるヒゲでは発動しません）、
  有効期限を設けたりできます。ウィジェットのアラートパネルではこれらすべてを設定でき、コードからは
  <code>addAlert</code> の最後の引数で指定します。アラートは、<code>setCurrentPrice</code> からでも接続中のフィードからでも、
  価格が届くたびに、監視しているラインと合わせてチェックされます：
</p>
<pre><code>{`const ema = chart.addIndicator('ema', { period: 50 })
const rsi = chart.addIndicator('rsi')
chart.addAlert(NaN, 'crossingUp', 'above the 50 EMA', 'price', undefined, { target: \`\${ema}:value\` })
chart.addAlert(NaN, 'movesUp', 'pump', 'price', undefined, { percent: 5, bars: 12 })
chart.addAlert(70, 'greaterThan', 'RSI closed above 70', \`\${rsi}:value\`, 'RSI', { onBarClose: true })
chart.addAlert(64_000, 'crossing', 'today only', 'price', undefined, { expiresAt: Date.now() + 86_400_000 })

chart.on('alertExpired', (e) => e.payload)   // it reached its time without firing
chart.on('alertTriggered', (e) => e.payload)  // { id, condition, channel, target?, percent?, bars?, … }`}</code></pre>
<p>
  ツールバーのベルでフローティングパネルが開き、価格アラートの追加、一覧、削除ができます。
  アラートが発動するとトースト通知が表示されます。アラートのラインは<strong>ドラッグ</strong>もでき、
  チャート上でつかんでスライドさせると価格を変更できます（移動したアラートは再び有効になります）。
  既定で有効で、<code>alerts: false</code> で無効にできます。プログラムからは
  <code>Chart</code> の API と型付きのアラートイベントで操作します：
</p>
<pre><code>{`// Add from code (condition: 'crossing' | 'crossingUp' | 'crossingDown'
//                          | 'greaterThan' | 'lessThan')
const id = chart.addAlert(64200, 'crossingUp', 'breakout')
chart.removeAlert(id)
chart.getAlerts()      // PriceAlert[]
chart.saveAlerts('tcw:alerts:BTCUSDT')   // localStorage persistence
chart.loadAlerts('tcw:alerts:BTCUSDT')

// React to triggers
chart.on('alertTriggered', (e) => {
  console.log('hit', e.payload.price, e.payload.message)
})
// also: 'alertAdd' / 'alertRemove' / 'alertUpdate' (fired on drag)

// Indicator alerts: bind to an indicator line via channel '<instanceId>:<key>'.
// In the widget, the alerts panel's source dropdown lists every active line.
const ema = chart.addIndicator('rsi')
chart.addAlert(70, 'crossingUp', 'RSI overbought', \`\${ema}:rsi\`, 'RSI')`}</code></pre>
<p>
  アラートの発動時に、音やデスクトップ通知を出すこともできます（どちらも既定ではオフ）。
  <code>sound: true</code> で組み込みのビープ音が鳴り、URL を渡せば独自の音を使えます。
  <code>desktop: true</code> は Notification API を使い、初回の使用時に許可を求めます。
</p>
<pre><code>{`new ChartWidget(host, {
  alertNotifications: { sound: true, desktop: true },
})`}</code></pre>

<h3>独自のボタンとメニュー項目</h3>
<p>
  ツールバーにボタン（組み込みのアイコンや独自の要素、テキスト、スイッチ）を、チャートの右クリックメニューに
  項目を追加できます。どちらもウィジェット自身の項目の後ろに並びます。
</p>
<pre><code>{`const news = widget.addToolbarButton({
  id: 'news',
  label: 'News',
  icon: 'bell',            // または <svg> 要素、あるいは text: 'News'
  side: 'right',           // 'left' はチャートの操作ボタンと並ぶ
  toggle: true,
  onClick: () => news?.setActive(togglePanel()),
})
news?.setText('3')
news?.remove()

new ChartWidget(host, {
  chartMenuItems: ({ area, price, time }) => area === 'plot' && price !== undefined
    ? [{ label: \`Copy \${price.toFixed(2)}\`, icon: 'check', onSelect: () => copy(price) }]
    : [],
})`}</code></pre>

<h2>ChartWidgetGrid</h2>
<p>
  複数のチャートウィジェットを並べて表示します。チャートごとにシンボル、時間足、インジケーター、描画を持てます。
  上部のバーで配置を選び、チャートを連動させ、グリッド全体を名前付きレイアウトとして保存できます。
  最後に押したチャートがアクティブなチャート（枠線付き）になります。
</p>
<pre><code>{`import { ChartWidgetGrid } from '@tradecanvas/chart/widget'

const grid = new ChartWidgetGrid(host, {
  layout: '2x2',                                   // '1x1' '1x2' '2x1' '2x2' '1x3' '3x1' '2x3' '3x2'
  widget: { timeframe: '1h' },                    // すべてのチャートに適用
  adapter: () => new BinanceAdapter(),            // チャートごとに 1 つ：アダプターは 1 本のストリームを保持する
  cells: [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT' }, { symbol: 'SOLUSDT' }, { symbol: 'BNBUSDT' }],
  sync: { crosshair: true, time: false, symbol: false, interval: false, drawings: false, replay: false },
})

grid.setLayout('1x2')
grid.setSync({ interval: true })   // ほかのチャートをアクティブなチャートにそろえる
grid.getActiveWidget().getChart()
grid.getLayoutSession()?.saveAs('Majors')

// チャートが作られるたびに（最初と、グリッドが増えたとき）
new ChartWidgetGrid(host, {
  onChartAdd: (widget, index) => widget.getChart().addIndicator('ema', { period: 21 }),
})`}</code></pre>
<p>
  クロスヘアの同期では、ポインター位置の時刻がすべてのチャートに表示されます。時間軸の同期では、
  操作中のチャートに合わせてほかのチャートもスクロール・ズームします。描画は、同じシンボルを表示している
  チャートにコピーされます（オンにすると、それらのチャートの描画がまとめられ、失われるものはありません）。
  リプレイの同期では、リプレイ中のチャートと同じ時刻までほかのチャートもリプレイします（リプレイのステップより
  長いバーのチャートには、その時刻を含むバー全体が表示されます）。
  グリッドが減ったときに外れたチャートはしまわれて保存済みのレイアウトに残り、グリッドが再び増えたときに
  元の状態で戻ります。まったく新しいチャートは、シンボルと時間足が同期されていれば、
  アクティブなチャートのシンボルと時間足で開きます。
</p>

<h2>ChartGrid</h2>
<p>ヘッドレスなチャート（ツールバーなし）を同期させたマルチチャートレイアウトです。完全な UI が必要な場合は <code>ChartWidgetGrid</code> を参照してください。</p>
<pre><code>{`import { ChartGrid } from '@tradecanvas/chart'

const grid = new ChartGrid(host, { layout: '2x2', theme: 'dark' })
// チャートごとにアダプターを 1 つ：アダプターは 1 本のストリームを保持する
await grid.connectAll(() => new BinanceAdapter(), ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'], '5m')
grid.setLayout('1x2')`}</code></pre>

<p>レイアウト：<code>'1x1'</code>、<code>'1x2'</code>、<code>'2x1'</code>、<code>'2x2'</code>、<code>'1x3'</code>、<code>'3x1'</code>、<code>'2x3'</code>、<code>'3x2'</code>。</p>
