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
    <tr><td><code>updateBar(bar)</code></td><td>読み込み済みのバーを修正します。系列のどこにあっても、時刻が同じバーです。表示位置はそのままで、その時刻のバーがなければ false を返します。</td></tr>
    <tr><td><code>getData()</code></td><td>元の OHLC 系列を取得します。</td></tr>
  </tbody>
</table>

<p id="live-price">
  <code>appendBar</code>・<code>appendBars</code>・<code>updateLastBar</code> で渡したバーとティックは現在価格です。価格ライン、アラート、注文の損益は、接続中のストリームや <code>setCurrentPrice</code> と同じようにこれに従います。新しいバーは <code>dataUpdate</code> を送り、形成中のバーへのティックは送りません。
</p>

<p id="corrections">
  フィードが修正したバーは <code>updateBar(bar)</code> で入れます。系列のどこにあっても <code>time</code> が同じ読み込み済みのバーを置き換え、<code>true</code> を返します。インジケーターはそのバーから計算し直され、平均足や練行足などバーから作るチャートの種類も追従し、表示位置はそのままです。次のフレームまでの修正は、いちばん古いものから 1 回だけ計算されます。その時刻の読み込み済みのバーがない場合（新しいバーは <code>appendBar</code>、それより古いバーは <code>prependBars</code> で入れます）や、チャートが受け付けられないバーの場合は <code>false</code> を返し、何も変えません。ライブ価格ではありません。注文もアラートも追従せず、それでアラートが発火することはなく、インジケーターの線のアラートも修正後の値で確かめ直されません。最後のバーを修正すると、<code>setData</code> の後と同じく価格線がその終値に移ります。リプレイ中はライブの系列を修正し、リプレイが終わると表示されます。時間外取引を隠しているあいだ、時間外のバーは表示に戻したときに現れます。読み込み済みと同じバーを送り直しても何も変わりません。出来高がなければ <code>setData</code> と同じく 0 になるので、バーはすべての値を送ってください。<code>dataUpdate</code> を <code>{'{'} kind: 'correction', time, index {'}'}</code> で送ります。ChartWidget では、接続したフィードのバーを <code>widget.getChart().updateBar(bar)</code> で修正します。<code>setData</code> でウィジェットに渡したバーは、ウィジェットが時間足を作り直す元のコピーなので、それへの修正は次に時間足を切り替えるまでしか残りません（そのためのウィジェットのメソッドは今後追加します）。
</p>

<p id="bar-times">
  バーの時刻はエポックのミリ秒または秒で、系列全体で 1 つの単位です。チャートは最新のバーから一度だけ単位を読み取ります：<code>barTimeUnit(data)</code> は 1（ミリ秒、1e11 以上）か 1000（秒）を返します。そのためミリ秒の系列では、1e12 未満となる 2001 年以前の日付も正しく保たれます。1 つの系列は 1 つの単位にしてください。チャートが返す時刻（イベント、<code>getData()</code>）もその単位です。
</p>

<h3>チャートタイプとテーマ</h3>
<table>
  <thead><tr><th>メソッド</th><th>用途</th></tr></thead>
  <tbody>
    <tr><td><code>setChartType(type)</code></td><td>18 種類のいずれか。<a href={href('/docs/chart-types')}>チャートタイプ</a>を参照してください。</td></tr>
    <tr><td><code>getChartType()</code></td><td>現在描画しているチャートタイプ（既定は <code>'candlestick'</code>）。</td></tr>
    <tr><td><code>setTheme(name | theme)</code></td><td>組み込みテーマを切り替えるか、独自のテーマを設定します。<code>getTheme()</code> は設定したとおりに返します。</td></tr>
    <tr><td><code>applyOverrides(patch, {'{ layer }'})</code></td><td>チャートの任意の部分をキーでスタイル設定（<code>'grid.vertical.visible'</code>、<code>'series.candlestick.upColor'</code>…）。<code>null</code> でキーを外します。<a href={href('/docs/styling#overrides')}>スタイル</a>を参照。</td></tr>
    <tr><td><code>setOverrides(overrides, {'{ layer }'})</code> · <code>resetOverrides(keys?, {'{ layer }'})</code></td><td>レイヤーをまるごと置き換え。キー（またはすべて）を外す。</td></tr>
    <tr><td><code>getOverrides({'{ layer }'})</code> · <code>getStyle()</code> · <code>getStyleValue(key)</code></td><td>レイヤーのオーバーライド、解決された見た目、キーの最終的な値。</td></tr>
    <tr><td><code>setTimeframe(tf)</code></td><td>表示中の時間足を切り替え、ライブストリームを接続し直します。</td></tr>
  </tbody>
</table>

<h3>レンダラー</h3>
<table>
  <thead><tr><th>メソッド</th><th>用途</th></tr></thead>
  <tbody>
    <tr><td><code>renderer</code> オプション</td><td><code>'canvas'</code>（既定）、<code>'webgl'</code>、または <code>'auto'</code>（ハードウェア GPU のときだけ WebGL）。</td></tr>
    <tr><td><code>setRenderer(mode)</code></td><td>実行中に切り替えます。実際に描いているレンダラーを返します（WebGL 2 がなければ <code>'canvas'</code>）。</td></tr>
    <tr><td><code>getRenderer()</code></td><td><code>'canvas'</code> または <code>'webgl'</code>。</td></tr>
  </tbody>
</table>
<p>GPU が描くものと計測値：<a href={href('/docs/performance')}>パフォーマンス → WebGL レンダラー</a>。</p>

