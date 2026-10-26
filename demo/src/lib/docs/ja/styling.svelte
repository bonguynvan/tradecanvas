<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>スタイル設定 — TradeCanvas ドキュメント</title>
  <meta name="description" content="ウィジェットの外観をトークンで指定：角の丸み、サイズ、文字、枠線、影、バー。黄金比に沿った 4 つのプリセット（Print、Studio、Terminal、Capsule）と、その上に重ねる独自のテーマ。" />
</svelte:head>

<h1>ウィジェットのスタイル設定</h1>
<p>
  ウィジェットの外観はトークンの集まりです。パーツの種類ごとの角の丸み、コントロールとバーのサイズ、文字、枠線、影、
  選択中のボタンの見せ方、そしてツールバーと描画ツールを端に沿わせるか浮かせるか。プリセットから始めて、好きなところを
  変えられます。色はテーマ（<code>dark</code> / <code>light</code>。<a href={href('/docs/api')}>API リファレンス</a>を参照）が
  受け持ち、どの外観もどちらのテーマとも組み合わせられます。
</p>

<h2>プリセット</h2>
<table>
  <thead><tr><th>プリセット</th><th>外観</th></tr></thead>
  <tbody>
    <tr><td><code>print</code>（既定）</td><td>
      紙とインク。白に近い地か黒に近い地に、ふつうのものはすべてグレー、色は意味のある所だけ。細い線、3 px のコントロール、
      5 px のメニュー、8 px のダイアログ、大文字のラベル。数字はすべて等幅の書体で、価格が列にそろいます。選択中のボタンは
      インクの塗りつぶし、選択中のツールはインクブルーです。
    </td></tr>
    <tr><td><code>studio</code></td><td>
      コントロールは 7 px、メニューは 11 px、ダイアログは 16 px の角丸。グループは区切り線ではなく余白で分け、メニューは
      柔らかい影の上に浮かび、時間足のボタンはセグメント型のトラックに収まり、選択中のボタンは淡い色で塗られます。
    </td></tr>
    <tr><td><code>terminal</code></td><td>
      高密度で角張った外観。角は 2 px、コントロールは 26 px、グループの間に区切り線が入り、ラベルは大文字で、選択中の
      ボタンには下線が付きます。チャート上の価格ラベルも角張った形になります。
    </td></tr>
    <tr><td><code>capsule</code></td><td>
      価格ラベルも含め、あらゆる所がピル形です。ツールバーと描画ツールは島のように浮かび、メニューはすりガラス風で、
      選択中のボタンは塗りつぶしのピルになります。
    </td></tr>
  </tbody>
</table>

<h2>外観を選ぶ</h2>
<pre><code>{`import { ChartWidget, ChartWidgetGrid } from '@tradecanvas/chart/widget'

const widget = new ChartWidget(host, { ui: 'terminal' })
widget.setUI('capsule')        // in place: nothing is rebuilt
widget.getUI()                 // every token, resolved

// A grid: every chart and the grid's bar, and the charts it adds later
const grid = new ChartWidgetGrid(host, { layout: '2x2', widget: { ui: 'terminal' } })
grid.setUI('studio')
grid.getUI()`}</code></pre>

<h2>ゆとりのある外観</h2>
<p>
  <code>density: 'airy'</code> は、画面に多くのバーを並べ、その間に余白を取ってチャートを開きます。どのズームでもローソク足の実体は
  枠の φ⁻¹（62%）で、チャートは 1 枠 φ⁴ ≈ 6.85 px で開きます（<code>barLayout: 'golden'</code>）。コントロールはゆったりし、
  軸と凡例の数字は外観のサンセリフ書体になります。2.0 が最初に開く外観です。
</p>
<pre><code>{`new ChartWidget(host, { ui: { density: 'airy' } })

// The same on a chart of your own
import { Chart, SANS_FONT_FAMILY } from '@tradecanvas/chart'
const chart = new Chart(host, { barLayout: 'golden', font: { family: SANS_FONT_FAMILY } })
chart.setBarLayout('classic')    // a 2 px gap, as before
chart.setFont({ sizeSmall: 12 }) // the axes' and tags' size
chart.setFont(null)              // the theme's own font again`}</code></pre>
<p>
  <code>chartOptions.barLayout</code> と <code>chartOptions.font</code> が外観の設定より優先されます。バーが表示されている間に
  レイアウトを変えると、ズームはそのままで各枠の分け方だけが変わります。
