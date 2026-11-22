<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>プラグイン — TradeCanvas ドキュメント</title>
  <meta name="description" content="プラグイン SDK で、独自のインジケーター、描画ツール、チャートタイプ、オーバーレイを追加して TradeCanvas を拡張できます。" />
</svelte:head>

<h1>プラグイン</h1>
<p>
  独自の<strong>インジケーター</strong>、<strong>描画ツール</strong>、<strong>チャートタイプ</strong>、
  <strong>オーバーレイ</strong>でチャートを拡張できます。グローバルにも、チャートごとにも登録できます。
</p>

<h2>登録</h2>
<p>登録方法は 3 つあり、優先順位の順に、グローバルな既定、コンストラクター、インスタンスへの命令的な呼び出しです。</p>
<pre><code>{`import { Chart, registerPlugin } from '@tradecanvas/chart'

// 1) Global — every Chart created afterward inherits it
registerPlugin({ kind: 'indicator', plugin: new MyIndicator() })

// 2) Per-chart at construction
const chart = new Chart(el, { plugins: [{ kind: 'overlay', plugin: myHeatmap }] })

// 3) Imperative on an instance
chart.plugins.register({ kind: 'chartType', plugin: myCandles })
chart.plugins.unregister('chartType:my-candles')
chart.plugins.list()`}</code></pre>
<p>
  <code>ChartWidget</code> はプラグインを <code>plugins</code> で受け取ります（型付きで、<code>chartOptions.plugins</code> があればそれと合わせて）。
  これらは何かを復元する前にウィジェットのチャートに登録されるため、保存したレイアウト
  （<code>persistLayouts</code>）、テンプレート、共有ビューが独自のインジケーターを含んでいれば、それも戻ります。
  同じ id については、ウィジェットの <code>plugins</code> が <code>chartOptions.plugins</code> より優先され、グリッドのセルが自分の
  <code>plugins</code> を持つと、グリッドで共有されるものに置き換わります。レイアウトが復元された後に
  <code>widget.getChart()</code> に登録したインジケーターは間に合いません。レイアウトはすでにそれを除外しています。
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT', adapter, persistLayouts: true,
  plugins: [{ kind: 'indicator', plugin: new DoubleSMA() }],
})`}</code></pre>

<h2>プラグインの種類</h2>
<table>
  <thead><tr><th>種類</th><th>インターフェース</th><th>描画先</th></tr></thead>
  <tbody>
    <tr><td><code>indicator</code></td><td><code>IndicatorPlugin</code> — <code>calculate()</code> + <code>render(ctx, output, viewport, style, &#123; theme &#125;)</code></td><td>オーバーレイまたはパネル</td></tr>
    <tr><td><code>drawing</code></td><td><code>DrawingPlugin</code> — <code>render()</code> + <code>hitTest()</code></td><td>オーバーレイレイヤー</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartTypePlugin</code> — <code>createRenderer()</code> + 任意の <code>transform()</code></td><td>メイン系列</td></tr>
    <tr><td><code>overlay</code></td><td><code>OverlayPlugin</code> — <code>render(ctx, &#123; viewport, data, theme &#125;)</code></td><td><code>main</code> / <code>overlay</code> / <code>ui</code></td></tr>
  </tbody>
</table>

<h2 id="define">カスタムインジケーター、手短な方法</h2>
<p>
  <code>defineIndicator</code> は、入力と、バーを受け取る 1 つの関数からインジケーターを作ります：クラスも描画のコードも要りません。
  <code>calculate</code> は、列としてのバー（<code>bars.close[i]</code>）、入力の値、
  そしてインジケーターを組み立てる計算である <code>ta</code> を受け取り、線をキーごとに返します。チャートがそれらを描き、
  ペインのスケールを調整し、凡例に表示し、設定ダイアログに各入力の欄を用意します。
</p>
<pre><code>{`import { defineIndicator } from '@tradecanvas/chart'