<h3>インジケーター</h3>
<table>
  <thead><tr><th>メソッド</th><th>用途</th></tr></thead>
  <tbody>
    <tr><td><code>addIndicator(id, params?, position?)</code></td><td>オーバーレイ型またはパネル型のインジケーターを追加し、インスタンス id を返します。</td></tr>
    <tr><td><code>updateIndicator(instanceId, params)</code></td><td>表示中のインジケーターを変更します。</td></tr>
    <tr><td><code>removeIndicator(instanceId)</code></td><td>削除して破棄します。</td></tr>
    <tr><td><code>removeIndicators(instanceIds)</code></td><td>複数をまとめて削除します（元に戻すは 1 回）。</td></tr>
    <tr><td><code>updateIndicatorStyle(instanceId, style)</code></td><td>色、線の太さ、不透明度、そしてプロットごとの線種と表示（<code>plots: {`{ signal: { lineStyle: 'dashed' } }`}</code>）。</td></tr>
    <tr><td><code>setIndicatorDefaults(id, style | null)</code></td><td>これから追加する同じ種類のインジケーターの初期スタイル。</td></tr>
    <tr><td><code>setIndicatorIntervals(instanceId, intervals | null)</code> · <code>getIndicatorIntervals(instanceId)</code></td><td>表示する時間足（<code>{`{ minutes: false, hours: [1, 4] }`}</code>）。<code>null</code> ですべての時間足。レイアウトとともに保存。</td></tr>
    <tr><td><code>setDataTimeframe(timeframe | null)</code></td><td><code>setData</code> で渡したバーの時間足。凡例のタイトル行に表示され、一部の時間足だけに表示するインジケーターはこれに従います。</td></tr>
    <tr><td><code>setPaneStyle(instanceId, {'{ background, separator }'} | null)</code> · <code>getPaneStyle(instanceId)</code></td><td>ペイン独自の見た目。インジケーターとともに保存。</td></tr>
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
  <strong>タイムゾーン。</strong> 時間軸、クロスヘアの時刻、ツールチップ、日の区切り線、期間プリセットは、
  既定ではブラウザーのタイムゾーンに従います。IANA タイムゾーン（夏時間を含む）、UTC から東への
  固定オフセット（分）、または <code>'exchange'</code>（シンボルのタイムゾーン
  <code>SymbolInfo.timeZone</code>、なければ市場のもの）を、<code>timeZone</code> オプション、
  ウィジェットの設定、または直接指定できます：
</p>
<pre><code>{`new Chart(host, { timeZone: 'America/New_York' }) // 最初から

chart.setTimeZone('America/New_York')  // ニューヨーク時間、夏時間を含む
chart.setTimeZone(330)                 // UTC+5:30、分単位
chart.setTimeZone(null)                // ブラウザーのタイムゾーン
chart.setTimeZone('exchange')          // シンボルのタイムゾーン、なければ市場のもの
chart.getTimeZone()                    // 'exchange'、設定したとおり
chart.getEffectiveTimeZone()           // それが指すタイムゾーン：HOSE なら 'Asia/Ho_Chi_Minh'`}</code></pre>
<p>
  チャートのメソッドと型では <code>Intl.DateTimeFormat</code> と同じく <code>timeZone</code> と綴ります。
  従来の名前も動きますが、非推奨です：<code>setTimezone</code>、<code>getTimezone</code>、<code>getEffectiveTimezone</code>、
  <code>getExchangeTimezone</code>、<code>setTimezoneOffset</code>、<code>EXCHANGE_TIMEZONE</code>、
  <code>SymbolInfo.timezone</code>
  （シンボルが両方を持つ場合は <code>timeZone</code> が使われます）。
</p>

<p>同じ操作はプログラムからも行えます：</p>
<pre><code>{`chart.setAutoScale(false)  // freeze the current price range
chart.setLogScale(true)    // switch to logarithmic price scale
chart.setInvertScale(true) // upside down (Alt+I in the widget)
chart.fitContent()         // zoom out to all data (Alt+R in the widget, with auto scale)
chart.scrollToEnd()
chart.setVisibleRangePreset('3M')       // 1D 5D 1M 3M 6M YTD 1Y 5Y All
chart.setMinBarUnit(0.05)               // narrower bars, so 'All' fits a long series (0.25 by default)
chart.goToTime(Date.UTC(2025, 0, 1))    // centre that bar (Alt+G in the widget)
chart.setVisibleRange(from, to)         // the bars between two times, edge to edge (Go to's Custom range)
chart.getVisibleTimeRange()             // { from, to }: the first and last bars on screen, or null`}</code></pre>
<p id="long-ranges">
  <strong>長い期間。</strong>バーの幅は 0.25 px より狭くならないため、それを超える期間（ノート PC での 26 年分の日足）は最新の部分だけが表示されます。ウィジェットでは、レンジバーの長い期間はバーが 1 本 2 px 以上で収まる時間足に切り替わります：5Y の日足は週足に、All は月足に。短い期間では選んだ時間足に戻り、それより細かくはなりません。切り替わるのはデータフィードが提供する（または手元のバーから集計できる）時間足だけです。<code>{`features: { 'statusBar.rangeTimeframe': false }`}</code> で時間足を保ちます。<code>Chart</code> を直接使う場合は <code>minBarUnit</code>（オプション、または <code>setMinBarUnit</code>）で 0.02 px まで狭められ、ピクセル列ごとに描画されます。
</p>

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
  独自の数値表示のままです。書式を指定しなければ、価格は数値のロケールで桁区切りされます。軸の目盛りラベルは
  その刻みに必要な小数桁だけを表示し（73,500）、最新価格、クロスヘア、軸の横のタグはすべての小数桁を表示します。時刻も好きな書式で表示でき、フォーマッターにはそのラベルの種類が渡されます。
</p>
<pre><code>{`new Chart(host, { priceFormat: { denominator: 32 } })                    // 101'16
chart.setPriceFormat({ denominator: 32, subDenominator: 2 })            // 101'165: 16½ 32nds
chart.setPriceFormat((p) => '$' + p.toFixed(2))
chart.setPriceFormat(null)                                              // decimals again

chart.setTimeFormatter((time, { kind, timeZone }) =>
  // kind: 'year', 'month', 'day' (the step a label starts), 'time' (within a day), 'crosshair'
  new Intl.DateTimeFormat('en-GB', { timeZone: timeZone ?? undefined, hour: '2-digit', minute: '2-digit' }).format(time))`}</code></pre>

<h3 id="axis-labels">軸がラベルを選ぶ仕組み</h3>
<p>
  時間軸は最も大きな暦の区切りを始めるバーにラベルを付けます：年（太字）、月、日、きりのよい時刻で、互いに少なくとも 80 px 離れます。そのため 5Y では <code>2022 · Jul · 2023</code>、1 か月では <code>Oct · 8 · 15</code>、1 日の中では <code>12:00 · 18:00</code> と読めます。ラベルは画面ではなくバーに属します：パンするとバーと一緒に動き、前に履歴を読み込んでも位置は変わりません。最も古いバーの左にはありません。月名は <code>setNumberLocale</code> に従い、グリッド線はラベルの位置に引かれます。
