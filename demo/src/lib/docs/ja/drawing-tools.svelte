<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>描画ツール — TradeCanvas ドキュメント</title>
  <meta name="description" content="73 種類の組み込み描画ツール。それぞれ独自の設定を持ちます：フィボナッチとギャンのツール、エリオット波動、ハーモニックパターン、ノート、ブラシ、数量計算付きのロング/ショートポジション、描画へのアラート、グループとレイヤー。" />
</svelte:head>

<h1>描画ツール</h1>
<p>
  73 種類の組み込み描画ツールがあります。どのツールもマグネットでバーに吸着し、
  元に戻す / やり直すに対応し、独自の設定を持ち、レイアウトと一緒に保存されます。
</p>

<h2>ポインターで描画する</h2>
<pre><code>{`chart.setDrawingTool('trendLine')   // 次のクリックでトレンドラインを描く
chart.setDrawingTool(null)          // カーソルに戻る
chart.setStayInDrawingMode(true)    // 描画のたびにツールを維持する`}</code></pre>
<p>ツールの描き方は次の 3 通りです：</p>
<ul>
  <li><b>クリック</b> — 点ごとに 1 回クリックします（トレンドラインは 2 回、XABCD パターンは 5 回）。</li>
  <li><b>フリーハンド</b> — 押したままドラッグします。<code>brush</code> と <code>highlighter</code>。</li>
  <li><b>パス</b> — 点ごとに 1 回クリックし、ダブルクリック、<kbd>Enter</kbd>、または最後の点のクリックで終了します。<code>path</code> と <code>polyline</code>。</li>
</ul>
<p><kbd>Escape</kbd> で、まだ完成していない描画を破棄します。</p>

<h2>コードから描画を追加する</h2>
<pre><code>{`const id = chart.addDrawing({
  type: 'fibRetracement',
  anchors: [{ time: t1, price: 101.2 }, { time: t2, price: 96.4 }],
  style: { color: '#f2a93b' },
  options: { reverse: true, extendRight: true },
})

chart.autoFib()   // 表示範囲の主要なスイングに引くリトレースメント。なければ null`}</code></pre>

<h2 id="panes">インジケーターのペインに描く</h2>
<p>
  インジケーターのペイン（RSI、MACD など）で始めた描画はそのペインに描かれます。アンカーの価格はペインの値で、マグネットはペインのラインに吸着し、描画はペインのスケールに従い、ペインの外には出ません。横のペインと折りたたんだペインには描けません。バーの価格を読むツール（アンカー VWAP、出来高プロファイル、ロング/ショートポジション）は価格ペインだけで使えます。ペインの描画には価格アラートを付けられません。
</p>
<pre><code>{`const rsi = chart.addIndicator('rsi')
chart.addDrawing({
  type: 'horizontalLine',
  anchors: [{ time: t1, price: 70 }],   // RSI スケールの 70
  paneId: rsi,                          // ペインの id（getIndicatorPanes() が返すもの）
})`}</code></pre>
<p>
  ペインを持つインジケーターを削除し、ペイン内の別のインジケーターが引き継ぐと、描画もペインと一緒に移ります。ペインがなくなると描画は非表示になり、元に戻すとペインと一緒に戻ります。保存したレイアウトは描画を元のペインに戻します。
</p>

<h2 id="text">テキスト</h2>
<p>
  テキスト系のツール（テキスト、ノート、吹き出し、価格ラベル、矢印マーク）は同じ文字スタイルを使います。サイズ、太字、斜体、そして独自の文字色です。テキスト、ノート、吹き出しは行を左・中央・右に揃え、背景と枠線を付け、指定の幅で折り返せます。テキストは自分の改行を保ち、幅を指定しない限り折り返しません。ノートと吹き出しは 240 px で折り返します。
