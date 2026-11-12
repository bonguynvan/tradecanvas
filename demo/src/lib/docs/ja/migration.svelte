<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>2.0 への移行 — TradeCanvas ドキュメント</title>
  <meta name="description" content="TradeCanvas 1.x から 2.0 でコードに関わる変更点：ベータ版のインストール、既定の外観と 1.x の外観を保つ 1 つのオプション、削除された名前とその代わり、変わった動作。" />
</svelte:head>

<h1>2.0 への移行</h1>
<p>
  2.0 では、チャートとウィジェットの既定の外観が変わり、1.x で非推奨になっていた名前が削除され、4 つの動作が
  変わりました。データ、保存したレイアウト、インジケーター、描画、取引、テーマはそのまま使えます。このページでは、
  変更点とその対応を順に挙げます。
</p>

<h2 id="install">インストール</h2>
<p>
  2.0 はベータ版です。すべてのパッケージは <code>2.0.0-beta.N</code> として <code>beta</code> タグで公開されています。
  2.0 が正式版になるまで、<code>latest</code> は 1.x のままです。
</p>
<pre><code>{`npm install @tradecanvas/chart@beta

# フレームワークのコンポーネントを使う場合は、そのパッケージも
npm install @tradecanvas/react@beta
npm install @tradecanvas/vue@beta
npm install @tradecanvas/svelte@beta`}</code></pre>

<h2 id="look">既定の外観</h2>
<p>
  チャートとウィジェットは、描くものの周りにこれまでより広いゆとりを取って開きます。オプション 1 つで 1.x の外観を
  保てます。
</p>
<pre><code>{`// 1.x のままのウィジェット
new ChartWidget(host, { ui: { density: 'classic' } })
widget.setUI({ density: 'classic' })

// 1.x のままの独自のチャート
new Chart(host, { density: 'compact' })`}</code></pre>
<p>
  <code>ui: {'{'} density: 'compact' {'}'}</code>（小さめのコントロール）は変わっていません。
</p>
<p>既定で変わった点：</p>
<table>
  <thead><tr><th>対象</th><th>1.x</th><th>2.0</th></tr></thead>
  <tbody>
    <tr><td>最新のバーの先の空き</td><td>5 枠</td><td>8 枠</td></tr>
    <tr><td>価格の上下の空き</td><td>高さの 9%</td><td>高さの 11.5%</td></tr>
    <tr><td>単体の <code>Chart</code> のバー</td><td>classic</td><td>golden。実体は枠の 62% で、ウィジェットがこれまで描いていたものと同じです</td></tr>
    <tr><td>凡例の位置（描画領域の角から）</td><td>8 px 内側</td><td>12 px 内側</td></tr>
    <tr><td>ウィジェットの余白 <code>--tcw-space-1</code> … <code>-7</code></td><td>2 · 3 · 5 · 8 · 13 · 21 · 34 px</td><td>2 · 4 · 6 · 8 · 12 · 20 · 32 px</td></tr>
    <tr><td>Print のボタン</td><td>33 px</td><td>34 px</td></tr>
    <tr><td>ボタンのラベルの両脇のパディング</td><td>8 px</td><td>12 px</td></tr>
  </tbody>
</table>
<p>
  ウィジェットのサイズと余白はすべて偶数ピクセルになり、画面の拡大率が 125% と 150% のとき、細線はデバイスピクセル
  1 つ分の幅になります。
</p>
<p>ご自身のコードで確認する点：</p>
<ul>
  <li><code>--tcw-space-*</code> を上書きしている CSS、またはコントロールを 33 px と想定している CSS。</li>
  <li><code>rightMargin</code> を渡しているコード。指定した値はこれまでどおり優先されます。</li>
  <li>
    React、Vue、Svelte のコンポーネントは、自分では <code>rightMargin: 5</code> を設定しなくなりました。保つには、
    <code>options</code> に <code>density: 'compact'</code> か <code>rightMargin: 5</code> を渡します。
  </li>
  <li>
    <code>@tradecanvas/core</code> の <code>PRICE_SCALE_MARGIN</code> や
    <code>DEFAULT_CHART_OPTIONS.rightMargin</code> を読んでいるコード。どちらも値が変わりました。
  </li>
</ul>
<pre><code>{`// React。Vue と Svelte のコンポーネントも同じ options を受け取ります
<TradeCanvas options={{ density: 'compact' }} />
<TradeCanvas options={{ rightMargin: 5 }} />`}</code></pre>
<p>
  各密度が設定する内容の一覧は、<a href={href('/docs/styling#density')}>スタイル設定 → 密度</a>を参照してください。
</p>