</p>
<p>
  価格軸は高さに収まるだけのラベルを、少なくとも 30 px 離して、市場の呼値の単位に置きます。対数軸では刻みが価格とともに大きくなるので、上と同じように下にもラベルが付きます。パーセントや指数の軸では、基準からのきりのよいパーセントや指数ポイントになります。インジケーターのペインも自分の高さでラベル数を決めます。
</p>

<h3>マーケット：呼値の単位、値幅制限、取引セッション</h3>
<p>
  <code>setMarket</code> はチャートに取引所のルールを与えます。ローソク足の色、小数点以下の桁数、呼値の単位
  （価格によって変わることもあります）、当日の上限価格と下限価格、売買単位です。
  <code>roundPrice</code> と <code>getPriceStep</code> は価格が属する価格帯の呼値の単位に従うので、チャートの
  メニューから選んだ価格は常に有効な価格になり、ウィジェットの注文チケットは呼値の単位、当日の値幅、売買単位で注文を
  チェックします。プリセットには取引所の取引セッションとタイムゾーンも含まれ、<code>getCurrentSession</code>
  や独自のコードで使えます。チャートのセッションの塗りつぶしや時間外取引は <code>setSymbolInfo</code> から設定します。プリセットは 2025 年 5 月時点のベトナムの取引所に対応しています。HOSE（価格に応じて 10、50、
  100 ドン刻み、±7%）、その ETF とカバードワラント（10 ドン）、HNX（±10%、引け後のセッションあり）、UPCoM
  （±15%）、VN30 指数先物（0.1 ポイント刻み、±7%、8:45 開始）です。株式の売買単位は 100 株で、上昇は緑、
  下落は赤、上限価格は紫、下限価格はシアン、基準価格は黄色です。価格は株価ボードと同じく 1,000 ドン単位で、
  <code>scaleMarketPrices(preset, 1000)</code> を使うとドン単位の価格を扱えます。
</p>
<pre><code>{`import {
  MARKET_HOSE, scaleMarketPrices, priceStepAt, roundToPriceStep, getCurrentSession,
  vn30fContracts, vn30fLastTradingDay,
} from '@tradecanvas/chart'

chart.setMarket(MARKET_HOSE)                 // 25350 のような価格には scaleMarketPrices(MARKET_HOSE, 1000)
chart.setTimeZone('exchange')                // 時間軸を市場のタイムゾーンに：Asia/Ho_Chi_Minh
chart.setPriceLimits(25.35)                  // 基準価格：前日の終値
chart.getPriceLimits()                       // { ceiling: 27.1, floor: 23.6, reference: 25.35 }
chart.roundPrice(25.37)                      // 25.35（50 ドン刻み）
chart.getPriceStep(9.5)                      // 10,000 ドン未満は 0.01

// ルールを単体で使う
priceStepAt(25.35, MARKET_HOSE)              // 0.05
roundToPriceStep(10.486, MARKET_HOSE, 'down') // 10.45
getCurrentSession(MARKET_HOSE.sessions, Date.now(), MARKET_HOSE.timeZone) // { name: 'ATC', type: 'preClose', … }、時刻だけで判定

// VN30 先物：上場中の 4 限月とその最終取引日
vn30fContracts(Date.now())                   // [{ symbol: 'VN30F2611', lastTradingDay: '2026-11-19', … }, …]
vn30fLastTradingDay(2026, 12, (day) => holidays.has(day)) // 第 3 木曜日。祝日なら前倒し`}</code></pre>
<p>
  独自のマーケットは <code>MarketConfig</code> です。<code>priceStep</code>（価格帯ごとなら
  <code>priceSteps: [{'{'} from, step {'}'}]</code>）、<code>priceLimits</code>、
  <code>volumeUnit</code>（売買単位）、<code>sessions</code>、<code>timeZone</code>、
  <code>colorScheme</code> を指定します。シンボル自身の <code>minTick</code> はマーケットの呼値の単位より優先されます。
  取引所のルールは随時変わるため、プリセットに頼る前に、その取引所の現行ルールと照らし合わせてください。
</p>

<h3 id="comparing-symbols">シンボルの比較</h3>
<p>
  別のシンボルの変化率を価格スケール上に表示する（<code>addCompareSymbol</code>）ほか、その価格を専用の
  スケールや専用のペインに表示したり、チャートの終値とのスプレッドや比率を表示したりできます。後者は
  インジケーター（<code>compareSymbol</code>、<code>spread</code>）なので、ほかのインジケーターと同じく
  凡例、値ラベル、アラートを持ち、レイアウトにも保存されます。もう一方のシンボルのバーは時刻でチャートのバーに
  揃えられます。チャートは必要なバーを要求するので、時間足を変えたら改めて渡してください。<code>correlation</code>（終値）と
  <code>correlationlog</code>（バーごとのリターン）も同じようにもう一方のシンボルを読み、−1 から 1 の値を取ります。
</p>
<pre><code>{`chart.addCompareSymbol('eth', 'ETHUSDT', ethBars, '#7c4dff')   // percent change, on this scale
chart.addIndicator('compareSymbol', { symbol: 'ETHUSDT' }, 'bottom', { scale: 'left' })  // own scale
chart.addIndicator('spread', { symbol: 'ETHUSDT', mode: 'ratio' })                      // own pane
chart.addIndicator('correlation', { symbol: 'ETHUSDT', length: 20 })                    // −1 to 1, own pane

chart.on('symbolSeriesRequest', async ({ payload }) =>
  chart.setSymbolSeries(payload.symbol, await adapter.fetchHistory(payload.symbol, '1h', 1000)))
chart.getRequiredSymbols()                           // what to fetch again on a new interval
chart.setPaneScale(spreadId, { percent: true })     // a pane in percent of its first value`}</code></pre>
<p>
  変化率の比較ラインは、画面上の最初のバーにおけるメインの終値、つまりパーセントスケールが 0% と読む価格から始まり、
  もう一方のシンボル自身の画面上の最初のバーから数えます。バーの始まりが遅いシンボルも 0% から始まります。
  価格スケールをパーセントにすると（<code>chart.setScaleMode('percentage')</code>）、各ラインは画面上の最初のバーからの
  自身の変化率をそのまま示し、パンすると変わります。ラインのラベルはラインの終端にあります。
  <code>chart.getCompareValues(barIndex?)</code> は、独自の凡例のために、あるバー（既定は最後のバー）での各ラインの値を返します：<code>{'{'} id, label, color, visible, close, change, stale {'}'}</code>。
  <code>close</code> はそのバーまたはそれ以前のもう一方のシンボルの終値、<code>change</code> はラインが示すとおりの変化率（%）です。
  もう一方のシンボルの最後のバーを過ぎると（バーを一度だけ取得し、チャートが更新を続けている場合）、最後の終値を
  <code>stale: true</code> 付きで返します。<code>chart.setCompareVisible(id, false)</code> はラインを隠し、自動スケールから外します。