</p>
<p>
  独自のサイズがないとき、言葉は 14 px、数字（レベルの価格、比率、統計ボックス）は 12 px で表示されます。どちらも軸の文字より 1 段以上大きく、軸の文字とともに大きくなります（<code>chart.setFont</code>、および広い画面のウィジェット）。以前のバージョンで保存されたサイズ 12 は、指定なしとして読み込まれます。ユーザーが書く言葉はシステムのサンセリフ体、数字はチャートのフォントで表示されます。<code>font: {'{'} textFamily {'}'}</code>（または <code>chart.setFont({'{'} textFamily {'}'})</code>）で言葉に独自のフォントを指定でき、ウィジェットはプリセットのフォントを使います。
</p>
<pre><code>{`chart.addDrawing({
  type: 'text',
  anchors: [{ time: t1, price: 101.2 }],
  style: {
    text: 'Breakout\\nretest here',     // テキスト自身の改行は保たれます
    fontSize: 14, bold: true, italic: false,
    textAlign: 'center',              // 'left' | 'center' | 'right'
    textColor: '#f2a93b',
    textBackground: true, fillColor: '#1e222d', fillOpacity: 0.8,
    textBorder: true, borderColor: '#f2a93b',
    textWrap: 200,                    // px。0 ならテキストの改行の位置だけ
  },
})`}</code></pre>
<p>
  ウィジェットでは、テキスト、メモ、吹き出し、道標、バルーン、固定テキストや固定メモを描いた直後とダブルクリックしたときに、その文字の上に入力欄が開きます。上書きして、Enter か外側のクリックで確定、Shift+Enter で改行、Escape で元に戻します（描いたばかりのものは消え、文字が空のときも同様です）。描いたばかりのテキストとその文字は 1 回の取り消しで消えます。設定は上のツールバーやメニューからすぐ開けます。選択範囲の上のツールバーでは、対応するツールの塗りと文字の色を設定できます。<code>chart.getDrawingTextRect(id)</code> はテキストの枠の位置を返すので、独自のエディターを重ねられます。
</p>

<h3 id="line-text">線とボックスのテキスト</h3>
<p>
  トレンドライン、レイ、延長線、情報線、角度線、矢印、水平線、垂直線、四角形も、同じスタイルでテキストを持てます。<code>textAlign</code> で線の左端・中央・右端に、<code>textVAlign</code> で線の上・線上・下に置きます。四角形では、内側の上・中央・下に置きます。テキストは線の傾きに沿い、常に左から右へ、垂直線では下から上へ読めます。ウィジェットではテキストタブにこの 2 行があります。
</p>
<pre><code>{`chart.addDrawing({
  type: 'trendLine',
  anchors: [{ time: t1, price: 98 }, { time: t2, price: 104 }],
  style: { color: '#4c8dff', lineWidth: 2, lineStyle: 'solid',
    text: 'Breakout', textAlign: 'right', textVAlign: 'top' },  // 'top' | 'middle' | 'bottom'
})
chart.addDrawing({ type: 'verticalLine', anchors: [{ time: t3, price: 0 }], options: { showTime: true } })
chart.addDrawing({ type: 'fibRetracement', anchors: [a, b], options: { trendLine: false, oneColor: true } })`}</code></pre>
<p>
  水平線と水平レイは <code>showPrice: false</code> で価格を隠します。垂直線は <code>showTime: true</code> でそのバーの時刻を、クロスヘアと同じ書き方で表示します。四角形には 8 つのハンドルがあります。各角に 1 つ、各辺の中央に 1 つで、辺のハンドルはその辺だけを動かします。フィボナッチ・リトレースメントとエクステンションは、点を通る破線（<code>trendLine</code>、既定でオン）を描き、<code>oneColor</code> ですべてのレベルを描画の色で描きます。文字をクリックしても、その線やボックスを選択できます。
</p>

<h2 id="look">描画の見た目</h2>
<p>
  どのツールも同じように描かれます。
