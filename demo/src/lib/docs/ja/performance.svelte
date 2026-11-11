<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>パフォーマンス — TradeCanvas ドキュメント</title>
  <meta name="description" content="TradeCanvas が高速な理由：2 枚のキャンバスによる描画、表示範囲だけの処理、インジケーターの差分計算、軽いフルロード、LTTB ダウンサンプリング。ベンチマークの数値付き。" />
</svelte:head>

<h1>パフォーマンス</h1>
<p>
  2 枚のキャンバスを使う Canvas2D のパイプラインは変化した部分だけを再描画し、フレームごとの処理はすべて、
  読み込んだ履歴の量ではなく画面に表示されている範囲で上限が決まります。以下の数値は
  <code>pnpm bench</code>（シングルコア）と、実際のウィジェットのプロファイリングによるものです。
  <a href={href('/') + '#lab-title'}>Feature Lab</a> では、クリックした切り替えの実際の時間を計測できます。
</p>

<h2>フレーム：500 本から 100,000 本まで一定</h2>
<ul>
  <li><strong>2 枚のキャンバス</strong> — シーン用のキャンバス（グリッド、系列、インジケーター、チャートオブジェクト、軸）と、クロスヘアや凡例などポインターに連動する表示のための薄い最上位キャンバスです。ホバー時は最上位キャンバスだけを再描画し（約 0.2 ms）、ブラウザーが合成するのも 4 枚ではなく 2 枚で済みます。</li>
  <li><strong>表示範囲だけの描画</strong> — すべてのレンダラー、自動スケール、インジケーターの価格範囲の計算は、表示中のバーだけを走査します。</li>
  <li><strong>フレームごとのガベージなし</strong> — ビューポートのスナップショットは変更があるまでキャッシュされ、数値と日付のフォーマッターはラベルごとに作り直さず再利用されます。</li>
  <li><strong>価格軸の自動サイズ調整</strong> — 軸の幅を最も長いラベルに合わせるコストは約 0.05 ms で、幅が実際に変わったときだけ再レイアウトします。</li>
</ul>

<h2>ライブのティック：インジケーターの差分計算</h2>
<p>
  ティックで動くのは形成中のバーだけなので、独自の <code>update()</code> を持つインジケーターはそのバーだけを再計算します：ATR, Bollinger Bands, Chande Kroll Stop, DEMA, EMA, Envelope, KAMA, MACD, MA Cross, McGinley Dynamic, OBV, RSI, SMA, SMMA, Stochastic, Ulcer Index, Volume Oscillator, VWMA, WMA。さらに 31 個が <code>PointwiseIndicator</code> の上に作られ、同じように最後のバーから続きを計算します。他のインジケーターの線を読むインジケーターも続きから計算します。覚えているバーが一致しなくなったときは全体を再計算します。BB + EMA + RSI + MACD の場合：
</p>
<table>
  <thead><tr><th>履歴</th><th>全体の再計算</th><th>差分計算の <code>update()</code></th></tr></thead>
  <tbody>
    <tr><td>20,000 本</td><td>約 5 ms</td><td>約 0.0005 ms</td></tr>
    <tr><td>100,000 本</td><td>約 27 ms</td><td>約 0.001 ms</td></tr>
  </tbody>
</table>
<p>
  カスタムインジケーターも対応できます。<a href={href('/docs/plugins')}>プラグイン → 高速なライブ更新</a>を参照してください。
</p>

<h2>シンボルや時間足の切り替え</h2>
<ul>
  <li><strong>軽いフルロード</strong> — インジケーターの値は <code>IndicatorValueMap</code>（配列ベースで、タイムスタンプをキーとする <code>Map</code> より約 3 倍低コストで構築できます）に保持され、<code>setData</code> はすでに有効なバーをコピーせずに再利用します。</li>
  <li><strong>遅いときだけ読み込み表示</strong> — 前のチャートは表示されたままで、切り替えが 200 ms を超えたときだけ読み込み中の覆いが現れます。そのため、通常の約 130 ms のネットワーク切り替えで画面がちらつくことはありません。</li>
  <li><strong>古いデータを表示しない</strong> — 置き換えられた履歴リクエストは破棄され、古いソケットは切り離されるため、常に最後のクリックが反映されます。</li>
  <li><strong>ローカルでのリサンプリング</strong> — 静的なデータは再取得なしで時間足を切り替えます。時間のかかるリサンプリングでは、メインスレッドが処理でふさがる前に読み込み中の覆いを描きます。</li>