</p>
<pre><code>{`chart.setScaleMode('percentage')       // each line reads its change on the axis
chart.getCompareValues()               // [{ id: 'eth', label: 'ETHUSDT', color, visible, close: 2650.4, change: -1.82, stale: false }]
chart.getCompareValues(barIndex)       // at a bar: the one under the cursor
chart.setCompareVisible('eth', false)  // hidden, and out of the auto scale`}</code></pre>
<p>
  ChartWidget では、ツールバーの比較（とオブジェクトツリーの +）で比較ダイアログが開きます。シンボルを検索し、
  <strong>追加方法</strong>で表示方法（変化率、専用スケール、専用サブチャート、スプレッド、比率、価格またはリターンの相関）を
  選んで、いくつでも追加できます。比較中のシンボルは先頭に並び、それぞれに表示方法と、外すためのボタンが付きます。
  次に開いたときは、前回使った表示方法が選ばれています。
</p>
<p>
  ChartWidget は、シンボルを変化率で比較している間は価格スケールをパーセントにし、最後の比較を外すと元のスケールに戻します。
  対数、パーセント、100 基準のスケールはそのままです。比較中に選んだスケール（ステータスバーの % や log、チャートのメニュー、設定）は、
  最後の比較を外した後も保たれます。このパーセントスケールは保存されません。レイアウトと共有リンクにはご自身のスケールが残ります。
  凡例はインジケーターの上に、変化率で比較中の各シンボルを、価格とカーソル位置のバー（それ以外は最後のバー）での変化率、
  隠すための目のボタン、外すためのボタンとともに並べます。そのバーはチャートと同じ深さまで取得され、チャートが過去のバーを
  読み込むと再取得されるので、ラインはチャートと同じ位置から始まります。
</p>

<h3>データのエクスポート</h3>
<p>
  バーを CSV または JSON で書き出します。インジケーターのラインはそれぞれ独立した列になり、列名は凡例での
  名前と同じです。ChartWidget では、チャートの右クリックメニューに<strong>データをエクスポート (CSV)</strong>があります。
  小数を含む数値は有効数字 15 桁で書き出されるため、より小さいバーから合算した出来高は
  40.370000000000005 ではなく 40.37 になります。
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
  <strong>時間外取引。</strong>オフにすると、シンボルの通常取引時間（その <code>timeZone</code> での
  <code>SymbolInfo.sessions</code>）の外にあるバーがチャートから外れます。外れたバーはライブのバーや履歴のページも
  含めて取り置かれ、オンに戻すと再び表示されます。日足以上のバーはそのままです。
</p>
<pre><code>{`chart.setSymbolInfo({ symbol: 'AAPL', timeZone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] })
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
    <tr><td>タップ</td><td>クリック：<code>click</code>、<code>barClick</code>、シグナルマーカー。描画の上なら選択</td></tr>
    <tr><td>ダブルタップ</td><td>ダブルクリック：軸の上ならリセット、描画の上なら設定を開く</td></tr>
    <tr><td>描画の上を 1 本指でドラッグ</td><td>移動。選択中の描画はハンドルで形を変更</td></tr>
    <tr><td>描画ツール選択中：タップ、タップ — または押して、ドラッグして、離す</td><td>点を置く。押してドラッグして離すと 2 点の線を一度に描画</td></tr>
    <tr><td>描画の上で長押し</td><td>そのメニュー（右クリックと同じ）</td></tr>
    <tr><td>アラート・注文・ブラケットの線やペインの境界を 1 本指でドラッグ</td><td>それをドラッグ</td></tr>
  </tbody>
</table>
<p>
  指はマウスより遠くまで届きます：線まで約 16 px、ハンドルまで約 22 px（マウスは 8 px）。スクロールするページでは、<code>pageScroll: true</code> で縦のスワイプと通常のマウスホイールをページに任せます。チャートは横スワイプでスクロールし、2 本指または Ctrl + ホイール（トラックパッドのピンチ）でズームします。描画・線・軸への操作はチャートのままです。<code>chart.setPageScroll(on)</code> で実行中に切り替えられます。
</p>
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
chart.on('dataUpdate', e => /* setData と新しいバーでは { kind: 'bars', length }、バーの修正では { kind: 'correction', time, index }、ほかに kind 'alert' | 'bracket' | 'connection' | 'error' */)
chart.on('ordersChange', e => /* { orders } */)
chart.on('positionsChange', e => /* { positions } */)
chart.on('executionFill', e => /* { side, price, quantity, reason, pnl } */)
chart.on('chartContextMenu', e => /* { area, x, y, price, time } */)
chart.on('stateChange', () => /* 描画、インジケーター、アラート、チャートタイプ、テーマのいずれかが変わった可能性がある */)
chart.on('paneChange', e => /* { instanceId, change: 'collapsed' | 'maximized' | 'order' } */)
chart.on('chartTypeChange', e => /* { type, previous } */)
chart.on('symbolChange', e => /* { symbol, previous } */)
chart.on('marketChange', e => /* { market }: setMarket */)
chart.on('timeframeChange', e => /* { timeframe, previous } */)
chart.on('historyChange', e => /* { canUndo, canRedo } */)
chart.on('drawingSelect', e => /* { ids, primary } */)
chart.on('rendererChange', e => /* { renderer: 'canvas' | 'webgl', reason?: 'unsupported' | 'contextLost' | 'contextRestored' | 'limit' } */)`}</code></pre>