</p>
<ul>
  <li>選択した描画のハンドルは描画の色のリングで、内側はチャートの背景色で塗られます（スタイルキー <code>drawings.handleColor</code> で好きな色に塗れます）。大きさは線より一回り大きく、1 px の線で直径 9 px、太い線ではそれ以上です。ポインターの下のハンドルは大きくなり、つかんでいるハンドルはその色で塗りつぶされます。リングが出るのは、ドラッグで形が変わる描画だけです。選択中のほかの描画とロックした描画には小さな点が表示されます。</li>
  <li>ポインターの下の描画はわずかに光り、クリックでどれが選ばれるかがはっきりわかります。</li>
  <li>描いている間は、置いた点がハンドルとして表示されます。</li>
  <li>破線と点線は線の太さに合わせて大きくなり、点は丸く、実線の端も丸くなります。矢じりも線に合わせて大きくなります。</li>
  <li>塗りつぶしは、個別に設定しない限り線の色を淡くしたものです。描画を赤にすれば塗りも赤になります。色付きタグのラベルは、黒と白のうち読みやすいほうで書かれます。統計ボックスはどちらのテーマでもチャート自身の面と文字の色を使います。描画の色の文字は、明るい背景で読みにくいところでは濃くなります。</li>
  <li>ツール本来の線はその線のスタイルに従い、グリッド、ガイド、補助の角度線は 1 px で淡く描かれます。ラベルがほかのラベルに重なるレベル、角度、分割にはラベルを付けません。ただし 0 と 1 のレベルには必ず付けます。パーセントは整数のときは整数で書き（50.0% ではなく 50%）、ほかの比率と一緒に描くフィボナッチ比率にはそれぞれ専用の色が付きます。</li>
  <li>上昇と下落（価格レンジ、ロング/ショートポジションのターゲットとストップ、予測の結果）は、テーマの利益と損失の色（スタイルキー <code>trading.profitColor</code> と <code>trading.lossColor</code>）で描かれ、指定がなければ緑と赤です。</li>
  <li>テキスト、アイコン、矢印マークにはハンドルを表示しません。ハンドルが文字や図形に重なってしまうためです。選択すると枠で囲まれ、どこを押しても移動できます。</li>
</ul>

<h2>設定</h2>
<p>
  スタイル（色、線の太さ、線の種類、塗りつぶし、テキスト）のほかに、ツールは
  独自の設定を持てます：フィボナッチのレベル、線の左右への延長、ラベル、背景、
  アイコン、波動の次数。ウィジェットの設定ダイアログは、これらの設定から作られます。
</p>
<pre><code>{`chart.getDrawingOptionDefs('fibRetracement')  // ツールが持つ設定
chart.getDrawingOptions(id)                   // 現在の値（既定値で補完済み）
chart.setDrawingOptions(id, {
  levels: [{ value: 0.5, visible: true }, { value: 0.618, visible: true, color: '#e8505b' }],
})

// 複数の変更を 1 回の元に戻す操作にまとめる
chart.updateDrawing(id, { style: { lineWidth: 2 }, options: { extendLeft: true } })

// 変更をプレビューするダイアログ：元に戻す操作は 1 回分、キャンセル時は元の状態に戻す
chart.beginDrawingEdit(id)
chart.updateDrawing(id, { style: { color: '#26a69a' } })
chart.endDrawingEdit(id, { cancel: false })

// 新しいフィボナッチ・リトレースメントの初期値
chart.setDrawingToolDefaults('fibRetracement', { showPrices: false })`}</code></pre>
<p>保存したレイアウトや貼り付けた描画の設定はツールに照らして検証され、ツールが受け付けない値は取り除かれます。</p>

<h3 id="settings-dialog">設定ダイアログ</h3>
<p>
  ウィジェットで描画をダブルクリックする（またはツールバー、メニュー、オブジェクトツリーの「設定」を選ぶ）と、
  その描画の設定がタブに分かれて開きます。<strong>スタイル</strong>：ライン（色、太さ、線種）を 1 行にまとめ、
  続いて線端、塗りつぶし、ツールの切り替えと選択肢、そしてレベル。<strong>テキスト</strong>（文字を書くツールのみ）：
  テキストとそのサイズ。<strong>座標</strong>：各点の価格、日付、時刻（チャートのタイムゾーンで表示）。
  <strong>表示</strong>：描画を表示する時間足。変更はすぐに反映され、<strong>OK</strong> で 1 回分の元に戻す操作として確定し、
  <strong>キャンセル</strong>（または Escape）で描画を元の状態に戻します。<strong>テンプレート</strong>メニューでは、
  保存したテンプレートの適用と削除、描画の見た目のテンプレートとしての保存、設定のツールの既定値としての保存、
  そのリセットができます。
