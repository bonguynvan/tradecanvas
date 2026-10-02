<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>描画ツール — TradeCanvas ドキュメント</title>
  <meta name="description" content="69 種類の組み込み描画ツール。それぞれ独自の設定を持ちます：フィボナッチとギャンのツール、エリオット波動、ハーモニックパターン、ノート、ブラシ、数量計算付きのロング/ショートポジション、描画へのアラート、グループとレイヤー。" />
</svelte:head>

<h1>描画ツール</h1>
<p>
  69 種類の組み込み描画ツールがあります。どのツールもマグネットでバーに吸着し、
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
const group = chart.groupDrawings([a, b, c], 'Weekly levels')
chart.setDrawingGroupVisible(group, false)
chart.setDrawingGroupLocked(group, true)
chart.ungroupDrawings(group)

chart.getSelectedDrawingIds()
chart.removeDrawings(ids)            // 元に戻す操作は 1 回分
chart.setDrawingsVisible(ids, false)
chart.setDrawingsLocked(ids, true)`}</code></pre>
<p>グループ内の描画を 1 つクリックすると、グループ全体が選択されます。</p>

<h2>消しゴム、ズーム、マグネット</h2>
<pre><code>{`chart.setEraserMode(true)          // 描画をクリックするたびに削除する（Escape まで）
chart.setZoomAreaMode(true)        // 次のドラッグで、枠内のバーにズームする
chart.setDrawingMagnetMode('strong') // 'off' | 'weak' | 'strong'`}</code></pre>
<p>弱いマグネットは、ポインターがバーの始値・高値・安値・終値の近くにあるとき、点をその値に吸着させます。強いマグネットは常に吸着させます。</p>

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
  <li><code>parallelChannel</code> — 任意の中央線付きで、どちらの方向にも延長できます。</li>
  <li><code>regressionChannel</code></li>
</ul>

<h3>フィボナッチ</h3>
<ul>
  <li><code>fibRetracement</code>、<code>fibExtension</code> — 編集可能なレベル、価格とパーセント表示、左右どちらかのラベル、背景、反転。</li>
  <li><code>fibChannel</code>、<code>fibTimeZones</code>、<code>fibSpeedResistanceFan</code></li>
  <li><code>fibArcs</code> — 値動きの起点を中心にした円弧。半円または全円。</li>
  <li><code>fibCircles</code> — 半径のフィボナッチ倍数の位置に描く円。</li>
  <li><code>fibSpiral</code> — 中心から広がる黄金螺旋。</li>
  <li><code>fibWedge</code> — 頂点から伸びる 2 本の線の間の円弧。</li>
</ul>

<h3>ギャンとピッチフォーク</h3>
<ul>
  <li><code>pitchfork</code>、<code>schiffPitchfork</code>、<code>modifiedSchiffPitchfork</code></li>
  <li><code>pitchfan</code> — ピボットから、2 点の間にあるレベルを通る半直線。</li>
  <li><code>gannFan</code>、<code>gannBox</code>、<code>gannSquare</code></li>
</ul>

<h3>図形</h3>
<ul>
  <li><code>rectangle</code>、<code>circle</code>、<code>ellipse</code>、<code>triangle</code></li>
  <li><code>polyline</code> — 閉じた図形。クリックごとに 1 点。</li>
  <li><code>curve</code> — 3 点目を通って曲がる線。<code>arc</code> — 3 点を通る円弧。</li>
</ul>

<h3>ブラシ</h3>
<ul>
  <li><code>brush</code>、<code>highlighter</code> — フリーハンド。</li>
  <li><code>path</code> — 点を通る線で、終点に矢印が付きます。</li>
</ul>

<h3>パターン</h3>
<ul>
  <li><code>xabcdPattern</code>、<code>cypherPattern</code>、<code>abcdPattern</code>、<code>threeDrives</code> — それぞれの比率を表示します。</li>
  <li><code>headAndShoulders</code> — ネックライン付き。</li>
</ul>

<h3>エリオット波動</h3>
<ul>
  <li><code>elliottWave</code>（1–5、A–C）、<code>elliottImpulse</code>、<code>elliottCorrection</code>、<code>elliottTriangle</code>、<code>elliottDoubleCombo</code>、<code>elliottTripleCombo</code> — ラベルは波動の次数に応じた表記になります：①、(1)、1、i。</li>
</ul>

<h3>サイクル</h3>
<ul>
  <li><code>cyclicLines</code>、<code>timeCycles</code>、<code>sineLine</code></li>
</ul>

<h3>計測</h3>
<ul>
  <li><code>measure</code>、<code>priceRange</code>、<code>dateRange</code>、<code>dateAndPriceRange</code></li>
</ul>

<h3>注釈とマーク</h3>
<ul>
  <li><code>text</code>、<code>note</code>（テキスト付きのピン）、<code>callout</code>、<code>priceLabel</code></li>
  <li><code>arrow</code>、<code>arrowMark</code>（上・下・左・右、ラベル付き）、<code>flag</code>、<code>icon</code>（星、ハート、チェック、バツ、円、三角、稲妻）</li>
</ul>

<h3>予測</h3>
<ul>
  <li><code>riskReward</code> — ロング/ショートポジション（上記）。</li>
  <li><code>forecast</code> — 価格がターゲットに届くと緑、その前に期限が過ぎると赤になります。</li>
  <li><code>projection</code> — 値動きを 3 点目を起点に写し取ります。</li>
  <li><code>barsPattern</code> — 一部のバーのコピー。バー、ライン、高値-安値のいずれかで表示でき、左右反転や上下反転もできます。</li>
  <li><code>anchoredVWAP</code>、<code>volumeProfileRange</code></li>
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
