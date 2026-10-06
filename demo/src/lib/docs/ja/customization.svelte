<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>カスタマイズ — TradeCanvas ドキュメント</title>
  <meta name="description" content="TradeCanvas を自分のものにするあらゆる方法：色、ウィジェットの見た目、キーで指定するチャートの見た目、ウィジェットの部品を切り替える 112 個のスイッチ、独自のボタン・メニュー・ステータス項目、文言、プラグイン、ヘッドレスのチャート。" />
</svelte:head>

<h1>カスタマイズ</h1>
<p>
  軽い調整から深い作り込みまで、チャートを自分のものにするすべての方法です。たいていのアプリに必要なのは二つか三つ：
  テーマ、いくつかのスイッチ、自前のボタンです。
</p>

<h2>何を変えるなら何を使うか</h2>
<table>
  <thead><tr><th>変えたいもの</th><th>使うもの</th></tr></thead>
  <tbody>
    <tr><td>色</td><td><code>theme</code>（<code>'dark'</code>、<code>'light'</code> または独自のテーマ）、<code>setTheme</code> — <a href={href('/docs/api')}>API</a></td></tr>
    <tr><td>ウィジェットの角、サイズ、書体、各バー</td><td><code>ui</code> / <code>setUI</code> — <a href={href('/docs/styling')}>スタイル設定</a></td></tr>
    <tr><td>チャートの見た目の一部：グリッド、クロスヘア、チャートタイプの色</td><td>キーで <code>applyOverrides</code> — <a href={href('/docs/styling#overrides')}>スタイル設定</a></td></tr>
    <tr><td>インジケーターの線、ペインの背景</td><td><code>updateIndicatorStyle(id, {'{ plots }'})</code>、<code>setPaneStyle</code></td></tr>
    <tr><td>ウィジェットのどの部品を表示するか</td><td><code>features</code> / <code>setFeatures</code> — <a href="#switches">下記</a></td></tr>
    <tr><td>チャート上でユーザーができること：描画、取引、ズーム</td><td>チャート自体の features：<code>chartOptions: {'{ features: { drawings: false } }'}</code></td></tr>
    <tr><td>独自のボタン、メニュー、ステータス項目</td><td><code>addToolbarButton</code>、<code>addToolbarDropdown</code>、<code>addSidebarButton</code>、<code>addStatusBarItem</code>、<code>getSlot</code>、メニューのフック — <a href="#parts">下記</a></td></tr>
    <tr><td>独自のキーボードショートカット</td><td><code>addHotkey</code> — <a href="#parts">下記</a></td></tr>
    <tr><td>独自の CSS</td><td>安定したフック：<code>--tcw-*</code>、<code>data-tcw-part</code> — <a href="#css">下記</a></td></tr>
    <tr><td>ウィジェットの文言</td><td><code>locale</code>、<code>messages</code> — <a href="#words">下記</a></td></tr>
    <tr><td>独自のインジケーター、描画ツール、チャートタイプ</td><td><a href={href('/docs/plugins')}>プラグイン</a></td></tr>
    <tr><td>UI のすべて</td><td>ヘッドレスの <code>Chart</code> と、それを囲む独自の UI — <a href={href('/docs/api')}>API</a></td></tr>
  </tbody>
</table>

<h2 id="switches">機能スイッチ</h2>
<p>
  ウィジェットのあらゆる部品にスイッチがあり、オフにするまではすべてオンです。ドットのない名前は機能まるごとで、
  それが現れるすべての場所でオフになります：<code>alerts</code> はベルのボタン、メニューのアラート項目、アラートの通知を
  取り除きます。ドットのある名前は一か所です：<code>toolbar.alerts</code> はベルだけを取り除き、メニューからは引き続き
  アラートを追加できます。スイッチはウィジェットの動作中に切り替えられます。
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  features: {
    'toolbar.replay': false,          // ボタン一つ
    'sidebar.patterns': false,        // 描画ツールのグループ一つ
    'menu.chart.exportData': false,   // メニュー項目一つ
    hotkeys: false,                   // ウィジェットのすべてのキー操作
  },
})