</p>

<h3 id="drawing-intervals">一部の時間足だけに表示</h3>
<p>
  描画は、インジケーターと同じルールで一部の時間足だけに表示できます：ある種類をオフにする
  （<code>minutes: false</code>）か、その範囲を指定します（<code>hours: [1, 4]</code>）。ほかの時間足では描画されず、
  クリックにも反応せず、選択もされません。ルールはレイアウトとともに保存されます。
</p>
<pre><code>{`chart.updateDrawing(id, { intervals: { minutes: false } })  // 分足には表示しない
chart.isDrawingShown(id)                                    // 5m のチャートでは false
chart.updateDrawing(id, { intervals: null })                // ふたたびすべての時間足に表示

chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: t, price: 100 }], intervals: { days: false, weeks: false } })`}</code></pre>
<p>ストリームのない Chart を直接使う場合は、<code>chart.setDataTimeframe('5m')</code> でバーの時間足を伝えます。</p>

<h3 id="line-stats">ラインの端、中点、統計</h3>
<p>
  トレンドライン、半直線、延長線は、中点と、2 点間の統計を表示できます：価格の変化とその割合、2 点間のバー数と時間、角度です。
  統計はラインを選択している間だけ表示するか常に表示し、右端、中点、左端のいずれかのそばに置かれます。
  トレンドラインの両端は矢印にできます。どれも、指定するまではオフです。
</p>
<pre><code>{`chart.setDrawingOptions(id, {
  showPriceRange: true, showBarsRange: true, showDateRange: true, showAngle: true,
  alwaysShowStats: true, statsPosition: 'right',   // 'left' | 'center' | 'right'
  showMiddlePoint: true,
  rightEnd: 'arrow',                                // トレンドライン：leftEnd、rightEnd
})`}</code></pre>

<h2 id="selection-toolbar">選択した描画の上のツールバー</h2>
<p>
  ウィジェットで描画をクリックすると、そのすぐ上に小さなツールバーが表示されます：色、線の太さと線種、続いて設定、その線へのアラート、ロック、描画の完全なメニュー（右クリックと同じ）、削除。複数選択時はすべての上に置かれ、変更はそれぞれに適用されます。描画の移動、パン、ズームに追従し、描画ツール・消しゴム・範囲ズームが有効な間は退き、矢印キーで移動できる 1 つのタブストップです。
</p>
<pre><code>{`new ChartWidget(host, { features: { selectionToolbar: false } })  // turn it off
widget.setFeatures({ selectionToolbar: true })

// Your own controls over a drawing, on a bare Chart:
chart.on('drawingSelect', ({ payload }) => {
  const rect = payload.primary ? chart.getDrawingRect(payload.primary) : null
  // { x, y, width, height } in px from the chart container's top-left, or null
})`}</code></pre>

<h2>ロング/ショートポジション</h2>
<p>
  <code>riskReward</code>：エントリーからストップまでドラッグします。ターゲットはリスクリワード比に
  応じた距離に置かれ、そのハンドルで比率を変えられます。口座資金とリスク（口座資金の
  パーセントまたは金額）から数量を計算し、各ラインの価格、距離、損益を表示します。
</p>
<pre><code>{`chart.setDrawingOptions(id, { accountSize: 25_000, riskMode: 'percent', risk: 1, rewardRatio: 3 })`}</code></pre>

<h2>描画へのアラート</h2>
<p>
  アラートは、トレンドライン、半直線、延長線、水平線、または平行チャネルの各ラインに
  追従させられます。価格が、最新のバーにおけるそのラインの位置をクロスしたときに発動します。
  ラインの位置は、チャート上に描かれたとおりに決まります（バーの間は直線、対数スケールでは対数価格）。