const emaCross = defineIndicator({
  id: 'emaCross',
  name: 'EMA Crossover',
  placement: 'overlay',                       // on the prices; 'panel' (the default) is a pane of its own
  inputs: {
    fast: { default: 9, kind: 'int', min: 1 },
    slow: { default: 21, kind: 'int', min: 2 },
  },
  plots: [
    { key: 'fast', title: 'Fast', color: 0 },
    { key: 'slow', title: 'Slow', color: 1 },
    { key: 'buy', title: 'Buy', color: 2, kind: 'markers', shape: 'arrowUp', position: 'belowBar' },
    { key: 'sell', title: 'Sell', color: 3, kind: 'markers', shape: 'arrowDown', position: 'aboveBar' },
  ],
  calculate({ bars, inputs, ta }) {
    const fast = ta.ema(bars.close, inputs.fast)
    const slow = ta.ema(bars.close, inputs.slow)
    return { fast, slow, buy: ta.crossover(fast, slow), sell: ta.crossunder(fast, slow) }
  },
})

chart.registerIndicator(emaCross)
chart.addIndicator('emaCross', { fast: 12 })`}</code></pre>
<ul>
  <li>
    <strong>入力。</strong>それぞれに <code>default</code> があり、その型が入力の型になります。加えて、設定ダイアログが
    表示に必要とするものを持ちます：<code>kind</code>、<code>min</code>、<code>max</code>、<code>step</code>、
    選択肢の <code>options</code>、価格ソースの <code>source: true</code>（このときインジケーターはそれを
    <code>bars.close</code> として読みます）。<code>calculate</code> が受け取る数値は <code>min</code> と
    <code>max</code> の範囲内で、<code>kind: 'int'</code> なら整数であり、選択肢はその options のいずれかです。
  </li>
  <li>
    <strong>線。</strong>バーごとに 1 つの値です。値がない所は <code>undefined</code>、<code>null</code>、または <code>NaN</code>
    にします。価格上の <code>kind: 'markers'</code> のプロットでは、<code>true</code> がバーに印を付けます：
    <code>position</code> に応じてバーの上か下、それ以外はバーの終値の位置です。独自のペインの印は数値で、
    印が描かれる値です。<code>plots</code> がなければ、返された線はすべて、テーマの系列色の線として描かれます。
    バーが少なすぎるときに線を返さないインジケーターは、線を宣言します。
  </li>
  <li>
    <strong>見た目。</strong><code>plots</code>（線、<code>'histogram'</code>、<code>'step'</code>、
    <code>'dots'</code>、<code>'markers'</code>。それぞれに色、太さ、線種）、2 本の線の間の帯のための <code>fills</code>、
    ペインのための <code>scale</code> と <code>levels</code>。下の
    <a href="#descriptor">ディスクリプター</a>と同じです。
  </li>
  <li>
    <strong><code>ta</code></strong> には <code>sma</code>、<code>ema</code>、<code>wma</code>、<code>rma</code>、
    <code>stdev</code>、<code>highest</code>、<code>lowest</code>、<code>change</code>、<code>rsi</code>、
    <code>macd</code>、<code>atr</code>、<code>bollinger</code>、<code>crossover</code>、
    <code>crossunder</code> があります。どれもバーごとに 1 つの値を受け取り、バーごとに 1 つの値を返すので、1 つの結果を次に渡せます
    （<code>ta.ema(ta.rsi(bars.close, 14), 9)</code>）。<code>rsi</code>、<code>macd</code>、<code>atr</code>、
    <code>bollinger</code> は組み込みのインジケーターそのものを実行するので、値はチャートのものと同じです。
  </li>
  <li>
    <strong><code>ta.indicator(id, input, params)</code></strong> は、任意の組み込みインジケーターを実行し、
    その線をキーごとに返します：<code>{`ta.indicator('stochastic', bars, { kPeriod: 14 }).k`}</code>、
    <code>{`ta.indicator('supertrend', bars).value`}</code>。id、入力、線は
    <a href={href('/docs/indicators')}>インジケーター</a>のページにあるもので、型が付いています。<code>input</code> はバー、
    またはバーごとに 1 つの値で、後者の場合インジケーターはそれを価格として読みます（<code>{`ta.indicator('ema', rsi, { period: 5 })`}</code>）。
    バーごとに 1 つの値には出来高も時刻もないので、出来高や 1 日のセッションのインジケーター（OBV、MFI、VWAP…）にはバーが必要です。
    別のシンボルのバーを読む 5 つは、これに含まれません。
    <code>ta</code> は単独でもエクスポートされています：<code>{`import { ta } from '@tradecanvas/chart'`}</code>。
  </li>
</ul>
<p>
  ティックごとにすべてのバーを計算しますが、このような計算なら速く済みます。それが目に見えるほど遅いインジケーターや、
  バーごとに 1 つの値以外のものを描くインジケーターは、<code>update</code> を持つクラスにします：
  下の、長い方法です。
</p>

<h2>カスタムインジケーター</h2>
<p>
  インジケーターは <code>IndicatorPlugin</code> です。それが何で、どう見えるかを示す <code>descriptor</code> と、
  バーごとに値を返す <code>calculate()</code> からなります。<code>IndicatorBase</code> を継承すれば、残りはチャートが
  ディスクリプターをもとに行います。プロットを描き、ペインのスケールを調整し、値を軸にタグ表示し、
  インジケーターを凡例、設定、インジケーターダイアログに表示します。次は完全な 1 本で、線が向きを変える所に
  印を付ける MACD です：
</p>
<pre><code>{`import { IndicatorBase, IndicatorValueMap } from '@tradecanvas/chart'

