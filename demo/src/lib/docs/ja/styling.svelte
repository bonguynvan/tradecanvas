<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>スタイル設定 — TradeCanvas ドキュメント</title>
  <meta name="description" content="ウィジェットの外観をトークンで指定：角の丸み、サイズ、文字、枠線、影、バー。3 つのプリセット（Studio、Terminal、Capsule）と、その上に重ねる独自のテーマ。" />
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
    <tr><td><code>studio</code>（既定）</td><td>
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

<h2>独自の外観</h2>
<p>
  テーマはプリセット（指定しなければ Studio）から始まり、指定した項目だけを変更します。スケールで設定した角の丸みは、
  そのスケールに従うすべてのパーツに反映されます。パーツ個別の値を設定した場合は、そちらが使われます。
</p>
<pre><code>{`widget.setUI({
  preset: 'studio',
  radius: { xs: 3, sm: 5, md: 10, lg: 12, xl: 18 },  // the scale, px (999: pills)
  components: { dialog: 20, tag: 0 },                // a part's own corners
  density: 'compact',                                // compact · comfortable · spacious
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
      <code>sidebar</code> の幅、<code>menuItem</code> の高さ（px）。
    </td></tr>
    <tr><td><code>font</code></td><td>
      フォントファミリー（CSS のリスト）、本文の <code>size</code>（11–20 px。小さいサイズはこれに連動）、ウェイト、そしてセクション
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
  Studio は Manrope、次に Inter、Terminal は IBM Plex Sans Condensed と IBM Plex Mono、Capsule は Sora を指定しています。
  使いたいフォントは自分で読み込んでください。
</p>
<pre><code>{`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap">`}</code></pre>

<h2>CSS 変数</h2>
<p>
  トークンは、ウィジェットのルート要素（とそのダイアログ）に設定された CSS 変数です。<code>ui</code> オプションがなければ
  値はスタイルシートのもの（つまり Studio の値）のままなので、独自の CSS で設定できます。ウィジェットは自身の
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
    <tr><td><code>--tcw-font</code>、<code>--tcw-font-mono</code>、<code>--tcw-font-size</code>（と <code>-sm</code>、<code>-xs</code>、<code>-lg</code>）、<code>--tcw-weight</code>、<code>--tcw-weight-strong</code>、<code>--tcw-label-case</code>、<code>--tcw-label-tracking</code></td><td><code>font</code></td></tr>
    <tr><td><code>--tcw-border-w</code>、<code>--tcw-sep-w</code></td><td><code>borders</code></td></tr>
    <tr><td><code>--tcw-menu-shadow</code>、<code>--tcw-dialog-shadow</code>、<code>--tcw-tooltip-shadow</code></td><td><code>shadows</code></td></tr>
    <tr><td><code>--tcw-blur</code>、<code>--tcw-surface-opacity</code></td><td><code>blur</code></td></tr>
  </tbody>
</table>
<p>
  レイアウトの切り替えは、同じ要素の data 属性として公開されており、独自の CSS に使えます：
  <code>data-tcw-ui</code>（プリセット）、<code>data-tcw-active</code>、<code>data-tcw-toolbar</code>、
  <code>data-tcw-sidebar</code>、<code>data-tcw-intervals</code>、<code>data-tcw-separators</code>（<code>on</code> / <code>off</code>）。
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

<h2>出来高の色</h2>
<p>
  出来高バーはテーマの <code>volumeUp</code> と <code>volumeDown</code> を使います。<code>volumeColor(candleColor)</code> はローソク足の色を出来高用の透明度にした色を返すので、独自のテーマでもバーはローソク足の背景にとどまります。widget の設定でローソク足の色を変えたときは、widget が自動でこれを行います。
</p>
<pre><code>{`import { DARK_THEME, volumeColor } from '@tradecanvas/chart'

chart.setTheme({
  ...DARK_THEME,
  candleUp: '#26a17b',
  candleDown: '#e0525f',
  volumeUp: volumeColor('#26a17b'),
  volumeDown: volumeColor('#e0525f'),
})`}</code></pre>
