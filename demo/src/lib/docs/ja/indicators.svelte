<script lang="ts">
  // Generated from the indicator registry by `pnpm docs:gen`: always the real ids.
  import catalog from '$lib/generated/indicators.json';

  type Entry = (typeof catalog)[number];
  const overlays = catalog.filter((i) => i.placement === 'overlay');
  const panes = catalog.filter((i) => i.placement === 'panel');
  const params = (i: Entry) =>
    Object.entries(i.params).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
  const lines = (i: Entry) => i.plots.map((p) => p.title).join(', ');
  const hasSource = (i: Entry) => 'inputs' in i && Object.values(i.inputs ?? {}).some((x) => (x as { source?: boolean }).source);
</script>

<svelte:head>
  <title>インジケーター — TradeCanvas ドキュメント</title>
  <meta name="description" content="{catalog.length} 種類の組み込みテクニカルインジケーター：移動平均、バンド、オシレーター、出来高、ボラティリティ。ソースの指定、インジケーターへの適用、編集できるレベルに対応しています。" />
</svelte:head>

<h1>インジケーター</h1>
<p>
  {catalog.length} 種類の組み込みインジケーターがあります。id を指定して追加します。省略したパラメーターは
  既定値になり、無効な値も既定値に戻ります。
</p>

<h2>インジケーターの追加</h2>
<pre><code>{`const ema = chart.addIndicator('ema', { period: 50 })          // on the price pane
const rsi = chart.addIndicator('rsi', { period: 14 }, 'bottom') // in a pane of its own
chart.updateIndicator(rsi, { period: 21 })
chart.removeIndicator(rsi)`}</code></pre>
<p>
  <code>addIndicator</code> はインスタンス id を返します。同じインジケーターを何度でも追加でき、
  インスタンスごとに独自の入力、色、レベルを持てます。
</p>

<p>
  TypeScript では、組み込みインジケーターの id と入力に型があります。<code>BuiltInIndicators</code> は各インジケーターの入力と
  その既定値、ラインのキーを並べているので、エディターが入力中に候補を出し、名前を打ち間違えた入力は型チェックで失敗します。
  プラグインが登録したインジケーターは任意の id と入力を受け付けます。
</p>

<h2>ソースとインジケーターへの適用</h2>
<p>
  下の表で <em>ソース</em> と記されたインジケーターは、終値以外の価格
  （<code>open</code>、<code>high</code>、<code>low</code>、<code>hl2</code>、<code>hlc3</code>、
  <code>ohlc4</code>、<code>hlcc4</code>）や、別のインジケーターのラインに対して計算できます。
  RSI の移動平均は RSI のペインに RSI のスケールで描かれ、RSI を削除すると一緒に消えます。