</p>

<h2>黄金比</h2>
<p>
  Print は比率を黄金比 φ ≈ 1.618 にそろえているので、隣り合うサイズはどこでも同じ関係になります。
</p>
<table>
  <thead><tr><th>対象</th><th>規則</th><th>値（px）</th></tr></thead>
  <tbody>
    <tr><td>サイズ</td><td>アイコンから φ の半段ずつ：アイコン、その小さいボタン、そのボタン、メニューの行、バー。</td><td>16 · 20 · 26 · 33 · 42</td></tr>
    <tr><td>余白</td><td>フィボナッチ数。どれも前の 2 つの和なので、隣どうしはほぼ φ 倍の関係になります。</td><td>2 · 3 · 5 · 8 · 13 · 21 · 34</td></tr>
    <tr><td>角</td><td>
      これもフィボナッチ数。内側の角は外側の角から間の余白を引いた値なので、曲線が平行に走ります。メニューの 5 は、
      その行の 2 と 3 の余白を足したものです。
    </td><td>1 · 2 · 3 · 5 · 8</td></tr>
    <tr><td>文字</td><td>
      φ の立方根ずつの段なので、3 段ごとに φ 倍になります。ダイアログの見出しは本文の φ 倍です。10 px を下回ることは
      ありません。それより小さいと、記号が 2 つ付く文字（ベトナム語の ế、ộ）が読めなくなるためです。
    </td><td>10 · 11 · 13 · 15 · 18 · 21</td></tr>
  </tbody>
</table>
<p>
  文字の段は設定した本文のサイズ（<code>font.size</code>）に連動し、<code>density</code> はサイズを半段下げるか上げます。
  独自の外観には、<code>@tradecanvas/commons</code> の <code>PHI</code>、<code>FIBONACCI</code>、
  <code>phiStep(base, steps, perPhi)</code> を使えます。
</p>

<h2>独自の外観</h2>
<p>
  テーマはプリセット（指定しなければ Print）から始まり、指定した項目だけを変更します。スケールで設定した角の丸みは、
  そのスケールに従うすべてのパーツに反映されます。パーツ個別の値を設定した場合は、そちらが使われます。
</p>
<pre><code>{`widget.setUI({
  preset: 'studio',
  radius: { xs: 3, sm: 5, md: 10, lg: 12, xl: 18 },  // the scale, px (999: pills)
  components: { dialog: 20, tag: 0 },                // a part's own corners
  density: 'compact',                                // compact · comfortable · spacious · airy
  sizes: { toolbar: 40 },                            // px; wins over density
  font: {
    family: "'Manrope', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
    size: 13, weight: 500, strongWeight: 600,
    labelCase: 'uppercase', labelTracking: 0.06,      // small labels
  },
  borders: { width: 1, separators: true },           // rules between toolbar groups
  shadows: { menu: '0 12px 30px rgba(0, 0, 0, 0.4)' },
  blur: 12,                                          // frosted floating surfaces, px
  active: 'solid',                                   // tint · solid · underline
  toolbar: 'floating',                               // docked · floating
  sidebar: 'floating',
  intervals: 'segmented',                            // plain · segmented
  tagRadius: 999,                                    // the chart's price tags and pills
})`}</code></pre>