<h3>独自の変更を元に戻す</h3>
<p>
  <code>recordUndo</code> は、あなたの変更を描画やインジケーターと同じチャートの取り消し履歴に加えます。Ctrl/Cmd+Z で
  <code>undo</code> が、やり直しで <code>redo</code> が呼ばれます。同じ <code>subject</code> に対して続けて行った変更は
  1 ステップにまとまります。ChartWidget も設定とチャートタイプをこの方法で記録しています。
</p>
<pre><code>{`const before = panel.color
panel.color = 'red'
chart.recordUndo({ subject: 'panel-color', undo: () => (panel.color = before), redo: () => (panel.color = 'red') })`}</code></pre>

<h3>キーボードとスクリーンリーダー</h3>
<p>
  フォーカスのあるチャートは、矢印キーでスクロール（Shift で 10 本ずつ）、↑/↓ または +/− でズームし、Home と End で
  先頭と末尾へ移動します。スクリーンリーダーに対しては、概要（シンボル、タイプ、時間足、現在値）を持つアプリケーションです。
  キーで表示を動かすと画面に映っている内容を伝え、カンマとピリオドでバーを 1 本ずつ読み上げます。<code>a11y.labels</code>
  でこれらを自分の言語にでき、<code>a11y: false</code> で無効にできます。<code>scrollBars(n)</code> と
  <code>selectDrawing(id)</code> は、キー操作やクリックと同じことをコードから行います。
</p>
<pre><code>{`new Chart(host, { a11y: { labels: { role: 'gráfico', summary: '{what}. Último precio {close}.' } } })`}</code></pre>
<p>
  ポインターの位置から得た価格は、<code>chart.roundPrice(price)</code> で市場の価格刻みに合わせられます。
  シンボルの <code>minTick</code> の倍数に、それがなければシンボルの精度に丸めます。ChartWidget のメニュー、注文チケット、描画設定の Coordinates タブはこれを使っています。
  <code>chart.getPriceStep()</code> はその刻みそのものを返します。
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
  features: { 'toolbar.replay': false },   // ウィジェットのスイッチ：「カスタマイズ」を参照
  onReady: (chart, widget) => { /* once built, just after new ChartWidget() returns */ },
})

widget.chart.setData(...)
widget.destroy()`}</code></pre>

<h3 id="bars">各バー</h3>
<table>
  <thead><tr><th>バー</th><th>中身</th></tr></thead>
  <tbody>
    <tr><td>ツールバー</td><td>
      シンボルとその情報。時間足（固定したものはボタンとして並び、すべての時間足を単位ごとに分から月まで並べたメニューもあって、
      各項目の星で固定できます）。アイコンで示すチャートタイプ。インジケーター（ダイアログ。<a href={href('/docs/indicators')}>インジケーター</a>を参照）、データアダプターがあれば比較。元に戻すとやり直し。右側には、レイアウト、
      バーリプレイ、取引メニュー（新規注文、ロングとショートのブラケット注文、板情報、口座パネル）、
      続いてスクリーンショット、設定、テーマ、全画面があり、レールがない場合（スマートフォン、または
      <code>{`features: { dock: false }`}</code>）はアラートとオブジェクトツリーもあります。収まらないものは「その他」の中にまとめられます。
    </td></tr>
    <tr><td>描画ツール</td><td>
      各グループのメニューにはツールのショートカット（Alt+T でトレンドライン）が書かれ、各行の星でそのツールを上部に固定できます。
      下部には、描画スタイル、マグネット、消しゴム、範囲ズーム、描画モードの維持、すべてロック、すべて非表示、すべて消去があります。
    </td></tr>
    <tr><td>ステータスバー</td><td>
      表示期間のプリセットと日付へ移動。市場の状態、接続、表示タイムゾーンの時計（クリックすると選べるタイムゾーンの一覧が開きます）、
      価格スケールの <code>%</code> · <code>log</code> · <code>auto</code> の切り替え。
    </td></tr>
    <tr><td>選択した描画の上</td><td>
      色、線の太さと線種、設定、アラート、ロック、その他、削除。ツールバーをグリップでドラッグすると、次の描画でもその位置に
      留まります。グリップをダブルクリックすると描画の上に戻ります。
    </td></tr>
    <tr><td>ドック</td><td>
      外側の端にあるレールで、パネルごとにボタンがあります：ウォッチリスト、アラート、オブジェクトツリー、
      データウィンドウ、シンボル情報。<a href="#dock">ドック</a>を参照。
    </td></tr>
  </tbody>
</table>

<h3 id="dock">ドック</h3>
<p>
  ウィジェットのパネルはチャートの横に一度に 1 つずつ表示され、外側の端にあるレールから開きます（左右反転したウィジェットでは
  左側）。レールのボタンを押すとそのパネルが開き、すでに開いているパネルなら閉じます。各パネルの閉じるボタンでも閉じられます。
  パネルが自動で開くことはありません。開くまでチャートが場所を使います
  （コードからは <code>widget.openPanel('watchlist')</code> で開けます）。パネルの端を
  ドラッグするか、端で矢印キーを使うと、幅を 233〜377 px（初期値は 296）に変えられ、このブラウザーに保存されます。
  パネルが行の 38.2% を超えることはなく、残りはチャートのものです。
</p>
<p>
  スマートフォン、または幅が 641 px 未満のウィジェットにはレールがありません。パネルは下からチャートの上にせり上がり、
  最初は閉じていて、Escape で閉じます。ウィジェットが狭くなると（タブレットを回転したときなど）、開いていたパネルは閉じます。その場合、アラートとオブジェクトツリーはツールバーから、シンボル情報はシンボルの横の
  <strong>ⓘ</strong> から開き、どのパネルも自分のコードから開けます。<code>ChartWidgetGrid</code> のチャートには
  それぞれのレールはありません。ただし、その <code>widget.features</code> で <code>dock</code> をオンにすれば表示されます。
</p>
<pre><code>{`widget.openPanel('watchlist')   // 'watchlist' | 'alerts' | 'objectTree' | 'dataWindow' | 'symbolInfo' | 'depthLadder'; false if not there
widget.getOpenPanel()           // the panel open, or null
widget.closePanel()