widget.setFeatures({ sidebar: false, statusBar: false })   // 動作中にすっきりしたチャートへ
widget.isFeatureOn('sidebar')        // false
widget.getFeatures()                 // すべてのスイッチのオン・オフ
grid.setFeatures({ toasts: false })  // ChartWidgetGrid のすべてのチャート`}</code></pre>
<p>
  名前は約束事です：新しい名前は増えますが、改名はしません。<code>WIDGET_FEATURES</code> に一覧があり、TypeScript が
  チェックします。不明な名前は警告とともに無視されます。
</p>
<p>
  スイッチが表示・非表示にするのはウィジェット自身の部品です。チャートそのものでの操作——描画、取引、ズーム、ある時間足——
  を止めるには、チャートの features（<code>chartOptions.features</code>）を使います。データやストレージを伴う部品は
  オプションのままです：<code>trading</code>、<code>watchlist</code>、<code>depthLadder</code>、<code>layouts</code>
  がそれ自体の有無を決め、スイッチはそのボタンを隠します。
</p>
<p>従来のオン・オフのオプションはこれらのスイッチそのもので、これまでどおり使えます：</p>
<table>
  <thead><tr><th>オプション</th><th>スイッチ</th></tr></thead>
  <tbody>
    <tr><td><code>toolbar: false</code></td><td><code>toolbar</code></td></tr>
    <tr><td><code>drawingTools: false</code></td><td><code>sidebar</code>、<code>drawingSettings</code>、<code>hotkeys.tools</code>、<code>menu.chart.horizontalLine</code></td></tr>
    <tr><td><code>statusBar: false</code></td><td><code>statusBar</code>、<code>goToDate</code></td></tr>
    <tr><td><code>rangeBar: false</code></td><td><code>statusBar.range</code>、<code>goToDate</code></td></tr>
    <tr><td><code>accountPanel: false</code></td><td><code>accountPanel</code>、<code>orderTicket</code></td></tr>
    <tr><td><code>indicatorLegend</code>、<code>settings</code>、<code>alerts</code>、<code>objectTree</code>、<code>indicatorTemplates</code>、<code>intervalTyping</code>、<code>symbolInfo</code>、<code>navigation</code>、<code>dragDropImport</code>、<code>customTimeframes</code>、<code>fullscreen</code></td><td>同じ名前のスイッチ</td></tr>
  </tbody>
</table>