</ul>

<h2>LTTB ダウンサンプリング</h2>
<p>
  ピクセル数よりはるかに多くのバーがある場合、ラインチャートとエリアチャートは表示範囲を
  <strong>Largest-Triangle-Three-Buckets</strong> で 1 ピクセルあたり約 2 点にダウンサンプリングします。
  描く点の数は数十分の 1 になりますが、ラインの見た目は変わりません。通常のズームでは何もしません。
  このアルゴリズムはエクスポートされているので、独自に使うこともできます：
</p>
<pre><code>{`import { lttbDownsample } from '@tradecanvas/chart'

// indices preserving the shape of a 100k series, reduced to 1600 points
const idx = lttbDownsample(series.length, 1600, (i) => series[i].close)`}</code></pre>
<table>
  <thead><tr><th>表示中の点数 → 1600</th><th>時間 / フレーム</th><th>スループット</th></tr></thead>
  <tbody>
    <tr><td>10,000</td><td>約 0.025 ms</td><td>39,600 / 秒</td></tr>
    <tr><td>100,000</td><td>約 0.32 ms</td><td>3,100 / 秒</td></tr>
    <tr><td>1,000,000</td><td>約 2.6 ms</td><td>380 / 秒</td></tr>
  </tbody>
</table>

<h2>縮小時のインジケーター</h2>
<p>
  1 本のバーが 1 ピクセルより細くなると、インジケーターのライン、バンド、ヒストグラムはピクセル列ごとに 1 本のスパンで描かれます。列の最安値から最高値まで、前の列とつながり、幅は線の太さと同じです。数千点を通るストロークとほぼ同じ見た目のまま、ラスタライズの手間はずっと少なくなります。200,000 本のバーを縮小表示し、ボリンジャーバンド、EMA、RSI、MACD を重ねた場合、内蔵 GPU で 1 フレームが約 54 ms から約 21 ms になりました。<code>node scripts/bench-render.mjs</code> で手元のマシンでも計測できます。
</p>

<h2>WebGL レンダラー（プレビュー）</h2>
<p>
  <code>renderer: 'webgl'</code> を指定すると、プロット領域とインジケーターのペインを WebGL 2 で、2D シーンの下にあるキャンバスに描きます。グリッド、セッション、ローソク足、出来高は直接描き、インジケーター、比較ライン、ほとんどのチャートタイプの Canvas 2D 描画は GPU の線・塗り・矩形として記録し、Canvas 2D と同じように縁をアンチエイリアスします。デプスヒートマップ、出来高プロファイル、マーケットプロファイルも同じように記録し、ローソク足の下に描きます。統計ボックスや TPO の文字を表示するマーケットプロファイルは Canvas 2D のままです。テキスト、描画、注文、軸、クロスヘアは Canvas 2D のままで、GPU で同じに描けないものも Canvas 2D に任せます（順番どおりに描くので重なり順は変わりません）。自作のインジケータープラグインも変更なしで動きます。ローソク足は Canvas 2D とまったく同じデバイスピクセルに描かれ、線と塗りはアンチエイリアスされた縁のわずかなピクセルだけが異なります。WebGL のコードは独立したチャンク（gzip で約 17 KB）で、初めて使うときに読み込まれます。WebGL 2 がない環境やコンテキストを失ったときは、Canvas 2D で描き続けます。コンテキストが戻れば WebGL に戻ります。Chrome と Safari はページごとに WebGL コンテキストを 16 個ほどしか保持せず、超えると古いものから失われるため、同時に WebGL で描くチャートはページあたり最大 8 個です（<code>setMaxWebGLCharts</code>）。上限を超えたチャートは、コンテキストが空くまで Canvas 2D で描きます。Chrome、Firefox、WebKit で確認済みです。