<table>
  <thead><tr><th>フィールド</th><th>設定する内容</th></tr></thead>
  <tbody>
    <tr><td><code>radius</code></td><td>角の丸みのスケール <code>xs</code>、<code>sm</code>、<code>md</code>、<code>lg</code>、<code>xl</code>（px、0–999）。</td></tr>
    <tr><td><code>components</code></td><td>
      パーツ個別の角の丸み：<code>control</code>（ボタン）、<code>input</code>、<code>menu</code>、<code>dialog</code>、
      <code>panel</code>（アラート、データウィンドウ、注文チケット）、<code>tooltip</code>、<code>tag</code>、<code>toast</code>、
      <code>toolbar</code> と <code>sidebar</code>（浮かせたときに見える、それ自体の枠）。既定では、コントロールと入力欄は
      <code>md</code>、メニューとパネルは <code>lg</code>、ダイアログは <code>xl</code>、ツールチップとタグは <code>sm</code> に従います。
    </td></tr>
    <tr><td><code>density</code> / <code>sizes</code></td><td>
      <code>toolbar</code> の高さ、<code>control</code> と <code>controlSmall</code> の高さ、<code>icon</code>、
      <code>sidebar</code> の幅、<code>menuItem</code> の高さ（px）。<code>compact</code> と <code>spacious</code> は、
      Print のサイズを φ の半段だけ下げたものと上げたものです。
    </td></tr>
    <tr><td><code>font</code></td><td>
      フォントファミリー（CSS のリスト）、本文の <code>size</code>（11–20 px。ほかのサイズは φ の 3 分の 1 段ずつ離れてこれに連動）、ウェイト、そしてセクション
      見出しなど小さなラベルの大文字・小文字と字間（em）。
    </td></tr>
    <tr><td><code>borders</code></td><td>枠線の太さと、ツールバーのグループ間や描画ツールの間に区切り線を入れるかどうか。</td></tr>
    <tr><td><code>shadows</code></td><td>メニュー、ダイアログ、ツールチップの CSS の影。</td></tr>
    <tr><td><code>blur</code></td><td>すりガラス風のメニュー（px）。0 より大きいと、メニューの背後にチャートがぼけて透けて見えます。</td></tr>
    <tr><td><code>active</code></td><td>選択中のボタンの見せ方：淡い色の塗り、塗りつぶしのピル、または下線。</td></tr>
    <tr><td><code>toolbar</code> / <code>sidebar</code></td><td>端に沿わせるか、島のように浮かせるか。</td></tr>
    <tr><td><code>intervals</code></td><td>時間足のボタンをそのまま並べるか、セグメント型のトラックに収めるか。</td></tr>
    <tr><td><code>tagRadius</code></td><td>チャートが描く価格ラベル、軸のピル、注文バッジの角の丸み。</td></tr>
  </tbody>
</table>
<p>使えない値（範囲外の値や、宣言の外に抜け出しうる CSS）は無視され、プリセットの値がそのまま残ります。</p>

<h2>フォント</h2>
<p>
  ウィジェットはフォントを読み込みません。名前を指定するだけで、ブラウザーがリストの順にフォールバックします。
  Print はどのシステムにもある書体（Segoe UI、San Francisco、Roboto）と、数字には Cascadia Mono、SF Mono、Menlo、
  Consolas を指定しているので、何も読み込む必要がありません。Studio は Manrope、次に Inter、Terminal は
  IBM Plex Sans Condensed と IBM Plex Mono、Capsule は Sora を指定しています。使いたいフォントは自分で読み込んでください。
</p>
<pre><code>{`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap">`}</code></pre>

<h2>CSS 変数</h2>
<p>
  トークンは、ウィジェットのルート要素（とそのダイアログ）に設定された CSS 変数です。<code>ui</code> オプションがなければ
  値はスタイルシートのもの（つまり Print の値）のままなので、独自の CSS で設定できます。ウィジェットは自身の
  スタイルシートをページの先頭に置くため、<code>.tcw-root</code> に書いたあなたのルールが優先されます。<code>ui</code>
  を指定すると、ウィジェットが要素に直接値を書き込み、そちらが優先されます。