<h3>すべてのスイッチ</h3>
<table>
  <thead><tr><th>グループ</th><th>スイッチ</th></tr></thead>
  <tbody>
    <tr><td>バー</td><td><code>toolbar</code> <code>sidebar</code> <code>statusBar</code></td></tr>
    <tr><td>機能</td><td>
      <code>alerts</code> <code>objectTree</code> <code>symbolInfo</code> <code>symbolSearch</code> <code>settings</code>
      <code>indicatorSettings</code> <code>drawingSettings</code> <code>dataWindow</code> <code>commandPalette</code>
      <code>hotkeySheet</code> <code>goToDate</code> <code>replay</code> <code>screenshot</code> <code>copyImage</code>
      <code>shareView</code> <code>autoFib</code> <code>themeToggle</code> <code>fullscreen</code> <code>accountPanel</code>
      <code>orderTicket</code> <code>bracketOrders</code> <code>depthLadder</code> <code>layouts</code>
      <code>indicatorTemplates</code> <code>compare</code> <code>indicatorLegend</code> <code>navigation</code>
      <code>customTimeframes</code> <code>intervalTyping</code> <code>dragDropImport</code> <code>hotkeys</code>
      <code>toasts</code>
    </td></tr>
    <tr><td>ツールバー</td><td>
      <code>toolbar.symbol</code> <code>toolbar.symbolInfo</code> <code>toolbar.timeframes</code>
      <code>toolbar.timeframeMenu</code> <code>toolbar.chartType</code> <code>toolbar.indicators</code>
      <code>toolbar.layouts</code> <code>toolbar.replay</code> <code>toolbar.bracketOrders</code>
      <code>toolbar.depthLadder</code> <code>toolbar.accountPanel</code> <code>toolbar.objectTree</code>
      <code>toolbar.alerts</code> <code>toolbar.screenshot</code> <code>toolbar.settings</code>
      <code>toolbar.themeToggle</code> <code>toolbar.fullscreen</code>
    </td></tr>
    <tr><td>描画サイドバー</td><td>
      <code>sidebar.cursor</code> <code>sidebar.favorites</code> <code>sidebar.lines</code> <code>sidebar.fibonacci</code>
      <code>sidebar.patterns</code> <code>sidebar.forecasting</code> <code>sidebar.annotation</code> <code>sidebar.style</code>
      <code>sidebar.magnet</code> <code>sidebar.eraser</code> <code>sidebar.zoomArea</code> <code>sidebar.stayInDrawing</code>
      <code>sidebar.undo</code> <code>sidebar.redo</code> <code>sidebar.clear</code>
    </td></tr>
    <tr><td>ステータスバー</td><td>
      <code>statusBar.range</code> <code>statusBar.goToDate</code> <code>statusBar.market</code>
      <code>statusBar.connection</code> <code>statusBar.symbol</code>
    </td></tr>
    <tr><td>チャート上</td><td>
      <code>indicatorLegend.values</code> <code>indicatorLegend.visibility</code> <code>indicatorLegend.settings</code>
      <code>indicatorLegend.remove</code> <code>indicatorLegend.more</code> <code>pane.move</code> <code>pane.collapse</code>
      <code>pane.maximize</code> <code>navigation.zoom</code> <code>navigation.scroll</code> <code>navigation.reset</code>
    </td></tr>
    <tr><td>メニュー</td><td>
      <code>menu.chart</code> <code>menu.chart.alert</code> <code>menu.chart.order</code> <code>menu.chart.orderTicket</code>
      <code>menu.chart.horizontalLine</code> <code>menu.chart.resetView</code> <code>menu.chart.drawings</code>
      <code>menu.chart.exportData</code> <code>menu.chart.settings</code> <code>menu.chart.scale</code>
      <code>menu.chart.goToDate</code> <code>menu.chart.paneScale</code> <code>menu.priceAxisAdd</code>
      <code>menu.drawing</code> <code>menu.drawing.settings</code> <code>menu.drawing.alert</code>
      <code>menu.drawing.order</code> <code>menu.drawing.group</code> <code>menu.drawing.lock</code>
      <code>menu.drawing.hide</code> <code>menu.drawing.duplicate</code> <code>menu.drawing.delete</code>
    </td></tr>
    <tr><td>キー操作</td><td>
      <code>hotkeys.commandPalette</code> <code>hotkeys.symbolSearch</code> <code>hotkeys.save</code>
      <code>hotkeys.tools</code> <code>hotkeys.invertScale</code> <code>hotkeys.goToDate</code> <code>hotkeys.help</code>
    </td></tr>
  </tbody>
</table>
<p>
  名前以上のことをするスイッチもあります：<code>indicatorLegend</code> をオフにするとペインに自分のタイトルが戻ります。
  <code>menu.chart.*</code> は右クリックメニューと価格軸の横の "+" の両方に効きます。<code>compare</code> はオブジェクト
  ツリーの追加ボタンを取り除き、表示中の比較は一覧に残ります。<code>toasts</code> はウィジェット自身の通知を止めます（エラーは表示されます）。
  <code>widget.toast()</code> による通知も表示されます。
</p>

<h2 id="parts">独自の部品</h2>
<p>
  独自のボタン、メニュー、項目はウィジェットの各バーに収まり、ウィジェット自身のものと同じに見え、テーマと見た目に
  従います。どれも変更・削除用のハンドルを返し、そのバーが表示されている間だけ表示されます。