const ema = (prev, value, period) => (prev === undefined ? value : prev + (2 / (period + 1)) * (value - prev))

class TurningMacd extends IndicatorBase {
  descriptor = {
    id: 'turning-macd', name: 'Turning MACD', shortName: 'TMACD',
    placement: 'panel',               // a pane of its own; 'overlay' draws on the price pane
    category: 'oscillators',          // its group in the Indicators dialog
    defaultConfig: { fast: 12, slow: 26, source: 'close' },
    inputs: {
      fast: { kind: 'int', min: 2, label: 'Fast' },
      slow: { kind: 'int', min: 3, label: 'Slow' },
      source: { kind: 'choice', label: 'Price', options: [{ value: 'close', label: 'Close' }, { value: 'hl2', label: 'Median' }] },
    },
    plots: [
      { key: 'value', title: 'MACD', color: 0 },
      { key: 'turn', title: 'Turn', color: 1, kind: 'markers', tone: { field: 'up' }, downColor: 2 },
    ],
    scale: { zero: true },
    levels: [0],
    defaultStyle: (theme) => ({ colors: theme.name === 'light' ? ['#1f4e8c', '#0a7d3b', '#b3261e'] : ['#8ab4f8', '#4cc38a', '#f28b82'] }),
  }

  calculate(data, config) {
    const { fast, slow, source } = config.params
    const values = new IndicatorValueMap()
    const series = new Array(data.length).fill(null)
    let f, s
    for (let i = 0; i < data.length; i++) {
      const bar = data[i]
      const price = source === 'hl2' ? (bar.high + bar.low) / 2 : bar.close
      f = ema(f, price, fast)
      s = ema(s, price, slow)
      if (i < slow) continue
      const point = { value: f - s }
      const a = series[i - 2]?.value, b = series[i - 1]?.value
      // The bar before this one is a turn when the line changed direction there.
      if (a !== undefined && b !== undefined && (b - a) * (point.value - b) < 0) {
        series[i - 1] = { ...series[i - 1], turn: b, up: point.value > b ? 1 : 0 }
        values.set(data[i - 1].time, series[i - 1])
      }
      series[i] = point
      values.set(bar.time, point)
    }
    return { values, series }
  }
}`}</code></pre>
<p>
  <code>calculate(data, config)</code> はバーとインスタンスの入力（<code>config.params</code>）を受け取り、値を
  2 通りで返します。バーのインデックスごと（<code>series</code>。最初の値より前は <code>null</code>）と、バーの
  時刻ごと（<code>values</code>）です。<code>values</code> には <code>new IndicatorValueMap()</code> を使ってください。
  時間順に値を入れるコストが数分の 1 で済む <code>Map</code> で、シンボルや時間足を切り替えるたびにこの処理が
  行われます。どのプロットも指していないフィールド（上の <code>up</code>）は、描画もスケール調整も表示もされません。
  プロットの <code>tone</code> のためにあります。
</p>

<h3 id="descriptor">ディスクリプター</h3>
<ul>
  <li><strong>プロット</strong>はそれぞれ 1 つのフィールドを描きます：<code>'line'</code>（既定）、<code>'step'</code>、
    <code>'histogram'</code>、<code>'dots'</code>（点で描く線）、または <code>'markers'</code>。markers はフィールドに
    値があるバーに図形（<code>shape</code>：<code>'dot'</code>、<code>'triangleUp'</code>、<code>'triangleDown'</code>）を描き、
    その値の位置か、価格ペインではバーの上または下（<code>position</code>）に置きます。<code>color</code> は
    スタイルの色のインデックスです。<code>tone</code> と <code>downColor</code> はプロットを 2 色で描きます。
    <code>width</code>、<code>lineStyle</code>、<code>opacity</code>、<code>breakOn</code> は線の見た目を決めます。
    <code>fills</code> は 2 本のプロットの間を塗ります。</li>
  <li><strong>入力</strong>は <code>defaultConfig</code> の各入力をどう編集するかを示します：<code>kind</code>、
    <code>label</code>、<code>min</code>、<code>max</code>、<code>step</code>、そして選択肢の <code>options</code>
    （値だけ、またはそれぞれにラベルを付けたもの：<code>{'{ value, label }'}</code>）。<code>{'{ source: true }'}</code>
    を付けると、別の価格や別のインジケーターの線をもとに計算できます。</li>
  <li><strong>ペイン</strong>：<code>scale</code> は範囲を固定するか 0 を表示範囲に保ち、<code>levels</code> は
    閲覧者が編集できる参照線を描きます。</li>
  <li><strong>見た目</strong>：<code>defaultStyle</code>。スタイル 1 つか、テーマごとに 1 つです（後述）。</li>
</ul>

<h3>ライブのティック：update と revisesBefore</h3>
<p>
  ティックごとに変わるのは最新のバーだけです。<code>update()</code> がなければ、チャートは履歴全体に対して
  <code>calculate()</code> をもう一度実行します。あれば、チャートは前回の出力（<code>prev</code>）と、変わった最初の
  バー（<code>from</code>）を渡し、そこから再計算してもらいます。<code>null</code> を返すと、代わりに
  <code>calculate()</code> が実行されます。値は <code>calculate()</code> が返すものと同じでなければなりません。
  <code>canResume</code> と <code>writePoint</code> は <code>IndicatorBase</code> に含まれています。
</p>
<p>
  次のようなインジケーターでは、各バーの値は TurningMacd の平均のような積み上げた状態からではなく、その前後の
  バーから求めます（TurningMacd のようなものは自分で状態を保持するか、<code>update</code> を省きます）：
</p>
<pre><code>{`// A swing high: the bar is higher than the n bars either side of it.
pointAt(data, i, n) {
  if (i < n || i + n >= data.length) return null
  for (let k = 1; k <= n; k++) if (data[i - k].high >= data[i].high || data[i + k].high > data[i].high) return null
  return { high: data[i].high }
}