</p>
<pre><code>{`import { indicatorSource } from '@tradecanvas/chart'

chart.updateIndicator(ema, { source: 'hlc3' })
const smoothed = chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') })`}</code></pre>
<p>
  ペインのインジケーター同士で 1 つのペインを共有することもできます：
  <code>chart.addIndicator('stochastic', &#123;&#125;, 'bottom', &#123; pane: rsi &#125;)</code>。
</p>

<h2>レベル、色、値</h2>
<pre><code>{`chart.setIndicatorLevels(rsi, [20, 50, 80])   // null restores 30 / 70
chart.updateIndicatorStyle(rsi, { colors: ['#f2a93b'], lineWidths: [2] })
chart.setIndicatorVisible(rsi, false)

const series = chart.getIndicatorOutput(rsi)?.series ?? []
const latest = series[series.length - 1]?.value   // keyed by the line keys below`}</code></pre>
<p>
  各ラインの最新値は凡例に表示されます。ラインの色で軸上にもタグ表示するには、
  <code>features.indicatorValueLabels: true</code> または <code>setIndicatorValueLabelsVisible(true)</code> で
  オンにします（既定ではオフ）。ペインのライン、レベル、軸、クロスヘアは 1 つのスケールを共有します。
</p>

<h2>一部の時間足だけに表示</h2>
<p>
  インジケーターを一部の時間足だけに表示できます。たとえば 200 日移動平均は日足以上だけ、速いオシレーターは分足だけ、
  といった使い方です。時間足の種類（ティック、秒、分、時間、日、週、月）ごとに、そのまま表示する、オフにする、
  値の範囲を指定する、のいずれかにでき、指定しなかった種類ではすべての時間足に表示されます。チャートは、
  接続しているストリームの時間足にルールを照らし合わせ、時間足が変わるたびに判定し直します。<code>setData</code> で渡したバーには
  <code>chart.setDataTimeframe('1h')</code> で時間足を伝えます（ChartWidget は自動で行います）。どちらもなければインジケーターを表示します。ルールはレイアウトとともに保存され、ほかの編集と同じように元に戻せます。
</p>
<pre><code>{`chart.setIndicatorIntervals(ema, { seconds: false, minutes: false, hours: [1, 4] })
chart.getIndicatorIntervals(ema)    // { seconds: false, minutes: false, hours: [1, 4] }
chart.setIndicatorIntervals(ema, null)  // ふたたびすべての時間足に表示`}</code></pre>
<p>
  <code>getActiveIndicators()</code> は、それぞれが <code>visible</code>（オン）かどうかと、
  <code>shown</code>（この時間足で描画されている）かどうかを返します。ChartWidget では、描画されていない間は
  凡例の行がグレー表示になります。
</p>

<h2>ChartWidget では</h2>
<p>
  ツールバーの <strong>インジケーター</strong> でダイアログが開きます。入力すると、名前または略称ですべてのインジケーターを
  検索できます（<kbd>Enter</kbd> で最も一致するものを追加）。脇のグループ一覧から選ぶこともできます：
  <strong>お気に入り</strong>、<strong>テンプレート</strong>、<strong>すべて</strong>、続いて種類ごとのグループ
  （移動平均、トレンド、オシレーター、ボラティリティ、出来高、バンドとチャネル、価格とパターン）です。
  行を選ぶとそのインジケーターが追加され、ダイアログは次の追加のために開いたままです。数字はチャート上にいくつあるかを示し、
  横の星でお気に入りに入れられます。スマートフォンでは、グループはリストの上に一列に並ぶチップになります。
</p>
<p>
  インジケーターの設定（凡例の行の名前か歯車から開きます）には 3 つのタブがあります：<strong>パラメーター</strong>、
  <strong>スタイル</strong>（ラインごとの行で表示の有無、色、線種を設定し、ほかに線の太さ、オーバーレイの価格スケール、レベル）、
  <strong>表示</strong>（表示する時間足）です。編集はすぐに反映されます。<strong>キャンセル</strong>または
  <kbd>Esc</kbd> ですべて元に戻り、<strong>OK</strong> で確定します。<strong>初期設定</strong> では設定をリセットするか、
  初期設定として保存できます。保存すると、このブラウザーでは同じ種類の新しいインジケーターが
  このパラメーターと見た目で始まります。
</p>

<h2>価格ペインに表示 ({overlays.length})</h2>
<table>
  <thead><tr><th>id</th><th>名前</th><th>既定のパラメーター</th><th>ライン</th></tr></thead>
  <tbody>
    {#each overlays as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· ソース</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>mtfma</code> は、上位時間足の移動平均を現在のチャートに描きます。たとえば 1 時間足のバーに
  日足の 50 MA を表示できます。上位時間足の<em>確定した</em>終値だけを平均するため、境界ごとに
  階段状に変化し、リペイントすることはありません。
</p>

<p>
  <code>volumeProfile</code> は価格帯ごとに 1 行を描画領域の左端から描き、各行の長さはその価格帯で取引された出来高に従います。
  行は半透明なので、上に重なる凡例も下にあるローソク足も読み取れます。<code>updateIndicatorStyle</code> で
  <code>opacity</code> を下げると、さらに薄くできます。
</p>

<h2>独自のペインに表示 ({panes.length})</h2>
<table>
  <thead><tr><th>id</th><th>名前</th><th>既定のパラメーター</th><th>ライン</th><th>レベル</th></tr></thead>
  <tbody>
    {#each panes as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· ソース</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
        <td>{'levels' in ind ? ind.levels?.join(', ') : '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>voldelta</code>（Volume Delta）は、OHLCV から買い / 売りの圧力を近似します。上昇して引けたバーは
  出来高をプラス、下落したバーはマイナスとして加えます。<code>mode: 0</code> はバーごとのヒストグラム、
  <code>mode: 1</code> は累積デルタです。（本来のティックデルタには約定ごとの bid / ask データが必要ですが、
  OHLCV の系列にはその情報が含まれていません。）
</p>

<h2>アジアの相場ソフトでおなじみの指標</h2>
<p>
  韓国、日本、ベトナムのトレーダーが相場ソフトで使い慣れた指標：サイコロジカルライン（<code>psy</code>）と新サイコロジカルライン（<code>newpsy</code>）、ボリュームレシオ（<code>vr</code>）、AB レシオ（<code>abratio</code>）、<code>sonar</code>、<code>sigma</code>、バイナリーウェーブ（<code>binarywave</code>）、売買代金（<code>tradevalue</code>）と出来高増減（<code>volchange</code>）、DeMark の予測レンジ（<code>demark</code>）、最大 20 本の移動平均レインボー（<code>rainbow</code>）。売買代金は各足の終値 × 出来高による推定値で、取引所の公式値はそのデータフィードにあります。
</p>
<pre><code>{`chart.addIndicator('psy', { period: 10 }, 'bottom')              // 上昇引けの割合。25 と 75 を表示
chart.addIndicator('vr', { period: 20 }, 'bottom')                // 上昇日と下落日の出来高の比
chart.addIndicator('tradevalue', {}, 'bottom')                    // 各足の終値 × 出来高
chart.addIndicator('rainbow', { first: 10, step: 10, count: 10 }) // 10〜100 本の 10 本の平均線`}</code></pre>

<h2>ローソク足パターン</h2>
<p>
  1〜5 本の足からなる 64 パターン：十字線、カラカサと流れ星、丸坊主と寄り付き坊主；包み足、はらみ線、切り込み線とかぶせ線、毛抜き、キッキング；明けの明星と宵の明星、捨て子線、赤三兵と三羽烏、スリーインサイドとスリーアウトサイド、タスキ；スリーラインストライク、三法、マットホールド、ブレイクアウェイ、ラダーボトム。反転パターンは反転する対象のトレンドの後でのみ数え（パターン前の終値が 10 本平均と 10 本前の終値の両方を超えていること、<code>trendPeriod</code>）、実体の長短はそれ以前の足の平均実体と比べます。指標は強気パターンの下、弱気パターンの上に矢印を描き、足の幅が十分なら略称を添えます。複数のパターンが終わる足では最も長いものを表示します。<code>reversal</code>、<code>continuation</code>、<code>indecision</code>（1 か 0）で種類を選びます。
</p>
<pre><code>{`chart.addIndicator('candlepatterns')                  // パターンが終わる足ごとに矢印と名前
chart.addIndicator('candlepatterns', { indecision: 1 }) // 十字線やコマも表示

import { detectCandlePatterns, CANDLE_PATTERNS } from '@tradecanvas/chart'

const found = detectCandlePatterns(bars, { patterns: ['bullishEngulfing', 'hammer'] })
// [{ index, time, pattern: { id, name, short, direction, kind, bars } }]
CANDLE_PATTERNS.length                                 // 64`}</code></pre>

<h2>独自のインジケーター</h2>
<p>
  <code>IndicatorBase</code> を継承し、描画する内容（<code>plots</code>）、ペインのスケール、レベル、
  入力を宣言します。描画のコードを書かなくても、チャートが描画し、ペインのスケールを調整し、値をタグ表示し、
  ウィジェットの凡例と設定に表示します。<code>category</code>（<code>'oscillators'</code>、<code>'volume'</code>…）を
  指定するとインジケーターダイアログのそのグループに入り、指定しなければ「その他」に入ります。詳しくは
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">カスタムインジケーターのレシピ</a>を参照してください。
</p>

<h2>ペイン：サイズ変更、折りたたみ、最大化、並べ替え</h2>
<p>
  ペインの上の<strong>区切り線をドラッグ</strong>してサイズを変えます。
  ChartWidget では各ペインの右上にボタンがあり、上下への移動、ヘッダーだけへの折りたたみ、
  最大化（ほかのペインは折りたたまれ、価格ペインは細い帯として残ります）ができます。
  保存したレイアウトには、各ペインのサイズ、順序、折りたたみ、最大化の状態が残ります。コードからも同じことができます：
</p>
<pre><code>{`chart.setPanelSize(rsi, 180)        // px, clamped to a minimum
chart.setPaneCollapsed(macd, true)  // fold to its header
chart.setMaximizedPane(rsi)         // null puts the panes back
chart.movePane(rsi, -1)             // one place up; 1 = down
chart.on('paneChange', (e) => e.payload.change)  // 'collapsed' | 'maximized' | 'order' | 'scale'
chart.setPaneScale(atr, { log: true, invert: false })  // log while its values are above 0
chart.setPaneScale(atr, { percent: true })             // labels in percent of its first value on screen`}</code></pre>
<p>
  ChartWidget でペインを右クリックすると、そのペイン独自の対数スケール、反転スケール、パーセントスケールを設定できます。
</p>

<h2>インジケーターを別のペインへ移動する</h2>
<p>
  インジケーターは、別のインジケーターのペインに加わる（そのペインのスケールを共有します）、独自のペインを持つ、
  価格ペインに戻る、のいずれもできます。自分が持ち主だったペインを離れても、そのペインのほかのインジケーターは残り
  （次のペインインジケーターがペインを引き継ぎます）、そのラインを使っているインジケーターは一緒に移動します。
  ChartWidget では、凡例の行にある <strong>⋯</strong> ボタンから、上のペイン、下のペイン、新しいペイン、価格ペインを選べます。
</p>
<pre><code>{`chart.moveIndicatorToPane(cci, rsi)      // into RSI's pane
chart.moveIndicatorToPane(cci, 'new')    // a pane of its own
chart.moveIndicatorToPane(ema, 'price')  // an overlay back to the price pane
chart.canMoveIndicatorToPane(cci, rsi)   // whether it would move`}</code></pre>

<h2>元に戻す操作とテンプレート</h2>
<p>
  インジケーターの追加、削除、編集、移動は、描画と同じ履歴に入る元に戻す操作の 1 ステップです
  （<kbd>Ctrl/⌘ Z</kbd>、<kbd>Ctrl/⌘ Shift Z</kbd>）。元に戻す操作で復活したインジケーターは元の id のまま戻るので、
  そのラインに設定したアラートも引き続き対応します。1 つのインジケーターへの連続した編集（色のドラッグ、期間の入力）は
  1 ステップにまとまります。レイアウトを読み込むと、履歴は新しく始まります。
</p>
<p>
  インジケーターは丸ごと取り出して戻すことができ、ChartWidget のインジケーターテンプレートはこの仕組みを使っています。
  インジケーターダイアログの「テンプレート」タブにある <strong>インジケーターをテンプレートとして保存…</strong> で、それら（入力、スタイル、レベル、ペイン）を
  名前を付けて保存し、テンプレートを選ぶとチャートのインジケーターがそれに置き換わります。これは 1 回の元に戻す操作にまとまります。
</p>
<pre><code>{`const setup = chart.getIndicatorSetup()   // what a layout keeps of them
chart.applyIndicatorSetup(setup)          // in place of the chart's indicators

new ChartWidget(host, { indicatorTemplates: true })  // the default`}</code></pre>

<h2>チャートの外での計算</h2>
<p>
  <code>IndicatorWorkerHost</code> は、Web Worker が使うのと同じメッセージで、バーからインジケーターを計算します。
  ワーカースクリプトはまだ公開パッケージに含まれていないため、<code>null</code> を渡してプラグインを登録し、
  その場で計算してください（SSR、テスト、スクリプト向け）：
</p>
<pre><code>{`import { IndicatorWorkerHost, RSIIndicator } from '@tradecanvas/core'

const host = new IndicatorWorkerHost(null)
host.registerFallbackPlugin(new RSIIndicator())
const output = await host.calculate('rsi', { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } }, bars)`}</code></pre>