new ChartWidget(host, { features: { dock: false } })              // no rail: the toolbar opens the panels
new ChartWidget(host, { features: { 'dock.dataWindow': false } })  // no button for the data window`}</code></pre>

<h3 id="search-dialogs">シンボル検索、比較、移動</h3>
<p>
  <strong>シンボル検索</strong>は、ツールバーのシンボル、<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>P</kbd>、
  またはチャート上での文字の入力で開き、入力した文字から検索が始まります。何も入力していないうちは <code>symbols</code> の一覧を表示し、
  入力すると、入力が止まるたびにフィードの検索（<code>searchSymbols</code>、またはアダプターの検索）に問い合わせます。シンボル、
  名称、種類、取引所が列に並び、チャートのシンボルには印が付きます。結果に複数の種類（たとえば株式と暗号資産）があれば、
  1 つに絞り込めます。検索で分かった名称は、開いたときの一覧にも残ります。
  <code>{`features: { symbolTyping: false }`}</code> にすると、チャート上で文字を入力しても開かなくなります。
</p>
<p>
  <strong>比較</strong>は同じダイアログで、検索欄の下に<strong>追加方法</strong>があり、比較中のシンボルが先頭に並びます
  （<a href="#comparing-symbols">シンボルの比較</a>を参照）。
</p>
<p>
  <strong>移動</strong>（ステータスバーのカレンダー、<kbd>Alt</kbd>+<kbd>G</kbd>、またはチャートのメニュー）には 2 つのタブがあります。
  <strong>日付</strong>は指定した日時のバーを中央に表示し、<strong>期間を指定</strong>は 2 つの日時のあいだのバーを端から端まで表示します。
  初期値は画面に表示中の範囲です。入力欄の下の月カレンダーは編集中の日付欄に入り、期間の開始を選ぶと終了に移ります。
  日足以上では時刻の入力はなく、今日より後の日は選べません。日付と時刻は表示タイムゾーンで解釈されます。
</p>

<h3>ウィジェットのキーボードショートカット</h3>
<table>
  <thead><tr><th>ショートカット</th><th>操作</th></tr></thead>
  <tbody>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd></td><td>コマンドパレット：ウィジェットのコマンドとそのショートカット（移動、表示のリセット、レイアウトの保存、各パネルなど）、描画ツール、チャートタイプ、時間足、インジケーター。最近使ったものが先頭に並びます</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>P</kbd></td><td>シンボル検索：設定したシンボル、または入力に応じたフィードの検索</td></tr>
    <tr><td><kbd>A</kbd>–<kbd>Z</kbd></td><td>入力した文字からシンボルを検索（<code>{`features: { symbolTyping: false }`}</code> で無効）</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>S</kbd></td><td>レイアウトを保存（初回は名前を尋ねます）</td></tr>
    <tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>時間足（<code>5</code>、<code>15m</code>、<code>1h</code>、<code>1D</code>）を入力して Enter で切り替え（<code>intervalTyping: false</code> で無効）</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>T</kbd> / <kbd>H</kbd> / <kbd>J</kbd> / <kbd>V</kbd> / <kbd>C</kbd> / <kbd>F</kbd></td><td>トレンドライン、水平線、水平半直線、垂直線、十字線、フィボナッチ・リトレースメント</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>R</kbd></td><td>表示をリセット：すべてのバーを表示し、価格スケールをそれに合わせます</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>I</kbd></td><td>価格スケールを反転</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>G</kbd></td><td>日付へ移動</td></tr>
    <tr><td><kbd>?</kbd></td><td>キーボードショートカットの一覧。機能名でもキーでも検索できます</td></tr>
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
  シンボル、時間足、チャートタイプ、価格スケール、インジケーター（パラメーター込み）、描画、
  そして既定から変えたチャート設定（タイムゾーンと数値の書式を除く）を含む表示全体を、
  ディープリンク用のコンパクトで URL セーフな文字列にエンコードします。
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
  価格スケール、チャートタイプ、インジケーター、描画、アラート、<a href="#chart-settings">チャート設定</a>です
  （テーマ、タイムゾーン、数値の書式は閲覧者ごとのものなので含みません）。
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

<h3 id="chart-settings">チャート設定</h3>
<p>
  設定ダイアログのスイッチと選択肢（出来高プロファイルとマーケットプロファイル、スイングマーカー、
  セッションの網掛け、前期間の水準、グリッド、凡例、十字線、価格スケール、タイムゾーン、数値の書式）が
  ウィジェットのチャート設定です。<code>getSettings()</code> で読み取り（コピーが返ります）、
  <code>setSettings(patch)</code> で一部を変更します。読み取れないものは捨て、数値はダイアログの範囲に収め、
  元に戻す履歴には記録しません。変更は <code>onSettingsChange(listener)</code> で受け取れ、
  止めるための関数が返ります。ダイアログを OK で閉じたときに 1 回呼ばれ、キャンセルや何も変わらない変更では
  呼ばれません。<code>persistSettings: true</code> を指定すると、ウィジェットはこのブラウザーに設定を保存し、
  次に開いたときに元に戻します。
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  chartOptions: { timeZone: 'UTC' },
  persistSettings: true,            // または { key: 'myapp:settings' }
})

widget.setSettings({ volumeProfileVisible: true, timezone: 'exchange' })
widget.getSettings().timezone       // 'exchange'