</p>
<pre><code>{`if (chart.canAddDrawingAlert(id)) {
  chart.addDrawingAlert(id, { condition: 'crossingUp', message: 'Broke the trend line' })
}`}</code></pre>
<p>アラートは描画と一緒に動き、元に戻す操作で描画とともに復活し、レイアウトと一緒に保存されます。</p>

<h2>順序とグループ</h2>
<pre><code>{`chart.moveDrawing(id, 'front')       // 'front' | 'forward' | 'backward' | 'back'
chart.moveDrawing(id, 0)              // or a place in the order: 0 the bottom, as getDrawings() lists them
chart.updateDrawing(id, { name: 'Weekly support' })  // its name in the object tree; null: its tool's
const group = chart.groupDrawings([a, b, c], 'Weekly levels')
chart.setDrawingGroupVisible(group, false)
chart.setDrawingGroupLocked(group, true)
chart.ungroupDrawings(group)

chart.getSelectedDrawingIds()
chart.removeDrawings(ids)            // 元に戻す操作は 1 回分
chart.removeAll('drawings')         // すべての描画。'indicators'、または両方なら 'all'。元に戻すは 1 回、ロックした描画は残る
chart.setDrawingsVisible(ids, false)
chart.setDrawingsLocked(ids, true)

chart.copyDrawings()                 // 選択中の描画（Ctrl+C）
chart.pasteDrawings()                // Ctrl+V。このチャートにも、ページ上の別のチャートにも
chart.canPasteDrawings()             // 貼り付けられるものがあるかどうか`}</code></pre>
<p>グループ内の描画を 1 つクリックすると、グループ全体が選択されます。</p>
<p>ウィジェットのオブジェクトツリーでは、描画は重なり順に、いちばん上のものから並びます。描画の名前をクリックすると選択され、ダブルクリックすると名前を変更できます。行のボタンで複製でき、グリップをドラッグすると別の行の位置へ移ります。グリップ上で矢印キーを押すと、一覧と重なり順の両方で 1 行ずつ上下に動きます。</p>

<h2>消しゴム、ズーム、マグネット</h2>
<pre><code>{`chart.setEraserMode(true)          // 描画をクリックするたびに削除する（Escape まで）
chart.setZoomAreaMode(true)        // 次のドラッグで、枠内のバーにズームする
chart.setDrawingMagnetMode('strong') // 'off' | 'weak' | 'strong'`}</code></pre>
<p>弱いマグネットは、ポインターがバーの始値・高値・安値・終値の近くにあるとき、点をその値に吸着させます。強いマグネットは常に吸着させます。ウィジェットではマグネットは最初オフです。マグネットボタンでオンにするまで、描画は置いた位置にとどまります。</p>

<h2 id="cursors">カーソルと、描画の範囲を軸に</h2>
<pre><code>{`new Chart(el, { crosshair: { mode: 'magnet', cursor: 'dot' } })
chart.setCrosshairCursor('arrow')        // 'cross' | 'dot' | 'arrow'
chart.on('crosshairCursorChange', (e) => e.payload)  // { cursor }
widget.setCrosshairCursor('dot')         // the widget's, a Chart Setting
chart.setDrawingAxisSpansVisible(false)  // or features: { drawingAxisSpans: false }`}</code></pre>
<p><strong>Cross</strong> は十字線を描き、カーソルは十字です。<strong>Dot</strong> は同じ線を描き、カーソルは十字線の色の小さな点です。<strong>Arrow</strong> は線を描かず矢印カーソルのままで、価格と時刻は軸上でポインターに付いて動きます。ウィジェットでは描画ツールの一番上のカーソルボタンが三つのメニューを開き、チャート設定にも項目があります。カーソルの種類は閲覧者のものです。<code>persistSettings</code> が保存し、レイアウトや共有リンクには含まれません。</p>
<p>描画を選択・移動・作成している間、価格軸はその最安値から最高値まで、時間軸は最初の時刻から最後の時刻まで色が付き、両端に描画の色でラベルが付きます。水平線は価格だけ、垂直線は時刻だけを示し、画面に固定された描画は何も示しません。消しゴムは、クリックで消える描画を光らせます。</p>