</p>
<pre><code>{`const chart = new Chart(el, { renderer: 'webgl' })

chart.on('rendererChange', (e) => console.log(e.payload))
// { renderer: 'webgl', reason?: 'contextRestored' }, or { renderer: 'canvas', reason: 'unsupported' | 'contextLost' | 'limit' }

await chart.setRenderer('canvas')   // resolves to what draws now

setMaxWebGLCharts(4)   // from '@tradecanvas/chart': at most 4 charts on the page draw with WebGL (8 by default)`}</code></pre>
<p>パン中の 1 フレームの時間、内蔵 GPU（Intel UHD、16.7 ms で 60 fps）：</p>
<table>
  <thead><tr><th>チャート</th><th>ピクセル比</th><th>Canvas 2D</th><th>WebGL</th></tr></thead>
  <tbody>
    <tr><td>1600×900、ローソク足 500 本 + インジケーター 4 つ</td><td>2</td><td>27.4 ms</td><td>19.6 ms</td></tr>
    <tr><td>1600×900、200,000 本を縮小表示 + インジケーター 4 つ</td><td>2</td><td>34.5 ms</td><td>20.2 ms</td></tr>
    <tr><td>1600×900、1,000,000 本を縮小表示 + インジケーター 4 つ</td><td>2</td><td>34.5 ms</td><td>16.7 ms</td></tr>
    <tr><td>1600×900、デプスヒートマップ、スナップショット 240 × 80 段</td><td>2</td><td>25.5 ms</td><td>16.8 ms</td></tr>
    <tr><td>チャート 6 つ、それぞれローソク足 500 本とインジケーター 2 つ</td><td>2</td><td>23.5 ms</td><td>17.2 ms</td></tr>
    <tr><td>2560×1400、ローソク足 2,000 本 + インジケーター 4 つ</td><td>1</td><td>41.6 ms</td><td>17.7 ms</td></tr>
    <tr><td>2560×1400、ローソク足 2,000 本 + インジケーター 4 つ</td><td>1.5</td><td>70.8 ms</td><td>17.6 ms</td></tr>
    <tr><td>2560×1400、ローソク足 2,000 本 + インジケーター 4 つ</td><td>2</td><td>114.5 ms</td><td>29.1 ms</td></tr>
    <tr><td>2560×1400、ローソク足 2,000 本</td><td>2</td><td>33.1 ms</td><td>20.9 ms</td></tr>
  </tbody>
</table>
<p>
  上の WebGL のフレームの大半は 16.7 ms に収まり、平均値には少し長いフレームが含まれます。ピクセル比 2 の 2560×1400 のチャートでは、この GPU だとブラウザーがフルサイズのレイヤーを合成するだけで約 23 ms かかります。<code>node scripts/bench-render.mjs --renderer=webgl</code> で手元のマシンでも計測できます。
</p>
<p>
  バーは CSS ピクセルの 4 分の 1 より細くならないため、「1,000,000 本を縮小表示」でもピクセルあたり約 4 本（1600 px のチャートで約 6,400 本）が表示され、計測シーンは残りの足をパンして通過します。
</p>

<h2 id="mobile">スマートフォンとアプリ</h2>
<p>
  スマートフォンは 3 倍の画面、遅い CPU、そしてバッテリーで動きます。チャートはピクセル比 2 までで描画します（<code>maxPixelRatio</code>）。3 倍より 56% 少ないピクセルで、線はほとんど柔らかくなりません。画面外にあるときやページが隠れているときは描画を止め（<code>pauseWhenHidden</code>）、WebView に埋め込むアプリは <code>suspend()</code> で一時停止できます。フレームより速く tick が来るライブフィードでは、インジケーターは読まれる前にフレームごとに一度だけ再計算されます。ページやネットワークが戻ると、長く沈黙したストリームはハートビートを待たずにすぐ再接続し、破棄されたチャートはキャンバスのメモリをすぐ返します。