<h2 id="removed">削除された名前</h2>
<p>いずれも 1.x で非推奨になっていたもので、2.0 にはありません。</p>
<table>
  <thead><tr><th>削除</th><th>代わりに使うもの</th></tr></thead>
  <tbody>
    <tr><td><code>chart.setTimezone(tz)</code></td><td><code>chart.setTimeZone(tz)</code></td></tr>
    <tr><td><code>chart.getTimezone()</code></td><td><code>chart.getTimeZone()</code></td></tr>
    <tr><td><code>chart.getEffectiveTimezone()</code></td><td><code>chart.getEffectiveTimeZone()</code></td></tr>
    <tr><td><code>chart.getExchangeTimezone()</code></td><td><code>chart.getExchangeTimeZone()</code></td></tr>
    <tr><td><code>chart.setTimezoneOffset(minutes)</code></td><td><code>chart.setTimeZone(minutes)</code>：UTC から東への分数。<code>null</code> でブラウザーのタイムゾーン</td></tr>
    <tr><td><code>EXCHANGE_TIMEZONE</code></td><td><code>EXCHANGE_TIME_ZONE</code></td></tr>
    <tr><td><code>SymbolInfo.timezone</code></td><td><code>SymbolInfo.timeZone</code></td></tr>
    <tr><td><code>timeFormatter</code> での <code>TimeFormatContext.kind === 'date'</code></td><td>時間軸が渡すのは <code>'year'</code>、<code>'month'</code>、<code>'day'</code> です。<code>'date'</code> は 1.x の時点ですでに渡されておらず、型からもなくなりました。</td></tr>
    <tr><td><code>SessionBreaks.setLocale()</code> と <code>SessionBreaks.renderLabels()</code>（<code>@tradecanvas/core</code>）</td><td>呼び出しを削除します。どちらも何もしていませんでした。</td></tr>
    <tr><td>ウィジェットの文字列キー <code>replay.barsPerSecond</code></td><td><code>messages</code> の上書きから削除します。使われていませんでした。リプレイの速度の表示は <code>replay.rate</code> です。</td></tr>
  </tbody>
</table>

<h3 id="symbol-time-zone">シンボルの <code>timezone</code> は読まれなくなりました</h3>
<p>
  従来のフィールドはまったく読まれません。<code>timezone</code> だけを持つシンボルは、<code>symbols</code>、
  <code>resolveSymbol</code>、フィード、アダプターのどれから来たものでも、固有のタイムゾーンなしとして扱われます。
</p>
<ul>
  <li><code>setTimeZone('exchange')</code> と日足の日付は、市場のタイムゾーン、それもなければ UTC になります。</li>
  <li>シンボル自身の <code>sessions</code> は塗り分けられません（市場を設定していれば、市場の取引時間は塗り分けられます）。</li>
  <li>シンボルの状態は 24 時間取引の市場として表示され、シンボル情報パネルにタイムゾーンは表示されません。</li>
</ul>
<p>
  渡された <code>timezone</code> は <code>getSymbolInfo()</code> にそのまま残りますが、どこからも読まれません。
</p>
<pre><code>{`// 1.x
chart.setSymbolInfo({ symbol: 'AAPL', timezone: 'America/New_York' })

// 2.0
chart.setSymbolInfo({ symbol: 'AAPL', timeZone: 'America/New_York' })`}</code></pre>

<h3 id="kept">変わっていない名前</h3>
<p>
  名前がよく似ているので、一括置換には注意してください。ウィジェットの設定は今も <code>timezone</code> と綴ります。
</p>
<pre><code>{`widget.setSettings({ timezone: 'exchange' })
widget.getSettings().timezone       // 'exchange'`}</code></pre>
<p>
  ウィジェットの文字列キー <code>settings.timezone</code> と <code>menu.chart.timezone</code> も名前はそのままです。
</p>

<h3 id="find">探し方</h3>
<p>
  コードの中で <code>Timezone(</code> と <code>EXCHANGE_TIMEZONE</code>、そしてシンボルのオブジェクト内の
  <code>timezone:</code> を検索します。削除された名前は、TypeScript が 1 つずつエラーとして報告します。
</p>

<h2 id="behaviour">変わった動作</h2>
<p>名前の変更を伴わない変更です。</p>
<ul>
  <li>
    <strong>ペインの端にかかる価格軸のラベル。</strong>ペインの上端または下端で切れてしまうラベルは描かれません。
    そのグリッド線は残ります。
  </li>
  <li>
    <strong>ペインが多いときの価格ペイン。</strong>インジケーターペインをいくつ開いても、価格ペインはチャートの高さの
    38.2% 以上を保ち、開いているペインは残りをそれぞれのサイズに比例して分け合います。ペインに設定したサイズは
    保持され、チャートが高くなれば再びそのサイズで表示されます。以前はペインが高さを保ったため、価格ペインの高さが
    なくなることがありました。
  </li>
  <li>
    <strong>整数ピクセルの間の線幅。</strong>そのような幅の線は、その幅を超えない整数個のデバイスピクセルで
    描かれます。1.5 px は 100% でデバイスピクセル 1 つ分です（以前は 2 つ分）。
  </li>
  <li>
    <strong><code>setBarLayout()</code> と <code>setDensity()</code>。</strong>実行中に
    <code>chart.setBarLayout()</code> で設定したバーのレイアウトは、その後の <code>setDensity()</code> でも保たれます。
  </li>
</ul>

<h2 id="unchanged">変わっていないもの</h2>
<ul>
  <li>
    データ：<code>DataAdapter</code>、<code>DataFeed</code>、<code>setData</code>、<code>appendBar</code>、
    <code>updateLastBar</code>。
  </li>
  <li>1.x で保存したレイアウトと設定は、これまでどおり読み込めます。</li>
  <li>インジケーター、描画、取引、テーマ、スタイルキーの名前は変わっていません。</li>
</ul>