<h2 id="editing">ポインターとキーで編集</h2>
<ul>
  <li>ハンドルのドラッグや描画全体の移動にもマグネットが効きます。つかんだ位置に最も近い点が価格に吸着し、ほかの点はその点との位置関係を保ちます。弱いマグネットは 50 px まで届きます。</li>
  <li>描画中やドラッグ中に <kbd>Ctrl</kbd>/<kbd>⌘</kbd> を押し続けると、その間マグネットが反転します。オフならオン、オンならオフです。</li>
  <li>描画中やハンドルのドラッグ中に <kbd>Shift</kbd> を押し続けると、線は画面上で水平・垂直・45° に保たれます。チャートの空いている所では、<kbd>Shift</kbd> + ドラッグは従来どおり計測です。線とパスに効きます。四角形、チャネルの幅、ピッチフォークの点は自由なままです。</li>
  <li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> で選択した描画を横に 1 本、または上下に 1 ピクセル動かします。<kbd>Shift</kbd> を加えると 10 です。続けて押した分は 1 回の取り消しにまとまり、ロックした描画は動きません。</li>
  <li>描画の上で <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + ドラッグするとコピーを引き出します（描画が選択に含まれていれば選択全体）。取り消しは 1 回です。<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + クリックは従来どおり選択への追加と解除、空いている所での <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + ドラッグは選択枠です。選択した描画のハンドル上では、<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + ドラッグはマグネットを反転させて形を変えます。</li>
  <li>描画をドラッグ中に <kbd>Escape</kbd> を押すとドラッグを取り消します。移動中や変形中の描画は元の位置と形に戻り、引き出し中のコピーは消え、取り消す手順は残りません。</li>
</ul>