</p>
<pre><code>{`new Chart(host, {
  maxPixelRatio: 2,       // the default; Infinity draws at the screen's own
  pauseWhenHidden: true,  // the default: no frames off screen or on a hidden page
})
chart.suspend()   // your app went to the background (a WebView): stop drawing
chart.resume()    // back: one frame draws what changed`}</code></pre>
<p>スマートフォンの画面で計測（390 × 844、3 倍、CPU を 4 倍遅く、内蔵 GPU）、インジケーター 4 つのチャート 1 つ：</p>
<table>
  <thead><tr><th></th><th>以前</th><th>現在</th></tr></thead>
  <tbody>
    <tr><td>シーンの描画、300 本</td><td>34 ms</td><td>25 ms</td></tr>
    <tr><td>ライブ、1 フレームに 2 tick</td><td>18.5 ms</td><td>11–13 ms</td></tr>
    <tr><td>キャンバスのメモリ</td><td>17.1 MB</td><td>7.6 MB</td></tr>
  </tbody>
</table>
<p>
  タッチ画面のウィジェット：入力欄は 16 px でフォーカス時にページがズームしない、シートは画面キーボードの上、高さは動的ビューポート単位。手元で計測するには <code>node scripts/bench-render.mjs --mobile</code>。
</p>

<h2 id="soak">忙しいフィードで 10 分間</h2>
<p>
  動かし続けるライブデスク：1,000,000 本の 1 秒足に完全なウィジェット、WebGL で描画、4 つのインジケーター、損切りと利確つきのポジション、約定・再発注・移動される注文、買値と売値、板のヒートマップ、そしてソケット役のワーカーから毎秒 30,000 件の約定。約定はすべてティックとしてチャートに届きます。30 秒ごとにガベージコレクションを行い、まだ保持されているメモリを読み取ります。
</p>
<table>
  <thead><tr><th>計測項目</th><th>1 分後</th><th>10 分後</th></tr></thead>
  <tbody>
    <tr><td>回収後の JS ヒープ</td><td>418.0 MB</td><td>418.3 MB</td></tr>
    <tr><td>DOM ノード</td><td>1,220</td><td>1,220</td></tr>
    <tr><td>イベントリスナー</td><td>364</td><td>364</td></tr>
    <tr><td>毎秒取り込んだ約定</td><td>30,027</td><td>29,998</td></tr>
    <tr><td>毎秒のフレーム数</td><td>56.7</td><td>56.4</td></tr>
    <tr><td>p95 フレーム時間</td><td>18.2 ms</td><td>18.2 ms</td></tr>
    <tr><td>50 ms を超えるメインスレッドのタスク</td><td>0</td><td>0</td></tr>
  </tbody>
</table>
<p>
  9 分間でヒープは 0.3 MB 増えました。新しい 600 本の足とそのインジケーター値の分です。約定の取り込みはメインスレッドの約 1% で、フレームの大半は描画です。1.68.0 では、同じデスクが毎秒約 29 フレームで、毎秒 50 ms のタスクがありました。時間軸が毎フレームすべての足の時刻を確認し、日の区切り線が新しい足ごとに全履歴をたどり、ヒートマップが毎フレーム各スナップショットの価格を並べ替えていたためです。Intel UHD 770 上のヘッドレス Chrome で計測。お使いのマシンで実行するには：
</p>
<pre><code>{`pnpm build
pnpm soak                          # 10 minutes, 30,000 trades/s, 1,000,000 bars, WebGL
pnpm soak --minutes=30 --rate=50000 --renderer=canvas`}</code></pre>