</p>
<pre><code>{`.tcw-root {
  --tcw-radius: 4px;            /* the md corner: buttons and fields follow it */
  --tcw-dialog-radius: 12px;
  --tcw-control-h: 28px;
  --tcw-font: 'Inter', system-ui, sans-serif;
}`}</code></pre>
<table>
  <thead><tr><th>変数</th><th>元になる設定</th></tr></thead>
  <tbody>
    <tr><td><code>--tcw-radius-xs</code>、<code>-sm</code>、<code>--tcw-radius</code>、<code>-lg</code>、<code>-xl</code></td><td><code>radius</code></td></tr>
    <tr><td><code>--tcw-control-radius</code>、<code>--tcw-input-radius</code>、<code>--tcw-menu-radius</code>、<code>--tcw-dialog-radius</code>、<code>--tcw-panel-radius</code>、<code>--tcw-tooltip-radius</code>、<code>--tcw-tag-radius</code>、<code>--tcw-toast-radius</code>、<code>--tcw-toolbar-radius</code>、<code>--tcw-sidebar-radius</code></td><td><code>components</code></td></tr>
    <tr><td><code>--tcw-toolbar-h</code>、<code>--tcw-control-h</code>、<code>--tcw-control-h-sm</code>、<code>--tcw-icon</code>、<code>--tcw-sidebar-w</code>、<code>--tcw-menu-item-h</code></td><td><code>sizes</code></td></tr>
    <tr><td><code>--tcw-font</code>、<code>--tcw-font-mono</code>、<code>--tcw-font-size</code>（と <code>-xs</code>、<code>-sm</code>、<code>-lg</code>、<code>-xl</code>、<code>-display</code>）、<code>--tcw-weight</code>、<code>--tcw-weight-strong</code>、<code>--tcw-label-case</code>、<code>--tcw-label-tracking</code></td><td><code>font</code></td></tr>
    <tr><td><code>--tcw-border-w</code>、<code>--tcw-sep-w</code></td><td><code>borders</code></td></tr>
    <tr><td><code>--tcw-menu-shadow</code>、<code>--tcw-dialog-shadow</code>、<code>--tcw-tooltip-shadow</code></td><td><code>shadows</code></td></tr>
    <tr><td><code>--tcw-blur</code>、<code>--tcw-surface-opacity</code></td><td><code>blur</code></td></tr>
    <tr><td><code>--tcw-space-1</code> … <code>--tcw-space-7</code></td><td>スタイルシート：フィボナッチの余白、2 から 34 px</td></tr>
  </tbody>
</table>
<p>
  レイアウトの切り替えは、同じ要素の data 属性として公開されており、独自の CSS に使えます：
  <code>data-tcw-ui</code>（プリセット）、<code>data-tcw-active</code>、<code>data-tcw-toolbar</code>、
  <code>data-tcw-sidebar</code>、<code>data-tcw-intervals</code>、<code>data-tcw-separators</code>（<code>on</code> / <code>off</code>）。
</p>

<h2 id="controls">入力欄、リスト、カレンダー</h2>
<p>
  ウィジェットのすべての入力欄（アラート、設定、注文チケット、日付へ移動、インジケーターのパラメーター）は同じ見た目です。薄い塗りと細い線、ホバーで線が少し濃くなり、フォーカスすると線がアクセント色になります。周りにリングは付きません。セレクトはウィジェット独自のリストを開きます。選択中の行にチェック、グループは見出し、矢印キー・Enter・Escape・頭文字入力に対応します。日付欄はウィジェット独自のカレンダーを開きます。週の始まりは言語に従い、今日には下線、欄の <code>min</code>／<code>max</code> の外の日はグレーになります。チェックボックス、ラジオ、スライダー、スイッチも同じトークンに従い、スクロールバーも同様です。細く角が丸く、トラックはなくつまみだけです。
</p>
<p>
  入力欄はブラウザー標準の <code>&lt;select&gt;</code> と <code>&lt;input&gt;</code> のままです。値、イベント、フォームはこれまでどおり動き、タッチ画面では指に合ったスマートフォン標準のホイールとカレンダーが開きます。
</p>
<p>見た目は次の変数で決まり、ダークとライトのテーマでそれぞれ値を持ちます：</p>
<p><code>--tcw-field-bg</code>, <code>--tcw-field-bg-hover</code>, <code>--tcw-field-bg-focus</code>, <code>--tcw-field-line</code>, <code>--tcw-field-line-hover</code>, <code>--tcw-field-line-focus</code>, <code>--tcw-field-placeholder</code>, <code>--tcw-check-line</code>, <code>--tcw-scroll-thumb</code>, <code>--tcw-scroll-thumb-hover</code>.</p>
<pre><code>{`.tcw-root {
  --tcw-field-bg: transparent;            /* fields as lines, no fill */
  --tcw-field-line: rgba(255, 255, 255, 0.12);
  --tcw-field-line-focus: #5b8cff;        /* focus in your brand colour */
}`}</code></pre>

