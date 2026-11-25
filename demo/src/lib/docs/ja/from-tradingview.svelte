<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>TradingView からの移行 — TradeCanvas ドキュメント</title>
  <meta name="description" content="TradingView のチャーティングライブラリ（Advanced Charts、Trading Platform）や Lightweight Charts で作ったアプリを TradeCanvas に移す方法：feedFromJsApi か udfFeed でデータフィードをそのまま使い、名前とオプションの対応はコーディングエージェントが MCP サーバーで調べ、引き継げないものを把握します。" />
</svelte:head>

<h1>TradingView からの移行</h1>
<p>
  TradingView のチャーティングライブラリ（Advanced Charts または Trading Platform）や Lightweight Charts で作った
  アプリは、バックエンドを変えずに TradeCanvas に移せます。データフィードはそのままで、ブリッジの後ろに置きます。
  変わる名前、つまりオプション、featureset、override、study、描画、メソッドは、
  <a href={href('/docs/getting-started#ai')}>MCP サーバー</a>が答えるための対応表にまとめてあるので、
  コーディングエージェントは推測せずに 1 つずつ調べます。このページでは、引き継げるもの、変わるもの、引き継げないものを説明します。
</p>

<h2 id="datafeed">データフィードはそのまま</h2>
<p>
  <code>feedFromJsApi</code> は、JS API 向けに書かれたデータフィード（<code>onReady</code>、
  <code>resolveSymbol</code>、<code>getBars</code>、<code>subscribeBars</code>、あれば <code>searchSymbols</code>、
  <code>getQuotes</code>、<code>subscribeQuotes</code>）を <code>DataFeed</code> に変えます。
</p>
<pre><code>{`import { feedFromJsApi } from '@tradecanvas/chart'
import { ChartWidget } from '@tradecanvas/chart/widget'

const feed = feedFromJsApi(datafeed)   // アプリのデータフィードをそのまま
await feed.ready()                      // onReady が答えた：提供する時間足がわかっている

const widget = new ChartWidget(document.getElementById('chart'), { feed, symbol: 'AAPL', timeframe: '1d' })`}</code></pre>
<p>ブリッジがデータフィードのために行うこと：</p>
<ul>
  <li>銘柄ごとに 1 回だけ resolve し、その symbol info を <code>getBars</code> と <code>subscribeBars</code> に渡し返す。</li>
  <li>
    チャートの時間足を resolution に変え（<code>'1h'</code> → <code>'60'</code>、<code>'1d'</code> →
    <code>'1D'</code>）、チャートの <code>countBack</code> と <code>before</code> を秒単位の <code>from</code>、
    <code>to</code>、<code>countBack</code> に変える。
  </li>
  <li>ある範囲にバーがなかったとき、<code>nextTime</code> からもう 1 回求める。</li>
  <li>
    購読したときの guid で購読を解除し、データフィードが <code>onResetCacheNeeded</code> を呼んだらシリーズを読み込み直す。
  </li>
  <li>
    銘柄の <code>pricescale</code> と <code>minmov</code> を呼値の刻み、<code>session</code> を取引時間として読み、
    提供する時間足を <code>supported_resolutions</code> から読む。
  </li>
</ul>
<p>
  チャートはフィードにつないだときにそのフィードが提供する時間足を読み、ほかの時間足はそこから作ります（1 分足のバーから
  7 分足のチャートを作るなど）。<code>onReady</code> が答えるのはそのあとなので、<code>ChartWidget</code> を作る前に
  <code>feed.ready()</code> を await するか、時間足を自分で渡します：
  <code>feedFromJsApi(datafeed, {'{'} supportedTimeframes: ['1m', '1h', '1d'] {'}'})</code>。
</p>

<h3 id="udf">UDF サーバー</h3>
<p>UDF を話すサーバーなら、データフィードのコードはまったく要りません。</p>
<pre><code>{`import { udfFeed } from '@tradecanvas/chart'

const feed = udfFeed({ url: 'https://data.example.com/udf', updateFrequency: 10_000 })
await feed.ready()   // /config にある時間足

new ChartWidget(el, { feed, symbol: 'AAPL', timeframe: '1d' })`}</code></pre>
<p>
  <code>/config</code>、<code>/symbols</code>、<code>/search</code>、<code>/history</code>、
  <code>/quotes</code> を読みます。UDF にはプッシュがないので、ライブのバーと気配値は
  <code>updateFrequency</code> ミリ秒ごと（既定は 10 秒）に求め直します。<code>headers</code> はすべてのリクエストに付けて送ります。
</p>

