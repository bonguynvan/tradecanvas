<svelte:head>
  <title>描画ツール — TradeCanvas ドキュメント</title>
  <meta name="description" content="40 種類の組み込み描画ツール：トレンドライン、フィボナッチのチャネルとファン、シフ・ピッチフォーク、ハーモニックパターン、ギャン、エリオット波動、期間指定の価格帯別出来高、ロング/ショートポジションなど。" />
</svelte:head>

<h1>描画ツール</h1>
<p>40 種類の組み込み描画ツールがあります。すべてのツールがマグネットによる吸着、元に戻す / やり直す、JSON への完全なシリアライズに対応しています。</p>

<h2>ツールの有効化</h2>
<pre><code>{`chart.activateDrawingTool('trendLine')
// User clicks two points; the drawing is added to the manager.`}</code></pre>

<h2>自動フィボナッチ</h2>
<p>
  ワンクリックで、表示範囲の主要なスイング（最高値と最安値）にフィボナッチ・リトレースメントを描きます。
  上昇スイングでは安値→高値、下降スイングでは高値→安値にアンカーを置きます。コマンドパレット
  （「自動フィボナッチ」）から実行するか、プログラムから呼び出します：
</p>
<pre><code>{`chart.autoFib()  // returns the new drawing id, or null if no clear swing

// general drawing append (active style applied, id auto-assigned)
chart.addDrawing({ type: 'fibRetracement', anchors: [a, b] })`}</code></pre>

<h2>一覧</h2>

<h3>ライン</h3>
<ul>
  <li><code>trendLine</code></li>
  <li><code>ray</code></li>
  <li><code>extendedLine</code></li>
  <li><code>horizontalLine</code></li>
  <li><code>horizontalRay</code> — <code>horizontalLine</code> と同様ですが、アンカーから時間の先の方向にだけ伸びます。</li>
  <li><code>verticalLine</code></li>
  <li><code>crossLine</code> — 1 点を通る水平線と垂直線（1 回のクリック）。</li>
  <li><code>infoLine</code> — 統計ボックス付きのトレンドライン：価格変化と %、バー数と期間、角度。</li>
  <li><code>trendAngle</code> — 画面上の角度を度数で表示するトレンドライン。</li>
</ul>

<h3>チャネル</h3>
<ul>
  <li><code>parallelChannel</code></li>
  <li><code>regressionChannel</code></li>
</ul>

<h3>図形</h3>
<ul>
  <li><code>rectangle</code></li>
  <li><code>ellipse</code></li>
  <li><code>triangle</code></li>
  <li><code>circle</code> — 中心点を置き、次に円周上の 1 点を置きます。</li>
</ul>

<h3>フィボナッチ</h3>
<ul>
  <li><code>fibRetracement</code></li>
  <li><code>fibExtension</code></li>
  <li><code>fibTimeZones</code> — 2 つのアンカーで決めた期間から、フィボナッチ間隔の垂直線を投影します。</li>
  <li><code>fibChannel</code> — A→B が基準のトレンドライン、C で幅を決め、その幅のフィボナッチ比率の位置に平行線を引きます。</li>
  <li><code>fibSpeedResistanceFan</code> — A から、A→B の値動きを価格と時間の両方でフィボナッチ比率に分けた点を通る半直線を引きます。</li>
</ul>

<h3>高度なツール</h3>
<ul>
  <li><code>pitchfork</code> — アンドリューズ・ピッチフォーク。</li>
  <li><code>schiffPitchfork</code> — 中央線が、A の時刻で A と B の中間の価格から始まります。</li>
  <li><code>modifiedSchiffPitchfork</code> — 中央線が A と B の中点から始まります。</li>
  <li><code>cyclicLines</code> — A→B の間隔で繰り返す垂直線。</li>
  <li><code>gannFan</code></li>
  <li><code>gannBox</code></li>
  <li><code>anchoredVWAP</code></li>
  <li><code>volumeProfileRange</code></li>
</ul>

<h3>パターン</h3>
<ul>
  <li><code>xabcdPattern</code> — ハーモニックの XABCD（ガートレー、バット、バタフライ、クラブなど）。XB、AC、BD、XD の比率をラベル表示します。</li>
  <li><code>abcdPattern</code> — BC/AB と CD/BC の比率付きの ABCD。</li>
  <li><code>headAndShoulders</code> — 7 つのピボットと、2 つのネックポイントを通るネックライン。</li>
  <li><code>elliottWave</code> — 1-2-3-4-5-A-B-C の波動カウント。</li>
</ul>

<h3>計測</h3>
<ul>
  <li><code>measure</code></li>
  <li><code>priceRange</code></li>
  <li><code>dateRange</code></li>
  <li><code>dateAndPriceRange</code> — 価格変化、バー数、時間、出来高を 1 つのボックスで計測します。</li>
</ul>

<h3>注釈</h3>
<ul>
  <li><code>text</code></li>
  <li><code>arrow</code></li>
  <li><code>priceLabel</code> — 1 点に固定され、その価格（または <code>style.text</code>）を表示する吹き出し。</li>
</ul>

<h3>ポジション</h3>
<ul>
  <li><code>riskReward</code> — 「ロング/ショートポジション」：エントリーからストップまでドラッグすると、方向と、色付きのリスク / リワードゾーン（既定は 2:1）が自動で計算されます。</li>
</ul>

<h2>シリアライズ</h2>
<pre><code>{`const json = chart.serialize()              // → string
chart.deserialize(json)                     // validates + restores drawings/indicators/viewport`}</code></pre>

<p>
  <code>deserialize</code> は不正な描画、注文、インジケーターを取り除きます。
  一部が欠けたデータや破損したデータで、チャートが壊れることはもうありません。
</p>