<h2 id="download">ページがダウンロードするもの</h2>
<p>
  <code>new ChartWidget()</code> が読み込む JavaScript は gzip で 386 kB（圧縮前 1.46 MB）で、英語の文字列を含みます。ページの読み込み時には要らないダイアログ（インジケーターの一覧、コマンドパレット、銘柄検索、チャート設定、インジケーターと描画の設定、移動、ショートカット一覧）はさらに 34 kB です。どれかを初めて開いたとき、またはウィジェットが表示されたあとページが空いたときの、早いほうで読み込まれます。バンドラーはこれらを別のファイルにします。パッケージから直接配信する場合は、エントリーと同じ <code>dist</code> フォルダーにあるので、フォルダーごとコピーしてください。<code>pnpm build</code> のあとに <code>pnpm size</code> を実行すると、エントリーごとにこの数字が出ます。インジケーターワーカー（<code>indicatorWorker: 'auto'</code>）はさらに 36 kB で、チャートが初めて処理を送るときに読み込まれ、<code>'off'</code> では読み込まれません。
</p>

<h2 id="worker">メインスレッド</h2>
<p>
  既定では、インジケーターはメインスレッドで計算されます。<code>indicatorWorker: 'auto'</code> にすると、50,000 本以上のバーに対する全体の再計算（<code>setData</code>、銘柄や時間足の切り替え、インジケーターの追加、パラメーターの変更のとき）は、パッケージに含まれる Web Worker で行われます。そのコードは初めて必要になったときに読み込まれるチャンクにインライン化され、Blob URL から起動するため、配信するファイルはありません。ページ上のすべてのチャートが 1 つのワーカーを共有します。バーは数値の列として送られ、結果も同じ形で戻り、バーの区間ごとに少しずつポイントへ戻されるため、その間もページは描画と操作への応答を続けます。リアルタイムのティックはメインスレッドで差分計算されたままです。
</p>
<pre><code>{`new Chart(el, { indicatorWorker: 'auto' })
new ChartWidget(el, { chartOptions: { indicatorWorker: 'auto' } })`}</code></pre>
<p>
  結果が届くまで、チャートは前回の結果を描きます（追加したばかりのインジケーターは何も描きません）。<code>getIndicatorOutput</code>、アラート、エクスポートで値を読むと、ワーカーに残っている分を先にメインスレッドで計算するため、読んだ値が古いことはありません。<code>getIndicatorOutput(id, {'{'} drawn: true {'}'})</code> は待たずに、いま描かれている値を返します。他のインジケーターのラインや他の銘柄を読むインジケーター、そして独自のもの（<code>registerIndicator</code>）はメインスレッドで計算されます。ワーカーが動かない環境（サーバー、jsdom、<code>blob:</code> ワーカーを拒否する Content Security Policy）でも、すべてメインスレッドです。
</p>
<table>
  <thead><tr><th>setData のあと EMA、RSI、MACD、ボリンジャーバンド</th><th>200,000 本、off</th><th>auto</th><th>1,000,000 本、off</th><th>auto</th></tr></thead>
  <tbody>
    <tr><td>呼び出しがメインスレッドを占有した時間</td><td>74 ms</td><td>21 ms</td><td>269 ms</td><td>43 ms</td></tr>
    <tr><td>50 ms を超えるタスク</td><td>1</td><td>0</td><td>1</td><td>0</td></tr>
    <tr><td>フレーム間の最長の間隔</td><td>50 ms</td><td>33 ms</td><td>250 ms</td><td>33 ms</td></tr>
    <tr><td>すべてのラインが描かれるまで</td><td>74 ms</td><td>243 ms</td><td>269 ms</td><td>1,025 ms</td></tr>
  </tbody>
</table>
<p>
  ワーカーで仕事が減るわけではありません。結果をポイントに戻す処理は、計算とほぼ同じだけメインスレッドの時間を使います。その仕事を 1 フレームに収まる小分けにする代わりに、ラインの表示は遅れます。そのため 50,000 本から使います。デスクトップのヘッドレス Chrome、3 回の中央値です。<code>pnpm bench</code> は両方を Node で計測します（<code>recompute.bench.ts</code>）。
</p>
