<svelte:head>
  <title>チャートタイプ — TradeCanvas ドキュメント</title>
  <meta name="description" content="18 種類の組み込みチャートタイプ：ローソク足、OHLC、高値-安値、平均足、練行足、カギ足、ポイント・アンド・フィギュア、エクイボリュームなど。" />
</svelte:head>

<h1>チャートタイプ</h1>
<p>18 種類の組み込みチャートタイプがあり、<code>chart.setChartType(type)</code> で実行時に切り替えられます。</p>

<h2>標準</h2>
<table>
  <thead><tr><th>タイプ</th><th>説明</th></tr></thead>
  <tbody>
    <tr><td><code>candlestick</code></td><td>一般的な OHLC のローソク足。</td></tr>
    <tr><td><code>bar</code></td><td>OHLC バー（欧米式）。</td></tr>
    <tr><td><code>line</code></td><td>終値のラインチャート。</td></tr>
    <tr><td><code>area</code></td><td>終値ラインの下を塗りつぶしたエリア。</td></tr>
    <tr><td><code>baseline</code></td><td>基準価格の上 / 下を 2 色で塗り分けます。</td></tr>
    <tr><td><code>stepLine</code></td><td>階段状のライン。バーごとの終値の区切りを強調します。</td></tr>
    <tr><td><code>lineWithMarkers</code></td><td>ラインと、各データ点のドット。</td></tr>
    <tr><td><code>hollowCandle</code></td><td>終値が前のバーの終値を上回ると、実体を中空で描きます。</td></tr>
    <tr><td><code>hlcArea</code></td><td>高値と安値の帯に終値のラインを重ねます。</td></tr>
    <tr><td><code>hiLo</code></td><td>各バーの安値から高値までを 1 本の棒で描き、上昇・下落で色分けします。幅の広いバーには高値と安値が表示されます。</td></tr>
  </tbody>
</table>

<h2>派生</h2>
<table>
  <thead><tr><th>タイプ</th><th>説明</th></tr></thead>
  <tbody>
    <tr><td><code>heikinAshi</code></td><td>平均足の変換で平滑化したローソク足の系列。</td></tr>
    <tr><td><code>renko</code></td><td>一定の値幅のブロックで描くチャート。時間に依存しません。</td></tr>
    <tr><td><code>kagi</code></td><td>陽 / 陰のライン。反転幅はパーセント（既定 4）または価格で指定します。</td></tr>
    <tr><td><code>lineBreak</code></td><td>終値が直近のライン（既定 3 本）を抜けると新しいラインを引く新値足。</td></tr>
    <tr><td><code>pointAndFigure</code></td><td>X / O の列。ボックスサイズと反転数で描きます。</td></tr>
    <tr><td><code>rangeBars</code></td><td>各バーの高値と安値の幅が一定の値幅になり、バーは高値か安値で終わります。最後のバーは形成中のバーです。</td></tr>
  </tbody>
</table>

<h2>出来高加重</h2>
<table>
  <thead><tr><th>タイプ</th><th>説明</th></tr></thead>
  <tbody>
    <tr><td><code>volumeCandles</code></td><td>出来高に比例した幅のローソク足。</td></tr>
    <tr><td><code>equivolume</code></td><td>
      全値幅を表すボックスで、幅は出来高の比率に比例します。色は終値と前の終値の比較で決まります（Richard Arms 方式）。
    </td></tr>
  </tbody>
</table>

<h2>実行時の切り替え</h2>
<pre><code>{`chart.setChartType('equivolume')`}</code></pre>

<p>
  変換を伴うタイプ（平均足、練行足、カギ足、新値足、P&amp;F、レンジバー）は内部で処理されます。
  <code>chart.getData()</code> は引き続き元の入力系列を返します。
</p>

<h2>派生タイプの設定</h2>
<p>
  練行足のボックスサイズ、新値足の反転に必要な本数、カギ足の反転幅、ポイント・アンド・フィギュアの
  ボックスサイズと反転数、レンジバーの値幅を設定できます。設定しなかった項目はデータから求めます
  （練行足は ATR によるボックス、P&amp;F のボックスは平均終値の 1% など）。設定は保存した状態に含まれ、
  ChartWidget ではそのチャートタイプの設定ダイアログにあります。