update(data, config, prev, from) {
  if (!this.canResume(data, prev, from)) return null
  const n = config.params.strength
  // A new bar decides the bar n back: rewrite from there.
  for (let i = Math.max(0, from - n); i < data.length; i++) this.writePoint(prev, data, i, this.pointAt(data, i, n))
  return prev
}

revisesBefore(config) { return config.params.strength }`}</code></pre>
<p>
  <code>from</code> は常に、変わった最初のバーです。新しいバーがそれより前のバーを変えうる場合（スイングポイント、
  転換点、フラクタルは、その後のバーで決まります）、<code>update</code> がそれらのバーを自分で書き直し、
  <code>revisesBefore(config)</code> がその本数を示します。これにより、このインジケーターの線を読むインジケーターも
  そこから再計算されます。<code>from</code> 以降のバーしか変わらない場合は省略します。
</p>

<h3>描画</h3>
<p>
  <code>IndicatorBase</code> の <code>render()</code> は <code>plots</code> と <code>fills</code> をペインのスケールで
  描くので、ほとんどのインジケーターには描画のコードが要りません。さらに描くには、これをオーバーライドして最初に
  呼び出します。5 番目の引数には、チャートが描画に使うテーマが入っており、スタイルにない色やフォントに使えます：
  <code>theme.candleUp</code>、<code>theme.candleDown</code>、<code>theme.text</code>、<code>theme.font</code>。
</p>
<pre><code>{`render(ctx, output, viewport, style, context) {
  super.render(ctx, output, viewport, style, context)
  ctx.fillStyle = context.theme.text
  // barIndexToX(i, viewport) and priceToY(value, viewport) place it where the chart draws
}`}</code></pre>

<h3>テーマに従う色</h3>
<p>
  ディスクリプターの <code>defaultStyle</code> は、インジケーターの最初の見た目です。スタイル 1 つか、テーマを
  受け取ってテーマごとのスタイルを返す関数です。これを使うインスタンスは <code>chart.setTheme()</code> に従い、
  誰かが選んだ色はそのまま残ります。これは閲覧者が保存した初期設定（<code>chart.setIndicatorDefaults()</code>、
  ウィジェットの<em>初期設定として保存</em>）より下に位置するため、アプリの色が閲覧者の設定に取って代わることは
  ありません。保存したレイアウトはテーマが与える部分を含まず、別のテーマで開くとそのテーマの色になります。
</p>

<h3>レイアウトを読む前に登録する</h3>
<p>
  保存したレイアウトはインジケーターを id で指定し、レイアウトを読む時点で登録されていないものは除外されます。
  <code>ChartWidget</code> には独自のインジケーターを <code>plugins</code> で渡してください。レイアウト
  （<code>persistLayouts</code>）、テンプレート、共有ビューを復元する前に登録されます。<code>Chart</code> では、
  コンストラクターに <code>plugins</code> を渡すか、<code>loadState()</code> の前に登録します。
</p>
<pre><code>{`new ChartWidget(host, { symbol, adapter, persistLayouts: true, plugins: [{ kind: 'indicator', plugin: new TurningMacd() }] })