<h2 id="overrides">チャートの見た目：スタイルのオーバーライド</h2>
<p>
  テーマはチャート全体の色を決めます。チャートが描くどの部分も、キーで個別に設定できます：方向ごとのグリッド線、
  クロスヘア、軸、ペイン、凡例、最新価格、出来高、セッションの区切り、そしてチャートタイプごとのメイン系列。
  設定していないキーはテーマに従うので、テーマを切り替えれば設定していない部分の色も変わります。
</p>
<pre><code>{`import { Chart } from '@tradecanvas/chart'

const chart = new Chart(host, {
  overrides: { 'grid.vertical.visible': false },       // 最初から
})

chart.applyOverrides({
  'series.candlestick.upColor': '#26a69a',              // 上昇/下落のあるタイプはすべてこれに従う
  'series.candlestick.downColor': '#ef5350',
  'grid.horizontal.style': 'dotted',
  'crosshair.vertical.style': 'solid',
  'crosshair.labelBackground': '#2962ff',
  'lastPrice.style': 'solid',
  'panes.background': '#0d1117',
  'legend.textColor': '#c9d1d9',
})
chart.applyOverrides({ 'legend.textColor': null })      // null でキーを外す
chart.resetOverrides(['grid.horizontal.style'])         // またはキーを指定
chart.setOverrides({ 'background.color': '#000' })      // レイヤーをまるごと

chart.getStyleValue('series.bar.upColor')               // '#26a69a': キーの最終的な値
chart.getStyle().grid.vertical                          // { visible: false, color, style, width }
chart.on('styleChange', (e) => e.payload.layer)         // 'host' | 'user'`}</code></pre>

<h3>キー</h3>
<table>
  <thead><tr><th>キー</th><th>設定する内容</th></tr></thead>
  <tbody>
    <tr><td><code>background.color</code></td><td>チャートの背景（ペインに独自の背景がなければペインも）。</td></tr>
    <tr><td><code>panes.background</code>, <code>.separatorColor</code>, <code>.titleColor</code></td><td>インジケーターのペイン：背景、上端のバー、名前。</td></tr>
    <tr><td><code>grid.horizontal.*</code>, <code>grid.vertical.*</code></td><td><code>visible</code>、<code>color</code>、<code>style</code>（<code>solid</code> · <code>dashed</code> · <code>dotted</code>）、<code>width</code>。方向ごとに別々。</td></tr>
    <tr><td><code>crosshair.horizontal.*</code>, <code>crosshair.vertical.*</code></td><td>クロスヘアの線にも同じ 4 つ（既定は細い実線）。</td></tr>
    <tr><td><code>crosshair.labelBackground</code>, <code>.labelTextColor</code></td><td>軸とペインの目盛り上の価格・時刻ラベル。</td></tr>
    <tr><td><code>axis.price.lineColor</code>, <code>.textColor</code>, <code>axis.time.*</code></td><td>各軸の線とラベル（ペインの目盛りは価格軸に従う）。</td></tr>
    <tr><td><code>legend.textColor</code>, <code>.labelColor</code></td><td>凡例の値と、そのラベル（O、H、L、Vol）。</td></tr>
    <tr><td><code>lastPrice.visible</code>, <code>.upColor</code>, <code>.downColor</code>, <code>.style</code>, <code>.width</code></td><td>最新価格の線とタグ。未設定なら色はメイン系列に従う。バーの残り時間（<code>features.barCountdown</code>）はタグの下に付く。</td></tr>
    <tr><td><code>volume.upColor</code>, <code>.downColor</code></td><td>出来高のバー。</td></tr>
    <tr><td><code>sessionBreaks.color</code>, <code>.style</code>, <code>.width</code></td><td>日・週・月の区切り線。</td></tr>
    <tr><td><code>highLow.color</code>, <code>watermark.color</code></td><td>高値・安値の線、ウォーターマーク。</td></tr>
    <tr><td><code>trading.buyColor</code>, <code>.sellColor</code>, <code>.profitColor</code>, <code>.lossColor</code>, <code>.entryColor</code></td><td>注文（買い・売り）とポジション（利益・損失・エントリー）。チャート上と価格軸の両方で、取引設定の色より優先されます。</td></tr>
    <tr><td><code>markers.longColor</code>, <code>.shortColor</code>, <code>.neutralColor</code></td><td>シグナルのマーク。それ自身のスタイルより優先されます。</td></tr>
    <tr><td><code>tradeZones.profitColor</code>, <code>.lossColor</code>, <code>.activeColor</code></td><td>取引ゾーン：勝ち、負け、建玉中。</td></tr>
    <tr><td><code>drawings.handleColor</code></td><td>選択中の描画のハンドル（未設定なら白）。</td></tr>
    <tr><td><code>series.&lt;type&gt;.*</code></td><td>そのタイプで描かれるときのメイン系列：<code>upColor</code>、<code>downColor</code>、<code>wickUpColor</code>、
      <code>wickDownColor</code>（ローソク足、平均足、出来高ローソク足、エクイボリューム）、<code>color</code> / <code>lineColor</code>
      と <code>lineWidth</code>（ライン、ステップライン、マーカー付きライン、エリア、HLC エリア、ベースライン）、<code>topColor</code> と
      <code>bottomColor</code>（エリア、HLC エリア）。</td></tr>
  </tbody>