const stop = widget.onSettingsChange((settings) => {
  api.put('/me/chart-settings', settings)   // たとえば自分のサーバーに
})
stop()`}</code></pre>
<ul>
  <li><strong>persistSettings</strong> は、ユーザーがあなたの値から変えた分をブラウザーごとに保存します。
    保存された値は <code>chartOptions</code> より優先され、リセットするとあなたの値に戻ります。
    対数スケールと自動スケールのフラグ、チャートタイプ固有の設定（練行足のボックスなど）はチャートの状態なので
    保存しません。ページ上のウィジェットにはそれぞれ別の <code>key</code> を付けてください。
    グリッドは各チャートに自動で付けます。変更を誰がしたかは区別しません。あなたが <code>setSettings</code> で
    設定した値（たとえば <code>onReady</code> の中で）や、開いた共有リンクやレイアウトが持ち込んだ設定もユーザーの選択として保存され、
    コードがもう設定しなくなった後も、次の訪問で <code>chartOptions</code> より優先されます。
    ある設定を <code>chartOptions</code> の値に戻すと、保存の対象から外れます。</li>
  <li><strong>名前付きレイアウト</strong> は、タイムゾーンと数値の書式（閲覧者ごとのもの）と、
    価格軸をドラッグすると切れる自動スケールを除くすべてを保存します。レイアウトの JSON では <code>settings</code> の下に入りますが、
    価格スケールとその反転はそれぞれ専用のフィールドに、チャートタイプ固有の設定はチャートの状態に入ります。
    これより前に保存したレイアウトには含まれず、開いても設定はそのままです。
    古いバージョンのライブラリーは新しいレイアウトをこれらなしで開き、その自動保存はこれらを含まずに書き戻します。</li>
  <li><strong>共有リンク</strong> は、送り手が既定から変えた設定を運びます。タイムゾーン、数値の書式、自動スケールは含みません。
    リンクのチャートタイプ固有の設定は送り手が設定したタイプだけに効き、閲覧者のほかのタイプの設定はそのまま残ります。
    あなたの <code>features</code> が初期状態を決めるスイッチ（凡例、出来高、バーの残り時間、インジケーターの値ラベル）は
    <code>features</code> が置いた状態を既定とするので、送り手のアプリが切ったスイッチは変更として送られません。</li>
  <li><strong>切られた機能</strong>：あなたの <code>features</code> が凡例、出来高、バーの残り時間、対数スケールを切っている場合、
    保存・共有・オープン・設定・チャートテンプレートの適用のどれによってもそれらはオンになりません。</li>
  <li><strong>シンボルごとのレイアウト</strong>（<code>persistLayouts</code>）と
    <code>chart.saveState()</code> には、チャートの状態の一部であるチャートタイプ固有の設定だけが含まれ、ほかの設定は含まれません。</li>
</ul>

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
  ユーザーがページを離れても何も失われません。チャート設定のうち含まれるのは
  チャートタイプ固有の設定だけで、ほかは <code>persistSettings</code> が保存します。
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

// Or build bars yourself
import { resampleBars, timeframeBucketStart } from '@tradecanvas/chart'

const hourly = resampleBars(oneMinuteBars, '1h')   // OHLC merged, volume summed
const days = resampleBars(oneMinuteBars, '1d', { timeZone: 'Asia/Ho_Chi_Minh' })   // from 00:00 there
const dayStart = timeframeBucketStart(trade.time, '1d', { timeZone: 'Asia/Ho_Chi_Minh' })`}</code></pre>
<p>
  区切りはカレンダーを考慮します。分足と時間足（1h 以下）は Unix エポックからの時間足の倍数に切り捨てます。
  日足、週足（設定した週の開始日から）、月足、四半期足、年足は取引所の午前 0 時に始まり、1 日を割り切る時間足
  （2h、3h、4h、6h、8h、12h）も同じです。<code>widget.setData</code> に渡したバーでは、基準は銘柄の
  <code>timeZone</code>（<code>setSymbolInfo</code>）、なければ市場のもの（<code>setMarket</code>）、それもなければ UTC です。
  フィードにない時間足は、その <code>resolveSymbol</code> が示すタイムゾーンの午前 0 時、なければ UTC の午前 0 時に始まり、市場のタイムゾーンでは動きません。
  時計が切り替わる日は 23 時間または 25 時間になります。00:00 UTC のタイムスタンプを持つ日足はそれが示す日付として扱うので、
  UTC より西でも月曜日は自分の週に入り、週足は 00:00 UTC のタイムスタンプを保ちます。入力のバーが変更されることはありません。
</p>
<p>
  日足は、チャートがどのタイムゾーンで表示していても、そのバーが表す日付を示します。00:00 UTC のバーは UTC の日付、
  取引所の午前 0 時から作ったバーは取引所の日付です（時間軸、クロスヘアとそのカードで）。自分でバーを作るときは、
  <code>timeframeBucketStart(time, timeframe, {'{'} timeZone {'}'})</code> がある時刻を含むバーの開始時刻を返します。
</p>

<h3>ウォッチリスト</h3>
<p>
  ドックのパネルの 1 つで、シンボルのリストを並べ、各行に最新価格、変化率（%）、スパークラインを表示します。リストの切り替え、
  作成、名前の変更、削除はパネルのメニューから行います。シンボルはシンボル検索（+）から追加し、削除でき、ドラッグか
  Alt+↑/↓ で並べ替えられます。各行のクオートは、アダプターの <code>subscribeQuotes</code>、独自のクオートソース、
  または自分で送った値から取ります。
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  adapter: new BinanceAdapter(),               // its quotes fill the rows
  watchlist: {
    lists: [
      { id: 'majors', name: 'Majors', symbols: ['BTCUSDT', 'ETHUSDT'] },
      { id: 'alts', name: 'Alts', symbols: ['SOLUSDT', 'ADAUSDT'] },
    ],
    persist: true,                             // kept in this browser
    onChange: (lists, active) => save(lists),  // or keep them yourself
  },
})

widget.addToWatchlist('BNBUSDT', 'alts')
widget.setActiveWatchlist('alts')
widget.setQuotes([{ symbol: 'AAPL', last: 190.2, prevClose: 188.1 }])   // from your own feed
widget.getQuote('AAPL')`}</code></pre>
<p>
  <code>watchlist: true</code> はこれまでどおり <code>symbols</code> の 1 つのリストを表示します。<code>setWatchlistEntry</code>
  でも引き続き行の価格、変化、スパークラインを送れます。
</p>

<h3>シンボル情報</h3>
<p>
  ドックのパネルの 1 つで、シンボルの横の ⓘ、レール、またはコマンドパレットから開きます。シンボルの名称、最新価格と変化、次の取引開始または
  終了までのカウントダウン付きの市場の状態、当日の始値、値幅、出来高、前日終値、買気配と売気配、呼値の単位、通貨、
  タイムゾーンと取引時間、ニュースを表示します。市場が閉まっているときはステータスバーにも表示されます。
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'AAPL',
  news: (symbol, limit) => api.headlines(symbol, limit),   // or the adapter's fetchNews
})
widget.toggleSymbolInfo(true)`}</code></pre>