const chart = new Chart(host, { plugins: [{ kind: 'indicator', plugin: new TurningMacd() }] })
chart.addIndicator('turning-macd', { fast: 8 })`}</code></pre>

<h3>チャートがそこから読み取るもの</h3>
<ul>
  <li><strong>凡例</strong>は <code>shortName</code> と、<code>defaultConfig</code> と異なる入力（選択肢はそのラベル）で
    名前を表示し、markers 以外の各プロットの値をその色で表示します。</li>
  <li><strong>価格軸</strong>は、それらのプロットの最新値をタグ表示します。</li>
  <li><strong>CSV エクスポート</strong>にはそれぞれの列があり、凡例の名前と、プロットが複数あるときはプロットの
    <code>title</code> で名前が付きます。</li>
  <li><strong>設定ダイアログ</strong>は入力を編集し、各プロットをその色、表示するかどうか、線やステップなら線種と
    ともに一覧にし、レベルを編集します。</li>
  <li><strong>インジケーターダイアログ</strong>は <code>category</code> の下に <code>name</code> で表示します：種類
    （<code>'oscillators'</code>、<code>'volume'</code>…）か、独自のグループ <code>{`{ id: 'my-app', label: 'My App' }`}</code> で、
    独自のグループはアプリのインジケーターをその名前の下に、組み込みの種類より前にまとめます（グループが複数あるときは、
    それぞれの最初のインジケーターが登録された順）。検索でもその名前で見つかります。</li>
  <li><strong>別のインジケーター</strong>は、その線（同じプロット）をソースとして読めます。</li>
</ul>
<p>
  コーディングエージェントは同じガイドを、公開パッケージに対して型チェックしたコードとともに、MCP サーバーの
  <code>custom_indicator</code> ツールとスキルの
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">カスタムインジケーターのレシピ</a>から得られます。
</p>

<h2>カスタム描画ツール</h2>
<p>
  ヘルパー（アンカーからピクセルへの変換、線のスタイル、ハンドル）を使うために
  <code>DrawingBase</code> を継承し、ツールを記述して登録します。
  <code>descriptor.options</code> に挙げた設定は、ウィジェットの設定ダイアログに表示され、
  描画と一緒に保存されます。
</p>
<pre><code>{`import { DrawingBase, registerPlugin } from '@tradecanvas/chart'

class TargetLine extends DrawingBase {
  descriptor = {
    type: 'targetLine', name: 'Target Line', requiredAnchors: 1,
    options: { label: { kind: 'text', label: 'Label', default: 'Target' } },
  }
  render(ctx, state, viewport, selected) { /* this.anchorToPixel(state.anchors[0], viewport) の位置に */ }
  hitTest(point, state, viewport, tolerance) { /* ポインターが描画の上にあるか？ */ return false }
  // 任意：ラインの価格。アラートがラインを追従できるようにする
  priceAt(state) { return [state.anchors[0].price] }
}