</table>
<p>
  <code>CHART_STYLE_KEYS</code> にはすべてのキーと値の種類が並び、TypeScript が書いた時点でキーと値を検査します。
  上昇/下落の色は <code>series.candlestick.*</code>、線の色と太さは <code>series.line.*</code>、塗りは
  <code>series.area.*</code>、最後にテーマに従います。実体の色を設定すると、ヒゲもその色になります。
  不明なキーや値は警告とともに無視されます。
</p>

<h3>アプリのものとユーザーのもの</h3>
<p>
  オーバーライドには 2 つのレイヤーがあります。あなたのもの（<code>layer: 'host'</code>、既定）はテーマを切り替えても残り、
  保存されません。ユーザーのもの（<code>layer: 'user'</code>）はあなたのものより優先され、設定したテーマごとに保たれ —
  ダークテーマで選んだ色はダークテーマに戻ると戻ってきます — <code>saveState()</code> で保存されます。ウィジェットの設定は
  ユーザーのレイヤーに書き込みます。左に縦に並ぶタブがこれらのキーでチャートの各部分を設定します：
  <strong>シンボル</strong>（表示中のチャートタイプ、最終価格、出来高）、<strong>ステータスライン</strong>、
  <strong>スケール</strong>、<strong>外観</strong>（背景、グリッド、十字線、セッションの区切り）、<strong>レイヤー</strong>、
  <strong>取引</strong>（注文、ポジション、シグナルのマーク、取引ゾーン）。変更はすぐに反映され、<strong>キャンセル</strong>で
  すべて元に戻り、<strong>OK</strong> で 1 回の取り消し単位として確定します。<strong>テンプレート</strong>メニューは見た目を
  名前を付けて保存し、保存済みのものを適用・削除し、どのテーマでもそのテーマの色に戻します。部品自身に任せた色は
  「自動」と表示され、「自動」で戻せます。
</p>
<pre><code>{`chart.applyOverrides({ 'background.color': '#0b0b0f' }, { layer: 'user' })
chart.getOverrides({ layer: 'user' })                 // 現在のテーマでのユーザーのもの
chart.getTheme()                           // 設定したとおりのテーマ：オーバーライドは別に持つ`}</code></pre>
<p>
  グリッドとクロスヘアのオプション（<code>grid.hLineColor</code>、<code>crosshair.vLine.style</code>…）は対応するキーの
  省略形です。複数チャートのグリッドはすべてのチャートにオーバーライドを適用します：<code>grid.applyOverrides(patch)</code>。
  React、Vue、Svelte のコンポーネントは <code>overrides</code> プロパティで受け取ります。
</p>

<h3>インジケーターのプロットとペイン</h3>
<pre><code>{`// プロットごとの線種と表示、キーで指定（色と太さは colors / lineWidths のまま）
chart.updateIndicatorStyle(macdId, { plots: { signal: { lineStyle: 'dashed' }, histogram: { visible: false } } })

// これから追加する同じ種類のインジケーターの初期スタイル
chart.setIndicatorDefaults('ema', { colors: ['#f5a623'], lineWidths: [2] })

// ペイン独自の背景と区切り線。インジケーターとともに保存
chart.setPaneStyle(rsiId, { background: '#101418', separator: '#f5a623' })`}</code></pre>
<p>
  非表示のプロットは値タグも凡例の値も出ません。すべてのインジケーターが非表示のプロットを描かず、ほぼすべてが
  プロットの線種にも従います。独自の図形を描く一部（パラボリック SAR の点、Supertrend、ジグザグ、
  出来高プロファイル）は自分の線を保ちます。