<h3>ナビゲーション、元に戻す、表示方向</h3>
<p>
  チャート上のボタン — 縮小と拡大、過去と未来へのスクロール（押し続けると動き続けます）、リセット — は、マウスが
  データの邪魔にならない描画領域の下端近くにあるとき、またはいずれかのボタンにフォーカスがあるときに表示されます
  （<code>navigation: false</code> で非表示）。設定の変更とチャートタイプの変更は、
  描画やインジケーターと同じく Ctrl/Cmd+Z で元に戻せます。アラビア語、ヘブライ語、ペルシア語、ウルドゥー語では
  ウィジェットが左右反転します（<code>dir: 'auto'</code>、または <code>'rtl'</code> / <code>'ltr'</code>）。
  チャートの時間は左から右へ進んだままです。
</p>

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
  レールのレイヤーボタン（レールがない場合はツールバーのもの）で、有効なインジケーター（チップと同じ名前、例：EMA 20、Compare ETHUSDT）と描画をすべて一覧する
  オブジェクトツリーがドックに開きます。インジケーターは削除でき、描画は項目ごとに表示 / 非表示、ロック / ロック解除、
  設定、削除ができ、グループはその下に所属する描画とともに一覧表示されます。
  既定で有効で、<code>objectTree: false</code> で無効にできます。
  描画の操作は次のメソッドに対応します：
</p>
<pre><code>{`chart.getDrawings()                 // DrawingState[] (id, type, visible, locked, intervals)
chart.setDrawingVisible(id, false)  // hide a single drawing
chart.isDrawingShown(id)            // 非表示ではなく、この時間足で表示される
chart.setDrawingLocked(id, true)    // lock it from edits
chart.removeDrawing(id)
chart.groupDrawings(ids, 'Weekly levels')  // まとめて非表示・ロック・選択される
chart.renameDrawingGroup(groupId, 'Old highs')
chart.getActiveIndicators()         // active indicator instances
chart.updateIndicator(instanceId, { period: 50 })  // re-tune params live
chart.removeIndicator(instanceId)`}</code></pre>
<h3>描画の設定とメニュー</h3>
<p>
  描画をダブルクリックするか、オブジェクトツリーの歯車ボタンを使うと、その描画の設定がタブに分かれて開きます。
  タブは、スタイル（ライン、線端、塗りつぶし、そしてフィボナッチのレベル、延長、ラベルなどのツール独自の設定）、
  文字を書くツールのテキスト、座標（チャートのタイムゾーンで表した各点）、表示（描画を表示する時間足）で、
  下部にはテンプレートメニュー、キャンセル、OK があります。描画を右クリックするとメニューが開き、
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
  オブジェクトツリーの<strong>比較</strong>セクションには、比較ダイアログと同じくすべての比較が並びます。
  各シンボルに比較方法（変化率、専用スケール、専用サブチャート、スプレッド、比率、相関）と、外すためのボタンが付きます。
  ライブアダプターがある場合、その + ボタンで比較ダイアログが開きます。どの方法でも、ウィジェットは比較を追加する前に
  <code>adapter.fetchHistory</code> で相手シンボルのバーを取得し、バーが届かない場合（取得の失敗、またはこの時間足にバーがない場合）は
  何も追加せず、理由をトーストで知らせます。保存した状態から戻った比較は、バーの読み込みに失敗してもチャートに残り、
  バーのある時間足で表示されます。比較は時間足を変えると自動で再取得されます。
  プログラムでは次のようにします：
</p>
<pre><code>{`widget.addCompareSymbol('ETHUSDT')   // fetches + overlays (needs an adapter)
await widget.addCompareSymbol('ETHUSDT', 'scale')  // its bars first; nothing added if they don't come

// or drive the chart directly with your own data
chart.addCompareSymbol('ETHUSDT', 'ETH', ethBars, '#627eea')
chart.setCompareMode('percent')      // 'percent' | 'absolute'
chart.setScaleMode('percentage')     // each line's change, read on the axis
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

<h3>機能スイッチ</h3>
<p>132 個のスイッチがあり、オフにするまではすべてオンです。ドットのない名前は機能まるごとで、現れるすべての場所でオフになり、ドットのある名前は一か所です。ウィジェットの動作中に切り替えられます。全一覧と対応する従来のオプションは<a href={href('/docs/customization')}>カスタマイズ</a>にあります。</p>
<pre><code>{`new ChartWidget(host, { features: { 'toolbar.replay': false, 'sidebar.patterns': false, hotkeys: false } })   // ボタン一つ、描画ツールのグループ一つ、すべてのキー操作

widget.setFeatures({ sidebar: false, statusBar: false })
widget.isFeatureOn('sidebar')    // false
widget.getFeatures()             // すべてのスイッチのオン・オフ`}</code></pre>

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
<p>ほかにも、ツールバーのメニューボタン、描画サイドバーのボタン、ステータスバーの項目、各バーとチャート上の独自の場所、描画やインジケーターのメニュー末尾の項目があります（<a href={href('/docs/customization#parts')}>カスタマイズ</a>を参照）：</p>
<pre><code>{`widget.addToolbarDropdown({ id: 'scans', label: 'Scans', icon: 'layers', items: () => [...] })   // 開くたびに取得
widget.addSidebarButton({ id: 'ruler', label: 'Ruler', icon: 'ruler', toggle: true, onClick })
widget.addStatusBarItem({ id: 'latency', text: '12 ms', label: 'Latency' })
widget.getSlot('chart')          // チャート上のレイヤー
widget.addHotkey({ keys: 'Alt+N', label: 'New note', onPress })   // 独自のショートカット。同じキーのウィジェットのショートカットを置き換えます

new ChartWidget(host, {
  drawingMenuItems: ({ id, type }) => [{ label: 'Share', onSelect: () => share(id) }],
  indicatorMenuItems: ({ instanceId, indicatorId }) => [{ label: 'Explain', onSelect: () => explain(indicatorId) }],
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
grid.applyOverrides({ 'grid.vertical.visible': false })   // すべてのチャートの見た目と、あとから追加するチャートにも
grid.setFeatures({ 'toolbar.replay': false })               // すべてのチャートのスイッチと、あとから追加するチャートにも
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