</p>
<p>
  レンジバーの自動の値幅は、確定した直近 100 本のバーの真の値幅（true range）の平均を 1、2、5
  （… 1、2、5、10、20 …）に丸め、さらに銘柄の呼値の整数倍に丸めたものです（呼値が価格帯で変わる
  市場では、それらのバーが付けた価格の中で最も大きい呼値）。1 秒足では小さなバー、日足では大きなバーに
  なります。形成中のバーは計算に含めないため、ティックが変えるのはそのバーから作られるレンジバーだけで、
  それより前のレンジバーは変わりません。バーが確定して平均が次の 1-2-5 の値に移ったとき、またはそれらの
  バーの呼値が変わったときは、すべてのバーが新しい値幅で作り直されます。上昇では安値に値幅を足した価格で、
  下降では高値から値幅を引いた価格でバーが終わるので、終値は実際に付けた価格になり、ヒゲは先に動いた方向を
  示します。複数の値幅にまたがる急な動き（バーとバーの間の窓も）は、値幅ごとに 1 本のバーになります。
  窓を埋めるバーは、窓が飛ばした、実際には取引されなかった価格に立ちます。指定した値幅でも自動の値幅でも、
  確定したバーから作られるレンジバーが 100,000 本を超えるとき、または形成中のバーだけで 100,000 本を
  超えるときは、自身の 2、5、10、20… 倍のうち本数がそれを超えない最初の倍数に引き上げられ、すべての
  バーがその値幅で作り直されます。最も高い価格の有効数字 15 桁目の半分に満たない値幅では、価格がどう
  書かれていてもバーは 1 本も確定しません。
</p>
<p>
  練行足のボックスサイズ、カギ足の反転幅、ポイント・アンド・フィギュアのボックスサイズにも同じ上限があります。
  価格に対して小さすぎて、最後のバーより前のバーから 100,000 個を超えるブロック、線、列ができるとき、
  または最後のバーだけでそれだけできるときは、自身の 2、5、10、20… 倍のうち超えない最初の倍数に
  引き上げられ、チャートはその値で作られます。カギ足とポイント・アンド・フィギュアはバー 1 本につき線や列を
  最大 1 本しか作らないため、この上限に届くのは 100,000 本を超える系列だけです。新値足の設定は本数なので、
  こちらもバー 1 本につき最大 1 本です。保存した状態や共有リンクにある、0 より大きい有限の数でない
  ボックスサイズ、反転幅、値幅は捨てられる（チャートは既定値に戻ります。データから求めた値で、
  カギ足は 4% です）ため、リンクでチャートが止まることはありません。設定ダイアログは 0.00000001
  未満の値を受け付けず、入力欄の下にそう表示します。リアルタイムのチャートでは、引き上げた大きさをティックの間も保つので、ティックごとの
  作り直しは 1 回で済み、新しい系列では改めて求めます。<code>toRenko</code>、<code>toKagi</code>、
  <code>toPointAndFigure</code>、<code>toRangeBars</code> も <code>ReshapeMemo</code> を渡すと同じようにします。
</p>
<pre><code>{`chart.setChartTypeOptions({
  renko: { boxSize: 50 },                         // or 'atr' with atrPeriod
  lineBreak: { lines: 2 },
  kagi: { reversal: 25, reversalType: 'price' },  // or a percent
  pointAndFigure: { boxSize: 10, reversal: 3 },
  rangeBars: { range: 20 },
})
chart.getChartTypeOptions()
new Chart(host, { chartTypeOptions: { renko: { boxSize: 50 } } })`}</code></pre>

<h2>メイン系列と価格ペイン上のライン</h2>
<p>
  メイン系列を非表示にすると、インジケーターや比較シンボルだけを見られます。画面上の最高値と最安値、
  買値（bid）と売値（ask）にもラインを表示できます。ティックに <code>bid</code> と <code>ask</code> を
  含むフィードなら、これらのラインは自動で更新されます。
</p>
<pre><code>{`chart.setMainSeriesVisible(false)
chart.setHighLowLines(true)          // or new Chart(host, { highLowLines: true })
chart.setBidAsk({ bid: 64210.5, ask: 64211 })
chart.setBidAsk(null)`}</code></pre>