</p>
<pre><code>{`widget.addToolbarButton({ id: 'news', label: 'News', icon: 'bell', toggle: true, onClick })

widget.addToolbarDropdown({
  id: 'scans',
  label: 'Scans',
  icon: 'layers',
  side: 'left',                              // チャートの操作ボタンの並び
  items: () => [                             // 開くたびに取得
    { label: 'Breakouts', onSelect: () => runScan('breakouts') },
    { label: 'Live only', checked: liveOnly, onSelect: () => (liveOnly = !liveOnly) },
  ],
})

const ruler = widget.addSidebarButton({ id: 'ruler', label: 'Ruler', icon: 'ruler', toggle: true,
  onClick: () => ruler?.setActive(toggleRuler()) })

const latency = widget.addStatusBarItem({ id: 'latency', text: '12 ms', label: 'Latency' })
latency?.setText('15 ms')
widget.addHotkey({ keys: 'Alt+N', label: 'New note', onPress: () => addNote() })   // 同じキーのウィジェットのショートカットを置き換え、ショートカット一覧（?）にも出ます

// そのほか何でも：ツールバーの操作ボタンの横、サイドバーのボタンの下、
// ステータスバーの両端、またはチャートの上に
widget.getSlot('chart')?.append(myOverlay)   // ポインターは通り抜けます。自分の要素には pointer-events: auto を`}</code></pre>
<p>スロット：<code>toolbar.left</code>、<code>toolbar.right</code>、<code>sidebar</code>、<code>statusBar.left</code>、<code>statusBar.right</code>、<code>chart</code>。</p>

<h3>独自のメニュー項目</h3>
<p>独自の項目はウィジェットのメニューの最後に並びます。メニューが開くたびに、開いた場所とともに取得されます。</p>
<pre><code>{`new ChartWidget(host, {
  chartMenuItems: ({ area, price }) => area === 'plot' && price !== undefined
    ? [{ label: 'Copy price', onSelect: () => copy(price) }]
    : [],
  drawingMenuItems: ({ id, type, selected }) => [{ label: 'Share', icon: 'link', onSelect: () => share(id) }],
  indicatorMenuItems: ({ instanceId, indicatorId }) => [{ label: 'Explain', onSelect: () => explain(indicatorId) }],
})`}</code></pre>

<h2 id="css">独自の CSS</h2>
<p>ウィジェットは iframe ではなくページの一部なので、あなたの CSS が届きます。次のフックは 1.x の間変わりません：</p>
<ul>
  <li><code>.tcw-root</code> 上の <code>--tcw-*</code> 変数：見た目のトークン（<a href={href('/docs/styling')}>スタイル設定</a>を参照）。</li>
  <li><code>[data-tcw-part~="toolbar.screenshot"]</code>：各部品はそのスイッチの名前を持つので、同じ名前でルールから見つけられます。</li>
  <li><code>.tcw-root[data-tcw-off~="sidebar"]</code>：オフのスイッチ。ウィジェットのルート要素に付きます。</li>
  <li><code>[data-host-button="id"]</code>、<code>[data-host-item="id"]</code>：独自のボタンとステータス項目を、付けた id で。</li>
</ul>
<p>それ以外のクラス名はウィジェット内部のもので、変わることがあります。フックを使ってスタイルしてください。</p>
<pre><code>{`/* 独自のツールバーボタンをアクセント色に */
.tcw-root [data-host-button="news"] { color: var(--tcw-accent); }
/* 描画ツールがオフの間は自分のパネルを広く */
.my-layout:has(.tcw-root[data-tcw-off~="sidebar"]) .my-panel { width: 320px; }`}</code></pre>

<h2 id="words">文言</h2>
<p>
  ウィジェットは 30 言語に対応しています（<code>locale</code>。英語とベトナム語は組み込み、ほかは
  <code>@tradecanvas/chart/widget/locales</code> から読み込みます）。<code>messages</code> は言語の文字列の上から
  どの文字列でも変えられます。インジケーター名はそのままです。
</p>
<pre><code>{`import { de } from '@tradecanvas/chart/widget/locales'

new ChartWidget(host, {
  locale: 'de',
  messages: { ...de, 'toolbar.indicators': 'Studien' },
})`}</code></pre>

<h2>さらに深く</h2>
<p>
  独自のインジケーター、描画ツール、チャートタイプは<a href={href('/docs/plugins')}>プラグイン</a>として登録すれば、
  メニューも含めて組み込みのものと同じように動きます。UI をすべて自前にしたいなら、ヘッドレスの <code>Chart</code>
  を使います：同じエンジンで、ウィジェットなしです。
</p>
