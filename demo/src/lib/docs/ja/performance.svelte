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
  ティックで動くのは形成中のバーだけなので、<code>update()</code> を実装したインジケーター
  （SMA、EMA、WMA、VWMA、Bollinger、Envelope、RSI、MACD、ATR、OBV、Stochastic）はそのバーだけを再計算します。
  それ以外は全体の再計算にフォールバックします。BB + EMA + RSI + MACD の場合：
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
  <code>renderer: 'webgl'</code> を指定すると、グリッド、セッションの網掛けと区切り線、ローソク足、出来高を WebGL 2 で、2D シーンの下にあるキャンバスに描きます。インジケーター、描画、軸、クロスヘアは Canvas 2D のままです。<code>'auto'</code> はハードウェア GPU のときだけ WebGL を使います。ピクセルは Canvas 2D と 2/255 以内で一致します。WebGL のコードは独立したチャンク（gzip で約 7 KB）で、初めて使うときに読み込まれます。WebGL 2 がない環境やコンテキストを失ったときは、Canvas 2D で描き続けます。
</p>
<pre><code>{`const chart = new Chart(el, { renderer: 'webgl' })

chart.on('rendererChange', (e) => console.log(e.payload))
// { renderer: 'webgl' }, or { renderer: 'canvas', reason: 'unsupported' | 'contextLost' }

await chart.setRenderer('canvas')   // resolves to what draws now`}</code></pre>
<p>パン中の 1 フレームの時間、内蔵 GPU（Intel UHD、16.7 ms で 60 fps）：</p>
<table>
  <thead><tr><th>チャート</th><th>ピクセル比</th><th>Canvas 2D</th><th>WebGL</th></tr></thead>
  <tbody>
    <tr><td>1600×900、ローソク足 2,000 本</td><td>2</td><td>23.3 ms</td><td>17.6 ms</td></tr>
    <tr><td>1600×900、200,000 本を縮小表示</td><td>2</td><td>25.1 ms</td><td>18.2 ms</td></tr>
    <tr><td>2560×1400、ローソク足 2,000 本</td><td>1.5</td><td>28.8 ms</td><td>20.9 ms</td></tr>
    <tr><td>2560×1400、ローソク足 2,000 本</td><td>2</td><td>38.1 ms</td><td>22.5 ms</td></tr>
    <tr><td>チャート 6 つ、それぞれローソク足 500 本とインジケーター 2 つ</td><td>2</td><td>33.4 ms</td><td>24 ms</td></tr>
  </tbody>
</table>
<p>
  インジケーターはまだ Canvas 2D で描くため、多く表示したチャートほど効果は小さくなります。2560×1400 にインジケーター 4 つ、ピクセル比 2 では 138 ms から 97 ms です。このサイズとピクセル比では、この GPU だとブラウザーがフルサイズのレイヤーを合成するだけで約 23 ms かかります。<code>node scripts/bench-render.mjs --renderer=webgl</code> で手元のマシンでも計測できます。
</p>

<h2>メインスレッドの外で計算</h2>
<p>
  <code>IndicatorWorkerHost</code> は、Promise ベースの <code>calculate()</code>、リクエストごとのタイムアウト、
  SSR やテスト向けの同期フォールバックを備え、インジケーターの計算を Web Worker で実行します。
</p>