<h2 id="mcp">残りの対応付けはエージェントに</h2>
<p>MCP サーバーには移行用のツールが 3 つあります。</p>
<table>
  <thead><tr><th>ツール</th><th>すること</th></tr></thead>
  <tbody>
    <tr>
      <td><code>migration_plan</code></td>
      <td>順番どおりの手順、アプリのコードで何を検索するか、そして検索で見つかったものをどのツールで対応付けるか。</td>
    </tr>
    <tr>
      <td><code>migration_lookup</code></td>
      <td>
        1 つの名前が何になるか：ウィジェットのオプション、featureset、override のキー、study、描画の shape、
        ウィジェットやチャートのメソッド、データフィードや broker のメンバー、または resolution。対応するオプション、
        機能スイッチ、スタイルキー、インジケーター id（既定値とラインのキー付き）、描画タイプ（その点付き）、または
        呼び出しを返し、相当するものがないときはそう明言して、代わりにどうするかを示します。
      </td>
    </tr>
    <tr>
      <td><code>convert_widget_options</code></td>
      <td>
        <code>new TradingView.widget({'{'}...{'}'})</code> のオプションオブジェクト全体を、featureset と override も含めて
        <code>ChartWidget</code> のオプションに変えます。Lightweight Charts の <code>createChart</code> のオプションなら
        <code>Chart</code> のオプションに変えます。チャートができたあとに行う呼び出しと、置き場所のないものも挙げ、
        結果を <code>validate_options</code> と同じように検査します。
      </td>
    </tr>
  </tbody>
</table>
<p>
  サーバーをつないだら、エージェントに移行を頼んでください。最初に <code>migration_plan</code> を呼び、そこからアプリを
  順に進めます。サーバーのないエージェント向けには、エージェントスキルに同じ手順があります。
</p>

<h2 id="differs">変わるもの</h2>
<table>
  <thead><tr><th>TradingView</th><th>TradeCanvas</th></tr></thead>
  <tbody>
    <tr><td><code>new TradingView.widget({'{'} container: 'id' {'}'})</code>、<code>library_path</code></td><td><code>new ChartWidget(element, options)</code>。ホストするものはない</td></tr>
    <tr><td><code>onChartReady(cb)</code></td><td><code>onReady</code> オプション、またはコンストラクターのあとのコード</td></tr>
    <tr><td><code>widget.activeChart().createStudy(...)</code></td><td><code>widget.getChart().addIndicator(id, params)</code>。id は短い：<code>'rsi'</code>、<code>'bb'</code></td></tr>
    <tr><td><code>createShape({'{'} time, price {'}'}, {'{'} shape {'}'})</code>、時刻は秒</td><td><code>addDrawing({'{'} type, anchors: [{'{'} time, price {'}'}] {'}'})</code>、時刻はミリ秒</td></tr>
    <tr><td>resolution：<code>'60'</code>、<code>'1D'</code>、<code>'W'</code></td><td>時間足：<code>'1h'</code>、<code>'1d'</code>、<code>'1w'</code>（<code>resolutionToTimeframe</code>、<code>timeframeToResolution</code>）</td></tr>
    <tr><td><code>disabled_features</code>、<code>enabled_features</code></td><td><code>features</code>：<code>false</code> にしない限り、どのスイッチもオン</td></tr>
    <tr><td><code>overrides</code>、<code>applyOverrides</code></td><td>スタイルキー。<code>chartOptions.overrides</code> か <code>chart.applyOverrides()</code> で指定し、線のスタイルは名前で書く</td></tr>
    <tr><td><code>save_load_adapter</code></td><td><code>layouts: {'{'} storage {'}'}</code> と <code>LayoutStorage</code>（<code>list</code>、<code>load</code>、<code>save</code>、<code>remove</code>）</td></tr>
    <tr><td>Broker API、注文ラインとポジションライン</td><td><code>ExecutionAdapter</code>、<code>setOrders</code>、<code>setPositions</code> と注文のイベント（<a href={href('/docs/trading')}>取引</a>）</td></tr>
    <tr><td>Lightweight Charts：バーとマーカーの時刻は秒</td><td>ミリ秒：<code>time * 1000</code></td></tr>
  </tbody>
</table>

<h2 id="not-carried">引き継げないもの</h2>
<ul>
  <li>
    <strong>保存したチャート。</strong>TradingView の形式で保存したレイアウト、描画、study は読み込めません。
    ユーザーは新しいレイアウトから始めます。
  </li>
  <li>
    <code>custom_indicators_getter</code> 向けに書いた<strong>カスタムインジケーター</strong>は、
    <a href={href('/docs/plugins')}>インジケータープラグイン</a>として書き直します。137 個の組み込みインジケーターに
    同じことをするものがあれば、それを使います。
  </li>
  <li>
    <strong>一部の描画ツールと featureset</strong> には相当するものがありません。どれがそうかは
    <code>migration_lookup</code> が答え、いちばん近いツールを挙げます。
  </li>
  <li>
    <strong>複数銘柄にまたがる取引。</strong><code>ExecutionAdapter</code> の注文とポジションはチャートの銘柄のものです。
    多くの銘柄と口座にまたがる口座管理はアプリ側で持ちます。
  </li>
</ul>
<p>
  対応表は TradingView の公開ドキュメント（2026 年 11 月に参照）をもとに書かれ、ビルドのたびに TradeCanvas 自身の名前と
  照合されます。足りない名前や誤った名前はバグです。GitHub で報告してください。
</p>