<h2>キーボード</h2>
<ul>
  <li><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Z</kbd> 元に戻す、<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> または <kbd>Ctrl</kbd> + <kbd>Y</kbd> やり直す。</li>
  <li><kbd>Ctrl</kbd> + <kbd>C</kbd> / <kbd>V</kbd> 描画のコピーと貼り付け、<kbd>Ctrl</kbd> + <kbd>D</kbd> 複製、<kbd>Delete</kbd> 削除。</li>
  <li><kbd>Ctrl</kbd> + <kbd>G</kbd> 選択した描画をグループ化、<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd> グループ解除。</li>
  <li><kbd>Ctrl</kbd> + <kbd>]</kbd> / <kbd>[</kbd> 前面へ / 背面へ移動、<kbd>Shift</kbd> を加えると最前面へ / 最背面へ移動。</li>
  <li><kbd>Enter</kbd> パスを終了、<kbd>Escape</kbd> ツール、消しゴム、選択を解除。</li>
</ul>

<h2>イベント</h2>
<pre><code>{`chart.on('drawingCreate', (e) => e.payload)       // { id, type, drawing }
chart.on('drawingUpdate', (e) => e.payload)       // { id }
chart.on('drawingRemove', (e) => e.payload)       // { id }
chart.on('drawingDoubleClick', (e) => e.payload)  // { id }
chart.on('drawingContextMenu', (e) => e.payload)  // { id, x, y }
chart.on('toolModeChange', (e) => e.payload)      // { eraser } または { zoomArea }`}</code></pre>
<p>元に戻す / やり直すは、復活させた描画、取り除いた描画、変更した描画について、それぞれ <code>drawingCreate</code>、<code>drawingRemove</code>、<code>drawingUpdate</code> を送ります。</p>

<h2>一覧</h2>

<h3>ライン</h3>
<ul>
  <li><code>trendLine</code> — 必要に応じて左右に延長できます。</li>
  <li><code>ray</code>、<code>extendedLine</code></li>
  <li><code>horizontalLine</code>、<code>horizontalRay</code>（その点から時間の先の方向へ）、<code>verticalLine</code>、<code>crossLine</code></li>
  <li><code>infoLine</code> — 価格変化、バー数、時間、角度を示すボックス付き。</li>
  <li><code>trendAngle</code> — 画面上の角度付き。</li>
</ul>

<h3>チャネル</h3>
<ul>
  <li><code>parallelChannel</code> — 最初の 2 点を通る線を、3 点目まで真上か真下に平行移動したもの（アラートもこの形で判定します）。任意の中央線付きで、どちらの方向にも延長できます。</li>
  <li><code>regressionChannel</code> — 2 点の間の終値に当てはめた最小二乗法の直線と、その両側に標準偏差 2 つ分のバンド。2 点で対象のバーが決まり、ハンドルは直線の上にあります。</li>
</ul>

<h3>フィボナッチ</h3>
<ul>
  <li><code>fibRetracement</code>、<code>fibExtension</code> — 編集可能なレベル、価格とパーセント表示、左右どちらかのラベル、背景、反転。</li>
  <li><code>fibChannel</code>、<code>fibSpeedResistanceFan</code> — ファンの半直線はそれぞれのレベルの色で、時間の半直線は破線。どちらにもラベルが付きます。</li>
  <li><code>fibTimeZones</code> — ゾーンの始点（0）から先に描かれます。このツールと <code>cyclicLines</code> のハンドルは、それぞれの線上、プロットの高さの中ほどにあります。</li>
  <li><code>fibArcs</code> — 値動きの起点を中心にした円弧。半円または全円。</li>
  <li><code>fibCircles</code> — 半径のフィボナッチ倍数の位置に描く円。</li>
  <li><code>fibSpiral</code> — 中心から広がる黄金螺旋。</li>
  <li><code>fibWedge</code> — 頂点から伸びる 2 本の線の間の円弧。</li>
</ul>

<h3>ギャンとピッチフォーク</h3>
<ul>
  <li><code>pitchfork</code>、<code>schiffPitchfork</code>、<code>modifiedSchiffPitchfork</code> — B–C 線が歯をつなぎ、歯の間はプロットの端まで薄く色付けされます。</li>
  <li><code>pitchfan</code> — ピボットから、2 点の間にあるレベルを通る半直線。</li>
  <li><code>gannFan</code> — 各角度線にはプロットから出る位置でラベルが付きます。<code>gannBox</code> — 分割に価格と時間のラベルが付きます。<code>gannSquare</code></li>
</ul>

<h3>図形</h3>
<ul>
  <li><code>rectangle</code>、<code>circle</code>、<code>ellipse</code>、<code>triangle</code> — 楕円のハンドルは曲線上にあり、それぞれが一辺を動かします。</li>
  <li><code>polyline</code> — 閉じた図形。クリックごとに 1 点。</li>
  <li><code>curve</code> — 3 点目を通って曲がる線。<code>arc</code> — 3 点を通る円弧。</li>
</ul>

<h3>ブラシ</h3>
<ul>
  <li><code>brush</code>、<code>highlighter</code> — フリーハンド。選択するとテキストと同じように枠で囲まれ、どこを押しても移動できます。</li>
  <li><code>path</code> — 点を通る線で、終点に矢印が付きます。</li>
</ul>

<h3>パターン</h3>
<ul>
  <li><code>xabcdPattern</code>、<code>cypherPattern</code>、<code>abcdPattern</code>、<code>threeDrives</code> — それぞれの比率を表示します。点の名前は点の外側、ハンドルにかからない位置に置かれます。各比率はそのガイド線上に、線上に空きがなければ線のすぐそばに置かれ、名前、ハンドル、ほかの比率に重なることはありません。</li>
  <li><code>headAndShoulders</code> — ネックライン付きで、各ピークの名前がその上に表示され、正式名同士がぶつかる場合は LS、H、RS に短縮されます。</li>
</ul>

<h3>エリオット波動</h3>
<ul>
  <li><code>elliottWave</code>（1–5、A–C）、<code>elliottImpulse</code>、<code>elliottCorrection</code>、<code>elliottTriangle</code>、<code>elliottDoubleCombo</code>、<code>elliottTripleCombo</code> — ラベルは波動の次数に応じた表記になります：丸囲み数字、(1)、1、i で、点の外側に置かれます。</li>
</ul>

<h3>サイクル</h3>
<ul>
  <li><code>cyclicLines</code>、<code>timeCycles</code>、<code>sineLine</code></li>
</ul>

<h3>計測</h3>
<ul>
  <li><code>priceRange</code> — 上昇か下落の色（または指定した色）のボックスに上向きか下向きの矢印が通り、変化幅は端の先のタグに表示されます。</li>
  <li><code>dateRange</code> — 2 つの時刻の間のバー。横切る矢印と、バー数と時間を示すタグが付き、ハンドルは矢印の両端、プロットの高さの中ほどにあります。</li>
  <li><code>dateAndPriceRange</code> — その両方。測る向きごとに矢印があり、内側に出来高が表示されます。<code>measure</code> — 2 点間の変化幅とバー数。</li>
</ul>

<h3>注釈とマーク</h3>
<ul>
  <li><code>text</code>、<code>note</code>（テキスト付きのピン）、<code>callout</code>、<code>priceLabel</code></li>
  <li><code>arrow</code>、<code>arrowMark</code>（上・下・左・右、ラベル付き）、<code>flag</code>、<code>icon</code>（星、ハート、チェック、バツ、円、三角、稲妻）</li>
  <li><code>signpost</code>（バーに立てた柱の上の看板にテキスト）、<code>balloon</code>（バーを指す吹き出しにテキスト）</li>
  <li><code>anchoredText</code>、<code>anchoredNote</code>：画面上の位置に固定され、チャートをスクロール・ズームしたり銘柄を変えたりしても動きません。点はプロット領域に対する割合です（<code>{'{'} time: 0.5, price: 0.25 {'}'}</code> は横の中央、上から 4 分の 1）。設定に座標タブはありません。</li>
</ul>

<h3>予測</h3>
<ul>
  <li><code>riskReward</code> — ロング/ショートポジション（上記）。</li>
  <li><code>forecast</code> — 価格がターゲットに届くと上昇の色、その前に期限が過ぎると下落の色になります。</li>
  <li><code>projection</code> — 値動きを 3 点目を起点に写し取ります。</li>
  <li><code>barsPattern</code> — 一部のバーのコピー。バー、ライン、高値-安値のいずれかで表示でき、左右反転や上下反転もできます。コピー元のバーには淡い帯が敷かれます。</li>
  <li><code>anchoredVWAP</code> — ハンドルは開始点の VWAP 上にあります。<code>volumeProfileRange</code> — 価格ごとの出来高をレンジのボックス内にヒストグラムで表示し、バリューエリア（出来高の 70%）を網掛けし、POC（Point of Control）を横切る線で示します。ハンドルはボックスの角にあります。</li>
</ul>

<h2>保存</h2>
<pre><code>{`const json = chart.saveState()   // 描画とその設定・グループ、インジケーター、アラートなど
chart.loadState(json)            // すべての描画を検証し、不正なものは除外する`}</code></pre>

<h2>独自のツール</h2>
<p>
  ツールは <code>DrawingPlugin</code> で、
  <code>chart.registerDrawingTool(plugin)</code> で登録します。ディスクリプターには、
  設定（<code>options</code>）、描き方（<code>creation</code>）、塗りつぶしやテキストの有無を
  記述します。さらに、ラインの価格（アラート用の <code>priceAt</code>）、アンカーではない移動用ハンドル
  （<code>moveHandle</code>）を提供でき、チャートのバーを受け取ることもできます
  （<code>setDataGetter</code>）。<a href={href('/docs/plugins')}>プラグイン</a>を参照してください。
</p>