registerPlugin({ kind: 'drawing', plugin: new TargetLine() })
chart.setDrawingTool('targetLine')`}</code></pre>
<p>
  ツールの名前は、チャートがツール名を受け取るところ（<code>setDrawingTool</code>、<code>addDrawing</code> など）で TypeScript でもそのまま使えます。
  <code>DrawingToolType</code> はどんな名前も受け取り、組み込みツールの補完も残ります。組み込みツールは <code>BuiltInDrawingToolType</code> にあります。
</p>
<p>
  ディスクリプターでは、ツールの描き方（<code>creation</code>：
  <code>'clicks'</code>、<code>'freehand'</code>、<code>'path'</code>。
  <code>maxAnchors</code> も指定できます）と、ダイアログで塗りつぶし
  （<code>fill</code>）やテキスト（<code>text</code>）を設定できるかどうかも記述できます。
  ツールは <code>moveHandle()</code> でアンカーではないハンドルを動かせ、バーをもとに描画する場合は
  <code>setDataGetter(getter, revision)</code> でチャートのバーを受け取ります。
  同じ配列の中でバーが修正されると（<code>updateBar</code>）<code>revision()</code> が変わるので、
  バーから計算した結果を保持しているツールはそのとき計算し直します。
</p>

<h2>カスタムチャートタイプ</h2>
<p><code>ChartTypePlugin</code> はレンダラーと、任意でデータの変換を提供します。組み込みのタイプと同じように切り替えられます：</p>
<pre><code>{`registerPlugin({
  kind: 'chartType',
  plugin: {
    descriptor: { type: 'my-bricks', name: 'My Bricks' },
    createRenderer: () => new MyBrickRenderer(),
    transform: (raw) => toBricks(raw),   // optional
  },
})

chart.setChartType('my-bricks')`}</code></pre>

<h2>カスタムオーバーレイ</h2>
<p><code>OverlayPlugin</code> は選んだレイヤーに毎フレーム描画し、現在のビューポート、データ、テーマを受け取ります：</p>
<pre><code>{`import { overlayScale, registerPlugin } from '@tradecanvas/chart'

registerPlugin({
  kind: 'overlay',
  plugin: {
    descriptor: { id: 'high-marks', name: 'High marks', layer: 'main' },
    render(ctx, context) {
      const s = overlayScale(context)
      ctx.fillStyle = '#f2a93b'
      for (let i = s.visible.from; i <= s.visible.to; i++) {
        const bar = context.data[i]
        ctx.fillRect(s.indexToX(i) - s.barWidth / 2, s.priceToY(bar.high) - 1, s.barWidth, 2)
      }
    },
  },
})`}</code></pre>
<p>
  <code>overlayScale(context)</code> はチャート自身と同じ位置に配置します：<code>timeToX</code> / <code>xToTime</code> はバーの時刻で
  （バーの間や最新バーの先は比例で）、<code>indexToX</code> / <code>xToIndex</code>、<code>priceToY</code> / <code>yToPrice</code>
  （対数・反転スケールにも対応）、<code>barWidth</code>、画面に見えているバーの範囲 <code>visible</code>。価格グリッドで行を分けるには
  <code>chart.getPriceStep()</code> を使います：銘柄の最小刻み（<code>minTick</code>）、分数の単位、または表示中の小数桁の 1 単位です。
  チャートタイプのレンダラーは viewport だけを、インジケーターは viewport とテーマを受け取るため、<code>priceToY</code>、<code>barIndexToX</code>、
  <code>timeToX</code> とその逆関数もエクスポートしています。バーは画面に描かれている系列のもので、練行足や
  Kagi ではそのブロックです（<code>chart.isTimeAligned()</code> でデータのバーと一致するかが分かります）。
  価格軸と同じように価格を書くために、viewport にはチャート独自の価格フォーマット（ある場合は <code>formatPrice</code>）、
  <code>numberLocale</code>、市場または銘柄が決めた小数桁（<code>pricePrecision</code>）が入っています。インジケーターのペインではフォーマットと小数桁は未設定です。
</p>
<p>
  独自の設定（表示モードやスイッチ）を持つオーバーレイは、チャートを再描画する tick が来なくても変更をすぐに反映できます。
  プラグインに <code>enabled: false</code> を設定すると登録したまま非表示になり、どちらかを変えたら
  <code>chart.requestRender()</code> を呼びます。次のフレームまでの複数の要求は 1 フレームにまとめられます。
</p>

<p>プラグインの型シグネチャの全体は、<a href={href('/docs/api')}>API リファレンス</a>を参照してください。</p>