</p>

<h2>チャートのラベル</h2>
<p>
  ウィジェットは <code>tagRadius</code> を自身のチャートに渡します（<code>chartOptions.shapes</code> で指定した形は、
  <code>setUI</code> を呼ぶまで保たれます）。ウィジェットを使わない素の <code>Chart</code> では、形を自分で設定して
  ください。この設定はテーマを切り替えても保たれます。この形は、価格ラベル、軸とクロスヘアのピル、注文・ポジション・
  ブラケット注文のラベル、前期間のレベルのラベルに使われます。
</p>
<pre><code>{`const chart = new Chart(host, { shapes: { tagRadius: 4 } })
chart.setShapes({ tagRadius: 999 })   // pill price tags, axis pills and order badges
chart.getShapes()`}</code></pre>

<h2 id="legend">OHLCV 凡例</h2>
<p>
  チャート上部の凡例はタイトル行から始まります：シンボル、時間足、取引所に続けて、同じ行にポインタ下のバー（なければ最後のバー）の始値、高値、安値、終値、変化を表示します。出来高は別の行に表示されます。スマートフォンのように描画領域がタイトル行には狭すぎるときは折り返します。シンボルと時間足はストリームから、取引所はシンボルの詳細情報から取ります。<code>setSymbolName('Bitcoin')</code> でシンボルが変わるまで自分で名前を付けられ、<code>showSymbol: false</code> でタイトルを省けます。各値は桁が変わっても位置を保つので、リアルタイムの更新でちらつきません。まるごと消すことも、必要な行だけにすることもできます。ウィジェットではルックの数字用書体を、その下に並ぶインジケーター行と同じサイズで使います。<code>setUI</code> は自前の <code>setLegend</code> の後でもそれを設定し直します。
</p>
<pre><code>{`new Chart(host, { features: { legend: false } })   // no legend at all
chart.setLegend({ visible: false })                  // or at any time
chart.setLegend({
  showSymbol: false, showOHLC: true, showChange: true, showVolume: false,
  position: 'top-right',
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',                   // null: the theme's font
})

// The widget: no legend, and no switch for it in its Settings
new ChartWidget(host, { chartOptions: { features: { legend: false } } })
// Off to start, for the user to turn on in Settings
new ChartWidget(host).setSettings({ legendVisible: false })`}</code></pre>

<h2 id="volume">価格スケールと出来高の帯</h2>
<p>
  出来高のバーは描画領域の下端に沿った帯に収まり、その高さは描画領域の φ^-4.5（約 11.5%）です。自動で合わせた価格スケールは
  ローソク足をこの帯の上に、φ^-7（3%）の間隔を空けて置きます。最高値の上には φ^-5（9%）を空けます。表示中に出来高がないとき
  （オフにした場合や、出来高を持たないバーの場合）は、ローソク足がこの帯まで使います。スケールは表示中のオーバーレイ
  インジケーターと比較ラインにも合わせます。
</p>

<h2>出来高の色</h2>
<p>
  出来高バーはテーマの <code>volumeUp</code> と <code>volumeDown</code> （または <code>volume.*</code> キー） を使います。組み込みのテーマは中立なインクの 1 色で描き、下落のバーはそれより淡くなります。上のローソク足がすでに値動きの向きを示しているので、バーは背景にとどまります。あなたや widget の設定がローソク足の色を変えても、出来高は中立な色のままです。ローソク足の色のバーにしたいときは、<code>volumeColor(candleColor)</code> がローソク足の色を出来高用の透明度にした色を返します。
</p>
<pre><code>{`import { DARK_THEME, volumeColor } from '@tradecanvas/chart'

chart.setTheme({
  ...DARK_THEME,
  candleUp: '#26a17b',
  candleDown: '#e0525f',
  volumeUp: volumeColor('#26a17b'),
  volumeDown: volumeColor('#e0525f'),
})`}</code></pre>
